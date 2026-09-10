// Parcours du bulletin de salaire sur un VRAI compte Pro.
//
// Pourquoi ce parcours separe : les autres parcours passent par le compte de
// demonstration, qui n'est pas Pro. Le bulletin y est donc remplace par
// l'ecran « fonction reservee », et n'a jamais ete rendu une seule fois. Il
// contenait pourtant une const lue avant sa declaration, qui faisait planter
// tout l'ecran pour chaque abonnee reelle. Ce script simule une session
// authentifiee et des donnees Supabase, pour que ce chemin soit couvert.
//
// Il verifie aussi la retenue pour absence (CCN 3239 art. 111) : la maladie et
// la fermeture se deduisent, la formation non.
//
//   node scripts/parcours-bulletin.mjs [url]
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
const SORTIE = "/tmp/timat-bulletin";
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
  if (t === "enfants") return r.fulfill(json([{ id: EID, asmat_id: UID, prenom: "Léo", naissance: "2023-03-01", emoji: "🦁", couleur: "#E4915F" }]));
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

await clic("Administratif"); await page.waitForTimeout(500);
await clic("Paie & Contrats"); await page.waitForTimeout(2000);
await clic("Bulletin"); await page.waitForTimeout(2500);
await passer();
await page.screenshot({ path: `${SORTIE}/bulletin.png`, fullPage: true });

const m = await page.evaluate(() => {
  const t = document.body.innerText;
  const i = t.indexOf("Retenue absence");
  const nb = (re) => { const x = t.match(re); return x ? parseFloat(x[1].replace(",", ".")) : null; };
  return {
    rendu: /BULLETIN DE PAIE/.test(t),
    retenue: i >= 0 ? t.slice(i, i + 70).replace(/\n/g, " · ") : null,
    heuresRetenues: nb(/Retenue absence[\s\S]{0,30}?(\d+)h/),
    montant: nb(/Retenue absence[\s\S]{0,60}?−\s*([\d.,]+)€/),
    brut: nb(/SALAIRE BRUT\s*\n?\s*([\d.,]+)/),
    base: nb(/Salaire de base[^\n]*\n[^\n]*\n\s*([\d.,]+)€/),
    art111: /art\. 111/.test(t),
    alerteMini: /sous le minimum légal/i.test(t),
    semainesAffichees: (t.match(/Mensualisation en année (?:in)?complète\s*:\s*(\d+) semaines/) || [])[1],
    modeAffiche: /Mensualisation en année incomplète/.test(t) ? "incomplète" : /Mensualisation en année complète/.test(t) ? "complète" : null,
    // Une cotisation prise au hasard doit etre assise sur le brut APRES retenue.
    vieillesse: nb(/Vieillesse plafonnée\s*\n?\s*([\d.,]+)€/),
    alloc: nb(/Allocation de formation — ([\d.,]+) €/),
    allocHorsBulletin: /versée par IPERIA/i.test(t) && !/RÉMUNÉRATION[\s\S]{0,600}Allocation de formation/.test(t),
    // Le bulletin deja envoye doit pouvoir se relire d'ici, sans passer par
    // l'ecran Documents.
    bandeauEnvoye: /Bulletin envoyé au parent/.test(t),
    boutonPdf: /Ouvrir le bulletin \(PDF\)/.test(t),
    renvoiSecheDocuments: /disponible dans Documents/.test(t),
    majProposee: /Mettre à jour le PDF/.test(t),
    majExpliquee: /version précédente du bulletin/.test(t),
    majSansRenotifier: /le parent n'est pas renotifié/.test(t),
  };
});
await nav.close();

const ecarts = [];
if (DEJA_ENVOYE) {
  const dire = (ok, quoi, detail = "") => { if (!ok) ecarts.push(quoi); console.log(`  ${ok ? "ok " : "KO "} ${quoi.padEnd(52)} ${detail}`); };
  dire(m.bandeauEnvoye, "le bandeau « envoyé au parent » s'affiche");
  dire(m.boutonPdf, "le bulletin s'ouvre depuis l'écran, sans passer par Documents");
  dire(!m.renvoiSecheDocuments, "plus de renvoi sec vers Documents quand le PDF existe");
  if (BULLETIN_ANCIEN) {
    dire(m.majProposee, "un bulletin périmé propose sa mise à jour");
    dire(m.majExpliquee, "l'écran dit ce qui manque à l'ancien PDF");
    dire(m.majSansRenotifier, "la mise à jour annonce qu'elle ne renotifie pas le parent");
  } else {
    dire(!m.majProposee, "un bulletin à jour ne propose pas de mise à jour");
  }
}
// En mode « sous-minimum » on ne vérifie que l'alerte : les montants changent
// forcément puisque le taux n'est pas le même.
const attendu = (nom, val, cible, tol = 0.02) => {
  if (SOUS_MINIMUM || ANNEE_INCOMPLETE || DEJA_ENVOYE) return;
  const ok = val != null && Math.abs(val - cible) <= tol;
  if (!ok) ecarts.push(`${nom} : ${val} au lieu de ${cible}`);
  console.log(`  ${ok ? "ok " : "KO "} ${nom.padEnd(46)} ${val} (attendu ${cible})`);
};

console.log("\n=== BULLETIN SUR UN COMPTE PRO RÉEL ===\n");
console.log(`  ${m.rendu ? "ok " : "KO "} l'écran du bulletin s'affiche`);
if (!m.rendu) ecarts.push("le bulletin ne s'affiche pas");
console.log(`  ${m.art111 ? "ok " : "KO "} la retenue cite l'article 111 de la CCN`);
if (!m.art111) ecarts.push("l'article 111 n'est pas cité");
// 173 h mensualisées x 4,20 = 726,60 ; retenue = 726,60 x 16/173 = 67,20.
// 16 h et non 24 : la formation ne se déduit pas.
attendu("heures retenues (maladie + fermeture, sans formation)", m.heuresRetenues, 16, 0);
attendu("salaire de base", m.base, 726.6);
attendu("montant de la retenue", m.montant, 67.2);
attendu("salaire brut après retenue", m.brut, 659.4);
attendu("vieillesse plafonnée assise sur le brut après retenue", m.vieillesse, +(659.4 * 0.069).toFixed(2), 0.02);
// 6 h x 5,57 EUR = 33,42 EUR, affichés à côté du bulletin et non dedans.
attendu("allocation de formation hors temps d'accueil", m.alloc, 33.42);
console.log(`  ${m.allocHorsBulletin ? "ok " : "KO "} l'allocation reste hors du bulletin (versée par IPERIA)`);
if (!m.allocHorsBulletin) ecarts.push("l'allocation apparaît dans la rémunération");
{
  const modeAttendu = ANNEE_INCOMPLETE ? "incomplète" : "complète";
  const semAttendues = ANNEE_INCOMPLETE ? "36" : "52";
  const okMode = m.modeAffiche === modeAttendu && m.semainesAffichees === semAttendues;
  if (!okMode) ecarts.push(`mensualisation : ${m.modeAffiche} sur ${m.semainesAffichees} semaines`);
  console.log(`  ${okMode ? "ok " : "KO "} mensualisation annoncée : ${m.modeAffiche} sur ${m.semainesAffichees} semaines`);
}
console.log(`  ${m.alerteMini === SOUS_MINIMUM ? "ok " : "KO "} l'alerte « taux sous le minimum légal » ${SOUS_MINIMUM ? "s'affiche sur un taux de 3,50 €" : "reste absente sur un taux conforme"}`);
if (m.alerteMini !== SOUS_MINIMUM) ecarts.push("alerte de taux minimum incorrecte");
console.log(`\nerreurs JavaScript : ${erreurs.length}`);
for (const e of erreurs) console.log("    " + e);
console.log(ecarts.length || erreurs.length ? `\n${ecarts.length} écart(s)\n` : "\nTout est conforme.\n");
process.exit(ecarts.length || erreurs.length ? 1 : 0);
