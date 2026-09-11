// Ouvre l'ecran « Mon temps de travail » avec trois enfants dont deux se
// chevauchent.
//
// Pourquoi : c'est la seule vue de l'application qui reunit les contrats. Le
// piege qu'elle doit eviter est d'additionner les heures de chaque enfant —
// deux enfants presents de 8 h a 17 h font neuf heures de travail, pas dix-huit.
// Le calcul est teste a part ; ce parcours verifie que l'ecran affiche bien le
// total REUNI et non la somme.
//
//   node scripts/parcours-temps-travail.mjs [url]
import { chromium } from "playwright";
import { readFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";

const URL_BASE = process.argv[2] || "http://localhost:4173";
// Passe « sous-minimum » : le contrat porte un taux illegal, l'alerte doit sortir.
const SOUS_MINIMUM = process.argv[3] === "sous-minimum";
// Passe « annee-incomplete » : accueil sur 36 semaines. La mensualisation doit
// tomber a 504 EUR au lieu de 728 — l'application appliquait 52 semaines a tous
// les contrats.
const ANNEE_INCOMPLETE = process.argv[3] === "annee-incomplete";
// Passe « envoye » : le bulletin du mois a deja ete envoye au parent. Le
// bandeau annoncait « disponible dans Documents » sans donner le moyen de
// l'ouvrir : il fallait quitter l'ecran pour relire ce qu'on venait d'envoyer.
const DEJA_ENVOYE = process.argv[3] === "envoye" || process.argv[3] === "envoye-ancien";
// Passe « envoye-ancien » : le bulletin a ete envoye AVANT la refonte du
// modele. Le PDF stocke n'est jamais recalcule : l'application doit le dire.
const BULLETIN_ANCIEN = process.argv[3] === "envoye-ancien";
const SORTIE = "/tmp/timat-temps";
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
const page = await nav.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
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
  if (t === "enfants") return r.fulfill(json([
    { id: EID, asmat_id: UID, prenom: "Léo", naissance: "2023-03-01", emoji: "🦁", couleur: "#E4915F" },
    { id: "e-2", asmat_id: UID, prenom: "Jade", naissance: "2024-01-10", emoji: "🌸", couleur: "#5DA9A1" },
    { id: "e-3", asmat_id: UID, prenom: "Noé", naissance: "2024-06-02", emoji: "🐻", couleur: "#B8622F" },
  ]));
  // Trois enfants, dont deux qui se chevauchent : la somme naive donnerait
  // beaucoup plus que le temps reellement travaille.
  if (t === "pointages") {
    const lignes = [];
    const an = new Date().getFullYear();
    for (let j = 1; j <= 20; j++) {
      const d = `${an}-03-${String(j).padStart(2, "0")}`;
      lignes.push({ date: d, arrivee: "07:30", depart: "17:30", enfant_id: EID });
      lignes.push({ date: d, arrivee: "08:00", depart: "16:00", enfant_id: "e-2" });
      lignes.push({ date: d, arrivee: "17:00", depart: "18:45", enfant_id: "e-3" });
    }
    return r.fulfill(json(lignes));
  }
  if (t === "contrats") return r.fulfill(json([{ id: "c1", enfant_id: EID, asmat_id: UID, debut: "2026-01-01", fin: "2027-08-31", heures_hebdo: 40, taux_horaire: SOUS_MINIMUM ? 3.5 : 4.20, annee_complete: !ANNEE_INCOMPLETE, semaines_accueil: ANNEE_INCOMPLETE ? 36 : null, entretien: 3.8, jours: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"], horaires: "07h30–17h30" }]));
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
  if (t === "bulletins" && DEJA_ENVOYE) return r.fulfill(json([{
    mois: mk, annee: Number(mk.slice(0, 4)), contrat_id: "c1", enfant_id: EID,
    envoye_au_parent: true, date_envoi: BULLETIN_ANCIEN ? "2026-08-01T10:00:00Z" : new Date().toISOString(),
    pdf_storage_path: UID + "/bulletins/" + mk + ".pdf",
  }]));
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

const okG = await clic("Outils Pro"); await page.waitForTimeout(1200);
const okS = await clic("Mon temps de travail"); await page.waitForTimeout(2500);
console.log("  .. clics :", okG, okS);
console.log("  .. boutons :", (await page.evaluate(() => [...document.querySelectorAll("button")].map(b => b.innerText.split("\n")[0].trim()).filter(Boolean).join(" | "))).slice(0, 600));
await passer();
await page.screenshot({ path: `${SORTIE}/temps-travail.png`, fullPage: true });

let ko = 0;
const dire = (ok, quoi, detail = "") => { if (!ok) ko++; console.log(`  ${ok ? "ok " : "KO "} ${quoi.padEnd(56)} ${detail}`); };
const t = await page.evaluate(() => document.body.innerText);
console.log("\n=== TEMPS DE TRAVAIL — tous employeurs confondus ===\n");

dire(/Mon temps de travail/.test(t), "l'écran s'ouvre");
dire(/elles ne s'additionnent pas/.test(t), "le principe du comptage est expliqué");

// 20 journees de 07h30 a 18h45 = 11,25 h -> 225 h reunies.
// La somme naive ferait (10 + 8 + 1,75) x 20 = 395 h.
const nombre = (re) => { const m = t.match(re); return m ? parseFloat(m[1].replace(",", ".")) : null; };
const annee = nombre(/Heures travaillées en \d{4}\s*\n?\s*([\d,]+) h/);
dire(annee === 225, "les heures de l'année sont réunies, pas additionnées", `${annee} h (attendu 225)`);
dire(/395,00 h/.test(t), "l'écart avec la somme naïve est montré", "395 h");
dire(/20\b/.test(t) && /simultané/i.test(t), "les journées à plusieurs enfants sont comptées");

const amplitude = nombre(/Amplitude de la plus longue journée\s*\n?\s*([\d,]+) h/);
dire(amplitude === 11.3 || amplitude === 11.2, "l'amplitude du jour le plus long est juste", `${amplitude} h`);
dire(/2 250 h/.test(t), "le plafond annuel est cité en nombre rond");
dire(/L\. 423-22/.test(t) && /article 110/.test(t), "les sources des plafonds sont données");

dire(erreurs.length === 0, "aucune erreur JavaScript", erreurs.join(" | "));
await nav.close();
console.log(ko ? `\n${ko} problème(s)\n` : `\nTout est conforme. Capture dans ${SORTIE}\n`);
process.exit(ko ? 1 : 0);
