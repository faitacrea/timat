// Les invitations disent la vérité, des deux côtés.
//
// Pourquoi : le 12 octobre 2026, les deux fonctions de rattachement d'un parent
// à son enfant échouaient en base (opérateur text = uuid ; norm_email disparue).
// L'application affichait pourtant « Enfant rattaché à votre espace ✓ » à
// chaque fois — supabase.rpc rend {error} au lieu de lever, et le try/catch
// n'attrapait donc rien. Côté assistante maternelle, la liste lisait
// « inv.statut », une colonne qui n'existe pas : toutes les invitations
// restaient « En attente », même acceptées.
//
// Ce contrôle ne peut pas exécuter la vraie base (il la simule) : il vérifie
// que l'ÉCRAN rend fidèlement ce que la base répond. La base elle-même se
// vérifie avec docs/base-de-donnees/verifier-les-fonctions.md.
//
//   node scripts/verif-invitations.mjs [url]
import { chromium } from "playwright";
import { BRANCHER, BUNDLE_TESTABLE, ATTENDRE_PRET, DANS_L_APP, CHROMIUM, UID, EID } from "./jeu-de-donnees.mjs";
import { lireApp } from "./sources-app.mjs";

const URL_BASE = process.argv[2] || "http://127.0.0.1:4173";
const CLE = (lireApp().match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/) || [])[1];
if (!CLE) { console.error("Clé d'accès introuvable."); process.exit(1); }
const JETON = "8f14e45f-ceea-4e7a-9b3c-6f1d2a7b5c90";

const nav = await chromium.launch({ executablePath: CHROMIUM() });
let ko = 0;
const dire = (ok, quoi, detail = "") => {
  if (!ok) ko++;
  console.log(`  ${ok ? "ok " : "KO "} ${quoi.padEnd(64)} ${detail}`);
};
const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });

const ouvrir = async (role, prepare, suffixe = "") => {
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on("pageerror", (e) => erreurs.push(String(e)));
  await BRANCHER(p, role, CLE);
  await prepare(p);
  await p.goto(`${URL_BASE}/?acces=${CLE}${suffixe}`, { waitUntil: "domcontentloaded" });
  await ATTENDRE_PRET(p);
  if (!(await BUNDLE_TESTABLE(p))) { await nav.close(); process.exit(2); }
  for (let i = 0; i < 5; i++) {
    const passer = p.getByRole("button", { name: /^Passer$/ });
    if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(400); } else break;
  }
  if (!(await DANS_L_APP(p, "verif-invitations"))) { await nav.close(); process.exit(1); }
  return { p, ctx, erreurs };
};

console.log("\n=== INVITATIONS — l'historique de l'assistante maternelle ===\n");
{
  const lignes = [
    { id: "i1", asmat_id: UID, enfant_id: EID, email_parent: "acceptee@test.fr", acceptee: true, created_at: "2026-07-20T10:00:00Z", token: "a" },
    { id: "i2", asmat_id: UID, enfant_id: EID, email_parent: "attente@test.fr", acceptee: false, created_at: "2026-10-01T10:00:00Z", token: "b" },
    { id: "i3", asmat_id: UID, enfant_id: EID, email_parent: null, acceptee: false, created_at: "2026-10-02T10:00:00Z", token: "c" },
  ];
  const { p, ctx, erreurs } = await ouvrir("asmat", async (pg) => {
    await pg.route("**/rest/v1/invitations**", (r) => r.fulfill(json(lignes)));
    await pg.route("**/rest/v1/rpc/get_or_create_share_token**", (r) => r.fulfill(json(JETON)));
  });
  await p.evaluate(() => window.dispatchEvent(new CustomEvent("timat:page", { detail: "inviter_parent" })));
  await p.waitForTimeout(1600);
  const carte = await p.evaluate(() => {
    const titre = [...document.querySelectorAll("div")].find((d) => d.innerText?.trim().endsWith("Invitations envoyées") && d.children.length <= 2);
    const bloc = titre?.closest(".card");
    return bloc ? bloc.innerText : "";
  });
  dire(!!carte, "la carte « Invitations envoyées » est affichée");
  dire(/acceptee@test\.fr[\s\S]*?Acceptée/.test(carte), "une invitation acceptée s'affiche « Acceptée »");
  dire(/attente@test\.fr[\s\S]*?En attente/.test(carte), "une invitation en attente s'affiche « En attente »");
  dire((carte.match(/Pour /g) || []).length === 2, "le lien de partage sans adresse n'y figure pas", `${(carte.match(/Pour /g) || []).length} ligne(s)`);
  dire(/Pour Léo/.test(carte), "le prénom vient de l'enfant de l'invitation");
  const corps = await p.locator("body").innerText();
  dire(/valable 30 jours/.test(corps), "le lien de partage annonce sa durée de validité");
  dire(corps.includes("?invite=" + JETON), "le lien de partage est affiché");
  dire(erreurs.length === 0, "aucune erreur JavaScript", erreurs.join(" | "));
  await ctx.close();
}

console.log("\n=== INVITATIONS — ce que voit le parent qui ouvre le lien ===\n");
// Le message est un bandeau qui disparait : on le guette des le chargement,
// en notant tout ce qui s'est affiche, au lieu de regarder une fois apres coup
// (ma premiere version arrivait apres sa disparition et concluait a tort).
const toastApres = async (reponseJeton, nbEmail) => {
  const appels = [];
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
  const p = await ctx.newPage();
  const erreurs = [];
  p.on("pageerror", (e) => erreurs.push(String(e)));
  await BRANCHER(p, "parent", CLE);
  await p.route("**/rest/v1/rpc/claim_invite_token**", (r) => { appels.push("jeton"); return r.fulfill(json(reponseJeton)); });
  await p.route("**/rest/v1/rpc/claim_invitations**", (r) => { appels.push("email"); return r.fulfill(json(nbEmail)); });
  await p.goto(`${URL_BASE}/?acces=${CLE}&invite=${JETON}`, { waitUntil: "domcontentloaded" });
  let vu = "";
  for (let i = 0; i < 16; i++) {
    await p.waitForTimeout(250);
    const t = await p.locator(".toast").allInnerTexts().catch(() => []);
    for (const x of t) if (!vu.includes(x)) vu += " | " + x;
  }
  if (!(await BUNDLE_TESTABLE(p))) { await nav.close(); process.exit(2); }
  // Le bandeau doit rester assez longtemps pour etre lu : on le mesure.
  let duree = 0;
  if (vu) {
    const t0 = Date.now();
    await p.waitForFunction(() => !document.querySelector(".toast"), null, { timeout: 15000 }).catch(() => {});
    duree = Date.now() - t0 + 4000;
  }
  await ctx.close();
  return { corps: vu, appels, erreurs, duree };
};
{
  const r = await toastApres(null, 0);
  dire(r.appels.includes("jeton"), "lien refusé : le jeton est bien présenté à la base");
  dire(/n'est plus valable/.test(r.corps), "lien refusé : le parent lit qu'il n'est plus valable");
  dire(!/Enfant rattaché/.test(r.corps), "lien refusé : aucune fausse confirmation");
  dire(r.duree >= 8000, "lien refusé : le message reste le temps d'être lu", `${Math.round(r.duree / 100) / 10} s environ`);
  dire(r.erreurs.length === 0, "lien refusé : aucune erreur JavaScript", r.erreurs.join(" | "));
}
{
  const r = await toastApres(EID, 0);
  dire(/Enfant rattaché à votre espace/.test(r.corps), "lien accepté : la confirmation s'affiche");
  dire(!/n'est plus valable/.test(r.corps), "lien accepté : aucun message d'échec");
}
{
  const r = await toastApres(null, 1);
  dire(/Enfant rattaché à votre espace/.test(r.corps), "lien périmé mais invitation par e-mail reçue : rattaché");
}

await nav.close();
console.log(ko ? `\n${ko} problème(s)\n` : "\nLes invitations disent ce qui s'est réellement passé.\n");
process.exit(ko ? 1 : 0);
