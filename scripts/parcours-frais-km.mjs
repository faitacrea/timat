// Ouvre l'écran des frais kilométriques et vérifie la borne basse.
//
// Pourquoi : la convention encadre l'indemnité kilométrique par deux bornes —
// jamais au-dessus du barème fiscal, jamais en dessous du barème de
// l'administration. L'application ne connaissait que le plafond : un taux saisi
// sous le plancher passait sans un mot. Ce parcours prouve, dans un navigateur,
// que l'alerte sort sous le plancher et se tait dessus, et qu'elle suit la
// puissance du véhicule.
//
// Le compte de démonstration n'ouvre pas cette section : il faut, comme pour le
// bulletin, une session Pro simulée.
//
//   node scripts/parcours-frais-km.mjs [url]
import { chromium } from "playwright";
import { readFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";

const URL_BASE = process.argv[2] || "http://localhost:4173";
const SORTIE = "/tmp/timat-frais-km";
const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const CLE = (src.match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/) || [])[1];
if (!CLE) { console.error("Clé d'accès introuvable."); process.exit(1); }

const chercherChromium = () => {
  const racine = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!racine || !existsSync(racine)) return undefined;
  for (const d of readdirSync(racine).filter((x) => x.startsWith("chromium-")).sort().reverse()) {
    const bin = path.join(racine, d, "chrome-linux", "chrome");
    if (existsSync(bin)) return bin;
  }
  return undefined;
};

const UID = "11111111-1111-4111-8111-111111111111";
const EID = "22222222-2222-4222-8222-222222222222";
const now = new Date();
const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const session = {
  access_token: "faux", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "faux",
  user: { id: UID, aud: "authenticated", role: "authenticated", email: "marie@test.fr",
    app_metadata: {}, user_metadata: { prenom: "Marie", nom: "Test", role: "asmat" },
    created_at: new Date().toISOString() },
};

mkdirSync(SORTIE, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || chercherChromium() });
const page = await nav.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2, locale: "fr-FR", timezoneId: "Europe/Paris" });
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message.slice(0, 200)));

await page.addInitScript(([s, cle]) => {
  try {
    localStorage.setItem("timat_acces", cle);
    localStorage.setItem("sb-akicyckmbsjnewnvvcil-auth-token", JSON.stringify(s));
  } catch (e) { /* stockage indisponible : la page reste testable */ }
}, [session, CLE]);

const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
await page.route("**/auth/v1/**", (r) => r.fulfill(json({ ...session, ...session.user })));
await page.route("**/rest/v1/**", (r) => {
  const t = (r.request().url().match(/rest\/v1\/([a-z_]+)/) || [])[1];
  if (t === "profiles") return r.fulfill(json([{ id: UID, role: "asmat", prenom: "Marie", nom: "Test", email: "marie@test.fr", subscription_status: "pro", is_admin: false }]));
  if (t === "enfants") return r.fulfill(json([{ id: EID, asmat_id: UID, prenom: "Léo", naissance: "2023-03-01", emoji: "🦁", couleur: "#E4915F" }]));
  if (t === "contrats") return r.fulfill(json([{ id: "c1", enfant_id: EID, asmat_id: UID, debut: "2026-01-01", fin: "2027-08-31", heures_hebdo: 40, taux_horaire: 4.20, annee_complete: true, semaines_accueil: null, entretien: 3.8, jours: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"], horaires: "07h30–17h30" }]));
  // Quatre journees : 8 h de maladie, 8 h de formation sur le temps d'accueil,
  // 8 h de fermeture, 6 h de formation hors temps d'accueil. Seules la maladie
  // et la fermeture se deduisent ; la formation hors accueil ouvre droit a
  // l'allocation, qui n'est PAS une ligne de salaire.
  if (t === "evenements") return r.fulfill(json([
    { id: "e-mal", asmat_id: UID, date: `${mk}-03`, type: "mal", texte: "Maladie", heures: 8 },
    { id: "e-frm", asmat_id: UID, date: `${mk}-10`, type: "form", texte: "Formation", heures: 8 },
    { id: "e-fer", asmat_id: UID, date: `${mk}-17`, type: "fer", texte: "Fermeture", heures: 8 },
    { id: "e-fmh", asmat_id: UID, date: `${mk}-24`, type: "formh", texte: "Formation du soir", heures: 6 },
  ]));
  return r.fulfill(json([]));
});

await page.goto(`${URL_BASE}/?acces=${CLE}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);
const passer = async () => {
  for (let i = 0; i < 6; i++) {
    const b = page.getByRole("button", { name: /^Passer$/ });
    if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(400); } else break;
  }
};
await passer();
const clic = (t) => page.evaluate((t) => {
  const L = (b) => b.innerText.split("\n")[0].trim();
  const n = [...document.querySelectorAll("button")].find((b) => L(b) === t)
    || [...document.querySelectorAll("button")].find((b) => L(b).includes(t));
  if (n) { n.click(); return true; }
  return false;
}, t);

await clic("Administratif"); await page.waitForTimeout(500);
await clic("Paie & Contrats"); await page.waitForTimeout(2000);
await clic("Frais kilométriques"); await page.waitForTimeout(2000);
await passer();
await page.screenshot({ path: `${SORTIE}/frais-km.png`, fullPage: true });

let ko = 0;
const dire = (ok, quoi, detail = "") => { if (!ok) ko++; console.log(`  ${ok ? "ok " : "KO "} ${quoi.padEnd(54)} ${detail}`); };
const alerteVisible = () => page.evaluate(() => document.body.innerText.includes("Taux kilométrique sous le minimum"));
const champTaux = page.locator('input[placeholder="Taux €/km"]');

console.log("\n=== FRAIS KILOMÉTRIQUES — la borne basse ===\n");
dire(await page.evaluate(() => /Frais kilométriques \(IK\)/.test(document.body.innerText)), "l'écran s'ouvre");
dire(!(await alerteVisible()), "au taux pré-rempli (barème fiscal), pas d'alerte");

await champTaux.fill("0.20"); await page.waitForTimeout(400);
await page.screenshot({ path: `${SORTIE}/frais-km-sous-plancher.png`, fullPage: true });
dire(await alerteVisible(), "à 0,200 €/km en 5 CV, l'alerte apparaît");

await champTaux.fill("0.33"); await page.waitForTimeout(400);
dire(!(await alerteVisible()), "à 0,330 €/km — le plancher exact — plus d'alerte");

await champTaux.fill("0.329"); await page.waitForTimeout(400);
dire(await alerteVisible(), "à 0,329 €/km, l'alerte revient");

// Le plancher suit la puissance du véhicule : 6 CV est à 0,42.
await page.evaluate(() => {
  const s = [...document.querySelectorAll("select")].find((x) => [...x.options].some((o) => /CV/.test(o.textContent)));
  if (s) { s.value = "6"; s.dispatchEvent(new Event("change", { bubbles: true })); }
});
await page.waitForTimeout(500);
await champTaux.fill("0.35"); await page.waitForTimeout(400);
dire(await alerteVisible(), "en 6 CV, 0,350 €/km est sous le plancher de 0,42");
dire(await page.evaluate(() => document.body.innerText.includes("0,42 €/km")), "la note annonce le plancher du véhicule choisi");

await champTaux.fill("0.45"); await page.waitForTimeout(400);
dire(!(await alerteVisible()), "en 6 CV, 0,450 €/km ne déclenche rien");

dire(erreurs.length === 0, "aucune erreur JavaScript", erreurs.join(" | "));
await nav.close();
console.log(ko ? `\n${ko} problème(s)\n` : `\nTout est conforme. Captures dans ${SORTIE}\n`);
process.exit(ko ? 1 : 0);
