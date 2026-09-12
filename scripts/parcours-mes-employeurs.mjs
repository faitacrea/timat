// Ouvre l'ecran « Mes employeurs » : ce que chaque famille doit ce mois-ci, et
// les conges a poser avec toutes.
//
// Pourquoi : quand on accueille les enfants de trois familles, personne ne voit
// le total — ni les parents, qui ne voient que leur contrat, ni l'application
// jusqu'ici. Et la convention demande de fixer les conges d'un commun accord
// avec TOUTES au plus tard le 1er mars : cette echeance n'existait nulle part.
//
//   node scripts/parcours-mes-employeurs.mjs [url]
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
const SORTIE = "/tmp/timat-employeurs";
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
  if (t === "enfants") return r.fulfill(json([
    { id: EID, asmat_id: UID, prenom: "Léo", naissance: "2023-03-01", emoji: "🦁", couleur: "#E4915F" },
    { id: "e-2", asmat_id: UID, prenom: "Jade", naissance: "2024-01-10", emoji: "🌸", couleur: "#5DA9A1" },
    { id: "e-3", asmat_id: UID, prenom: "Noé", naissance: "2024-06-02", emoji: "🐻", couleur: "#B8622F" },
    { id: "e-4", asmat_id: UID, prenom: "Ava", naissance: "2025-02-14", emoji: "⭐", couleur: "#5DA9A1" },
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
  if (t === "versements") return r.fulfill(json([
    { enfant_id: EID, montant: 500, date: `${mk}-05`, mode: "virement" },
  ]));
  if (t === "bulletins") return r.fulfill(json([
    { enfant_id: EID, mois: mk, salaire_net: 568.8, entretien: 79.8 },
  ]));
  if (t === "contrats") return r.fulfill(json([
    { id: "c1", enfant_id: EID, asmat_id: UID, debut: "2026-01-01", heures_hebdo: 40, taux_horaire: 4.20, annee_complete: true, entretien: 3.8, jours: ["Lundi","Mardi","Mercredi","Jeudi","Vendredi"], horaires: "07h30-17h30", signe_asmat: true },
    { id: "c2", enfant_id: "e-2", asmat_id: UID, debut: "2026-01-01", heures_hebdo: 20, taux_horaire: 4.20, annee_complete: true, entretien: 3.8, jours: ["Lundi","Mardi"], horaires: "08h00-18h00", signe_asmat: true },
    { id: "c3", enfant_id: "e-3", asmat_id: UID, debut: "2026-01-01", heures_hebdo: 12, taux_horaire: 4.50, annee_complete: false, semaines_accueil: 36, entretien: 3.8, jours: ["Mercredi"], horaires: "08h00-18h00", signe_asmat: true },
  ]));
  // Quatre journees : 8 h de maladie, 8 h de formation sur le temps d'accueil,
  // 8 h de fermeture, 6 h de formation hors temps d'accueil. Seules la maladie
  // et la fermeture se deduisent ; la formation hors accueil ouvre droit a
  // l'allocation, qui n'est PAS une ligne de salaire.
  if (t === "evenements") return r.fulfill(json([
    { id: "c1", asmat_id: UID, date: `${new Date().getFullYear()}-08-10`, type: "cng", texte: "Congés" },
    { id: "c2", asmat_id: UID, date: `${new Date().getFullYear()}-08-11`, type: "cng", texte: "Congés" },
    { id: "c3", asmat_id: UID, date: `${new Date().getFullYear()}-08-12`, type: "cng", texte: "Congés" },
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

await clic("Outils Pro"); await page.waitForTimeout(1200);
await clic("Mes employeurs"); await page.waitForTimeout(2500);
await passer();
await page.screenshot({ path: `${SORTIE}/mes-employeurs.png`, fullPage: true });

let ko = 0;
const dire = (ok, quoi, detail = "") => { if (!ok) ko++; console.log(`  ${ok ? "ok " : "KO "} ${quoi.padEnd(58)} ${detail}`); };
const t = await page.evaluate(() => document.body.innerText);
console.log("\n=== MES EMPLOYEURS — revenus du mois et conges ===\n");

dire(/Mes employeurs/.test(t), "l'écran s'ouvre");
dire(/4 familles/.test(t), "les quatre familles sont comptées");
// Leo a un bulletin (568,80 + 79,80 = 648,60) ; les deux autres sont estimes.
dire(/648,60 €/.test(t), "le montant du bulletin fait foi quand il existe");
dire(/estimation/.test(t), "les montants sans bulletin sont annoncés comme estimés");
dire(/reçu 500,00 €/.test(t) && /il manque 148,60 €/.test(t), "le versement partiel est signalé");
dire(/aucun versement enregistré/.test(t), "les familles qui n'ont pas payé sont visibles");
dire(/aucun contrat enregistré pour cet enfant/.test(t), "un enfant sans contrat ne produit aucune estimation");
dire(/Total du mois/.test(t), "le total toutes familles confondues est donné");

dire(/1(er)? mars/.test(t), "l'échéance du 1er mars est rappelée");
dire(/10\/08\/|11\/08\/|12\/08\//.test(t), "les congés posés sont regroupés en période");
dire(/concerne 4 familles/.test(t), "une période de congés concerne toutes les familles");

dire(erreurs.length === 0, "aucune erreur JavaScript", erreurs.join(" | "));
await nav.close();
console.log(ko ? `\n${ko} problème(s)\n` : `\nTout est conforme. Capture dans ${SORTIE}\n`);
process.exit(ko ? 1 : 0);
