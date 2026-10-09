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
import { lireApp, fichiersApp as fichiersAppSrc } from "./sources-app.mjs";

// Tout ce qui lit « le code de l'application » passe par scripts/sources-app.mjs :
// le fichier dit pourquoi, et un module nouveau y est couvert du jour où il existe.
const FICHIERS_APP = fichiersAppSrc().map((u) => "../src/" + u.pathname.split("/").pop());

const RACINE = process.cwd();
const DIST = path.join(RACINE, "dist");
const SITE = "https://www.timat.app";
const strict = process.argv.includes("--strict");

const anomalies = [];
const signale = (cat, msg) => anomalies.push({ cat, msg });

// --- un marqueur de conflit oublie dans un fichier ---
//
// « git add -A » apres une resolution de conflit stage TOUT, y compris les
// fichiers dont le conflit n'a PAS ete resolu. Trois fichiers sont ainsi
// partis avec leurs marqueurs dedans : package.json, qui a casse npm tout de
// suite, mais aussi le schema de la base et le parcours visuel — deux fichiers
// que la construction ne lit pas, et qui seraient passes inapercus.
//
// C'est le fichier que personne ne lit qui garde le marqueur. On les regarde
// donc tous — ET EN PREMIER. Place plus bas, ce controle ne se declenchait
// jamais sur un JSON abime : le JSON.parse du schema levait avant, l'audit
// mourait sur une trace de pile, et la seule chose qu'on apprenait etait
// qu'un fichier etait illisible — pas lequel, ni pourquoi.
{
  const marqueur = /^(?:<{7}|={7}|>{7})(?: |$)/m;
  const ignores = new Set(["node_modules", ".git", "dist", "documents", ".vercel"]);
  const aVoir = [];
  const parcourir = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignores.has(e.name)) continue;
      const complet = path.join(dir, e.name);
      if (e.isDirectory()) parcourir(complet);
      else if (/\.(jsx?|mjs|json|html|css|md|sql|ya?ml)$/.test(e.name)) aVoir.push(complet);
    }
  };
  parcourir(RACINE);
  for (const f of aVoir) {
    // L'audit se decrit lui-meme : la regex ci-dessus contient le motif.
    if (path.resolve(f) === path.resolve(new URL(import.meta.url).pathname)) continue;
    if (marqueur.test(readFileSync(f, "utf8"))) {
      signale("conflit", `${path.relative(RACINE, f)} contient un marqueur de conflit de fusion non resolu`);
    }
  }

  // ON S'ARRETE ICI, et on parle. Detecter ne suffisait pas : le reste de
  // l'audit parse ces memes fichiers, et un JSON a moitie fusionne le faisait
  // mourir sur une trace de pile AVANT que le rapport ne s'affiche. La
  // conclusion etait trouvee, et personne ne la lisait.
  //
  // Un marqueur oublie rend de toute facon tout ce qui suit sans valeur : on
  // n'audite pas un fichier qu'on sait a moitie fusionne.
  if (anomalies.length) {
    console.log(`\n## conflit — ${anomalies.length}`);
    for (const a of anomalies) console.log(`   ${a.msg}`);
    console.log("\nAudit interrompu : resolvez ces conflits avant tout le reste.\n");
    process.exit(1);
  }
}


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

// --- les avertissements que la construction repete depuis des mois ---
//
// esbuild signalait trois cles dupliquees dans src/App.jsx a CHAQUE
// construction. Une cle dupliquee est un bug silencieux : la seconde valeur
// ecrase la premiere, et la premiere devient du code mort que personne ne sait
// mort. Le trace d'icone « dossier » etait ainsi ignore depuis qu'un second
// avait ete ajoute quarante lignes plus bas.
//
// Ces avertissements ne font pas echouer la construction, alors on apprend a
// les ignorer — et le jour ou il en apparait un qui compte, il se noie dans
// ceux qu'on ignore deja.
//
// ON NE REECRIT PAS LE DETECTEUR. Un premier essai le faisait a la regex : il
// sortait 293 faux positifs, parce qu'un objet litteral en contient d'autres et
// qu'une cle repetee dans DEUX objets imbriques differents n'est pas un
// doublon. esbuild, lui, analyse vraiment le code — et il est deja la, c'est
// lui qui construit le projet. On lui demande donc son avis directement.
{
  try {
    const esbuild = await import("esbuild");
    const avertissements = [];
    // Un try/catch AUTOUR DE LA BOUCLE laissait passer tout le reste : deux
    // fichiers de src/ etaient du Markdown avec une extension .jsx, esbuild
    // levait une erreur sur le premier, et la barriere se taisait sur les
    // neuf autres. Le rapport disait « non verifie » — une ligne qu'on lit
    // comme un succes. Chaque fichier est donc isole, et un fichier de src/
    // qui ne s'analyse pas est lui-meme un signalement : c'est soit une
    // erreur de syntaxe, soit un fichier qui n'a rien a faire la.
    for (const fichier of fichiersAppSrc()) {
      const nom = decodeURIComponent(String(fichier)).split("/").pop();
      const src = readFileSync(fichier, "utf8");
      let r;
      try {
        r = await esbuild.transform(src, { loader: "jsx", logLevel: "silent" });
      } catch (err) {
        const p = err.errors?.[0];
        avertissements.push(`${nom}:${p?.location?.line ?? "?"} — ne s'analyse pas : ${p?.text ?? err.message}`);
        continue;
      }
      for (const a of r.warnings || []) {
        avertissements.push(`${nom}:${a.location?.line ?? "?"} — ${a.text}`);
      }
    }
    if (avertissements.length) {
      signale("construction", `${avertissements.length} avertissement(s) d'esbuild, répété(s) à chaque construction : ${avertissements.slice(0, 4).join(" ; ")}${avertissements.length > 4 ? "…" : ""}`);
    }
  } catch (e) {
    console.log(`  (avertissements de construction : non vérifiés — ${e.message})`);
  }
}

// --- un lien interne qui ne mene nulle part ---
//
// La barriere « pages orphelines » regarde qui pointe VERS une page. Celle-ci
// regarde l'inverse : ce vers quoi les pages pointent. Un href qui tombe sur du
// vide ne casse rien a la construction, ne leve aucune erreur, et ne se voit
// qu'au clic — donc chez la visiteuse, jamais ici.
//
// Les ancres (#tarifs), les liens externes, les mailto et les tel: ne sont pas
// concernes : ils ne dependent pas de nos fichiers.
{
  const morts = new Map();
  for (const p of pages) {
    const html = lire(p);
    for (const [, href] of html.matchAll(/<a[^>]+href="([^"]+)"/g)) {
      if (!href.startsWith("/")) continue;            // externe, ancre, mailto, tel
      const chemin = href.split(/[?#]/)[0];
      if (!chemin || chemin === "/") continue;
      const variantes = [chemin, chemin.replace(/\/$/, ""), chemin + "/", chemin + ".html"];
      if (variantes.some((v) => routes.has(v))) continue;
      // Un lien peut viser un FICHIER servi tel quel — un PDF a telecharger,
      // une image — et pas une page. « routes » ne contient que des pages :
      // sans ce test, chaque document telechargeable etait signale comme lien
      // mort. On regarde donc si le fichier existe vraiment dans dist/.
      if (fs.existsSync(path.join(DIST, chemin))) continue;
      // Le blog est genere depuis Sanity : sans reseau, ses routes manquent et
      // tout lien vers /blog/... paraitrait mort. On se tait plutot que de crier.
      if (!blogConnu && chemin.startsWith("/blog")) continue;
      if (!morts.has(chemin)) morts.set(chemin, new Set());
      morts.get(chemin).add(routeDe(p));
    }
  }
  for (const [chemin, depuis] of morts) {
    const l = [...depuis];
    signale("liens", `${chemin} ne mène nulle part, et ${l.length} page(s) y renvoient : ${l.slice(0, 3).join(", ")}${l.length > 3 ? "…" : ""}`);
  }
}

// --- deux pages qui racontent la meme chose a Google ---
//
// Deux pages avec le meme <title> ou la meme meta description se font
// concurrence dans les resultats de recherche : Google en choisit une, souvent
// pas celle qu'on voulait, et parfois n'en garde aucune. Sur un site de 280
// pages construites par gabarit, c'est l'erreur qui arrive toute seule — il
// suffit qu'une variable ne soit pas interpolee.
{
  const parTitre = new Map(), parDesc = new Map();
  for (const p of pages) {
    const html = lire(p);
    if (estNoindex(html)) continue;
    const t = ((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "").trim();
    const d = ((html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i) || [])[1] || "").trim();
    if (t) { if (!parTitre.has(t)) parTitre.set(t, []); parTitre.get(t).push(routeDe(p)); }
    if (d) { if (!parDesc.has(d)) parDesc.set(d, []); parDesc.get(d).push(routeDe(p)); }
  }
  for (const [quoi, carte] of [["titre", parTitre], ["description", parDesc]]) {
    for (const [valeur, ou] of carte) {
      if (ou.length < 2) continue;
      signale("seo", `${ou.length} pages partagent le même ${quoi} « ${valeur.slice(0, 55)}… » — elles se font concurrence dans Google : ${ou.slice(0, 3).join(", ")}${ou.length > 3 ? "…" : ""}`);
    }
  }
}

// --- des donnees structurees que Google refusera ---
//
// Le JSON-LD est ecrit a la main dans les gabarits. Un JSON casse est ignore en
// silence par le navigateur ET par Google : on perd l'etoile de la FAQ ou le
// fil d'Ariane dans les resultats, sans qu'aucune page ne paraisse abimee.
//
// On verifie trois choses : que le JSON se lit, qu'il annonce un @type, et que
// les types que nous utilisons portent bien les champs que Google exige.
{
  const REQUIS = {
    FAQPage: ["mainEntity"],
    BreadcrumbList: ["itemListElement"],
    Article: ["headline"],
    BlogPosting: ["headline"],
    Organization: ["name"],
    WebPage: ["name"],
    Blog: ["name"],
    CollectionPage: ["name"],
    ItemList: ["itemListElement"],
    Product: ["name"],
    SoftwareApplication: ["name"],
  };
  for (const p of pages) {
    const html = lire(p);
    for (const [, bloc] of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      let donnees;
      try { donnees = JSON.parse(bloc); }
      catch (e) {
        signale("donnees structurees", `${routeDe(p)} contient un JSON-LD illisible (${e.message.slice(0, 60)}) — Google l'ignorera sans rien dire.`);
        continue;
      }
      for (const n of [].concat(donnees)) {
        if (!n || typeof n !== "object") continue;
        const type = n["@type"];
        if (!type) { signale("donnees structurees", `${routeDe(p)} : un bloc JSON-LD sans @type.`); continue; }
        const manque = (REQUIS[type] || []).filter((c) => n[c] === undefined);
        if (manque.length) {
          signale("donnees structurees", `${routeDe(p)} : le bloc ${type} n'a pas ${manque.join(" ni ")} — Google exige ce champ pour l'afficher.`);
        }
      }
    }
  }
}

// --- une image qui fait sauter la page pendant son chargement ---
//
// Une <img> sans width ni height ne reserve pas sa place : le texte est mis en
// page, puis l'image arrive et pousse tout vers le bas. C'est le decalage que
// Google mesure sous le nom de CLS, et c'est ce qui fait cliquer a cote sur un
// telephone. Deux attributs suffisent a l'eviter.
{
  const sansTaille = new Map();
  for (const p of pages) {
    const html = lire(p);
    // [^>]* s'arretait au PREMIER « > », meme place dans la valeur d'un
    // attribut : le onerror du logo contient « <span ...> », et la balise
    // etait coupee en deux avant qu'on cherche width=. Les valeurs entre
    // guillemets sont donc traversees d'un bloc.
    for (const [balise] of html.matchAll(/<img\b(?:"[^"]*"|[^>"])*>/g)) {
      // On cherche width= SUR la balise, pas DANS la valeur d'un autre
      // attribut. La premiere version se contentait d'un /\bwidth\s*=/ sur
      // toute la chaine : le logo portait un onerror="...<span class=&quot;wm&quot;
      // width=&quot;95&quot;..." et l'audit le comptait comme dimensionne.
      // Verte, et fausse — sur 213 pages. Les valeurs entre guillemets sont
      // donc retirees avant de chercher les attributs.
      const attrs = balise.replace(/"[^"]*"/g, '""');
      if (/\bwidth\s*=/.test(attrs) && /\bheight\s*=/.test(attrs)) continue;
      if (/style="[^"]*\b(width|aspect-ratio)\s*:/.test(balise)) continue;
      const src = (balise.match(/\bsrc="([^"]+)"/) || [])[1] || "(sans src)";
      const r = routeDe(p);
      if (!sansTaille.has(r)) sansTaille.set(r, new Set());
      sansTaille.get(r).add(src.split("/").pop());
    }
  }
  for (const [r, srcs] of sansTaille) {
    const l = [...srcs];
    signale("mise en page", `${r} : ${l.length} image(s) sans largeur ni hauteur — la page sautera pendant leur chargement : ${l.slice(0, 3).join(", ")}${l.length > 3 ? "…" : ""}`);
  }
}

// --- cohérence du minimum conventionnel ---
// « Minimum conventionnel » designe ici le salaire horaire brut par enfant,
// 4,20 € depuis le 1er juin 2026. Une page qui l'evoque sans le chiffrer laisse
// le lecteur devant le minimum legal, plus bas : c'est l'erreur qui avait fait
// valider des bulletins sous-payes.
//
// La convention emploie le meme terme pour l'indemnite d'entretien, dont le
// minimum n'a rien a voir (2,65 € par journee, ou 0,435 € par heure au-dela de
// six heures). Ces occurrences-la doivent etre ecartees, sinon un texte exact
// sur l'entretien est signale a tort — c'est arrive deux fois.
//
// La premiere version n'ecartait qu'une seule tournure, « minimum conventionnel
// de l'indemnite d'entretien ». Un article ecrivant la meme chose dans l'autre
// sens — « l'indemnite d'entretien a un minimum conventionnel » — passait au
// travers et etait signale alors qu'il etait juste.
//
// On regarde donc le VOISINAGE de chaque occurrence : si la phrase parle
// d'entretien, c'est l'autre minimum, et on l'ecarte.
//
// Le chiffre, lui, se cherche sur la PAGE ENTIERE et non dans le voisinage.
// J'avais d'abord resserre le controle occurrence par occurrence : il a
// signale 94 pages departementales pourtant irreprochables, qui annoncent
// « Minimum conventionnel — 4,20 € brut » dans un tableau dedie puis
// emploient l'expression seule plus loin (« dans le respect du minimum
// conventionnel »). Le lecteur a bien le chiffre ; exiger qu'il soit repete
// a chaque phrase n'apporte rien et noie les vraies alertes.
const VOISINAGE = 320;

for (const p of pages) {
  // Les apostrophes sont echappees a la generation : les normaliser d'abord.
  const html = lire(p).replace(/&#39;|&rsquo;|’/g, "'");
  const parleDuSalaire = [...html.matchAll(/minimum conventionnel/gi)].some((m) => {
    const autour = html.slice(Math.max(0, m.index - VOISINAGE), m.index + VOISINAGE);
    return !/entretien/i.test(autour);
  });
  if (!parleDuSalaire) continue;
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

const appSrc = lireApp();
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
const sourcesDonnees = FICHIERS_APP.map((f) => new URL(f, import.meta.url))
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
// Les cles d'un objet imbrique ne sont pas des colonnes : « preuve:{le:…} »
// ecrit UNE colonne jsonb nommee preuve, pas deux colonnes « le » et
// « version ». On ne retient donc que le premier niveau d'accolades, en
// suivant la profondeur plutot qu'en s'arretant a la premiere fermante.
for (const m of sourcesDonnees.matchAll(/\.from\("([a-z_]+)"\)\s*\.(?:insert|upsert|update)\(\s*\{/g)) {
  const debut = m.index + m[0].length;
  let profondeur = 1, i = debut, niveau1 = "";
  while (i < sourcesDonnees.length && profondeur > 0 && i - debut < 2000) {
    const c = sourcesDonnees[i];
    if (c === "{" || c === "[") profondeur++;
    else if (c === "}" || c === "]") profondeur--;
    if (profondeur === 1 && c !== "}" && c !== "]") niveau1 += c;
    i++;
  }
  // Les commentaires aussi contiennent des deux-points : « // Non renseigne a
  // la creation : … » se lisait comme une colonne « creation ».
  const sansCommentaires = niveau1.replace(/\/\/[^\n]*/g, "");
  for (const c of sansCommentaires.matchAll(/([a-z_]+)\s*:/g)) noter(m[1], c[1]);
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
for (const m of new Set([...lireApp().matchAll(/template:"([a-z_]+)"/g)].map((x) => x[1]))) {
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
  { nom: "plancher de ressources CMG",     motif: /PLANCHER_RESSOURCES=814\.02\b/, source: "CAF/Urssaf 2026, trois sources concordantes" },
  { nom: "plafond de ressources CMG",      motif: /PLAFOND_RESSOURCES=8500\b/,     source: "CAF/Urssaf 2026" },
  { nom: "allocation de formation horaire",  motif: /ALLOC_FORMATION_H = 5\.57\b/, source: "IPERIA / France Emploi Domicile, 1er avril 2025" },
  { nom: "plafond annuel formation",         motif: /ALLOC_FORMATION_PLAFOND_H = 58\b/, source: "plan de développement des compétences, 58 h/an" },
  { nom: "minimum conventionnel assmat",     motif: /\["2026-06-01",4\.20\]/,       source: "CCN 3239, avenant n° 10, 1er juin 2026" },
  { nom: "majoration du titre AM-GE",       motif: /MAJORATION_TITRE_AMGE=0\.04/,   source: "CCN 3239, art. 113 et annexe 5 : + 4 %" },
  { nom: "semaines année complète",        motif: /const SEMAINES_ANNEE_COMPLETE=52;/, source: "CCN 3239 : 52 semaines, congés inclus" },
  { nom: "seuil année incomplète",         motif: /const SEMAINES_MAX_ANNEE_INCOMPLETE=46;/, source: "CCN 3239 : 46 semaines ou moins" },
  { nom: "préavis fin de contrat",         motif: /if\(m<3\)return 8;\s*\n?\s*if\(m<12\)return 15;/, source: "CCN 3239 : 8 j, 15 j, 1 mois selon ancienneté" },
  { nom: "congés payés par mois",          motif: /const CP_PAR_MOIS=2\.5;/,       source: "code du travail art. L. 3141-3" },
  { nom: "plafond annuel de congés",       motif: /const CP_MAX_AN=30;/,           source: "30 jours ouvrables par période de référence" },
  { nom: "règle du dixième",               motif: /const TAUX_DIXIEME=0\.10;/,     source: "code du travail art. L. 3141-24" },
  { nom: "diviseur indemnité de rupture",  motif: /const DIVISEUR_INDEMNITE_RUPTURE=80;/, source: "CCN 3239 : 1/80 du brut total" },
  { nom: "ancienneté minimale de rupture", motif: /const ANCIENNETE_MIN_RUPTURE_MOIS=9;/, source: "CCN 3239 : 9 mois" },
  { nom: "coefficient du minimum légal",     motif: /COEF_MINIMUM_LEGAL=0\.281\b/,   source: "CASF art. D. 423-9 : 0,281 × SMIC" },
  { nom: "taux du crédit d'impôt",           motif: /CI_TAUX\s*=\s*0\.5\b/,          source: "CGI art. 200 quater B : 50 %" },
  { nom: "minimum conventionnel brut",     motif: /MINIMUM_CONV\s*=\s*4\.2\b/,      source: "CCN 3239, 1er juin 2026" },
  { nom: "barème kilométrique 3 CV",       motif: /3:\s*0\.529\b/,                  source: "impots.gouv.fr, barème 2026 reconduit" },
  { nom: "barème kilométrique 4 CV",       motif: /4:\s*0\.606\b/,                  source: "impots.gouv.fr, barème 2026 reconduit" },
  { nom: "barème kilométrique 5 CV",       motif: /5:\s*0\.636\b/,                  source: "impots.gouv.fr, barème 2026 reconduit" },
  { nom: "barème kilométrique 6 CV",       motif: /6:\s*0\.665\b/,                  source: "impots.gouv.fr, barème 2026 reconduit" },
  { nom: "barème kilométrique 7 CV",       motif: /7:\s*0\.697\b/,                  source: "impots.gouv.fr, barème 2026 reconduit" },
  { nom: "plancher kilométrique 3 à 5 CV", motif: /PLANCHER_KM_CONV=\{3:0\.33,4:0\.33,5:0\.33,/, source: "arrêté du 29 mai 2026, art. 10 du décret 2006-781 (Légifrance JORFTEXT000054154617)" },
  { nom: "plancher kilométrique 6 et 7 CV", motif: /PLANCHER_KM_CONV=\{.*6:0\.42,7:0\.42\}/,     source: "arrêté du 29 mai 2026, art. 10 du décret 2006-781 (Légifrance JORFTEXT000054154617)" },
  { nom: "abattement AEEH (4× au lieu de 3×)", motif: /baseMult\s*=\s*aeeh\s*\?\s*4\s*:\s*3/, source: "CGI art. 80 sexies, vérifié sur Légifrance" },
];
const sourcesChiffres = lireApp()
  + readFileSync(new URL("./generate-local.mjs", import.meta.url), "utf8");
for (const { nom, motif, source } of BAREME) {
  if (!motif.test(sourcesChiffres)) {
    signale("chiffre", `${nom} ne vaut plus la valeur vérifiée (${source}) — vérifier à la source avant de modifier`);
  }
}
// --- valeurs perimees : l'interdiction, pas seulement la presence ---
//
// BAREME ci-dessus verifie qu'une valeur juste EXISTE quelque part. Il ne dit
// rien des copies restees fausses ailleurs : le plancher CMG etait verrouille a
// 814,02 dans le simulateur parent pendant que quatre autres endroits — dont un
// outil pro et deux simulateurs publics — calculaient encore sur 814,62. L'audit
// annoncait « aucune anomalie » et l'application donnait deux reponses.
//
// On interdit donc la valeur perimee elle-meme, partout, y compris dans les
// pages statiques de public/ que BAREME ne lisait pas.
const PORTEE_PERIMEES = [
  ...FICHIERS_APP,
  "./generate-local.mjs",
  "./generate-blog.mjs",
  ...readdirSync(new URL("../public/", import.meta.url))
      .filter((f) => f.endsWith(".html"))
      .map((f) => "../public/" + f),
];
const PERIMEES = [
  { motif: /814[.,]62/,   quoi: "plancher de ressources CMG périmé (814,62)", bon: "814,02" },
  { motif: /≈ 2,65 € pour 9 ?h/, quoi: "minimum d'entretien annoncé à 2,65 € pour 9 h", bon: "3,92 € pour 9 h ; 2,65 € est le plancher absolu" },
  { motif: /\*\s*0\.275\b/, quoi: "cotisations patronales figées à 27,5 %", bon: "TAUX_PATRONAL_TOTAL, calculé depuis la table des cotisations" },
  { motif: /0\.7822|0,7822/, quoi: "coefficient net/brut inventé (0,7822)", bon: "brutDepuisNet(), calculé depuis la table des cotisations" },
];
for (const rel of PORTEE_PERIMEES) {
  let texte;
  try { texte = readFileSync(new URL(rel, import.meta.url), "utf8"); } catch { continue; }
  for (const { motif, quoi, bon } of PERIMEES) {
    if (motif.test(texte)) signale("chiffre", `${rel} : ${quoi} — attendu : ${bon}`);
  }
}

// Le bareme CMG ne doit exister qu'en un exemplaire dans l'application : deux
// copies avaient deja diverge sur le plancher de ressources.
const occurrencesCHR = (lireApp().match(/CHR_AM\s*=/g) || []).length;
if (occurrencesCHR !== 1) {
  signale("chiffre", `le barème CMG est déclaré ${occurrencesCHR} fois dans src/ — il doit l'être une seule dans src/, sans quoi les copies divergent`);
}

// --- un return dont la valeur est avalee par un commentaire ---
//
// « if(...)return // P16D : ... <OnboardingWizard/> ... ; » tenait sur une seule
// ligne. Tout ce qui suivait les deux barres etait un commentaire : la fonction
// retournait undefined, et une assistante maternelle qui venait de s'inscrire
// tombait sur une page blanche au lieu de son premier pas. Personne ne l'a vu
// pendant dix jours, parce que rien ne plante : React ne rend rien, c'est tout.
for (const u of fichiersAppSrc()) {
  const nom = u.pathname.split("/").pop();
  readFileSync(u, "utf8").split("\n").forEach((ligne, i) => {
    // Une ligne qui est elle-meme un commentaire ne retourne rien : celle qui
    // raconte ce bug ci-dessus contient « return // » et se signalait elle-meme.
    if (/^\s*(\/\/|\*|\/\*)/.test(ligne)) return;
    if (/\breturn\s*\/\/\s*\S/.test(ligne)) {
      signale("retour", `${nom}:${i + 1} — « return » suivi d'un commentaire sur la même ligne : la valeur est avalée, la fonction retourne undefined`);
    }
  });
}

// --- un texte de la landing ecrit dans la couleur de son fond ---
//
// s2TitleColor valait #0D1B2A : exactement la couleur de depart du degrade qui
// sert de fond a cette section. Le titre etait invisible. faqTitleColor valait
// #FFFFFF sur le creme #F4F1EA : « Questions frequentes » ne se lisait pas
// davantage. Dans les deux cas le code prevoyait un repli correct, et c'est la
// configuration qui l'ecrasait — donc rien ne plantait, et la landing est
// partie en ligne avec deux titres illisibles.
{
  const app = readFileSync(fichiersAppSrc().find((u) => u.pathname.endsWith("/App.jsx")), "utf8");
  const val = (cle) => (app.match(new RegExp(cle + ':\\s*"([^"]+)"')) || [])[1];
  // Un degrade : on prend chacune de ses teintes, et on exige que le texte
  // passe sur toutes — un titre lisible en haut du degrade et noye en bas
  // reste un titre illisible.
  const teintes = (v) => (v || "").match(/#[0-9A-Fa-f]{6}/g) || [];
  const COUPLES = [
    // Le hero n'était surveillé par AUCUN couple : il a basculé du crème au
    // marine sans qu'une seule barrière ait quoi que ce soit à dire, alors que
    // son titre, son sous-titre et ses lignes de réassurance y deviennent
    // illisibles d'un seul changement de fond.
    ["heroTitleColor", "heroBg", 3],
    ["heroAccentColor", "heroBg", 3],
    ["heroSubColor", "heroBg", 4.5],
    ["heroSubDescColor", "heroBg", 4.5],
    ["heroBadgeColor", "heroBg", 4.5],
    ["heroTagsColor", "heroBg", 4.5],
    ["heroBtnSecColor", "heroBg", 4.5],
    ["navBtnColor", "heroBg", 4.5],
    ["s1TitleColor", "section1Bg", 3],
    ["tableTitleColor", "section1Bg", 4.5],
    ["tableAvecColor", "section1Bg", 4.5],
    ["comboPbColor", "section1Bg", 4.5],
    ["comboSolColor", "section1Bg", 4.5],
    ["sourcesTitleColor", "sectionSourcesBg", 3],
    ["sourcesDescColor", "sectionSourcesBg", 4.5],
    ["blogTitleColor", "blogBg", 3],
    ["blogDescColor", "blogBg", 4.5],
    ["freeLabelColor", "section6Bg", 4.5],
    ["freeDescColor", "section6Bg", 4.5],
    ["s2TitleColor", "section2Bg", 3],
    ["s2DescColor", "section2Bg", 4.5],
    ["faqTitleColor", "faqBg", 3],
    ["faqDescColor", "faqBg", 4.5],
    ["s5TitleColor", "section5Bg", 3],
    ["s4TitleColor", "section4Bg", 3],
    ["s6TitleColor", "section6Bg", 3],
    ["s6SubColor", "section6Bg", 4.5],
    ["guaranteesColor", "section6Bg", 4.5],
    ["s1DescColor", "section1Bg", 4.5],
    ["tableSubColor", "section1Bg", 4.5],
    ["tableSansColor", "section1Bg", 4.5],
  ];
  // Ce contrôle sert deux fois : sur DEFAULT_CONFIG ici, puis plus bas sur la
  // configuration RÉELLEMENT servie — la base fusionnée par-dessus le code.
  globalThis.__verifieContrastesLanding = (lis, origine) => {
  for (const [cTexte, cFond, seuil] of COUPLES) {
    const texte = lis(cTexte), fond = lis(cFond);
    // Une clé absente de DEFAULT_CONFIG désactivait SA PROPRE barrière, en
    // silence : le rendu retombait alors sur un repli littéral que personne
    // ne relit. C'est ainsi que la colonne de gauche du tableau comparatif
    // est passée en blanc sur blanc sans qu'un seul contrôle ne bronche.
    // Une couleur surveillée doit donc être déclarée pour de bon.
    if (!origine && !texte) {
      signale("contraste", `${cTexte} est surveillée mais absente de DEFAULT_CONFIG.landing — le rendu retombe sur un repli littéral, et ce contrôle ne sert à rien`);
      continue;
    }
    if (!texte || !fond) continue;
    // J'avais ecarte les couleurs translucides « parce qu'elles se melangent a
    // ce qu'il y a dessous ». C'etait faux quand le fond est uni : la
    // composition est exacte, et c'est justement ce que l'oeil voit. Trois
    // lignes en rgba(255,255,255,.8) sur le creme de la section tarifs sont
    // restees invisibles en ligne a cause de cette exclusion.
    const compose = (av, fondHex) => {
      const m = av.match(/rgba?\(([^)]+)\)/);
      if (!m) return /^#[0-9A-Fa-f]{6}$/.test(av) ? av : null;
      const p2 = m[1].split(",").map((x) => parseFloat(x));
      const al = p2.length > 3 ? p2[3] : 1;
      const f = [1, 3, 5].map((i) => parseInt(fondHex.substr(i, 2), 16));
      const c = [0, 1, 2].map((i) => Math.round(p2[i] * al + f[i] * (1 - al)));
      return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
    };
    for (const t of teintes(fond)) {
      const vue = compose(texte, t);
      if (!vue) continue;
      const r = contraste(vue, t);
      if (r < seuil) {
        signale("contraste", `${origine}${cTexte} (${texte}${vue !== texte ? " → vu " + vue : ""}) sur ${cFond} (${t}) : ${r.toFixed(2)}:1, il en faut ${seuil} — ce texte est illisible sur son propre fond`);
      }
    }
  }
  };
  globalThis.__verifieContrastesLanding(val, "");
}

// --- une seule typographie pour tout le site ---
//
// Le site parlait quatre langues typographiques à la fois : Quicksand + Outfit
// sur la landing, Fraunces + Inter sur les dix-neuf pages d'outils, Fraunces +
// Nunito sur la boutique, Fraunces + Plus Jakarta Sans sur le blog. Six URL
// Google Fonts différentes, donc six jeux de fichiers à télécharger, et une
// visiteuse qui changeait de police au milieu de son parcours.
//
// Ce n'est pas qu'une affaire de goût : deux familles servies partout tiennent
// dans le cache du navigateur, six non. Une page qui réintroduit une famille
// rompt le raccord ET recharge des polices entières pour dire la même marque.
{
  const AUTORISEES = ["Quicksand", "Outfit"];
  const sources = [
    ...readdirSync(new URL("../public/", import.meta.url))
      .filter((f) => f.endsWith(".html"))
      .map((f) => ["public/" + f, readFileSync(new URL("../public/" + f, import.meta.url), "utf8")]),
    ["index.html", readFileSync(new URL("../index.html", import.meta.url), "utf8")],
    ["scripts/generate-blog.mjs", readFileSync(new URL("../scripts/generate-blog.mjs", import.meta.url), "utf8")],
    ["scripts/generate-local.mjs", readFileSync(new URL("../scripts/generate-local.mjs", import.meta.url), "utf8")],
    // De App.jsx on ne regarde QUE la police de la landing. L'application
    // connectée a la sienne — DM Sans pour le corps, Cormorant Garamond pour
    // les documents imprimés, où une serif est un choix et non un oubli. La
    // changer toucherait chaque écran du quotidien et chaque PDF produit :
    // c'est une décision à part, pas un raccord de site vitrine.
    ["src/App.jsx (landing)", (readFileSync(fichiersAppSrc().find((u) => u.pathname.endsWith("/App.jsx")), "utf8")
      .match(/googleFontsUrl:"[^"]+"/) || [""])[0]],
  ];
  const intruses = new Map();
  for (const [nom, code] of sources) {
    for (const m of code.matchAll(/fonts\.googleapis\.com\/css2\?([^"')\s]+)/g)) {
      for (const f of m[1].matchAll(/family=([A-Za-z+]+)/g)) {
        const fam = f[1].replace(/\+/g, " ");
        if (!AUTORISEES.includes(fam)) {
          if (!intruses.has(fam)) intruses.set(fam, new Set());
          intruses.get(fam).add(nom);
        }
      }
    }
  }
  for (const [fam, ou] of intruses) {
    signale("typographie", `la police « ${fam} » est encore demandée par ${[...ou].join(", ")} — le site doit parler une seule langue typographique, et une famille de plus est un téléchargement de plus pour dire la même marque`);
  }
}

// --- le plafond de fonctions serverless du plan Hobby ---
//
// Vercel n'accepte que DOUZE fonctions serverless par déploiement sur le plan
// Hobby. Le projet en comptait douze : ajouter la tâche quotidienne des essais
// en a fait treize, et le déploiement de production a échoué —
// « exceeded_serverless_functions_per_deployment ». La construction, elle,
// avait parfaitement réussi : rien dans le build ne pouvait le voir venir, et
// le site est resté bloqué sur la version précédente sans que personne ne
// comprenne pourquoi.
//
// Ce qui compte : chaque fichier de api/ qui ne commence pas par « _ » (les
// autres sont des modules importés, pas des routes) et qui n'est pas déclaré
// en runtime Edge — les fonctions Edge ont leur propre plafond.
{
  const PLAFOND_HOBBY = 12;
  const dossier = new URL("../api/", import.meta.url);
  const routes = readdirSync(dossier)
    .filter((f) => f.endsWith(".js") && !f.startsWith("_"))
    .map((f) => [f, readFileSync(new URL(f, dossier), "utf8")]);
  const edge = routes.filter(([, c]) => /runtime:\s*['"]edge['"]/.test(c)).map(([f]) => f);
  const serverless = routes.filter(([, c]) => !/runtime:\s*['"]edge['"]/.test(c)).map(([f]) => f);
  if (serverless.length > PLAFOND_HOBBY) {
    signale("vercel", `${serverless.length} fonctions serverless dans api/ — le plan Hobby en accepte ${PLAFOND_HOBBY}. Le déploiement de production ÉCHOUERA alors que la construction réussira, et le site restera sur la version précédente. Passer une route en runtime Edge, ou en fusionner deux. (Edge, hors plafond : ${edge.join(", ") || "aucune"})`);
  }
}

// --- l'essai de deux mois ne doit pas pouvoir redevenir muet ---
//
// Trois façons de le casser sans rien faire planter :
//
//   1. créer un compte avec subscription_status:'free' écrit en dur. Le compte
//      naît sans essai. Personne ne s'en aperçoit avant qu'une assistante
//      maternelle ne demande pourquoi elle n'a pas eu ses deux mois ;
//   2. rendre estPro() aveugle à la date de fin. L'essai ne finit alors JAMAIS,
//      et tout le monde est Pro à vie — la version d'avant faisait exactement
//      cela, et rien ne le signalait ;
//   3. remettre trial_period_days chez Stripe. Les deux mois étant déjà
//      consommés dans TiMat, on en offrirait quatre.
{
  const sources = fichiersAppSrc().map((u) => [u.pathname.split("/").pop(), readFileSync(u, "utf8")]);

  // 1. Toute création de profil passe par abonnementInitial().
  for (const [nom, code] of sources) {
    for (const m of code.matchAll(/from\(['"]profiles['"]\)\s*\.\s*(insert|upsert)\(/g)) {
      const bloc = code.slice(m.index, m.index + 900);
      if (/subscription_status\s*:/.test(bloc) && !/abonnementInitial/.test(bloc)) {
        const ligne = code.slice(0, m.index).split("\n").length;
        signale("essai", `${nom}:${ligne} crée un profil en écrivant subscription_status à la main — ce compte-là n'aura pas ses deux mois d'essai, et rien ne le dira ; passer par abonnementInitial()`);
      }
    }
  }

  const app = sources.find(([n]) => n === "App.jsx")[1];

  // 2. estPro() doit consulter la date de fin.
  const dEstPro = app.match(/export const estPro = \(u\) =>([\s\S]{0,400}?);\n/);
  if (!dEstPro) {
    signale("essai", "estPro() est introuvable — impossible de vérifier que l'essai finit un jour");
  } else if (!/essaiExpire|subscription_end_date/.test(dEstPro[1])) {
    signale("essai", "estPro() accepte « trialing » sans regarder la date de fin — l'essai ne finira jamais et tout compte restera Pro à vie");
  }

  // 3. Stripe ne doit plus offrir une seconde fois les deux mois.
  // Les deux chemins Stripe ont ete reunis dans api/stripe.js pour tenir sous
  // les douze fonctions du plan Hobby ; les anciens chemins sont rediriges.
  const stripe = readFileSync(new URL("../api/stripe.js", import.meta.url), "utf8");
  const actif = stripe.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  if (/trial_period_days/.test(actif)) {
    signale("essai", "api/stripe.js pose encore trial_period_days — les deux mois étant déjà offerts dans TiMat, Stripe en offrirait deux de plus");
  }

  // 4. La tâche quotidienne doit rester déclarée : sans elle, un essai ne finit
  //    que si l'utilisatrice ouvre l'application — donc jamais pour celle qui
  //    ne revient plus, qui est précisément celle qu'il faut prévenir.
  const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  if (!(vercel.crons || []).some((c) => c.path === "/api/cron-essais")) {
    signale("essai", "vercel.json ne déclare plus la tâche quotidienne des essais — les rappels ne partiront plus et aucun essai n'expirera de lui-même");
  }
}

// --- un champ du back-office que la landing ne lit nulle part ---
//
// « Lignes galere solution » (comboRows) est propose au back-office depuis des
// mois. Six lignes y ont ete ecrites avec soin. Elles ne s'affichent nulle
// part : la landing lit tableRows, pas comboRows — le champ a survecu a la
// section qu'il alimentait. Rien ne plante, rien ne previent, et le travail
// est perdu en silence.
//
// On exige donc que toute cle offerte au back-office soit lue quelque part
// dans le rendu, ou declaree dans DEFAULT_CONFIG.
{
  const bo = readFileSync(fichiersAppSrc().find((u) => u.pathname.endsWith("/backoffice.jsx")), "utf8");
  const sources = fichiersAppSrc()
    .filter((u) => !u.pathname.endsWith("/backoffice.jsx"))
    .map((u) => readFileSync(u, "utf8"))
    .join("\n");
  // On ne regarde QUE les cartes du back-office qui écrivent dans la
  // configuration de la landing : ailleurs, des paires ["x","Libellé"] servent
  // à tout autre chose (l'alignement d'un texte, les onglets d'un tableau de
  // bord), et les confondre ferait crier cette barrière pour rien.
  const offertes = new Set();
  for (const carte of bo.split("</BOCard>")) {
    if (!/state=\{cfg\.(landing|txts)\}/.test(carte)) continue;
    for (const m of carte.matchAll(/k="([A-Za-z0-9_]+)"/g)) offertes.add(m[1]);
    for (const m of carte.matchAll(/\["([a-z][A-Za-z0-9_]*)","(?!☰)[^"]*"(?:,\s*true)?\]/g)) offertes.add(m[1]);
  }
  // Le test est volontairement grossier : le nom de la clé apparaît-il quelque
  // part hors du back-office ? Un nom comme « comboRows » est assez
  // distinctif pour que ce soit concluant, et une version plus fine se
  // trompait — elle ne reconnaissait pas (config.landing||{}).demoPuces1.
  // Les cartes qui éditent une LISTE (les encadrés du hero, les articles du
  // blog…) ne passent pas par BOTextInput : elles lisent cfg.<clé> directement.
  // Une liste dont le rendu a disparu se remplit donc aussi en pure perte —
  // c'est arrivé aux encadrés de chiffres du hero le jour où ils ont été
  // retirés de la page.
  for (const carte of bo.split("</BOCard>")) {
    for (const m of carte.matchAll(/\bcfg\.([a-z][A-Za-z0-9_]*)/g)) {
      if (["landing", "txts", "cols", "footer", "legal", "feats", "boutique", "sectionsVisibles", "sectionsOrder"].includes(m[1])) continue;
      offertes.add(m[1]);
    }
  }
  const mortes = [...offertes].filter((cle) => !new RegExp("\\b" + cle + "\\b").test(sources));
  if (mortes.length) {
    signale("back-office", `champ(s) propose(s) au back-office que la page ne lit nulle part : ${mortes.sort().join(", ")} — ce qu'on y ecrit est perdu sans le moindre avertissement`);
  }
}

// --- le back-office fige un texte que le code a change depuis ---
//
// Le hero de la landing a ete reecrit six fois dans le code. En ligne, il
// affichait toujours « Toute la paperasse d'une assistante maternelle » : une
// surcharge enregistree au back-office des mois plus tot, que React applique
// par-dessus DEFAULT_CONFIG au chargement de app_config. La page s'ouvrait avec
// le bon titre — celui d'index.html — puis basculait sur l'ancien.
//
// diffConfig n'enregistre que ce qui DIFFERE des defauts, mais une fois
// enregistree une surcharge ne se perime jamais toute seule : le code peut
// changer dessous sans que rien ne le dise.
//
// Ce controle lit app_config et signale tout texte de landing surcharge par une
// valeur differente de celle du code. Quand la base est injoignable — c'est le
// cas dans la construction en ligne — il le dit, et ne se tait jamais en
// pretendant que tout va bien.
{
  // Deuxième source de lecture : un fichier JSON local. Elle sert quand le
  // réseau ne laisse pas joindre Supabase — et surtout elle rend cette
  // barrière vérifiable, en lui donnant une configuration fabriquée exprès.
  const fichierConfig = process.env.TIMAT_APP_CONFIG;
  const url = process.env.VITE_SUPABASE_URL, cle = process.env.VITE_SUPABASE_KEY;
  if (!fichierConfig && (!url || !cle)) {
    console.log("  (surcharges du back-office : non vérifiées, VITE_SUPABASE_URL/KEY absentes)");
  } else {
    try {
      let ligne;
      if (fichierConfig) {
        ligne = { config: JSON.parse(readFileSync(fichierConfig, "utf8")) };
      } else {
        const r = await fetch(`${url}/rest/v1/app_config?id=eq.main&select=config`, {
          headers: { apikey: cle, Authorization: "Bearer " + cle },
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) throw new Error("HTTP " + r.status);
        [ligne] = await r.json();
      }
      const txts = (ligne && ligne.config && ligne.config.txts) || {};
      const app = readFileSync(fichiersAppSrc().find((u) => u.pathname.endsWith("/App.jsx")), "utf8");

      // --- LES COULEURS DE LA BASE, ET NON CELLES DU CODE ---
      //
      // Le contrôle des contrastes plus haut ne lit que DEFAULT_CONFIG. Or
      // app_config.landing se pose PAR-DESSUS au chargement : c'est la base qui
      // gagne. Un thème changé dans le code et pas dans la base donne donc une
      // landing où du texte disparaît EN LIGNE, sans erreur nulle part et sans
      // qu'aucune barrière ne bronche — le code, lui, est irréprochable.
      //
      // On refait donc exactement le même calcul de contraste, mais sur la
      // fusion que React applique vraiment : la base quand elle dit quelque
      // chose, DEFAULT_CONFIG sinon. Le back-office enregistre des chaînes
      // vides pour les cases non remplies, et React les ignore : on les ignore
      // pareil, sinon on verrait des couleurs que personne n'affiche.
      const landingBase = (ligne && ligne.config && ligne.config.landing) || {};
      const litFusion = (cle) => {
        const enBase = landingBase[cle];
        if (typeof enBase === "string" && enBase.trim() !== "") return enBase.trim();
        const m = app.match(new RegExp("\\b" + cle + ':\\s*"([^"]+)"'));
        return m ? m[1] : undefined;
      };
      globalThis.__verifieContrastesLanding(litFusion, "app_config : ");

      // Une couleur invalide ne « casse » rien non plus : le navigateur
      // l'ignore et retombe sur la couleur héritée, qui peut être n'importe
      // quoi. #ffff (cinq caractères) est resté des mois dans cette table.
      for (const [cle, v] of Object.entries(landingBase)) {
        if (typeof v !== "string" || v.trim() === "") continue;
        const t = v.trim();
        if (!/Color$|Bg$|Border$/.test(cle)) continue;
        const valide = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(t)
          || /^(rgb|rgba|hsl|hsla)\(/i.test(t)
          || /^(linear|radial|conic)-gradient\(/i.test(t)
          || /^(transparent|none|currentColor|inherit)$/i.test(t)
          || /^[a-z]+$/i.test(t);
        if (!valide) {
          signale("surcharge", `app_config impose « ${cle} » = "${t}" — le navigateur ne sait pas lire cette couleur, il l'ignore et garde celle du dessus`);
        }
      }
      for (const [k, v] of Object.entries(txts)) {
        if (typeof v !== "string") continue;
        // Une chaîne vide n'écrase RIEN : _sansVide() l'ignore au rendu, et
        // c'est le code qui s'affiche. Les signaler revenait à crier quatre
        // fois à chaque construction pour des cases simplement laissées
        // blanches au back-office — et une barrière qui crie pour rien finit
        // par n'être plus lue.
        if (v.trim() === "") continue;
        const m = app.match(new RegExp("\\b" + k + ':\\s*"((?:[^"\\\\]|\\\\.)*)"'));
        if (!m) continue;
        const duCode = m[1].replace(/\\"/g, '"').replace(/\\n/g, "\n");
        if (duCode !== v) {
          signale("surcharge", `app_config impose « ${k} » = "${v.slice(0, 60)}" alors que le code dit "${duCode.slice(0, 60)}" — c'est la base qui gagne, la landing en ligne n'affiche pas ce que dit le code`);
        }
      }
    } catch (e) {
      console.log(`  (surcharges du back-office : non vérifiées — ${e.message})`);
    }
  }
}

// --- un article de blog publie sans image de couverture ---
//
// La carte d'un article sans couverture ne montre rien : pas de zone image du
// tout. Sur la page du blog, huit cartes sur cinquante etaient ainsi, et neuf
// des onze brouillons en attente le sont aussi — ils partiront en ligne comme
// ca, un par jour, sans que rien ne le dise.
//
// L'article perd aussi son og:image : partage sur un reseau social ou dans une
// conversation, il arrive sans visuel.
//
// Sanity repond sans jeton, le blog entier est construit ainsi. Quand il est
// injoignable — c'est le cas dans l'environnement de verification — ce controle
// l'ecrit, et ne se tait jamais en pretendant que tout va bien.
{
  const PROJET = "740dzcep", JEU = "production";
  // Les longueurs maximales viennent du schema Sanity (studio/schemas/article).
  // Celles marquees BLOQUANT sont declarees en niveau « error » : le Studio
  // refuse de republier l'article tant qu'elles sont depassees. Les autres sont
  // des avertissements — l'article part en ligne, mais Google tronque.
  //
  // Pourquoi ce controle existe : deux articles ont ete crees par l'API avec un
  // chapo de 303 et 306 caracteres. L'API ne verifie rien ; le Studio, si. Les
  // deux articles etaient donc en ligne, leur couverture ajoutee dans le
  // brouillon, et impossibles a republier — sans que rien n'explique pourquoi.
  const MAX = { chapo: 300, titre: 100, seoTitre: 60, seoDescription: 160 };
  const groq = `{
    "publiesSansImage": *[_type=="article" && !(_id in path("drafts.**")) && !defined(imageCouverture)]{"s": slug.current},
    "brouillonsSansImage": *[_type=="article" && _id in path("drafts.**") && !defined(imageCouverture)]{"s": slug.current},
    "alts": *[_type=="article" && defined(imageCouverture.asset)]{
      "s": slug.current, "alt": imageCouverture.alt,
      "t": titre + " " + chapo + " " + pt::text(corps)
    },
    "tropLongs": *[_type=="article" && (length(chapo) > ${MAX.chapo} || length(titre) > ${MAX.titre} || length(seoTitre) > ${MAX.seoTitre} || length(seoDescription) > ${MAX.seoDescription})]{
      "s": slug.current, "chapo": length(chapo), "titre": length(titre),
      "seoTitre": length(seoTitre), "seoDescription": length(seoDescription)
    }
  }`;
  // LES BROUILLONS N'ETAIENT PAS LUS DU TOUT.
  //
  // L'API publique de Sanity ne renvoie que le PUBLIE. Les deux controles qui
  // portent sur les brouillons — couverture manquante, champ trop long —
  // interrogeaient donc le vide : la reponse valait zero quoi qu'il arrive, et
  // l'audit annoncait « aucune anomalie » sans avoir rien regarde. Quinze
  // articles ecrits, en attente de publication, n'etaient controles par
  // personne.
  //
  // Il faut un jeton de lecture, et surtout il faut le DIRE quand il manque :
  // un controle qui ne peut pas s'executer doit se taire bruyamment, pas
  // passer au vert.
  const jeton = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_READ_TOKEN || "";
  if (!jeton) {
    console.log("  (brouillons du blog : NON VÉRIFIÉS, SANITY_WRITE_TOKEN absent)");
  }
  try {
    const r = await fetch(
      `https://${PROJET}.api.sanity.io/v2024-01-01/data/query/${JEU}?perspective=raw&query=${encodeURIComponent(groq)}`,
      { signal: AbortSignal.timeout(8000), headers: jeton ? { Authorization: "Bearer " + jeton } : {} }
    );
    if (!r.ok) throw new Error("HTTP " + r.status);
    const { result } = await r.json();
    const pub = (result?.publiesSansImage || []).map((x) => x.s);
    const bro = (result?.brouillonsSansImage || []).map((x) => x.s);
    if (pub.length) {
      signale("blog", `${pub.length} article(s) en ligne sans image de couverture — leur carte s'affiche sans visuel et leur partage n'a pas d'aperçu : ${pub.slice(0, 3).join(", ")}${pub.length > 3 ? "…" : ""}`);
    }
    // LE TEXTE ALTERNATIF DE LA COUVERTURE.
    //
    // « Droits et devoirs de l'assistante maternelle » portait « Les heures
    // majorée ne peuvent pas être majorée de moins de 10 % » : deux fautes
    // d'accord, et le sujet d'un AUTRE article — c'etait la phrase des heures
    // majorees, posee sur le mauvais article. La phrase est ecrite sur l'image,
    // donc elle etait lisible en ligne, et c'est elle que lit un lecteur
    // d'ecran.
    //
    // J'AI ESSAYE DE DETECTER « HORS SUJET » AUTOMATIQUEMENT, SANS Y ARRIVER.
    // Comparer les mots du texte alternatif a ceux du titre et du chapo attrape
    // bien celui-la, mais accuse trois textes parfaitement justes — « Le taux
    // horaire ne represente qu'une partie de ce que paie reellement le parent
    // employeur », sur l'article des questions a poser, n'emploie aucun mot du
    // titre et dit pourtant exactement ce qu'il faut. Comparer au corps entier
    // ne denonce plus personne, mais laisse passer le defaut d'origine :
    // l'article des droits et devoirs parle bien, quelque part, des heures
    // majorees. Un comptage de mots ne distingue pas « hors sujet » de
    // « apporte un fait que le titre ne dit pas ».
    //
    // On garde donc les deux verifications qui ne se trompent jamais : un texte
    // alternatif absent, et deux articles qui portent le MEME. Le reste se lit
    // a l'oeil — les soixante-dix-neuf ont ete relus le 3 octobre 2026, et
    // celui-la etait le seul en defaut.
    const sansAlt = [], doublons = [];
    const vus = new Map();
    for (const a of result?.alts || []) {
      const alt = String(a.alt || "").trim();
      if (!alt) { sansAlt.push(a.s); continue; }
      const cle = alt.toLowerCase().replace(/\s+/g, " ");
      if (vus.has(cle)) doublons.push(`${vus.get(cle)} et ${a.s}`);
      else vus.set(cle, a.s);
    }
    if (sansAlt.length) {
      signale("blog", `${sansAlt.length} couverture(s) sans texte alternatif — un lecteur d'écran n'a rien à annoncer : ${sansAlt.slice(0, 3).join(", ")}${sansAlt.length > 3 ? "…" : ""}`);
    }
    if (doublons.length) {
      signale("blog", `${doublons.length} texte(s) alternatif(s) identiques sur deux articles — l'un des deux est posé sur le mauvais article : ${doublons.slice(0, 2).join(" ; ")}`);
    }

    if (bro.length) {
      signale("blog", `${bro.length} brouillon(s) sans image de couverture — ils seront publiés tels quels, un par jour : ${bro.slice(0, 3).join(", ")}${bro.length > 3 ? "…" : ""}`);
    }

    // Un champ trop long par article, le plus grave d'abord : on nomme le
    // blocage plutot que de lister quatre lignes pour le meme article.
    const bloquants = [], tronques = [];
    for (const a of result?.tropLongs || []) {
      if (a.chapo > MAX.chapo) bloquants.push(`${a.s} — chapô ${a.chapo}/${MAX.chapo}`);
      else if (a.titre > MAX.titre) bloquants.push(`${a.s} — titre ${a.titre}/${MAX.titre}`);
      else if (a.seoDescription > MAX.seoDescription) tronques.push(`${a.s} — meta ${a.seoDescription}/${MAX.seoDescription}`);
      else if (a.seoTitre > MAX.seoTitre) tronques.push(`${a.s} — titre SEO ${a.seoTitre}/${MAX.seoTitre}`);
    }
    if (bloquants.length) {
      signale("blog", `${bloquants.length} article(s) que le Studio refusera de republier — le champ dépasse la limite du schéma : ${bloquants.slice(0, 3).join(" ; ")}${bloquants.length > 3 ? "…" : ""}`);
    }
    if (tronques.length) {
      signale("blog", `${tronques.length} article(s) dont Google tronquera le titre ou la description dans ses résultats : ${tronques.slice(0, 3).join(" ; ")}${tronques.length > 3 ? "…" : ""}`);
    }
  } catch (e) {
    console.log(`  (couvertures du blog : non vérifiées — ${e.message})`);
  }
}

// Il y avait ici une barriere qui comparait les deux menus recopies dans
// public/pour-les-parents.html a GROUPS_P. Elle a disparu avec eux : la page
// ne recopie plus rien, elle embarque l'application. La barriere suivante,
// qui verifie que le cadre pointe bien vers un mode existant, couvre
// desormais le seul risque restant.

// --- une section de la landing qui n'a pas de place dans l'ordre ---
//
// L'ordre des sections vient de SECTIONS_ORDER_DEFAULT, que app_config peut
// remplacer depuis le back-office. ord("x") donne la position de x ; un
// identifiant absent de la liste renvoie 999, et la section atterrit tout en
// bas de la page, apres le pied de page, sans que rien ne plante.
//
// La fusion faite dans LandingPage protege le cas « la base ne connait pas
// encore cette section ». Reste le cas « on a ajoute la section et oublie de
// la declarer » : c'est ce que verifie cette barriere.
{
  const app = fs.readFileSync("src/App.jsx", "utf8");
  const liste = app.match(/const SECTIONS_ORDER_DEFAULT\s*=\s*\[([^\]]*)\]/);
  if (!liste) {
    signale("landing", "SECTIONS_ORDER_DEFAULT est introuvable dans src/App.jsx — l'ordre des sections ne peut plus être vérifié.");
  } else {
    const connus = new Set([...liste[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
    const utilises = new Set([...app.matchAll(/\bord\("([^"]+)"\)/g)].map((m) => m[1]));
    const orphelines = [...utilises].filter((id) => !connus.has(id));
    if (orphelines.length) {
      signale("landing", `${orphelines.length} section(s) placée(s) par ord() sans figurer dans SECTIONS_ORDER_DEFAULT — elles s'afficheraient tout en bas de la page, après le pied de page : ${orphelines.join(", ")}`);
    }
    // Et l'inverse : une entree de la liste que plus personne ne place est un
    // reste, qui trompe qui relit l'ordre de la page.
    const mortes = [...connus].filter((id) => !utilises.has(id));
    if (mortes.length) {
      signale("landing", `${mortes.length} entrée(s) de SECTIONS_ORDER_DEFAULT ne correspondent à aucune section : ${mortes.join(", ")}`);
    }
  }
}

// --- une page encadree que le site s'interdit d'encadrer ---
//
// CE QUI S'EST PASSE. public/pour-les-parents.html montre la demonstration de
// l'application dans un <iframe>. Le site entier envoie X-Frame-Options: DENY
// et Content-Security-Policy: frame-ancestors 'none' — un refus d'etre encadre
// qui vaut aussi pour nous-memes. En production, le cadre restait donc vide sur
// un « Chargement de la demonstration… » qui ne finissait jamais.
//
// Rien ne l'avait dit. La construction reussit, l'audit passait, et le serveur
// de verification local n'envoie aucun en-tete : la demo s'affichait
// parfaitement ici et nulle part ailleurs. C'est la proprietaire qui l'a vu,
// deux fois, sur le site en ligne.
//
// LA CORRECTION. La regle generale ne bouge pas : la landing, l'application,
// les outils, le blog, la boutique restent interdits d'encadrement par qui que
// ce soit. Une seule page fait exception, /demo-parent, et seulement pour notre
// propre origine. Elle ne contient que la demonstration : aucun formulaire,
// aucun bouton qui engage, aucune session — il n'y a rien a y detourner par un
// clic. C'est pour cela qu'elle a son propre CHEMIN et non un parametre d'URL :
// les en-tetes de Vercel ne savent pas distinguer une requete par son
// parametre.
//
// CE QUE CETTE BARRIERE VERIFIE. Pour chaque <iframe> qui pointe vers notre
// propre site, le chemin vise doit etre autorise a etre encadre par les
// en-tetes de vercel.json. La derniere regle qui correspond l'emporte, comme
// chez Vercel.
{
  const conf = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
  const regles = conf.headers || [];

  // La valeur effective d'un en-tete pour un chemin : la derniere regle qui
  // correspond gagne, exactement comme Vercel les applique.
  const entete = (chemin, cle) => {
    let valeur = null;
    for (const r of regles) {
      let corresp = false;
      try { corresp = new RegExp("^" + r.source.replace(/:\w+\*?/g, "[^/]+") + "$").test(chemin); }
      catch (e) { corresp = r.source === chemin; }
      if (!corresp) continue;
      for (const h of r.headers || []) if (h.key.toLowerCase() === cle) valeur = h.value;
    }
    return valeur;
  };

  const pages = fs.readdirSync("public").filter((f) => f.endsWith(".html"));
  for (const nom of pages) {
    const html = fs.readFileSync(path.join("public", nom), "utf8");
    for (const [, src] of html.matchAll(/<iframe[^>]*\ssrc="([^"]+)"/g)) {
      const cible = src.replace(/&amp;/g, "&");
      // On ne juge que ce qui vient de chez nous : un cadre vers YouTube ou
      // une carte n'est pas concerne par NOS en-tetes.
      if (!cible.startsWith("/")) continue;
      const chemin = cible.split(/[?#]/)[0];

      const xfo = (entete(chemin, "x-frame-options") || "").toUpperCase();
      const csp = entete(chemin, "content-security-policy") || "";
      const fa = (csp.match(/frame-ancestors([^;]*)/i) || [, ""])[1].toLowerCase();

      if (xfo === "DENY") {
        signale("cadres", `public/${nom} affiche « ${cible} » dans un cadre, mais vercel.json envoie X-Frame-Options: DENY sur ${chemin} — le cadre restera vide en ligne, sans aucune erreur visible.`);
      }
      if (fa.includes("'none'")) {
        signale("cadres", `public/${nom} affiche « ${cible} » dans un cadre, mais vercel.json envoie frame-ancestors 'none' sur ${chemin} — le cadre restera vide en ligne, sans aucune erreur visible.`);
      }
      // Le chemin doit exister : un cadre vers une page qui n'est ni un
      // fichier de public/ ni une reecriture ne montrera rien non plus.
      const connu =
        fs.existsSync(path.join("public", chemin.replace(/^\//, "") || "index.html")) ||
        chemin === "/" ||
        (conf.rewrites || []).some((r) => r.source === chemin);
      if (!connu) {
        signale("cadres", `public/${nom} affiche « ${cible} » dans un cadre, mais ${chemin} n'est ni un fichier de public/ ni une réécriture de vercel.json.`);
      }
    }
  }
}

// --- le cadre de demo pointe vers un chemin que l'application ne reconnait pas ---
//
// public/pour-les-parents.html embarque « /demo-parent ». C'est LandingPage qui
// reconnait ce chemin et ne rend alors que le bloc de demonstration. Renomme
// d'un cote sans l'autre, le cadre afficherait la landing entiere dans une
// boite de 540 px — une page dans une page, et rien ne planterait.
{
  const page = fs.readFileSync("public/pour-les-parents.html", "utf8");
  const app = fs.readFileSync("src/App.jsx", "utf8");
  const cadre = page.match(/<iframe[^>]*id="demo-app"[^>]*src="([^"]+)"/);
  if (!cadre) {
    signale("parents", "Le cadre de la démo (iframe#demo-app) a disparu de public/pour-les-parents.html — la page ne montre plus l'application.");
  } else {
    const chemin = cadre[1].replace(/&amp;/g, "&").split(/[?#]/)[0];
    if (!app.includes(`=== "${chemin}"`)) {
      signale("parents", `Le cadre de la démo appelle « ${chemin} », que src/App.jsx ne reconnaît pas — la page parents afficherait la landing entière dans un cadre.`);
    }
  }
}

// --- une image servie en PNG alors que le WebP existe a cote ---
//
// logoForRole servait des .png de 85 a 143 Ko, en 1 732 px de large, pour un
// rendu de 56 px. PageSpeed chiffrait le seul logo de la barre du haut a 110 Ko
// d'economies. Rien ne plantait : une image trop lourde s'affiche tres bien.
//
// On refuse donc qu'un .png soit reference comme source d'image quand le .webp
// du meme nom existe dans public/. Les balises og:image et les donnees
// structurees restent exemptees : elles sont lues par des robots qui ne
// negocient pas le format, et leur URL doit rester stable.
{
  const dossier = new URL("../public/", import.meta.url);
  const webps = new Set(
    readdirSync(dossier).filter((f) => f.endsWith(".webp")).map((f) => f.replace(/\.webp$/, ""))
  );
  const sources = [...fichiersAppSrc(), new URL("../index.html", import.meta.url)];
  for (const u of sources) {
    const nom = u.pathname.split("/").pop();
    const texte = readFileSync(u, "utf8");
    texte.split("\n").forEach((ligne, i) => {
      if (/og:image|ld\+json|schema\.org|OGIMG|const IMG=/.test(ligne)) return;
      // Le nom est souvent construit : `/logo${s}-parent.png`. Un motif qui
      // exige un nom entier rate ces cas — verifie en remettant le .png, il
      // repondait « aucune anomalie ». On prend donc le prefixe litteral et on
      // regarde si un .webp commence par lui.
      const noms = [
        ...[...ligne.matchAll(/["'`\/]([a-z0-9-]+)\.png\b/g)].map((m) => m[1]),
        ...[...ligne.matchAll(/[`"'\/]([a-z0-9-]+)\$\{[^}]*\}[a-z0-9-]*\.png\b/g)].map((m) => m[1]),
      ];
      for (const nomImage of noms) {
        const m = [nomImage, nomImage];
        if (![...webps].some((w) => w === nomImage || w.startsWith(nomImage))) continue;
        signale("image", `${nom}:${i + 1} sert ${m[1]}.png alors que ${m[1]}.webp existe — une image trop lourde s'affiche très bien, et rien ne le signale`);
      }
    });
  }
}

// --- la marge du hero peint avant React ---
//
// Le LCP retient le plus GRAND element peint, et n'enregistre un nouveau
// candidat que s'il est strictement plus grand. Le hero de demarrage etait en
// padding lateral de 20 px quand .lp-hero passe a 12 px sous 480 px : son titre
// faisait 372 px de large contre 388 pour celui de React. React repeignait donc
// un candidat plus grand vers trois secondes, et le hero peint en 0,8 s ne
// comptait pas. Huit pixels annulaient une partie du decoupage du bundle.
//
// scripts/test-hero-lcp.mjs le verifie pour de vrai, dans un navigateur, a
// quatre largeurs — mais il lui faut Chromium, que la construction en ligne n'a
// pas : branche dans npm run build, il a fait echouer quatre deploiements
// d'affilee. Il se lance donc a la main (npm run hero:lcp), et ce controle-ci,
// purement textuel, garde la cause exacte sous surveillance a chaque build.
{
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = readFileSync(fichiersAppSrc().find((u) => u.pathname.endsWith("/App.jsx")), "utf8");
  // La teinte de l'accent du titre est elle aussi ecrite des deux cotes.
  // index.html disait #C76754, React #E49178 : la page changeait de couleur au
  // relais, et le titre passait sous le seuil de contraste au passage.
  const teinteHtml = (html.match(/#timat-boot h1 em\{[^}]*color:(#[0-9A-Fa-f]{6})/) || [])[1];
  const teinteApp = (app.match(/heroAccentColor:"(#[0-9A-Fa-f]{6})"/) || [])[1];
  if (teinteHtml && teinteApp && teinteHtml.toLowerCase() !== teinteApp.toLowerCase()) {
    signale("hero", `l'accent du titre vaut ${teinteHtml} dans index.html et ${teinteApp} dans DEFAULT_CONFIG — la page changera de couleur quand React prendra le relais`);
  }
  const boot = (html.match(/#timat-boot\{[^}]*padding:\s*[\d.]+px\s+([\d.]+)px/) || [])[1];
  const hero = (app.match(/\.lp-hero\{padding:0\s+([\d.]+)px/g) || []).pop();
  const heroPx = hero ? (hero.match(/([\d.]+)px/) || [])[1] : undefined;
  if (!boot) {
    signale("hero", "index.html : la marge latérale de #timat-boot est illisible — c'est elle qui décide si React reprend le LCP");
  } else if (!heroPx) {
    signale("hero", "src/App.jsx : la marge de .lp-hero est illisible — impossible de vérifier que le hero de démarrage lui correspond");
  } else if (boot !== heroPx) {
    signale("hero", `le hero peint avant React a ${boot} px de marge latérale, celui de React ${heroPx} px — React repeindra un titre plus grand et reprendra le LCP (npm run hero:lcp le mesure dans un navigateur)`);
  }
}

// --- l'URL des polices, ecrite a deux endroits ---
//
// index.html demande les polices des l'analyse du HTML, pour que le hero peint
// avant React ait deja les bonnes mesures. DEFAULT_CONFIG.landing.googleFontsUrl
// dit la meme chose du cote de l'application. Si les deux divergent, le
// navigateur telecharge deux polices et le texte se decale au relais — soit
// exactement le defaut que ce doublon sert a supprimer.
{
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = readFileSync(fichiersAppSrc().find((u) => u.pathname.endsWith("/App.jsx")), "utf8");
  // Une feuille de style ordinaire dans le <head> BLOQUE le premier rendu :
  // rien ne se peint tant que le serveur n'a pas repondu. Ecrite ainsi, elle a
  // fait passer le FCP mobile de 0,8 s a 3,9 s et le score de 87 a 76. Mesure
  // en local avec un serveur de polices a 2,5 s : 2 576 ms de FCP au lieu de 80.
  // On exige donc la forme non bloquante — media="print" puis onload — et on
  // tolere la copie dans <noscript>, qui ne s'applique que sans JavaScript.
  const sansNoscript = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
  for (const m of sansNoscript.matchAll(/<link ([^>]*href="https:\/\/fonts\.googleapis\.com[^"]*"[^>]*)>/g)) {
    const attrs = m[1];
    if (/rel="stylesheet"/.test(attrs) && !/media="print"/.test(attrs)) {
      signale("police", "index.html charge les polices avec une feuille de style bloquante — la page ne peint plus rien tant que Google Fonts n'a pas répondu ; utiliser media=\"print\" puis onload");
    }
  }
  const dansHtml = (html.match(/href="(https:\/\/fonts\.googleapis\.com[^"]+)"/) || [])[1];
  const dansApp = (app.match(/googleFontsUrl:"(https:\/\/fonts\.googleapis\.com[^"]+)"/) || [])[1];
  if (!dansHtml) {
    signale("police", "index.html ne demande plus les polices du hero — la requête repartirait après le démarrage de React, et le texte se décalerait");
  } else if (!dansApp) {
    signale("police", "DEFAULT_CONFIG.landing.googleFontsUrl est introuvable — impossible de vérifier qu'index.html demande la bonne police");
  } else if (dansHtml.replace(/&amp;/g, "&") !== dansApp) {
    signale("police", `index.html et DEFAULT_CONFIG demandent deux polices différentes — le navigateur téléchargerait les deux et le texte se décalerait au relais`);
  }
}

// --- la landing rendue par React doit porter un h1 ---
//
// index.html en pose un pour la premiere peinture, puis React remplacait tout
// le corps par des div : la page servie n'avait plus AUCUN titre de niveau 1.
// Les controles lisaient dist/index.html, ou le h1 statique est bien la, et ne
// voyaient rien. C'est pourtant le DOM rendu que Google lit.
{
  const app = readFileSync(fichiersAppSrc().find((u) => u.pathname.endsWith("/App.jsx")), "utf8");
  const i = app.indexOf("function LandingPage(");
  const corps = i < 0 ? "" : app.slice(i, app.indexOf("\nfunction ", i + 10));
  const combien = (corps.match(/<h1[\s>]/g) || []).length;
  if (combien !== 1) {
    signale("seo", `LandingPage rend ${combien} <h1> — il en faut exactement un, sinon la page servie n'a pas de titre de niveau 1 une fois React affiché`);
  }
  // Les titres de section etaient des <div> : la landing entiere n'avait que
  // deux titres, dont un h3 juste apres le h1. Un lecteur d'ecran ne pouvait pas
  // la parcourir, et Google n'y voyait aucune structure. Lighthouse le disait
  // — « les elements d'en-tete ne sont pas dans l'ordre decroissant » — et je
  // l'ai lu trois fois sans le traiter.
  const h2 = (corps.match(/<h2[\s>]/g) || []).length;
  if (h2 < 6) {
    signale("seo", `LandingPage ne rend que ${h2} <h2> — ses sections doivent être des titres, pas des <div>, sinon la page n'a pas de structure pour un lecteur d'écran ni pour Google`);
  }
  // Un h3 avant le premier h2 est un saut de niveau : c'est exactement ce que
  // Lighthouse refuse.
  const iH2 = corps.search(/<h2[\s>]/), iH3 = corps.search(/<h3[\s>]/);
  if (iH3 >= 0 && (iH2 < 0 || iH3 < iH2)) {
    signale("seo", "LandingPage ouvre un <h3> avant tout <h2> — saut de niveau dans la hiérarchie des titres");
  }
}

// --- un module qui lit une variable restee dans App.jsx sans l'importer ---
//
// En sortant du code de App.jsx, j'ai oublie d'exporter « var TODAY_STR » : mon
// releve des symboles partages ne regardait que « function » et « const ». Le
// build est passe — Rollup prend un identifiant inconnu pour une variable
// globale du navigateur et n'en dit rien — et l'ecran du pointage tombait a
// l'ouverture, en production, sur « TODAY_STR is not defined ».
//
// On compare donc ce que chaque module lit a ce qu'il importe.
{
  const fichiers = fichiersAppSrc();
  const appU = fichiers.find((u) => u.pathname.endsWith("/App.jsx"));
  const app = readFileSync(appU, "utf8");
  const hautNiveau = new Set(
    [...app.matchAll(/^(?:export )?(?:async function|function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1])
  );
  // Ce que App.jsx tient de React compte aussi : une declaration lazy() est
  // partie dans un module qui n'importait pas « lazy », le build est passe, et
  // l'ecran de la journee tombait sur « lazy is not defined ».
  for (const m of app.matchAll(/import\s*\{([^}]*)\}\s*from\s*"react(?:-dom)?"/g)) {
    for (const n of m[1].split(",")) if (n.trim()) hautNiveau.add(n.trim());
  }
  // Un nom precede d'une lettre de phrase n'est pas un appel : « il apparaitra
  // ici et dans Documents. » citait un ecran, et le signaler aurait rendu ce
  // controle illisible. On exige du code des DEUX cotes.
  const enPositionDeCode = (t, n) => {
    // Une balise JSX « <Suspense fallback=... » est suivie d'une espace : le
    // motif de code ne la voyait pas, et « Suspense is not defined » est passe
    // au travers une fois de plus. On la reconnait explicitement.
    if (new RegExp("<" + n + "[\\s/>]").test(t)) return true;
    // La liste des caracteres pouvant suivre un nom etait incomplete : il y
    // manquait les operateurs. « SEMAINES_ANNEE_COMPLETE/MOIS_PAR_AN » — une
    // division — n'etait donc pas vue comme du code, et l'ecran du recapitulatif
    // des versements tombait a l'ouverture sans que rien ne le signale.
    // On accepte desormais tout ce qui n'est pas un caractere de mot : c'est la
    // definition d'une fin d'identifiant, plutot qu'une liste a completer
    // apres chaque defaut.
    // UN NOM SUIVI D'UNE PARENTHESE EST UN APPEL. C'est vrai quoi qu'il y ait
    // devant, et c'est ce qui manquait : « await enregistrerPointage({...} ) »
    // etait precede de la lettre « t » d'« await », donc pris pour un mot de
    // phrase. Resultat, le bouton « Pointer l'arrivee » levait
    // « enregistrerPointage is not defined » depuis des mois, sans que rien ne
    // le dise — le pointage n'etait ni enregistre, ni mis en file.
    if (new RegExp("\\b" + n + "\\s*\\(").test(t)) return true;
    for (const m of t.matchAll(new RegExp("\\b" + n + "(?![\\w$])", "g"))) {
      let j = m.index - 1;
      while (j >= 0 && (t[j] === " " || t[j] === "\t")) j--;
      if (j < 0 || "([{,;=:<&|!?+-*/>}\n".includes(t[j])) return true;
      // Un mot-cle devant le nom, c'est encore du code : await, return, new,
      // typeof, of, in, yield... La liste des caracteres admis ne pouvait pas
      // les voir, puisqu'ils finissent par une lettre.
      const avant = t.slice(Math.max(0, j - 10), j + 1).match(/([A-Za-z]+)$/);
      if (avant && ["await","return","new","typeof","of","in","yield","else","do","case","delete","void"].includes(avant[1])) return true;
    }
    return false;
  };
  // Les commentaires ne sont pas du code. Depuis que la fin d'identifiant est
  // reconnue correctement, une ligne comme « // BILANS P8 - Composant... »
  // etait lue comme un usage de BILANS. Une barriere qui crie sur ses propres
  // commentaires apprend a etre ignoree : on les retire avant de chercher.
  // On ne garde que ce qui est reellement du code : ni les commentaires, ni les
  // chaines, ni le texte affiche entre deux balises. Sinon « Calendrier
  // officiel francais », « Pointage valide » ou « [BILANS P8] » se lisent
  // comme des usages de variables. Une barriere qui crie sur du texte affiche
  // apprend a etre ignoree.
  const codeSeul = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").map((l) => l.replace(/(^|[^:])\/\/.*$/, "$1")).join("\n")
    .replace(/`(?:\\.|[^`\\])*`/g, "``")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    // Le texte entre « > » et « < » est affiche, pas execute.
    .replace(/>[^<>{}]+</g, "><");
  for (const u of fichiers) {
    if (u.pathname.endsWith("/App.jsx")) continue;
    const t = codeSeul(readFileSync(u, "utf8"));
    const nom = u.pathname.split("/").pop();
    const importes = new Set(
      [...t.matchAll(/import\s*\{([^}]*)\}\s*from/g)]
        .flatMap((m) => m[1].split(",").map((x) => x.trim().split(" as ").pop()).filter(Boolean))
    );
    const locaux = new Set(
      [...t.matchAll(/(?:^|\s)(?:async function|function|const|let|var)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1])
    );
    for (const n of hautNiveau) {
      if (importes.has(n) || locaux.has(n)) continue;
      // Un nom suivi d'une ponctuation de code, jamais un mot de phrase : le
      // mot « Contrats » dans « Contrats, avenants, courriers illimites » n'est
      // pas un appel, et le signaler aurait rendu ce controle inutilisable.
      if (enPositionDeCode(t, n)) {
        signale("module", `${nom} lit « ${n} », déclaré dans App.jsx, sans l'importer — le build passe, l'écran tombe à l'ouverture`);
      }
    }
  }
}

// --- un module qui importe un nom que l'autre n'exporte pas ---
//
// Le pendant du controle precedent. Rollup n'en fait qu'un avertissement, noye
// dans la sortie du build : « X is not exported by src/App.jsx ». Le build
// reussit, la valeur vaut undefined, et l'ecran tombe a l'ouverture. Quatre de
// ces imports fantomes trainaient apres le decoupage.
{
  const fichiers = fichiersAppSrc();
  const exportes = new Map();
  for (const u of fichiers) {
    exportes.set(
      "./" + u.pathname.split("/").pop(),
      (() => {
        const t = readFileSync(u, "utf8");
        const noms = new Set([...t.matchAll(/^export (?:async function|function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]));
        // Un module peut aussi reexporter en bloc : « export { a, b as c }; ».
        // Sans cette forme, la barriere criait au fantome sur un nom bel et
        // bien exporte — et une fausse alerte use la confiance qu'on met dans
        // les vraies.
        for (const m of t.matchAll(/^export\s*\{([^}]*)\}\s*(?:from\s*"[^"]*"\s*)?;/gm))
          for (const brut of m[1].split(","))
            if (brut.trim()) noms.add(brut.trim().split(/\s+as\s+/).pop().trim());
        return noms;
      })()
    );
  }
  for (const u of fichiers) {
    const t = readFileSync(u, "utf8");
    const nom = u.pathname.split("/").pop();
    for (const m of t.matchAll(/import\s*\{([^}]*)\}\s*from\s*"(\.\/[^"]+)"/g)) {
      const cible = exportes.get(m[2]);
      if (!cible) continue;
      for (const brut of m[1].split(",")) {
        const n = brut.trim().split(" as ")[0].trim();
        if (n && !cible.has(n)) {
          signale("module", `${nom} importe « ${n} » depuis ${m[2]}, qui ne l'exporte pas — le build ne fait qu'un avertissement, la valeur vaut undefined`);
        }
      }
    }
  }
}

// --- un ecran paresseux rendu hors de tout Suspense ---
//
// Depuis le decoupage du bundle, une vingtaine de composants arrivent par
// import(). React rend une promesse pendant le telechargement : si le point qui
// rend le composant n'est pas sous un <Suspense>, la promesse remonte jusqu'a
// la racine et TOUTE l'application disparait — ecran blanc, zero erreur dans la
// console. C'est arrive au mode borne, qui se rend hors du routeur : l'ecran
// tendu au parent serait reste blanc, et rien ne l'aurait signale.
//
// On verifie donc que chaque usage JSX d'un composant paresseux se trouve dans
// une fonction qui ouvre un Suspense.
{
  const fichiers = fichiersAppSrc();
  // Un nom n'est paresseux que la ou il l'est vraiment : la ou il est declare
  // en lazy(), et dans les modules qui l'importent depuis App.jsx. Ailleurs,
  // c'est une definition locale deja chargee, et l'avertir serait du bruit —
  // un audit qui crie a tort finit par ne plus etre lu.
  const declaresLazy = new Set();
  for (const u of fichiers) {
    for (const m of readFileSync(u, "utf8").matchAll(/^(?:export )?const ([A-Za-z_$][\w$]*) = lazy\(/gm)) {
      declaresLazy.add(m[1]);
    }
  }
  // Un commentaire qui CITE un composant n'en rend aucun. La ligne qui explique
  // ce controle contenait « <OnboardingWizard/> » et se faisait signaler
  // elle-meme. On blanchit donc les commentaires en gardant la longueur exacte
  // des lignes, pour que le comptage des balises reste juste.
  const blanchir = (t) => t
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^([^\n]*?)\/\/[^\n]*$/gm, (m, avant) => avant + " ".repeat(m.length - avant.length));
  for (const u of fichiers) {
    const texte = blanchir(readFileSync(u, "utf8"));
    const nom = u.pathname.split("/").pop();
    const importe = new Set(
      [...texte.matchAll(/import\s*\{([^}]*)\}\s*from\s*"\.\/App\.jsx"/g)]
        .flatMap((m) => m[1].split(",").map((x) => x.trim()))
    );
    const local = new Set([...texte.matchAll(/^(?:export )?(?:function|const) ([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]));
    const paresseux = new Set(
      [...declaresLazy].filter((c) => importe.has(c) || (local.has(c) && new RegExp("const " + c + " = lazy\\(").test(texte)))
    );
    // Decoupe en fonctions de premier niveau : le Suspense doit etre dans la
    // meme, sans quoi on ne peut rien affirmer.
    // Les fleches nommees comptent aussi : le routeur est un « const _page = ()
    // => », et sans elles tout son corps serait noye dans celui de App().
    const debuts = [...texte.matchAll(/^\s*(?:export (?:default )?)?(?:function ([A-Za-z_$][\w$]*)|const ([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)/gm)]
      .map((m) => ({ i: m.index, nom: m[1] || m[2] }));
    for (let k = 0; k < debuts.length; k++) {
      const corps = texte.slice(debuts[k].i, k + 1 < debuts.length ? debuts[k + 1].i : texte.length);
      // On ne peut pas se contenter de « la fonction contient un Suspense » :
      // App() en contient un pour le routeur, et le mode borne se rend APRES sa
      // fermeture. La regle l'aurait laisse passer — verifie en retirant le
      // Suspense de la borne, l'audit disait « aucune anomalie ». On compte donc
      // les balises ouvertes et fermees avant l'usage : il faut en avoir une
      // d'ouverte a ce point precis.
      const ouvert = (jusqua) => {
        const avant = corps.slice(0, jusqua);
        return (avant.match(/<Suspense[\s>]/g) || []).length
             - (avant.match(/<\/Suspense>/g) || []).length;
      };
      for (const c of paresseux) {
        for (const m of corps.matchAll(new RegExp("<" + c + "[\\s/>]", "g"))) {
          if (ouvert(m.index) > 0) continue;
          signale("paresseux", `${nom} : ${debuts[k].nom}() rend <${c}/>, chargé à la demande, hors de tout <Suspense> ouvert à cet endroit — l'application entière disparaîtrait le temps du téléchargement`);
        }
      }
    }
  }
}

// --- routes serveur que plus personne n'appelle ---
//
// Vercel deploie automatiquement tout fichier de api/. api/pointage-qr.js y
// dormait : aucune authentification, la CLE DE SERVICE — qui contourne toutes
// les regles de securite — et un enfant_id lu dans le corps de la requete. Le
// GET renvoyait le prenom de l'enfant et ses heures du jour sans connexion, le
// POST ecrivait un pointage marque « valide par le parent ». Personne ne
// l'appelait : l'application passe par la RPC pointage_qr, sous la session de
// l'utilisateur, donc soumise aux regles. Meme classe que la route d'envoi de
// notifications ouverte a tout internet.
//
// Une route que rien n'appelle n'a pas a etre en ligne. Celles que des tiers
// appellent sont nommees ici, une par une, avec la raison.
const ROUTES_TIERCES = new Map([
  ["webhook", "appelée par Stripe, jamais par l'application"],
]);
const toutFichier = (dir, out = []) => {
  for (const e of readdirSync(dir)) {
    const q = path.join(dir, e);
    if (statSync(q).isDirectory()) toutFichier(q, out); else out.push(q);
  }
  return out;
};
const refsRoutes = ["../src", "../public", "../scripts", "../api"]
  .flatMap((d) => { try { return toutFichier(path.join(RACINE, d.slice(3))); } catch { return []; } })
  .filter((f) => /\.(js|jsx|mjs|html|json)$/.test(f) && path.basename(f) !== "audit.mjs")
  .map((f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } })
  .join("\n") + readFileSync(new URL("../vercel.json", import.meta.url), "utf8");
for (const f of readdirSync(new URL("../api/", import.meta.url))) {
  if (!f.endsWith(".js") || f.startsWith("_")) continue;
  const nom = f.slice(0, -3);
  if (ROUTES_TIERCES.has(nom)) continue;
  if (!refsRoutes.includes("api/" + nom) && !refsRoutes.includes("./" + nom + ".js")) {
    signale("serveur", `api/${f} n'est appelée de nulle part et reste pourtant déployée — la supprimer, ou l'inscrire dans ROUTES_TIERCES avec sa raison`);
  }
}

// --- variables d'environnement annoncees mais jamais lues ---
//
// .env.example annoncait une cle Anthropic « pour les bilans IA ». Aucune ligne
// ne la lisait : la fonctionnalite n'existe pas. C'est la meme classe de defaut
// que le bandeau promettant une sauvegarde inexistante — annoncer comme acquis
// ce que personne n'a fait, sauf qu'ici c'est le futur mainteneur qu'on trompe.
const exemple = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
const codeClient = [...FICHIERS_APP, "../lib/supabase.js"]
  .map((f) => { try { return readFileSync(new URL(f, import.meta.url), "utf8"); } catch { return ""; } })
  .join("\n");
for (const nom of new Set([...exemple.matchAll(/^#?\s*(VITE_[A-Z0-9_]+)\s*=/gm)].map((m) => m[1]))) {
  if (!codeClient.includes(nom)) {
    signale("environnement", `.env.example annonce ${nom}, qu'aucune ligne de l'application ne lit — l'écrire ou retirer la mention`);
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

// L'abattement ne peut exceder le total des sommes versees (CGI art. 80
// sexies). Le net imposable etait deja plancher a zero, mais le montant
// affiche pouvait depasser la base.
if (!/abattementMois\s*=\s*Math\.min\(/.test(sourcesChiffres)) {
  signale("chiffre", "l'abattement affiché n'est plus plafonné au total des sommes versées (CGI art. 80 sexies)");
}

// Le plafond du credit d'impot porte sur les depenses : un credit plafonne a
// 3 500 EUR vaudrait le double du maximum reel.
if (/creditImpot\s*=\s*Math\.min\([^;]*?\*\s*0?\.5\s*,\s*3500/.test(sourcesChiffres)) {
  signale("chiffre", "le plafond de 3 500 € est appliqué au crédit d'impôt et non aux dépenses : le crédit annoncé vaut le double du réel");
}

// --- mise en page : une seule grammaire de carte et de bouton ---
// Pourquoi : chaque ecran avait fini par redefinir sa propre densite. Onze
// paddings de carte differents et vingt-deux gabarits de bouton coexistaient,
// ce qui donnait l'impression que les onglets n'appartenaient pas a la meme
// application. La densite vit desormais dans .card et .btn ; on verifie que
// personne ne la contourne a nouveau en dur dans un style en ligne.
const balisesOuvrantes = (motif) => {
  const res = [];
  const re = new RegExp(motif, "g");
  let m;
  while ((m = re.exec(appSrc))) {
    let prof = 0, fin = -1;
    for (let k = m.index; k < appSrc.length; k++) {
      const c = appSrc[k];
      if (c === "{") prof++;
      else if (c === "}") prof--;
      else if (c === '"' || c === "'") { const q = c; k++; while (k < appSrc.length && appSrc[k] !== q) { if (appSrc[k] === "\\") k++; k++; } }
      else if (c === ">" && prof === 0) { fin = k; break; }
    }
    if (fin > 0) res.push(appSrc.slice(m.index, fin));
  }
  return res;
};
// Cartes : seules les valeurs du systeme sont admises. padding:0 reste permis
// (cartes a bord perdu qui contiennent une liste ou un tableau).
const cartesHorsSysteme = balisesOuvrantes('className="card[^"]*"')
  .filter((b) => /padding:(?!\s*0\s*[,}])(?!\s*"var\(--pad-carte)/.test(b));
if (cartesHorsSysteme.length) {
  signale("mise en page", `${cartesHorsSysteme.length} carte(s) redefinissent leur padding en dur au lieu de --pad-carte`);
}
// Boutons : .btn porte la taille (13px/600) et ses deux variantes .s et .l.
// On ne regarde QUE l'attribut style de la balise. Le controle lisait la
// balise entiere : quand un bouton porte tout son gestionnaire onClick en
// ligne — et l'un d'eux contient la page HTML du bulletin — il y trouvait le
// « fontSize » d'une feuille de style et signalait un bouton innocent.
const styleDeBalise = (b) => {
  const i = b.indexOf("style={{");
  if (i < 0) return "";
  let prof = 0;
  for (let k = i + 6; k < b.length; k++) {
    if (b[k] === "{") prof++;
    else if (b[k] === "}") { prof--; if (prof === 0) return b.slice(i, k + 1); }
  }
  return b.slice(i);
};
const boutonsHorsSysteme = balisesOuvrantes('className=(?:"btn[^"]*"|\\{[^}]*"btn[^}]*\\})')
  .filter((b) => /fontSize:\s*\d|fontWeight:\s*\d/.test(styleDeBalise(b)));
if (boutonsHorsSysteme.length) {
  signale("mise en page", `${boutonsHorsSysteme.length} bouton(s) .btn redefinissent taille ou graisse en ligne au lieu d'utiliser .btn / .btn.s / .btn.l`);
}
// L'ombre de l'action principale doit suivre la couleur du role : une ombre
// corail sous un bouton bleu se voyait sur l'ecran d'une assistante maternelle.
if (/ActionBar[\s\S]{0,1200}boxShadow:"0 8px 22px rgba\(/.test(appSrc)) {
  signale("mise en page", "l'action principale porte une ombre codee en dur : elle ne suit plus la couleur du role");
}

// --- icones : plus d'emoji dans les commandes de l'interface ---
// Pourquoi : la barre du haut (cloche, lune, reglages, deconnexion) et les
// libelles de boutons affichaient encore des emoji systeme, qui changent de
// dessin selon le telephone et ne suivent pas la couleur du role. Les traces
// dessinees passent par <IconeOuEmoji>.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
const boutonsIcone = [...appSrc.matchAll(/className="ico-btn"[\s\S]{0,400}?<\/button>/g)].map((m) => m[0]);
const icoAvecEmoji = boutonsIcone.filter((b) => EMOJI.test(b.replace(/e=(?:"[^"]*"|\{[^}]*\})/g, "")));
if (icoAvecEmoji.length) {
  signale("icônes", `${icoAvecEmoji.length} commande(s) de la barre du haut affichent encore un emoji au lieu d'une icône dessinée`);
}
// Les libelles de boutons .btn ne doivent plus commencer par un emoji.
const libellesEmoji = [...appSrc.matchAll(/className="btn[^"]*"[^>]{0,400}>\s*([^<{\n]{0,4})/g)]
  .filter((m) => EMOJI.test(m[1]));
if (libellesEmoji.length) {
  signale("icônes", `${libellesEmoji.length} libellé(s) de bouton commencent par un emoji au lieu d'une icône dessinée`);
}

// --- themes du calendrier : un seul vocabulaire ---
// Pourquoi : la couleur et l'icone de chaque type d'evenement etaient recopiees
// dans quatre rendus. L'un d'eux comparait a « conge » quand le reste du code
// ecrit « cng » : les conges y sortaient en bleu neutre, et rien ne le disait.
// La table TYPES_EV est desormais le seul endroit ou ce vocabulaire existe.
if (!/const TYPES_EV=\{/.test(appSrc)) {
  signale("calendrier", "la table TYPES_EV a disparu : les couleurs d'événement ne sont plus définies à un seul endroit");
}
const ternairesCouleur = [...appSrc.matchAll(/ev\.type===\s*"[^"]+"\s*\?\s*"var\(--[GRBSPT]p?\)"/g)];
if (ternairesCouleur.length) {
  signale("calendrier", `${ternairesCouleur.length} endroit(s) recalculent la couleur d'un événement au lieu de passer par typeEv() — c'est ainsi qu'un « conge » écrit pour « cng » est passé inaperçu`);
}
// Chaque theme propose au parent doit ouvrir un formulaire qui existe : ceux
// qui portent un motif passent par le formulaire d'absence, seul a compter les
// heures et a prevenir l'assistante maternelle.
const blocThemes = (appSrc.match(/const THEMES_CAL=\{[\s\S]*?\n\};/) || [""])[0];
const motifsThemes = [...blocThemes.matchAll(/motif:"([^"]+)"/g)].map((m) => m[1]);
const motifsFormulaire = (appSrc.match(/\["Maladie"[^\]]*\]/) || [""])[0];
const motifsOrphelins = [...new Set(motifsThemes)].filter((m) => !motifsFormulaire.includes(`"${m}"`));
if (motifsOrphelins.length) {
  signale("calendrier", `motif(s) proposé(s) au parent mais absent(s) de la liste du formulaire d'absence : ${motifsOrphelins.join(", ")}`);
}
// Les evenements de demonstration doivent parler le meme vocabulaire que la
// table : ils portaient « conge » et « hol », inconnus de TYPES_EV, donc
// affiches dans la couleur par defaut sans que rien ne le signale.
const blocDemoEv = (appSrc.match(/evenements:\[[\s\S]*?\n  \],/) || [""])[0];
const typesDemo = [...blocDemoEv.matchAll(/type:"(\w+)"/g)].map((m) => m[1]);
const tableTypesDemo = (appSrc.match(/const TYPES_EV=\{([\s\S]*?)\n\};/) || ["", ""])[1];
const demoOrphelins = [...new Set(typesDemo)].filter((t) => !new RegExp(`^\\s*${t}:\\{`, "m").test(tableTypesDemo));
if (demoOrphelins.length) {
  signale("calendrier", `événement(s) de démonstration d'un type inconnu de TYPES_EV : ${demoOrphelins.join(", ")}`);
}
// La formation ne se deduit jamais du salaire : suivie sur le temps d'accueil,
// la remuneration est maintenue et l'employeur facilitateur est rembourse.
// L'inscrire comme retenue couterait a l'assistante maternelle un salaire du.
if (!/RETENUE_TYPES=\{[^}]*form:false/.test(appSrc)) {
  signale("calendrier", "la formation n'est plus exclue des retenues pour absence : une formation suivie sur le temps d'accueil est pourtant rémunérée (CCN 3239)");
}
// NE JAMAIS DEDUIRE DEUX FOIS LA MEME JOURNEE.
//
// Cette regle disait : « la retenue ne doit s'appliquer que sur un salaire
// mensualise ; sur des pointages reels, la journee absente est deja hors des
// heures comptees ». C'etait juste TANT QUE la base du bulletin etait les
// heures pointees — et c'etait precisement le defaut : trois journees pointees
// sur vingt-deux donnaient un bulletin a 88,59 EUR au lieu de 567,62 EUR, et le
// recapitulatif Pajemploi du meme mois en declarait 567,62. Deux documents du
// meme mois qui se contredisaient de 479 EUR.
//
// La base est desormais la mensualisation, toujours. La journee absente n'est
// donc plus exclue de rien : la retenue est le SEUL chemin par lequel une
// absence diminue la paie, et elle doit s'appliquer.
//
// L'intention de la regle, elle, n'a pas bouge : une absence se deduit une fois
// et une seule. On verifie donc les deux moities de l'invariant — la base est
// la mensualisation, et la retenue porte sur elle.
// On verifie l'INVARIANT, pas une chaine. Ma premiere version cherchait
// « const heuresNorm=hMens; » mot pour mot : elle a crie des que la ligne est
// devenue « rep.normales », alors que le calcul etait devenu PLUS juste. Une
// regle qui lit la forme et non le sens finit par empecher les corrections.
{
  const ligne = (appSrc.match(/const heuresNorm\s*=\s*([^;]+);/) || [])[1] || "";
  if (/h\.real/.test(ligne)) {
    signale("calendrier", `le bulletin repart des heures pointées (« ${ligne.trim()} ») : sur un mois mal pointé, il paierait une fraction du salaire dû, et contredirait le récapitulatif Pajemploi du même mois`);
  } else if (!/hMens|rep\.normales|repartitionHeures/.test(ligne)) {
    signale("calendrier", `la base du bulletin ne vient plus de la mensualisation (« ${ligne.trim()} ») : elle doit venir de heuresMensualisees ou de repartitionHeures`);
  }
}
if (!/const retenue=retenueAbsence\(\{\s*salaireMensualise:salBase,/.test(appSrc)) {
  signale("calendrier", "la retenue pour absence ne porte plus sur le salaire mensualisé : soit l'absence n'est plus déduite du tout, soit elle l'est deux fois");
}
// L'assiette des cotisations doit rester unique. Elle etait recalculee dans
// quatre rendus (totaux, ecran, PDF, HTML) : la retenue pour absence
// n'apparaissait que dans les totaux, et le detail affichait des cotisations
// calculees sur un salaire jamais verse.
const assiettesRecalculees = [...appSrc.matchAll(/brut\*\(t\.base/g)];
if (assiettesRecalculees.length) {
  signale("paie", `${assiettesRecalculees.length} endroit(s) recalculent l'assiette des cotisations au lieu de passer par cotisation() — le détail et les totaux peuvent diverger`);
}
// Le brut affiche doit etre celui apres retenue, sinon le bulletin annonce un
// salaire que l'assistante maternelle n'a pas percu.
if (/SALAIRE BRUT MENSUEL[^]{0,120}\bbrut\.toFixed/.test(appSrc)) {
  signale("paie", "le salaire brut du bulletin est affiché avant retenue pour absence");
}
// L'allocation de formation est versee par IPERIA, pas par le particulier
// employeur : la faire entrer dans le brut ou le net reviendrait a facturer au
// parent une somme qu'il ne doit pas.
if (/(?:brut|netPaye|netImposable|totalCot\w*)\s*[-+]\s*allocFormation|allocFormation\s*[-+]\s*(?:brut|netPaye)/.test(appSrc)) {
  signale("paie", "l'allocation de formation entre dans le calcul du salaire : elle est versée par IPERIA, pas par le parent employeur");
}
// La formation hors temps d'accueil ne se deduit pas davantage que celle
// suivie sur le temps d'accueil : dans les deux cas il n'y a rien a retenir.
if (!/RETENUE_TYPES=\{[^}]*formh:false/.test(appSrc)) {
  signale("calendrier", "la formation hors temps d'accueil n'est plus exclue des retenues : il n'y a pourtant aucun salaire à déduire");
}
// Les listes deroulantes de type d'evenement doivent parler le meme
// vocabulaire : « hol » y survivait, inconnu de TYPES_EV, et l'evenement cree
// ressortait dans la couleur par defaut.
const optionsType = [...appSrc.matchAll(/<option value="(\w+)">(?:Rendez-vous|Absence|Congé|Sortie|Maladie|Fermeture|Formation)[^<]*<\/option>/g)].map((m) => m[1]);
const tableTypesOpt = (appSrc.match(/const TYPES_EV=\{([\s\S]*?)\n\};/) || ["", ""])[1];
const optionsOrphelines = [...new Set(optionsType)].filter((t) => !new RegExp(`^\\s*${t}:\\{`, "m").test(tableTypesOpt));
if (optionsOrphelines.length) {
  signale("calendrier", `type(s) d'événement proposé(s) dans une liste déroulante mais inconnu(s) de TYPES_EV : ${optionsOrphelines.join(", ")}`);
}
// Une <option> ne rend que du texte : un composant y disparait.
const optionsAvecIcone = [...appSrc.matchAll(/<option[^>]*>[^<]{0,80}<IconeOuEmoji/g)];
if (optionsAvecIcone.length) {
  signale("icônes", `${optionsAvecIcone.length} <option> contiennent une icône dessinée : elle n'y sera pas affichée`);
}
// La qualite du repas doit passer par une seule table. Elle etait recopiee
// dans cinq rendus, et deux se trompaient de couleur : l'un ecrivait la meme
// dans les deux branches de son ternaire, l'autre affichait « Peu mange » en
// vert. Le libelle ne doit plus apparaitre en dur.
const blocRepas = appSrc.match(/const QUALITE_REPAS=\{[\s\S]*?\n\};/);
const debutRepas = blocRepas ? appSrc.indexOf(blocRepas[0]) : -1;
const finRepas = debutRepas >= 0 ? debutRepas + blocRepas[0].length : -1;
const libellesRepas = [...appSrc.matchAll(/"(?:Bon appétit|Peu mangé|Refus)"/g)]
  .filter((m) => !(m.index >= debutRepas && m.index <= finRepas));
if (debutRepas < 0) signale("repas", "la table QUALITE_REPAS a disparu");
if (libellesRepas.length) {
  signale("repas", `${libellesRepas.length} libellé(s) de qualité de repas écrits en dur au lieu de passer par QUALITE_REPAS / <PastilleRepas>`);
}

// Chaque theme doit designer un type que la table connait.
const typesThemes = [...blocThemes.matchAll(/\{t:"(\w+)"/g)].map((m) => m[1]);
const tableTypes = (appSrc.match(/const TYPES_EV=\{([\s\S]*?)\n\};/) || ["", ""])[1];
const typesOrphelins = [...new Set(typesThemes)].filter((t) => !new RegExp(`^\\s*${t}:\\{`, "m").test(tableTypes));
if (typesOrphelins.length) {
  signale("calendrier", `thème(s) du calendrier pointant vers un type inconnu de TYPES_EV : ${typesOrphelins.join(", ")}`);
}

// --- emoji restants dans l'interface ---
// Pourquoi : les emoji systeme changent de dessin selon le telephone, ne
// suivent pas la couleur du role et rendent flou a l'impression. Deux motifs
// restaient apres les passes precedentes : un emoji en tete d'un texte affiche
// (« 💡 Astuce »), et un emoji seul dans un <span> decoratif.
//
// Ce controle ne regarde QUE l'application, pas la page d'accueil publique :
// la landing assume ses emoji, c'est son identite de marque. Il ignore aussi
// les chaines qui partent dans un PDF ou un e-mail HTML, ou un composant React
// n'existe pas, et les signes typographiques (✓ ✕ → ×) qui ne sont pas des
// icones.
const finApp = appSrc.indexOf("function LandingPage");
const zoneApp = finApp > 0 ? appSrc.slice(0, finApp) : appSrc;
const EMO_UI = "[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{2139}]\\u{FE0F}?";
const tracesConnues = new Set([...(appSrc.match(/const EMOJI_TRACE = \{([\s\S]*?)\n\};/) || ["", ""])[1]
  .matchAll(/"([^"]+)":"\w+"/g)].map((m) => m[1]));

const enTete = [...zoneApp.matchAll(new RegExp(`[>}]\\s*(${EMO_UI})\\s+(?=[A-Za-zÀ-ÿ0-9«{<])`, "gu"))]
  .filter((m) => tracesConnues.has(m[1]))
  .filter((m) => {
    const debut = zoneApp.lastIndexOf("\n", m.index) + 1;
    const ligne = zoneApp.slice(debut, zoneApp.indexOf("\n", m.index));
    if (/doc\.text\(|doc\.setFont|htmlPaj|innerHTML/.test(ligne)) return false;
    // Un emoji place DANS une chaine part dans un document imprime ou un
    // courriel, ou <IconeOuEmoji/> ne s'affiche pas du tout. La liste des
    // ouvertures de balise ne suffisait pas : elle ne connaissait que les
    // guillemets doubles, et le recapitulatif Pajemploi est ecrit en simples.
    let q = null;
    for (let i = 0; i < m.index - debut; i++) {
      const c = ligne[i];
      if (q) { if (c === "\\") { i++; continue; } if (c === q) q = null; }
      else if (c === '"' || c === "'" || c === "`") q = c;
    }
    return q === null;
  });
if (enTete.length) {
  signale("icônes", `${enTete.length} emoji en tête d'un texte affiché alors qu'un tracé dessiné existe : ${[...new Set(enTete.map((m) => m[1]))].join(" ")}`);
}
// Un SVG ne suit pas le « fontSize » de son parent. Quand la taille de
// l'ancienne icône venait de là, il faut la porter sur « taille », sinon
// l'icône rétrécit silencieusement à sa valeur par défaut.
const taillesPerdues = [...appSrc.matchAll(/fontSize:\s*(\d{2,})[^>]{0,120}?>\s*<IconeOuEmoji e=(?:"[^"]+"|\{[^}]+\})\s*\/>/g)]
  .filter((m) => Number(m[1]) >= 20);
if (taillesPerdues.length) {
  signale("icônes", `${taillesPerdues.length} icône(s) dont la taille venait d'un fontSize sans « taille » : elles s'affichent plus petites qu'avant`);
}

// Un ternaire qui choisit entre deux emoji est une icône d'état : elle doit
// passer par le composant, comme les autres.
const ternaires = [...zoneApp.matchAll(new RegExp(`(?<!e=)\\{[^{}?]{1,60}\\?"(${EMO_UI})":"(${EMO_UI})"\\}`, "gu"))]
  .filter((m) => tracesConnues.has(m[1]) && tracesConnues.has(m[2]));
if (ternaires.length) {
  signale("icônes", `${ternaires.length} icône(s) d'état choisie(s) entre deux emoji sans passer par <IconeOuEmoji>`);
}
const spansSeuls = [...zoneApp.matchAll(new RegExp(`<span(?:\\s+style=\\{\\{[^}]*\\}\\})?>(${EMO_UI})</span>`, "gu"))]
  .filter((m) => tracesConnues.has(m[1]));
if (spansSeuls.length) {
  signale("icônes", `${spansSeuls.length} emoji décoratif(s) seul(s) dans un <span> alors qu'un tracé dessiné existe : ${[...new Set(spansSeuls.map((m) => m[1]))].join(" ")}`);
}

// --- icones des onglets et des menus ---
// Pourquoi : l'icone d'un onglet est une donnee (« ic »), et les rendus se
// partageaient en deux camps — ceux qui la passaient a <IconeOuEmoji>, et ceux
// qui l'imprimaient telle quelle. C'est ce second camp qui laissait des emoji
// systeme dans les onglets.
const icBruts = [...appSrc.matchAll(/(?<!e=)\{\s*(?:[A-Za-z_][A-Za-z0-9_]*\.ic|ic)\s*\}/g)]
  // Une <option> ne rend que du texte : un SVG y disparaitrait, l'emoji y reste.
  .filter((m) => !/<option[^>]*>\s*$/.test(appSrc.slice(Math.max(0, m.index - 120), m.index)));
if (icBruts.length) {
  signale("icônes", `${icBruts.length} onglet(s) ou menu(s) affichent leur icône brute au lieu de passer par <IconeOuEmoji>`);
}
// Chaque icone de donnee doit avoir un trace dessine, sinon elle retombe
// silencieusement sur l'emoji du systeme.
const blocTrace = (appSrc.match(/const EMOJI_TRACE = \{([\s\S]*?)\n\};/) || ["", ""])[1];
const correspondances = new Map([...blocTrace.matchAll(/"([^"]+)":"(\w+)"/g)].map((m) => [m[1], m[2]]));
const dessins = new Set([...(appSrc.match(/const TRACES = \{([\s\S]*?)\n\};/) || ["", ""])[1].matchAll(/^\s*(\w+):/gm)].map((m) => m[1]));
const EMO_IC = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
const icones = [...new Set([...appSrc.matchAll(/ic:"([^"]+)"/g)].map((m) => m[1]))].filter((i) => EMO_IC.test(i));
const sansTrace = icones.filter((i) => !correspondances.has(i));
if (sansTrace.length) {
  signale("icônes", `${sansTrace.length} icône(s) d'onglet sans tracé dessiné, elles retombent sur l'emoji du système : ${sansTrace.join(" ")}`);
}
const renvoisMorts = [...correspondances].filter(([, nom]) => !dessins.has(nom));
if (renvoisMorts.length) {
  signale("icônes", `${renvoisMorts.length} correspondance(s) pointent vers un dessin inexistant : ${renvoisMorts.map(([e, n]) => e + "→" + n).join(" ")}`);
}

// --- champs nullables lus sans garde ---
// Pourquoi : « enfants.allergies » et « contrats.jours » sont des tableaux
// nullables en base. Lus sans garde, ils ne cassaient pas une ligne mais tout
// l'ecran — l'accueil du parent ne s'affichait pas du tout tant que la fiche
// sante n'etait pas remplie, et un contrat sans jours renseignes faisait
// tomber l'ecran du contrat. Les donnees de demonstration renseignent toujours
// ces champs : c'est ce qui a garde le defaut invisible.
//
// On ne regarde que les lectures faites sur une donnee venue de la base
// (« enfant. », « contrat. », « ct. », « sel.contrat. »), pas sur un etat local
// de formulaire, qui est toujours initialise a un tableau.
const lecturesRisquees = [];
for (const champ of ["allergies", "jours"]) {
  const re = new RegExp(`\\b(?:enfant|contrat|ct|d\\.contrat|sel\\.contrat)(?:\\.contrat)?\\??\\.${champ}\\.(?:length|map|join|filter|slice|forEach)`, "g");
  for (const m of appSrc.matchAll(re)) {
    const avant = appSrc.slice(Math.max(0, m.index - 90), m.index);
    // Deja protege : « || [] », « x.champ && x.champ. », « Array.isArray(...) ».
    if (/\|\|\s*\[\]\s*\)?\s*$/.test(avant)) continue;
    if (new RegExp(`\\.${champ}\\s*&&\\s*$`).test(avant)) continue;
    if (/Array\.isArray\([^)]*\)\s*\?\s*$/.test(avant)) continue;
    lecturesRisquees.push(`${champ} (ligne ${appSrc.slice(0, m.index).split("\n").length})`);
  }
}
if (lecturesRisquees.length) {
  signale("robustesse", `${lecturesRisquees.length} lecture(s) de champ nullable sans garde : ${lecturesRisquees.join(", ")} — un tableau absent fait tomber tout l'écran`);
}

// --- protection des PDF ---
// Pourquoi : jsPDF bascule une ligne entiere en UTF-16 des qu'elle contient un
// caractere hors WinAnsi, et la police standard n'en connait aucun. Le symbole
// ET le texte de la ligne disparaissent. Comme le contenu vient aussi de ce que
// les familles tapent, chaque document doit passer par le filtre.
const docsPdf = [...appSrc.matchAll(/(\w+)\s*=\s*new jsPDF\(/g)];
const docsNonProteges = docsPdf.filter((m) => !/protegerPdf\(\s*new jsPDF\(/.test(appSrc.slice(Math.max(0, m.index - 20), m.index + 30)));
if (docsNonProteges.length) {
  signale("pdf", `${docsNonProteges.length} document(s) PDF créé(s) sans protegerPdf() : un emoji tapé par une famille ferait disparaître la ligne entière`);
}

// --- ternaires sans effet ---
// Pourquoi : trois fois dans cette base, un badge choisissait sa couleur avec
// un ternaire dont les deux branches etaient identiques. Un versement impaye
// s'affichait donc en vert, comme un versement paye. La condition ne servait a
// rien et personne ne pouvait le voir a la lecture.
const ternairesMorts = [...appSrc.matchAll(/\?\s*("[^"]{1,40}"|'[^']{1,40}')\s*:\s*("[^"]{1,40}"|'[^']{1,40}')/g)]
  .filter((m) => m[1] === m[2]);
if (ternairesMorts.length) {
  signale("robustesse", `${ternairesMorts.length} ternaire(s) dont les deux branches donnent la même valeur : la condition ne sert à rien, et l'état affiché est faux dans un cas sur deux`);
}
// Les pastilles de couleur passent par <Pastille> : un emoji rond prend la
// teinte du telephone et ne suit pas le mode sombre.
// On ignore les commentaires : ils citent ces caracteres pour expliquer
// pourquoi ils ne doivent plus etre utilises.
const sansCommentaires = appSrc.replace(/^\s*\/\/.*$/gm, "");
const emojiRonds = [...sansCommentaires.matchAll(/[\u{1F534}\u{1F535}\u{1F7E0}\u{1F7E1}\u{1F7E2}\u{1F7E3}\u{1F7E4}\u{26AB}\u{26AA}]/gu)];
if (emojiRonds.length) {
  signale("icônes", `${emojiRonds.length} pastille(s) emoji au lieu de <Pastille> : leur teinte dépend du téléphone et ne suit pas le mode sombre`);
}

// --- taux horaire par defaut ---
// Pourquoi : la valeur de repli de l'application etait 4,05 EUR, sous le
// minimum conventionnel de 4,20 EUR entre en vigueur le 1er juin 2026. Un
// contrat cree sans taux saisi partait donc sur une remuneration illegale, et
// la demonstration en enseignait une.
const miniTable = appSrc.match(/const MINIMUM_CONV_HISTO=\[\s*\["[\d-]+",([\d.]+)\]/);
const miniCourant = miniTable ? parseFloat(miniTable[1]) : null;
if (!miniCourant) {
  signale("chiffre", "la table MINIMUM_CONV_HISTO est introuvable : le plancher de rémunération n'est plus vérifié");
} else {
  const repli = [...appSrc.matchAll(/tauxHoraire\s*(?::|\|\|)\s*([\d.]+)/g)].map((m) => parseFloat(m[1]));
  const sousLePlancher = repli.filter((v) => v > 0 && v < miniCourant);
  if (sousLePlancher.length) {
    signale("chiffre", `${sousLePlancher.length} taux horaire par défaut sous le minimum de ${miniCourant} € (${[...new Set(sousLePlancher)].join(", ")}) : un contrat créé sans saisie partirait sur une rémunération illégale`);
  }
}
// L'alerte doit exister et etre posee sur le bulletin comme sur le contrat.
const posesAlerte = [...appSrc.matchAll(/<AlerteTauxMinimum\b/g)].length;
if (posesAlerte < 2) {
  signale("chiffre", `l'alerte de taux minimum n'est posée qu'à ${posesAlerte} endroit(s) : elle doit l'être sur le bulletin et sur le contrat`);
}

// --- mensualisation ---
// Pourquoi : la convention prevoit deux calculs, et l'application n'en
// appliquait qu'un — celui des 52 semaines, a tous les contrats. Sur un accueil
// en annee scolaire de 36 semaines, elle annoncait 728 EUR au lieu de 504, soit
// 44 % de trop, et les conges payes se retrouvaient comptes deux fois.
const finAppMens = appSrc.indexOf("function LandingPage");
const zoneAppMens = finAppMens > 0 ? appSrc.slice(0, finAppMens) : appSrc;
const posHelpers = zoneAppMens.indexOf("const SEMAINES_ANNEE_COMPLETE=");
// On ignore les commentaires (ils citent la formule pour l'expliquer) et le
// simulateur CMG public, ou le visiteur saisit ses heures et ou 52 est la
// bonne hypothese generale. On ne retient que les calculs faits SUR UN CONTRAT.
const sansComm = zoneAppMens.replace(/^\s*\/\/.*$/gm, "");
const mensEnDur = [...sansComm.matchAll(/52\s*\/\s*12/g)]
  .filter((m) => /contrat/i.test(sansComm.slice(Math.max(0, m.index - 90), m.index + 20)))
  .filter((m) => m.index < posHelpers || m.index > posHelpers + 1600);
if (mensEnDur.length) {
  signale("paie", `${mensEnDur.length} calcul(s) de mensualisation encore figés sur 52 semaines : un accueil en année incomplète serait surévalué de plus de 10 %`);
}
if (!/const salaireMensualise=/.test(appSrc) || !/const semainesDuContrat=/.test(appSrc)) {
  signale("paie", "les fonctions de mensualisation ont disparu : les deux formules ne sont plus distinguées");
}

// Le choix du rythme ne sert a rien s'il n'est pas ecrit en base. L'assistant
// de creation posait la question et jetait la reponse : le contrat repartait en
// annee complete quoi qu'on ait repondu. Tout endroit qui ecrit un contrat doit
// donc ecrire aussi son rythme.
const ecrituresContrat = [...appSrc.matchAll(/heures_hebdo\s*:/g)];
const sansRythme = ecrituresContrat.filter((m) => {
  const bloc = appSrc.slice(Math.max(0, m.index - 400), m.index + 900);
  return !/annee_complete\s*:/.test(bloc);
});
if (sansRythme.length) {
  signale("paie", `${sansRythme.length} enregistrement(s) de contrat n'écrivent pas annee_complete : le rythme choisi est perdu et la mensualisation repart sur 52 semaines`);
}

// Le contrat ne doit rien AFFIRMER que personne n'a saisi. Il deduisait qui
// fournit les repas du seul montant de l'indemnite : a zero, il ecrivait « le
// particulier employeur fournit ». C'etait une deduction imprimee comme un
// accord, sur une clause que la convention demande aux parties de convenir.
if (!/const REPAS_TEXTE=\{/.test(appSrc) || !/repasPar\|\|A_COMPLETER/.test(appSrc)) {
  signale("pdf", "le contrat déduit à nouveau qui fournit les repas au lieu de l'imprimer tel qu'il a été convenu");
}
if (!/function IndemnitesJournalieres\(/.test(appSrc) || !/<IndemnitesJournalieres /.test(appSrc)) {
  signale("pdf", "les indemnités journalières ne sont plus modifiables sur un contrat : ni l'entretien, ni le choix des repas");
}
// Modifier une indemnite convenue sur un contrat SIGNE touche a la
// remuneration : cela demande un avenant. Aligner sur le minimum conventionnel,
// en revanche, est automatique. L'ecran doit distinguer les deux cas.
if (!/\bsimpleAlignement\b/.test(appSrc) || !/avenant signé des deux côtés/.test(appSrc)) {
  signale("paie", "l'écran des indemnités ne distingue plus l'alignement automatique sur le minimum de la modification qui exige un avenant");
}
// Meme regle pour la duree de la periode d'essai : sans jours d'accueil saisis,
// elle ne se deduit pas.
if (!/nbJours>0\?essaiMois\+" mois":A_COMPLETER/.test(appSrc)) {
  signale("pdf", "le contrat imprime une durée de période d'essai déduite même sans jours d'accueil saisis");
}

// Et le choix doit rester atteignable sur un contrat DEJA enregistre : il
// n'existait que dans l'assistant du tout premier enfant.
if (!/function RythmeAccueil\(/.test(appSrc) || !/<RythmeAccueil /.test(appSrc)) {
  signale("paie", "le rythme d'accueil n'est plus modifiable sur un contrat existant : les contrats déjà créés restent bloqués en année complète");
}

// --- documents imprimes : garde de page et convention citee ---
// Pourquoi : jsPDF n'avertit pas. Ce qui depasse le bas de la page est ecrit
// dans le vide et disparait sans un mot — la ligne « Cout total employeur »
// manquait ainsi sur un bulletin charge. Les deux documents longs doivent donc
// verifier la place restante avant d'ecrire.
for (const [nom, marqueur, garde] of [
  ["le contrat", "function redacteurPdf", /const place=\(h\)=>\{ if\(y\+h>BAS\)nouvellePage\(false\); \};/],
  ["le bulletin", "const placer=", /const placer=\(h\)=>\{ if\(y\+h>BAS_BULLETIN\)\{doc\.addPage\(\);y=15;\} \};/],
]) {
  if (!appSrc.includes(marqueur) || !garde.test(appSrc)) {
    signale("pdf", `${nom} n'a plus de garde de page : une ligne qui dépasse le bas serait écrite dans le vide, sans erreur`);
  }
}
// L'IDCC 2395 a fusionne dans la 3239 au 1er janvier 2022. Les documents s'en
// reclamaient encore : le contrat en pied de page, le bulletin deux fois.
if (/IDCC\s*2395|IDCC\s*2111/.test(appSrc)) {
  signale("chiffre", "un document cite une convention collective qui n'existe plus (2395 ou 2111 ont fusionné dans la 3239 au 1er janvier 2022)");
}
// La mention de conservation est obligatoire (art. R. 3243-5) et doit dire
// « sans limitation de duree ». Le bulletin conseillait 5 ans : c'est le delai
// de l'EMPLOYEUR, et suivre ce conseil ferait perdre des preuves de retraite.
if (!/conservez ce bulletin de paie sans limitation de durée/.test(appSrc)) {
  signale("paie", "le bulletin ne porte plus la mention obligatoire de conservation sans limitation de durée (art. R. 3243-5)");
}

// --- temps de travail, tous employeurs confondus ---
// Pourquoi : le temps de travail se compte du point de vue du SALARIE. Deux
// enfants accueillis de 8 h a 17 h font neuf heures, pas dix-huit. Additionner
// les heures de chaque contrat donne un total faux — et c'est ce total qui
// decide si les plafonds legaux sont depasses.
{
  if (!/const unionMinutes = /.test(appSrc) || !/const journeesTravaillees = /.test(appSrc)) {
    signale("chiffre", "le calcul du temps de travail réuni a disparu : les heures de plusieurs enfants seraient additionnées");
  }
  if (!/<TempsDeTravail /.test(appSrc)) {
    signale("chiffre", "l'écran du temps de travail n'est plus branché : plus aucune vue tous employeurs confondus");
  }
  // Les trois plafonds sont verifies a la source : ils ne doivent pas deriver.
  for (const [nom, motif, source] of [
    ["plafond annuel", /PLAFOND_ANNUEL_HEURES = 2250\b/, "art. L. 423-22 du code de l'action sociale et des familles"],
    ["plafond hebdomadaire", /PLAFOND_HEBDO_HEURES = 48\b/, "48 h en moyenne sur quatre mois"],
    ["amplitude journalière", /PLAFOND_AMPLITUDE_JOUR = 13\b/, "art. 110 de la CCN 3239"],
  ]) {
    if (!motif.test(appSrc)) signale("chiffre", `le ${nom} ne vaut plus la valeur vérifiée (${source})`);
  }
}

// --- vue multi-employeur ---
// Pourquoi : quand on accueille les enfants de plusieurs familles, personne ne
// voit le total — ni les parents, qui ne voient que leur contrat. Et la
// convention demande de fixer les conges d'un commun accord avec TOUTES au plus
// tard le 1er mars : cette echeance n'existait nulle part dans l'application.
{
  if (!/<MesEmployeurs /.test(appSrc)) {
    signale("chiffre", "l'écran « Mes employeurs » n'est plus branché : plus de vue des revenus famille par famille");
  }
  if (!/const DATE_ACCORD_CONGES = "03-01"/.test(appSrc)) {
    signale("chiffre", "l'échéance du 1er mars pour l'accord sur les congés a disparu (CCN 3239)");
  }
  // Un montant annonce sans bulletin doit se dire estime, et un enfant sans
  // contrat ne doit produire aucune estimation.
  if (!/sansContrat/.test(appSrc) || !/estime:!bul&&!sansContrat/.test(appSrc)) {
    signale("chiffre", "l'écran des employeurs ne distingue plus le montant d'un bulletin, une estimation, et l'absence de contrat");
  }
}

// --- composants morts ---
// Pourquoi : neuf composants etaient definis et jamais rendus — un ecran de
// connexion, un de maintenance, un d'onboarding, un d'import de contrat, tous
// remplaces un jour par une version plus recente sans que l'ancienne soit
// retiree. 542 lignes a relire, a maintenir et a auditer pour rien, et le
// risque qu'une correction soit appliquee a la mauvaise copie.
{
  const definis = [...appSrc.matchAll(/^function ([A-Z][A-Za-z0-9]*)\(/gm)].map((m) => m[1]);
  // On retire d'abord la ligne de definition : sans cela, « function X( » se
  // comptait lui-meme comme un usage et le controle ne trouvait jamais rien.
  const sansDefinitions = appSrc.replace(/^function [A-Z][A-Za-z0-9]*\(/gm, "function \u0000(");
  const morts = definis.filter((nom) => {
    const utilise = new RegExp(`<${nom}[\\s/>]|[^A-Za-z0-9_]${nom}\\(|["']${nom}["']`, "g");
    return (sansDefinitions.match(utilise) || []).length === 0;
  });
  if (morts.length) {
    signale("robustesse", `${morts.length} composant(s) défini(s) et jamais rendu(s) : ${morts.join(", ")} — code mort, à retirer ou à brancher`);
  }
}

// --- comptage des jours d'accueil ---
// Pourquoi : quatre ecrans deduisaient le nombre de jours d'accueil, chacun a
// sa facon — heures/5, heures/(hebdo/5), heures mensualisees/8, heures/8. Sur
// le meme contrat, le recapitulatif Pajemploi, le recapitulatif des versements
// et le rapport annuel annonçaient donc trois nombres differents. Tous partent
// desormais des jours prevus au contrat.
{
  const deductions = [...appSrc.matchAll(/(?:heuresAnnuelles|hMens|h\.real)\s*\/\s*(?:5|8)\b/g)]
    .map((m) => appSrc.slice(0, m.index).split("\n").length);
  if (deductions.length) {
    signale("chiffre", `${deductions.length} endroit(s) déduisent encore les jours d'accueil en divisant des heures (lignes ${deductions.join(", ")}) — partir de contrat.jours`);
  }
}
// Une echeance annoncee a l'utilisatrice doit exister. L'application affirmait
// que l'attestation fiscale se remet aux parents « avant le 31 janvier » :
// aucune obligation de ce genre, et Pajemploi la met a leur disposition en avril.
if (/avant le 31 janvier/.test(appSrc)) {
  signale("chiffre", "l'application réinvente une échéance au 31 janvier pour l'attestation fiscale : elle n'existe pas (Pajemploi la publie en avril)");
}

// --- cases de declaration de revenus ---
// Pourquoi : l'application indiquait a l'assistante maternelle de porter son
// revenu sur la « 2042 C PRO », en « famille 1GA ». Les deux etaient faux, sur
// sa propre declaration : la 2042 C PRO sert aux revenus professionnels, et la
// case 1GA ne porte que le MONTANT DE L'ABATTEMENT, a titre indicatif. Le
// revenu apres abattement va en 1AA (employeur particulier) ou 1AJ (personne
// morale). Ces reperes sont verifies : ils ne doivent pas rederiver.
{
  const zoneFiscale = appSrc.slice(
    appSrc.indexOf("function RecapFiscalAssmat"),
    appSrc.indexOf("function ", appSrc.indexOf("function RecapFiscalAssmat") + 30));
  if (/2042 C PRO/.test(zoneFiscale.replace(/^\s*\/\/.*$/gm, ""))) {
    signale("chiffre", "le récapitulatif fiscal renvoie de nouveau à la 2042 C PRO : un assistant maternel est un salarié, il déclare sur la 2042 (source : impots.gouv.fr)");
  }
  for (const [repere, quoi] of [["1AA", "la case du revenu après abattement"], ["1GA", "la case indicative de l'abattement"]]) {
    if (!zoneFiscale.includes(repere)) {
      signale("chiffre", `le récapitulatif fiscal ne cite plus ${repere} — ${quoi}`);
    }
  }
}

// --- documents imprimes : « euros » ecrit en toutes lettres ---
// Pourquoi : les PDF s'ecrivaient sans accents et avec « euros » en toutes
// lettres, par precaution contre un probleme d'encodage qui n'existe plus. Le
// jeu WinAnsi accepte les accents et le signe euro (le test d'encodage le
// demontre) : le contrat, le bulletin et le recapitulatif des versements ont
// ete repris, aucun ne doit y revenir.
{
  const euros = [...appSrc.matchAll(/doc\.text\([^;\n]{0,160}?\+\s*" euros(?:\/[a-z])?"/g)]
    .map((m) => appSrc.slice(0, m.index).split("\n").length);
  const eurosLigne = [...appSrc.matchAll(/ligne(?:Simple)?\([^;\n]{0,160}?\+\s*" euros(?:\/[a-z])?"/g)]
    .map((m) => appSrc.slice(0, m.index).split("\n").length);
  const tous = [...euros, ...eurosLigne];
  if (tous.length) {
    signale("document", `${tous.length} montant(s) écrits « euros » en toutes lettres dans un PDF (lignes ${tous.join(", ")}) — le signe € et les accents passent en WinAnsi`);
  }
}

// --- documents imprimes : dates et formulations ---
// Pourquoi : l'attestation destinee a France Travail imprimait la date
// d'embauche telle qu'elle est stockee — « 2026-01-01 » — sur un document
// juridique. Elle designait aussi le salarie au feminin, alors que le metier
// n'y est pas reserve et que le document se signe.
{
  const zonesDoc = [...appSrc.matchAll(/(?:document\.write|const html\s*=|html\s*\+=)[\s\S]{0,4000}?<\/html>/g)].map((m) => m[0]).join("\n");
  const feminins = ["la salariée", "Signature de la salariée", "assistante maternelle agréée</td>"];
  const trouves = feminins.filter((f) => zonesDoc.toLowerCase().includes(f.toLowerCase()));
  if (trouves.length) {
    signale("document", `un document imprimé désigne le salarié au féminin (${trouves.join(", ")}) : le métier n'y est pas réservé`);
  }
  // Une date brute AAAA-MM-JJ interpolee dans un document destine a etre lu.
  const datesBrutes = [...appSrc.matchAll(/<td>\s*["']\s*\+\s*g\((form\.date[A-Za-z]+)\)/g)]
    .map((m) => m[1]);
  if (datesBrutes.length) {
    signale("document", `${datesBrutes.length} date(s) imprimées au format brut sur un document (${datesBrutes.join(", ")}) — passer par fmtDatePdf()`);
  }
}

// --- brut et net ---
// Pourquoi : le taux horaire enregistre au contrat est un taux BRUT — le
// bulletin y assied les cotisations, et le minimum conventionnel (4,20 EUR) est
// un brut. La moitie de l'application l'affichait pourtant sous le libelle
// « taux horaire NET » : sur le contrat, sur l'ecran du parent, dans les
// formulaires. La meme valeur etait annoncee comme du net ici et declaree comme
// du brut sur l'attestation France Travail. Pres de 22 % d'ecart sur le chiffre
// le plus important de l'application.
{
  const mauvaisLibelle = [...appSrc.matchAll(/["'](?:Taux|Salaire)[^"']{0,30}\bnet\b[^"']{0,20}["'][^\n]{0,120}(?:contrat[?.]?\.tauxHoraire|ct\.taux_horaire|salaireMensualise\()/gi)]
    .map((m) => appSrc.slice(0, m.index).split("\n").length);
  if (mauvaisLibelle.length) {
    signale("chiffre", `${mauvaisLibelle.length} libellé(s) appellent « net » le taux ou le salaire du contrat, qui est un BRUT (lignes ${mauvaisLibelle.join(", ")})`);
  }
  // Le coefficient 0,78 etait une approximation inventee du rapport net/brut,
  // appliquee y compris a l'indemnite d'entretien qui n'est pas du salaire.
  if (/\*\s*0\.78\b/.test(appSrc)) {
    signale("chiffre", "le coefficient 0,78 est de retour : le net se calcule avec les vraies cotisations, via netDepuisBrut()");
  }
  if (!/const netDepuisBrut=/.test(appSrc)) {
    signale("chiffre", "netDepuisBrut() a disparu : chaque écran refera son propre calcul du net");
  }
}

// --- composants React ecrits dans des documents imprimes ---
// Pourquoi : la conversion des emoji en icones a remplace les caracteres par
// <IconeOuEmoji/> partout, y compris DANS des chaines HTML ecrites avec
// document.write. Le navigateur y voit une balise inconnue et n'affiche rien :
// six icones avaient ainsi disparu du recapitulatif Pajemploi, celui qu'on
// imprime pour declarer. Le composant n'existe que dans du JSX.
{
  const dansUneChaine = [];
  for (const [n, l] of appSrc.split("\n").entries()) {
    if (!l.includes("<IconeOuEmoji")) continue;
    const dans = new Array(l.length).fill(false);
    let q = null;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (q) { dans[i] = true; if (c === "\\") { i++; continue; } if (c === q) q = null; }
      else if (c === '"' || c === "'" || c === "`") { q = c; dans[i] = true; }
    }
    const i = l.indexOf("<IconeOuEmoji");
    if (dans[i]) dansUneChaine.push(n + 1);
  }
  if (dansUneChaine.length) {
    signale("icônes", `${dansUneChaine.length} icône(s) écrites comme composant React dans une chaîne HTML (lignes ${dansUneChaine.join(", ")}) — elles ne s'affichent pas du tout dans le document imprimé`);
  }
}

// --- documents deja produits ---
// Pourquoi : un PDF est ecrit une fois puis relu tel quel. Refondre le
// generateur ne touche pas les fichiers deja produits — l'application montrait
// le nouveau contrat aux nouvelles signatures et l'ancien a toutes les autres,
// sans que rien ne le signale. Les deux ecrans doivent donc detecter un
// document perime et proposer de le refaire.
if (!/const pdfPerime=/.test(appSrc)) {
  signale("pdf", "la détection des PDF périmés a disparu : refondre un document laisserait les fichiers déjà produits en place, en silence");
} else {
  for (const [nom, garde] of [
    ["le contrat", /pdfPerime\(contrat\?\.pdf_generated_at,contrat\?\.updated_at\)/],
    ["le bulletin", /pdfPerime\(bulletinsEnvoyes\[moisSelKey\]\.date_envoi\)/],
  ]) {
    if (!garde.test(appSrc)) signale("pdf", `${nom} ne vérifie plus si son PDF est périmé : l'utilisatrice rouvrirait l'ancienne version sans le savoir`);
  }
  // La date de refonte doit suivre la derniere refonte, sinon le controle
  // laisse passer les fichiers qu'il devrait signaler.
  const refonte = (appSrc.match(/const DOCUMENTS_REFONTE="(\d{4}-\d{2}-\d{2})/) || [])[1];
  if (!refonte) signale("pdf", "la date de refonte des documents est absente ou mal formée");
}
// Regenerer un bulletin ne doit pas renvoyer un courriel au parent pour un
// document qu'il a deja recu.
if (/const envoyerAuParent=async\(\)/.test(appSrc)) {
  signale("pdf", "envoyerAuParent() ne distingue plus l'envoi de la simple mise à jour : régénérer un bulletin renotifierait le parent");
}

// --- notation des nombres ---
// Pourquoi : toFixed() ecrit « 4.20 », avec le point anglais. Une assistante
// maternelle qui recopie un montant dans Pajemploi le recopie tel quel.
// nbf() met la virgule francaise, sans separateur de milliers — l'espace fine
// insecable du francais est absente du jeu WinAnsi et ferait disparaitre la
// ligne entiere des PDF.
const toFixedRestants = [...appSrc.matchAll(/\.toFixed\(/g)]
  .filter((m) => !/^\s*\/\//.test(appSrc.slice(appSrc.lastIndexOf("\n", m.index) + 1, m.index)));
if (toFixedRestants.length) {
  signale("chiffre", `${toFixedRestants.length} nombre(s) affichés avec toFixed() : ils sortent avec un point anglais au lieu de la virgule — passer par nbf()`);
}
if (/useGrouping\s*:\s*true/.test(appSrc) || !/const nbf=/.test(appSrc)) {
  signale("chiffre", "nbf() a disparu ou groupe les milliers : l'espace fine insécable du français casse les lignes de PDF");
}

// --- mode hors ligne ---
// Pourquoi : le hors ligne ne se voit pas. Quand il tombe, rien ne clignote —
// une journee de pointage disparait en silence. Ces barrieres remplacent
// l'observation, impossible ici.

// 1. Le service worker EST le mode hors ligne. Pendant des mois l'application
//    le desinscrivait a chaque demarrage, tout en affichant « donnees
//    sauvegardees localement » : le bandeau mentait.
const cheminSw = path.join(RACINE, "public", "sw.js");
const swSrc = existsSync(cheminSw) ? readFileSync(cheminSw, "utf8") : "";
if (!swSrc) {
  signale("hors-ligne", "public/sw.js est absent : ni mode hors ligne ni notifications push ne peuvent exister");
} else {
  if (/registration\.unregister\(\)/.test(swSrc)) {
    signale("hors-ligne", "public/sw.js se desinscrit lui-meme : le mode hors ligne ne demarrera jamais");
  }
  // La navigation DOIT aller au reseau d'abord, sinon une mise en ligne n'est
  // jamais vue et Sophie reste bloquee sur une ancienne version.
  if (!/req\.mode === 'navigate'/.test(swSrc) || !/fetch\(req\)\s*\n?\s*\.then/.test(swSrc)) {
    signale("hors-ligne", "public/sw.js ne sert plus les pages par le reseau d'abord : une mise en ligne ne serait plus visible");
  }
  if (/caches\.match\(req\)/.test(swSrc) && !/\/assets\//.test(swSrc)) {
    signale("hors-ligne", "public/sw.js sert du cache en dehors de /assets/ : seuls les fichiers a empreinte peuvent l'etre sans risque");
  }
}
if (/getRegistrations\(\)[\s\S]{0,120}unregister\(\)/.test(appSrc)) {
  signale("hors-ligne", "l'application desinscrit les service workers au demarrage : le mode hors ligne et le push sont annules");
}
if (!/navigator\.serviceWorker\.register\('\/sw\.js'\)/.test(appSrc)) {
  signale("hors-ligne", "le service worker n'est plus enregistre : /sw.js ne sera jamais actif");
}

// 2. Les ecritures de pointage doivent TOUTES passer par enregistrerPointage().
//    Un seul appel direct a supabase remet un chemin ou le pointage se perd.
if (!/async function enregistrerPointage\(/.test(appSrc)) {
  signale("hors-ligne", "enregistrerPointage() a disparu : les pointages ne sont plus mis en file quand le reseau manque");
}
if (!/async function rejouerFile\(/.test(appSrc)) {
  signale("hors-ligne", "rejouerFile() a disparu : la file d'attente ne serait jamais envoyee");
}
// Les deux seules ecritures legitimes sont celles du module hors ligne
// lui-meme (enregistrerPointage et rejouerFile) : on borne cette zone et on
// compte tout ce qui est en dehors.
const debutModuleHL = appSrc.indexOf('const CLE_HL="timat:hl:";');
const ancreRejeu = appSrc.indexOf("async function rejouerFile(){");
const finModuleHL = ancreRejeu >= 0 ? appSrc.indexOf("\n}\n", ancreRejeu) + 3 : -1;
const ecrituresDirectes = [...appSrc.matchAll(/supabase\.from\("pointages"\)\.(upsert|update|insert)/g)]
  .filter((m) => !(debutModuleHL >= 0 && finModuleHL > debutModuleHL && m.index > debutModuleHL && m.index < finModuleHL));
if (ecrituresDirectes.length) {
  signale("hors-ligne", `${ecrituresDirectes.length} ecriture(s) de pointage court-circuitent enregistrerPointage() : hors ligne, elles se perdent`);
}

// 3. Le rejeu ne doit jamais ecraser une correction faite par le parent
//    pendant la coupure.
// Presence du garde-fou ne suffit pas : c'est la COMPARAISON qui protege.
// Il faut que le rejeu lise la correction du parent, la compare a l'heure du
// pointage mis en file, et marque un conflit plutot que d'ecraser.
const zoneRejeu = ancreRejeu >= 0 && finModuleHL > ancreRejeu ? appSrc.slice(ancreRejeu, finModuleHL) : "";
if (!/modified_by_parent_at/.test(zoneRejeu)
  || !/>\s*String\(e\.faitLe\)/.test(zoneRejeu)
  || !/marquerConflit\(e\.id/.test(zoneRejeu)) {
  signale("hors-ligne", "le rejeu ne compare plus la correction du parent a l'heure du pointage en file : la correction du parent serait ecrasee");
}

// 4. Une erreur metier mise en file echouerait indefiniment sans rien dire.
if (!/const panneReseau=/.test(appSrc)) {
  signale("hors-ligne", "panneReseau() a disparu : une erreur de droits serait mise en file et rejouee sans fin");
}

// 5. Une donnee hors ligne affichee sans sa date est une donnee qu'on croit
//    fraiche a tort. C'est le seul vrai danger de la consultation hors ligne.
if (/lireHorsLigne\(/.test(appSrc) && !/copie\.le/.test(appSrc)) {
  signale("hors-ligne", "une copie hors ligne est relue sans que sa date soit affichee : elle passerait pour a jour");
}
if (/Affichage hors ligne/.test(appSrc) && !/fmtDateHeureCourte\(copieLe\)/.test(appSrc)) {
  signale("hors-ligne", "le bandeau de consultation hors ligne n'affiche plus la date de la copie");
}

// 6bis. Mettre la seule page en reserve ne suffit pas : au premier chargement,
//       les fichiers de /assets/ sont demandes avant que le service worker ne
//       prenne les commandes. Sans mise en reserve explicite, l'application
//       reste sur « Chargement... » hors ligne, sans jamais demarrer.
if (swSrc && !/\/assets\/\[\^"'\]\+|matchAll\(/.test(swSrc)) {
  signale("hors-ligne", "public/sw.js ne met plus le code de l'application en reserve : hors ligne, elle resterait sur « Chargement... »");
}
// L'en-tete Vary du serveur empeche de retrouver une reponse pourtant en
// cache. C'est exactement le defaut qui faisait echouer le demarrage hors ligne.
if (swSrc && /caches\.match\(/.test(swSrc) && !/ignoreVary: true/.test(swSrc)) {
  signale("hors-ligne", "public/sw.js relit le cache sans ignoreVary : les fichiers en reserve ne seraient pas retrouves");
}

// 6. Le bandeau a longtemps annonce une sauvegarde locale qui n'existait pas.
if (/sauvegard\u00e9es localement/.test(appSrc)) {
  signale("hors-ligne", "le bandeau annonce « donnees sauvegardees localement » : ne l'ecrire que si la file existe vraiment");
}
if (/setSyncing\(true\);setTimeout/.test(appSrc)) {
  signale("hors-ligne", "le bouton de synchronisation est un simple minuteur : il n'envoie rien");
}

// --- ecriture des documents ---
// Le PDF du contrat s'ecrit dans l'espace de stockage de l'assistante
// maternelle. La regle de securite du stockage exige que le premier dossier du
// chemin soit celui de la personne qui ecrit : un parent employeur ne peut donc
// PAS produire ce fichier. Le bouton lui etait pourtant propose, et echouait
// avec « new row violates row-level security policy » — un message de base de
// donnees affiche tel quel a l'ecran.
if (!/Seule l'assistante maternelle peut mettre ce PDF/.test(appSrc)) {
  signale("documents", "generateAndStoreContratPDF() ne refuse plus un appelant qui n'est pas l'assistante maternelle : l'erreur brute de la base remonterait a l'ecran");
}
if (!/role!=="parent"&&\s*\n?\s*<button className=\{"btn s "\+\(contratPerime/.test(appSrc)) {
  signale("documents", "le bouton « Mettre a jour le PDF » est de nouveau propose au parent : il echouera a coup sur");
}
if (!/Demandez à votre assistante maternelle de le mettre à jour/.test(appSrc)) {
  signale("documents", "le parent n'est plus oriente quand son PDF de contrat est perime : il resterait sans issue");
}

// --- ce que le bandeau de message affiche ---
// L'icone du Toast etait figee sur une coche verte. Un message d'erreur
// sortait donc avec le signe de la reussite.
if (/function Toast\(\{msg,onClose\}\)/.test(appSrc) || !/const ICONE_MESSAGE=/.test(appSrc)) {
  signale("message", "le bandeau de message affiche une coche verte quelle que soit la nature du message, y compris sur une erreur");
}

// --- titres et descriptions vus dans Google ---
// Google coupe un titre au-dela d'une soixantaine de caracteres et une
// description au-dela de ~160 : la fin disparait des resultats de recherche.
// Quatorze pages depassaient, toutes a cause de noms de departements longs
// auxquels s'ajoutait « | TiMat ». Le suffixe est desormais retire quand le
// titre est trop long (scripts/generate-local.mjs).
//
// Le seuil d'alerte est pose a 70, non a 65 : la coupure se fait sur la
// largeur en pixels, pas sur un nombre exact de caracteres, et alerter des la
// limite theorique ferait crier la barriere en permanence pour rien.
const TITRE_MAX = 70;
const DESCRIPTION_MAX = 170;
const titresLongs = [];
const descriptionsLongues = [];
for (const p of pages) {
  const html = lire(p);
  // Les pages en noindex ne paraissent jamais dans Google : leur titre et leur
  // description n'y sont pas affiches.
  if (/<meta[^>]+robots[^>]+noindex/i.test(html)) continue;
  const t = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  if (t) {
    const propre = t.replace(/&#39;|&rsquo;/g, "'").replace(/&amp;/g, "&").trim();
    if (propre.length > TITRE_MAX) titresLongs.push(`${routeDe(p)} (${propre.length})`);
  }
  const d = (html.match(/<meta\s+name="description"\s+content="([\s\S]*?)"/) || [])[1];
  if (d) {
    const propre = d.replace(/&#39;|&rsquo;/g, "'").replace(/&amp;/g, "&").trim();
    if (propre.length > DESCRIPTION_MAX) descriptionsLongues.push(`${routeDe(p)} (${propre.length})`);
  }
}
if (titresLongs.length) {
  signale("référencement", `${titresLongs.length} titre(s) coupé(s) dans les résultats Google : ${titresLongs.slice(0, 3).join(", ")}`);
}
if (descriptionsLongues.length) {
  signale("référencement", `${descriptionsLongues.length} description(s) coupée(s) dans les résultats Google : ${descriptionsLongues.slice(0, 3).join(", ")}`);
}

// --- en-tetes de securite du site ---
// Le site ne posait AUCUN en-tete de securite. Le plus grave manquait :
// rien n'empechait d'enfermer TiMat dans un cadre invisible sur un autre site.
// Un site malveillant pouvait superposer un cadre transparent et faire cliquer
// quelqu'un sur « Signer le contrat » sans qu'il le sache.
// Second point : l'adresse complete de la page partait dans l'en-tete Referer
// de chaque lien sortant — or elle peut porter une cle d'acces ou un jeton de
// partage.
const enTetesAttendus = {
  "X-Frame-Options": /DENY|SAMEORIGIN/,
  "Content-Security-Policy": /frame-ancestors/,
  "X-Content-Type-Options": /nosniff/,
  "Referrer-Policy": /strict-origin|no-referrer/,
  "Permissions-Policy": /microphone=\(\)/,
};
const blocsEnTetes = (vercel.headers || []).flatMap((b) => b.headers || []);
for (const [cle, motif] of Object.entries(enTetesAttendus)) {
  const pose = blocsEnTetes.find((h) => h.key === cle);
  if (!pose) signale("en-têtes", `vercel.json ne pose plus l'en-tete ${cle}`);
  else if (!motif.test(pose.value)) signale("en-têtes", `vercel.json pose ${cle} avec une valeur inattendue : « ${pose.value} »`);
}

// --- vues SQL et donnees personnelles ---
// Une vue en SECURITY DEFINER contourne les regles de securite des tables
// qu'elle lit. public.abonnements_actifs, ecrite ainsi et lisible par le role
// « anon », exposait a tout visiteur non connecte le nom, l'adresse e-mail et
// l'identifiant Stripe de chaque abonne. Elle n'etait appelee nulle part.
//
// Toute vue creee par une migration doit donc etre explicitement en
// security_invoker : elle s'execute alors avec les droits de celui qui
// l'interroge, et les regles de la table s'appliquent normalement.
const dossierSql = path.join(RACINE, "sql");
if (existsSync(dossierSql)) {
  for (const f of readdirSync(dossierSql).filter((x) => x.endsWith(".sql"))) {
    const sql = readFileSync(path.join(dossierSql, f), "utf8");
    for (const m of sql.matchAll(/create\s+(or\s+replace\s+)?view\s+([a-z_.]+)([\s\S]{0,200})/gi)) {
      if (!/security_invoker\s*=\s*(true|on)/i.test(m[3])) {
        signale("sql", `sql/${f} cree la vue « ${m[2]} » sans security_invoker : elle contournerait les regles de securite des tables qu'elle lit`);
      }
    }
  }
}

// --- notifications push ---
// Pourquoi : le push a existe pendant des mois sans jamais fonctionner, et
// sans que rien ne le dise. Aucun de ces defauts ne produit d'erreur visible.
const cheminPush = path.join(RACINE, "api", "send-push.js");
const pushSrc = existsSync(cheminPush) ? readFileSync(cheminPush, "utf8") : "";

// 1. La cle d'exemple des tutoriels web-push circule dans des milliers de
//    pages : sa partie privee est publique. L'employer laisserait n'importe qui
//    envoyer des notifications au nom de TiMat.
if (/BEl62iUYgUivxIkv69yViEuiBIa40HZa/.test(appSrc)) {
  signale("push", "la cle VAPID des tutoriels est employee : sa partie privee est publique, n'importe qui pourrait notifier au nom de TiMat");
}
const cleVapid = (appSrc.match(/const VAPID_PUBLIQUE="([^"]+)"/) || [])[1];
if (!cleVapid) {
  signale("push", "la cle VAPID publique a disparu : aucun abonnement push ne peut etre cree");
} else if (!/^[A-Za-z0-9_-]{80,90}$/.test(cleVapid)) {
  signale("push", "la cle VAPID n'est pas au format base64url attendu : le navigateur refusera l'abonnement");
}
// La cle PRIVEE donne le droit de notifier tous les utilisateurs : elle ne doit
// jamais entrer dans le depot.
if (/VAPID_PRIVATE_KEY\s*[:=]\s*["'][A-Za-z0-9_-]{20,}["']/.test(appSrc + pushSrc)) {
  signale("push", "une cle VAPID PRIVEE est ecrite en clair dans le code : elle permet de notifier tous les utilisateurs");
}
// Le navigateur veut des octets. Une chaine base64 passee telle quelle fait
// echouer l'abonnement avant qu'il ne commence.
if (!/const cleEnOctets=/.test(appSrc) || !/applicationServerKey:cleEnOctets\(/.test(appSrc)) {
  signale("push", "la cle VAPID n'est plus convertie en octets : applicationServerKey refuse une chaine");
}

// 2. La route d'envoi a longtemps ete ouverte a tout internet, destinataire
//    lu dans le corps du message. N'importe qui pouvait notifier n'importe qui.
if (!pushSrc) {
  signale("push", "api/send-push.js est absent : aucune notification ne peut partir");
} else {
  if (/Access-Control-Allow-Origin['"]?\s*,\s*['"]\*/.test(pushSrc)) {
    signale("push", "api/send-push.js est ouvert a toutes les origines : n'importe qui pourrait notifier n'importe quel utilisateur");
  }
  if (!/headers\.authorization/i.test(pushSrc) || !/auth\.getUser\(\)/.test(pushSrc)) {
    signale("push", "api/send-push.js ne verifie plus qui appelle : le destinataire annonce suffirait");
  }
  if (!/rpc\(['"]peut_notifier['"]/.test(pushSrc)) {
    signale("push", "api/send-push.js ne demande plus a la base le droit de notifier : la regle du lien parent/assmat serait contournee");
  }
  // L'ordre compte : verifier apres avoir envoye ne protege de rien.
  const iDroit = pushSrc.indexOf("peut_notifier");
  const iEnvoi = pushSrc.indexOf("sendNotification");
  if (iDroit >= 0 && iEnvoi >= 0 && iDroit > iEnvoi) {
    signale("push", "api/send-push.js envoie avant de verifier le droit de notifier");
  }
  if (!/\[404, 410\]/.test(pushSrc)) {
    signale("push", "api/send-push.js ne retire plus les abonnements morts : la table grossirait sans fin");
  }
}

// 2bis. Les deux cles forment une paire. Une privee qui ne correspond pas a la
//       publique fait echouer chaque envoi avec une erreur de signature, sans
//       jamais dire d'ou vient le probleme.
if (pushSrc && !/function pairePpCoherente\(\)/.test(pushSrc)) {
  signale("push", "la coherence de la paire de cles VAPID n'est plus verifiee : une cle privee qui ne correspond pas ferait echouer tous les envois en silence");
}
if (pushSrc && /function pairePpCoherente\(\)/.test(pushSrc) && !/!paireOk/.test(pushSrc)) {
  signale("push", "la coherence de la paire est calculee mais l'envoi part quand meme : le controle ne sert a rien");
}

// 3. Sans gestionnaire dans le service worker, une notification qui arrive
//    n'affiche rien — ou Chrome affiche un message generique a la place.
if (swSrc && (!/addEventListener\('push'/.test(swSrc) || !/showNotification/.test(swSrc))) {
  signale("push", "public/sw.js n'affiche plus les notifications recues : elles arriveraient sans rien montrer");
}
if (swSrc && !/addEventListener\('notificationclick'/.test(swSrc)) {
  signale("push", "public/sw.js ne reagit plus a l'appui sur une notification");
}

// 4. Le bouton annoncait « Notifications activees ✓ » meme quand la personne
//    refusait l'autorisation.
if (/Notifications activ\u00e9es \u2713/.test(appSrc)) {
  signale("push", "le succes des notifications est annonce sans avoir ete verifie");
}
if (!/const r=await activerPush\(/.test(appSrc)) {
  signale("push", "activerPush() n'est plus appelee : le bouton d'activation ne ferait rien");
}
// Sur iPhone, Apple reserve le push aux applications installees sur l'ecran
// d'accueil. C'est la premiere chose a dire a qui appuie sans effet.
if (!/impossible-ios/.test(appSrc)) {
  signale("push", "le cas de l'iPhone sans installation n'est plus traite : le bouton semblerait casse sans explication");
}
// 4bis. Les parents recoivent des notifications eux aussi. L'ecran n'etait
//       d'abord que dans le menu de l'assistante maternelle : cote parent, il
//       existait sans qu'aucun chemin n'y mene.
//       La regle porte sur l'accessibilite, pas sur le menu : « Mes alertes »
//       a quitte « Outils Pro » pour les Parametres, ou l'on va chercher un
//       reglage. Les Parametres s'ouvrent pour les deux roles, donc un lien
//       la-bas suffit — a condition qu'il ne soit pas cache derriere un role.
{
  const menus = (appSrc.match(/id:"mes_alertes"/g) || []).length;
  const secSrc = readFileSync(new URL("../src/ecrans-secondaires.jsx", import.meta.url), "utf8");
  // Le lien doit exister, et la carte qui le porte ne doit pas etre rendue sous
  // condition : une carte ouverte par « x && <div className="card"> » ne
  // s'afficherait que pour un role.
  const iLien = secSrc.indexOf('["🔔","Mes alertes","mes_alertes"]');
  let depuisReglages = false;
  if (iLien > 0) {
    const iCarte = secSrc.lastIndexOf('<div className="card">', iLien);
    const avant = secSrc.slice(Math.max(0, iCarte - 90), iCarte);
    depuisReglages = !/&&\s*$|\?\s*$/.test(avant.replace(/\s*\/\*[\s\S]*?\*\/\s*$/, ""));
  }
  if (menus < 2 && !depuisReglages) {
    signale("push", "l'ecran « Mes alertes » n'est atteignable ni depuis les deux menus ni depuis les Parametres des deux roles : un role ne pourrait pas gerer ses notifications");
  }
}

// 5. Le push doit partir du point unique des notifications. Reparti dans les
//    ecrans, il serait oublie au prochain evenement ajoute.
if (!/async function createNotification\([\s\S]{0,900}envoyerPush\(/.test(appSrc)) {
  signale("push", "le push ne part plus de createNotification() : chaque nouvel evenement risquerait de l'oublier");
}

// --- politiques RLS de type ALL sans WITH CHECK ---
//
// Quand WITH CHECK est absent, Postgres reutilise la condition de LECTURE
// comme condition d'ECRITURE. C'est sans danger pour une condition symetrique
// (« c'est ma ligne »), et exploitable sinon : public.messages autorisait
// « expediteur OU destinataire », donc on pouvait inserer un message attribue
// a quelqu'un d'autre, et reecrire le texte d'un message recu. Les deux ont
// ete reproduits le 16 septembre 2026, puis fermes.
//
// Cette barriere ne remplace PAS un relevé dans Supabase : elle verifie que
// chaque politique de la liste porte un verdict motive, et que la table
// messages n'y est jamais reintroduite.
{
  let rls;
  try { rls = JSON.parse(readFileSync(new URL("../data/politiques-rls.json", import.meta.url), "utf8")); }
  catch { rls = null; }
  if (!rls) {
    signale("rls", "data/politiques-rls.json est introuvable ou illisible : le relevé des politiques ALL sans WITH CHECK n'est plus tenu");
  } else {
    const relues = rls.all_sans_with_check_relues || [];
    if (!relues.length) signale("rls", "le relevé des politiques ALL sans WITH CHECK est vide — il n'a probablement pas été rejoué");
    for (const p of relues) {
      if (!p.verdict || !/sym\u00e9trique/i.test(p.verdict)) {
        signale("rls", `la politique ${p.table}.${p.politique} n'a pas de verdict « symétrique » : une condition asymétrique laisse écrire une ligne attribuée à autrui`);
      }
      if (p.table === "messages") {
        signale("rls", "public.messages est revenue dans les politiques ALL sans WITH CHECK : c'est la faille du 16 septembre 2026, rouverte");
      }
    }
  }
}

// --- le zoom doit rester possible ---
//
// L'application forcait maximum-scale=1 a l'execution pour empecher iOS de
// zoomer tout seul au focus d'un champ. Mais iOS ne fait cela que sous 16 px,
// et tous les champs sont deja en font-size:16px!important : la protection ne
// servait a rien et privait de zoom des utilisatrices qui lisent des montants
// sur un bulletin. Lighthouse l'a signale en accessibilite le 16 septembre 2026.
// On ignore les commentaires : ils ont le droit de raconter d'ou l'on vient,
// et le commentaire qui explique ce correctif cite justement maximum-scale=1.
const horsCommentaires = (t) => t.split("\n").filter((l) => !/^\s*(\/\/|\*|<!--)/.test(l)).join("\n");
for (const brut of [appSrc, readFileSync(new URL("../index.html", import.meta.url), "utf8")]) {
  const src = horsCommentaires(brut);
  if (/user-scalable\s*=\s*no/.test(src)) {
    signale("accessibilité", "le zoom est desactive par user-scalable=no : une utilisatrice malvoyante ne peut plus agrandir la page");
  }
  for (const m of src.matchAll(/maximum-scale\s*=\s*([\d.]+)/g)) {
    if (parseFloat(m[1]) < 5) {
      signale("accessibilité", `maximum-scale=${m[1]} empeche d'agrandir la page : le minimum acceptable est 5`);
    }
  }
}
// Si cette regle saute, c'est que les champs sont repasses sous 16 px : le zoom
// automatique d'iOS reviendrait, et la tentation de le bloquer avec.
if (!/input,\s*select,\s*textarea\{font-size:16px!important/.test(appSrc)) {
  signale("accessibilité", "les champs ne sont plus forces a 16 px : iOS va zoomer au focus, et la parade habituelle est de desactiver le zoom");
}

// --- le forfait ne se verrouille qu'a un seul endroit ---
//
// ECRANS_PRO est la liste de ce que le forfait Pro ouvre, et le routeur la
// consulte AVANT d'appeler quoi que ce soit. Tant qu'un ecran passe par la,
// il est ferme quel que soit le chemin emprunte.
//
// Le danger n'est pas qu'on oublie la liste : c'est qu'on la court-circuite,
// en remettant un ternaire a la main dans le routeur. C'est ainsi que
// « rapport_annuel » et « attestation_pe » se sont retrouves verrouilles par
// l'onglet Documents et ouverts par leur propre route — la meme fonction,
// deux reponses, selon le chemin. Rien ne plantait.
//
// Deux choses sont donc verifiees : aucun verrou ecrit a la main a cote de la
// liste, et aucune entree de la liste qui ne corresponde a un ecran reel.
{
  // Les commentaires sont retires avant la recherche : le commentaire qui
  // EXPLIQUE le motif interdit le contient forcement, et se signalait
  // lui-meme. Une barriere qui accuse sa propre documentation apprend a
  // ignorer ce qu'elle dit.
  const app = readFileSync(fichiersAppSrc().find((u) => u.pathname.endsWith("/App.jsx")), "utf8")
    .replace(/^\s*\/\/.*$/gm, "");

  const aLaMain = [...app.matchAll(/case "(\w+)": return isPro\s*\?/g)].map((m) => m[1]);
  if (aLaMain.length) {
    signale("forfait", `${aLaMain.length} ecran(s) rouvrent un verrou a la main dans le routeur au lieu de passer par ECRANS_PRO : ${aLaMain.join(", ")}. Le verrou deviendrait dependant du chemin emprunte.`);
  }

  const bloc = app.match(/export const ECRANS_PRO = \{([\s\S]*?)\n\};/);
  if (!bloc) {
    signale("forfait", "ECRANS_PRO est introuvable : plus rien ne declare ce que le forfait Pro ouvre.");
  } else {
    const declares = [...bloc[1].matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]);
    if (!declares.length) signale("forfait", "ECRANS_PRO est vide : toute l'application est gratuite.");
    const routes = new Set([...app.matchAll(/case "(\w+)": return /g)].map((m) => m[1]));
    for (const id of declares) {
      if (!routes.has(id)) signale("forfait", `ECRANS_PRO verrouille « ${id} », qui ne correspond a aucun ecran du routeur : le verrou ne protege rien.`);
    }
    // Le routeur doit lire la liste POUR EN TIRER UN VERROU. Chercher la
    // simple presence de « ECRANS_PRO[page] » ne suffisait pas : en
    // remplacant la condition par if(false), la ligne qui lit le titre
    // continuait de matcher et la barriere se taisait. C'est la garde
    // elle-meme qu'on cherche.
    if (!/if\s*\(\s*!isPro\s*&&\s*ECRANS_PRO\[page\]\s*\)/.test(app)) {
      signale("forfait", "le routeur ne consulte plus ECRANS_PRO : la liste est devenue decorative et tous les ecrans Pro sont ouverts.");
    }
  }
}

// --- une autorisation ne se coche qu'a un seul endroit ---
//
// La fiche d'urgence portait cinq cases a cocher — urgences, paracetamol,
// sorties, voiture, photos — dont TROIS arrivaient deja cochees. Une
// autorisation pre-cochee que personne n'a signee s'imprimait ensuite sur la
// fiche comme si le parent l'avait donnee.
//
// Et l'ecran Autorisations posait les memes questions, en les faisant signer :
// deux reponses possibles pour la meme question, dont une seule avait une
// valeur. Celle qui n'en avait pas etait la plus facile a remplir.
//
// Les autorisations vivent donc dans la table « autorisations », signees par
// le parent, et nulle part ailleurs.
{
  const sources = fichiersAppSrc().map((u) => [u.pathname.split("/").pop(), readFileSync(u, "utf8")]);
  for (const [nom, src] of sources) {
    // Le champ de formulaire qui recree une autorisation a la main.
    const champs = [...src.matchAll(/\bauth(Urgences|Paracetamol|Sorties|Voiture|Photos)\b/g)];
    if (champs.length) {
      signale("autorisations", `${nom} porte ${champs.length} champ(s) d'autorisation en dur (${[...new Set(champs.map((m) => m[0]))].join(", ")}) : une autorisation se signe sur l'ecran Autorisations, elle ne se coche pas ailleurs`);
    }
  }
  // L'ecran Autorisations doit rester le seul a ECRIRE dans la table.
  const ecrivains = sources
    .filter(([, src]) => /from\("autorisations"\)[\s\S]{0,80}\.(upsert|insert|update)\(/.test(src))
    .map(([nom]) => nom);
  const attendus = new Set(["ecrans-secondaires.jsx"]);
  for (const nom of ecrivains) {
    if (!attendus.has(nom)) {
      signale("autorisations", `${nom} ecrit dans la table « autorisations » : seul l'ecran Autorisations doit le faire, sinon une reponse non signee peut ecraser une reponse signee`);
    }
  }
}

// --- un rappel de composant partage avec le mauvais nom de prop ---
//
// Toast attend « onClose ». Trois ecrans neufs lui passaient « onDone » : le
// message s'affichait et ne partait plus, et la construction ne disait rien —
// React ignore une prop inconnue en silence. Le parcours visuel ne l'a pas vu
// non plus, parce qu'il navigue sans jamais declencher de message.
//
// Le nom attendu est LU dans la signature du composant, jamais recopie ici :
// une copie finirait par diverger de l'originale.
{
  const sources = fichiersAppSrc().map((u) => [u.pathname.split("/").pop(), readFileSync(u, "utf8")]);
  const tout = sources.map(([, src]) => src).join("\n");
  for (const [composant, requise] of [["Toast", "onClose"], ["SignaturePad", "onSave"]]) {
    const sig = tout.match(new RegExp("function\\s+" + composant + "\\s*\\(\\s*\\{([^}]*)\\}"));
    if (!sig) { signale("props", `le composant ${composant} est introuvable : la verification de ses props ne protege plus rien`); continue; }
    if (!sig[1].split(",").some((c) => c.trim().split(/[:=]/)[0].trim() === requise)) {
      signale("props", `${composant} n'accepte plus « ${requise} » : la regle verifiee ici ne correspond plus au composant`);
      continue;
    }
    for (const [nom, src] of sources) {
      // [^>] s'arretait sur le « > » de la fleche d'un « ()=>… » : la balise
      // etait coupee avant la prop cherchee, et la barriere se taisait sur le
      // bug meme qu'elle devait attraper. On accepte tout caractere, en
      // s'arretant au premier « /> ».
      for (const m of src.matchAll(new RegExp("<" + composant + "\\s[\\s\\S]{0,300}?/>", "g"))) {
        if (!new RegExp("\\b" + requise + "\\s*=").test(m[0])) {
          signale("props", `${nom} : un <${composant}> sans « ${requise} » — la prop est ignoree en silence, et le composant ne se ferme jamais`);
        }
      }
    }
  }
}

// --- aucune coordonnee officielle ecrite en dur ---
//
// Un annuaire de PMI par departement vivait dans le code : une quarantaine
// d'adresses et de telephones, INVENTES. La Haute-Garonne y figurait comme
// pmi@haute-garonne.fr quand le contact publie par le departement est
// accueilpmi-individuelcollectif@cd31.fr, et le repli conseillait d'appeler
// « le 15 » — le SAMU — pour joindre la PMI.
//
// Ces valeurs s'affichaient comme officielles, et le telephone s'imprimait sur
// la FICHE D'URGENCE, a cote du SAMU et des pompiers. Un numero faux a cet
// endroit est compose le jour ou tout va mal.
//
// On ne devine pas une coordonnee d'administration. Elle est saisie par celle
// qui la connait, ou elle n'apparait pas.
{
  const sources = fichiersAppSrc().map((u) => [u.pathname.split("/").pop(), readFileSync(u, "utf8")]);
  // Les domaines d'administrations et de collectivites. On cherche une adresse
  // ecrite en dur, pas une URL de documentation : d'ou le « @ ».
  const motif = /["'][\w.+-]+@[\w.-]*(?:gouv\.fr|urssaf\.fr|caf\.fr|departement\d*\.fr|cd\d{2}\.fr|\w+-?\w*\.fr)["']/g;
  const ADMIN = /(pmi|caf|urssaf|prefecture|conseil-?departemental|departement)/i;
  for (const [nom, src] of sources) {
    if (nom === "backoffice.jsx") continue; // reglages internes, pas des coordonnees affichees
    const propre = src.replace(/^\s*\/\/.*$/gm, "");
    for (const m of propre.matchAll(motif)) {
      const adresse = m[0].slice(1, -1);
      // support@timat.app et les adresses du produit ne sont pas concernees.
      if (/timat/i.test(adresse)) continue;
      if (!ADMIN.test(adresse)) continue;
      signale("coordonnées", `${nom} contient une adresse d'administration ecrite en dur (${adresse}) : une coordonnee officielle fausse ne se voit pas, elle se recopie. Elle doit etre saisie par l'utilisatrice.`);
    }
  }
}

// --- aucun chemin absolu de machine dans le depot ---
//
// Un test importait « /home/user/timat/api/demande-publique.js » : le chemin
// absolu du bac a sable ou il avait ete ecrit. Il passait la, et NULLE PART
// ailleurs. Vercel deploie dans /vercel/path0 : la construction de production
// est tombee deux fois de suite, sur une erreur que rien en local ne pouvait
// montrer.
//
// C'est exactement ce que sources-app.mjs existe pour eviter. Un chemin se
// calcule depuis le fichier qui le lit — import.meta.url — ou depuis la racine
// du depot, jamais depuis la racine de la machine.
{
  // ON NE CHERCHE PAS TOUT CHEMIN ABSOLU. Un script de mise au point qui ecrit
  // son apercu dans /tmp est legitime : il ne tourne jamais en production, et
  // /tmp existe partout. Une premiere version signalait ces dix-neuf-la et
  // noyait le seul qui comptait.
  //
  // Le danger, c'est un chemin absolu qui DESIGNE LE DEPOT LUI-MEME : il porte
  // le nom du dossier sur la machine de celui qui l'a ecrit, et ce dossier
  // n'existe nulle part ailleurs.
  const nomDepot = path.basename(RACINE);
  const racines = new RegExp(
    "[\"'`](\\/(?:home|Users|root|var)\\/[^\"'`\\n]*\\/" + nomDepot + "\\/[^\"'`\\n]*|\\/vercel\\/path\\d[^\"'`\\n]*)[\"'`]", "g");
  const aVoir = [];
  const ignores = new Set(["node_modules", ".git", "dist", "documents", ".vercel", "public"]);
  const parcourir = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignores.has(e.name)) continue;
      const complet = path.join(dir, e.name);
      if (e.isDirectory()) parcourir(complet);
      else if (/\.(jsx?|mjs|json)$/.test(e.name)) aVoir.push(complet);
    }
  };
  parcourir(RACINE);
  for (const f of aVoir) {
    if (path.resolve(f) === path.resolve(new URL(import.meta.url).pathname)) continue;
    const src = readFileSync(f, "utf8").replace(/^\s*\/\/.*$/gm, "");
    for (const m of src.matchAll(racines)) {
      // Les chemins de navigateur pre-installe sont fournis par l'environnement
      // d'execution, pas par le depot : ils sont attendus.
      if (/pw-browsers|chrome-linux|playwright/.test(m[1])) continue;
      signale("chemins", `${path.relative(RACINE, f)} contient un chemin absolu de machine (${m[1].slice(0, 60)}) : il ne vaut que sur l'ordinateur ou il a ete ecrit, et la construction de production tombera dessus.`);
    }
  }
}

// --- une seule adresse de contact dans tout le depot ---
//
// « support@timat.app » etait ecrite en dur a vingt-huit endroits : pages
// legales, mentions RGPD, messages d'erreur, reponses des fonctions serveur.
// Le back-office avait bien un champ « Email de contact », mais il n'alimentait
// qu'une ligne — le pied de page. On pouvait donc changer l'adresse dans les
// reglages et ne rien voir changer sur le site. C'est arrive.
//
// Une adresse de contact fausse ou morte n'est pas un detail cosmetique : les
// pages RGPD promettent une reponse sous trente jours a cette adresse. Elle
// doit venir de data/coordonnees.js, et de nulle part ailleurs.
{
  const source = readFileSync(new URL("../data/coordonnees.js", import.meta.url), "utf8");
  const attendue = (source.match(/EMAIL_CONTACT\s*=\s*["']([^"']+)["']/) || [])[1];
  if (!attendue) {
    signale("contact", "data/coordonnees.js n'exporte plus EMAIL_CONTACT : le point de passage unique de l'adresse de contact a disparu.");
  } else {
    const aVoir = [];
    const ignores = new Set(["node_modules", ".git", "dist", ".vercel", "documents"]);
    const parcourir = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ignores.has(e.name)) continue;
        const complet = path.join(dir, e.name);
        if (e.isDirectory()) parcourir(complet);
        else if (/\.(jsx?|mjs|html|md)$/.test(e.name)) aVoir.push(complet);
      }
    };
    parcourir(RACINE);
    // CE QUE L'ON CHERCHE : une adresse de contact DE TIMAT ecrite en dur.
    //
    // Toute adresse @timat.app en est une par construction — c'est le domaine
    // du produit. Un gmail quelconque, non : camille.moreau@gmail.com dans un
    // jeu de demonstration n'engage personne. Le seul gmail qui compte est
    // l'adresse de contact elle-meme, justement parce qu'elle doit venir du
    // point unique et de nulle part ailleurs.
    const motif = new RegExp("[\\w.+-]+@timat\\.app|" + attendue.replace(/[.+]/g, "\\$&"), "g");
    for (const f of aVoir) {
      const rel = path.relative(RACINE, f);
      if (rel === "data/coordonnees.js") continue;
      if (rel === "scripts/audit.mjs") continue;
      const src = readFileSync(f, "utf8").replace(/^\s*(?:\/\/|#).*$/gm, "");
      for (const m of src.matchAll(motif)) {
        const adresse = m[0];
        if (adresse.startsWith("noreply@")) continue;
        // Les adresses ILLUSTRATIVES — l'astuce sur les points dans Gmail, le
        // jeu de demonstration, les exemples de saisie — ne sont pas des
        // coordonnees : personne n'est cense leur ecrire.
        if (/^(prenom\.?nom|marie\.dupont|exemple|nom\.prenom)@/.test(adresse)) continue;
        // Les fichiers statiques et la documentation ne peuvent pas importer :
        // on exige alors qu'ils portent EXACTEMENT l'adresse du point unique.
        const statique = /\.(html|md)$/.test(rel);
        if (statique && adresse === attendue) continue;
        signale("contact", statique
          ? `${rel} affiche ${adresse}, mais l'adresse de contact est ${attendue} (data/coordonnees.js). Un fichier statique ne peut pas importer : il doit porter la meme adresse, au caractere pres.`
          : `${rel} ecrit l'adresse ${adresse} en dur. Elle doit venir de data/coordonnees.js — sinon la changer dans les reglages ne change rien sur le site.`);
      }
    }
  }
}

// --- pas de superlative invérifiable sur les concurrents ---
//
// « Aucun concurrent ne propose cela » figurait sur l'ecran du recapitulatif
// mensuel, et « Aucun concurrent ne genere un bilan personnalise » sur celui
// du bilan. Les deux etaient faux : Pandi-Panda affiche un recapitulatif de
// fin de mois partage, et les transmissions quotidiennes sont la base du
// marche.
//
// Ce genre de phrase ne coute pas qu'en credibilite. Une utilisatrice la
// verifie en cinq minutes, un concurrent la releve, et l'article L121-1 du
// code de la consommation traite les allegations fausses sur un concurrent
// comme une pratique commerciale trompeuse.
//
// On peut dire ce que TiMat fait. On ne peut pas dire ce que TOUS les autres
// ne font pas : c'est indemontrable et cela vieillit mal.
{
  const sources = fichiersAppSrc().map((u) => [u.pathname.split("/").pop(), readFileSync(u, "utf8")]);
  const motif = /(aucun(e)?\s+(autre\s+)?(concurrent|application|logiciel|outil)[^.<>{}]{0,60}(ne\s|n['’])|seule?\s+(application|logiciel|outil)\s+(du\s+march|sur\s+le\s+march)|unique\s+sur\s+le\s+march|personne\s+d['’]autre\s+ne\s)/gi;
  for (const [nom, src] of sources) {
    // Les commentaires expliquent souvent POURQUOI la phrase a ete retiree :
    // les signaler ferait de l'explication une anomalie.
    const propre = src.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of propre.matchAll(motif)) {
      signale("concurrents", `${nom} affirme « ${m[0].trim().slice(0, 55)}… » : une superlative sur ce que les concurrents ne font pas est indemontrable, vieillit mal, et se verifie en cinq minutes.`);
    }
  }
}

// --- un seul expediteur, et il ne peut pas etre le gmail ---
//
// L'adresse de contact est un gmail. L'expediteur technique, lui, DOIT rester
// sur le domaine verifie : Resend refuse d'envoyer depuis gmail.com — erreur
// 403, « the gmail.com domain is not verified » — et personne ne peut verifier
// le domaine de Google. Ce n'est pas un choix de style, c'est un mur.
//
// Les deux adresses ont donc deux roles opposes, et il faut les tenir separees :
//   EMAIL_EXPEDITEUR  part du domaine verifie, ne recoit rien, personne ne lui ecrit ;
//   EMAIL_CONTACT     recoit vraiment, et c'est lui que porte « reply_to ».
//
// Cette barriere refuse un expediteur ecrit en dur : cinq endroits a corriger
// le jour ou le domaine change, c'est cinq occasions d'en oublier un.
{
  const source = readFileSync(new URL("../data/coordonnees.js", import.meta.url), "utf8");
  const expediteur = (source.match(/EMAIL_EXPEDITEUR\s*=\s*["']([^"']+)["']/) || [])[1];
  const contact = (source.match(/EMAIL_CONTACT\s*=\s*["']([^"']+)["']/) || [])[1];
  if (!expediteur) {
    signale("expediteur", "data/coordonnees.js n'exporte plus EMAIL_EXPEDITEUR.");
  } else {
    if (/@gmail\.com$/i.test(expediteur)) {
      signale("expediteur", `EMAIL_EXPEDITEUR vaut ${expediteur} : Resend refuse d'envoyer depuis gmail.com (403, domaine non verifiable). Aucun courriel ne partirait.`);
    }
    // CETTE REGLE A ETE CORRIGEE, et il faut dire pourquoi.
    //
    // La premiere version interdisait que les deux constantes soient
    // identiques. Elle avait ete ecrite en supposant que l'adresse de contact
    // resterait un gmail : dans ce monde-la, les confondre cassait l'envoi,
    // puisque Resend refuse gmail.com. Mais ce n'etait pas l'invariant reel —
    // c'en etait une consequence.
    //
    // L'INVARIANT REEL : l'expediteur doit etre sur un domaine qu'on peut
    // verifier chez Resend. Une fois l'adresse de contact passee sur
    // timat.app, les deux PEUVENT etre identiques, et c'est meme souhaitable :
    // un courriel auquel on repond naturellement vaut mieux qu'un noreply@
    // dont les reponses partent dans le vide.
    const MUTUALISE = /@(gmail|googlemail|outlook|hotmail|live|yahoo|orange|free|sfr|laposte|wanadoo)\./i;
    if (MUTUALISE.test(expediteur)) {
      signale("expediteur", `EMAIL_EXPEDITEUR vaut ${expediteur} : un domaine de courrier mutualise ne peut pas etre verifie chez Resend. Aucun courriel ne partirait.`);
    }
    // ON BALAIE AUSSI src/. Une premiere version ne regardait que api/, et
    // laissait passer « from: "TiMat <noreply@timat.app>" » ecrit en dur dans
    // App.jsx — l'application construit elle aussi des envois.
    const aVoir = [];
    for (const d of ["api", "src"]) {
      const dossier = path.join(RACINE, d);
      if (!fs.existsSync(dossier)) continue;
      for (const nom of fs.readdirSync(dossier)) {
        if (/\.(jsx?|mjs)$/.test(nom)) aVoir.push([d + "/" + nom, path.join(dossier, nom)]);
      }
    }
    for (const [nom, complet] of aVoir) {
      const src = readFileSync(complet, "utf8").replace(/^\s*\/\/.*$/gm, "");
      // Un « from: » qui porte une adresse litterale plutot que la constante.
      for (const m of src.matchAll(/\bfrom:\s*['"][^'"]*@[^'"]*['"]/g)) {
        signale("expediteur", `${nom} ecrit un expediteur en dur (${m[0].slice(0, 46)}…) : il doit venir de data/coordonnees.js.`);
      }
      // Un envoi Resend sans reply_to : noreply@ ne recoit pas, la reponse
      // du parent partirait dans le vide.
      if (/api\.resend\.com\/emails/.test(src) && !/reply_?[Tt]o/.test(src)) {
        signale("expediteur", `${nom} envoie un courriel sans reply_to : l'expediteur technique ne recoit rien, une reponse serait perdue.`);
      }
    }
  }
}

// --- aucune reponse de supabase jetee en silence ---
//
// LA BIBLIOTHEQUE SUPABASE NE LEVE PAS D'EXCEPTION. Elle RETOURNE { data,
// error }. Un « await supabase.auth.machin(...) » sans recuperer « error »
// n'echoue donc jamais visiblement : le code continue comme si tout allait
// bien, et l'ecran annonce un succes qui n'a pas eu lieu.
//
// Ce n'est pas theorique. Les deux ecrans de mot de passe oublie faisaient
// exactement cela, entoures d'un try/catch qui n'attrapait rien. Pendant ce
// temps l'expediteur SMTP configure cote Supabase ne livrait qu'a une seule
// adresse — celle du compte Resend — donc AUCUNE utilisatrice ne recevait son
// lien de reinitialisation, et l'application lui repondait « un lien vient
// d'être envoyé ». Le defaut a tenu parce que rien ne regardait le retour.
{
  const sources = fichiersAppSrc().map((u) => [u.pathname.split("/").pop(), readFileSync(u, "utf8")]);
  // Les appels d'authentification qui ECRIVENT ou DECLENCHENT quelque chose.
  // Une lecture comme getSession() ne merite pas la meme severite.
  const SENSIBLES = "resetPasswordForEmail|signUp|signInWithPassword|signInWithOtp|updateUser|verifyOtp|resend|setSession|exchangeCodeForSession";
  const motif = new RegExp("(^|[^.\\w])await\\s+supabase\\.auth\\.(" + SENSIBLES + ")\\s*\\(", "g");
  for (const [nom, src] of sources) {
    const propre = src.replace(/^\s*\/\/.*$/gm, "");
    const lignes = propre.split("\n");
    for (const m of propre.matchAll(motif)) {
      const debutLigne = propre.lastIndexOf("\n", m.index) + 1;
      const ligne = lignes[propre.slice(0, m.index).split("\n").length - 1] || "";
      // Le retour est-il recupere ? « const { error } = await … » ou
      // « const r = await … ». On regarde le debut de la ligne.
      const tete = propre.slice(debutLigne, m.index + m[0].length);
      if (/(const|let|var|return|=>)\s*[\s\S]{0,60}=\s*await\s*$|=\s*await\s+supabase\.auth\.\w+\s*\($/.test(tete)) continue;
      if (/^\s*(const|let|var|return)\b/.test(ligne)) continue;
      signale("supabase", `${nom} appelle supabase.auth.${m[2]}() sans lire le retour : la bibliotheque RETOURNE l'erreur au lieu de la lever, donc un echec passerait pour un succes.`);
    }
  }
}

// --- aucune ecriture en base jetee en silence ---
//
// Meme cause que la barriere « supabase » ci-dessus, mais sur les donnees du
// produit : « await supabase.from(...).insert(...) » sans recuperer le retour
// ne signale JAMAIS un echec. La ligne n'est pas ecrite, le code continue, et
// l'ecran affiche souvent une coche verte.
//
// Ce n'est pas theorique. Le change et le repas s'annoncaient « ajouté ✓ »
// AVANT meme d'essayer ; le calendrier vaccinal cochait un vaccin que la base
// refusait ; la case « déclaré » de Pajemploi basculait sur un catch
// explicitement silencieux ; et le profil d'inscription pouvait manquer, ce
// qui donne un compte sans role ni abonnement.
//
// LA REGLE : soit on lit « error », soit on ecrit noir sur blanc pourquoi on
// l'ignore, avec un commentaire « sans-retour : <raison> » juste au-dessus.
// Le silence par accident devient impossible ; le silence choisi reste
// possible, mais il se lit.
{
  const sources = fichiersAppSrc().map((u) => [u.pathname.split("/").pop(), readFileSync(u, "utf8")]);
  const ECRITURES = /\.(insert|update|upsert|delete)\s*\(/;
  for (const [nom, src] of sources) {
    const lignes = src.split("\n");
    for (let i = 0; i < lignes.length; i++) {
      const l = lignes[i];
      if (/^\s*\/\//.test(l)) continue;
      // L'ANGLE MORT DE LA PREMIERE VERSION : elle n'attrapait que les
      // « await supabase » en DEBUT de ligne. Six ecritures silencieuses lui
      // echappaient donc, toutes ecrites en une ligne compacte :
      //
      //   const supprimer=async(id)=>{await supabase.from("trajets").delete()...}
      //   if(ex){ await supabase.from("activites_faites").delete()... }
      //
      // dont la case « activite faite », qui se cochait meme quand rien ne
      // s'enregistrait. On cherche donc l'appel OU QU'IL SOIT dans la ligne, et
      // on regarde ce qui le precede : si la valeur est affectee (« =await »),
      // le retour est lu ; sinon il est jete.
      const pos = l.indexOf("await supabase");
      if (pos === -1) continue;
      const avantAppel = l.slice(0, pos).replace(/\s+$/, "");
      // Le retour est recupere quand l'appel est affecte, passe en argument, ou
      // place dans une branche de ternaire dont la valeur est affectee :
      //   const{error}=ex ? await supabase...delete() : await supabase...insert();
      // Sans « ? » et « : » ici, la regle signalait ce code — qui lit l'erreur.
      // Un « => await supabase... » reste signale : une fonction qui rend une
      // promesse que personne ne lit, c'est le meme silence.
      if (/(?:[=(,?:]|&&|\|\||\breturn)$/.test(avantAppel)) continue;
      if (!/supabase\s*\.\s*from\s*\(/.test(l.slice(pos))) continue;
      // L'appel peut tenir sur plusieurs lignes : on regarde la suite.
      const bloc5 = lignes.slice(i, i + 6).join("\n");
      if (!ECRITURES.test(bloc5)) continue;
      // Une justification explicite juste au-dessus vaut acceptation.
      const avant = lignes.slice(Math.max(0, i - 4), i).join("\n");
      if (/sans-retour\s*:/.test(avant)) continue;
      signale("ecritures", `${nom}:${i + 1} ecrit en base sans lire le retour. La bibliotheque RETOURNE l'erreur : un echec passerait inapercu et la donnee serait perdue. Lisez « error », ou justifiez avec « sans-retour : <raison> ».`);
    }
  }
}

// --- un arrondi dont les deux facteurs ne se correspondent pas ---
//
// Pour arrondir a deux decimales on ecrit « Math.round(x * 100) / 100 ». Le
// facteur du haut et le diviseur du bas doivent etre le MEME nombre : sinon
// l'arrondi ne corrige pas, il divise.
//
// Le kit de declaration CMG du parent portait exactement cela :
//
//     Math.round(entretien * heuresMois / heuresHebdo * 5) / 10
//
// Le « x5 » comptait les cinq jours de la semaine, et le « /10 » voulait
// arrondir a une decimale — il lui manquait son « x10 ». Le kit annoncait
// 8,50 EUR d'indemnite d'entretien par mois la ou 84,77 EUR etaient dus, avec
// un bouton « Copier » pour le recopier sur monenfant.fr.
//
// LA REGLE : dans « Math.round(...) / N », le facteur N doit apparaitre dans
// l'expression arrondie. Si la division par N n'est pas un arrondi mais un vrai
// calcul, on l'ecrit hors du Math.round, ou on le justifie par un commentaire
// « division-voulue : <raison> » juste au-dessus.
{
  // On compte les parentheses au lieu de s'arreter a la premiere fermante :
  // « Math.round(nbf(x)) / 10 » contient un appel imbrique, et une expression
  // reguliere naive lit alors « nbf(x » comme le corps de l'arrondi. Premiere
  // version de cette regle, elle signalait ainsi quatre calculs parfaitement
  // justes — dont celui que je venais d'ecrire deux lignes plus haut.
  const corpsDeLArrondi = (ligne, debut) => {
    let prof = 0;
    for (let k = debut; k < ligne.length; k++) {
      if (ligne[k] === "(") prof++;
      else if (ligne[k] === ")") { prof--; if (prof === 0) return { corps: ligne.slice(debut + 1, k), apres: ligne.slice(k + 1) }; }
    }
    return null;
  };
  for (const u of fichiersAppSrc()) {
    const nom = u.pathname.split("/").pop();
    const lignes = readFileSync(u, "utf8").split("\n");
    for (let i = 0; i < lignes.length; i++) {
      const ligne = lignes[i];
      if (/^\s*\/\//.test(ligne)) continue;
      for (let j = ligne.indexOf("Math.round("); j !== -1; j = ligne.indexOf("Math.round(", j + 1)) {
        const bloc = corpsDeLArrondi(ligne, j + "Math.round".length);
        if (!bloc) continue;
        const suite = /^\s*\/\s*(\d+)/.exec(bloc.apres);
        if (!suite) continue;
        const div = suite[1];
        if (Number(div) === 1) continue;
        // LE DISCRIMINANT : le facteur du haut doit etre un MULTIPLE du
        // diviseur. « * 1000 ) / 10 » garde un facteur 100 : c'est un
        // pourcentage arrondi a une decimale, parfaitement voulu. « * 5 ) / 10 »
        // garde un facteur 0,5 : l'arrondi divise le resultat par deux, et le
        // kit CMG le divisait par dix sur le meme principe. Un facteur entier
        // est un changement d'echelle choisi ; un facteur fractionnaire est un
        // arrondi casse.
        const facteurs = [...bloc.corps.matchAll(/\*\s*(\d+)/g)].map((x) => Number(x[1]));
        if (facteurs.some((n) => n % Number(div) === 0)) continue;
        const avant = lignes.slice(Math.max(0, i - 3), i).join("\n");
        if (/division-voulue\s*:/.test(avant)) continue;
        signale("arrondi", `${nom}:${i + 1} « Math.round(…) / ${div} » sans « * ${div} » dans l'expression : ce n'est pas un arrondi, c'est une division par ${div}. C'est ainsi que le kit CMG annonçait une indemnité dix fois trop petite. Sortez la division du Math.round, ou justifiez-la par « division-voulue : <raison> ».`);
      }
    }
  }
}

// --- un bouton qui ecrit ne se clique pas deux fois ---
//
// Un bouton qui ne repond pas tout de suite est appuye une seconde fois. C'est
// le reflexe de n'importe qui, et c'est ce que provoque le reseau d'un
// telephone dans une voiture. Seize boutons qui ecrivaient en base restaient
// cliquables pendant l'ecriture.
//
// scripts/verif-double-clic.mjs le montre dans un vrai navigateur : deux appuis
// a 80 ms sur « Enregistrer l'activite » inscrivaient DEUX activites. Deux
// siestes, deux allergies, deux demandes de modification de contrat, deux
// courriels de reinitialisation.
//
// LA REGLE : un bouton dont le onClick appelle un gestionnaire qui ecrit en
// base doit, soit passer par uneFois(), soit porter son propre « disabled »
// (celui qui change aussi de libelle, ce qui vaut mieux : il dit ce qu'il fait).
{
  const ECRIT = /\.(insert|update|upsert|delete)\s*\(|\.rpc\s*\(/;
  for (const u of fichiersAppSrc()) {
    const nom = u.pathname.split("/").pop();
    const src = readFileSync(u, "utf8");
    const lignes = src.split("\n");
    // Les gestionnaires asynchrones qui ecrivent en base.
    const ecrivains = new Set();
    for (const m of src.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*async\s*\(/g)) {
      const i = src.slice(0, m.index).split("\n").length - 1;
      if (ECRIT.test(lignes.slice(i, i + 45).join("\n"))) ecrivains.add(m[1]);
    }
    for (let i = 0; i < lignes.length; i++) {
      const m = /onClick=\{\s*([A-Za-z_$][\w$]*)\s*\}/.exec(lignes[i]);
      if (!m || !ecrivains.has(m[1])) continue;
      // La balise <button> peut tenir sur plusieurs lignes : on remonte.
      let deb = i;
      while (deb > 0 && !/<button/.test(lignes[deb]) && i - deb < 6) deb--;
      const balise = lignes.slice(deb, i + 3).join("\n");
      if (/disabled/.test(balise)) continue;
      signale("double-clic", `${nom}:${i + 1} « onClick={${m[1]}} » ecrit en base et le bouton reste cliquable pendant l'ecriture : un second appui cree un doublon. Passez par uneFois(${m[1]}), ou desactivez le bouton pendant l'operation.`);
    }
  }
}

// --- une ligne relue apres ecriture peut etre nulle ---
//
// « .insert(...).select().single() » ne garantit PAS qu'on recupere la ligne.
// Une politique RLS autorise tres souvent l'ecriture sans autoriser la lecture
// de ce qu'on vient d'ecrire : PostgREST accepte l'insertion et ne renvoie
// rien. Supabase rend alors data=null ET error=null — le cas qu'aucun code ne
// voit venir, parce qu'on verifie « error » et qu'on s'arrete la.
//
// Le parcours des formulaires l'a attrape en vrai sur le cahier de reussites :
// « Cannot read properties of null (reading 'enfant_id') ». Le null etait
// pousse dans la liste, l'ecran entier plantait au rendu suivant, et l'activite
// paraissait perdue alors qu'elle etait bien enregistree. Le meme motif se
// trouvait dans les deux assistants de creation d'enfant, juste avant la ligne
// qui lit « enfantData.id » pour y rattacher le contrat.
//
// LA REGLE : apres un .single(), la variable qui porte la ligne doit etre
// testee (« if(!data) », « data?.x », « ins?.id »...) avant d'etre utilisee.
{
  const sources = fichiersAppSrc().map((u) => [u.pathname.split("/").pop(), readFileSync(u, "utf8")]);
  for (const [nom, src] of sources) {
    const lignes = src.split("\n");
    for (let i = 0; i < lignes.length; i++) {
      if (!/\.single\(\)/.test(lignes[i])) continue;
      // Le nom sous lequel la ligne est recuperee, dans les cinq lignes qui
      // precedent : « const{data,error}= », « const{data:ins,...}= », « res= ».
      const entete = lignes.slice(Math.max(0, i - 5), i + 1).join("\n");
      const m = entete.match(/\{\s*data\s*:\s*([A-Za-z_$][\w$]*)/) || entete.match(/\{\s*(data)\b/);
      const nomVar = m ? m[1] : (/(^|\s)(res)\s*=/.test(entete) ? "res.data" : null);
      if (!nomVar) continue;
      // La suite immediate doit contenir un test de nullite sur cette variable.
      const suite = lignes.slice(i, i + 14).join("\n");
      const base = nomVar.replace(".data", "");
      const teste = new RegExp(
        "(!\\s*" + base + "\\b)|(" + base + "\\s*\\?\\.)|(if\\s*\\(\\s*" + base + "\\b)|(" + base + "\\s*(===|!==|==|!=)\\s*null)"
      );
      if (teste.test(suite)) continue;
      // La variable doit vraiment etre utilisee ensuite, sinon il n'y a rien a
      // proteger : un .single() dont on ne lit que « error » est legitime.
      const utilisee = new RegExp("\\b" + base.replace("$", "\\$") + "\\b");
      if (!utilisee.test(lignes.slice(i + 1, i + 14).join("\n"))) continue;
      signale("relecture", `${nom}:${i + 1} utilise « ${nomVar} » apres un .single() sans verifier qu'il n'est pas null. Une ecriture acceptee sans droit de relecture rend data=null ET error=null : le null part dans l'etat de React et l'ecran plante au rendu suivant.`);
    }
  }
}

// --- aucune lecture d'argent ou de droit jetee en silence ---
//
// LE MIROIR EXACT DE LA BARRIERE « ecritures ». Une lecture qui echoue rend
// « data » a null, et le code qui suit ecrit presque toujours « (data||[]) ».
// Resultat : zero heure, zero euro, liste vide — une PANNE qui se lit comme
// une ABSENCE DE DONNEE. L'utilisatrice cherche un probleme de pointage qui
// n'existe pas, ou pire, remet au parent un document a zero.
//
// C'est arrive : l'attestation fiscale et le rapport annuel calculaient
// « (pts||[]).reduce » sans jamais regarder l'erreur. Une annee entiere de
// travail pouvait s'afficher a 0 h et 0 €.
//
// LA PORTEE EST VOLONTAIREMENT ETROITE. On n'exige pas cela de toute lecture :
// une liste d'activites rechargee a chaque ouverture ne coute rien. On l'exige
// des tables qui portent de l'argent ou du droit, celles dont un zero faux se
// retrouve sur un document remis a quelqu'un ou reporte sur une declaration.
//
// LA REGLE, la meme que pour les ecritures : soit on lit « error », soit on
// ecrit pourquoi on l'ignore avec « sans-retour : <raison> ».
{
  // LA PORTEE S'EST ELARGIE, et il faut dire pourquoi. Elle couvrait d'abord
  // l'argent et le droit. Deux ecrans ont montre pire qu'un chiffre faux : la
  // fiche d'urgence et le projet d'accueil repartaient d'un FORMULAIRE VIDE
  // quand leur lecture echouait — et le premier enregistrement ECRASAIT les
  // donnees existantes. Une lecture ratee ne coutait plus un affichage, elle
  // coutait le document lui-meme.
  //
  // Toute table dont l'ecran propose ensuite de SAISIR ce qu'il n'a pas pu
  // lire est donc concernee.
  const SENSIBLES = /from\(\s*["'](pointages|versements|bulletins|contrats|absences|historique_mois|enfants|fiche_urgence|projet_accueil|bilans|transmissions|evenements|trajets|medicaments|autorisations|demandes)["']\s*\)/;
  const sources = fichiersAppSrc().map((u) => [u.pathname.split("/").pop(), readFileSync(u, "utf8")]);
  for (const [nom, src] of sources) {
    const lignes = src.split("\n");
    for (let i = 0; i < lignes.length; i++) {
      const l = lignes[i];
      if (!/await\s+supabase\s*\.\s*from\s*\(/.test(l)) continue;
      if (!SENSIBLES.test(l)) continue;
      // LA FENETRE S'ARRETE A LA FIN DE L'INSTRUCTION. Une fenetre fixe de six
      // lignes debordait sur la requete suivante : en retirant « error » d'une
      // lecture, le controle voyait le « error » de sa voisine et se taisait.
      // C'est ce qui a fait echouer la premiere preuve.
      let fin = i;
      while (fin < lignes.length && fin < i + 8 && !/;\s*$/.test(lignes[fin])) fin++;
      const suite = lignes.slice(i, fin + 1).join("\n");
      if (/\.(insert|update|upsert|delete)\s*\(/.test(suite)) continue;
      // L'ERREUR EST-ELLE REGARDEE ? Deux ecritures legitimes, et il faut les
      // distinguer precisement — elargir bêtement la fenetre faisait passer la
      // barriere a cote du vrai bug, parce qu'elle voyait le « error » de la
      // requete VOISINE.
      //
      //   1. destructuration : « const { data, error: eX } = await … »
      //      l'erreur doit alors apparaitre DANS l'instruction elle-meme ;
      //   2. resultat stocke : « const r = await … ; if (r.error) throw … »
      //      l'erreur est testee juste apres, sur CETTE variable-la.
      if (/^\s*(const|let|var)\s*\{/.test(l)) {
        if (/\berror\b/.test(suite)) continue;
      } else {
        const nom_var = (l.match(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/) || [])[1];
        if (nom_var) {
          const apres = lignes.slice(fin + 1, fin + 4).join("\n");
          if (new RegExp("\\b" + nom_var + "\\.error\\b").test(apres)) continue;
        }
        if (/\berror\b/.test(suite)) continue;
      }
      const avant = lignes.slice(Math.max(0, i - 4), i).join("\n");
      if (/sans-retour\s*:/.test(avant)) continue;
      signale("lectures", `${nom}:${i + 1} lit ${(l.match(SENSIBLES) || [])[1]} sans regarder l'erreur. Une panne rendrait « data » a null, et le « (data||[]) » qui suit afficherait zero — une panne qui se lit comme une absence de donnee. Lisez « error », ou justifiez avec « sans-retour : <raison> ».`);
    }
  }
}

// --- aucune operation de stockage jetee en silence ---
//
// Troisieme membre de la meme famille, apres « ecritures » et « lectures ».
// Le stockage garde les photos des enfants, les contrats signes, les bulletins
// et les documents partages. Un « await supabase.storage…upload() » dont on ne
// lit pas le retour rend la main comme si tout s'etait bien passe.
//
// Deux cas reels l'ont montre : la suppression RGPD laissait des fichiers en
// place alors que la politique promet leur effacement, et une signature de
// liens ratee affichait « aucune photo » a une assistante maternelle dont les
// photos etaient pourtant bien la.
//
// Meme regle que les deux autres : lire « error », ou ecrire pourquoi on
// l'ignore avec « sans-retour : <raison> ».
{
  const sources = fichiersAppSrc().map((u) => [u.pathname.split("/").pop(), readFileSync(u, "utf8")]);
  for (const [nom, src] of sources) {
    const lignes = src.split("\n");
    for (let i = 0; i < lignes.length; i++) {
      if (!/await\s+supabase\s*\.\s*storage\s*\./.test(lignes[i])) continue;
      let fin = i;
      while (fin < lignes.length && fin < i + 8 && !/;\s*$/.test(lignes[fin])) fin++;
      const bloc = lignes.slice(i, fin + 1).join("\n");
      if (/\berror\b/.test(bloc)) continue;
      const nom_var = (lignes[i].match(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/) || [])[1];
      if (nom_var && new RegExp("\\b" + nom_var + "\\.error\\b").test(lignes.slice(fin + 1, fin + 4).join("\n"))) continue;
      const avant = lignes.slice(Math.max(0, i - 4), i).join("\n");
      if (/sans-retour\s*:/.test(avant)) continue;
      signale("stockage", `${nom}:${i + 1} appelle le stockage sans lire le retour. Un televersement ou une suppression qui echoue rendrait la main comme si tout allait bien — le fichier manquerait, ou survivrait a une suppression promise.`);
    }
  }
}

// --- un seul h1, et aucun texte ecrit pour les moteurs seuls ---
//
// index.html portait DEUX <h1> : celui du hero peint avant React, et un second
// dans un bloc « seo-fallback » cache aux visiteurs par
// « position:absolute;width:1px;height:1px;clip:rect(0 0 0 0) ». Les deux
// disaient d'ailleurs autre chose l'un que l'autre.
//
// Deux fautes distinctes. Une page ne porte qu'un h1 — au-dela, le moteur ne
// sait plus quel est le sujet. Et du texte present pour le robot mais invisible
// pour l'humain est traite par les consignes de Google comme une technique de
// spam : le motif « 1px + clip » est legitime pour un lecteur d'ecran, pas pour
// un bloc de mots-cles.
//
// Le bloc ne manquait a personne : ses liens etaient tous declares dans les
// sitemaps, et les articles sont de vraies pages statiques.
{
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8")
    // Les commentaires expliquent souvent POURQUOI quelque chose a ete retire.
    // Les compter ferait de l'explication une anomalie.
    .replace(/<!--[\s\S]*?-->/g, "");
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) {
    signale("titres", `index.html contient ${h1} balise(s) h1 au lieu d'une seule. Au-dela d'un titre principal, le moteur ne sait plus quel est le sujet de la page.`);
  }
  // Un bloc cache qui porte du texte destine aux moteurs. On cherche le motif
  // de dissimulation, pas le nom du bloc : le renommer ne doit rien changer.
  const DISSIMULE = /(clip\s*:\s*rect\(\s*0[\s,]|width\s*:\s*1px\s*;\s*height\s*:\s*1px|text-indent\s*:\s*-\d{4}|display\s*:\s*none)/i;
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    for (const regle of m[1].split("}")) {
      if (!DISSIMULE.test(regle)) continue;
      // Une regle de dissimulation n'est un probleme que si le bloc qu'elle
      // vise porte un titre ou un paragraphe — pas pour un helper generique.
      const cible = (regle.match(/#([\w-]+)/) || [])[1];
      if (!cible) continue;
      const bloc = html.match(new RegExp('id="' + cible + '"[\\s\\S]{0,1500}'));
      if (bloc && /<h[1-6][\s>]|<p[\s>]/.test(bloc[0])) {
        signale("titres", `index.html cache le bloc « #${cible} » aux visiteurs alors qu'il contient du texte. Un contenu present pour le robot et invisible pour l'humain est traite comme une technique de spam.`);
      }
    }
  }
}

// --- la cle de maintenance ne se distribue pas en clair ---
//
// public/acces.html existait : une page servie publiquement, qui posait le
// cookie d'acces et redirigeait vers l'application, avec la cle ecrite en
// clair dans son source. N'importe qui tombant sur ce nom de fichier — l'un
// des plus devinables qui soit — franchissait le mode maintenance sans rien
// savoir du code. Elle n'etait referencee nulle part : une commodite oubliee.
//
// CE QUE CETTE BARRIERE NE PRETEND PAS. Le mode maintenance reste un RIDEAU,
// pas une serrure : la cle est compilee dans le bundle JavaScript, donc elle
// part chez chaque visiteur. Qui lit le source la trouve. On empeche ici la
// decouverte triviale, on ne cree pas un secret.
//
// Un vrai verrou se poserait cote serveur — un middleware qui refuse la page
// avant de la servir. C'est un autre chantier, et il doit etre decide, pas
// improvise.
{
  const cle = (readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8")
    .match(/MAINTENANCE_CLE\s*=\s*["']([^"']+)["']/) || [])[1];
  if (cle) {
    const dossier = path.join(RACINE, "public");
    const parcourir = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const complet = path.join(dir, e.name);
        if (e.isDirectory()) { parcourir(complet); continue; }
        if (!/\.(html|js|json|txt)$/.test(e.name)) continue;
        if (readFileSync(complet, "utf8").includes(cle)) {
          signale("acces", `${path.relative(RACINE, complet)} contient la cle de maintenance en clair. Ce fichier est servi publiquement : n'importe qui tombant sur son nom franchirait le mode maintenance sans lire une ligne de code.`);
        }
      }
    };
    parcourir(dossier);
  }
}

// --- reglages : un interrupteur du back-office doit commander quelque chose ---
//
// Le back-office a longtemps affiche cinq « modules activables » (parrainage,
// forum, PMI, periscolaire, rappels vaccins). Ils s'enregistraient bien en
// base — et l'application ne les lisait nulle part. Basculer l'interrupteur ne
// changeait rien, et rien ne le disait. C'est la meme famille de defaut que les
// promesses ecrites qu'on ne tient pas : l'interface affirme un pouvoir qu'elle
// n'a pas.
//
// La regle : toute cle de configuration qu'un ecran d'administration propose de
// modifier doit etre lue ailleurs que dans sa propre definition.
{
  const bo = readFileSync(new URL("../src/backoffice.jsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  // Les cles que le back-office ecrit : setCfg(c=>({...c, <cle>: ...}))
  const ecrites = new Set();
  for (const m of bo.matchAll(/setCfg\(\s*c\s*=>\s*\(\{\s*\.\.\.c\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g)) ecrites.add(m[1]);
  for (const cle of ecrites) {
    // Une lecture reelle : config.<cle> ou cfg.<cle> hors du back-office et hors
    // de DEFAULT_CONFIG / de la fusion qui la recopie.
    // Une lecture reelle : un acces pointe « quelquechose.<cle> » ailleurs que
    // dans la definition de DEFAULT_CONFIG et que la fusion qui la recopie.
    const lues = app.split("\n").filter(l =>
      new RegExp(`\\.\\s*${cle}\\b`).test(l)
      && !/\.\.\.DEFAULT_CONFIG/.test(l));
    if (!lues.length) {
      signale("reglages", `le back-office propose de modifier « ${cle} », mais l'application ne lit cette valeur nulle part : l'interrupteur s'enregistre et ne commande rien.`);
    }
  }
}

// --- les documents legaux ne changent pas en silence ---
//
// Les trois documents affichaient « Derniere mise a jour » calcule avec
// new Date() : ils se declaraient modifies tous les jours, sans que rien ne
// change. Une date qui bouge toute seule ne dit plus rien — et c'est
// exactement ce qu'un utilisateur regarde pour savoir si le contrat qu'il a
// accepte a ete modifie.
//
// La date est desormais ecrite a la main. Cette barriere empeche le mensonge
// inverse : un texte modifie sans que la date bouge.
{
  const { empreinte } = await import(new URL("./empreinte-legale.mjs", import.meta.url));
  const declaree = (readFileSync(new URL("../data/documents-legaux.js", import.meta.url), "utf8")
    .match(/EMPREINTE_DOCUMENTS_LEGAUX = "([^"]*)"/) || [])[1];
  const reelle = empreinte();
  if (declaree !== reelle) {
    signale("legal", `le texte des documents legaux a change sans que la date de mise a jour le dise. Corrigez MAJ_DOCUMENTS_LEGAUX dans data/documents-legaux.js, puis lancez « node scripts/empreinte-legale.mjs --ecrire ».`);
  }
  // Une date de mise a jour posterieure a aujourd'hui serait fausse elle aussi.
  const maj = (readFileSync(new URL("../data/documents-legaux.js", import.meta.url), "utf8")
    .match(/MAJ_DOCUMENTS_LEGAUX = "([^"]*)"/) || [])[1];
  if (maj > new Date().toISOString().slice(0, 10))
    signale("legal", `la date de mise a jour des documents legaux (${maj}) est dans le futur`);
}

// --- les informations legales obligatoires sont-elles renseignees ? ---
//
// La loi n° 2004-575 (LCEN) impose de publier l'identite de l'editeur, son
// adresse et son numero d'immatriculation. L'ecran des mentions legales
// affichait des gabarits — « [Numero SIRET] » — et son bouton
// « Sauvegarder » n'ecrivait nulle part. Cette barriere ne peut pas verifier
// le contenu de la base, mais elle peut interdire le retour des gabarits.
{
  // Les commentaires sont exclus : expliquer pourquoi un gabarit a ete retire
  // ne doit pas compter comme un gabarit publie. Une barriere qui se declenche
  // sur son propre mode d'emploi apprend a etre ignoree.
  const textes = ["../src/App.jsx", "../src/ecrans-app.jsx"]
    .map((f) => readFileSync(new URL(f, import.meta.url), "utf8"))
    .join("\n")
    .split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  // « Île-de-France, France » n'est pas un gabarit partout : c'est le lieu
  // affiche en pied de page, et c'est legitime. Ce n'en est un que dans
  // legal.adresse, ou la LCEN attend une adresse et pas une region. La
  // verification est donc portee sur ce bloc-la seulement.
  {
    const legal = (textes.match(/legal:\s*\{[\s\S]{0,400}?\}/) || [""])[0];
    const adresse = (legal.match(/adresse:\s*"([^"]*)"/) || [])[1];
    if (adresse && !/\d/.test(adresse))
      signale("legal", `legal.adresse vaut « ${adresse} » : la LCEN attend une adresse, pas une region`);
  }
  for (const gabarit of ["[Numéro SIRET]", "[Votre prénom et nom]", "[Adresse complète",
                         "[Téléphone professionnel]", "[Votre nom]", "[Votre SIRET]"])
    if (textes.includes(gabarit))
      signale("legal", `le gabarit « ${gabarit} » est encore publie dans les mentions legales`);
}


// --- un chiffre annonce doit etre le vrai chiffre ---
//
// La landing annoncait « 28 guides pratiques » alors que le blog en comptait
// 60. Personne ne ment en ecrivant 28 : le chiffre a simplement ete juste un
// jour, puis le blog a grossi. C'est la forme la plus commune de fausse
// promesse, et la plus facile a eviter — il suffit de la compter.
{
  const dossier = new URL("../public/blog/", import.meta.url);
  if (fs.existsSync(dossier)) {
    const reels = fs.readdirSync(dossier, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== "rubrique").length;
    // Le compte est annonce a DEUX endroits : la landing (src/App.jsx) et le
    // sommaire pre-affiche d'index.html, lu par les moteurs. Le second l'ecrivait
    // en toutes lettres — « Soixante-et-un guides » — et echappait donc a un
    // controle qui cherchait des chiffres. Un nombre ecrit en lettres vieillit
    // comme les autres : on l'interdit plutot que d'essayer de le lire.
    const indexSrc = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
    for (const [ou, src] of [["la landing", appSrc], ["index.html", indexSrc]]) {
      const annonce = Number((src.match(/(\d+)\s+guides pratiques/) || [])[1]);
      if (annonce && reels && annonce !== reels)
        signale("chiffres", `${ou} annonce « ${annonce} guides pratiques » alors que le blog en compte ${reels}`);
      // « Soixante-deux » ne finit par aucun suffixe utile : on reconnait donc le
      // NOMBRE ECRIT EN LETTRES par ses mots, composes ou non.
      const CHIFFRE_EN_LETTRES = /\b(?:un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent|mille)(?:[- ](?:et[- ])?(?:un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent|mille|s))*\s+guides pratiques/i;
      if (CHIFFRE_EN_LETTRES.test(src))
        signale("chiffres", `${ou} écrit le nombre de guides en toutes lettres : il échappe au comptage et vieillit sans qu'on le voie`);
    }
  }
}

// --- l'adresse de l'hebergeur ne s'ecrit qu'a un endroit ---
//
// Deux adresses differentes de Vercel coexistaient, l'une sur la landing,
// l'autre dans l'application. Les deux ne peuvent pas etre vraies, et la LCEN
// impose de publier celle de l'hebergeur. Une valeur recopiee finit toujours
// par diverger : elle vit desormais dans data/coordonnees.js, et plus nulle
// part ailleurs.
{
  const fichiers = ["../src/App.jsx", "../src/ecrans-app.jsx", "../src/ecrans-secondaires.jsx"];
  for (const f of fichiers) {
    const t = readFileSync(new URL(f, import.meta.url), "utf8")
      .split("\n").filter((l) => !/^\s*(\/\/|\*)/.test(l)).join("\n");
    for (const m of t.matchAll(/Vercel Inc\.?,?\s*—?\s*\d+\s+[NS]?\s*[A-Z][a-z]+/g))
      signale("hébergeur", `${f.replace("../", "")} ecrit une adresse de Vercel en dur (« ${m[0]} ») : elle doit venir de HEBERGEUR_WEB, dans data/coordonnees.js`);
  }
}

// --- le sommaire du HTML brut dit la meme chose que la page ---
//
// Le HTML brut de la page d'accueil comptait 370 caracteres et aucun titre de
// niveau 2 : c'est tout ce que voit un robot qui n'execute pas JavaScript.
// React, lui, en affiche 10 600 et neuf titres. Un sommaire visible reprend
// donc ces titres dans index.html.
//
// Le risque de ce genre de bloc est connu : il finit par annoncer autre chose
// que ce que la page montre — et devient alors du referencement trompeur. La
// regle est donc simple et verifiee ici : chaque titre du sommaire doit exister
// mot pour mot dans la configuration de la landing.
{
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const titres = [...html.matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => m[1].trim());
  if (!titres.length) {
    signale("sommaire", "index.html ne porte plus aucun titre de niveau 2 : le HTML brut redevient quasi vide pour les robots qui n'executent pas JavaScript");
  }
  for (const t of titres) {
    // Les entites HTML de l'un ne sont pas celles de l'autre.
    // Le titre affiche par React peut etre coupe par de la mise en forme
    // (« <span> » de couleur, retour a la ligne). Comparer la chaine entiere
    // signalerait a tort ces titres-la. On exige donc que ses quatre premiers
    // mots se suivent dans le source : assez pour reconnaitre le titre, assez
    // souple pour tolerer un balisage au milieu.
    const clair = t.replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
    const debut = clair.split(/\s+/).slice(0, 4).join(" ");
    if (!appSrc.includes(clair) && !appSrc.includes(debut))
      signale("sommaire", `le sommaire de index.html annonce « ${clair.slice(0, 60)} », introuvable dans la configuration de la landing : les deux versions disent des choses differentes`);
  }
  // Un bloc masque serait du referencement trompeur, et c'est precisement ce
  // qui avait ete retire de cette page.
  const bloc = (html.match(/id="timat-sommaire"[\s\S]{0,400}?>/) || [""])[0];
  const style = (html.match(/#timat-sommaire\s*\{[^}]*\}/) || [""])[0];
  if (/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0|height\s*:\s*0|position\s*:\s*absolute/.test(bloc + style))
    signale("sommaire", "le sommaire de index.html est masque : un texte ecrit pour les moteurs et cache aux visiteurs est du referencement trompeur");
}

// --- un onglet et l'ecran qu'il ouvre portent le meme nom ---
//
// L'onglet disait « Semaine type », l'ecran qu'il ouvrait « Planning
// periscolaire ». On clique sur l'un et on arrive sur l'autre : c'est la
// premiere raison pour laquelle cet ecran etait incomprehensible, avant meme
// son contenu. Personne ne s'en apercoit en relisant le code, parce que les
// deux noms vivent dans deux fichiers differents.
{
  const vues = readFileSync(new URL("../src/ecrans-app.jsx", import.meta.url), "utf8");
  const ecrans = readFileSync(new URL("../src/ecrans-secondaires.jsx", import.meta.url), "utf8")
    + readFileSync(new URL("../src/ecrans-quotidien.jsx", import.meta.url), "utf8")
    + vues;
  // Les onglets d'une barre segmentee, et le titre de l'ecran qu'ils ouvrent.
  const PAIRES = [
    ["Planning périscolaire", "PlanningPeriscolaire"],
    ["Registre des médicaments", "RegistreMedicaments"],
    ["Projet d'accueil", "ProjetAccueil"],
  ];
  for (const [libelle, composant] of PAIRES) {
    if (!vues.includes(`l:"${libelle}"`)) {
      signale("intitulés", `aucun onglet ne s'appelle « ${libelle} » : le libellé a changé d'un côté seulement`);
      continue;
    }
    const i = ecrans.indexOf(`export function ${composant}(`);
    if (i < 0) continue;
    const suivant = ecrans.indexOf("\nexport function ", i + 10);
    const corps = ecrans.slice(i, suivant < 0 ? ecrans.length : suivant);
    const titre = (corps.match(/<PageHeader[^>]*title="([^"]+)"/) || [])[1];
    if (titre && titre !== libelle)
      signale("intitulés", `l'onglet « ${libelle} » ouvre un écran intitulé « ${titre} » : on clique sur l'un et on arrive sur l'autre`);
  }
}

// --- aucun faux avis de consommateur ---
//
// Quatre temoignages etaient ecrits en dur dans DEFAULT_CONFIG — « Marie D.,
// Paris 15e », cinq etoiles — et s'affichaient sur la page publique alors que
// l'application n'a aucune utilisatrice. L'article L. 121-4 du code de la
// consommation repute trompeuse « en toutes circonstances » la diffusion de
// faux avis de consommateurs : deux ans d'emprisonnement et 300 000 EUR
// d'amende, et la DGCCRF peut sanctionner sans passer par le juge.
//
// Les vrais avis viendront du back-office. Ici, la liste doit rester vide.
{
  const m = appSrc.match(/testimonials\s*:\s*\[([\s\S]*?)\n\s{0,4}\]/);
  if (m && /\{\s*nom\s*:/.test(m[1])) {
    const noms = [...m[1].matchAll(/nom\s*:\s*"([^"]+)"/g)].map((x) => x[1]);
    signale("faux avis", `des témoignages sont écrits dans le code (${noms.join(", ")}) : publiés sans utilisatrice derrière, ce sont de faux avis de consommateurs — article L. 121-4 du code de la consommation`);
  }
  // La section ne doit pas pouvoir s'afficher vide non plus : un bloc « elles
  // en parlent » sans un seul avis promet une clientele qui n'existe pas.
  if (!/SV\.temoignages===true&&avisPublies\.length>0/.test(appSrc))
    signale("faux avis", "la section des témoignages s'affiche sans vérifier qu'il reste au moins un avis COMPLET : vide ou à moitié remplie, elle laisse croire à des utilisatrices qui n'existent pas");
  // Le bouton « ajouter » du back-office ne doit poser aucun gabarit : une fiche
  // pre-remplie « Nouveau / Ville » oubliee en l'etat devient un faux avis.
  const boSrc = readFileSync(new URL("../src/backoffice.jsx", import.meta.url), "utf8");
  const ajout = (boSrc.match(/const addTesti\s*=[^;]+;/) || [""])[0];
  if (/nom:\s*"[^"]+"/.test(ajout))
    signale("faux avis", "le bouton « ajouter un témoignage » du back-office pré-remplit la fiche : oubliée en l'état, elle se publie comme un vrai avis");
}

// --- aucune mention legale a trou sur la page publique ---
//
// Le pied de page affichait « · SIRET : » suivi de rien tant que le champ
// n'etait pas rempli au back-office. Une mention legale obligatoire (LCEN,
// article 19) annoncee puis laissee vide, sur la page que lisent les visiteurs
// et les administrations, fait douter de tout le reste.
{
  const pied = appSrc.match(/Tous droits réservés[\s\S]{0,600}/);
  if (pied && /SIRET\s*:\s*\{|SIRET\s*:\s*\$\{/.test(pied[0]) && !/legal\?\.siret\s*\?/.test(pied[0]))
    signale("legal", "le pied de page écrit « SIRET : » sans vérifier que le numéro existe : publié vide, c'est une mention légale à trou");
}

// --- aucune promesse absolue sur la page publique ---
//
// La FAQ promettait « toujours le meme resultat, sans erreur ». Aucun logiciel
// ne peut garantir cela, et l'ecrire est une allegation fausse au sens de
// l'article L. 121-2 du code de la consommation. Le fait exact — chaque calcul
// cite son texte — se defend ; la perfection, non.
{
  const INTERDITS = [
    [/sans erreur/i, "« sans erreur » : aucune garantie d'absence d'erreur ne peut être tenue"],
    [/z[ée]ro erreur/i, "« zéro erreur » : même promesse, même impossibilité"],
    [/100\s*% (?:fiable|exact|conforme)/i, "« 100 % fiable / exact / conforme » : une perfection qu'on ne peut pas prouver"],
    [/ne quittent pas le territoire/i, "« ne quittent pas le territoire » : contredit par la politique de confidentialité (Stripe en Irlande, Resend aux États-Unis, pages distribuées mondialement)"],
    [/valeur l[ée]gale identique à une signature manuscrite/i, "cette équivalence est réservée à la signature QUALIFIÉE (eIDAS art. 25.2) ; TiMat produit une signature simple"],
    [/opposables?\b/i, "« opposable » affirme qu'un pointage s'impose à l'autre partie : c'est une preuve, dont le juge apprécie la force"],
  ];
  for (const [re, msg] of INTERDITS)
    if (re.test(appSrc)) signale("promesses", msg);
}

// --- l'export RGPD n'oublie aucune table ---
//
// L'export annonce « droit a la portabilite (article 20) » et ne couvrait que
// dix-neuf tables sur les cinquante que l'application ecrit : il manquait les
// bulletins de salaire, les versements, les autorisations signees, le registre
// des medicaments et la fiche d'urgence — les deux dernieres portent des
// donnees de sante. Aucune n'etait hors de portee ; elles avaient ete oubliees
// au fil des ajouts, et rien ne le disait.
//
// On verifie trois choses, et la premiere est la seule qui tienne dans la
// duree : toute table que le CODE ecrit ou lit doit etre rangee au registre.
// Une table ajoutee demain ne peut plus passer inapercue.
{
  const registre = await import(new URL("../data/tables-donnees.js", import.meta.url))
    .then((m) => m.TABLES).catch(() => null);
  if (!registre) {
    signale("rgpd", "data/tables-donnees.js est illisible : le registre des tables ne protege plus rien");
  } else {
    const modules = appSrc + readFileSync(new URL("../src/ecrans-quotidien.jsx", import.meta.url), "utf8");
    const srcTous = ["src", "api", "lib"].flatMap((d) => {
      let noms = [];
      try { noms = readdirSync(new URL("../" + d + "/", import.meta.url)); } catch (e) { return []; }
      return noms.filter((f) => /\.(jsx?|mjs)$/.test(f))
        .map((f) => { try { return readFileSync(new URL(`../${d}/${f}`, import.meta.url), "utf8"); } catch (e) { return ""; } });
    }).join("\n");
    // Les tables que le code touche vraiment.
    const touchees = new Set();
    // « supabase.storage.from("documents") » DESIGNE UN SEAU, PAS UNE TABLE.
    //
    // Sans cette distinction, la barriere reclamait « photos » et « documents »
    // au registre des tables : ce sont les deux espaces de stockage des fichiers.
    // Elle m'a quand meme rendu service en passant — c'est elle qui a fait
    // sortir vingt-trois fonctions mortes de lib/supabase.js, dont deux
    // ecrivaient dans une table « photos » qui, elle, n'existe pas.
    for (const m of srcTous.matchAll(/(?<!storage)\s*\.from\(\s*["'`]([a-z_]{3,})["'`]\s*\)/g)) touchees.add(m[1]);
    const inconnues = [...touchees].filter((t) => !(t in registre));
    if (inconnues.length) {
      signale("rgpd", `${inconnues.length} table(s) que le code utilise et que le registre ignore — leur contenu ne partirait dans aucun export : ${inconnues.slice(0, 5).join(", ")}`);
    }
    // Les tables declarees exportees doivent l'etre pour de vrai.
    const exportees = Object.entries(registre).filter(([, v]) => String(v).startsWith("exportee")).map(([t]) => t);
    const dansExport = new Set([...modules.matchAll(/table:\s*["'`]([a-z_]+)["'`]/g)].map((m) => m[1]));
    const promises = exportees.filter((t) => !dansExport.has(t));
    if (promises.length) {
      signale("rgpd", `${promises.length} table(s) déclarée(s) « exportee » au registre mais absente(s) de l'export : ${promises.slice(0, 5).join(", ")}`);
    }
    // --- ET LA SUPPRESSION DU COMPTE EFFACE-T-ELLE TOUT CE QU'ELLE PROMET ? ---
    //
    // L'application dit « Effacement immediat » et « toutes mes donnees ».
    // delete_user_account en oubliait NEUF, dont les autorisations parentales
    // avec leur signature, le registre des medicaments — des donnees de sante —
    // et le mandat Pajemploi lui-meme. Et comme « enfants » etait bien
    // supprimee, ces lignes devenaient orphelines : plus rien ne pouvait les
    // atteindre, ni les lire, ni les effacer.
    //
    // La fonction vit dans la base ; sa version de reference vit ici, dans
    // sql/. C'est celle-la qu'on lit : une table « exportee » doit y etre
    // effacee, sauf si le registre dit qu'elle est conservee, avec sa raison.
    {
      let suppression = "";
      try {
        const dossier = new URL("../sql/", import.meta.url);
        for (const f of readdirSync(dossier).sort()) {
          if (!/suppression-compte/.test(f)) continue;
          suppression = readFileSync(new URL(f, dossier), "utf8");
        }
      } catch (e) { /* dossier absent : signale juste apres */ }
      if (!suppression) {
        signale("rgpd", "aucun fichier sql/*suppression-compte* : la suppression de compte n'est plus relue par personne");
      } else {
        const effacees = new Set([...suppression.matchAll(/delete\s+from\s+(?:public\.)?([a-z_]+)/gi)].map((m) => m[1]));
        const oubliees = Object.entries(registre)
          .filter(([t, v]) => String(v).startsWith("exportee") && !String(v).includes("conservee") && !effacees.has(t))
          .map(([t]) => t);
        if (oubliees.length) {
          signale("rgpd", `${oubliees.length} table(s) que l'application promet d'effacer et que la suppression de compte laisse derrière elle : ${oubliees.slice(0, 6).join(", ")}`);
        }
      }
    }

    // Une exclusion sans raison est une exclusion qu'on ne peut pas discuter.
    const sansRaison = Object.entries(registre).filter(([, v]) => !String(v).startsWith("exportee") && !/^exclue\s*:\s*\S/.test(String(v))).map(([t]) => t);
    if (sansRaison.length) {
      signale("rgpd", `${sansRaison.length} table(s) exclue(s) de l'export sans raison écrite : ${sansRaison.join(", ")}`);
    }
  }
}

// --- le coefficient brut-net d'un simulateur public ---
//
// Le simulateur de salaire public calcule le net avec un coefficient plat :
// « brut x 0,7812 », et « x 0,7682 » en Alsace-Moselle. L'application, elle,
// calcule cotisation par cotisation (TAUX_COTISATIONS).
//
// Verifie au centime : les deux concordent aujourd'hui, le coefficient exact de
// l'application valant 0,781198 et 0,768198. Mais le coefficient est FIGE dans
// la page : le jour ou un taux de cotisation change — la retraite
// complementaire, la CSG, le regime local — le simulateur public continuera
// d'annoncer l'ancien net, et l'application le nouveau. Deux chiffres pour la
// meme question, dont un sur la porte d'entree Google du site.
//
// Cette regle recalcule le coefficient depuis TAUX_COTISATIONS et le compare a
// ce que la page annonce. On tolere l'arrondi a quatre decimales, pas davantage.
{
  const bloc = (appSrc.match(/TAUX_COTISATIONS\s*=\s*\{([\s\S]*?)\n\};/) || [])[1] || "";
  const lignes = [...bloc.matchAll(/\{\s*sal:\s*([\d.]+)[^}]*?(?:base:\s*([\d.]+))?\s*\}/g)];
  const tauxLocal = Number((appSrc.match(/TAUX_REGIME_LOCAL\s*=\s*([\d.]+)/) || [])[1]);
  if (!lignes.length || !tauxLocal) {
    signale("coefficient", "TAUX_COTISATIONS ou TAUX_REGIME_LOCAL ne se lisent plus dans App.jsx : la comparaison avec le simulateur public ne vérifie plus rien");
  } else {
    // La base (0,9825 pour la CSG et la CRDS) se trouve APRES « sal: » dans la
    // meme accolade : l'expression ci-dessus la capture quand elle est la.
    let somme = 0;
    for (const m of lignes) somme += Number(m[1]) * (m[2] ? Number(m[2]) : 1) / 100;
    const coefGeneral = Math.round((1 - somme) * 10000) / 10000;
    const coefLocal = Math.round((1 - somme - tauxLocal / 100) * 10000) / 10000;

    const page = "public/simulateur-salaire-assistante-maternelle.html";
    let contenu = "";
    try { contenu = readFileSync(new URL("../" + page, import.meta.url), "utf8"); } catch (e) { contenu = ""; }
    if (contenu) {
      const annonces = [...contenu.matchAll(/\b0\.(\d{4})\b/g)].map((m) => Number("0." + m[1]));
      const attendus = [coefGeneral, coefLocal];
      for (const attendu of attendus) {
        const proche = annonces.find((v) => Math.abs(v - attendu) < 0.0002);
        if (!proche) {
          signale("coefficient", `le simulateur public de salaire n'annonce pas le coefficient brut→net ${attendu} que donne TAUX_COTISATIONS (il annonce ${annonces.join(", ") || "aucun"}). Le site public et l'application diraient deux nets différents pour le même brut.`);
        }
      }
    }
  }
}

// --- un bareme perime sur une page publique ---
//
// Huit pages publiques portent les baremes legaux ECRITS EN DUR : le minimum
// conventionnel, l'indemnite d'entretien, le minimum garanti, le coefficient de
// 0,281, la majoration du titre. Ce sont les simulateurs — les portes d'entree
// du site — et les chiffres qu'on y lit, on les recopie sur une declaration.
//
// Aujourd'hui ils concordent tous avec l'application, verifie. Mais a la
// prochaine revalorisation, il faudra penser a NEUF endroits : huit pages plus
// l'application. C'est la forme la plus commune de fausse promesse — le chiffre
// a ete juste un jour. Le kit CMG et l'indemnite d'entretien l'ont deja montre
// dans cette seance, a quatorze endroits.
//
// LA REGLE : l'application est la source. Tout montant d'une famille de
// baremes qui apparait sur une page publique doit etre le montant COURANT de
// cette famille, sauf s'il est accompagne d'une date ou d'un mot qui dit qu'il
// ne s'applique plus.
{
  const nb = (motif, defaut) => {
    const m = appSrc.match(motif);
    return m ? Number(m[1]) : defaut;
  };
  // Les valeurs courantes, lues dans App.jsx — jamais recopiees ici.
  const minConv = nb(/MINIMUM_CONV_HISTO\s*=\s*\[\s*\[\s*"[\d-]+"\s*,\s*([\d.]+)/, null);
  const mg = nb(/MINIMUM_GARANTI\s*=\s*([\d.]+)/, null);
  const plancherIE = nb(/IE_PLANCHER_JOUR\s*=\s*([\d.]+)/, null);
  const coef = nb(/COEF_MINIMUM_LEGAL\s*=\s*([\d.]+)/, null);
  const majTitre = nb(/MAJORATION_TITRE_AMGE\s*=\s*([\d.]+)/, null);
  // Les valeurs anciennes du minimum conventionnel, telles que l'historique les
  // garde : elles deviennent perimees d'elles-memes a chaque revalorisation.
  //
  // ON NE LIT QUE LE BLOC MINIMUM_CONV_HISTO. Premiere version, l'expression
  // ramassait TOUTES les paires [date, nombre] de App.jsx — donc l'historique
  // du SMIC. Elle aurait signale « 12,31 EUR » comme un minimum conventionnel
  // perime, alors que c'est le SMIC horaire EN VIGUEUR. Une barriere qui accuse
  // la valeur juste est pire que pas de barriere.
  const blocHisto = (appSrc.match(/MINIMUM_CONV_HISTO\s*=\s*\[([\s\S]*?)\]\s*;/) || [])[1] || "";
  const anciensMinConv = [...blocHisto.matchAll(/\[\s*"[\d-]+"\s*,\s*([\d.]+)\s*\]/g)]
    .map((m) => Number(m[1])).filter((v) => v && v !== minConv);

  if (minConv && mg && plancherIE && coef && majTitre) {
    const tauxIEHoraire = Math.round((mg * 0.9 / 9) * 1000) / 1000;
    const ieNeufHeures = Math.max(plancherIE, Math.round(tauxIEHoraire * 9 * 100) / 100);
    const titre = Math.round(minConv * (1 + majTitre) * 100) / 100;

    // Pour chaque famille : le montant courant, et ce qui ne doit plus etre
    // presente comme en vigueur. On ne cherche la valeur que dans un contexte
    // qui parle bien de ce bareme — sinon « 4,20 » attrape un prix de boutique.
    const FAMILLES = [
      { nom: "minimum conventionnel horaire", courant: minConv, perimes: anciensMinConv,
        contexte: /minimum\s+conventionnel|salaire\s+minimum|taux\s+horaire\s+minimum/i },
      { nom: "indemnité d'entretien pour 9 h", courant: ieNeufHeures, perimes: [3.80, 3.83],
        contexte: /indemnit[ée]\s+d.entretien/i },
      { nom: "minimum garanti", courant: mg, perimes: [],
        contexte: /minimum\s+garanti/i },
      { nom: "majoration du titre AM-GE", courant: titre, perimes: [],
        contexte: /titre\s+(?:professionnel|AM-?GE)/i },
    ];
    // Les mots qui disent qu'un montant ne vaut plus : une page qui raconte
    // l'historique a le droit de citer l'ancien chiffre.
    //
    // PREMIERE VERSION, ELLE AVALAIT TOUT. Elle contenait « 20\d\d » et
    // « depuis le » : or les pages datent leurs baremes (« 4,20 EUR depuis le
    // 1er juin 2026 », « avenant du 5 fevrier 2026 »), donc une annee se
    // trouvait toujours dans la fenetre et chaque page etait exoneree. Je l'ai
    // su en simulant la revalorisation suivante : la barriere n'a rien dit.
    //
    // Seuls les mots qui situent le montant DANS LE PASSE exonerent.
    // « depuis le » n'en fait pas partie : il annonce au contraire un montant
    // presente comme courant.
    //
    // LES MOTS DU BLOG AUSSI. En etendant cette regle aux soixante-neuf
    // articles, trois d'entre eux sont ressortis — et les trois avaient raison :
    // « ces montants sont perimes depuis le 1er juin 2026 », « contre 3,64 EUR
    // brut auparavant », « perime depuis le 1er juin 2026 ». Aucun de ces trois
    // tours n'etait reconnu. Un article qui explique qu'un chiffre ne vaut plus
    // rend service ; l'accuser l'aurait fait supprimer.
    const PERIME_DIT = /avant\s+(?:le|la|juin|janvier)|auparavant|jusqu'au|jusqu.au|ancien|précédent|precedent|périm|perim|n'était|n.etait|n'existe\w*\s+plus|n.existe\w*\s+plus|ne\s+s.appliqu\w*\s+plus|a\s+été\s+remplac|était\s+de|etait\s+de|historique|vérifiez\s+toujours|verifiez\s+toujours/i;

    // LES ARTICLES DU BLOG AUSSI : ce sont eux qui expliquent les baremes en
    // detail, donc eux qui risquent le plus d'en garder un perime — et eux
    // qu'une assistante maternelle trouve par une recherche. Un taux perime lu
    // dans un article, c'est un salaire sous le plancher legal.
    const articles = [];
    {
      const racine = new URL("../public/blog/", import.meta.url);
      const empiler = (dossier, prefixe) => {
        let entrees = [];
        try { entrees = readdirSync(dossier, { withFileTypes: true }); } catch (e) { return; }
        for (const e of entrees) {
          if (e.isDirectory()) empiler(new URL(e.name + "/", dossier), prefixe + e.name + "/");
          else if (e.name === "index.html") {
            try { articles.push([prefixe + "index.html", readFileSync(new URL(e.name, dossier), "utf8")]); } catch (err) { /* page illisible : signalee ailleurs */ }
          }
        }
      };
      empiler(racine, "public/blog/");
    }
    const pages = [
      ...readdirSync(new URL("../public/", import.meta.url))
        .filter((f) => f.endsWith(".html"))
        .map((f) => ["public/" + f, readFileSync(new URL("../public/" + f, import.meta.url), "utf8")]),
      ...articles,
    ];

    for (const [nomPage, contenu] of pages) {
      const texte = contenu.replace(/&#0*39;|&apos;|&rsquo;|’/g, "'");

      // UN TAUX HORAIRE PREREMPLI NE PEUT PAS ETRE SOUS LE MINIMUM.
      //
      // Les simulateurs preremplissent « Taux horaire brut (€) » avec 4,20 EUR.
      // Ce n'est pas une affirmation — c'est un exemple — donc la regle des
      // montants perimes ne s'y applique pas : le libelle ne dit pas
      // « minimum ». Mais le jour ou le minimum monte, un exemple reste sous le
      // plancher legal, et un visiteur qui le garde calcule un salaire
      // illegal. C'est la seule chose qu'on peut affirmer sans se tromper : un
      // exemple de taux horaire doit au moins valoir le minimum.
      for (const m of texte.matchAll(/<label[^>]*>([^<]{0,60}taux\s+horaire[^<]{0,60})<\/label>\s*<input[^>]*value="([\d.]+)"/gi)) {
        const propose = Number(m[2]);
        if (propose > 0 && propose < minConv) {
          signale("bareme", `${nomPage} propose ${propose.toFixed(2).replace(".", ",")} € dans « ${m[1].trim()} », sous le minimum conventionnel de ${minConv.toFixed(2).replace(".", ",")} € (source : App.jsx). Un visiteur qui garde cet exemple calcule un salaire illégal.`);
        }
      }

      for (const fam of FAMILLES) {
        for (const perime of fam.perimes) {
          // « 4.2 » tel que JavaScript l'ecrit ne retrouve pas « 4,20 » tel que
          // la page l'ecrit : on cherche les deux formes, a une et a deux
          // decimales, avec le point ou la virgule. C'est ce detail qui faisait
          // passer la premiere version au vert sur une revalorisation simulee.
          const formes = new Set([String(perime), perime.toFixed(2), perime.toFixed(1)]);
          const motif = [...formes].map((v) => v.replace(".", "[.,]")).join("|");
          // ON REGARDE DES DEUX COTES.
          //
          // Premiere version, la fenetre ne couvrait que ce qui PRECEDE le
          // montant. Or un article ecrit « contre 3,64 EUR brut auparavant » :
          // la mise au point suit le chiffre. La regle a donc accuse un article
          // parfaitement juste — et c'est exactement l'erreur que la barriere
          // des regles abrogees, quelques lignes plus bas dans ce meme fichier,
          // documente avoir commise avant moi. Je l'ai refaite.
          const re = new RegExp("(.{0,160})(?:" + motif + ")\\s*(?:€|EUR|&euro;)(.{0,160})", "gis");
          for (const m of texte.matchAll(re)) {
            const avant = m[1], apres = m[2] || "";
            const autour = avant + " " + apres;
            if (!fam.contexte.test(avant)) continue;
            if (PERIME_DIT.test(autour)) continue;
            signale("bareme", `${nomPage} annonce ${perime.toFixed(2).replace(".", ",")} € comme ${fam.nom} : le montant en vigueur est ${fam.courant.toFixed(2).replace(".", ",")} € (source : App.jsx). Un chiffre juste un jour, recopié sur une déclaration.`);
          }

          // ET LES VALEURS PREREMPLIES DES CHAMPS.
          //
          // Les simulateurs portent le bareme dans value="4.20" : c'est le
          // chiffre que le visiteur trouve deja en place et avec lequel il
          // calcule. Perime, il ne s'affiche nulle part comme une affirmation —
          // il fait juste calculer faux, en silence. Les trois premieres
          // versions de cette regle ne regardaient que le texte visible.
          const reChamp = new RegExp("(.{0,200})value=[\"'](?:" + motif + ")[\"']", "gi");
          for (const m of texte.matchAll(reChamp)) {
            if (!fam.contexte.test(m[1])) continue;
            signale("bareme", `${nomPage} préremplit un champ avec ${perime.toFixed(2).replace(".", ",")} € pour ${fam.nom} : le montant en vigueur est ${fam.courant.toFixed(2).replace(".", ",")} € (source : App.jsx). Le visiteur calcule avec un chiffre périmé sans le voir.`);
          }
        }
      }
    }
  } else {
    signale("bareme", "les barèmes légaux ne se lisent plus dans App.jsx : la règle qui compare les pages publiques à l'application ne vérifie plus rien");
  }
}

// --- aucune regle abrogee presentee comme en vigueur ---
//
// Une page outil publique affirmait encore : « si le salaire brut depasse
// 5 fois le SMIC horaire par jour, les parents perdent l'aide en entier » —
// y compris dans ses donnees structurees, celles que Google reprend en
// reponse directe. Ce plafond journalier a ete SUPPRIME par la reforme du
// CMG de septembre 2025 et remplace par un plafond horaire de 8,09 EUR :
// le CMG continue d'etre verse, seule la part qui depasse reste a charge
// (urssaf.fr, « Evolution du complement de libre choix du mode de garde »,
// mis a jour le 24 avril 2026). La page disait donc le contraire du blog du
// meme site.
{
  const ABROGEES = [
    // On ne cherche pas la MENTION de la regle abrogee — l'expliquer est utile —
    // mais la mention qui ne dit pas qu'elle ne s'applique plus.
    //
    // LA MISE AU POINT N'EST PAS TOUJOURS APRES. Premiere version, elle ne
    // regardait que les caracteres qui SUIVENT, et sur la meme phrase : elle a
    // donc accuse trois articles parfaitement justes, qui disent « deux regles
    // qui n'existent plus », « ce systeme a disparu » et « il n'y a plus de
    // reste a charge minimum de 15 % » — les deux derniers AVANT ou APRES un
    // point. On regarde desormais tout autour, des deux cotes, sans s'arreter a
    // la ponctuation.
    [/5\s*(?:fois|x)\s*(?:le\s*)?SMIC\s*horaires?\s*(?:par\s*jour|journalier)/i,
      "le plafond journalier de 5 SMIC horaires est présenté comme en vigueur : il a été supprimé par la réforme du CMG de septembre 2025"],
    [/plafond journalier[^.]{0,80}CMG/i,
      "le CMG n'a plus de plafond journalier depuis septembre 2025, mais un plafond horaire de 8,09 EUR"],
    [/reste à charge minimum de 15\s*%/i, "le reste à charge minimum de 15 % a été supprimé en septembre 2025"],
  ];
  // Les mots qui disent qu'une regle ne s'applique plus. Cherches DE PART ET
  // D'AUTRE de la mention, ponctuation comprise.
  const MISE_AU_POINT = /supprim|dispar|n'existe plus|n'existent plus|n'y a plus|aboli|remplac|avant la réforme|jusqu'en|ancien|périmé|ne s'applique plus/i;
  const FENETRE = 260;
  // L'APOSTROPHE ECHAPPEE. Dans le HTML genere, « n'y a plus » s'ecrit
  // « n&#39;y a plus » : la mise au point etait bien la, et la barriere ne la
  // voyait pas. Elle a donc accuse un article juste — deux fois la meme phrase,
  // une fois en clair dans les donnees structurees et une fois echappee dans le
  // texte, et seule la seconde passait au rouge.
  const normalise = (t) => t.replace(/&#0*39;|&apos;|&rsquo;|’/g, "'").replace(/&#0*34;|&quot;/g, '"').replace(/&amp;/g, "&");
  // LE BLOG AUSSI. Cette barriere ne lisait que la racine de public/ : les
  // soixante-trois articles, qui vivent dans public/blog/<slug>/index.html,
  // n'etaient relus par personne. Ce sont pourtant eux qui expliquent les
  // regles en detail, donc eux qui risquent le plus de porter une regle
  // abrogee — et eux qu'un lecteur trouve par une recherche.
  const pagesBlog = [];
  {
    const racine = new URL("../public/blog/", import.meta.url);
    const empiler = (dossier, prefixe) => {
      let entrees = [];
      try { entrees = readdirSync(dossier, { withFileTypes: true }); } catch (e) { return; }
      for (const e of entrees) {
        if (e.isDirectory()) empiler(new URL(e.name + "/", dossier), prefixe + e.name + "/");
        else if (e.name === "index.html") {
          try { pagesBlog.push([prefixe + "index.html", readFileSync(new URL(e.name, dossier), "utf8")]); } catch (err) { /* page illisible : signalee ailleurs */ }
        }
      }
    };
    empiler(racine, "public/blog/");
  }
  const aLire = [
    ["src/App.jsx", appSrc],
    ...readdirSync(new URL("../public/", import.meta.url))
      .filter((f) => f.endsWith(".html"))
      .map((f) => ["public/" + f, readFileSync(new URL("../public/" + f, import.meta.url), "utf8")]),
    ...pagesBlog,
  ];
  for (const [nom, contenu] of aLire)
    for (const [re, msg] of ABROGEES) {
      const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
      let m, enDefaut = false;
      while ((m = g.exec(contenu)) !== null) {
        const autour = contenu.slice(Math.max(0, m.index - FENETRE), m.index + m[0].length + FENETRE);
        if (!MISE_AU_POINT.test(normalise(autour))) { enDefaut = true; break; }
      }
      if (enDefaut) signale("règles abrogées", `${nom} : ${msg}`);
    }
}

// --- une seule adresse de contact dans les pages legales ---
//
// Les mentions legales affichaient la constante du code, la politique de
// confidentialite le champ du back-office. Deux reglages pour une information
// qui doit etre unique : il a suffi d'en remplir un pour que le site se
// contredise — une adresse dans les mentions legales, une autre dans la
// politique de confidentialite, pour la meme personne et sur la meme page.
{
  const bloc = appSrc.slice(appSrc.indexOf("Éditeur du site"), appSrc.indexOf("Éditeur du site") + 18000);
  const adresses = [...bloc.matchAll(/Email\s*:\s*\{([^}]+)\}/g)].map((m) => m[1].trim());
  const uniques = [...new Set(adresses)];
  if (adresses.length && uniques.length > 1)
    signale("legal", `les pages légales affichent ${uniques.length} sources d'adresse différentes (${uniques.join(" / ")}) : elles finiront par se contredire`);
  // Et le champ du back-office doit etre lu : un reglage qui ne change rien est
  // pire qu'un reglage absent, parce qu'on croit avoir agi.
  if (!/config\.legal\?\.email/.test(appSrc))
    signale("legal", "le champ « email » du back-office n'est lu nulle part : on peut le changer sans que rien ne bouge sur le site");
}

// --- aucune modification du DOM derriere le dos de React ---
//
// Trois gestionnaires onError remplacaient le logo par du texte en reecrivant
// outerHTML. L'image disparaissait du document alors que React la croyait
// toujours la ; au demontage suivant il levait « removeChild : the node to be
// removed is not a child of this node », et l'application ENTIERE disparaissait
// — page blanche, sans message. Hors ligne, le logo echoue a coup sur : le
// defaut se declenchait donc exactement au rechargement sans reseau.
//
// Ce que React affiche, React doit le retirer. Un echec se range dans un etat,
// jamais dans le document.
{
  const INTERDITS = [
    [/\.outerHTML\s*=/g, "réécrit outerHTML"],
    [/target\.innerHTML\s*=/g, "réécrit innerHTML sur la cible d'un évènement"],
    [/target\.(?:remove|replaceWith)\s*\(/g, "retire la cible d'un évènement du document"],
  ];
  for (const u of fichiersAppSrc()) {
    const nom = u.pathname.split("/").pop();
    const t = readFileSync(u, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n").map((l) => l.replace(/(^|[^:])\/\/.*$/, "$1")).join("\n");
    for (const [re, quoi] of INTERDITS)
      if (re.test(t))
        signale("rendu", `${nom} ${quoi} : React ne possède plus ce qu'il affiche, et le prochain démontage fait disparaître l'application`);
  }
}

// --- toute route /api/ nommee doit exister ---
//
// Cinq fonctions du back-office ont ete reunies dans /api/backoffice pour tenir
// sous la limite de douze fonctions serverless de Vercel. Les appels ont suivi ;
// les MESSAGES D'ERREUR, non. Le tableau de bord affichait donc « Impossible de
// contacter /api/stripe-mrr » — une route qui repond 404 depuis la fusion.
// Chercher une panne a l'adresse indiquee, c'est chercher la ou il n'y a rien.
//
// On verifie donc tous les chemins /api/ ecrits dans le code, messages compris :
// chacun doit correspondre a un fichier de api/ ou a une reecriture de
// vercel.json.
{
  const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const reecritures = new Set((vercel.rewrites || []).map((r) => String(r.source).split("?")[0]));
  const fichiers = readdirSync(new URL("../api/", import.meta.url))
    .filter((f) => f.endsWith(".js")).map((f) => "/api/" + f.replace(/\.js$/, ""));
  const connues = new Set([...fichiers, ...reecritures]);
  const sources = [
    ...fichiersAppSrc().map((u) => [u.pathname.split("/").pop(), readFileSync(u, "utf8")]),
    ...readdirSync(new URL("../public/", import.meta.url)).filter((f) => f.endsWith(".html"))
      .map((f) => ["public/" + f, readFileSync(new URL("../public/" + f, import.meta.url), "utf8")]),
  ];
  const vues = new Set();
  for (const [nom, src] of sources)
    for (const m of src.matchAll(/\/api\/[a-zA-Z0-9_-]+/g)) {
      const cle = nom + "|" + m[0];
      if (vues.has(cle)) continue;
      vues.add(cle);
      if (!connues.has(m[0]))
        signale("routes", `${nom} nomme « ${m[0] } », qui n'existe ni dans api/ ni dans les réécritures : l'appel échoue, ou le message d'erreur envoie chercher au mauvais endroit`);
    }
}

// --- LES CONTRÔLES NAVIGATEUR QUI NE VÉRIFIENT RIEN -------------------------
//
// Onze contrôles doublaient la base par « body: "[]" » puis se connectaient
// avec le compte de démonstration. L'application ne trouvait alors aucun
// profil, tentait de le recréer, recevait « [] » pour cette écriture aussi, et
// s'arrêtait sur « Votre compte n'a pas pu être chargé ». Les contrôles
// continuaient à chercher leurs boutons derrière cette carte d'erreur :
// verif-contraste-app annonçait « ok » pour seize écrans qu'il n'avait jamais
// ouverts.
//
// Un contrôle qui vérifie le vide est pire qu'une absence de contrôle : il
// rassure. On exige donc deux choses de tout contrôle navigateur qui entre
// dans l'application : qu'il branche la base sur le jeu de données partagé, et
// qu'il appelle DANS_L_APP — le garde-fou qui s'arrête si la page n'est pas
// celle d'une session ouverte.
{
  const dossier = new URL("./", import.meta.url);
  for (const nom of readdirSync(dossier).filter((f) => /^(verif|parcours)-.*\.mjs$/.test(f))) {
    const src = readFileSync(new URL(nom, dossier), "utf8");
    if (!/\bchromium\b/.test(src)) continue;                       // pas un contrôle navigateur
    if (!/rest\/v1/.test(src)) continue;                            // n'entre pas dans l'application
    const sansCommentaires = src.replace(/^\s*\/\/.*$/gm, "");
    // OUVRE-T-IL VRAIMENT UNE SESSION ?
    //
    // La première version de cette règle accusait verif-contraste et
    // verif-avis, qui ne visitent que les pages publiques : ils doublent la
    // base par « [] » et c'est très bien, personne ne se connecte. Accuser un
    // fichier sain, c'est le même tort que de laisser passer un fichier creux.
    const seConnecte = /demonstration|auth-token|BRANCHER\s*\(|auth\/v1\/token/.test(sansCommentaires);
    if (!seConnecte) continue;
    // Un contrôle qui branche déjà le jeu de données a raison de répondre « [] »
    // pour les tables qu'aucun écran ne lui demande.
    if (/REPONSE_URL|BRANCHER\s*\(/.test(sansCommentaires)) continue;
    // Un contrôle peut aussi servir son propre profil, à la main. C'est le cas
    // de parcours-backoffice, qui a besoin d'un profil « is_admin » que le jeu
    // de données ne porte pas. Ce qui compte n'est pas la méthode : c'est qu'un
    // profil arrive. La règle ci-dessus sur les routes masquées veille à ce que
    // cette route serve vraiment.
    if (/\.route\("\*\*\/rest\/v1\/profiles/.test(sansCommentaires)) continue;
    // verif-demonstration.mjs double exprès : son objet est justement le compte
    // de démonstration, qui n'a PAS de profil en base — c'est lui qui vérifie
    // que l'application ne va plus en chercher un.
    if (nom === "verif-demonstration.mjs") continue;
    // On ne signale QUE le stub vide. L'absence de DANS_L_APP n'est pas une
    // preuve : un contrôle qui branche le jeu de données entre bien dans
    // l'application. Avoir signalé les vingt aurait noyé le seul défaut réel —
    // et un rapport qui crie pour rien apprend à ne plus être lu.
    if (/body:\s*"\[\]"/.test(sansCommentaires))
      signale("controles-creux", `${nom} double « rest/v1 » par « [] » : sans profil, la connexion s'arrête sur « Votre compte n'a pas pu être chargé » et tout « ok » rendu derrière est creux — brancher BRANCHER/REPONSE_URL de jeu-de-donnees.mjs, puis appeler DANS_L_APP`);
  }
}

// --- UNE ROUTE DE TEST MASQUÉE PAR UNE AUTRE --------------------------------
//
// Playwright applique la DERNIÈRE route déclarée EN PREMIER. parcours-backoffice
// déclarait sa règle des profils AVANT la règle générale « rest/v1/** » : c'est
// donc la générale qui répondait aux profils, par « [] ». Le back-office ne
// recevait aucun « is_admin » — précisément la porte que ce parcours prétend
// vérifier. Rien ne le disait : le parcours s'exécutait, et affichait des
// colonnes de zéros rassurantes.
//
// La règle est mécanique : une route particulière écrite avant une route
// générale, dans le même fichier, ne sert jamais.
{
  const dossier = new URL("./", import.meta.url);
  for (const nom of readdirSync(dossier).filter((f) => f.endsWith(".mjs"))) {
    const lignes = readFileSync(new URL(nom, dossier), "utf8").split("\n");
    const routes = lignes.map((l, i) => [i + 1, l])
      .filter(([, l]) => /\.route\("\*\*\/rest\/v1\//.test(l));
    const generales = routes.filter(([, l]) => /rest\/v1\/\*\*"/.test(l)).map(([i]) => i);
    for (const [i, l] of routes) {
      if (/rest\/v1\/\*\*"/.test(l)) continue;
      const apres = generales.find((g) => g > i);
      if (apres !== undefined)
        signale("routes-masquees", `${nom}:${i} double une table précise, mais la règle générale « rest/v1/** » est déclarée plus bas (ligne ${apres}) : Playwright applique la dernière d'abord, donc cette ligne-ci ne sert jamais — la déclarer APRÈS la générale`);
    }
  }
}

// --- UN CONTRÔLE NAVIGATEUR SANS GARDE-FOU DU BUNDLE ------------------------
//
// « npm run build » construit SANS VITE_SUPABASE_KEY. L'application est alors
// inbootable : elle retombe sur la page vitrine, sans un mot. Un contrôle qui
// cherche ses boutons là-dedans rend un KO qui n'existe pas — et un faux KO est
// pire qu'une absence de contrôle : il apprend à ignorer le rapport. verif-avis
// a accusé un code parfaitement sain pour cette raison exacte.
//
// Tout contrôle qui démarre l'application doit donc appeler BUNDLE_TESTABLE
// juste après son premier « goto ». Les contrôles qui ne visitent que des pages
// HTML publiques n'en ont pas besoin : la clé n'y joue aucun rôle.
{
  const dossier = new URL("./", import.meta.url);
  const SANS_APPLICATION = new Set([
    "verif-contraste.mjs",          // pages publiques
    "verif-outils-publics.mjs",     // pages publiques
    "verif-calculs-identiques.mjs", // simulateurs publics + fonctions extraites
  ]);
  for (const nom of readdirSync(dossier).filter((f) => /^(verif|parcours)-.*\.mjs$/.test(f))) {
    if (SANS_APPLICATION.has(nom)) continue;
    const src = readFileSync(new URL(nom, dossier), "utf8");
    if (!/\bchromium\b/.test(src)) continue;
    if (/BUNDLE_TESTABLE\s*\(/.test(src.replace(/^\s*\/\/.*$/gm, ""))) continue;
    signale("bundle-sans-garde-fou", `${nom} démarre l'application sans appeler BUNDLE_TESTABLE : construit sans VITE_SUPABASE_KEY, le bundle est inbootable et ce contrôle rendrait un KO imaginaire`);
  }
}

// --- LE TAUX DE MAJORATION : LE SITE ET L'APPLICATION NE DISENT PAS PAREIL ---
//
// La CCN 3239 fixe ce taux AU CONTRAT, avec un plancher de 10 %. L'application
// retient 1,25 (TAUX_MAJORATION_HEURES, dans socle.jsx) ; le simulateur public
// « heures majorées » propose 10 % par défaut. Une assistante maternelle qui
// simule sur le site puis regarde son bulletin lit donc deux chiffres
// différents pour les mêmes heures.
//
// CE N'EST PAS UNE RÈGLE QUI SE CORRIGE TOUTE SEULE : changer ce taux change ce
// qu'une assistante maternelle touche, et le contrat ne porte pas encore ce
// champ. Elle reste donc là, à signaler l'écart tant qu'il dure, plutôt qu'un
// silence qui le ferait oublier.
{
  const socle = readFileSync(new URL("../src/socle.jsx", import.meta.url), "utf8");
  const appTaux = Number((socle.match(/TAUX_MAJORATION_HEURES\s*=\s*([0-9.]+)/) || [])[1]);
  const page = new URL("../public/simulateur-heures-majorees-assistante-maternelle.html", import.meta.url);
  if (existsSync(page) && Number.isFinite(appTaux)) {
    const html = readFileSync(page, "utf8");
    const sitePct = Number((html.match(/id="mj"[^>]*value="([0-9.]+)"/) || [])[1]);
    const appPct = Math.round((appTaux - 1) * 100);
    if (Number.isFinite(sitePct) && sitePct !== appPct) {
      signale("heures-majorees", `le simulateur public propose ${sitePct} % de majoration, l'application en applique ${appPct} % (TAUX_MAJORATION_HEURES) : pour 20 h majorées à 4,20 €/h, cela fait ${((20 * 4.20 * (appPct - sitePct)) / 100).toFixed(2)} € d'écart sur un bulletin. La CCN 3239 fixe ce taux au contrat, plancher 10 % — c'est une décision, pas un bug à corriger en douce`);
    }
  }
}

// --- LE PLAFOND MENSUEL DU CMG : L'APPLICATION EN POSE UN, PAS LE SITE -------
//
// L'application plafonne le CMG à CMG_MAX (825,16 €). Le simulateur public
// « CMG reste à charge » ne plafonne pas du tout. Pour 200 h à 6,50 €/h et des
// ressources au plancher, la page annonce 1 255,43 € là où l'application en
// annonce 825,16 : 430 € d'écart sur une aide qu'une famille met dans son
// budget.
//
// JE N'AI PAS TRANCHÉ, ET JE NE DOIS PAS. La réforme du 1er septembre 2025
// (décret n° 2025-515 du 30 mai 2025, article D. 531-18 du code de la sécurité
// sociale) a remplacé le plafond journalier par un plafond HORAIRE et supprimé
// le reste à charge minimal de 15 % en emploi direct. Plusieurs sources en
// déduisent qu'il n'existe plus de plafond mensuel fixe ; d'autres citent
// 825,16 €, mais ce chiffre vient de calculateurs privés, pas d'une source
// officielle. Les deux codes peuvent donc avoir tort.
//
// À VÉRIFIER AUPRÈS DE LA SOURCE : le simulateur officiel de la CAF ou de
// Pajemploi, ou le texte de l'article D. 531-18. Tant que ce n'est pas tranché,
// cette règle garde l'écart sous les yeux plutôt que de le laisser s'oublier.
{
  const page = new URL("../public/simulateur-cmg-reste-a-charge.html", import.meta.url);
  if (existsSync(page)) {
    const html = readFileSync(page, "utf8");
    const appMax = Number((appSrc.match(/CMG_MAX\s*=\s*([0-9.]+)/) || [])[1]);
    const pagePlafonne = /CMG_MAX|plafondMensuel|Math\.min\([^)]*82[0-9]/.test(html);
    if (Number.isFinite(appMax) && !pagePlafonne) {
      signale("cmg", `l'application plafonne le CMG à ${appMax} € par mois, le simulateur public ne le plafonne pas : pour 200 h à 6,50 €/h et des ressources au plancher, la page annonce 1 255,43 € contre ${appMax} € dans l'application, soit 430 € d'écart sur une aide qu'une famille met dans son budget. Lequel des deux a raison n'est PAS tranché : la réforme du 1er septembre 2025 a remplacé le plafond journalier par un plafond horaire, et les sources se contredisent sur l'existence d'un plafond mensuel. À vérifier sur le simulateur officiel CAF/Pajemploi ou l'article D. 531-18 du code de la sécurité sociale`);
    }
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
