// Parcours visuel du back-office.
//
// Il n'avait jamais ete ouvert : il exige une session administrateur, et
// Supabase n'est pas joignable depuis l'environnement de verification. Plutot
// que de demander un compte, on simule la reponse d'authentification et le
// profil administrateur -- c'est exactement ce que le back-office controle, et
// aucun identifiant reel n'est necessaire.
//
//   npm run parcours:backoffice
//
// Prealable : une version construite servie (npm run build puis vite preview).
import { chromium } from "playwright";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

// Playwright telecharge son propre navigateur ; quand il est deja present sous
// une autre version, on lui designe le binaire plutot que d'exiger un nouveau
// telechargement.
const chercherChromium = () => {
  const racine = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!racine || !existsSync(racine)) return undefined;
  for (const d of readdirSync(racine).filter(x => x.startsWith("chromium-")).sort().reverse()) {
    const bin = path.join(racine, d, "chrome-linux", "chrome");
    if (existsSync(bin)) return bin;
  }
  return undefined;
};
const URL_BASE = process.argv[2] || "http://localhost:4173";
const b=await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || chercherChromium() });
const p=await b.newPage({viewport:{width:390,height:844}});
const err=[];
p.on("pageerror",e=>err.push("erreur JS : "+e.message.slice(0,180)));
p.on("console",m=>{const t=m.text();if(m.type()==="error"&&!/ERR_|Failed to load resource|Failed to fetch/.test(t))err.push("console : "+t.slice(0,150));});

const faussSession={
  access_token:"jeton-de-test",token_type:"bearer",expires_in:3600,
  expires_at:Math.floor(Date.now()/1000)+3600,refresh_token:"refresh-de-test",
  user:{id:"00000000-0000-0000-0000-000000000001",aud:"authenticated",role:"authenticated",
    email:"admin@timat.test",app_metadata:{provider:"email"},
    user_metadata:{prenom:"Admin",is_admin:true},is_admin:true,
    created_at:new Date().toISOString(),updated_at:new Date().toISOString()},
};
await p.route("**/auth/v1/token**",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(faussSession)}));
await p.route("**/auth/v1/user**",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(faussSession.user)}));
// Le profil renvoie is_admin : c'est la porte que le back-office controle.
await p.route("**/rest/v1/profiles**",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify([{id:faussSession.user.id,is_admin:true,role:"asmat",prenom:"Admin",nom:"Test",email:"admin@timat.test"}])}));
await p.route("**/rest/v1/**",r=>r.fulfill({status:200,contentType:"application/json",body:"[]"}));

await p.goto(URL_BASE+"/backoffice",{waitUntil:"domcontentloaded"});
await p.waitForTimeout(3000);
const champs=await p.$$('input');
if(champs.length>=2){await champs[0].fill("admin@timat.test");await champs[1].fill("motdepasse");}
await p.evaluate(()=>[...document.querySelectorAll("button")].find(b=>/Se connecter|Entrer|Connexion/i.test(b.innerText))?.click());
await p.waitForTimeout(3500);
// Ouvre le menu s'il est replie, puis enumere les sections.
await p.evaluate(()=>[...document.querySelectorAll("button")].find(b=>b.innerText.trim()==="☰")?.click());
await p.waitForTimeout(600);
const sections=await p.evaluate(()=>[...document.querySelectorAll(".bo-navbtn,.bo-topbtn,nav button,aside button")]
  .map(b=>b.innerText.replace(/\s+/g," ").trim()).filter(t=>t&&t.length<40));
console.log("sections trouvées :", JSON.stringify([...new Set(sections)]));

const mesure=async(nom)=>{
  await p.waitForTimeout(1000);
  await p.screenshot({path:"/tmp/bo-"+nom.replace(/[^a-z0-9]+/gi,"-").toLowerCase()+".png",fullPage:true});
  const m=await p.evaluate(()=>{const d=document.documentElement;let petit=0,cibles=0;
    for(const n of document.querySelectorAll("body *")){const st=getComputedStyle(n);
      if(!n.childElementCount&&n.textContent.trim()&&parseFloat(st.fontSize)<11)petit++;
      if(/^(BUTTON|A)$/.test(n.tagName)){const r=n.getBoundingClientRect();if(r.width>0&&(r.height<36||r.width<36))cibles++;}}
    return {deborde:d.scrollWidth>d.clientWidth+1,petit,cibles};});
  console.log(String(nom).padEnd(24)+(m.deborde?"DÉBORDE ":"non     ")+String(m.petit).padEnd(7)+String(m.cibles).padEnd(9)+err.length);
  err.length=0;
};
console.log("\nsection                 déborde <11px  cibles<36 erreurs");
await mesure("tableau-de-bord");
for(const s of [...new Set(sections)].slice(0,14)){
  const ok=await p.evaluate((t)=>{const b=[...document.querySelectorAll("button")].find(x=>x.innerText.replace(/\s+/g," ").trim()===t);if(b){b.click();return true}return false},s);
  if(ok)await mesure(s);
}
console.log("\n=== ERREURS RESTANTES ===\n"+(err.join("\n")||"aucune"));
await b.close();
