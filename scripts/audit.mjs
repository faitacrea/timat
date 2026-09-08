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
import fs from "node:fs";
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
// « Minimum conventionnel » designe ici le salaire horaire brut par enfant,
// 4,20 € depuis le 1er juin 2026. Une page qui l'evoque sans le chiffrer laisse
// le lecteur devant le minimum legal, plus bas : c'est l'erreur qui avait fait
// valider des bulletins sous-payes.
//
// La convention emploie le meme terme pour l'indemnite d'entretien, dont le
// minimum n'a rien a voir (2,65 € par journee, ou 0,435 € par heure au-dela de
// six heures). Ces occurrences-la sont ecartees avant le controle, sinon un
// texte exact sur l'entretien serait signale a tort — c'est arrive.
const MIN_CONV_ENTRETIEN = /minimum conventionnel\s+d(?:e l)?'\s*indemnité\s+d'\s*entretien/gi;

for (const p of pages) {
  // Les apostrophes sont echappees a la generation : les normaliser d'abord,
  // sans quoi la mention d'entretien passe au travers du filtre.
  const html = lire(p).replace(/&#39;|&rsquo;|’/g, "'").replace(MIN_CONV_ENTRETIEN, "");
  if (!/minimum conventionnel/i.test(html)) continue;
  if (!/4,20\s*(&nbsp;|\s)?€/.test(html)) {
    signale("montant", `${routeDe(p)} cite le minimum conventionnel sans le chiffrer à 4,20 €`);
  }
}

// --- contraste des jetons de couleur ---
// Six des neuf teintes de l'app echouaient au seuil legal (RGAA / WCAG AA) tout
// en portant du texte : corail 2,36 - sauge 2,66 - turquoise 2,66 - bleu 4,14 -
// or 2,80 - tertiaire 2,86. Une fois corrigees, rien n'empeche qu'une future
// retouche les eclaircisse a nouveau : ce controle est la pour l'interdire.
const luminance = (hex) => {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};
const contraste = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const appSrc = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const racine = appSrc.slice(appSrc.indexOf(":root{"), appSrc.indexOf("}", appSrc.indexOf(":root{")));
const jeton = (nom) => (racine.match(new RegExp("--" + nom + ":(#[0-9A-Fa-f]{6})")) || [])[1];

const CREME = jeton("c") || "#FDFBF8";
// Teintes qui portent du texte ou un bouton : seuil 4,5:1 sur le fond creme.
for (const nom of ["T", "S", "G", "B", "R", "P", "b", "m", "l"]) {
  const hex = jeton(nom);
  if (!hex) { signale("contraste", `le jeton --${nom} est introuvable dans :root`); continue; }
  const r = contraste(hex, CREME);
  if (r < 4.5) signale("contraste", `--${nom} (${hex}) ne tient que ${r.toFixed(2)}:1 sur ${CREME} — il en faut 4,5`);
}
// Couleurs de role : posees sur la pastille d'avatar sous du texte blanc.
const roles = appSrc.match(/const COULEUR_ROLE=\{([^}]*)\}/);
for (const [, role, hex] of (roles ? roles[1] : "").matchAll(/(\w+):"(#[0-9A-Fa-f]{6})"/g)) {
  const r = contraste(hex, "#FFFFFF");
  if (r < 4.5) signale("contraste", `couleur du role ${role} (${hex}) ne tient que ${r.toFixed(2)}:1 sous le texte blanc de l'avatar`);
}

// --- coherence avec le schema de la base ---
// delete_user_account visait les tables « sommeils » et « documents », qui
// n'existent pas : l'erreur ne se voyait qu'a l'execution, et la fonction
// n'effacait rien. Ce controle compare ce que le code cite a l'empreinte du
// schema, pour que ce genre d'ecart se voie a la construction.
const schemaConnu = JSON.parse(readFileSync(new URL("../data/schema-supabase.json", import.meta.url), "utf8"));
const sourcesDonnees = [new URL("../src/App.jsx", import.meta.url)]
  .concat(fs.readdirSync(new URL("../api/", import.meta.url)).filter((f) => f.endsWith(".js")).map((f) => new URL("../api/" + f, import.meta.url)))
  .map((u) => readFileSync(u, "utf8")).join("\n")
  // Un compartiment de stockage n'est pas une table : storage.from("documents")
  // designe un bucket, et le confondre produirait une fausse alerte.
  .replace(/supabase\.storage\.from\("[a-z_-]+"\)/g, "STOCKAGE");

for (const t of new Set([...sourcesDonnees.matchAll(/\.from\("([a-z_]+)"\)/g)].map((m) => m[1]))) {
  if (!schemaConnu[t]) signale("schéma", `la table « ${t} » est appelée par le code mais absente du schéma`);
}
const citees = new Map();
const noter = (t, c) => { if (!citees.has(t)) citees.set(t, new Set()); citees.get(t).add(c); };
for (const m of sourcesDonnees.matchAll(/\.from\("([a-z_]+)"\)\s*\.select\(\s*"([^"*]+)"/g)) {
  for (const brut of m[2].split(/[,\s]+/)) {
    const c = brut.split("(")[0].split(":")[0].trim();
    if (/^[a-z_]+$/.test(c)) noter(m[1], c);
  }
}
for (const m of sourcesDonnees.matchAll(/\.from\("([a-z_]+)"\)\s*\.(?:insert|upsert|update)\(\s*\{([\s\S]{0,600}?)\}/g)) {
  for (const c of m[2].matchAll(/([a-z_]+)\s*:/g)) noter(m[1], c[1]);
}
for (const [t, cols] of citees) {
  if (!schemaConnu[t]) continue;
  for (const c of cols) {
    if (!schemaConnu[t].includes(c)) signale("schéma", `${t}.${c} est utilisée par le code mais absente du schéma`);
  }
}

// --- coherence des modeles de courriel ---
// Un modele demande par l'application mais inconnu de l'API produit un envoi
// silencieusement vide : l'erreur ne remonte pas jusqu'a l'utilisatrice.
const apiMail = readFileSync(new URL("../api/send-email.js", import.meta.url), "utf8");
const modelesApi = new Set([...apiMail.matchAll(/^\s{2}([a-z_]+):\s*\{/gm)].map((m) => m[1]));
for (const m of new Set([...readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").matchAll(/template:"([a-z_]+)"/g)].map((x) => x[1]))) {
  if (!modelesApi.has(m)) signale("courriel", `le modèle « ${m} » est demandé par l'application mais inconnu de api/send-email.js`);
}

// --- chiffres reglementaires ---
// Le SMIC etait fige a 11,88 EUR, soit deux revalorisations de retard, et le
// plafond du credit d'impot etait applique au credit au lieu des depenses.
// Ces valeurs ne se verifient pas a l'oeil : on les controle ici, avec la date
// a laquelle chacune a ete verifiee a la source.
const BAREME = [
  { nom: "SMIC horaire brut",              motif: /\["2026-06-01",\s*12\.31\]/,     source: "info.gouv.fr, 1er juin 2026" },
  { nom: "minimum garanti",                motif: /MINIMUM_GARANTI\s*=\s*4\.35\b/,  source: "revalorisation du 1er juin 2026" },
  { nom: "plancher indemnite d'entretien", motif: /IE_PLANCHER_JOUR\s*=\s*2\.65\b/, source: "CCN 3239, plancher journalier" },
  { nom: "plafond depenses credit impot",  motif: /CI_PLAFOND_DEPENSES\s*=\s*3500\b/, source: "CGI art. 200 quater B" },
  { nom: "cout horaire de reference CMG",  motif: /CHR_AM\s*=\s*4\.91\b/,           source: "Urssaf, 1er avril 2026" },
  { nom: "plafond horaire CMG",            motif: /PLAFOND_H\s*=\s*8\.09\b/,        source: "Urssaf, 1er avril 2026" },
  { nom: "plafond mensuel CMG",            motif: /CMG_MAX\s*=\s*825\.16\b/,        source: "CNAF, 1er avril 2026" },
  { nom: "minimum conventionnel brut",     motif: /MINIMUM_CONV\s*=\s*4\.2\b/,      source: "CCN 3239, 1er juin 2026" },
  { nom: "barème kilométrique 3 CV",       motif: /3:\s*0\.529\b/,                  source: "impots.gouv.fr, barème 2026 reconduit" },
  { nom: "barème kilométrique 4 CV",       motif: /4:\s*0\.606\b/,                  source: "impots.gouv.fr, barème 2026 reconduit" },
  { nom: "barème kilométrique 5 CV",       motif: /5:\s*0\.636\b/,                  source: "impots.gouv.fr, barème 2026 reconduit" },
  { nom: "barème kilométrique 6 CV",       motif: /6:\s*0\.665\b/,                  source: "impots.gouv.fr, barème 2026 reconduit" },
  { nom: "barème kilométrique 7 CV",       motif: /7:\s*0\.697\b/,                  source: "impots.gouv.fr, barème 2026 reconduit" },
];
const sourcesChiffres = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8")
  + readFileSync(new URL("./generate-local.mjs", import.meta.url), "utf8");
for (const { nom, motif, source } of BAREME) {
  if (!motif.test(sourcesChiffres)) {
    signale("chiffre", `${nom} ne vaut plus la valeur vérifiée (${source}) — vérifier à la source avant de modifier`);
  }
}
// Les deux taux de cotisations doivent venir de la meme table. Le simulateur
// utilisait 27,5 % en dur la ou le bulletin en calculait 44,37 % : la meme
// application annoncait deux couts employeur differents.
if (/cotPat\s*=\s*salBrut\s*\*\s*0?\.\d+/.test(sourcesChiffres)) {
  signale("chiffre", "le taux patronal du simulateur est écrit en dur au lieu d'être dérivé de TAUX_COTISATIONS : il peut diverger du bulletin");
}
// Le total salarial de la table doit rester egal a la constante utilisee
// ailleurs : c'est ce recoupement qui confirme que la table est juste.
const tableCot = sourcesChiffres.slice(sourcesChiffres.indexOf("const TAUX_COTISATIONS={"), sourcesChiffres.indexOf("const TAUX_PATRONAL_TOTAL"));
let totalSal = 0;
for (const m of tableCot.matchAll(/sal:([\d.]+),pat:[\d.]+(?:,base:([\d.]+))?/g)) {
  totalSal += Number(m[1]) * (m[2] ? Number(m[2]) : 1);
}
const txSal = Number((sourcesChiffres.match(/TX_SAL\s*=\s*(0\.\d+)/) || [])[1]) * 100;
if (txSal && Math.abs(totalSal - txSal) > 0.01) {
  signale("chiffre", `le total salarial de TAUX_COTISATIONS (${totalSal.toFixed(4)} %) ne correspond plus à TX_SAL (${txSal.toFixed(4)} %)`);
}

// Le plafond du credit d'impot porte sur les depenses : un credit plafonne a
// 3 500 EUR vaudrait le double du maximum reel.
if (/creditImpot\s*=\s*Math\.min\([^;]*?\*\s*0?\.5\s*,\s*3500/.test(sourcesChiffres)) {
  signale("chiffre", "le plafond de 3 500 € est appliqué au crédit d'impôt et non aux dépenses : le crédit annoncé vaut le double du réel");
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
