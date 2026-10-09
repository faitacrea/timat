// LE BULLETIN ET LE RÉCAPITULATIF PAJEMPLOI DU MÊME MOIS, FACE À FACE.
//
// Ce sont les deux documents qui engagent : l'un est la fiche de paie, l'autre
// ce qu'on recopie sur pajemploi.urssaf.fr. Ils décrivent le même mois, le même
// contrat, la même personne. S'ils ne disent pas le même salaire net, l'un des
// deux est faux — et personne ne peut deviner lequel.
//
// ILS NE LE DISAIENT PAS. Les deux basculaient sur les heures POINTÉES dès
// qu'un seul pointage existait dans le mois. Or rien n'oblige à pointer tous
// les jours : la borne et le QR sont facultatifs. Trois journées pointées sur
// vingt-deux donnaient un bulletin à 88,59 € net là où le contrat prévoit
// 567,62 € — et l'écart entre les deux documents atteignait 479 €.
//
// Un contrat mensualisé se paie et se déclare sur la mensualisation. Les heures
// faites en plus s'ajoutent ; les absences se déduisent par la retenue. Le blog
// de TiMat l'écrit déjà : « le principe même de la mensualisation, c'est de
// lisser ».
//
// Hors chaîne de build : Vercel n'a pas de navigateur.
//   node scripts/verif-bulletin-recap.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { CHROMIUM, BRANCHER, BUNDLE_TESTABLE, ATTENDRE_PRET, DANS_L_APP, CLIQUER } from "./jeu-de-donnees.mjs";

const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8")
  .match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];
const BASE = process.env.URL_BASE || "http://127.0.0.1:4173";

const ko = [];
const dire = (bon, quoi, detail) => {
  if (bon) console.log(`  ok  ${quoi}`);
  else { ko.push(`${quoi}${detail ? " — " + detail : ""}`); console.log(`  KO  ${quoi}${detail ? "\n        " + detail : ""}`); }
};
const nb = (t) => Number(String(t ?? "").replace(/\s|&nbsp;|€|h/g, "").replace(",", ".")) || 0;
// LIRE UN MONTANT SANS ATTRAPER UN NOMBRE DU LIBELLÉ.
//
// « Net à payer · Octobre 2026 567,62 € » : ma première lecture a pris le
// « 2026 » de la date et annoncé un écart de deux millions d'euros. C'est la
// deuxième fois dans cette séance qu'un nombre du libellé me piège — après le
// « 45 » de « au-delà de 45 h/semaine ». On ne garde donc que les montants
// écrits à la française, avec deux décimales, et le DERNIER avant l'euro.
const montantApres = (texte, etiquette) => {
  const i = texte.search(etiquette);
  if (i < 0) return undefined;
  const bout = texte.slice(i, i + 90);
  // Le « (?<![0-9]) » est l'essentiel : sans lui, « 2026 567,62 » se lit
  // « 026 567,62 » — le séparateur de milliers et une année se ressemblent.
  const tous = [...bout.matchAll(/(?<![0-9])([0-9]{1,3}(?:[\s ][0-9]{3})*,[0-9]{2})\s*€/g)].map((m) => m[1]);
  return tous.length ? tous[0] : undefined;
};

const N = await chromium.launch({ executablePath: CHROMIUM() });
const ctx = await N.newContext({ viewport: { width: 1280, height: 1000 }, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
const p = await ctx.newPage();
await BRANCHER(p, "asmat", CLE);
await p.goto(`${BASE}/?acces=${CLE}&connexion=1`, { waitUntil: "domcontentloaded" });
if (!await BUNDLE_TESTABLE(p)) { await N.close(); process.exit(1); }
await ATTENDRE_PRET(p, 2200);
const passer = p.getByRole("button", { name: /^Passer$/ });
if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(600); }
if (!await DANS_L_APP(p, "le contrôle bulletin / récapitulatif")) { await N.close(); process.exit(1); }

console.log("\n=== LE BULLETIN ET LE RÉCAP PAJEMPLOI DU MÊME MOIS ===\n");

// --- 1. LE BULLETIN ---------------------------------------------------------
await CLIQUER(p, "Administratif"); await p.waitForTimeout(800);
await CLIQUER(p, "Paie & Contrats"); await p.waitForTimeout(1800);
await CLIQUER(p, "Bulletin"); await p.waitForTimeout(2200);
const txtBul = (await p.locator("body").innerText()).replace(/\s+/g, " ");
const netBulletin = montantApres(txtBul, /Net à payer/i);
dire(netBulletin !== undefined, "le bulletin affiche un net à payer",
  "impossible de lire « Net à payer » : la comparaison ne peut pas avoir lieu");
const pointees = (txtBul.match(/([0-9]+)\s*h pointées sur\s*([0-9]+)\s*j/i) || []);
if (pointees[1]) console.log(`      (le mois porte ${pointees[1]} h pointées sur ${pointees[2]} jours)`);

// --- 2. LE RÉCAPITULATIF PAJEMPLOI ------------------------------------------
await CLIQUER(p, "Facturation"); await p.waitForTimeout(1600);
const [onglet] = await Promise.all([
  ctx.waitForEvent("page", { timeout: 15000 }).catch(() => null),
  CLIQUER(p, "Exporter vers Pajemploi"),
]);
if (!onglet) {
  dire(false, "le récapitulatif s'ouvre", "la fenêtre ne s'est pas ouverte : la comparaison ne peut pas avoir lieu");
  await N.close(); process.exit(1);
}
await onglet.waitForLoadState("domcontentloaded");
await onglet.waitForTimeout(600);
const txtRec = (await onglet.locator("body").innerText()).replace(/\s+/g, " ");
const netRecap = montantApres(txtRec, /Salaire NET à déclarer/i);
dire(netRecap !== undefined, "le récapitulatif affiche un salaire net à déclarer");

// --- 3. LES DEUX DOIVENT DIRE LE MÊME CHIFFRE -------------------------------
if (netBulletin !== undefined && netRecap !== undefined) {
  const ecart = Math.abs(nb(netBulletin) - nb(netRecap));
  dire(ecart <= 0.02,
    `le bulletin (${netBulletin} €) et le récapitulatif (${netRecap} €) disent le même net`,
    `écart de ${Math.round(ecart * 100) / 100} € entre la fiche de paie et ce qu'on recopie à l'URSSAF. L'un des deux est faux, et personne ne peut deviner lequel.`);
}

// --- 4. ET CE CHIFFRE EST CELUI DU CONTRAT, PAS CELUI DU POINTAGE -----------
//
// Le jeu de données porte un pointage très partiel. Si le net suivait le
// pointage, il serait d'un sixième du salaire prévu : c'est le défaut d'origine.
const heuresDecl = (txtRec.match(/Heures normales À DÉCLARER \(mensualisées\)\s*([0-9]+)\s*h/i) || [])[1];
dire(nb(heuresDecl) === 173, `les heures déclarées sont celles du contrat (${heuresDecl} h)`,
  "attendu 173 h pour 40 h × 52 semaines ÷ 12");
if (netBulletin !== undefined) {
  dire(nb(netBulletin) > 400,
    `le bulletin paie la mensualisation (${netBulletin} €), pas le pointage partiel`,
    "le bulletin basculait sur les heures pointées dès qu'un seul pointage existait : 88,59 € au lieu de 567,62 €");
}

await N.close();
console.log(ko.length ? `\n${ko.length} problème(s) :\n` + ko.map((x) => "  - " + x).join("\n") + "\n"
  : "\nLa fiche de paie et la déclaration URSSAF disent le même chiffre.\n");
process.exit(ko.length ? 1 : 0);
