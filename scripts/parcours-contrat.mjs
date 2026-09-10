// Ouvre l'écran du contrat côté assistante maternelle.
//
// Pourquoi : deux manques que seule l'ouverture de l'écran révèle.
//
// 1. Signer menait à un accusé de réception, jamais au contrat lui-même. Le PDF
//    était pourtant généré et rangé dans Documents — il manquait le lien.
// 2. Le choix du rythme d'accueil (année complète ou incomplète), qui décide du
//    salaire mensualisé, n'existait que dans l'assistant du tout premier enfant.
//    Un contrat déjà enregistré restait en année complète, sans aucun moyen de
//    le corriger — et ce sont justement ceux-là qui en avaient besoin.
//
//   node scripts/parcours-contrat.mjs [url]
import { chromium } from "playwright";
import { readFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";

const URL_BASE = process.argv[2] || "http://localhost:4173";
// Passe « pdf-ancien » : le PDF stocke date d'avant la refonte du contrat. Il
// est relu tel quel, jamais recalcule : l'application doit le dire.
const PDF_ANCIEN = process.argv[3] === "pdf-ancien";
const SORTIE = "/tmp/timat-contrat";
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
  if (t === "contrats") return r.fulfill(json([{ id: "c1", enfant_id: EID, asmat_id: UID, debut: "2026-01-01", fin: "2027-08-31", heures_hebdo: 40, taux_horaire: 4.20, annee_complete: true, semaines_accueil: null, entretien: 3.8, signe_asmat: true, date_signature_asmat: new Date().toISOString(), pdf_storage_path: "contrats/faux.pdf", pdf_generated_at: PDF_ANCIEN ? "2026-08-01T10:00:00Z" : "2026-09-30T10:00:00Z", updated_at: PDF_ANCIEN ? "2026-08-15T10:00:00Z" : "2026-09-01T10:00:00Z", jours: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"], horaires: "07h30–17h30" }]));
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
await clic("Contrats"); await page.waitForTimeout(1200);
await clic("Contrats & avenants"); await page.waitForTimeout(2000);
await passer();
await page.screenshot({ path: `${SORTIE}/contrat.png`, fullPage: true });

let ko = 0;
const dire = (ok, quoi, detail = "") => { if (!ok) ko++; console.log(`  ${ok ? "ok " : "KO "} ${quoi.padEnd(56)} ${detail}`); };
const txt = () => page.evaluate(() => document.body.innerText);

console.log("\n=== CONTRAT — le PDF et le rythme d'accueil ===\n");
const t0 = await txt();
dire(/Contrats? & Signatures|Détail du contrat/.test(t0), "l'écran du contrat s'ouvre");

// 1. Le contrat réel, atteignable
dire(/Ouvrir le contrat signé \(PDF\)/.test(t0), "le bouton « Ouvrir le contrat signé (PDF) » est là");
// Il n'y en a qu'UN : le statut, la date et le PDF etaient annonces deux fois.
dire((t0.match(/Ouvrir le contrat signé \(PDF\)/g) || []).length === 1, "le contrat n'est proposé qu'une fois");
dire(!/Contrat signé électroniquement/.test(t0), "l'encart vert en double a disparu");
dire(/Signé le .*eIDAS/i.test(t0.replace(/\n/g, " ")), "la date de signature et eIDAS sont dans le bandeau du haut");

// 2. Le rythme d'accueil, présent et modifiable
dire(/Rythme d'accueil/.test(t0), "le bloc « Rythme d'accueil » est présent");
dire(/Année complète/.test(t0) && /Année incomplète/.test(t0), "les deux rythmes sont proposés");
dire(/C'est lui qui fixe le salaire mensualisé/.test(t0), "le salaire mensualisé est affiché à côté du choix");
dire(/déjà signé/.test(t0), "l'avertissement « avenant nécessaire » sort sur un contrat signé");

// Le détail lui-même doit annoncer le rythme en clair.
dire(/Rythme d'accueil[\s\S]{0,60}Année complète \(52 semaines\)/.test(t0), "le détail du contrat annonce le rythme");

// 3. La virgule française
const montants = (t0.match(/\d+[.,]\d{2}\s*€/g) || []);
const auPoint = montants.filter((m) => m.includes("."));
dire(auPoint.length === 0, "tous les montants s'écrivent avec une virgule", auPoint.join(" "));
console.log(`  ..  ${montants.length} montant(s) relevés : ${montants.slice(0, 6).join(" · ")}`);

// 4. Basculer en année incomplète change le salaire, sous les yeux.
const avant = (t0.match(/salaire mensualisé\s*:\s*([\d,]+)\s*€/i) || [])[1];
const styleDe = (debut) => page.evaluate((d) => {
  const b = [...document.querySelectorAll("button")].find((x) => x.innerText.startsWith(d));
  return b ? b.style.background : null;
}, debut);
const fondCompletAvant = await styleDe("Année complète");
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.innerText.startsWith("Année incomplète"));
  if (b) b.click();
});
await page.waitForTimeout(900);
const t1 = await txt();
// La selection suivait la valeur ENREGISTREE, pas le clic : le bouton ne
// bougeait pas quand on appuyait dessus.
dire((await styleDe("Année incomplète")) === fondCompletAvant, "le bouton cliqué prend bien la sélection");
dire((await styleDe("Année complète")) !== fondCompletAvant, "l'autre bouton la perd");
// Le libellé est mis en capitales par la feuille de style : on compare sans casse.
dire(/Semaines d'accueil dans l'année/i.test(t1), "le champ des semaines apparaît");
const apercu = (t1.match(/Nouveau salaire mensualisé\s*:\s*([\d,]+)\s*€/) || [])[1];
dire(!!apercu && apercu !== avant, "l'aperçu du nouveau salaire s'affiche", `${avant} € → ${apercu} €`);
dire(/Enregistrer ce rythme/.test(t1) && /Annuler/.test(t1), "le changement se confirme, il ne s'applique pas tout seul");

const tf = await txt();
// Le bouton doit rester accessible EN PERMANENCE : le contrat se modifie
// plusieurs fois, et chaque modification rend le PDF a refaire.
dire(/Mettre à jour le PDF/.test(tf), "le bouton de mise à jour est toujours accessible");
if (PDF_ANCIEN) {
  dire(/a été modifié depuis que ce PDF/.test(tf), "un PDF en retard est signalé en rouge");
} else {
  dire(!/a été modifié depuis que ce PDF/.test(tf), "un PDF à jour n'affiche pas d'avertissement");
}

// La fourniture des repas se convient, elle ne se deduit pas d'un montant.
dire(/Indemnités journalières/.test(tf), "le bloc « Indemnités journalières » est présent");
dire(/Indemnité d'entretien \(€ par journée d'accueil\)/i.test(tf), "l'indemnité d'entretien est modifiable");
dire(/minimum .* € pour une journée de/.test(tf), "le minimum conventionnel de l'entretien est annoncé");
dire(/Qui fournit les repas/.test(tf), "le choix des repas est au même endroit");
dire(/pas encore convenu/i.test(tf), "un contrat sans accord sur les repas le signale");
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.innerText.startsWith("Moi"));
  if (b) b.click();
});
await page.waitForTimeout(600);
const tr = await txt();
dire(/Indemnité de repas/i.test(tr), "choisir « moi » demande le montant de l'indemnité");
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.innerText.startsWith("Le parent employeur"));
  if (b) b.click();
});
await page.waitForTimeout(600);
const te = await txt();
dire(/Aucune indemnité n'est due/.test(te), "choisir le parent employeur dit qu'aucune indemnité n'est due");

// Modifier une indemnite convenue sur un contrat SIGNE demande un avenant ;
// aligner sur le minimum conventionnel est automatique. Les deux doivent se
// distinguer a l'ecran.
await page.evaluate(() => {
  const i = [...document.querySelectorAll("input[type=number]")].find((x) => x.closest("div")?.parentElement?.innerText?.includes("entretien"));
  if (i) {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    set.call(i, "7.50");
    i.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
await page.waitForTimeout(700);
const ta = await txt();
dire(/avenant signé des deux côtés/.test(ta), "hausser une indemnité sur un contrat signé exige un avenant");
dire(/Enregistrer/.test(ta) && /Annuler/.test(ta), "la modification se confirme explicitement");

dire(erreurs.length === 0, "aucune erreur JavaScript", erreurs.join(" | "));
await nav.close();
console.log(ko ? `\n${ko} problème(s)\n` : `\nTout est conforme. Captures dans ${SORTIE}\n`);
process.exit(ko ? 1 : 0);
