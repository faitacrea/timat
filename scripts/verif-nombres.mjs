// LES CHAMPS QUI SE REMPLISSENT TOUT SEULS.
//
// Le premier pas d'une assistante maternelle qui s'inscrit, c'est
// l'accompagnement : son enfant accueilli, puis son contrat. Quatre champs y
// portent un chiffre — heures par semaine, taux horaire, indemnité entretien,
// semaines d'accueil. Ils étaient écrits ainsi :
//
//     parseFloat(e.target.value) || 4.05
//
// Le « || » ne distingue pas « vide » de « zéro ». Deux conséquences, que ce
// contrôle met en évidence en se conduisant comme une utilisatrice :
//
//   - on efface le champ pour retaper : il ne reste pas vide, il saute sur la
//     valeur par défaut. Pour écrire 4,20 il faut donc taper PAR-DESSUS, et
//     celle qui efface d'abord se retrouve avec 4,05 qu'elle n'a pas choisi ;
//   - une indemnité d'entretien de 0 € est impossible à saisir : elle devient
//     3,80 €. Or 0 € est un cas réel quand les parents fournissent tout.
//
// Et un second soupçon, à trancher par la mesure et non par l'idée qu'on s'en
// fait : la virgule. Une utilisatrice tape « 4,20 ». On vérifie ce que le
// champ en fait vraiment dans un vrai navigateur, en locale fr-FR.
//
// Hors chaîne de build : Vercel n'a pas de navigateur.
//   node scripts/verif-nombres.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { REPONSE_URL, UID, BUNDLE_TESTABLE} from "./jeu-de-donnees.mjs";

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
await p.route("**/rest/v1/**", (r) => {
  const t = (r.request().url().match(/rest\/v1\/(?:rpc\/)?([a-z_]+)/) || [])[1];
  // AUCUN ENFANT : c'est la seule condition qui ouvre l'accompagnement
  // (App.jsx : !onboarded && asmat && _profileConfirmed && enfantsDB.length===0).
  if (t === "enfants") return r.fulfill(json([]));
  return r.fulfill(json(REPONSE_URL(r.request().url(), r.request().headers(), "asmat")));
});
await p.route("**/auth/v1/**", (r) => r.fulfill(json({ ...session, ...utilisateur })));

await p.goto(`http://127.0.0.1:4173/?acces=${CLE}`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(4500);
if (!(await BUNDLE_TESTABLE(p))) { await N.close(); process.exit(2); }

const ko = [];
// Étape 0 de l'accompagnement : le prénom et la date de naissance de l'enfant,
// puis « Continuer → Le contrat ». Sans cela, les champs chiffrés n'existent pas.
const entree = await p.evaluate(() => {
  const b = [...document.querySelectorAll("button")].some((x) => /Continuer\s*→\s*Le contrat/i.test(x.innerText || ""));
  return b;
});
if (!entree) {
  console.error("\n  KO  l'accompagnement ne s'ouvre pas : le contrôle ne vérifierait rien\n");
  console.error("  (écran affiché : " + (await p.evaluate(() => document.body.innerText.slice(0, 200).replace(/\s+/g, " "))) + ")\n");
  await N.close(); process.exit(1);
}
await p.locator('input.inp').first().fill("Léa");
await p.locator('input[type="date"]').first().fill("2024-03-15");
await p.waitForTimeout(300);
await p.getByRole("button", { name: /Continuer/ }).click();
await p.waitForTimeout(900);

// Les quatre champs, repérés par leur étiquette : on ne devine pas l'ordre.
// On marque le champ dans la page, puis on le pilote par un Locator : une
// ElementHandle ne sait pas taper caractere par caractere (pressSequentially),
// et c'est la frappe reelle qu'on veut reproduire.
const parEtiquette = async (motif) => {
  const trouve = await p.evaluate((m) => {
    document.querySelectorAll("[data-cible]").forEach((e) => e.removeAttribute("data-cible"));
    const lab = [...document.querySelectorAll(".lbl")].find((l) => new RegExp(m, "i").test(l.innerText || ""));
    // Les champs chiffres sont des <input type="text" inputMode="decimal"> depuis
    // champ-nombre.jsx : un type=number ne peut pas recevoir la virgule.
    const i = lab?.parentElement?.querySelector('input[inputmode="decimal"]');
    if (!i) return false;
    i.setAttribute("data-cible", "1");
    i.scrollIntoView({ block: "center" });
    return true;
  }, motif);
  return trouve ? p.locator('input[data-cible="1"]') : null;
};

const CAS = [
  ["Taux horaire", "4.05", "4,20"],
  ["Heures / semaine", "40", "35"],
  ["Indemnité entretien", "3.80", "0"],
];
for (const [etiquette, defaut, frappe] of CAS) {
  const champ = await parEtiquette(etiquette.replace(/[/()]/g, "."));
  if (!champ) { ko.push(`le champ « ${etiquette} » est introuvable sur l'écran du contrat`); continue; }
  // 1. ON EFFACE, comme une utilisatrice qui veut retaper. Le champ doit rester
  //    vide, pas sauter sur la valeur par défaut.
  await champ.click();
  await p.keyboard.press("ControlOrMeta+a");
  await p.keyboard.press("Backspace");
  await p.waitForTimeout(350);
  const apresEffacement = await champ.inputValue();
  if (apresEffacement !== "") {
    ko.push(`« ${etiquette} » : on efface le champ et il saute sur ${apresEffacement} au lieu de rester vide (on ne peut pas retaper sans écrire par-dessus)`);
  }
  // 2. ON TAPE la valeur voulue, chiffre par chiffre, et elle doit arriver.
  await champ.pressSequentially(frappe, { delay: 70 });
  await p.waitForTimeout(400);
  const lu = await champ.inputValue();
  const attendu = frappe.replace(",", ".");
  if (Number(lu.replace(",", ".")) !== Number(attendu)) {
    ko.push(`« ${etiquette} » : on tape « ${frappe} » et le champ retient « ${lu} » (attendu ${attendu})`);
  }
}

// 3. La virgule, mesurée et non supposée : ce que le navigateur rend quand on
//    tape « 4,20 » dans un input type=number en locale fr-FR.
const champTaux = await parEtiquette("Taux horaire");
let virgule = null;
if (champTaux) {
  await champTaux.click();
  await p.keyboard.press("ControlOrMeta+a");
  await champTaux.pressSequentially("4,20", { delay: 80 });
  await p.waitForTimeout(400);
  virgule = { brut: await champTaux.inputValue() };
}

const dur = erreurs.find((e) => /is not defined|is not a function|cannot read propert/i.test(e));
if (dur) ko.push(`le code casse pendant la saisie : ${dur.slice(0, 120)}`);

await p.screenshot({ path: "/tmp/claude-0/-home-user-timat/c32f8b4b-9d9f-54f9-98ca-452acb6ac0f7/scratchpad/nombres.png" });
await N.close();
console.log("\n=== NOMBRES — accompagnement, écran du contrat ===\n");
if (virgule) {
  console.log(`  info  « 4,20 » tapé → le champ retient « ${virgule.brut} »`);
  if (Number(String(virgule.brut).replace(",", ".")) !== 4.2) ko.push(`la virgule n'est pas reçue : « 4,20 » devient « ${virgule.brut} »`);
}
if (ko.length) { ko.forEach((x) => console.log(`  KO  ${x}`)); console.log(`\n${ko.length} problème(s).\n`); }
else console.log("  ok  les champs se laissent effacer, et retiennent ce qu'on tape\n");
process.exit(ko.length ? 1 : 0);
