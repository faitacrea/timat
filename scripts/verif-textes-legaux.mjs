// Les textes légaux doivent avoir une adresse.
//
// Pourquoi : les mentions légales et les CGU ne vivaient que dans une fenêtre
// ouverte par un clic, et par rien d'autre. On ne pouvait donc ni les lier, ni
// les faire indexer, ni en donner l'adresse — ni à un parent qui la demande, ni
// à l'URSSAF dans un dossier d'habilitation qui affirme qu'elles sont publiées.
// La LCEN (art. 6 III-1) exige pourtant qu'elles soient accessibles.
//
// La politique de confidentialité, elle, a toujours eu sa page statique
// (/confidentialite.html, présente au sitemap). Les deux autres n'avaient rien.
//
// Ce contrôle vérifie, dans un vrai navigateur, que « ?legal=… » ouvre le bon
// texte, que l'adresse reste copiable dans la barre, et qu'une valeur inventée
// n'ouvre rien et ne traîne pas dans l'adresse.
//
//   node scripts/verif-textes-legaux.mjs [url]
import { chromium } from "playwright";
import { CHROMIUM, BUNDLE_TESTABLE } from "./jeu-de-donnees.mjs";

const BASE = process.argv[2] || "http://127.0.0.1:4173";
const nav = await chromium.launch({ executablePath: CHROMIUM() });
const page = await nav.newPage();
// Sans ce garde-fou : construit sans VITE_SUPABASE_KEY, le bundle n'est pas
// bootable, l'application retombe sur la page vitrine, et ce contrôle rendrait
// des KO imaginaires sur un code parfaitement bon. L'audit le réclame, à juste
// titre — il me l'a réclamé sur ce fichier même.
await BUNDLE_TESTABLE(page);
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(String(e)));

let ko = 0;
const dire = (ok, quoi, detail = "") => {
  if (!ok) ko++;
  console.log(`  ${ok ? "ok " : "KO "} ${quoi.padEnd(58)} ${detail}`);
};

console.log("\n=== TEXTES LÉGAUX — chacun doit avoir une adresse ===\n");

const attendus = {
  mentions: "Mentions légales",
  cgu: "Conditions générales",
  confidentialite: "Politique de confidentialité",
};

// ON NE CHERCHE PAS UN MOT DANS LA PAGE.
//
// Mon premier contrôle vérifiait la présence du texte « Mentions légales » et
// criait au défaut sur une valeur inventée : le pied de page porte un LIEN qui
// s'appelle ainsi, donc le mot est là même quand rien n'est ouvert. On repère
// donc la fenêtre elle-même — l'élément en position fixe à z-index 250 — et on
// lit son contenu à elle.
const fenetreLegale = () => page.evaluate(() => {
  const n = [...document.querySelectorAll("div")].find((d) => {
    const s = getComputedStyle(d);
    return s.position === "fixed" && s.zIndex === "250";
  });
  return n ? n.innerText : null;
});

for (const [cle, titre] of Object.entries(attendus)) {
  await page.goto(`${BASE}/?legal=${cle}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);
  const dedans = await fenetreLegale();
  dire(!!dedans && dedans.includes(titre), `?legal=${cle} ouvre « ${titre} »`,
    dedans === null ? "aucune fenêtre ouverte" : "");
  dire(page.url().includes(`legal=${cle}`),
    `?legal=${cle} : l'adresse reste copiable`, page.url());
}

// Une valeur inventée ne doit rien ouvrir — et surtout ne pas rester dans
// l'adresse, sinon on partage un lien qui ne mène à rien.
await page.goto(`${BASE}/?legal=nimportequoi`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2200);
dire((await fenetreLegale()) === null, "une valeur inventée n'ouvre aucune fenêtre");
dire(!page.url().includes("legal="), "une valeur inventée est retirée de l'adresse", page.url());

// La politique de confidentialité garde sa page statique : elle est au sitemap,
// et un moteur doit pouvoir la lire sans exécuter de JavaScript.
const statique = await page.goto(`${BASE}/confidentialite.html`, { waitUntil: "domcontentloaded" });
dire(statique && statique.ok(), "/confidentialite.html répond toujours",
  statique ? String(statique.status()) : "pas de réponse");

dire(erreurs.length === 0, "aucune erreur JavaScript", erreurs.join(" | "));

await nav.close();
console.log(ko ? `\n${ko} problème(s)\n` : "\nLes trois textes légaux ont une adresse, et elle fonctionne.\n");
process.exit(ko ? 1 : 0);
