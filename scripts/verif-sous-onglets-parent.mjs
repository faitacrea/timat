// TOUS LES SOUS-ONGLETS DE L'ESPACE PARENT, UN PAR UN, SUR UN ECRAN DE TELEPHONE.
//
// Le parcours visuel ouvre les ENTREES DU MENU. Il ne clique pas les onglets
// qui vivent A L'INTERIEUR d'un ecran — or c'est la que les fusions ont tout
// deplace : le registre, les bilans, le projet d'accueil, le planning
// periscolaire ont change de parent, et un ecran peut parfaitement s'ouvrir
// par le menu tout en restant blanc deux clics plus loin.
//
// Ce controle enumere les onglets reellement presents dans la barre segmentee,
// les clique tous, et refuse : une erreur JavaScript, un ecran vide, un
// debordement horizontal, un titre absent. Rien n'est code en dur — ce sont
// les onglets que le parent a sous le pouce.
//
// Hors chaine de build : Vercel n'a pas de navigateur.
//   node scripts/verif-sous-onglets-parent.mjs
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { BRANCHER, BUNDLE_TESTABLE, ATTENDRE_PRET, DANS_L_APP } from "./jeu-de-donnees.mjs";

const LARGEUR = 390; // iPhone 14/15, le format le plus etroit encore courant
const SORTIE = "captures-sous-onglets-parent";
const CLE = (readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/) || [])[1];
mkdirSync(SORTIE, { recursive: true });

const N = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await N.newContext({ viewport: { width: LARGEUR, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
const p = await ctx.newPage();
let err = [];
p.on("pageerror", (e) => err.push("erreur JS : " + e.message.slice(0, 140)));
p.on("console", (m) => { const t = m.text(); if (m.type() === "error" && !/ERR_|Failed to load resource|Failed to fetch/.test(t)) err.push("console : " + t.slice(0, 140)); });
// L'ECRAN DE CONNEXION PARENT N'A PAS DE COMPTE DE DEMONSTRATION — contrairement
// a celui de l'assistante maternelle, ou une adresse de demonstration ouvre
// l'espace meme sans Supabase. On ne peut donc pas y entrer par un faux compte :
// on repond a sa place une session valide, exactement ce que Supabase renverrait
// pour un vrai parent. C'est le parcours reel, pas un raccourci.
// La session vient de BRANCHER : ce fichier portait la sienne, avec un
// identifiant « p1 » qu'aucune ligne du jeu de données ne connaissait.
// LA BASE ET LA SESSION, DEPUIS LE JEU DE DONNÉES PARTAGÉ.
// Ce contrôle doublait « rest/v1 » par « [] » et se connectait en
// démonstration : l'application ne trouvait aucun profil, et la connexion
// s'arrêtait sur « Votre compte n'a pas pu être chargé ». Tout ce qu'il
// déclarait « ok » était mesuré derrière cette carte d'erreur.
await BRANCHER(p,"parent",CLE);

await p.goto(`http://127.0.0.1:4173/?acces=${CLE}&connexion=parent`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(2500);
if(!await BUNDLE_TESTABLE(p)){await N.close();process.exit(1);}
await ATTENDRE_PRET(p,2200);
// La session est deja ouverte par BRANCHER : plus de formulaire a remplir.
const passer = p.getByRole("button", { name: /^Passer$/ });
if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(600); }
if(!await DANS_L_APP(p,"le contrôle des sous-onglets de l'espace parent")){await N.close();process.exit(1);}

// Qui suis-je ? Un espace assmat ouvert par erreur invaliderait tout le reste.
const estParent = await p.evaluate(() => /Mon enfant/.test(document.body.innerText));

// Les ecrans de l'espace parent qui portent une barre segmentee.
const PAGES = [
  ["journee", "Journée"],
  ["suivi_progres", "Suivi & Progrès"],
  ["sante_urgence", "Santé & Urgence"],
  ["calendrier", "Calendrier"],
  ["aides_simulateurs", "Aides & Simulateurs"],
  ["documents_complet", "Documents & Attestations"],
];

// La barre segmentee est le premier bloc de boutons courts de la page. On la
// reconnait a sa structure, pas a une classe : les libelles viennent du code.
const ongletsDe = () => p.evaluate(() => {
  const bar = [...document.querySelectorAll("div")].find((d) =>
    d.children.length >= 2 && [...d.children].every((c) => c.tagName === "BUTTON") &&
    [...d.children].every((c) => c.innerText.trim().length > 0 && c.innerText.trim().length < 40));
  return bar ? [...bar.children].map((b) => b.innerText.replace(/\s+/g, " ").trim()) : [];
});

let ko = 0;
const lignes = [];
for (const [page, nom] of PAGES) {
  await p.evaluate((x) => window.dispatchEvent(new CustomEvent("timat:page", { detail: x })), page);
  await p.waitForTimeout(1500);
  const onglets = await ongletsDe();
  if (!onglets.length) { ko++; lignes.push({ ecran: nom, onglet: "—", souci: "aucune barre d'onglets trouvée" }); continue; }
  for (let i = 0; i < onglets.length; i++) {
    err = [];
    const clique = await p.evaluate((libelle) => {
      const b = [...document.querySelectorAll("button")].find((x) => x.innerText.replace(/\s+/g, " ").trim() === libelle);
      if (b) { b.click(); return true; } return false;
    }, onglets[i]);
    await p.waitForTimeout(1600);
    const m = await p.evaluate((L) => {
      const t = document.body.innerText.replace(/\s+/g, " ").trim();
      const deborde = document.documentElement.scrollWidth > L + 1;
      const coupables = [];
      if (deborde) for (const n of document.querySelectorAll("body *")) {
        const r = n.getBoundingClientRect();
        if (r.width > 0 && r.right > L + 1) { coupables.push(`${n.tagName}: ${(n.innerText || "").slice(0, 40)}`); if (coupables.length > 2) break; }
      }
      // Le titre de l'ecran : le premier gros texte de la page. Il est souvent
      // decoupe en plusieurs <span> — on accepte donc un element compose, mais
      // on exige qu'il ne contienne pas la page entiere.
      const titres = [...document.querySelectorAll("h1,h2,h3,div,span")]
        .filter((n) => {
          const t = n.innerText ? n.innerText.replace(/\s+/g, " ").trim() : "";
          return parseFloat(getComputedStyle(n).fontSize) >= 17 && t.length > 2 && t.length < 70 && n.childElementCount <= 3;
        })
        .map((n) => n.innerText.replace(/\s+/g, " ").trim());
      return { longueur: t.length, deborde, coupables, titre: titres[0] || "" };
    }, LARGEUR);
    const souci = !clique ? "onglet introuvable au clic"
      : err.length ? err[0]
      : m.longueur < 180 ? `écran quasi vide (${m.longueur} caractères)`
      : m.deborde ? `débordement horizontal — ${m.coupables.join(" | ")}`
      : !m.titre ? "aucun titre lisible"
      : "";
    if (souci) ko++;
    lignes.push({ ecran: nom, onglet: onglets[i], titre: m.titre, souci });
    await p.screenshot({ path: `${SORTIE}/${page}-${i}.png`, fullPage: true });
  }
}
await N.close();

console.log(`\n  ${estParent ? "ok " : "KO "} l'espace ouvert est bien celui du parent`);
if (!estParent) ko++;
console.log(`\n${"écran".padEnd(24)}${"sous-onglet".padEnd(26)}résultat`);
for (const l of lignes)
  console.log(`${l.ecran.padEnd(24)}${l.onglet.padEnd(26)}${l.souci ? "KO  " + l.souci : "ok" + (l.titre ? `  (« ${l.titre} »)` : "")}`);
console.log(ko ? `\n${ko} problème(s) — captures dans ${SORTIE}/\n` : `\nLes ${lignes.length} sous-onglets du parent s'ouvrent, à ${LARGEUR} px, sans erreur ni débordement.\n`);
process.exit(ko ? 1 : 0);
