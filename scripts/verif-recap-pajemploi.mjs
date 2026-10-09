// CE QUE LE RÉCAPITULATIF DIT DE DÉCLARER À PAJEMPLOI.
//
// C'est le document le plus engageant de TiMat : un parent employeur recopie
// ses chiffres sur pajemploi.urssaf.fr, et c'est l'URSSAF qui les reçoit.
//
// IL DISAIT DE FAIRE UNE ERREUR QU'IL SIGNALAIT LUI-MÊME. Tout son calcul
// partait des heures POINTÉES. Un contrat mensualisé se déclare sur les heures
// prévues au contrat — le blog de TiMat l'écrit noir sur blanc : « le principe
// même de la mensualisation, c'est de lisser », et déclarer les heures réelles
// « est une erreur ». Le document avertissait bien que les deux différaient,
// puis ordonnait trois lignes plus bas « Entrez le nombre d'heures : <heures
// pointées> ».
//
// ET AU PIRE : les heures pointées sont la somme des pointages. Une assistante
// maternelle qui ne pointe pas tous les jours obtenait un récapitulatif disant
// de déclarer ZÉRO heure et ZÉRO euro. Entretien et repas tombaient à zéro avec.
//
// Hors chaîne de build : Vercel n'a pas de navigateur.
//   node scripts/verif-recap-pajemploi.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { CHROMIUM, BRANCHER, BUNDLE_TESTABLE, ATTENDRE_PRET, DANS_L_APP, CLIQUER } from "./jeu-de-donnees.mjs";

const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8")
  .match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];
const BASE = process.env.URL_BASE || "http://127.0.0.1:4173";

const ko = [];
const dire = (bon, quoi, detail) => {
  if (bon) console.log(`  ok  ${quoi}`);
  else { ko.push(`${quoi}${detail ? " — " + detail : ""}`); console.log(`  KO  ${quoi}${detail ? "\n        " + detail : ""}`); }
};
const nb = (t) => Number(String(t).replace(/\s|&nbsp;|€|h/g, "").replace(",", ".")) || 0;

const N = await chromium.launch({ executablePath: CHROMIUM() });
const ctx = await N.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
const p = await ctx.newPage();
await BRANCHER(p, "asmat", CLE);
await p.goto(`${BASE}/?acces=${CLE}&connexion=1`, { waitUntil: "domcontentloaded" });
if (!await BUNDLE_TESTABLE(p)) { await N.close(); process.exit(1); }
await ATTENDRE_PRET(p, 2200);
const passer = p.getByRole("button", { name: /^Passer$/ });
if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(600); }
if (!await DANS_L_APP(p, "le contrôle du récapitulatif Pajemploi")) { await N.close(); process.exit(1); }

console.log("\n=== LE RÉCAPITULATIF PAJEMPLOI — ce qu'il dit de déclarer ===\n");

await CLIQUER(p, "Administratif"); await p.waitForTimeout(800);
await CLIQUER(p, "Paie & Contrats"); await p.waitForTimeout(1600);
await CLIQUER(p, "Facturation"); await p.waitForTimeout(1400);

// Le récapitulatif s'ouvre dans une nouvelle fenêtre.
const [onglet] = await Promise.all([
  ctx.waitForEvent("page", { timeout: 15000 }).catch(() => null),
  CLIQUER(p, "Exporter vers Pajemploi"),
]);
if (!onglet) {
  dire(false, "le récapitulatif s'ouvre", "la fenêtre ne s'est pas ouverte : rien de ce qui suit n'a pu être vérifié");
  await N.close(); process.exit(1);
}
await onglet.waitForLoadState("domcontentloaded");
await onglet.waitForTimeout(600);
const txt = (await onglet.locator("body").innerText()).replace(/\s+/g, " ");
dire(true, "le récapitulatif s'ouvre");

// 1. LE CONTRAT DU JEU DE DONNÉES : 40 h/semaine, 52 semaines → 173 h.
//    C'est ce chiffre qui doit être donné comme « heures normales à déclarer »,
//    et aucun autre.
const ligneNormales = (txt.match(/Heures normales À DÉCLARER \(mensualisées\)\s*([0-9]+)\s*h/i) || [])[1];
dire(ligneNormales !== undefined, "le document annonce des heures normales mensualisées",
  "la ligne « Heures normales À DÉCLARER » est absente : le document ne dit plus ce qu'il faut déclarer");
if (ligneNormales !== undefined) {
  dire(nb(ligneNormales) === 173, `les heures normales sont celles du contrat (${ligneNormales} h)`,
    `attendu 173 h pour 40 h × 52 semaines ÷ 12 — lu ${ligneNormales} h`);
}

// 2. LA CONSIGNE NUMÉROTÉE DOIT DONNER LE MÊME CHIFFRE QUE LE TABLEAU.
//    C'est précisément là que le document se contredisait.
const consigne = (txt.match(/Entrez les heures normales\s*:?\s*([0-9]+)\s*h/i) || [])[1];
dire(consigne !== undefined, "la consigne numérotée parle bien des heures normales",
  "la consigne dit encore « Entrez le nombre d'heures », sans préciser lesquelles");
if (consigne !== undefined && ligneNormales !== undefined) {
  dire(nb(consigne) === nb(ligneNormales),
    "la consigne donne le même chiffre que le tableau",
    `le tableau annonce ${ligneNormales} h et la consigne ${consigne} h — c'est la contradiction d'origine`);
}

// 3. AUCUNE CONSIGNE NE DOIT DONNER LES HEURES POINTÉES COMME CHIFFRE À SAISIR.
const pointees = (txt.match(/Heures réellement pointées ce mois\s*([0-9]+)\s*h/i) || [])[1];
dire(pointees !== undefined, "les heures pointées restent affichées, pour information");
if (pointees !== undefined && consigne !== undefined && nb(pointees) !== nb(consigne)) {
  dire(true, "et elles ne sont pas ce qu'on demande de saisir");
}

// 4. LE CAS QUI FAISAIT LE PLUS DE DÉGÂTS : AUCUN POINTAGE.
//    Le jeu de données ne porte aucun pointage pour ce mois : c'est exactement
//    la situation d'une assistante maternelle qui ne pointe pas. Rien ne doit
//    tomber à zéro.
dire(nb(ligneNormales || 0) > 0, "sans aucun pointage, les heures à déclarer ne tombent pas à zéro",
  "c'est le défaut d'origine : le document disait de déclarer 0 heure");
const net = (txt.match(/Salaire NET à déclarer\s*([0-9  ,.]+)\s*€/i) || [])[1];
dire(net !== undefined && nb(net) > 0, `le salaire net à déclarer n'est pas nul (${net} €)`,
  "le document disait de déclarer 0 € de salaire");

// LE MONTANT, PAS SEULEMENT LE TEXTE.
//
// Ma première version de ce contrôle vérifiait les phrases et laissait passer
// le salaire : remis sur les heures pointées, il ne disait rien. Un contrôle
// qui lit le libellé sans lire le chiffre est creux. On recalcule donc le net
// à partir de ce que le document DÉCLARE lui-même — heures, taux — avec la
// fonction réelle de l'application, extraite du code à chaque exécution.
{
  const { build } = await import("esbuild");
  const { createRequire } = await import("node:module");
  const { writeFileSync, unlinkSync } = await import("node:fs");
  const ENTREE = new URL("../.entree-recap.js", import.meta.url).pathname;
  const SORTIE = new URL("../.recap-app.cjs", import.meta.url).pathname;
  writeFileSync(ENTREE, 'export { netDepuisBrut } from "./src/App.jsx";\n');
  await build({
    entryPoints: [ENTREE], bundle: true, format: "cjs", platform: "node", outfile: SORTIE,
    loader: { ".jsx": "jsx" }, jsx: "automatic", external: ["@supabase/supabase-js", "jspdf"],
    define: { "import.meta.env": JSON.stringify({ VITE_SUPABASE_URL: "https://exemple.supabase.co", VITE_SUPABASE_KEY: "verification-locale", MODE: "test" }) },
    logLevel: "error",
  });
  const app = createRequire(import.meta.url)(SORTIE);
  // On nettoie les DEUX fichiers : j'avais laissé le bundle derrière moi, et
  // il s'est retrouvé commité dans le dépôt.
  unlinkSync(ENTREE);
  try { unlinkSync(SORTIE); } catch (e) { /* déjà parti */ }
  const taux = nb((txt.match(/Taux horaire brut \(contrat\)\s*([0-9  ,.]+)\s*€/i) || [])[1]);
  // PIÈGE : le libellé contient lui-même un nombre — « au-delà de 45 h/semaine ».
  // Ma première expression attrapait ce 45 et calculait un net de 899,82 €
  // contre 567,62 € affichés, en accusant le code. On lit donc la valeur APRÈS
  // la parenthèse fermante du libellé, là où elle se trouve vraiment.
  const compl = nb((txt.match(/Heures complémentaires[^)]*\)\s*([0-9]+)\s*h/i) || [])[1]);
  const maj = nb((txt.match(/Heures majorées[^)]*\)\s*([0-9]+)\s*h/i) || [])[1]);
  const brutAttendu = nb(ligneNormales) * taux + compl * taux + maj * taux * 1.25;
  const netAttendu = app.netDepuisBrut(brutAttendu);
  const ecart = Math.abs(nb(net) - netAttendu);
  dire(ecart <= 0.02,
    `le net déclaré correspond aux heures déclarées (${net} € pour ${ligneNormales} h × ${taux} €)`,
    `le document annonce ${ligneNormales} h à ${taux} €/h, soit ${netAttendu} € net — mais il affiche ${net} €. Écart : ${Math.round(ecart * 100) / 100} €. C'est le défaut d'origine : le texte disait la mensualisation, le montant partait des heures pointées.`);
}
const entretien = (txt.match(/Indemnité d'entretien \(ligne distincte\)\s*([0-9  ,.]+)\s*€/i) || [])[1];
dire(entretien !== undefined && nb(entretien) > 0, `l'indemnité d'entretien n'est pas nulle (${entretien} €)`,
  "elle se calculait sur les jours pointés : sans pointage, elle tombait à zéro");

// 5. LA RÈGLE EST ÉCRITE, pas seulement appliquée.
// 6. ET L'INDEMNITÉ D'ENTRETIEN, QUI SUIT LES JOURS RÉELS, DOIT PRÉVENIR
//    QUAND LE POINTAGE EST VISIBLEMENT INCOMPLET. Le jeu de données porte
//    trois jours pointés pour un contrat qui en prévoit vingt-deux : le
//    montant calculé est juste au regard de la règle, et presque sûrement trop
//    bas au regard de la réalité. Le document doit le dire.
dire(/jours\s*<\/strong>\s*sont pointés|sont pointés ce mois|jours.{0,20}pointés ce mois/.test(txt) || /trop bas/.test(txt),
  "un pointage visiblement incomplet est signalé",
  "l'entretien se calcule sur les jours réels : sans avertissement, un mois mal pointé fait déclarer un montant trop bas sans que personne ne le voie");

dire(/prévues au contrat/.test(txt) && /lisser/.test(txt),
  "le document explique pourquoi ce sont les heures du contrat",
  "sans l'explication, la personne qui voit un écart avec son pointage croira à une erreur");

await N.close();
console.log(ko.length ? `\n${ko.length} problème(s) :\n` + ko.map((x) => "  - " + x).join("\n") + "\n"
  : "\nLe récapitulatif dit de déclarer la mensualisation, et le dit partout pareil.\n");
process.exit(ko.length ? 1 : 0);
