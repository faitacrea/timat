// Parcours visuel de l'application dans un vrai navigateur.
//
// Pourquoi : jusqu'ici on affirmait qu'un changement d'interface ne cassait
// rien sans jamais l'ouvrir. Ce script visite les quatorze ecrans de l'espace
// assistante maternelle, capture chacun d'eux et mesure ce qu'une relecture de
// code ne voit pas : une erreur JavaScript, un debordement horizontal, un texte
// sous 11 px, une cible tactile sous 36 px.
//
//   node scripts/parcours-visuel.mjs [url] [dossier de sortie]
//
// Prealable : une version construite servie quelque part (npm run build puis
// npx vite preview). Supabase n'a pas besoin d'etre joignable : le script
// renvoie une erreur applicative sur l'authentification, ce qui fait basculer
// l'application sur ses comptes de demonstration — exactement le chemin qu'elle
// emprunte deja quand les identifiants sont refuses.
import { chromium } from "playwright";
import { readFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const URL_BASE = process.argv[2] || "http://localhost:4173";
const SORTIE = process.argv[3] || "/tmp/timat-parcours";

// La cle d'acces au mode vitrine est lue dans le source plutot que recopiee :
// une copie finit toujours par diverger de l'originale.
const src = readFileSync(new globalThis.URL("../src/App.jsx", import.meta.url), "utf8");
const CLE = (src.match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/) || [])[1];
if (!CLE) { console.error("Clé d'accès introuvable dans src/App.jsx."); process.exit(1); }

// Le parcours ne couvrait que l'espace assistante maternelle. L'espace parent
// et la page d'accueil publique n'avaient jamais ete ouverts : c'est pourtant
// la landing que voient tous les prospects, et l'espace parent la moitie des
// utilisateurs.
const ESPACE = process.argv[4] || "asmat";

// [nom du fichier, groupe de la barre du bas, entrée du sous-menu]
const ECRANS_ASMAT = [
  ["accueil", "Accueil", null],
  ["journee", "L'enfant", "Journée"],
  ["pointage", "L'enfant", "Pointage"],
  ["suivi-progres", "L'enfant", "Suivi & Progrès"],
  ["sante-urgence", "L'enfant", "Santé & Urgence"],
  ["bilans", "L'enfant", "Bilans"],
  ["calendrier", "Administratif", "Calendrier"],
  ["messagerie", "Administratif", "Messagerie"],
  ["paie-contrats", "Administratif", "Paie & Contrats"],
  ["documents-rapports", "Administratif", "Documents & Rapports"],
  ["inviter-parent", "Outils Pro", "Inviter un parent"],
  ["projet-accueil", "Outils Pro", "Projet d'accueil"],
  ["pmi", "Outils Pro", "PMI"],
  ["faq", "Outils Pro", "Aide & Support"],
];

const ECRANS_PARENT = [
  ["accueil", "Accueil", null],
  ["journee", "Mon enfant", "Journée"],
  ["pointage", "Mon enfant", "Pointage"],
  ["suivi-progres", "Mon enfant", "Suivi & Progrès"],
  ["sante-urgence", "Mon enfant", "Santé & Urgence"],
  ["projet-accueil", "Mon enfant", "Projet d'accueil"],
  ["bilans", "Mon enfant", "Bilans"],
  ["calendrier", "Administratif", "Calendrier"],
  ["messagerie", "Administratif", "Messagerie"],
  ["aides-simulateurs", "Administratif", "Aides & Simulateurs"],
  ["mon-contrat", "Administratif", "Mon contrat"],
  ["documents", "Administratif", "Documents & Attestations"],
  ["centre-aide", "Administratif", "Centre d'aide"],
];

const ECRANS = ESPACE === "parent" ? ECRANS_PARENT : ECRANS_ASMAT;
const COMPTE = ESPACE === "parent"
  ? { email: "sophie.martin@mail.fr", bouton: /Accéder à mon espace|Se connecter/ }
  : { email: "marie.dupont@mail.fr", bouton: /Accéder à mon espace/ };

mkdirSync(SORTIE, { recursive: true });
// Playwright telecharge normalement son propre navigateur. Quand il est deja
// present sur la machine sous une autre version que celle attendue, on lui
// designe le binaire au lieu d'exiger un telechargement.
const chercherChromium = () => {
  const racine = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!racine || !existsSync(racine)) return undefined;
  for (const d of readdirSync(racine).filter((x) => x.startsWith("chromium-")).sort().reverse()) {
    const bin = path.join(racine, d, "chrome-linux", "chrome");
    if (existsSync(bin)) return bin;
  }
  return undefined;
};
const navigateur = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || chercherChromium() });
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

const erreurs = [];
page.on("pageerror", (e) => erreurs.push("erreur JS : " + e.message.slice(0, 200)));
page.on("console", (m) => {
  const t = m.text();
  // Les echecs reseau viennent de l'environnement de test (polices, mesure
  // d'audience, Supabase injoignable), pas de l'application.
  if (m.type() === "error" && !/ERR_|Failed to load resource|Failed to fetch/.test(t)) erreurs.push("console : " + t.slice(0, 160));
});
await page.route("**/auth/v1/token**", (r) => r.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "invalid_grant" }) }));
await page.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));

await page.goto(`${URL_BASE}/?acces=${CLE}&connexion=1`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.getByRole("button", { name: /^Se connecter$/ }).first().click();
await page.waitForTimeout(600);
await page.fill('input[type="email"]', COMPTE.email);
await page.fill('input[type="password"]', "demonstration");
await page.getByRole("button", { name: /Accéder à mon espace/ }).click();
await page.waitForTimeout(3000);
const passer = page.getByRole("button", { name: /^Passer$/ });
if (await passer.isVisible().catch(() => false)) { await passer.click(); await page.waitForTimeout(600); }

const clic = (txt) => page.evaluate((t) => {
  const n = [...document.querySelectorAll("button")].find((b) => b.innerText.replace(/\s+/g, " ").trim().includes(t));
  if (n) { n.click(); return true; }
  return false;
}, txt);

const lignes = [];
for (const [nom, groupe, entree] of ECRANS) {
  erreurs.length = 0;
  if (!(await clic(groupe))) { lignes.push({ nom, souci: `groupe « ${groupe} » introuvable` }); continue; }
  await page.waitForTimeout(500);
  if (entree && !(await clic(entree))) { lignes.push({ nom, souci: `entrée « ${entree} » introuvable` }); continue; }
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${SORTIE}/${nom}.png`, fullPage: true });
  const m = await page.evaluate(() => {
    const doc = document.documentElement;
    let petit = 0, cibles = 0;
    for (const n of document.querySelectorAll("body *")) {
      const st = getComputedStyle(n);
      if (!n.childElementCount && n.textContent.trim() && parseFloat(st.fontSize) < 11) petit++;
      if (/^(BUTTON|A)$/.test(n.tagName)) { const r = n.getBoundingClientRect(); if (r.width > 0 && (r.height < 36 || r.width < 36)) cibles++; }
    }
    return { deborde: doc.scrollWidth > doc.clientWidth + 1, petit, cibles };
  });
  lignes.push({ nom, ...m, erreurs: [...erreurs] });
}
await navigateur.close();

const n = (x) => String(x).padEnd(20);
console.log(`\n=== PARCOURS VISUEL (${ESPACE}) — ${lignes.length} écrans, captures dans ${SORTIE} ===\n`);
console.log(n("écran") + "déborde  <11px  cibles<36  erreurs");
for (const l of lignes) {
  if (l.souci) { console.log(n(l.nom) + "— " + l.souci); continue; }
  console.log(n(l.nom) + String(l.deborde ? "OUI" : "non").padEnd(9) + String(l.petit).padEnd(7) + String(l.cibles).padEnd(11) + l.erreurs.length);
  for (const e of l.erreurs) console.log("    " + e);
}
const totalErr = lignes.reduce((s, l) => s + (l.erreurs?.length || 0), 0);
const totalDeb = lignes.filter((l) => l.deborde).length;
console.log(`\ntexte sous 11 px : ${lignes.reduce((s, l) => s + (l.petit || 0), 0)}`);
console.log(`cibles sous 36 px : ${lignes.reduce((s, l) => s + (l.cibles || 0), 0)}`);
console.log(`erreurs JavaScript : ${totalErr} · débordements : ${totalDeb}\n`);
process.exit(totalErr || totalDeb ? 1 : 0);
