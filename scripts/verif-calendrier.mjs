// LE CALENDRIER AFFICHE-T-IL VRAIMENT LES VACANCES ET LES FERIES ?
//
// Les tests de scripts/test-periscolaire.mjs verifient les DONNEES. Celui-ci
// verifie ce qu'une utilisatrice VOIT, dans un vrai navigateur — parce que le
// defaut d'origine n'etait pas une donnee fausse mais un ecran muet : pendant
// deux ans, le calendrier n'a affiche ni vacances ni jours feries, et aucun
// test de donnees ne l'aurait dit.
//
// Il ne fait PAS partie de « npm run build » : Vercel n'a pas de navigateur.
// Il se lance a la main, apres « npx vite preview --port 4173 » :
//   node scripts/verif-calendrier.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const CLE=(readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)||[])[1];
let ko=0;
const N=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome"});
const p=await N.newPage({viewport:{width:390,height:844}});
await p.route("**/auth/v1/token**",r=>r.fulfill({status:400,contentType:"application/json",body:'{"error":"invalid_grant"}'}));
await p.route("**/rest/v1/**",r=>r.fulfill({status:200,contentType:"application/json",body:"[]"}));
await p.goto(`http://localhost:4173/?acces=${CLE}&connexion=1`,{waitUntil:"domcontentloaded"});
await p.waitForTimeout(2500);
await p.getByRole("button",{name:/^Se connecter$/}).first().click(); await p.waitForTimeout(600);
await p.fill('input[type="email"]',"marie.dupont@mail.fr");
await p.fill('input[type="password"]',"demonstration");
await p.getByRole("button",{name:/Accéder à mon espace/}).click(); await p.waitForTimeout(3000);
const passer=p.getByRole("button",{name:/^Passer$/}); if(await passer.isVisible().catch(()=>false)){await passer.click();await p.waitForTimeout(600);}
const clic=(t)=>p.evaluate((x)=>{const n=[...document.querySelectorAll("button")].find(b=>b.innerText.replace(/\s+/g," ").trim().includes(x));if(n){n.click();return true}return false},t);
await clic("Administratif"); await p.waitForTimeout(600);
await clic("Calendrier"); await p.waitForTimeout(1800);
// Avancer jusqu'a octobre 2026 (vacances de la Toussaint) puis novembre (ferie).
for(const [mois,attendu] of [["Octobre 2026",/Toussaint/],["Novembre 2026",/Armistice|Toussaint/]]){
  for(let i=0;i<14;i++){
    const t=await p.locator("body").innerText();
    if(t.includes("Événements de "+mois))break;
    await p.evaluate(()=>{const b=[...document.querySelectorAll("button")].filter(x=>x.innerText.trim()==="›");b[b.length-1]?.click();});
    await p.waitForTimeout(220);
  }
  const t=await p.locator("body").innerText();
  const vu=attendu.test(t);
  if(!vu)ko++;
  console.log(`  ${vu?"ok ":"KO "} ${mois} : ${vu?"affiché":"RIEN AFFICHÉ"}`);
}
const t=await p.locator("body").innerText();
console.log("zone annoncée :", (t.match(/zone [ABC]/i)||["(aucune)"])[0]);
await N.close();
console.log(ko?`\n${ko} problème(s)\n`:"\nLe calendrier affiche bien les vacances et les fériés.\n");
process.exit(ko?1:0);
