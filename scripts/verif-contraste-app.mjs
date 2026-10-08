// LE CONTRASTE A L'INTERIEUR DE L'APPLICATION.
//
// verif-contraste.mjs couvre les pages publiques. Les ecrans de travail — ceux
// qu'on regarde toute la journee, souvent sur un telephone tenu a bout de bras
// dans une piece mal eclairee — n'avaient jamais ete mesures. C'est pourtant la
// que le texte est le plus petit et le plus dense.
//
// Meme methode que pour les pages publiques : couleur du texte contre le fond
// reellement calcule, seuil WCAG AA.
//
// Hors chaine de build : Vercel n'a pas de navigateur.
//   node scripts/verif-contraste-app.mjs [asmat|parent]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { BRANCHER, BUNDLE_TESTABLE, ATTENDRE_PRET, DANS_L_APP } from "./jeu-de-donnees.mjs";
const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];
const ESPACE = process.argv[2] || "asmat";

const ECRANS = ESPACE === "parent"
  ? ["accueil","journee","pointage","suivi_progres","sante_urgence","autorisations","calendrier","messagerie","aides_simulateurs","admin_finances","documents_complet","mes_alertes","faq"]
  : ["accueil","journee","pointage","suivi_progres","sante_urgence","autorisations","calendrier","messagerie","paie_contrats","documents_rapports","inviter_parent","liste_attente","mes_employeurs","pmi","mes_alertes","faq"];

const MESURE = readFileSync(new URL("./verif-contraste.mjs", import.meta.url), "utf8")
  .match(/const MESURE = \(\) => \{[\s\S]*?\n\};/)[0];

const N = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await N.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", serviceWorkers: "block" });
const p = await ctx.newPage();
// LA BASE ET LA SESSION, DEPUIS LE JEU DE DONNÉES PARTAGÉ.
// Ce contrôle doublait « rest/v1 » par « [] » et se connectait en
// démonstration : l'application ne trouvait aucun profil, et la connexion
// s'arrêtait sur « Votre compte n'a pas pu être chargé ». Tout ce qu'il
// déclarait « ok » était mesuré derrière cette carte d'erreur.
await BRANCHER(p,ESPACE==="parent"?"parent":"asmat",CLE);
await p.goto(`http://127.0.0.1:4173/?acces=${CLE}&connexion=${ESPACE === "parent" ? "parent" : "1"}`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2600);
if(!await BUNDLE_TESTABLE(p)){await N.close();process.exit(1);}
await ATTENDRE_PRET(p,2200);
await p.waitForTimeout(3000);
const passer = p.getByRole("button", { name: /^Passer$/ });
if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(600); }
if(!await DANS_L_APP(p,"le contrôle du contraste dans l'application")){await N.close();process.exit(1);}

let ko = 0;
const vus = new Set();
for (const ecran of ECRANS) {
  await p.evaluate((x) => window.dispatchEvent(new CustomEvent("timat:page", { detail: x })), ecran);
  await p.waitForTimeout(1400);
  const { mauvais } = await p.evaluate(new Function(`${MESURE}; return MESURE();`));
  const neufs = mauvais.filter((m) => { const k = m.couleur + "|" + m.fond; if (vus.has(k)) return false; vus.add(k); return true; });
  if (neufs.length) {
    ko += neufs.length;
    console.log(`  KO  ${ecran}`);
    for (const m of neufs.slice(0, 5))
      console.log(`        ${m.ratio}:1 (il faut ${m.seuil}) · ${m.taille} px · ${m.couleur} sur ${m.fond}${m.degrade ? " (extrémité du dégradé)" : ""} · « ${m.txt} »`);
  } else console.log(`  ok  ${ecran}`);
}
await N.close();
console.log(ko ? `\n${ko} couple(s) de couleurs sous le seuil WCAG AA dans l'espace ${ESPACE}\n` : `\nTout le texte de l'espace ${ESPACE} tient le contraste WCAG AA.\n`);
process.exit(ko ? 1 : 0);
