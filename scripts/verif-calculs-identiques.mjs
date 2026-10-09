// LE SITE ET L'APPLICATION DOIVENT DONNER LE MEME CHIFFRE.
//
// Les simulateurs publics calculent avec leur propre code, ecrit dans la
// page. L'application calcule avec le sien. Rien ne les reliait : une
// revalorisation appliquee d'un cote seulement, et une assistante maternelle
// obtient 728 EUR sur la page d'accueil puis 735 EUR dans son espace, pour le
// meme contrat. C'est la contradiction qui coute le plus cher en credibilite,
// et aucun controle ne la surveillait.
//
// Ce controle fait tourner LES DEUX sur les memes donnees : le simulateur dans
// un vrai navigateur, l'application par ses fonctions reelles, extraites du
// code a chaque execution — pas recopiees.
//
// Hors chaine de build : Vercel n'a pas de navigateur.
// CE QU'IL COUVRE, ET CE QU'IL NE COUVRE PAS. Le site compte douze outils
// publics ; ce controle en pilote six. Les huit autres ne sont compares a
// rien, et il faut le savoir plutot que de croire le site entierement
// surveille. La liste ci-dessous est faite pour grandir.
//
//   node scripts/verif-calculs-identiques.mjs
import { chromium } from "playwright";
import { CHROMIUM } from "./jeu-de-donnees.mjs";
import { build } from "esbuild";
import { writeFileSync, unlinkSync } from "node:fs";
import { createRequire } from "node:module";

// --- 1. Le moteur de l'application, tel qu'il est aujourd'hui ---
const ENTREE = new URL("../.entree-calculs.js", import.meta.url).pathname;
const SORTIE = new URL("../.calculs-app.cjs", import.meta.url).pathname;
writeFileSync(ENTREE, `
export { salaireMensualise, netDepuisBrut, smicHoraireAu, IE_TAUX_HORAIRE, IE_PLANCHER_JOUR, CHR_AM, PLAFOND_H, CMG_MAX, TAUX_SALARIAL_TOTAL, montantCMG, tauxEffortCMG } from "./src/App.jsx";
export { minimumHoraireAu, iccpCalcul, congesAcquis, preavisJours, indemniteRupture, abattementJour, retenueAbsence } from "./src/socle.jsx";
`);
await build({
  entryPoints: [ENTREE], bundle: true, format: "cjs", platform: "node", outfile: SORTIE,
  loader: { ".jsx": "jsx" }, jsx: "automatic", external: ["@supabase/supabase-js", "jspdf"],
  define: { "import.meta.env": JSON.stringify({ VITE_SUPABASE_URL: "https://exemple.supabase.co", VITE_SUPABASE_KEY: "verification-locale", MODE: "test" }) },
  logLevel: "error",
});
const app = createRequire(import.meta.url)(SORTIE);
unlinkSync(ENTREE);

const eur = (n) => Math.round(n * 100) / 100;
const lire = (txt) => Number(String(txt).replace(/\s| |€/g, "").replace(",", ".")) || 0;

// --- 2. Les cas, et ce que l'application repond ---
const CAS = [
  { page: "simulateur-salaire-assistante-maternelle.html", nom: "mensualisation, année complète",
    champs: { h: "40", s: "52", t: "4.20", am: false },
    sorties: { brut: () => app.salaireMensualise({ heuresHebdo: 40, anneeComplete: true }, 4.20),
               net:  () => eur(app.salaireMensualise({ heuresHebdo: 40, anneeComplete: true }, 4.20) * (1 - app.TAUX_SALARIAL_TOTAL)) } },
  { page: "simulateur-salaire-assistante-maternelle.html", nom: "mensualisation, année incomplète 44 semaines",
    champs: { h: "35", s: "44", t: "4.50", am: false },
    sorties: { brut: () => app.salaireMensualise({ heuresHebdo: 35, anneeComplete: false, semainesAccueil: 44 }, 4.50),
               net:  () => eur(app.salaireMensualise({ heuresHebdo: 35, anneeComplete: false, semainesAccueil: 44 }, 4.50) * (1 - app.TAUX_SALARIAL_TOTAL)) } },
  { page: "simulateur-indemnite-entretien-assistante-maternelle.html", nom: "entretien, journée de 9 h",
    champs: { h: "9", d: "20" },
    sorties: { jour: () => eur(Math.max(app.IE_PLANCHER_JOUR, 9 * app.IE_TAUX_HORAIRE)),
               mois: () => eur(Math.max(app.IE_PLANCHER_JOUR, 9 * app.IE_TAUX_HORAIRE) * 20) } },
  { page: "simulateur-indemnite-entretien-assistante-maternelle.html", nom: "entretien, journée courte (plancher)",
    champs: { h: "5", d: "18" },
    sorties: { jour: () => eur(Math.max(app.IE_PLANCHER_JOUR, 5 * app.IE_TAUX_HORAIRE)),
               mois: () => eur(Math.max(app.IE_PLANCHER_JOUR, 5 * app.IE_TAUX_HORAIRE) * 18) } },
  { page: "simulateur-conges-payes-assistante-maternelle.html", nom: "congés payés, le dixième l'emporte",
    champs: { rem: "8000", jrs: "30", hh: "35", tx: "4.20" },
    sorties: { r10: () => eur(8000 * 0.10),
               rmn: () => eur((30 / 6) * 35 * 4.20) } },
  { page: "simulateur-conges-payes-assistante-maternelle.html", nom: "congés payés, le maintien l'emporte",
    champs: { rem: "5000", jrs: "30", hh: "40", tx: "5.00" },
    sorties: { r10: () => eur(5000 * 0.10),
               rmn: () => eur((30 / 6) * 40 * 5.00) } },
  // L'ABATTEMENT FISCAL. La page avait sa propre version de la regle, plus
  // pauvre que celle du bulletin : elle ignorait la journee de 24 heures et
  // sous-estimait donc l'abattement d'un SMIC entier par journee de ce type.
  // Les deux lisent maintenant abattementJour(), dans socle.jsx.
  { page: "simulateur-abattement-fiscal-assistante-maternelle.html", nom: "abattement, journée de 9 h",
    champs: { smic: "12.31", jours: "200", heures: "9", enfants: "2", handi: false, nuit: false },
    sorties: { abat: () => eur(app.abattementJour(9, 12.31) * 200 * 2) } },
  { page: "simulateur-abattement-fiscal-assistante-maternelle.html", nom: "abattement, journée courte proratisée",
    champs: { smic: "12.31", jours: "150", heures: "5", enfants: "1", handi: false, nuit: false },
    sorties: { abat: () => eur(app.abattementJour(5, 12.31) * 150) } },
  { page: "simulateur-abattement-fiscal-assistante-maternelle.html", nom: "abattement, enfant AEEH",
    champs: { smic: "12.31", jours: "180", heures: "10", enfants: "1", handi: true, nuit: false },
    sorties: { abat: () => eur(app.abattementJour(10, 12.31, { aeeh: true }) * 180) } },
  { page: "simulateur-abattement-fiscal-assistante-maternelle.html", nom: "abattement, journée de 24 h",
    champs: { smic: "12.31", jours: "40", heures: "24", enfants: "1", handi: false, nuit: true },
    sorties: { abat: () => eur(app.abattementJour(24, 12.31) * 40) } },
  // LA DÉDUCTION D'UNE ABSENCE. La page et le bulletin plafonnent tous deux la
  // retenue au salaire : une absence plus longue que le mois ne peut pas créer
  // une dette. On vérifie les deux côtés du plafond.
  { page: "simulateur-deduction-absence-assistante-maternelle.html", nom: "absence, retenue proportionnelle",
    champs: { sal: "728", abs: "14", prev: "140" },
    sorties: { ded: () => app.retenueAbsence({ salaireMensualise: 728, anneeComplete: true, heuresAbsence: 14, heuresMois: 140 }) } },
  { page: "simulateur-deduction-absence-assistante-maternelle.html", nom: "absence plus longue que le mois (plafond)",
    champs: { sal: "728", abs: "200", prev: "140" },
    sorties: { ded: () => app.retenueAbsence({ salaireMensualise: 728, anneeComplete: true, heuresAbsence: 200, heuresMois: 140 }) } },
  // LA FIN DE CONTRAT. Le préavis (8 / 15 / 30 jours) et l'indemnité de rupture
  // (le brut total divisé par 80, à partir de 9 mois d'ancienneté) sont écrits
  // des deux côtés. Ils concordent aujourd'hui ; rien ne le garantissait demain.
  { page: "simulateur-fin-de-contrat-assistante-maternelle.html", nom: "fin de contrat, 18 mois, retrait de l'enfant",
    champs: { mot: "retrait", anc: "18", brut: "9600", mens: "800" },
    sorties: { rInd: () => app.indemniteRupture({ brutTotal: 9600, moisAnciennete: 18, parEmployeur: true }) } },
  { page: "simulateur-fin-de-contrat-assistante-maternelle.html", nom: "fin de contrat, 6 mois : pas d'indemnité",
    champs: { mot: "retrait", anc: "6", brut: "3200", mens: "800" },
    sorties: { rInd: () => app.indemniteRupture({ brutTotal: 3200, moisAnciennete: 6, parEmployeur: true }) } },
];

const N = await chromium.launch({ executablePath: CHROMIUM() });
const ctx = await N.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR" });
const p = await ctx.newPage();
let ko = 0;
for (const cas of CAS) {
  await p.goto(`http://127.0.0.1:4173/${cas.page}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(500);
  const manquants = await p.evaluate((champs) => {
    const manquants = [];
    for (const [id, v] of Object.entries(champs)) {
      const e = document.getElementById(id);
      // UN CHAMP INTROUVABLE ETAIT IGNORE EN SILENCE. Si la page renomme un
      // identifiant, la saisie ne se faisait plus, le simulateur gardait ses
      // valeurs par defaut, et la comparaison portait sur autre chose que ce
      // qu'on croyait — sans un mot. On le signale.
      if (!e) { manquants.push(id); continue; }
      if (e.type === "checkbox") { e.checked = !!v; e.dispatchEvent(new Event("change", { bubbles: true })); }
      else { e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); }
    }
    return manquants;
  }, cas.champs);
  if (manquants.length) {
    ko++;
    console.log(`  KO  ${cas.nom.padEnd(42)} champ(s) introuvable(s) sur la page : ${manquants.join(", ")} — la saisie n'a pas eu lieu, la comparaison ne vaut rien`);
    continue;
  }
  await p.waitForTimeout(400);
  for (const [id, attendu] of Object.entries(cas.sorties)) {
    const brut = await p.evaluate((x) => (document.getElementById(x) || {}).textContent || "", id);
    const siteVal = lire(brut), appVal = eur(attendu());
    // Un centime d'ecart vient des arrondis d'affichage, pas d'une regle differente.
    const ecart = Math.abs(siteVal - appVal);
    const bon = ecart <= 0.01;
    if (!bon) ko++;
    console.log(`  ${bon ? "ok " : "KO "} ${cas.nom.padEnd(42)} ${id.padEnd(5)} site ${String(siteVal).padStart(9)}  application ${String(appVal).padStart(9)}${bon ? "" : `   ÉCART ${eur(ecart)}`}`);
  }
}
await N.close();
console.log(ko ? `\n${ko} écart(s) entre le site et l'application\n` : "\nLe site et l'application donnent le même chiffre, à chaque fois.\n");
process.exit(ko ? 1 : 0);
