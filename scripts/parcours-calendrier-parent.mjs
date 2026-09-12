// Le calendrier partagé, vu du côté parent, sur un vrai compte.
//
// Pourquoi : la table « evenements » n'était lisible que par l'assistante
// maternelle (politique « asmat_id = auth.uid() »). Le calendrier d'un parent
// restait donc vide sur un compte réel, et son « rendez-vous à noter » ne
// pouvait pas être enregistré. Les autres parcours ne l'avaient pas vu : ils
// passent par le compte de démonstration, dont les événements sont en dur.
//
// Ce parcours vérifie ce qui compte vraiment pour un parent : voir les
// journées où son enfant ne sera PAS accueilli (congé, fermeture, maladie,
// formation de l'assistante maternelle), et pouvoir noter un rendez-vous.
//
//   node scripts/parcours-calendrier-parent.mjs [url]
import { chromium } from "playwright";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const URL_BASE = process.argv[2] || "http://localhost:4173";
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

const PARENT = "33333333-3333-4333-8333-333333333333";
const ASMAT = "11111111-1111-4111-8111-111111111111";
const EID = "22222222-2222-4222-8222-222222222222";
const d = new Date();
const jour = (n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const session = {
  access_token: "faux", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "faux",
  user: { id: PARENT, aud: "authenticated", role: "authenticated", email: "sophie@test.fr",
    app_metadata: {}, user_metadata: { prenom: "Sophie", nom: "Test", role: "parent" },
    created_at: new Date().toISOString() },
};

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || chercherChromium() });
const page = await nav.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2, locale: "fr-FR", timezoneId: "Europe/Paris" });
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message.slice(0, 160) + " @ " + String(e.stack || "").split(String.fromCharCode(10)).slice(1, 3).join(" ")));

await page.addInitScript(([s, cle]) => {
  try {
    localStorage.setItem("timat_acces", cle);
    localStorage.setItem("sb-akicyckmbsjnewnvvcil-auth-token", JSON.stringify(s));
  } catch (e) { /* stockage indisponible */ }
}, [session, CLE]);

// Ce que la nouvelle politique de lecture renvoie à un parent : les événements
// de l'assistante maternelle de son enfant.
const EVENEMENTS = [
  { id: "a", asmat_id: ASMAT, auteur_id: ASMAT, date: jour(2), type: "cng", texte: "Congés assmat", heures: null },
  { id: "b", asmat_id: ASMAT, auteur_id: ASMAT, date: jour(3), type: "fer", texte: "Fermeture exceptionnelle", heures: 8 },
  { id: "c", asmat_id: ASMAT, auteur_id: ASMAT, date: jour(4), type: "mal", texte: "Maladie", heures: 8 },
  { id: "d", asmat_id: ASMAT, auteur_id: ASMAT, date: jour(5), type: "form", texte: "Formation", heures: 8 },
  { id: "e", asmat_id: ASMAT, auteur_id: ASMAT, date: jour(6), type: "sor", texte: "Sortie au parc", heures: null },
];

let insereParLeParent = null;
const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
await page.route("**/auth/v1/**", (r) => r.fulfill(json({ ...session, ...session.user })));
await page.route("**/rest/v1/**", (r) => {
  const req = r.request();
  const t = (req.url().match(/rest\/v1\/([a-z_]+)/) || [])[1];
  if (t === "evenements" && req.method() === "POST") {
    try { insereParLeParent = JSON.parse(req.postData() || "{}"); } catch (e) { insereParLeParent = "illisible"; }
    const ligne = Array.isArray(insereParLeParent) ? insereParLeParent[0] : insereParLeParent;
    return r.fulfill(json([{ id: "nouveau", ...ligne }]));
  }
  if (t === "profiles") return r.fulfill(json([{ id: PARENT, role: "parent", prenom: "Sophie", nom: "Test", email: "sophie@test.fr", subscription_status: "free" }]));
  if (t === "enfants") return r.fulfill(json([{ id: EID, asmat_id: ASMAT, parent_id: PARENT, prenom: "Léo", naissance: "2023-03-01", emoji: "🦁", couleur: "#E4915F" }]));
  if (t === "evenements") return r.fulfill(json(EVENEMENTS));
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
    || [...document.querySelectorAll("button")].find((b) => L(b).startsWith(t));
  if (n) { n.click(); return true; }
  return false;
}, t);

await clic("Administratif"); await page.waitForTimeout(500);
await clic("Calendrier"); await page.waitForTimeout(2000);
await passer();

const vus = await page.evaluate(() => document.body.innerText);
const ecarts = [];
const doitVoir = (quoi) => {
  const ok = vus.includes(quoi);
  if (!ok) ecarts.push(`le parent ne voit pas « ${quoi} »`);
  console.log(`  ${ok ? "ok " : "KO "} le parent voit « ${quoi} »`);
};
console.log("\n=== CALENDRIER PARTAGÉ — CÔTÉ PARENT ===\n");
doitVoir("Congés assmat");
doitVoir("Fermeture exceptionnelle");
doitVoir("Maladie");
doitVoir("Formation");
doitVoir("Sortie au parc");

// Le parent note un rendez-vous : il doit partir en base, à son nom, dans le
// calendrier de l'assistante maternelle de son enfant.
await clic("Ajouter"); await page.waitForTimeout(700);
const themeOk = await clic("Rendez-vous");
await page.waitForTimeout(700);
if (themeOk) {
  await page.fill('input.inp:not([type="date"]):not([type="number"])', "RDV pédiatre");
  await clic("Ajouter"); await page.waitForTimeout(1200);
}
const l = Array.isArray(insereParLeParent) ? insereParLeParent[0] : insereParLeParent;
const verif = (nom, cond) => { if (!cond) ecarts.push(nom); console.log(`  ${cond ? "ok " : "KO "} ${nom}`); };
console.log("");
verif("le rendez-vous du parent part bien en base", !!l);
if (l) {
  verif("il est enregistré au nom du parent (auteur_id)", l.auteur_id === PARENT);
  verif("il vise le calendrier de l'assmat de son enfant", l.asmat_id === ASMAT);
  verif("il est rattaché à l'enfant", l.enfant_id === EID);
  verif("aucune heure n'y est attachée (pas une absence)", l.heures === null || l.heures === undefined);
}
await nav.close();

console.log(`\nerreurs JavaScript : ${erreurs.length}`);
for (const e of erreurs) console.log("    " + e);
console.log(ecarts.length || erreurs.length ? `\n${ecarts.length} écart(s)\n` : "\nTout est conforme.\n");
process.exit(ecarts.length || erreurs.length ? 1 : 0);
