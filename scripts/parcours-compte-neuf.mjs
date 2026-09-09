// Parcours d'un compte NEUF : le pire cas de données.
//
// Pourquoi : tous les autres parcours passent par des données complètes — le
// compte de démonstration, ou des enregistrements que je fabrique remplis. Or
// une assistante maternelle qui vient de s'inscrire n'a rien : un enfant sans
// fiche santé, sans contrat, sans pointage, avec des colonnes nulles partout.
// C'est cet état-là qui a fait tomber l'accueil du parent (« allergies » vide)
// et l'écran du contrat (« jours » vide) — deux écrans entièrement blancs que
// personne n'avait ouverts.
//
// Ce script ouvre les deux espaces avec le strict minimum en base, et signale
// tout écran qui ne s'affiche pas.
//
//   node scripts/parcours-compte-neuf.mjs [url] [asmat|parent]
import { chromium } from "playwright";
import { readFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";

const URL_BASE = process.argv[2] || "http://localhost:4173";
const ESPACE = process.argv[3] || "asmat";
const SORTIE = `/tmp/timat-neuf-${ESPACE}`;
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

const ASMAT = "11111111-1111-4111-8111-111111111111";
const PARENT = "33333333-3333-4333-8333-333333333333";
const EID = "22222222-2222-4222-8222-222222222222";
const MOI = ESPACE === "parent" ? PARENT : ASMAT;
const session = {
  access_token: "faux", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "faux",
  user: { id: MOI, aud: "authenticated", role: "authenticated", email: "neuf@test.fr",
    app_metadata: {}, user_metadata: { prenom: "Camille", nom: "Neuve", role: ESPACE },
    created_at: new Date().toISOString() },
};

// Le strict minimum : un enfant, et RIEN d'autre. Toutes les colonnes
// facultatives sont nulles, comme elles le sont juste après une inscription.
const ENFANT_NU = {
  id: EID, asmat_id: ASMAT, parent_id: PARENT, prenom: "Léo",
  nom: null, naissance: null, emoji: null, couleur: null, photo_url: null,
  allergies: null, medecin: null, groupe_sanguin: null, actif: true,
};

const ECRANS_ASMAT = [
  ["accueil", "Accueil", null], ["journee", "L'enfant", "Journée"], ["pointage", "L'enfant", "Pointage"],
  ["suivi-progres", "L'enfant", "Suivi & Progrès"], ["sante-urgence", "L'enfant", "Santé & Urgence"],
  ["bilans", "L'enfant", "Bilans"], ["calendrier", "Administratif", "Calendrier"],
  ["messagerie", "Administratif", "Messagerie"], ["paie-contrats", "Administratif", "Paie & Contrats"],
  ["documents", "Administratif", "Documents & Rapports"], ["inviter", "Outils Pro", "Inviter un parent"],
  ["projet-accueil", "Outils Pro", "Projet d'accueil"], ["pmi", "Outils Pro", "PMI"], ["faq", "Outils Pro", "Aide & Support"],
];
const ECRANS_PARENT = [
  ["accueil", "Accueil", null], ["journee", "Mon enfant", "Journée"], ["pointage", "Mon enfant", "Pointage"],
  ["suivi-progres", "Mon enfant", "Suivi & Progrès"], ["sante-urgence", "Mon enfant", "Santé & Urgence"],
  ["projet-accueil", "Mon enfant", "Projet d'accueil"], ["bilans", "Mon enfant", "Bilans"],
  ["calendrier", "Administratif", "Calendrier"], ["messagerie", "Administratif", "Messagerie"],
  ["aides", "Administratif", "Aides & Simulateurs"], ["mon-contrat", "Administratif", "Mon contrat"],
  ["documents", "Administratif", "Documents & Attestations"], ["centre-aide", "Administratif", "Centre d'aide"],
];
const ECRANS = ESPACE === "parent" ? ECRANS_PARENT : ECRANS_ASMAT;

mkdirSync(SORTIE, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || chercherChromium() });
const page = await nav.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
let erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message.slice(0, 140)));

await page.addInitScript(([s, cle]) => {
  try {
    localStorage.setItem("timat_acces", cle);
    localStorage.setItem("sb-akicyckmbsjnewnvvcil-auth-token", JSON.stringify(s));
  } catch (e) { /* stockage indisponible */ }
}, [session, CLE]);

const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
await page.route("**/auth/v1/**", (r) => r.fulfill(json({ ...session, ...session.user })));
await page.route("**/rest/v1/**", (r) => {
  const req = r.request();
  const t = (req.url().match(/rest\/v1\/([a-z_]+)/) || [])[1];
  if (req.method() !== "GET") return r.fulfill(json([{ id: "nouveau" }]));
  if (t === "profiles") return r.fulfill(json([{ id: MOI, role: ESPACE, prenom: "Camille", nom: "Neuve", email: "neuf@test.fr", subscription_status: "pro" }]));
  if (t === "enfants") return r.fulfill(json([ENFANT_NU]));
  // Tout le reste est vide : aucun contrat, aucun pointage, aucune transmission.
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
  const L = (b) => b.innerText.replace(/\s+/g, " ").trim();
  const n = [...document.querySelectorAll("button")].find((b) => L(b) === t)
    || [...document.querySelectorAll("button")].find((b) => L(b).startsWith(t));
  if (n) { n.click(); return true; }
  return false;
}, t);

const lignes = [];
for (const [nom, groupe, entree] of ECRANS) {
  erreurs = [];
  // On repasse par l'accueil entre deux écrans : cliquer un groupe déjà actif
  // est sans effet, et le sous-menu resterait celui de l'écran précédent.
  await clic("Accueil"); await page.waitForTimeout(350);
  if (!(await clic(groupe))) { lignes.push({ nom, souci: `groupe « ${groupe} » introuvable` }); continue; }
  await page.waitForTimeout(450);
  if (entree && !(await clic(entree))) { const dispo = await page.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.split("\n")[0].trim()).filter(Boolean).slice(0, 18).join(" | ")); lignes.push({ nom, souci: `entrée « ${entree} » introuvable — proposées : ${dispo}` }); continue; }
  await page.waitForTimeout(1300);
  await passer();
  await page.screenshot({ path: `${SORTIE}/${nom}.png`, fullPage: true });
  // Un écran qui a planté est vide : React démonte tout le sous-arbre.
  const m = await page.evaluate(() => {
    const c = document.querySelector(".content") || document.body;
    return { texte: (c.innerText || "").trim().length, blocs: c.querySelectorAll("div,button,input").length };
  });
  lignes.push({ nom, ...m, erreurs: [...erreurs] });
}
await nav.close();

console.log(`\n=== COMPTE NEUF (${ESPACE}) — ${lignes.length} écrans, un enfant sans rien ===\n`);
console.log("écran".padEnd(18) + "caractères  éléments  erreurs");
let casses = 0;
for (const l of lignes) {
  if (l.souci) { console.log(l.nom.padEnd(18) + "— " + l.souci); casses++; continue; }
  // Moins de 40 caractères ou moins de 5 éléments : l'écran ne s'est pas rendu.
  const vide = l.texte < 40 || l.blocs < 5;
  if (vide || l.erreurs.length) casses++;
  console.log(l.nom.padEnd(18) + String(l.texte).padEnd(12) + String(l.blocs).padEnd(10) + l.erreurs.length + (vide ? "   ÉCRAN VIDE" : ""));
  for (const e of l.erreurs) console.log("      " + e);
}
console.log(casses ? `\n${casses} écran(s) en défaut\n` : "\nTous les écrans s'affichent sur un compte vide.\n");
process.exit(casses ? 1 : 0);
