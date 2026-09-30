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
const CLE=(readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)||[])[1];
const N=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome"});
const ctx=await N.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
const p=await ctx.newPage();
let ko=0, err=[];
p.on("pageerror",e=>err.push(e.message.slice(0,120)));
await p.route("**/auth/v1/token**",r=>r.fulfill({status:400,contentType:"application/json",body:'{"error":"x"}'}));
await p.route("**/rest/v1/**",r=>r.fulfill({status:200,contentType:"application/json",body:"[]"}));
await p.goto(`http://127.0.0.1:4173/?acces=${CLE}&connexion=1`,{waitUntil:"domcontentloaded"});
await p.waitForTimeout(2200);
await p.getByRole("button",{name:/^Se connecter$/}).first().click(); await p.waitForTimeout(500);
await p.fill('input[type="email"]',"marie.dupont@mail.fr");
await p.fill('input[type="password"]',"demonstration");
await p.getByRole("button",{name:/Accéder à mon espace/}).click(); await p.waitForTimeout(2800);
const passer=p.getByRole("button",{name:/^Passer$/}); if(await passer.isVisible().catch(()=>false)){await passer.click();await p.waitForTimeout(500);}
const clic=(t)=>p.evaluate(x=>{const n=[...document.querySelectorAll("button")].find(b=>b.innerText.replace(/\s+/g," ").trim().includes(x));if(n){n.click();return true}return false;},t);

for (const [page,onglet,attendu,libelle] of [
  ["suivi_progres","Bilans",/forfait Pro|Bilans/,"les bilans s'ouvrent dans « Suivi & Progrès »"],
  ["sante_urgence","Registre médicaments",/[Rr]egistre|médicament/,"le registre s'ouvre dans « Santé & Urgence »"],
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
// Le registre, lui, est une obligation legale : il ne doit JAMAIS etre verrouille.
await p.evaluate(()=>window.dispatchEvent(new CustomEvent("timat:page",{detail:"sante_urgence"})));
await p.waitForTimeout(900); await clic("Registre médicaments"); await p.waitForTimeout(1400);
const t2=(await p.locator("body").innerText());
const libre=!/forfait Pro/.test(t2);
if(!libre)ko++;
console.log(`  ${libre?"ok ":"KO "} le registre reste gratuit — c'est une obligation légale`);
await N.close();
console.log(ko?`\n${ko} problème(s)\n`:"\nLes deux fusions tiennent.\n");
process.exit(ko?1:0);
