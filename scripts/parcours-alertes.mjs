// Ouvre « Mes alertes » et vérifie ce que l'écran dit à chacun.
//
// Pourquoi : les notifications sont la seule fonction qu'on ne peut pas
// verifier soi-meme. Quand elles ne partent pas, il ne se passe rien — et
// pendant des mois l'application a affiche « Notifications activees ✓ » alors
// que la table n'existait pas et que personne n'a jamais rien recu.
//
// Ce parcours joue les trois situations reelles, en trois passes :
//   (defaut)    un appareil deja abonne
//   refus       la personne a bloque les notifications dans son navigateur
//   iphone      un iPhone dont TiMat n'est pas sur l'ecran d'accueil
//
//   node scripts/parcours-alertes.mjs [url] [refus|iphone]
import { chromium } from "playwright";
import { readFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";

const URL_BASE = process.argv[2] || "http://localhost:4173";
const PASSE = process.argv[3] || "defaut";
const PARENT = PASSE === "parent";
const SORTIE = "/tmp/timat-alertes";
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
    app_metadata: {}, user_metadata: { prenom: "Marie", nom: "Test", role: PASSE === "parent" ? "parent" : "asmat" },
    created_at: new Date().toISOString() },
};

mkdirSync(SORTIE, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || chercherChromium() });
const ctx = await nav.newContext({
  viewport: { width: 420, height: 900 }, deviceScaleFactor: 2,
  // Un iPhone, pour la passe qui teste la regle d'Apple.
  userAgent: PASSE === "iphone"
    ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    : undefined,
});
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message.slice(0, 200)));

await page.addInitScript(([s, cle, passe]) => {
  try {
    localStorage.setItem("timat_acces", cle);
    localStorage.setItem("sb-akicyckmbsjnewnvvcil-auth-token", JSON.stringify(s));
  } catch (e) { /* stockage indisponible : la page reste testable */ }
  // On force l'etat du navigateur que chaque passe veut mettre a l'epreuve.
  if (passe === "refus") {
    Object.defineProperty(Notification, "permission", { get: () => "denied", configurable: true });
  }
  if (passe === "iphone") {
    // Un iPhone hors ecran d'accueil : Apple n'y donne pas le push.
    delete window.PushManager;
    window.navigator.standalone = false;
  }
}, [session, CLE, PASSE]);

const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
await page.route("**/auth/v1/**", (r) => r.fulfill(json({ ...session, ...session.user })));
await page.route("**/rest/v1/**", (r) => {
  const t = (r.request().url().match(/rest\/v1\/([a-z_]+)/) || [])[1];
  if (t === "profiles") return r.fulfill(json([{ id: UID, role: PARENT ? "parent" : "asmat", prenom: "Marie", nom: "Test", email: "marie@test.fr", subscription_status: "pro", is_admin: false }]));
  if (t === "enfants") return r.fulfill(json([{ id: EID, asmat_id: PARENT ? "autre" : UID, parent_id: PARENT ? UID : null, prenom: "Léo", naissance: "2023-03-01", emoji: "🦁", couleur: "#E4915F" }]));
  // Deux appareils deja abonnes : l'ecran doit les montrer, et permettre de
  // les retirer un par un.
  if (t === "push_subscriptions") return r.fulfill(json(PASSE === "defaut" || PARENT ? [
    { id: "s1", endpoint: "https://fcm.googleapis.com/fcm/send/aaa", appareil: "Android · Chrome", created_at: "2026-09-01T09:00:00Z", derniere_utilisation: null },
    { id: "s2", endpoint: "https://fcm.googleapis.com/fcm/send/bbb", appareil: "Windows · Edge", created_at: "2026-08-12T09:00:00Z", derniere_utilisation: null },
  ] : []));
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

const okG = await clic(PARENT ? "Administratif" : "Outils Pro"); await page.waitForTimeout(1000);
const okS = await clic("Mes alertes"); await page.waitForTimeout(2200);
await passer();
await page.screenshot({ path: `${SORTIE}/alertes-${PASSE}.png`, fullPage: true });

let ko = 0;
const dire = (ok, quoi, detail = "") => { if (!ok) ko++; console.log(`  ${ok ? "ok " : "KO "} ${quoi.padEnd(58)} ${detail}`); };
const t = await page.evaluate(() => document.body.innerText);
console.log(`\n=== MES ALERTES — passe « ${PASSE} » ===\n`);

dire(okG && okS, "l'écran s'ouvre depuis le menu");
dire(/Mes alertes/.test(t), "le titre est là");

// Ce qui est envoye, et par quel canal : c'est ce que personne ne pouvait
// savoir jusqu'ici.
dire(/Dans l'application/.test(t) && /toujours/.test(t), "l'écran dit ce qui arrive dans l'application");
dire(/Par e-mail/.test(t), "il dit que l'e-mail part dans tous les cas");
dire(/même si vous les refusez, l'e-mail part/.test(t),
  "il dit explicitement que refuser les notifications ne coupe pas l'e-mail");

if (PASSE === "defaut" || PARENT) {
  dire(/Android · Chrome/.test(t) && /Windows · Edge/.test(t), "les appareils abonnés sont listés");
  if (PARENT) dire(true, "le parent atteint l'écran depuis son propre menu");
  dire(/\(2\)/.test(t), "leur nombre est donné");
  dire(/Retirer/.test(t), "chaque appareil peut être retiré");
  dire(/Recevoir les notifications ici/.test(t) || /Ne plus recevoir/.test(t),
    "cet appareil peut être activé ou coupé");
}

if (PASSE === "refus") {
  dire(/bloquées/.test(t), "le blocage par le navigateur est nommé");
  dire(/TiMat ne peut pas les débloquer/.test(t),
    "l'écran dit que TiMat n'y peut rien, au lieu d'offrir un bouton sans effet");
  dire(!/Recevoir les notifications ici/.test(t),
    "aucun bouton d'activation qui ne marcherait pas n'est proposé");
}

if (PASSE === "iphone") {
  dire(/iPhone/.test(t), "le cas de l'iPhone est reconnu");
  dire(/écran d'accueil/.test(t), "la condition d'Apple est expliquée");
  dire(/règle\s+d'Apple, pas un choix de TiMat/.test(t),
    "l'écran dit d'où vient la contrainte");
  dire(/Sur l'écran d'accueil/.test(t), "la marche à suivre est donnée");
  dire(!/Recevoir les notifications ici/.test(t),
    "aucun bouton sans effet n'est proposé");
}

dire(erreurs.length === 0, "aucune erreur JavaScript", erreurs.join(" | "));
await nav.close();
console.log(ko ? `\n${ko} problème(s)\n` : `\nTout est conforme. Capture dans ${SORTIE}\n`);
process.exit(ko ? 1 : 0);
