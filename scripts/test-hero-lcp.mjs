// Le hero peint avant React doit être AU MOINS aussi grand que celui de React.
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

// Les deux mesures se font aux memes largeurs, dont celles ou les points de
// rupture changent les marges : une egalite a 412 px qui se defait a 360 ne
// vaut rien, la moitie des telephones y sont.
const LARGEURS = [360, 390, 412, 430];

const mesurer = async (largeur, sansReact) => {
  const ctx = await nav.newContext({ viewport: { width: largeur, height: 823 }, deviceScaleFactor: 1.75 });
  const p = await ctx.newPage();
  // Google Fonts est injoignable depuis l'environnement de verification : on
  // repond a vide, identiquement dans les deux cas, pour comparer a police egale.
  await p.route("**://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await p.route("**://fonts.gstatic.com/**", (r) => r.fulfill({ status: 200, body: "" }));
  if (sansReact) await p.route("**/assets/index-*.js", (r) => r.abort());
  await p.goto(base, { waitUntil: "load" });
  await p.waitForTimeout(sansReact ? 600 : 3500);
  const r = await p.evaluate(() => {
    const h = document.querySelector("h1");
    if (!h) return null;
    const rc = h.getBoundingClientRect();
    return { w: Math.round(rc.width), h: Math.round(rc.height), aire: Math.round(rc.width * rc.height) };
  });
  await ctx.close();
  return r;
};

console.log("\n=== HERO — le peint avant React ne doit pas être plus petit ===\n");
let ko = 0;
for (const l of LARGEURS) {
  const st = await mesurer(l, true);
  const re = await mesurer(l, false);
  if (!st || !re) {
    console.log(`  KO  ${l} px : pas de <h1> (${!st ? "avant React" : "après React"})`);
    ko++; continue;
  }
  const ecart = re.aire - st.aire;
  const ok = ecart <= 0;
  if (!ok) ko++;
  console.log(`  ${ok ? "ok" : "KO"}  ${String(l).padStart(3)} px   statique ${st.w}x${st.h} = ${String(st.aire).padStart(6)}   React ${re.w}x${re.h} = ${String(re.aire).padStart(6)}   ${ecart > 0 ? `React plus grand de ${ecart} px² → il reprend le LCP` : "React ne reprend pas le LCP"}`);
}
await nav.close();
serveur.close();
console.log(ko ? `\n${ko} largeur(s) où React repeint un candidat LCP plus grand\n` : "\nAucune anomalie\n");
process.exit(ko ? 1 : 0);
