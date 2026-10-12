// Le parent ne peut pas enregistrer un depart avant l'arrivee.
//
// Pourquoi : le bouton « Modifier » du parent envoie les deux heures a une
// fonction en base qui calcule depart - arrivee SANS plancher. Une arrivee
// corrigee a 18:00 avec un depart a 17:00 enregistrait -60 minutes, validees
// d'un coup ; la facturation et les recapitulatifs additionnent ces minutes,
// et une heure disparaissait du mois — donc du salaire — sans un message.
//
// Ce controle ouvre la vraie fenetre de modification, comme un parent, et
// verifie trois choses : le message s'affiche, le bouton est desactive, et
// RIEN ne part vers la base. Puis qu'une saisie correcte part toujours.
//
//   node scripts/verif-pointage-parent.mjs [url]
import { chromium } from "playwright";
import { BRANCHER, BUNDLE_TESTABLE, ATTENDRE_PRET, DANS_L_APP, CHROMIUM } from "./jeu-de-donnees.mjs";
import { lireApp } from "./sources-app.mjs";

const URL_BASE = process.argv[2] || "http://127.0.0.1:4173";
const CLE = (lireApp().match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/) || [])[1];
if (!CLE) { console.error("Clé d'accès introuvable."); process.exit(1); }

const nav = await chromium.launch({ executablePath: CHROMIUM() });
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
const p = await ctx.newPage();
const erreurs = [];
p.on("pageerror", (e) => erreurs.push(String(e)));

let ko = 0;
const dire = (ok, quoi, detail = "") => {
  if (!ok) ko++;
  console.log(`  ${ok ? "ok " : "KO "} ${quoi.padEnd(62)} ${detail}`);
};

await BRANCHER(p, "parent", CLE);
// Enregistree APRES la regle generale : Playwright essaie la derniere d'abord.
const appels = [];
await p.route("**/rest/v1/rpc/modify_and_validate_pointage_as_parent**", (r) => {
  appels.push(JSON.parse(r.request().postData() || "{}"));
  return r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ success: true, date: new Date().toISOString(), total_minutes: 600 }) });
});

await p.goto(`${URL_BASE}/?acces=${CLE}`, { waitUntil: "domcontentloaded" });
await ATTENDRE_PRET(p);
if (!(await BUNDLE_TESTABLE(p))) { await nav.close(); process.exit(2); }
for (let i = 0; i < 5; i++) {
  const passer = p.getByRole("button", { name: /^Passer$/ });
  if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(400); } else break;
}
if (!(await DANS_L_APP(p, "verif-pointage-parent"))) { await nav.close(); process.exit(1); }

console.log("\n=== POINTAGE — le parent ne peut pas enregistrer un départ avant l'arrivée ===\n");

await p.evaluate(() => window.dispatchEvent(new CustomEvent("timat:page", { detail: "pointage" })));
await p.waitForTimeout(1600);
const modifier = p.getByRole("button", { name: /Modifier/ }).first();
const visible = await modifier.isVisible().catch(() => false);
dire(visible, "le pointage à valider propose « Modifier »");
if (!visible) { await nav.close(); console.log(`\n${ko} problème(s)\n`); process.exit(1); }
await modifier.click();
await p.waitForTimeout(500);

const champs = p.locator('input[type="time"]');
const enregistrer = p.getByRole("button", { name: /Enregistrer et valider/ });
dire((await champs.count()) >= 2, "la fenêtre de modification a ses deux heures", String(await champs.count()));

await champs.nth(0).fill("18:00");
await champs.nth(1).fill("17:00");
await p.waitForTimeout(300);
const alerte = await p.locator('[role="alert"]').filter({ hasText: /départ doit être après/ }).count();
dire(alerte === 1, "départ avant l'arrivée : le message s'affiche");
dire(await enregistrer.isDisabled(), "départ avant l'arrivée : « Enregistrer et valider » est désactivé");
await enregistrer.click({ force: true, timeout: 2000 }).catch(() => {});
await p.waitForTimeout(600);
dire(appels.length === 0, "départ avant l'arrivée : rien n'est envoyé à la base", `${appels.length} envoi(s)`);

// Sur une version sans verrou, l'envoi a eu lieu, le pointage est passe
// « valide » et la fenetre s'est fermee : il n'y a plus rien a modifier. Le
// defaut est etabli ; on s'arrete sur un verdict plutot que d'expirer.
if ((await champs.count()) < 2) {
  dire(false, "la fenêtre s'est fermée : le pointage a été validé tel quel");
  await nav.close();
  console.log(`\n${ko} problème(s)\n`);
  process.exit(1);
}
await champs.nth(0).fill("18:00");
await champs.nth(1).fill("18:00");
await p.waitForTimeout(300);
dire(await enregistrer.isDisabled(), "départ à la minute de l'arrivée : refusé aussi");

await champs.nth(0).fill("07:30");
await champs.nth(1).fill("17:30");
await p.waitForTimeout(300);
dire((await p.locator('[role="alert"]').filter({ hasText: /départ doit être après/ }).count()) === 0,
  "saisie correcte : le message disparaît");
dire(!(await enregistrer.isDisabled()), "saisie correcte : le bouton est actif");
const avant = appels.length;
await enregistrer.click();
await p.waitForTimeout(900);
const envoi = appels[avant] || {};
dire(appels.length === avant + 1 && envoi.p_arrivee === "07:30" && envoi.p_depart === "17:30",
  "saisie correcte : les deux heures partent", JSON.stringify({ arr: envoi.p_arrivee, dep: envoi.p_depart }));

dire(erreurs.length === 0, "aucune erreur JavaScript", erreurs.join(" | "));
await nav.close();
console.log(ko ? `\n${ko} problème(s)\n` : "\nAucun départ avant l'arrivée ne peut être enregistré par le parent.\n");
process.exit(ko ? 1 : 0);
