// LE BASCULE DE L'HABILITATION PAJEMPLOI, VU DANS UN VRAI NAVIGATEUR.
//
// L'ecran de mandat ne doit apparaitre QUE lorsque l'identifiant client URSSAF
// est renseigne au back-office. Ce test a trouve deux defauts qu'aucune
// relecture n'avait vus :
//   1. « G.config » valait undefined — G EST la configuration — donc l'ecran
//      restait masque quoi qu'on regle.
//   2. Le calcul du menu passait par un useMemo pose APRES des retours
//      anticipes : React comptait un nombre de hooks different d'un rendu a
//      l'autre, jetait l'erreur #310, et VIDAIT LA PAGE ENTIERE.
//
// Il ne fait PAS partie de « npm run build » : Vercel n'a pas de navigateur.
// Se lance a la main, apres « npx vite preview --port 4173 » :
//   node scripts/verif-bascule-pajemploi.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { BRANCHER, BUNDLE_TESTABLE, ATTENDRE_PRET, DANS_L_APP } from "./jeu-de-donnees.mjs";
const CLE=(readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)||[])[1];
const N=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome"});
let ko=0;
for(const [libelle, clientId, attendu] of [["sans identifiant","",false],["avec un identifiant","demo-urssaf",true]]){
  const p=await N.newPage({viewport:{width:390,height:844}});
  p.on("pageerror",e=>{console.log("      [ERREUR JS]",e.message.slice(0,160));ko++;});
  // Playwright applique la DERNIERE route declaree en premier : la regle
  // generale doit donc etre posee AVANT la specifique, sinon elle l'ecrase.
  // LA BASE ET LA SESSION, DEPUIS LE JEU DE DONNÉES PARTAGÉ.
  // Ce contrôle doublait « rest/v1 » par « [] » et se connectait en
  // démonstration : l'application ne trouvait aucun profil, et la connexion
  // s'arrêtait sur « Votre compte n'a pas pu être chargé ». Tout ce qu'il
  // déclarait « ok » était mesuré derrière cette carte d'erreur.
  await BRANCHER(p,"asmat",CLE);
  await p.route("**/rest/v1/app_config**",r=>r.fulfill({status:200,contentType:"application/json",
    body:JSON.stringify({config:{pajemploi:{clientId}}})}));
  await p.goto(`http://localhost:4173/?acces=${CLE}&connexion=1`,{waitUntil:"domcontentloaded"});
  await p.waitForTimeout(2500);
  if(!await BUNDLE_TESTABLE(p)){await N.close();process.exit(1);}
  await ATTENDRE_PRET(p,2200);
  const passer=p.getByRole("button",{name:/^Passer$/}); if(await passer.isVisible().catch(()=>false)){await passer.click();await p.waitForTimeout(600);}
  if(!await DANS_L_APP(p,"le contrôle de la bascule Pajemploi")){await N.close();process.exit(1);}
  const ouvert=await p.evaluate(()=>{const n=[...document.querySelectorAll("button")].find(b=>b.innerText.replace(/\s+/g," ").trim().includes("Administratif"));if(n){n.click();return true}return false;});
  if(!ouvert){console.log("  KO  le menu « Administratif » est introuvable");ko++;}
  await p.waitForTimeout(1200);
  // On interroge les BOUTONS, pas le texte du corps : le sous-menu se rend
  // dans un panneau superpose que innerText ne rapporte pas toujours.
  const entrees=await p.evaluate(()=>[...document.querySelectorAll("button")]
    .map(b=>b.innerText.replace(/\s+/g," ").trim()).filter(Boolean));
  const vu=entrees.some(e=>/Déclaration Pajemploi/.test(e));
  const bon = vu===attendu;
  if(!bon)ko++;
  console.log(`  ${bon?"ok ":"KO "} ${libelle} : l'écran est ${vu?"visible":"masqué"} (attendu ${attendu?"visible":"masqué"})`);
  await p.close();
}
await N.close();
console.log(ko?`\n${ko} problème(s)\n`:"\nLe bascule de l'habilitation fonctionne dans les deux sens.\n");
process.exit(ko?1:0);
