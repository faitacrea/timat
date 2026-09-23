/**
 * Couvertures d'articles de blog.
 *
 * Huit articles en ligne et neuf brouillons n'avaient pas d'image : leur carte
 * s'affiche alors sans zone image du tout, et l'article part sans og:image —
 * partagé dans une conversation, il arrive sans aperçu.
 *
 * Ce script les fabrique aux couleurs du site, dans les polices du site, au
 * format 1200x630 qu'attendent les réseaux sociaux.
 *
 *   node scripts/couvertures-blog.mjs            → écrit dans /tmp/couvertures
 *   node scripts/couvertures-blog.mjs --un slug  → une seule, pour vérifier
 *
 * Il n'envoie rien : l'envoi dans Sanity se fait à part, pour qu'une erreur de
 * rendu ne se retrouve jamais publiée sans avoir été regardée.
 *
 * Les polices viennent de Google Fonts au moment du rendu. Les embarquer dans
 * le dépôt aurait figé 164 Ko de base64 dans un fichier que personne ne relit ;
 * les charger par <link> ne marche pas dans un navigateur sans réseau stable —
 * on les télécharge donc, et on les injecte en dur dans la page.
 */
import { chromium } from "playwright";
import { mkdirSync, existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";

const SORTIE = "/tmp/couvertures";
const CSS_POLICES =
  "https://fonts.googleapis.com/css2?family=Quicksand:wght@600;700&family=DM+Sans:wght@400;500&display=swap";
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Le texte de la couverture n'est PAS le titre : c'est le fait que l'article
// établit. C'est la règle des cinquante couvertures déjà en ligne, et c'est ce
// qui rend la vignette utile quand elle circule seule.
export const COUVERTURES = [
  ["quel-logiciel-assistante-maternelle", "Situation pratique",
   "Trois outils sur le marché français. Un seul est habilité à déclarer à Pajemploi à votre place"],
  ["visite-domicile-pmi-agrement-assistante-maternelle", "Devenir assistante maternelle",
   "Des critères nationaux, et par-dessus les exigences de sécurité propres à chaque département"],
  ["projet-accueil-assistante-maternelle", "Le quotidien de l'accueil",
   "Aucun texte ne l'impose. Beaucoup de PMI le demandent quand même, à l'agrément et au renouvellement"],
  ["absence-enfant-maladie-salaire-assistante-maternelle", "Le quotidien de l'accueil",
   "Cinq jours courts, ou quatorze jours consécutifs. Au-delà, le salaire est dû"],
  ["attestation-honorabilite-assistante-maternelle", "Démarches et agrément",
   "Depuis le décret du 28 juin 2024, à joindre à toute demande et à tout renouvellement"],
  ["chomage-apres-fin-contrat-assistante-maternelle", "Contrat et paie",
   "Perdre un contrat sur trois s'indemnise : c'est la perte partielle d'emploi"],
  ["conge-enfant-malade-assistante-maternelle", "Le quotidien de l'accueil",
   "Trois jours par an, cinq dans deux situations précises, et non rémunérés"],
  ["retrait-suspension-agrement-assistante-maternelle", "Démarches et agrément",
   "Commission paritaire, quinze jours d'avance, dossier consultable. La suspension, quatre mois au plus"],
  ["refus-agrement-assistante-maternelle-recours", "Devenir assistante maternelle",
   "Deux recours, des délais courts, et le droit de redéposer une demande"],
  ["assurance-responsabilite-civile-professionnelle-assistante-maternelle", "Démarches et agrément",
   "Ce n'est pas l'existence du contrat qui compte, c'est ce qu'il nomme"],
  ["retraite-assistante-maternelle-trimestres-ircem", "Contrat et paie",
   "Un trimestre ne s'achète pas avec du temps passé, mais avec du salaire déclaré"],
  ["releve-heures-assistante-maternelle-preuve", "Situation pratique",
   "Le jour d'un désaccord sur les heures, c'est la seule chose qui reste"],
  ["demission-assistante-maternelle-preavis-procedure", "Contrat et paie",
   "Lettre recommandée, préavis selon l'ancienneté, et des documents à réclamer"],
  ["prevoyance-ircem-assistante-maternelle", "Contrat et paie",
   "La Sécurité sociale ne couvre qu'une partie du salaire. L'IRCEM prend le relais"],
  ["annee-complete-incomplete-assistante-maternelle", "Contrat et paie",
   "La première case du contrat, et la plus lourde de conséquences"],
  ["transport-enfants-voiture-assistante-maternelle", "Le quotidien de l'accueil",
   "Trois conditions à réunir. Il suffit qu'une manque pour que la garantie saute"],
  ["formation-obligatoire-120-heures-assistante-maternelle", "Devenir assistante maternelle",
   "Cent vingt heures, dont une grande partie avant le premier enfant accueilli"],
  ["aeeh-majoration-cmg-enfant-handicap-assistante-maternelle", "Pajemploi et aides",
   "Trente pour cent de CMG en plus, et pour tous les enfants de la famille"],
  // Les cinq articles écrits d'avance. Comme les autres, la phrase n'est pas
  // le titre : c'est le fait que l'article établit.
  ["grossesse-protection-retrait-enfant-assistante-maternelle", "Contrat et paie",
   "Un retrait d’enfant décidé pendant la grossesse est nul, pas seulement irrégulier"],
  ["conge-maternite-assistante-maternelle-indemnites", "Contrat et paie",
   "Trois mois de salaires fixent l’indemnité de tout le congé. Un contrat perdu avant pèse longtemps"],
  ["conges-evenements-familiaux-assistante-maternelle", "Contrat et paie",
   "Sans ancienneté, sans perte de salaire, et l’employeur ne peut pas les refuser"],
  ["indemnite-depart-retraite-assistante-maternelle", "Contrat et paie",
   "Une indemnité par famille, et ce n’est pas la famille qui la paie"],
  ["formation-continue-assistante-maternelle-58-heures", "Devenir assistante maternelle",
   "Cinquante-huit heures par an, remises à zéro chaque janvier et jamais reportées"],
  // Les huit articles écrits pour le parent employeur. Même règle : la phrase
  // n'est pas le titre, c'est le fait que l'article établit — celui qu'on
  // retient quand la vignette circule seule dans une conversation.
  ["budget-mensuel-parent-employeur-assistante-maternelle", "Côté parent employeur",
   "Le salaire ne bouge pas. Ce sont les indemnités qui varient, et le CMG arrive un mois plus tard"],
  ["rompre-contrat-assistante-maternelle-parent-employeur", "Côté parent employeur",
   "Une indemnité de 1/80e des salaires bruts, due dès neuf mois d'accueil"],
  ["periode-adaptation-assistante-maternelle-parent", "Côté parent employeur",
   "Trente jours au plus, à l'intérieur de la période d'essai. Et chaque heure se paie"],
  ["enfant-malade-absence-ce-que-le-parent-doit-payer", "Côté parent employeur",
   "Sans certificat médical, rien ne se déduit du salaire mensualisé"],
  ["contrat-assistante-maternelle-cote-parent-employeur", "Côté parent employeur",
   "Une clause moins favorable que la convention est sans effet, même signée des deux côtés"],
  ["premiere-declaration-pajemploi-parent-employeur", "Pajemploi et aides",
   "On déclare le salaire NET. Pajemploi reconstitue lui-même le brut et les cotisations"],
  ["assistante-maternelle-ou-garde-a-domicile-cout", "Choisir son mode de garde",
   "Cent pour cent des cotisations prises en charge chez une assistante maternelle, cinquante à domicile"],
  ["trouver-une-assistante-maternelle-ou-chercher-quand", "Choisir son mode de garde",
   "Les places se libèrent au printemps, quand les départs à l'école se confirment"],
];

async function polices() {
  const css = await (await fetch(CSS_POLICES, { headers: { "User-Agent": UA } })).text();
  const regles = [];
  for (const bloc of css.split("@font-face").slice(1)) {
    // Seul le sous-ensemble latin : les autres ne servent à rien ici et
    // tripleraient le poids de la page.
    if (!/U\+0000-00FF/.test(bloc)) continue;
    const fam = (bloc.match(/font-family: *['"]([^'"]+)/) || [])[1];
    const poids = (bloc.match(/font-weight: *(\d+)/) || [])[1];
    const url = (bloc.match(/url\((https:[^)]+)\)/) || [])[1];
    if (!fam || !poids || !url) continue;
    const bin = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
    regles.push(
      `@font-face{font-family:'${fam}';font-style:normal;font-weight:${poids};` +
        `src:url(data:font/woff2;base64,${bin.toString("base64")}) format('woff2')}`
    );
  }
  if (!regles.length) throw new Error("aucune police récupérée — la couverture sortirait dans une police système");
  return regles.join("\n");
}

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const page = (regles, rubrique, phrase, logo) => `<!doctype html><meta charset="utf-8"><style>
${regles}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;
  background:linear-gradient(150deg,#FDF6EE 0%,#F7ECE0 58%,#FBF1E7 100%);
  font-family:'DM Sans',system-ui,sans-serif;color:#2E4859;
  display:flex;flex-direction:column;justify-content:space-between;padding:66px 74px;position:relative}
/* Deux aplats très doux : ils donnent du relief sans jamais passer derrière le
   texte, dont le contraste doit rester celui du fond crème. */
.rond{position:absolute;border-radius:50%;opacity:.5}
.r1{width:520px;height:520px;right:-170px;top:-190px;background:radial-gradient(circle,#F2D9CC 0%,rgba(242,217,204,0) 70%)}
.r2{width:420px;height:420px;left:-150px;bottom:-190px;background:radial-gradient(circle,#DCE8E4 0%,rgba(220,232,228,0) 70%)}
.haut{position:relative;z-index:1}
.rubrique{display:inline-block;font-size:19px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;
  color:#B0543A;background:rgba(228,145,120,.16);border:1px solid rgba(228,145,120,.42);
  border-radius:99px;padding:11px 26px}
.phrase{position:relative;z-index:1;font-family:'Quicksand',sans-serif;font-weight:700;
  font-size:56px;line-height:1.2;color:#2E4859;max-width:1000px;letter-spacing:-.4px}
.bas{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between}
.marque{display:flex;align-items:center;gap:16px}
.marque img{height:46px}
.trait{width:2px;height:30px;background:rgba(46,72,89,.22)}
.site{font-size:22px;font-weight:500;color:#5E7884}
.filet{height:7px;width:132px;border-radius:99px;background:linear-gradient(90deg,#E49178,#C76754)}
</style>
<div class="rond r1"></div><div class="rond r2"></div>
<div class="haut"><span class="rubrique">${esc(rubrique)}</span></div>
<div class="phrase">${esc(phrase)}</div>
<div class="bas">
  <div class="marque"><img src="${logo}" alt=""><div class="trait"></div><span class="site">timat.app</span></div>
  <div class="filet"></div>
</div>`;

const chercherChromium = () => {
  const racine = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!racine || !existsSync(racine)) return undefined;
  const lien = path.join(racine, "chromium");
  if (existsSync(lien) && statSync(lien).isFile()) return lien;
  for (const d of readdirSync(racine).filter((x) => x.startsWith("chromium-")).sort().reverse()) {
    const bin = path.join(racine, d, "chrome-linux", "chrome");
    if (existsSync(bin)) return bin;
  }
  return undefined;
};

const seul = process.argv.includes("--un") ? process.argv[process.argv.indexOf("--un") + 1] : null;

mkdirSync(SORTIE, { recursive: true });
const regles = await polices();
if (!existsSync("public/logo.webp")) throw new Error("public/logo.webp introuvable — lancer depuis la racine du projet");
const logo = "data:image/webp;base64," + readFileSync("public/logo.webp").toString("base64");

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || chercherChromium() });
const p = await nav.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
let n = 0;
for (const [slug, rubrique, phrase] of COUVERTURES) {
  if (seul && slug !== seul) continue;
  await p.setContent(page(regles, rubrique, phrase, logo), { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  // Un texte qui déborde de la couverture est pire que pas de couverture : on
  // le refuse plutôt que de l'écrire sur le disque.
  const trop = await p.evaluate(() => {
    // On mesure le TEXTE, pas le corps : les deux aplats décoratifs sortent du
    // cadre volontairement, et faire porter le contrôle sur le corps le faisait
    // échouer sur une couverture parfaitement lisible.
    for (const sel of [".rubrique", ".phrase", ".bas"]) {
      const r = document.querySelector(sel).getBoundingClientRect();
      if (r.top < 0 || r.left < 0 || r.bottom > 630 || r.right > 1200) return sel;
    }
    return null;
  });
  if (trop) { console.log(`  KO  ${slug} : ${trop} déborde des 1200x630`); n++; continue; }
  await p.screenshot({ path: path.join(SORTIE, slug + ".png") });
  console.log(`  ok  ${slug}`);
}
await nav.close();
console.log(n ? `\n${n} couverture(s) en défaut\n` : `\n${COUVERTURES.length - (seul ? COUVERTURES.length - 1 : 0)} couverture(s) écrite(s) dans ${SORTIE}\n`);
process.exit(n ? 1 : 0);
