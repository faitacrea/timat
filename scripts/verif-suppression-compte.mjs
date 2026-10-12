// La suppression d'un compte ne laisse ni prelevement, ni famille sans nouvelles.
//
// Pourquoi : supprimer son compte n'arretait pas l'abonnement Stripe (une
// assistante maternelle partie continuait d'etre prelevee), et effacait
// sur-le-champ le contrat, les bulletins et le registre des heures des
// familles reliees, sans les prevenir.
//
// Ce controle joue le parcours dans un vrai navigateur, base et serveur
// simules, et verifie ce qui part vers le serveur — et surtout ce qui n'y part
// PAS : aucune suppression tant que l'abonnement n'est pas regle.
//
//   node scripts/verif-suppression-compte.mjs [url]
import { chromium } from "playwright";
import { BRANCHER, BUNDLE_TESTABLE, ATTENDRE_PRET, DANS_L_APP, CHROMIUM } from "./jeu-de-donnees.mjs";
import { lireApp } from "./sources-app.mjs";

const URL_BASE = process.argv[2] || "http://127.0.0.1:4173";
const CLE = (lireApp().match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/) || [])[1];
if (!CLE) { console.error("Clé d'accès introuvable."); process.exit(1); }
const json = (b, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(b) });
const DANS_15 = new Date(Date.now() + 15 * 86400000).toISOString();

const nav = await chromium.launch({ executablePath: CHROMIUM() });
let ko = 0;
const dire = (ok, quoi, detail = "") => {
  if (!ok) ko++;
  console.log(`  ${ok ? "ok " : "KO "} ${quoi.padEnd(66)} ${detail}`);
};

// Ouvre l'application, branchee sur le jeu de donnees, avec les reponses
// voulues pour /api/stripe (action « fermeture »).
const ouvrir = async (role, { surcharge = null, stripe = () => json({ ok: true }), avant = async () => {} } = {}) => {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on("pageerror", (e) => erreurs.push(String(e)));
  await BRANCHER(p, role, CLE, surcharge);
  const appels = { stripe: [], suppression: 0 };
  await p.route("**/api/stripe**", (r) => {
    const corps = JSON.parse(r.request().postData() || "{}");
    appels.stripe.push(corps);
    return r.fulfill(stripe(corps));
  });
  await p.route("**/rest/v1/rpc/delete_user_account**", (r) => { appels.suppression++; return r.fulfill({ status: 204, body: "" }); });
  await p.route("**/storage/v1/**", (r) => r.fulfill(json([])));
  await avant(p);
  await p.goto(`${URL_BASE}/?acces=${CLE}`, { waitUntil: "domcontentloaded" });
  await ATTENDRE_PRET(p);
  if (!(await BUNDLE_TESTABLE(p))) { await nav.close(); process.exit(2); }
  for (let i = 0; i < 5; i++) {
    const passer = p.getByRole("button", { name: /^Passer$/ });
    if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(300); } else break;
  }
  if (!(await DANS_L_APP(p, "verif-suppression-compte"))) { await nav.close(); process.exit(1); }
  return { p, ctx, erreurs, appels };
};
const parametres = async (p) => {
  await p.evaluate(() => window.dispatchEvent(new CustomEvent("timat:page", { detail: "parametres" })));
  await p.waitForTimeout(1500);
};
const taper = async (p) => { await p.getByLabel("Tapez SUPPRIMER pour confirmer").fill("SUPPRIMER"); };

console.log("\n=== SUPPRESSION — une assistante maternelle avec une famille reliée ===\n");
{
  const { p, ctx, erreurs, appels } = await ouvrir("asmat", {
    stripe: (c) => c.mode === "programmer" ? json({ ok: true, le: DANS_15, familles: 1, courriels: 1 })
      : c.mode === "annuler" ? json({ ok: true, familles: 1, courriels: 1, abonnements_repris: 1 }) : json({ ok: true }),
  });
  await parametres(p);
  await p.getByRole("button", { name: "Supprimer mon compte et toutes mes données" }).click();
  await p.waitForTimeout(400);
  const choix = await p.locator("body").innerText();
  dire(/1 famille voit votre dossier/.test(choix), "la famille reliée est annoncée avant toute suppression");
  dire(/Léo/.test(choix), "l'enfant concerné est nommé");
  await p.getByRole("button", { name: /Prévenir les familles et supprimer le/ }).click();
  await taper(p);
  await p.getByRole("button", { name: "Programmer la suppression" }).click();
  await p.waitForTimeout(800);
  const programmee = await p.locator("body").innerText();
  dire(appels.stripe.some((c) => c.action === "fermeture" && c.mode === "programmer"), "le serveur reçoit « programmer »");
  dire(appels.suppression === 0, "programmer ne supprime rien tout de suite", `${appels.suppression} suppression(s)`);
  dire(/Suppression programmée/.test(programmee) && /1 famille\(s\) prévenue\(s\)/.test(programmee), "l'écran dit la date et les familles prévenues");
  await p.getByRole("button", { name: "Annuler la suppression" }).click();
  await p.waitForTimeout(800);
  dire(appels.stripe.some((c) => c.mode === "annuler"), "« Annuler la suppression » part au serveur");
  dire(/Suppression annulée/.test(await p.locator("body").innerText()), "l'annulation est confirmée à l'écran");
  dire(erreurs.length === 0, "aucune erreur JavaScript", erreurs.join(" | "));
  await ctx.close();
}

console.log("\n=== SUPPRESSION IMMÉDIATE — l'abonnement d'abord ===\n");
{
  const { p, ctx, appels } = await ouvrir("asmat", { stripe: () => json({ error: "Stripe 500 : erreur" }, 502) });
  await parametres(p);
  await p.getByRole("button", { name: "Supprimer mon compte et toutes mes données" }).click();
  await p.getByRole("button", { name: "Supprimer tout de suite" }).click();
  await taper(p);
  await p.getByRole("button", { name: "Supprimer définitivement" }).click();
  await p.waitForTimeout(800);
  dire(appels.stripe.some((c) => c.mode === "immediat"), "la suppression immédiate règle d'abord l'abonnement");
  dire(appels.suppression === 0, "Stripe en échec : rien n'est supprimé", `${appels.suppression} suppression(s)`);
  dire(/rien n'a été supprimé/.test(await p.locator("body").innerText()), "l'échec est dit à l'écran");
  await ctx.close();
}
{
  const { p, ctx, appels } = await ouvrir("asmat", { stripe: () => json({ ok: true, abonnements_arretes: 1 }) });
  await parametres(p);
  await p.getByRole("button", { name: "Supprimer mon compte et toutes mes données" }).click();
  await p.getByRole("button", { name: "Supprimer tout de suite" }).click();
  await taper(p);
  await p.getByRole("button", { name: "Supprimer définitivement" }).click();
  await p.waitForTimeout(1200);
  dire(appels.suppression === 1, "Stripe réglé : le compte est supprimé", `${appels.suppression} suppression(s)`);
  await ctx.close();
}

console.log("\n=== SUPPRESSION — cas limites ===\n");
{
  // Annulée, mais Stripe a refusé de relancer l'abonnement : le compte est
  // gardé, et l'utilisatrice doit savoir que son abonnement va s'arrêter.
  const { p, ctx } = await ouvrir("asmat", {
    surcharge: { suppression_prevue_le: DANS_15 },
    stripe: () => json({ ok: true, familles: 1, courriels: 1, abonnements_repris: 0, abonnement_a_relancer: true }),
  });
  await parametres(p);
  await p.getByRole("button", { name: "Annuler la suppression" }).click();
  await p.waitForTimeout(800);
  const t = await p.locator("body").innerText();
  dire(/compte est conservé/.test(t) && /n'a pas pu être relancé/.test(t), "annulée mais abonnement non relancé : c'est dit, pas tu");
  await ctx.close();
}
{
  const { p, ctx } = await ouvrir("asmat", { surcharge: { suppression_prevue_le: DANS_15 } });
  await parametres(p);
  const t = await p.locator("body").innerText();
  dire(/Suppression programmée/.test(t) && /Annuler la suppression/.test(t), "une suppression déjà programmée s'affiche au chargement");
  await ctx.close();
}
{
  const { p, ctx, appels } = await ouvrir("asmat", {
    avant: async (pg) => { await pg.route("**/rest/v1/enfants?select=prenom%2Cparent_id**", (r) => r.fulfill(json({ message: "panne" }, 500))); },
  });
  await parametres(p);
  await p.getByRole("button", { name: "Supprimer mon compte et toutes mes données" }).click();
  await p.waitForTimeout(400);
  const t = await p.locator("body").innerText();
  dire(/Impossible de vérifier les familles/.test(t), "familles illisibles : la suppression est refusée, pas devinée");
  dire(appels.stripe.length === 0 && appels.suppression === 0, "familles illisibles : rien ne part au serveur");
  await ctx.close();
}

console.log("\n=== LE PARENT — le bandeau et les téléchargements ===\n");
{
  const { p, ctx, erreurs } = await ouvrir("parent", {
    avant: async (pg) => {
      await pg.route("**/rest/v1/rpc/fermetures_prevues**", (r) => r.fulfill(json([{ enfant_prenom: "Léo", asmat_prenom: "Marie", le: DANS_15 }])));
    },
  });
  await p.waitForTimeout(1200);
  const t = await p.locator("body").innerText();
  dire(/Marie ferme son compte TiMat/.test(t) && /Léo/.test(t), "le parent voit qui ferme et pour quel enfant");
  dire(/supprimé à partir du/.test(t), "le parent voit la date");
  await p.getByRole("button", { name: "Exporter mes données" }).first().click();
  await p.waitForTimeout(1500);
  dire(/Exporter mes données|Génération/.test(await p.locator("body").innerText()), "« Exporter mes données » ouvre l'export");
  dire(erreurs.length === 0, "aucune erreur JavaScript", erreurs.join(" | "));
  await ctx.close();
}
{
  const { p, ctx } = await ouvrir("parent");
  await p.waitForTimeout(1200);
  dire(!/ferme son compte TiMat/.test(await p.locator("body").innerText()), "sans fermeture annoncée, pas de bandeau");
  await ctx.close();
}

await nav.close();
console.log(ko ? `\n${ko} problème(s)\n` : "\nAucune suppression sans abonnement réglé, aucune famille sans nouvelles.\n");
process.exit(ko ? 1 : 0);
