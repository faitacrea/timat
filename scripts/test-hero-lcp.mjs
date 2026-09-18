// Le hero peint avant React doit garder le LCP.
//
// Le LCP retient le plus GRAND élément peint, et n'enregistre un nouveau
// candidat que s'il est strictement plus grand que le précédent. Le hero
// statique faisait 372 px de large contre 388 pour celui de React, à cause de
// 8 px de marge latérale de différence. React peignait donc un candidat plus
// grand vers trois secondes, et c'est lui qui comptait : le hero peint en 0,8 s
// ne servait à rien pour la mesure, et le LCP mobile restait à 3,7 s.
//
// Huit pixels. Rien ne plantait, aucun test ne le voyait, et le travail de
// découpage du bundle était en partie annulé par ce détail. D'où ce contrôle,
// qui rend les deux hero comparables à chaque construction.
//
//   node scripts/test-hero-lcp.mjs
//
// Préalable : dist/ construit. Le script sert dist lui-même.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import path from "node:path";

const RACINE = path.join(process.cwd(), "dist");
const TYPES = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css",
  ".webp":"image/webp", ".png":"image/png", ".svg":"image/svg+xml", ".json":"application/json" };

const serveur = createServer((req, res) => {
  const chemin = decodeURIComponent(req.url.split("?")[0]);
  let f = path.join(RACINE, chemin === "/" ? "index.html" : chemin);
  if (!existsSync(f) || statSync(f).isDirectory()) f = path.join(RACINE, "index.html");
  res.setHeader("Content-Type", TYPES[path.extname(f)] || "application/octet-stream");
  res.end(readFileSync(f));
});
await new Promise((r) => serveur.listen(0, r));
const base = "http://localhost:" + serveur.address().port + "/";

const chercherChromium = () => {
  const racine = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!racine || !existsSync(racine)) return undefined;
  const lien = path.join(racine, "chromium");
  if (existsSync(lien) && statSync(lien).isFile()) return lien;
  for (const d of readdirSync(racine).filter((x) => x.startsWith("chromium-")).sort().reverse()) {
    const bin = path.join(racine, d, "chrome-linux", "chrome");
    if (existsSync(bin)) return bin;
  }
  return undefined;
};

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || chercherChromium() });

// Une premiere version de ce controle comparait getBoundingClientRect() des deux
// titres, apres stabilisation. Elle repondait « identiques, 31 846 chacun » —
// et le navigateur, lui, enregistrait deux candidats LCP de 20 900 puis 27 060.
// Un test vert et faux, exactement ce qu'on cherche a eviter.
//
// L'aire que retient le LCP n'est pas celle du bloc : c'est celle du TEXTE
// PEINT, au moment ou il est peint. Trois details invisibles la faisaient
// diverger — em en display:block cote statique, un letter-spacing de -0,01em
// que React n'applique pas, et un arrondi de hauteur de ligne a 412 px.
//
// On mesure donc ce que mesure Chrome : les candidats LCP, sous l'emulation
// mobile de Lighthouse. Un seul candidat = le hero peint tot garde le LCP.
const LARGEURS = [360, 390, 412, 430, 480];

const mesurer = async (largeur) => {
  const ctx = await nav.newContext({ viewport: { width: largeur, height: 823 }, deviceScaleFactor: 1.75 });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  // L'emulation mobile de Lighthouse : 1,6 Mbit/s, 150 ms d'aller-retour,
  // processeur quatre fois plus lent. Sans elle, React demarre en 100 ms et le
  // defaut ne se voit pas.
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 204800, uploadThroughput: 84375 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  // Google Fonts est injoignable depuis l'environnement de verification : on
  // repond a vide, pour que les deux rendus soient compares a police egale.
  await p.route("**://fonts.g**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await p.addInitScript(() => {
    window.__c = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__c.push({ t: Math.round(e.startTime), aire: Math.round(e.size) });
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  await p.goto(base, { waitUntil: "load" });
  await p.waitForTimeout(9000);
  const c = await p.evaluate(() => window.__c);
  await ctx.close();
  return c;
};

console.log("\n=== HERO — le titre peint avant React doit garder le LCP ===\n");
let ko = 0;
for (const l of LARGEURS) {
  const c = await mesurer(l);
  if (!c.length) { console.log(`  KO  ${l} px : aucun candidat LCP`); ko++; continue; }
  const ok = c.length === 1;
  if (!ok) ko++;
  const aires = c.map((e) => e.aire).join(" → ");
  console.log(`  ${ok ? "ok" : "KO"}  ${String(l).padStart(3)} px   ${c.length} candidat(s)   aire ${aires}   LCP ${c[c.length - 1].t} ms${ok ? "" : "   → React repeint plus grand et reprend le LCP"}`);
}
await nav.close();
serveur.close();
console.log(ko ? `\n${ko} largeur(s) ou React reprend le LCP\n` : "\nAucune anomalie\n");
process.exit(ko ? 1 : 0);
