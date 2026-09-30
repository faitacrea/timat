// LE FILET SOUS LES ECRANS CHARGES A LA DEMANDE.
//
// On simule ce qui arrive a un onglet reste ouvert pendant une mise en ligne :
// le fichier de code d'un ecran n'existe plus sur le serveur. Avant le filet,
// React demontait toute l'application — page blanche, sans un mot.
//
// Hors chaine de build : Vercel n'a pas de navigateur.
//   node scripts/verif-filet-ecrans.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const CLE=(readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)||[])[1];
const N=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome"});
// Le service worker sert /assets/ depuis son cache et court-circuiterait
// l'interception : on le desactive pour que le test porte bien sur le reseau.
const ctx=await N.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
const p=await ctx.newPage();
// On neutralise le rechargement automatique des le premier script de la page,
// sinon elle repart et on ne voit jamais le message.
await p.addInitScript(()=>{ try{ sessionStorage.setItem("timat:rechargeApresEchec","1"); }catch(e){} });
// Le fichier des ecrans de gestion (paie, contrats) est introuvable, comme
// apres une mise en ligne qui a renouvele les empreintes.
// Tous les fichiers d'ecrans sont introuvables. Seuls le noyau et le socle
// repondent — de quoi se connecter, et rien de plus.
await p.route("**/assets/*.js",r=>{
  const n=r.request().url().split("/").pop();
  if(/^(index|socle)-/.test(n)) return r.continue();
  return r.fulfill({status:404,body:"introuvable"});
});
await p.route("**/auth/v1/token**",r=>r.fulfill({status:400,contentType:"application/json",body:'{"error":"x"}'}));
await p.route("**/rest/v1/**",r=>r.fulfill({status:200,contentType:"application/json",body:"[]"}));
await p.goto(`http://localhost:4173/?acces=${CLE}&connexion=1`,{waitUntil:"domcontentloaded"});
await p.waitForTimeout(2200);
await p.getByRole("button",{name:/^Se connecter$/}).first().click(); await p.waitForTimeout(500);
await p.fill('input[type="email"]',"marie.dupont@mail.fr");
await p.fill('input[type="password"]',"demonstration");
await p.getByRole("button",{name:/Accéder à mon espace/}).click(); await p.waitForTimeout(2800);
const passer=p.getByRole("button",{name:/^Passer$/}); if(await passer.isVisible().catch(()=>false)){await passer.click();await p.waitForTimeout(500);}

// A partir de maintenant, tout fichier d'ecran demande repond 404, comme apres
// une mise en ligne. On neutralise aussi le rechargement automatique, sinon la
// page repart et on ne voit jamais le message.

let ko=0;
await p.evaluate(()=>window.dispatchEvent(new CustomEvent("timat:page",{detail:"paie_contrats"})));
await p.waitForTimeout(2500);
const t=(await p.locator("body").innerText()).trim();
const blanc=t.length<40;
const message=/n'a pas pu s'ouvrir/.test(t);
const bouton=await p.getByRole("button",{name:/Recharger l'application/}).isVisible().catch(()=>false);
const menu=/Accueil/.test(t);
if(blanc){console.log("  KO  la page est blanche — le filet n'a pas joué");ko++;}
else {
  console.log(`  ${message?"ok ":"KO "} un message explique au lieu d'une page blanche`);
  console.log(`  ${bouton?"ok ":"KO "} un bouton « Recharger l'application » est proposé`);
  console.log(`  ${menu?"ok ":"KO "} le reste de l'application tient debout (menu visible)`);
  if(!message||!bouton||!menu)ko++;
}
console.log(ko?`\n${ko} problème(s)\n`:"\nLe filet attrape l'échec : plus de page blanche.\n");
await N.close();
process.exit(ko?1:0);
