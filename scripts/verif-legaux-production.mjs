// Les textes légaux, lus sur le site EN PRODUCTION, dans un vrai navigateur.
//
// Pourquoi : le courriel envoyé à l'URSSAF donne trois adresses de textes
// légaux. Vérifier que le code est présent dans le fichier servi ne suffit pas
// — encore faut-il que l'adresse ouvre le bon texte, et que ce texte contienne
// ce que la loi exige. C'est ce qu'un agent de l'URSSAF verra en cliquant.
//
// Ce contrôle lit timat.app, pas l'aperçu local : il ne s'inscrit donc pas
// dans la chaîne de construction, qui doit marcher hors ligne.
//
//   node scripts/verif-legaux-production.mjs [url]
import { chromium } from "playwright";
import { CHROMIUM, BUNDLE_TESTABLE } from "./jeu-de-donnees.mjs";

const BASE = process.argv[2] || "https://www.timat.app";
const nav = await chromium.launch({ executablePath: CHROMIUM() });
const page = await nav.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(String(e)));

let ko = 0;
const dire = (ok, quoi, detail = "") => {
  if (!ok) ko++;
  console.log(`  ${ok ? "ok " : "KO "} ${quoi.padEnd(62)} ${detail}`);
};

// La fenêtre légale est l'unique élément en position fixe à z-index 250.
const fenetre = () => page.evaluate(() => {
  const n = [...document.querySelectorAll("div")].find((d) => {
    const s = getComputedStyle(d);
    return s.position === "fixed" && s.zIndex === "250";
  });
  return n ? n.innerText : null;
});

const textes = {};
console.log(`\n=== TEXTES LÉGAUX EN PRODUCTION — ${BASE} ===\n`);

// Pointé sur un aperçu local construit sans clé, l'application ne démarre
// pas et chaque KO serait imaginaire : on s'arrête net dans ce cas.
await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
if (!(await BUNDLE_TESTABLE(page))) { await nav.close(); process.exit(2); }

// NOTE SUR CETTE MACHINE : le proxy de l'environnement de travail re-signe les
// connexions TLS, et Chromium refuse son autorité (ERR_CERT_AUTHORITY_INVALID).
// Désactiver la vérification des certificats est exclu. On rapatrie donc les
// fichiers exacts que sert timat.app (curl, qui fait confiance au proxy) et on
// les sert localement — c'est le même code. Seule différence : la base n'est
// pas joignable d'ici, donc ce qui vient de la configuration en base retombe
// sur les valeurs par défaut. C'est précisément ainsi qu'on a vu les mentions
// légales s'afficher vides.
for (const [cle, titre] of [["mentions", "Mentions légales"], ["cgu", "Conditions générales"]]) {
  await page.goto(`${BASE}/?legal=${cle}`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const t = await fenetre();
  textes[cle] = t || "";
  dire(!!t && t.includes(titre), `?legal=${cle} ouvre « ${titre} »`, t ? `${t.length} caractères` : "aucune fenêtre");
}
await page.goto(`${BASE}/confidentialite.html`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
textes.confidentialite = await page.evaluate(() => document.body.innerText).catch(() => "");
dire(/confidentialit/i.test(textes.confidentialite), "/confidentialite.html s'affiche", `${textes.confidentialite.length} caractères`);

// CE QUE LA LCEN EXIGE DES MENTIONS LÉGALES (art. 6 III-1) pour une personne
// physique qui édite un service en ligne : nom et prénom, domicile, téléphone,
// adresse électronique, numéro d'immatriculation, directeur de la publication,
// et nom, raison sociale, adresse et téléphone de l'hébergeur.
console.log("\n  — contenu exigé par la LCEN (art. 6 III-1) —");
const m = textes.mentions;
dire(/Lefort/i.test(m), "nom de l'éditrice");
dire(/Cachan|94230/.test(m), "adresse");
dire(/0?6[\s.]?20[\s.]?87[\s.]?33[\s.]?80|\+33/.test(m), "téléphone");
dire(/@/.test(m), "adresse électronique");
dire(/902\s?648\s?088/.test(m), "SIREN / SIRET");
dire(/directeur|directrice/i.test(m) && /publication/i.test(m), "directeur ou directrice de la publication");
dire(/h[ée]berg/i.test(m), "mention de l'hébergeur");
dire(/Vercel/i.test(m), "nom de l'hébergeur du site");
dire(/Supabase/i.test(m), "nom de l'hébergeur des données");
dire(!/\[|undefined|null|NaN/.test(m), "aucune valeur manquante ni crochet à compléter",
  (m.match(/.{0,30}(\[|undefined|null|NaN).{0,30}/) || [""])[0]);

dire(erreurs.length === 0, "aucune erreur JavaScript", erreurs.slice(0, 2).join(" | "));

if (process.env.MONTRER) {
  for (const [k, v] of Object.entries(textes)) {
    console.log(`\n--- ${k} ---\n${v.slice(0, 2500)}`);
  }
}
await nav.close();
console.log(ko ? `\n${ko} problème(s)\n` : "\nLes trois textes légaux répondent en production, et les mentions sont complètes.\n");
process.exit(ko ? 1 : 0);
