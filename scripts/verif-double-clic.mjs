// DEUX CLICS, DEUX LIGNES.
//
// Seize boutons qui écrivent en base restaient cliquables pendant l'écriture.
// Un bouton qui ne répond pas tout de suite est cliqué une deuxième fois —
// c'est le réflexe de n'importe qui, et c'est ce que fait le réseau d'un
// téléphone dans une voiture.
//
// Ce contrôle appuie deux fois sur « Enregistrer l'activité » du cahier de
// réussites, à 80 ms d'intervalle, et compte ce qui part vers la table. Il doit
// en partir UNE.
//
// Hors chaîne de build : Vercel n'a pas de navigateur.
//   node scripts/verif-double-clic.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { REPONSE_URL, UID, BUNDLE_TESTABLE } from "./jeu-de-donnees.mjs";

const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];
const utilisateur = {
  id: UID, aud: "authenticated", role: "authenticated", email: "marie@test.fr",
  app_metadata: {}, user_metadata: { prenom: "Marie", nom: "Dupont", role: "asmat" },
  created_at: new Date().toISOString(),
};
const session = { access_token: "faux", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "faux", user: utilisateur };

const N = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await N.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
const p = await ctx.newPage();
const erreurs = [];
const ecritures = [];
p.on("pageerror", (e) => erreurs.push(e.message));
p.on("dialog", (d) => d.dismiss().catch(() => {}));
await p.addInitScript(([s, cle]) => {
  try {
    localStorage.setItem("timat_acces", cle);
    localStorage.setItem("sb-akicyckmbsjnewnvvcil-auth-token", JSON.stringify(s));
  } catch (e) { /* stockage indisponible : la page reste testable */ }
}, [session, CLE]);

const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
await p.route("**/storage/v1/**", (r) => r.fulfill(json([])));
await p.route("**/rest/v1/**", async (r) => {
  const req = r.request();
  const t = (req.url().match(/rest\/v1\/(?:rpc\/)?([a-z_]+)/) || [])[1];
  if (req.method() === "POST" && t === "portfolio") {
    ecritures.push(req.postData() || "");
    // ON FAIT LENTE LA PREMIERE ECRITURE. C'est tout l'objet du controle : un
    // bouton qui repond instantanement n'est jamais clique deux fois. On
    // reproduit le reseau d'un telephone, pas celui d'un bureau.
    await new Promise((f) => setTimeout(f, 1200));
    return r.fulfill({ status: 201, contentType: "application/json",
      body: JSON.stringify({ id: "pf" + ecritures.length, enfant_id: "22222222-2222-4222-8222-222222222222", titre: "Essai", emoji: "🎨", competences: [], date: "2026-10-07" }) });
  }
  return r.fulfill(json(REPONSE_URL(req.url(), req.headers(), "asmat")));
});
await p.route("**/auth/v1/**", (r) => r.fulfill(json({ ...session, ...utilisateur })));

await p.goto(`http://127.0.0.1:4173/?acces=${CLE}`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(4000);
if (!(await BUNDLE_TESTABLE(p))) { await N.close(); process.exit(2); }
for (let i = 0; i < 5; i++) {
  const passer = p.getByRole("button", { name: /^Passer$/ });
  if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(400); } else break;
}

const ko = [];
await p.evaluate(() => window.dispatchEvent(new CustomEvent("timat:page", { detail: "suivi_progres" })));
await p.waitForTimeout(1800);
// Le cahier de réussites est un onglet DANS « Éveil & Progrès » : sans ce
// premier clic, l'onglet n'existe pas encore et le contrôle concluait a tort
// que le cahier ne proposait pas d'ajouter une activite.
for (const motif of [/Éveil & Progrès/, /Cahier de réussites/i]) {
  await p.evaluate((m) => {
    const b = [...document.querySelectorAll("button")].find((x) => new RegExp(m, "i").test(x.innerText || ""));
    if (b) b.click();
  }, motif.source);
  await p.waitForTimeout(1300);
}
const ouvert = await p.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /\+\s*Activité/i.test(x.innerText || ""));
  if (!b) return false; b.click(); return true;
});
if (!ouvert) { console.error("\n  KO  le cahier de réussites ne propose pas d'ajouter une activité : rien n'est vérifiable\n"); await N.close(); process.exit(1); }
await p.waitForTimeout(800);

// LE CHAMP « TITRE », pas le premier .inp de la page : l'ecran porte d'autres
// champs au-dessus du formulaire, et add() ne part pas sans titre — le controle
// concluait alors que rien ne s'enregistrait.
const marque = await p.evaluate(() => {
  const lab = [...document.querySelectorAll(".lbl")].find((l) => /^Titre$/i.test((l.innerText || "").trim()));
  const i = lab?.parentElement?.querySelector("input");
  if (!i) return false;
  i.setAttribute("data-titre", "1");
  return true;
});
if (!marque) { console.error("\n  KO  le formulaire d'activité n'a pas de champ « Titre » : rien n'est vérifiable\n"); await N.close(); process.exit(1); }
await p.locator('input[data-titre="1"]').fill("Peinture aux doigts");
await p.waitForTimeout(400);

// DEUX CLICS, 80 ms d'écart. Pas un « dblclick » : deux appuis francs, comme
// quelqu'un qui croit que le premier n'a pas pris.
// On marque le bouton depuis la page : son libelle porte une apostrophe, et un
// selecteur par texte s'y casse selon la forme de l'apostrophe rendue.
const boutonTrouve = await p.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /Enregistrer l.activit/i.test(x.innerText || ""));
  if (!b) return false;
  b.setAttribute("data-envoi", "1");
  b.scrollIntoView({ block: "center" });
  return true;
});
if (!boutonTrouve) { console.error("\n  KO  pas de bouton « Enregistrer l'activité » : rien n'est vérifiable\n"); await N.close(); process.exit(1); }
await p.waitForTimeout(400);
const bouton = p.locator('button[data-envoi="1"]');
await bouton.click();
await p.waitForTimeout(80);
await bouton.click({ timeout: 2000 }).catch(() => { /* desactive entre-temps : c'est le but recherche */ });
await p.waitForTimeout(2800);

if (ecritures.length === 0) ko.push("aucune écriture ne part : le bouton n'enregistre rien, le contrôle ne vérifie pas ce qu'il devrait");
else if (ecritures.length > 1) ko.push(`${ecritures.length} activités enregistrées pour un seul formulaire : le bouton reste cliquable pendant l'écriture, et un second appui crée un doublon`);

const dur = erreurs.find((e) => /is not defined|is not a function|cannot read propert/i.test(e));
if (dur) ko.push(`le code casse pendant l'enregistrement : ${dur.slice(0, 120)}`);

await N.close();
console.log("\n=== DOUBLE CLIC — « Enregistrer l'activité », deux appuis à 80 ms ===\n");
if (ko.length) { ko.forEach((x) => console.log(`  KO  ${x}`)); console.log(`\n${ko.length} problème(s).\n`); }
else console.log(`  ok  une seule activité enregistrée malgré deux appuis\n`);
process.exit(ko.length ? 1 : 0);
