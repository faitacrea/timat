// LE PROJET D'ACCUEIL, COTE PARENT.
//
// Il a quitte « Mon enfant » pour rejoindre « Documents & Attestations ». Cote
// assistante maternelle il vit dans VueDocsRapports, cote parent dans
// DocumentsComplet : deux endroits differents, pour que personne ne le voie
// deux fois. Ce test verifie le second — le premier est couvert par
// scripts/verif-onglets-fusionnes.mjs.
//
// Hors chaine de build : Vercel n'a pas de navigateur.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const CLE=(readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)||[])[1];
const N=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome"});
const ctx=await N.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
const p=await ctx.newPage();
await p.route("**/auth/v1/token**",r=>r.fulfill({status:400,contentType:"application/json",body:'{"error":"x"}'}));
await p.route("**/rest/v1/**",r=>r.fulfill({status:200,contentType:"application/json",body:"[]"}));
await p.goto(`http://127.0.0.1:4173/?acces=${CLE}&connexion=1`,{waitUntil:"domcontentloaded"});
await p.waitForTimeout(2500);
await p.getByRole("button",{name:/^Se connecter$/}).first().click(); await p.waitForTimeout(600);
await p.fill('input[type="email"]',"sophie.martin@mail.fr");
await p.fill('input[type="password"]',"demonstration");
await p.getByRole("button",{name:/Accéder à mon espace/}).click(); await p.waitForTimeout(3000);
const passer=p.getByRole("button",{name:/^Passer$/}); if(await passer.isVisible().catch(()=>false)){await passer.click();await p.waitForTimeout(600);}
const clic=(t)=>p.evaluate(x=>{const n=[...document.querySelectorAll("button")].find(b=>b.innerText.replace(/\s+/g," ").trim().includes(x));if(n){n.click();return true}return false;},t);
console.log("   menu Administratif :", await clic("Administratif")); await p.waitForTimeout(700);
console.log("   entrée Documents   :", await clic("Documents & Attestations")); await p.waitForTimeout(1800);
const onglets=await p.evaluate(()=>[...document.querySelectorAll("button")].map(b=>b.innerText.replace(/\s+/g," ").trim()).filter(t=>/Documents$|France Travail|versements|Projet/.test(t)));
console.log("   onglets :", onglets.join(" | ")||"(aucun)");
const ok=onglets.some(o=>/Projet d'accueil/.test(o));
console.log(`  ${ok?"ok ":"KO "} parent : « Projet d'accueil » figure dans les onglets de Documents`);
await N.close();
process.exit(ok?0:1);
