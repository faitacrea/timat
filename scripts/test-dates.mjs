// Vérifie que l'application ne perd pas un jour en écrivant une date.
//
// Pourquoi : `toISOString()` convertit en UTC. La France étant en UTC+1 ou
// UTC+2, une date construite à l'heure locale y recule d'un jour :
//
//   new Date(2026, 8, 1)          -> 1er septembre, minuit, heure de Paris
//   .toISOString().slice(0, 10)   -> "2026-08-31"
//
// Ce n'était pas une erreur de nuit : tout début de mois construit ainsi
// tombait la veille, en permanence — et ces bornes servent aux rapports, aux
// attestations et au récap Pajemploi. Le même piège décale « aujourd'hui »
// entre minuit et 2 h du matin.
//
// isoJour() corrige le décalage. Ce test le démontre, puis relit le source
// pour vérifier qu'aucune conversion ne contourne le helper.
import { readFileSync } from "node:fs";

if (process.env.TZ !== "Europe/Paris") {
  // On force le fuseau : le défaut du serveur est UTC, où le défaut ne se voit pas.
  process.env.TZ = "Europe/Paris";
}

const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
let ko = 0;

const extrait = src.match(/const isoJour=\([\s\S]*?\n\};/);
if (!extrait) {
  console.error("\n  KO  isoJour() est introuvable dans src/App.jsx\n");
  process.exit(1);
}
const isoJour = eval("(" + extrait[0].replace(/^const isoJour=/, "").replace(/;$/, "") + ")");

console.log("\n=== DATES — pas de jour perdu en passant par UTC ===\n");
console.log(`  fuseau du test : ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n`);

const cas = [
  { d: new Date(2026, 8, 1), a: "2026-09-01", n: "1er septembre, début de mois" },
  { d: new Date(2026, 0, 1), a: "2026-01-01", n: "1er janvier, début d'année" },
  { d: new Date(2026, 11, 31), a: "2026-12-31", n: "31 décembre, fin d'année" },
  { d: new Date("2026-09-09T00:30:00+02:00"), a: "2026-09-09", n: "9 septembre à 00 h 30" },
  { d: new Date("2026-09-09T23:45:00+02:00"), a: "2026-09-09", n: "9 septembre à 23 h 45" },
  { d: new Date(2026, 1, 1), a: "2026-02-01", n: "1er février, heure d'hiver (UTC+1)" },
  { d: "2026-07-14", a: "2026-07-14", n: "chaîne déjà au bon format" },
];
for (const c of cas) {
  const r = isoJour(c.d);
  const ok = r === c.a;
  if (!ok) ko++;
  console.log(`  ${ok ? "ok " : "KO "} ${c.n.padEnd(42)} ${r} (attendu ${c.a})`);
}

// La démonstration du piège : la même date, sans le helper.
const sansHelper = new Date(2026, 8, 1).toISOString().slice(0, 10);
const piegeDemontre = sansHelper === "2026-08-31";
if (!piegeDemontre) ko++;
console.log(`  ${piegeDemontre ? "ok " : "KO "} ${"sans le helper, le 1er septembre tombe la veille".padEnd(42)} ${sansHelper}`);

// --- Aucune conversion ne doit contourner le helper ---
const contournements = [...src.matchAll(/([^;\n]{0,90})toISOString\(\)\.slice\(0,\s*10\)/g)]
  .filter((m) => !/getTimezoneOffset/.test(m[1]))
  .map((m) => `ligne ${src.slice(0, m.index).split("\n").length}`);

console.log("");
if (contournements.length) {
  ko += contournements.length;
  console.log(`  KO  ${contournements.length} conversion(s) de date en UTC sans passer par isoJour() :`);
  for (const c of contournements) console.log("        " + c);
} else {
  console.log("  ok  toute conversion de date passe par isoJour()");
}

console.log(ko ? `\n${ko} problème(s)\n` : "\nTout est conforme.\n");
process.exit(ko ? 1 : 0);
