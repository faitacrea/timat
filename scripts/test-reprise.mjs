// Les deux lectures qui decident si une reprise d'historique est juste.
//
// Un export d'un autre outil n'a aucune raison d'ecrire les nombres comme nous :
// « 1 234,50 € » avec un espace insecable, « 151,67h », une case vide. Et le
// mois s'ecrit « 2026-01 », « 01/2026 » ou « janvier 2026 » selon l'outil.
//
// LA REGLE QUI COMPTE : un nombre qu'on n'a pas compris devient null, JAMAIS
// zero. Zero est un chiffre, il s'additionne, il se retrouve dans un
// recapitulatif fiscal — et un zero faux ne se voit pas. Un trou, si.
//
//   node scripts/test-reprise.mjs
//
// Les deux fonctions sont extraites du module d'ecrans et executees telles
// quelles : une copie ici finirait par diverger de l'originale.
import { readFileSync } from "node:fs";
import esbuild from "esbuild";
const src = readFileSync("src/ecrans-secondaires.jsx","utf8");
// On n'extrait que les deux fonctions pures : elles ne dependent de rien.
const bloc = src.slice(src.indexOf("export const nombreRepris"), src.indexOf("export function RepriseContrat"));
const js = (await esbuild.transform(bloc.replace(/^export /gm,""), {loader:"js"})).code;
const { nombreRepris, moisRepris } = await import("data:text/javascript;base64," +
  Buffer.from(js + "\nexport { nombreRepris, moisRepris };").toString("base64"));

let ko = 0;
const ok = (quoi, obtenu, attendu) => {
  const bon = Object.is(obtenu, attendu);
  if (!bon) ko++;
  console.log(`  ${bon?"ok ":"KO "} ${quoi} → ${JSON.stringify(obtenu)}${bon?"":" (attendu "+JSON.stringify(attendu)+")"}`);
};

console.log("\n=== LES NOMBRES DES AUTRES OUTILS ===");
ok("1234.5",          nombreRepris("1234.5"), 1234.5);
ok("1234,50 (virgule)", nombreRepris("1234,50"), 1234.5);
ok("1 234,50 €",      nombreRepris("1 234,50 €"), 1234.5);
ok("insécable + €",   nombreRepris("1 234,50 €"), 1234.5);
ok("151,67 h",        nombreRepris("151,67h"), 151.67);
ok("case vide",       nombreRepris(""), null);
ok("null",            nombreRepris(null), null);
ok("« néant »",       nombreRepris("néant"), null);
ok("zéro reste zéro", nombreRepris("0"), 0);

console.log("\n=== LES MOIS ===");
ok("2026-01",         moisRepris("2026-01"), "2026-01");
ok("2026-1",          moisRepris("2026-1"), "2026-01");
ok("01/2026",         moisRepris("01/2026"), "2026-01");
ok("1/2026",          moisRepris("1/2026"), "2026-01");
ok("janvier 2026",    moisRepris("janvier 2026"), "2026-01");
ok("Décembre 2025",   moisRepris("Décembre 2025"), "2025-12");
ok("Août 2026",       moisRepris("Août 2026"), "2026-08");
ok("illisible",       moisRepris("le mois dernier"), null);
ok("vide",            moisRepris(""), null);

console.log(ko ? `\n${ko} échec(s).` : "\nTout est conforme.");
process.exit(ko ? 1 : 0);
