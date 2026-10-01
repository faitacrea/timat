// LA SEMAINE TYPE S'ADAPTE A L'AGE DE L'ENFANT.
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
  await p.route("**/rest/v1/**",r=>r.fulfill({status:200,contentType:"application/json",body:"[]"}));
  await p.route("**/auth/v1/token**",r=>r.fulfill({status:400,contentType:"application/json",body:'{"error":"x"}'}));
  await p.route("**/rest/v1/enfants**",r=>r.fulfill({status:200,contentType:"application/json",
    body:JSON.stringify([{id:"e1",prenom:"Léo",nom:"M",naissance,emoji:"🦁",actif:true,asmat_id:"demo",parent_id:"p1",allergies:[]}])}));
  await p.goto(`http://127.0.0.1:4173/?acces=${CLE}&connexion=1`,{waitUntil:"domcontentloaded"});
  await p.waitForTimeout(2300);
  await p.getByRole("button",{name:/^Se connecter$/}).first().click(); await p.waitForTimeout(500);
  await p.fill('input[type="email"]',"marie.dupont@mail.fr");
  await p.fill('input[type="password"]',"demonstration");
  await p.getByRole("button",{name:/Accéder à mon espace/}).click(); await p.waitForTimeout(2800);
  const passer=p.getByRole("button",{name:/^Passer$/}); if(await passer.isVisible().catch(()=>false)){await passer.click();await p.waitForTimeout(500);}
  await p.evaluate(()=>window.dispatchEvent(new CustomEvent("timat:page",{detail:"periscolaire"})));
  await p.waitForTimeout(1600);
  const t=(await p.locator("body").innerText());
  const creneaux=/Avant l'école|avant l'école|Midi|pause déjeuner/.test(t);
  const vacances=/Vacances scolaires|Toussaint/.test(t);
  const unSeulNom=!/périscolaire/i.test(t);
  const bon = creneaux===attenduCreneaux && vacances && unSeulNom;
  if(!bon)ko++;
  console.log(`  ${bon?"ok ":"KO "} ${libelle} : créneaux ${creneaux?"affichés":"masqués"} (attendu ${attenduCreneaux?"affichés":"masqués"}), vacances ${vacances?"présentes":"ABSENTES"}, mot « périscolaire » ${unSeulNom?"absent":"ENCORE LÀ"}`);
  await ctx.close();
}
await N.close();
console.log(ko?`\n${ko} problème(s)\n`:"\nL'écran s'adapte à l'âge, et ne porte plus qu'un seul nom.\n");
process.exit(ko?1:0);
