/**
 * Audit du site généré.
 *
 * Se lance après `npm run build`, sur dist/. Il ne corrige rien : il liste ce
 * qui cloche, pour qu'une régression se voie avant la mise en ligne plutôt
 * qu'un mois plus tard dans Search Console.
 *
 *   node scripts/audit.mjs            → rapport complet
 *   node scripts/audit.mjs --strict   → code de sortie 1 si une anomalie
 *
 * Les routes du blog viennent de dist/sitemap-blog.xml. Quand Sanity est
 * injoignable, ce fichier n'existe pas : les liens vers /blog/ sont alors
 * comptés comme non vérifiables, jamais comme morts.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const RACINE = process.cwd();
const DIST = path.join(RACINE, "dist");
const SITE = "https://www.timat.app";
const strict = process.argv.includes("--strict");

const anomalies = [];
const signale = (cat, msg) => anomalies.push({ cat, msg });

function fichiers(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== "assets") fichiers(p, out); }
    else if (e.endsWith(".html")) out.push(p);
  }
  return out;
}

if (!existsSync(DIST)) {
  console.error("dist/ absent : lancer npm run build d'abord.");
  process.exit(1);
}
const pages = fichiers(DIST);

/** Route publique servie par un fichier du build. */
function routeDe(p) {
  const rel = "/" + path.relative(DIST, p).split(path.sep).join("/");
  return rel.endsWith("/index.html") ? rel.slice(0, -"index.html".length) : rel;
}

// Routes réellement servies, plus celles créées par les rewrites de vercel.json.
const routes = new Set();
for (const p of pages) {
  const r = routeDe(p);
  routes.add(r);
  if (r.endsWith("/") && r !== "/") routes.add(r.slice(0, -1));
}
routes.add("/");
const vercel = JSON.parse(readFileSync(path.join(RACINE, "vercel.json"), "utf8"));
for (const rw of vercel.rewrites || []) routes.add(rw.source);
for (const rd of vercel.redirects || []) if (!rd.has) routes.add(rd.source);

// Routes du blog, si le build a pu joindre Sanity.
const smBlog = path.join(DIST, "sitemap-blog.xml");
const blogConnu = existsSync(smBlog);
if (blogConnu) {
  for (const m of readFileSync(smBlog, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)) {
    routes.add(m[1].replace(SITE, ""));
  }
}

const lire = (p) => readFileSync(p, "utf8");
const attr = (html, re) => (html.match(re) || [])[1] || null;
const estNoindex = (html) => /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html);

/**
 * Certaines pages sont servies sous une autre adresse par un rewrite : leur
 * canonique, leurs liens entrants et leur entrée de sitemap portent l'adresse
 * publique, pas le nom du fichier. Sans cette table, l'audit signalerait une
 * canonique fautive et une orpheline là où tout est correct.
 */
const ALIAS = new Map([["/pour-les-parents.html", "/parents"]]);
const adressePublique = (r) => ALIAS.get(r) || r;

const titres = new Map();
const descs = new Map();
const entrants = new Map();
let blogNonVerifiables = 0;

for (const p of pages) {
  const html = lire(p);
  const route = routeDe(p);
  const noindex = estNoindex(html);

  if (!noindex) {
    const titre = attr(html, /<title>([^<]*)<\/title>/i);
    const desc = attr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
    const canon = attr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);

    if (!titre) signale("balise", `${route} : pas de <title>`);
    else {
      if (!titres.has(titre)) titres.set(titre, []);
      titres.get(titre).push(route);
    }
    if (!desc) signale("balise", `${route} : pas de meta description`);
    else {
      if (!descs.has(desc)) descs.set(desc, []);
      descs.get(desc).push(route);
    }
    if (!canon) signale("canonique", `${route} : pas de canonique`);
    else {
      const attendu = SITE + adressePublique(route);
      const ok = canon === attendu || canon === attendu.replace(/\/$/, "") || canon + "/" === attendu;
      if (!ok) signale("canonique", `${route} : canonique ${canon}`);
    }
  }

  for (const m of html.matchAll(/href=["'](\/[^"'#?]*)/g)) {
    const cible = m[1];
    if (/\.(png|jpg|jpeg|svg|webp|ico|xml|txt|pdf|css|js|json|webmanifest)$/i.test(cible)) continue;
    if (!blogConnu && cible.startsWith("/blog")) { blogNonVerifiables++; continue; }
    const variantes = [cible, cible.replace(/\/$/, ""), cible + "/"];
    if (!variantes.some((v) => routes.has(v))) signale("lien mort", `${route} → ${cible}`);
    else entrants.set(cible, (entrants.get(cible) || 0) + 1);
  }
}

for (const [t, rs] of titres) {
  if (rs.length > 1) signale("doublon", `titre sur ${rs.length} pages : « ${t.slice(0, 55)} » (${rs.slice(0, 2).join(", ")}…)`);
}
for (const [, rs] of descs) {
  if (rs.length > 1) signale("doublon", `description sur ${rs.length} pages (${rs.slice(0, 2).join(", ")}…)`);
}

// --- sitemaps ---
const sitemaps = readdirSync(DIST).filter((f) => /^sitemap.*\.xml$/.test(f));
const dansSitemap = new Set();
for (const f of sitemaps) {
  for (const m of readFileSync(path.join(DIST, f), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const r = m[1].replace(SITE, "") || "/";
    dansSitemap.add(r);
    if (!blogConnu && r.startsWith("/blog")) continue;
    if (![r, r.replace(/\/$/, ""), r + "/"].some((v) => routes.has(v))) {
      signale("sitemap", `${f} déclare ${r}, qui n'existe pas`);
    }
  }
}
for (const p of pages) {
  const r = routeDe(p);
  if (estNoindex(lire(p))) continue;
  const pub = adressePublique(r);
  if (![r, pub, pub.replace(/\/$/, ""), pub + "/"].some((v) => dansSitemap.has(v))) {
    signale("sitemap", `${r} n'est dans aucun sitemap`);
  }
}

// --- pages orphelines ---
for (const p of pages) {
  const r = routeDe(p);
  if (r === "/" || r === "/index.html") continue;
  if (estNoindex(lire(p))) continue;
  const pub = adressePublique(r);
  const vus = [r, pub, pub.replace(/\/$/, ""), pub + "/"].reduce((t, v) => t + (entrants.get(v) || 0), 0);
  if (!vus) signale("orpheline", `${r} n'est liée depuis aucune page`);
}

// --- cohérence du minimum conventionnel ---
for (const p of pages) {
  const html = lire(p);
  if (!/minimum conventionnel/i.test(html)) continue;
  if (!/4,20\s*(&nbsp;|\s)?€/.test(html)) {
    signale("montant", `${routeDe(p)} cite le minimum conventionnel sans le chiffrer à 4,20 €`);
  }
}

// --- rapport ---
const parCat = new Map();
for (const a of anomalies) {
  if (!parCat.has(a.cat)) parCat.set(a.cat, []);
  parCat.get(a.cat).push(a.msg);
}
console.log(`\n=== AUDIT — ${pages.length} pages, ${routes.size} routes ===`);
if (!blogConnu) console.log(`(sitemap-blog.xml absent : ${blogNonVerifiables} liens vers /blog/ non vérifiés)`);
if (!anomalies.length) console.log("\nAucune anomalie.\n");
for (const [cat, msgs] of [...parCat].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n## ${cat} — ${msgs.length}`);
  for (const m of msgs.slice(0, 12)) console.log(`   ${m}`);
  if (msgs.length > 12) console.log(`   … et ${msgs.length - 12} autres`);
}
console.log();
if (strict && anomalies.length) process.exit(1);
