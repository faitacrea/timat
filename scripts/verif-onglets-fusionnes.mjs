// LES DEUX ONGLETS FUSIONNES.
//
// Les bilans ont rejoint « Suivi & Progres » et le registre des medicaments
// « Sante & Urgence ». Deux choses doivent tenir, et une seule qui lache suffit
// a faire un defaut : les onglets s'ouvrent, et le verrou Pro s'applique aux
// bilans — l'ecran qui les accueille etant gratuit, sans verrou le forfait se
// contournerait d'un clic.
//
// Hors chaine de build : Vercel n'a pas de navigateur.
//   node scripts/verif-onglets-fusionnes.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { CHROMIUM, BRANCHER, BUNDLE_TESTABLE, ATTENDRE_PRET, DANS_L_APP } from "./jeu-de-donnees.mjs";
const CLE=(readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)||[])[1];
const N=await chromium.launch({executablePath: CHROMIUM()});
const ctx=await N.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
const p=await ctx.newPage();
let ko=0, err=[];
p.on("pageerror",e=>err.push(e.message.slice(0,120)));
// LA BASE ET LA SESSION, DEPUIS LE JEU DE DONNÉES PARTAGÉ.
// Ce contrôle doublait « rest/v1 » par « [] » et se connectait en
// démonstration : l'application ne trouvait aucun profil, et la connexion
// s'arrêtait sur « Votre compte n'a pas pu être chargé ». Tout ce qu'il
// déclarait « ok » était mesuré derrière cette carte d'erreur.
// On sert un profil GRATUIT : ce contrôle vérifie justement que le mur du
// forfait Pro s'affiche. Le jeu de données est « pro » par défaut.
await BRANCHER(p,"asmat",CLE,{subscription_status:"free"});
await p.goto(`http://127.0.0.1:4173/?acces=${CLE}&connexion=1`,{waitUntil:"domcontentloaded"});
await p.waitForTimeout(2200);
if(!await BUNDLE_TESTABLE(p)){await N.close();process.exit(1);}
await ATTENDRE_PRET(p,2200);
const passer=p.getByRole("button",{name:/^Passer$/}); if(await passer.isVisible().catch(()=>false)){await passer.click();await p.waitForTimeout(500);}
if(!await DANS_L_APP(p,"le contrôle des onglets fusionnés")){await N.close();process.exit(1);}
const clic=(t)=>p.evaluate(x=>{const n=[...document.querySelectorAll("button")].find(b=>b.innerText.replace(/\s+/g," ").trim().includes(x));if(n){n.click();return true}return false;},t);

for (const [page,onglet,attendu,libelle] of [
  ["suivi_progres","Bilans",/forfait Pro|Bilans/,"les bilans s'ouvrent dans « Suivi & Progrès »"],
  ["sante_urgence","Registre des médicaments",/[Rr]egistre|médicament/,"le registre s'ouvre dans « Santé & Urgence »"],
  // On clique « Planning périscolaire » : le titre de l'ecran doit porter le meme nom.
  ["calendrier","Planning périscolaire",/Planning périscolaire/,"le planning périscolaire s'ouvre dans « Calendrier » sous le même nom"],
]) {
  err=[];
  await p.evaluate(x=>window.dispatchEvent(new CustomEvent("timat:page",{detail:x})),page);
  await p.waitForTimeout(1200);
  const trouve=await clic(onglet);
  await p.waitForTimeout(1600);
  const t=(await p.locator("body").innerText()).trim();
  const bon = trouve && attendu.test(t) && t.length>60 && !err.length;
  if(!bon)ko++;
  console.log(`  ${bon?"ok ":"KO "} ${libelle}${err.length?"  ERREUR: "+err[0]:""}${trouve?"":"  (onglet introuvable)"}`);
}
// Le compte de demonstration est gratuit : les bilans doivent montrer le verrou.
await p.evaluate(()=>window.dispatchEvent(new CustomEvent("timat:page",{detail:"suivi_progres"})));
await p.waitForTimeout(900); await clic("Bilans"); await p.waitForTimeout(1400);
const t=(await p.locator("body").innerText());
const verrou=/forfait Pro/.test(t);
if(!verrou)ko++;
console.log(`  ${verrou?"ok ":"KO "} un compte gratuit voit le verrou Pro sur les bilans`);
// Le projet d'accueil a rejoint les documents : il doit s'y ouvrir, et rester
// gratuit pour l'assistante maternelle alors que l'onglet voisin est Pro.
await p.evaluate(()=>window.dispatchEvent(new CustomEvent("timat:page",{detail:"documents_rapports"})));
await p.waitForTimeout(1100); const trouveProjet=await clic("Projet d'accueil"); await p.waitForTimeout(1500);
const tp=(await p.locator("body").innerText());
const projetOk = trouveProjet && !/forfait Pro/.test(tp) && tp.length>120;
if(!projetOk)ko++;
console.log(`  ${projetOk?"ok ":"KO "} le projet d'accueil s'ouvre dans « Documents » et reste gratuit`);

// Le registre, lui, est une obligation legale : il ne doit JAMAIS etre verrouille.
await p.evaluate(()=>window.dispatchEvent(new CustomEvent("timat:page",{detail:"sante_urgence"})));
await p.waitForTimeout(900); await clic("Registre des médicaments"); await p.waitForTimeout(1400);
const t2=(await p.locator("body").innerText());
const libre=!/forfait Pro/.test(t2);
if(!libre)ko++;
console.log(`  ${libre?"ok ":"KO "} le registre reste gratuit — c'est une obligation légale`);
await N.close();
console.log(ko?`\n${ko} problème(s)\n`:"\nLes deux fusions tiennent.\n");
process.exit(ko?1:0);
