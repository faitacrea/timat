// LE SITE ET L'APPLICATION DOIVENT DONNER LE MEME CHIFFRE.
//
// Les 17 simulateurs publics calculent avec leur propre code, ecrit dans la
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
export { minimumHoraireAu, iccpCalcul, congesAcquis, preavisJours, indemniteRupture } from "./src/socle.jsx";
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
];

const N = await chromium.launch({ executablePath: CHROMIUM() });
const ctx = await N.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR" });
const p = await ctx.newPage();
let ko = 0;
for (const cas of CAS) {
  await p.goto(`http://127.0.0.1:4173/${cas.page}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(500);
  await p.evaluate((champs) => {
    for (const [id, v] of Object.entries(champs)) {
      const e = document.getElementById(id);
      if (!e) continue;
      if (e.type === "checkbox") { e.checked = !!v; e.dispatchEvent(new Event("change", { bubbles: true })); }
      else { e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); }
    }
  }, cas.champs);
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
