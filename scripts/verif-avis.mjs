// LA SECTION DES AVIS NE PUBLIE QUE DE VRAIS AVIS, COMPLETS.
//
// Quatre temoignages inventes etaient ecrits dans le code et s'affichaient sur
// la page publique alors que l'application n'avait aucune utilisatrice. La
// section est conservee — elle se remplit depuis le back-office le jour ou de
// vrais avis arrivent — mais trois choses doivent tenir, et une seule qui lache
// suffit a publier un faux avis :
//   1. aucun avis en reserve  -> la section ne s'affiche pas du tout ;
//   2. un avis a moitie rempli -> il n'est pas affiche ;
//   3. un avis complet         -> il s'affiche, lui et lui seul.
//
// Hors chaine de build : Vercel n'a pas de navigateur.
//   node scripts/verif-avis.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { BUNDLE_TESTABLE, CHROMIUM, ATTENDRE_PRET } from "./jeu-de-donnees.mjs";
const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];

const N = await chromium.launch({ executablePath: CHROMIUM() });
let ko = 0;
// Le back-office enregistre la configuration de la landing : on la lui sert.
const CAS = [
  ["aucun avis", [], { section: false }],
  ["un avis sans texte", [{ nom: "Nouveau", ville: "Ville", avant: "", apres: "" }], { section: false }],
  ["un avis sans nom", [{ nom: "", ville: "Lyon", avant: "a", apres: "Un vrai témoignage." }], { section: false }],
  ["un avis complet et un incomplet",
    [{ nom: "Nouveau", ville: "Ville", avant: "", apres: "" },
     { nom: "Claire B.", ville: "Nantes", avant: "Avant", avantTxt: "", apres: "Mon récap est prêt en cinq minutes." }],
    { section: true, visible: ["Claire B."], invisible: ["Nouveau"] }],
];

for (const [libelle, avis, attendu] of CAS) {
  const ctx = await N.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  const p = await ctx.newPage();
  if (process.env.DUMP) p.on("console", (m) => { if (/TiMat config/.test(m.text())) console.log("      [page]", m.text()); });
  // La configuration publique vient d'une table Supabase : on repond a sa place.
  // PLAYWRIGHT ESSAIE LA DERNIERE ROUTE ENREGISTREE EN PREMIER. La regle
  // generale doit donc etre posee AVANT la regle precise, sinon elle l'avale
  // et app_config repond « [] » : la page prend ses valeurs par defaut et le
  // controle passe au vert sans avoir rien teste.
  await p.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  // loadConfig() lit app_config, ligne « main », colonne « config », en
  // .maybeSingle() : la reponse attendue est UN objet, pas un tableau.
  await p.route("**/rest/v1/app_config*", (r) => r.fulfill({ status: 200, contentType: "application/json",
    headers: { "Content-Range": "0-0/1" },
    body: JSON.stringify({ config: { testimonials: avis, sectionsVisibles: { temoignages: true } } }) }));
  await p.goto(`http://127.0.0.1:4173/?acces=${CLE}`, { waitUntil: "domcontentloaded" });
  // LE PIÈGE DU BUNDLE SANS CLÉ : « npm run build » construit sans
  // VITE_SUPABASE_KEY, l'application retombe alors sur la page vitrine sans
  // un mot, et ce contrôle rendrait un KO qui n'existe pas. verif-avis a
  // accusé un code sain pour cette raison exacte.
  if(!await BUNDLE_TESTABLE(p)){await N.close();process.exit(1);}
  await ATTENDRE_PRET(p);
  const t = await p.locator("body").innerText();
  const etoiles = (t.match(/⭐⭐⭐⭐⭐/g) || []).length;
  const soucis = [];
  if (attendu.section && etoiles === 0) soucis.push("la section n'apparaît pas alors qu'un avis complet existe");
  if (!attendu.section && etoiles > 0) soucis.push(`la section affiche ${etoiles} avis alors qu'aucun n'est publiable`);
  for (const v of attendu.visible || []) if (!t.includes(v)) soucis.push(`« ${v} » devrait être affiché`);
  for (const v of attendu.invisible || []) if (t.includes(v)) soucis.push(`« ${v} » est publié alors que sa fiche est incomplète`);
  if (soucis.length) ko++;
  console.log(`  ${soucis.length ? "KO " : "ok "} ${libelle.padEnd(34)}${soucis.join(" · ") || `${etoiles} avis affiché(s)`}`);
  await ctx.close();
}
await N.close();
console.log(ko ? `\n${ko} problème(s)\n` : "\nSeuls de vrais avis complets peuvent s'afficher.\n");
process.exit(ko ? 1 : 0);
