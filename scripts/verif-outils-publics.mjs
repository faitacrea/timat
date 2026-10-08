// LES 17 PAGES OUTILS PUBLIQUES, OUVERTES ET UTILISEES POUR DE VRAI.
//
// Ce sont des pages HTML autonomes, hors de React : aucun test ne les ouvrait.
// Elles sont pourtant publiques, indexees, et ce sont elles qu'un visiteur — ou
// un relecteur de l'Urssaf — essaie en premier. Un simulateur qui plante au clic
// ou qui affiche « NaN » ne se voit qu'en l'utilisant.
//
// Le controle ouvre chaque page, clique son bouton de calcul, et refuse : une
// erreur JavaScript, un « NaN » ou « undefined » a l'ecran, un resultat vide, un
// debordement horizontal sur un ecran de telephone, un JSON-LD invalide.
//
// Hors chaine de build : Vercel n'a pas de navigateur.
//   node scripts/verif-outils-publics.mjs
import { chromium } from "playwright";
import { CHROMIUM } from "./jeu-de-donnees.mjs";
import { readdirSync, readFileSync } from "node:fs";

const LARGEUR = 390;
const pages = readdirSync(new URL("../public/", import.meta.url))
  .filter((f) => f.endsWith(".html") && f !== "maintenance.html");

const N = await chromium.launch({ executablePath: CHROMIUM() });
let ko = 0;
for (const f of pages) {
  const ctx = await N.newContext({ viewport: { width: LARGEUR, height: 844 }, locale: "fr-FR", serviceWorkers: "block" });
  const p = await ctx.newPage();
  const err = [];
  p.on("pageerror", (e) => err.push("erreur JS : " + e.message.slice(0, 120)));
  p.on("console", (m) => { const t = m.text(); if (m.type() === "error" && !/ERR_|Failed to load resource|Failed to fetch/.test(t)) err.push("console : " + t.slice(0, 120)); });
  await p.goto(`http://127.0.0.1:4173/${f}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(700);

  // Les donnees structurees : un JSON invalide est ignore en silence par Google.
  const ldKo = await p.evaluate(() => {
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try { JSON.parse(s.textContent); } catch (e) { return e.message.slice(0, 80); }
    }
    return "";
  });

  // Ces pages calculent en direct, a la frappe : il n'y a pas toujours de bouton.
  // On reveille donc chaque champ avec sa valeur par defaut — c'est ce que fait
  // un visiteur qui touche un curseur — puis on clique un bouton s'il en existe.
  const declenche = await p.evaluate(() => {
    const champs = [...document.querySelectorAll("input, select")];
    for (const c of champs) {
      c.dispatchEvent(new Event("input", { bubbles: true }));
      c.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const b = [...document.querySelectorAll("button")].find((x) => /calcul|v[ée]rifi|estim|compar|simul/i.test(x.innerText));
    if (b) b.click();
    return `${champs.length} champ(s)${b ? " + bouton" : ""}`;
  });
  await p.waitForTimeout(900);

  const m = await p.evaluate((L) => {
    const t = document.body.innerText;
    return {
      nan: /\bNaN\b|undefined|\[object Object\]|Infinity/.test(t),
      extrait: (t.match(/.{0,40}(?:NaN|undefined|\[object Object\]|Infinity).{0,40}/) || [""])[0].replace(/\s+/g, " "),
      deborde: document.documentElement.scrollWidth > L + 1,
      coupable: (() => {
        if (document.documentElement.scrollWidth <= L + 1) return "";
        for (const n of document.querySelectorAll("body *")) {
          const r = n.getBoundingClientRect();
          if (r.width > 0 && r.right > L + 1)
            return `${n.tagName}${n.className ? "." + String(n.className).split(" ")[0] : ""} dépasse de ${Math.round(r.right - L)} px : « ${(n.innerText || "").slice(0, 40).replace(/\s+/g, " ")} »`;
        }
        return "cause introuvable";
      })(),
      longueur: t.length,
    };
  }, LARGEUR);

  const souci = err.length ? err[0]
    : ldKo ? `données structurées invalides : ${ldKo}`
    : m.nan ? `affiche « ${m.extrait} »`
    : m.deborde ? `débordement horizontal à ${LARGEUR} px — ${m.coupable}`
    : m.longueur < 400 ? `page quasi vide (${m.longueur} caractères)`
    : "";
  if (souci) ko++;
  console.log(`  ${souci ? "KO " : "ok "} ${f.padEnd(58)}${souci || declenche}`);
  await ctx.close();
}
await N.close();
console.log(ko ? `\n${ko} problème(s) sur ${pages.length} pages publiques\n` : `\nLes ${pages.length} pages outils publiques s'ouvrent et calculent, sans erreur.\n`);
process.exit(ko ? 1 : 0);
