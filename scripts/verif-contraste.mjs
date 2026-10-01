// LE CONTRASTE DU TEXTE REELLEMENT AFFICHE, PAS DES JETONS DE COULEUR.
//
// L'audit verifie les variables CSS de :root. Il ne voit donc rien quand une
// couleur est ecrite EN DUR dans un style : c'est exactement ce qui est arrive
// aux trois lignes « Resiliable en 1 clic », « Pointages... » et « Donnees en
// France », en blanc sur un fond creme, invisibles en ligne a 1,03:1.
//
// Ce controle lit la page comme un oeil : pour chaque texte visible, il calcule
// le contraste entre sa couleur et le fond EFFECTIF — celui du premier ancetre
// qui en a un — et applique le seuil WCAG AA : 4,5:1, ou 3:1 pour un texte large
// (18,66 px en gras, ou 24 px).
//
// Hors chaine de build : Vercel n'a pas de navigateur.
//   node scripts/verif-contraste.mjs
import { chromium } from "playwright";
import { readdirSync, readFileSync } from "node:fs";

const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];
const MESURE = () => {
  const lum = (c) => {
    const f = c.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  const rgb = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { c: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
  };
  // LE FOND EFFECTIF SE COMPOSE, IL NE SE PREND PAS AU PREMIER VENU.
  //
  // Premiere version de ce controle : elle prenait le premier ancetre dont le
  // backgroundColor n'etait pas transparent et utilisait sa couleur telle quelle.
  // Faux. Un badge pose « rgba(228,145,120,.14) » sur un fond creme : son fond
  // reel est un creme a peine rose, pas l'abricot plein. Le controle annoncait
  // 1,91:1 sur une pastille parfaitement lisible, et une douzaine d'autres
  // fausses alertes du meme genre. On empile donc les couches, de l'ancetre vers
  // l'element, en melangeant chaque couleur a l'opacite qu'elle a vraiment.
  const fond = (n) => {
    const couches = [];
    for (let e = n; e; e = e.parentElement) {
      const st = getComputedStyle(e);
      if (st.backgroundImage && st.backgroundImage !== "none") {
        // UN DEGRADE SE MESURE PAR SES EXTREMITES. La couleur varie d'un bout a
        // l'autre : le texte doit tenir le seuil sur la plus claire ET sur la
        // plus sombre, sinon il devient illisible sur une partie du bloc. On lit
        // donc les arrets de couleur declares, et on les rend tous.
        const arrets = [...st.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => rgb(m[0])).filter(Boolean);
        if (!arrets.length) return null; // une image : on ne peut rien dire
        return arrets.map((a) => a.a >= 1 ? a.c : a.c.map((v, k) => Math.round(v * a.a + 255 * (1 - a.a))));
      }
      const b = rgb(st.backgroundColor);
      if (b && b.a > 0) couches.push(b);
      if (b && b.a >= 1) break; // opaque : inutile de remonter plus haut
    }
    let f = [255, 255, 255]; // la page elle-meme
    for (let i = couches.length - 1; i >= 0; i--) {
      const { c, a } = couches[i];
      f = f.map((v, k) => c[k] * a + v * (1 - a));
    }
    return f.map((v) => Math.round(v));
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const out = []; let nonMesurables = 0;
  // ON PARCOURT LES NOEUDS DE TEXTE, PAS LES ELEMENTS.
  //
  // Premiere version : « seulement les elements sans enfant ». Un pied de page
  // ecrit « TiMat — … <br> … <a>Confidentialite</a> » contient des enfants : il
  // etait donc saute en entier, et son gris pale n'a jamais ete mesure. Chaque
  // morceau de texte a son propre element parent, et c'est lui qui porte la
  // couleur : on part donc du texte et on remonte d'un cran.
  const marcheur = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const noeuds = [];
  for (let x = marcheur.nextNode(); x; x = marcheur.nextNode())
    if (x.textContent.trim() && x.parentElement) noeuds.push(x.parentElement);
  for (const n of new Set(noeuds)) {
    const t = (n.innerText || n.textContent || "").trim();
    if (!t) continue;
    if (/^(SCRIPT|STYLE|NOSCRIPT|TITLE)$/.test(n.tagName)) continue;
    const st = getComputedStyle(n);
    if (st.visibility === "hidden" || st.display === "none" || Number(st.opacity) < 0.1) continue;
    const r = n.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const av = rgb(st.color);
    if (!av) continue;
    // Un texte semi-transparent se melange a son fond : on en tient compte.
    const brut = fond(n);
    if (!brut) { nonMesurables++; continue; }
    const fonds = Array.isArray(brut[0]) ? brut : [brut];
    const taille = parseFloat(st.fontSize);
    const gras = Number(st.fontWeight) >= 700 || st.fontWeight === "bold";
    const large = taille >= 24 || (taille >= 18.66 && gras);
    const seuil = large ? 3 : 4.5;
    // Le pire des fonds decide : c'est celui ou le texte disparait.
    let pire = null;
    for (const f of fonds) {
      const c = av.a >= 1 ? av.c : av.c.map((v, i) => Math.round(v * av.a + f[i] * (1 - av.a)));
      const v = ratio(c, f);
      if (!pire || v < pire.v) pire = { v, f };
    }
    if (pire.v < seuil) out.push({ txt: t.slice(0, 48).replace(/\s+/g, " "), ratio: Math.round(pire.v * 100) / 100, seuil, taille: Math.round(taille * 10) / 10, couleur: st.color, fond: `rgb(${pire.f.join(", ")})`, degrade: fonds.length > 1 });
  }
  // Un meme defaut se repete sur toute une liste : on ne le compte qu'une fois.
  const vus = new Set(); const uniq = [];
  for (const o of out) { const k = o.couleur + "|" + o.fond + "|" + o.seuil; if (vus.has(k)) continue; vus.add(k); uniq.push(o); }
  return { mauvais: uniq, nonMesurables };
};

const N = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const CIBLES = [
  ["la page d'accueil", `/?acces=${CLE}`],
  ...readdirSync(new URL("../public/", import.meta.url))
    .filter((f) => f.endsWith(".html") && f !== "maintenance.html")
    .map((f) => [f, "/" + f]),
];

let ko = 0, totalNonMesurables = 0;
for (const [nom, url] of CIBLES) {
  const ctx = await N.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", serviceWorkers: "block" });
  const p = await ctx.newPage();
  await p.route("**/rest/v1/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await p.goto(`http://127.0.0.1:4173${url}`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(url.includes("acces=") ? 4000 : 900);
  const { mauvais, nonMesurables } = await p.evaluate(MESURE);
  totalNonMesurables += nonMesurables;
  if (mauvais.length) {
    ko += mauvais.length;
    console.log(`  KO  ${nom}`);
    for (const m of mauvais.slice(0, 6))
      console.log(`        ${m.ratio}:1 (il faut ${m.seuil}) · ${m.taille} px · ${m.couleur} sur ${m.fond}${m.degrade ? " (extrémité du dégradé)" : ""} · « ${m.txt} »`);
    if (mauvais.length > 6) console.log(`        … et ${mauvais.length - 6} autres couples de couleurs`);
  } else console.log(`  ok  ${nom}`);
  await ctx.close();
}
await N.close();
console.log(`\n${totalNonMesurables} texte(s) posés sur une image de fond : non mesurables, à regarder à l'œil.`);
console.log(ko ? `${ko} couple(s) de couleurs sous le seuil WCAG AA\n` : "Tout le texte sur fond uni tient le contraste WCAG AA.\n");
process.exit(ko ? 1 : 0);
