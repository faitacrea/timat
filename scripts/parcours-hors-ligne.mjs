// Coupe vraiment le reseau pendant un pointage, puis le remet.
//
// Pourquoi ce parcours : le mode hors ligne est la seule fonction de
// l'application qui, lorsqu'elle tombe, ne produit AUCUN signe. Une assistante
// maternelle pointe une arrivee dans une maison sans reseau, l'ecran affiche
// une confirmation, et la journee n'existe nulle part. Rien ne clignote, rien
// n'alerte : le defaut ne se voit qu'au moment de faire la paie, un mois plus
// tard, quand les heures manquent.
//
// Le test de la file (scripts/test-hors-ligne.mjs) prouve la logique.
// Celui-ci prouve ce que la personne VOIT : que l'application dit que le
// pointage n'est pas encore enregistre, et qu'elle l'envoie seule au retour.
//
//   node scripts/parcours-hors-ligne.mjs [url]
import { chromium } from "playwright";
import { readFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";

const URL_BASE = process.argv[2] || "http://localhost:4173";
const SORTIE = "/tmp/timat-hors-ligne";
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
const session = {
  access_token: "faux", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "faux",
  user: { id: UID, aud: "authenticated", role: "authenticated", email: "marie@test.fr",
    app_metadata: {}, user_metadata: { prenom: "Marie", nom: "Test", role: "asmat" },
    created_at: new Date().toISOString() },
};

mkdirSync(SORTIE, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || chercherChromium() });
const ctx = await nav.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2, locale: "fr-FR", timezoneId: "Europe/Paris" });
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message.slice(0, 200)));

await page.addInitScript(([s, cle]) => {
  try {
    localStorage.setItem("timat_acces", cle);
    localStorage.setItem("sb-akicyckmbsjnewnvvcil-auth-token", JSON.stringify(s));
  } catch (e) { /* stockage indisponible : la page reste testable */ }
}, [session, CLE]);

const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
// Ce que le serveur a REELLEMENT recu : c'est la seule preuve qui compte.
const recus = [];
await page.route("**/auth/v1/**", (r) => r.fulfill(json({ ...session, ...session.user })));
await page.route("**/rest/v1/**", (r) => {
  const req = r.request();
  const t = (req.url().match(/rest\/v1\/([a-z_]+)/) || [])[1];
  if (t === "pointages" && req.method() === "POST") {
    try { recus.push(JSON.parse(req.postData() || "{}")); } catch { recus.push({}); }
    return r.fulfill(json([]));
  }
  if (t === "profiles") return r.fulfill(json([{ id: UID, role: "asmat", prenom: "Marie", nom: "Test", email: "marie@test.fr", subscription_status: "pro", is_admin: false }]));
  if (t === "enfants") return r.fulfill(json([{ id: EID, asmat_id: UID, prenom: "Léo", naissance: "2023-03-01", emoji: "🦁", couleur: "#E4915F" }]));
  if (t === "contrats") return r.fulfill(json([{ id: "c1", enfant_id: EID, asmat_id: UID, debut: "2026-01-01", heures_hebdo: 40, taux_horaire: 4.20, annee_complete: true, entretien: 3.8, jours: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"], horaires: "07h30–17h30" }]));
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

await clic("L'enfant"); await page.waitForTimeout(1000);
await clic("Pointage"); await page.waitForTimeout(2000);
await passer();

let ko = 0;
const dire = (ok, quoi, detail = "") => { if (!ok) ko++; console.log(`  ${ok ? "ok " : "KO "} ${quoi.padEnd(58)} ${detail}`); };
const texte = () => page.evaluate(() => document.body.innerText);

console.log("\n=== HORS LIGNE — pointer dans une maison sans réseau ===\n");
dire(/Pointage/.test(await texte()), "l'écran de pointage s'ouvre");

// --- La coupure ---
await ctx.setOffline(true);
await page.waitForTimeout(800);
const tCoupe = await texte();
dire(/Hors ligne/.test(tCoupe), "la coupure est annoncée, pas subie");
await page.screenshot({ path: `${SORTIE}/1-coupure.png`, fullPage: true });

const recusAvant = recus.length;
const aPointe = await clic("Pointer l'arrivée") || await clic("arrivée");
await page.waitForTimeout(1500);
const tApres = await texte();
dire(aPointe, "le bouton de pointage reste utilisable hors ligne");
dire(recus.length === recusAvant, "rien n'est parti au serveur pendant la coupure", `${recus.length - recusAvant} envoi(s)`);
dire(/en attente de réseau|pointage noté|notés? sur cet appareil/i.test(tApres),
  "l'application dit que le pointage n'est PAS encore enregistré");
dire(!/✅ Arrivée pointée/.test(tApres), "elle ne fait pas croire que c'est enregistré");
dire(!/Pas encore pointé/.test(tApres), "l'écran n'oublie pas le pointage qu'on vient de noter");
const enFile = await page.evaluate(() => JSON.parse(localStorage.getItem("timat:hl:file") || "[]").length);
dire(enFile === 1, "le pointage est conservé sur l'appareil", `${enFile} en file`);
await page.screenshot({ path: `${SORTIE}/2-pointage-en-file.png`, fullPage: true });

// Un rechargement de la page ne doit pas faire disparaitre ce qui est en file :
// c'est le cas reel, l'application fermee puis rouverte dans la voiture.
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(3500);
await passer();
await clic("L'enfant"); await page.waitForTimeout(800);
await clic("Pointage"); await page.waitForTimeout(1800);
await passer();
const tRecharge = await texte();
dire(!/Chargement…/.test(tRecharge) && /Pointage des heures/.test(tRecharge),
  "l'application démarre entièrement sans réseau");
dire(!/Pas encore pointé/.test(tRecharge), "après rechargement, le pointage en attente est toujours là");
dire(/pas encore enregistré/.test(tRecharge), "et il est toujours annoncé comme non enregistré");
await page.screenshot({ path: `${SORTIE}/2b-apres-rechargement.png`, fullPage: true });

// --- Le retour du reseau ---
await ctx.setOffline(false);
await page.evaluate(() => window.dispatchEvent(new Event("online")));
await page.waitForTimeout(2500);
const tRetour = await texte();
dire(recus.length > recusAvant, "au retour du réseau, le pointage part tout seul", `${recus.length - recusAvant} envoi(s)`);
const resteEnFile = await page.evaluate(() => JSON.parse(localStorage.getItem("timat:hl:file") || "[]").length);
dire(resteEnFile === 0, "la file est vidée", `${resteEnFile} restant(s)`);
const envoye = recus.find((x) => x && x.enfant_id === EID);
dire(!!envoye && !!envoye.arrivee, "c'est bien l'heure notée pendant la coupure qui est envoyée", envoye ? envoye.arrivee : "—");
dire(!/en attente de réseau/.test(tRetour), "le bandeau d'attente disparaît");
await page.screenshot({ path: `${SORTIE}/3-envoye.png`, fullPage: true });

dire(erreurs.length === 0, "aucune erreur JavaScript", erreurs.join(" | "));
await nav.close();
console.log(ko ? `\n${ko} problème(s)\n` : `\nTout est conforme. Captures dans ${SORTIE}\n`);
process.exit(ko ? 1 : 0);
