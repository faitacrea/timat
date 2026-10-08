// LE PLANNING PERISCOLAIRE S'ADAPTE A L'AGE DE L'ENFANT.
//
// Les creneaux matin / midi / soir decrivent l'accueil AUTOUR DE L'ECOLE. Pour
// un enfant qui n'y va pas encore, ils ne veulent rien dire : il est la toute
// la journee, et c'est le contrat qui le dit. Les afficher quand meme revenait
// a demander de cocher des cases sans objet — c'est ce qui rendait l'ecran
// incomprehensible.
//
// Hors chaine de build : Vercel n'a pas de navigateur.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { BRANCHER, BUNDLE_TESTABLE, ATTENDRE_PRET, DANS_L_APP } from "./jeu-de-donnees.mjs";
const CLE=(readFileSync(new URL("../src/App.jsx", import.meta.url),"utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)||[])[1];
const N=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome"});
let ko=0;
// Un enfant de 14 mois et un de 5 ans : les deux cas que l'ecran doit distinguer.
for (const [libelle, naissance, attenduCreneaux] of [
  ["un enfant de 14 mois", "2025-07-15", false],
  ["un enfant de 5 ans",   "2020-06-10", true],
]) {
  const ctx=await N.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
  const p=await ctx.newPage();
  // LA BASE ET LA SESSION, DEPUIS LE JEU DE DONNÉES PARTAGÉ.
  // Ce contrôle doublait « rest/v1 » par « [] » et se connectait en
  // démonstration : l'application ne trouvait aucun profil, et la connexion
  // s'arrêtait sur « Votre compte n'a pas pu être chargé ». Tout ce qu'il
  // déclarait « ok » était mesuré derrière cette carte d'erreur.
  await BRANCHER(p,"asmat",CLE);
  await p.route("**/rest/v1/enfants**",r=>r.fulfill({status:200,contentType:"application/json",
    body:JSON.stringify([{id:"e1",prenom:"Léo",nom:"M",naissance,emoji:"🦁",actif:true,asmat_id:"demo",parent_id:"p1",allergies:[]}])}));
  await p.goto(`http://127.0.0.1:4173/?acces=${CLE}&connexion=1`,{waitUntil:"domcontentloaded"});
  await p.waitForTimeout(2300);
  if(!await BUNDLE_TESTABLE(p)){await N.close();process.exit(1);}
  await ATTENDRE_PRET(p,2200);
  const passer=p.getByRole("button",{name:/^Passer$/}); if(await passer.isVisible().catch(()=>false)){await passer.click();await p.waitForTimeout(500);}
  if(!await DANS_L_APP(p,"le contrôle de la semaine type")){await N.close();process.exit(1);}
  await p.evaluate(()=>window.dispatchEvent(new CustomEvent("timat:page",{detail:"periscolaire"})));
  await p.waitForTimeout(1600);
  const t=(await p.locator("body").innerText());
  const creneaux=/Avant l'école|avant l'école|Midi|pause déjeuner/.test(t);
  const vacances=/Vacances scolaires|Toussaint/.test(t);
  // Le nom affiche en haut de l'ecran (l'egalite avec le libelle de l'onglet
  // est verifiee par la barriere « intitules » et par verif-onglets-fusionnes).
  const memeNom=/Planning périscolaire/.test(t);
  const explication=/À quoi sert cet écran/.test(t);
  const bon = creneaux===attenduCreneaux && vacances && memeNom && explication;
  if(!bon)ko++;
  console.log(`  ${bon?"ok ":"KO "} ${libelle} : créneaux ${creneaux?"affichés":"masqués"} (attendu ${attenduCreneaux?"affichés":"masqués"}), vacances ${vacances?"présentes":"ABSENTES"}, onglet et titre ${memeNom?"identiques":"DIFFÉRENTS"}, explication ${explication?"présente":"ABSENTE"}`);
  await ctx.close();
}
await N.close();
console.log(ko?`\n${ko} problème(s)\n`:"\nL'écran s'adapte à l'âge, porte le même nom que son onglet, et s'explique.\n");
process.exit(ko?1:0);
