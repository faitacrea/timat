// LE CHEMIN DE SECOURS HORS LIGNE S'OUVRE-T-IL ?
//
// CE QUE CE CONTRÔLE COUVRE, ET CE QU'IL NE COUVRE PAS.
//
// Les boutons « Explorer la démo » des deux écrans de connexion sont derrière
// un « {false && …} » : ils ne s'affichent pas, et aucune visiteuse ne se voit
// proposer la démonstration. L'écran parent, lui, n'a jamais eu de chemin de
// démonstration du tout. Ce contrôle ne les vérifie donc pas : on ne mesure
// pas une porte condamnée.
//
// Il reste UN chemin réel, dans l'écran pro : si Supabase ne répond pas du tout
// (coupure réseau, panne), la connexion part dans son « catch » et, si
// l'adresse saisie est celle du compte de démonstration, ouvre la
// démonstration. C'est le secours qu'on a sous la main le jour où plus rien ne
// répond. Il ne s'ouvrait pas.
//
// L'application demandait la lecture du profil pour tout le monde, y compris
// pour ce compte, dont l'identifiant est « demo-asmat ». La colonne « id » de
// la table profiles est de type uuid : PostgREST refuse la requête avec
// « invalid input syntax for type uuid » (22P02). L'application réessayait
// 1,5 s plus tard, obtenait le même refus, et s'arrêtait sur « Votre compte
// n'a pas pu être chargé ». Deux autres lectures partaient de même, pour rien.
//
// Aucun contrôle ne l'avait vu, parce que tous doublaient la base par « [] » :
// « [] » est une réponse valide, pas un refus — et le refus est précisément ce
// que la production renvoie. Ce contrôle imite donc la VRAIE réponse de
// PostgREST, mot pour mot.
//
// Hors chaîne de build : Vercel n'a pas de navigateur.
//   node scripts/verif-demonstration.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { CHROMIUM, BUNDLE_TESTABLE, ATTENDRE_PRET } from "./jeu-de-donnees.mjs";

const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8")
  .match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];
const BASE = process.env.URL_BASE || "http://127.0.0.1:4173";

const N = await chromium.launch({ executablePath: CHROMIUM() });
const ctx = await N.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", serviceWorkers: "block" });
const p = await ctx.newPage();

const refusees = [];
await p.route("**/rest/v1/**", (r) => {
  const u = r.request().url();
  const corps = String(r.request().postData() || "");
  // Tout ce qui porte un identifiant de démonstration est REFUSÉ, comme en
  // production. Si l'application le demande, elle se cassera là.
  if (/demo-/.test(u) || /demo-/.test(corps)) {
    refusees.push(`${r.request().method()} ${u.split("/rest/v1/")[1].slice(0, 70)}`);
    return r.fulfill({ status: 400, contentType: "application/json",
      body: JSON.stringify({ code: "22P02", details: null, hint: null,
        message: 'invalid input syntax for type uuid: "demo-asmat"' }) });
  }
  return r.fulfill({ status: 200, contentType: "application/json", body: "[]" });
});
// Supabase ne répond PAS : c'est la condition même du chemin de secours.
await p.route("**/auth/v1/token**", (r) => r.abort("failed"));

await p.goto(`${BASE}/?acces=${CLE}&connexion=1`, { waitUntil: "domcontentloaded" });
if (!await BUNDLE_TESTABLE(p)) { await N.close(); process.exit(1); }
await ATTENDRE_PRET(p, 1200);
const seCo = p.getByRole("button", { name: /^Se connecter$/ });
if (await seCo.isVisible().catch(() => false)) { await seCo.first().click(); await p.waitForTimeout(600); }
await p.fill('input[type="email"]', "marie.dupont@mail.fr");
await p.fill('input[type="password"]', "demonstration");
await p.getByRole("button", { name: /Accéder à mon espace/ }).first().click();
await p.waitForTimeout(4500);
const passer = p.getByRole("button", { name: /^Passer$/ });
if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(700); }

const t = (await p.locator("body").innerText()).replace(/\s+/g, " ");
let ko = 0;
const dire = (bon, nom, detail) => {
  if (bon) console.log(`  ok  ${nom}`);
  else { ko++; console.log(`  KO  ${nom}${detail ? "\n        " + detail : ""}`); }
};
dire(!/Votre compte n'a pas pu être chargé/.test(t),
  "la démonstration ne s'arrête pas sur « Votre compte n'a pas pu être chargé »",
  "c'est le défaut d'origine : le profil était demandé pour un compte qui n'en a pas");
dire(!/Votre premier enfant/.test(t),
  "ni sur l'accompagnement du premier enfant",
  "le profil était « confirmé » à tort, et l'application proposait l'accompagnement");
dire(/Bonjour Marie/.test(t),
  "elle s'ouvre bien sur l'espace de Marie Dupont",
  `page vue : « ${t.slice(0, 130)} »`);
dire(refusees.length === 0,
  "et elle n'interroge pas la base sous un identifiant que la base refuse",
  `requêtes parties quand même :\n        ${refusees.join("\n        ")}`);

await N.close();
console.log(ko ? `\n${ko} problème(s)\n` : "\nLe secours hors ligne ouvre la démonstration, sans rien demander à la base.\n");
process.exit(ko ? 1 : 0);
