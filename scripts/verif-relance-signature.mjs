// « Relancer le parent » : le rappel de signature part-il vraiment ?
//
// Pourquoi : le bouton lisait l'adresse du parent dans « profiles ». Or la
// règle d'accès de cette table (profiles_own) ne laisse lire que SON PROPRE
// profil : pour celui du parent, la lecture revenait vide, et le bouton
// affichait « Email parent manquant » à chaque fois. Le rappel n'est jamais
// parti. Et quand l'envoi échouait, il affichait quand même « Rappel envoyé ».
//
// Le jeu de données sert tous les profils à qui les demande ; ce contrôle
// rétablit la règle réelle (le profil d'autrui revient vide) pour jouer le
// parcours tel qu'il se passe en production.
//
//   node scripts/verif-relance-signature.mjs [url]
import { chromium } from "playwright";
import { BRANCHER, BUNDLE_TESTABLE, ATTENDRE_PRET, DANS_L_APP, CHROMIUM, LIGNES } from "./jeu-de-donnees.mjs";
import { lireApp } from "./sources-app.mjs";

const URL_BASE = process.argv[2] || "http://127.0.0.1:4173";
const CLE = (lireApp().match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/) || [])[1];
if (!CLE) { console.error("Clé d'accès introuvable."); process.exit(1); }
const json = (b, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(b) });
const { contrats, profiles } = LIGNES("asmat");
const UID = profiles.find((x) => x.role === "asmat").id;
// Un contrat signé par l'assistante maternelle, pas encore par le parent.
const EN_ATTENTE = [{ ...contrats[0], signe_parent: false, signe_parent_at: null, date_signature_asmat: "2026-09-03T10:00:00Z" }];

const nav = await chromium.launch({ executablePath: CHROMIUM() });
let ko = 0;
const dire = (ok, quoi, detail = "") => {
  if (!ok) ko++;
  console.log(`  ${ok ? "ok " : "KO "} ${quoi.padEnd(66)} ${detail}`);
};

const ouvrir = async ({ destinataire, envoi }) => {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on("pageerror", (e) => erreurs.push(String(e)));
  await BRANCHER(p, "asmat", CLE);
  const envois = [];
  // La règle profiles_own, rétablie : le profil d'autrui revient vide.
  await p.route("**/rest/v1/profiles**", (r) => {
    const u = r.request().url();
    if (!/[?&]id=eq\./.test(u) || u.includes("id=eq." + UID)) return r.fallback();
    const unSeul = /vnd\.pgrst\.object/.test(r.request().headers()["accept"] || "");
    return r.fulfill(unSeul ? json({ message: "0 lignes" }, 406) : json([]));
  });
  await p.route("**/rest/v1/contrats**", (r) => r.fulfill(json(EN_ATTENTE)));
  await p.route("**/rest/v1/rpc/get_recipient_email**", (r) => r.fulfill(json(destinataire)));
  await p.route("**/api/send-email**", (r) => { envois.push(JSON.parse(r.request().postData() || "{}")); return r.fulfill(envoi()); });
  await p.goto(`${URL_BASE}/?acces=${CLE}`, { waitUntil: "domcontentloaded" });
  await ATTENDRE_PRET(p);
  if (!(await BUNDLE_TESTABLE(p))) { await nav.close(); process.exit(2); }
  for (let i = 0; i < 5; i++) {
    const passer = p.getByRole("button", { name: /^Passer$/ });
    if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(300); } else break;
  }
  if (!(await DANS_L_APP(p, "verif-relance-signature"))) { await nav.close(); process.exit(1); }
  await p.waitForTimeout(800);
  return { p, ctx, erreurs, envois };
};
const relancer = async (p) => {
  const b = p.getByRole("button", { name: /Relancer le parent/ });
  if (!(await b.isVisible().catch(() => false))) return false;
  await b.click();
  await p.waitForTimeout(1200);
  return true;
};

console.log("\n=== RELANCER LE PARENT — un parent relié, avec une adresse ===\n");
{
  const { p, ctx, erreurs, envois } = await ouvrir({
    destinataire: { email: "sophie@test.fr", prenom: "Sophie" },
    envoi: () => json({ success: true, id: "env-1" }),
  });
  dire(await relancer(p), "le bouton « Relancer le parent » est là");
  dire(envois.length === 1, "le rappel part", `${envois.length} envoi(s)`);
  const e = envois[0] || {};
  dire(e.type === "signature_reminder" && e.to === "sophie@test.fr", "au parent, avec le bon gabarit", `${e.type} → ${e.to}`);
  dire(e.vars?.parent_prenom === "Sophie", "le parent est salué par son prénom");
  dire(/^\d{1,2} \S+ \d{4}$/.test(e.vars?.date || ""), "la date est écrite en français, pas « 2026-09-03 »", e.vars?.date);
  dire(/goto=signature/.test(e.vars?.url || ""), "le bouton du courriel mène à la signature");
  dire(await p.getByRole("button", { name: /Rappel envoyé/ }).isVisible().catch(() => false), "l'écran dit « Rappel envoyé »");
  dire(erreurs.length === 0, "aucune erreur JavaScript", erreurs.join(" | "));
  await ctx.close();
}

console.log("\n=== RELANCER LE PARENT — l'envoi échoue ===\n");
{
  const { p, ctx, envois } = await ouvrir({
    destinataire: { email: "sophie@test.fr", prenom: "Sophie" },
    envoi: () => json({ error: "panne" }, 503),
  });
  await relancer(p);
  dire(envois.length === 1, "l'envoi a été tenté");
  const t = await p.locator("body").innerText();
  dire(!/Rappel envoyé/.test(t), "l'écran ne prétend PAS « Rappel envoyé »");
  dire(/Échec — réessayer/.test(t), "il dit l'échec, et propose de réessayer");
  await ctx.close();
}

console.log("\n=== RELANCER LE PARENT — aucun parent relié ===\n");
{
  const { p, ctx, envois } = await ouvrir({ destinataire: null, envoi: () => json({ success: true }) });
  await relancer(p);
  dire(envois.length === 0, "rien ne part");
  dire(/Parent sans compte relié/.test(await p.locator("body").innerText()), "l'écran dit pourquoi");
  await ctx.close();
}

await nav.close();
console.log(ko ? `\n${ko} problème(s)\n` : "\nLe rappel de signature part, et l'écran dit ce qui s'est vraiment passé.\n");
process.exit(ko ? 1 : 0);
