// Verifie la formule de retenue pour absence sur des cas calcules a la main.
//
// Pourquoi ce fichier : la formule vit dans src/App.jsx, au milieu de dix-huit
// mille lignes. La recopier ici pour la tester recreerait exactement le defaut
// qu'on vient de corriger ailleurs — deux versions d'une meme regle qui
// divergent en silence. Le test extrait donc la fonction du source et l'evalue :
// il n'existe qu'une seule formule, et c'est celle que l'application utilise.
//
// Regle testee : convention collective de la branche du secteur des
// particuliers employeurs et de l'emploi a domicile (IDCC 3239), article 111
// « Deduction des periodes d'absence ».
//   annee complete   : salaire mensualise x heures absence / heures du mois
//   annee incomplete : salaire mensualise x jours absence / jours du mois
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const extrait = src.match(/const retenueAbsence=\([\s\S]*?\n\};/);
if (!extrait) {
  console.error("retenueAbsence introuvable dans src/App.jsx");
  process.exit(1);
}
const retenueAbsence = eval("(" + extrait[0].replace(/^const retenueAbsence=/, "").replace(/;$/, "") + ")");

const cas = [
  { n: "année complète, 1 jour de 8 h sur 173 h", a: { salaireMensualise: 700.65, anneeComplete: true, heuresAbsence: 8, heuresMois: 173 }, attendu: +(700.65 * 8 / 173).toFixed(2) },
  { n: "année complète, 3 jours de 9 h", a: { salaireMensualise: 900, anneeComplete: true, heuresAbsence: 27, heuresMois: 180 }, attendu: 135 },
  { n: "année incomplète, 2 jours sur 20", a: { salaireMensualise: 600, anneeComplete: false, joursAbsence: 2, joursMois: 20 }, attendu: 60 },
  { n: "année incomplète ignore les heures", a: { salaireMensualise: 600, anneeComplete: false, heuresAbsence: 99, heuresMois: 100, joursAbsence: 1, joursMois: 20 }, attendu: 30 },
  { n: "aucune absence", a: { salaireMensualise: 700, anneeComplete: true, heuresAbsence: 0, heuresMois: 173 }, attendu: 0 },
  { n: "mois sans heures (division par zéro)", a: { salaireMensualise: 700, anneeComplete: true, heuresAbsence: 8, heuresMois: 0 }, attendu: 0 },
  { n: "absence plus longue que le mois (plafonnée)", a: { salaireMensualise: 700, anneeComplete: true, heuresAbsence: 400, heuresMois: 173 }, attendu: 700 },
  { n: "salaire nul", a: { salaireMensualise: 0, anneeComplete: true, heuresAbsence: 8, heuresMois: 173 }, attendu: 0 },
  { n: "année incomplète sans jours (division par zéro)", a: { salaireMensualise: 700, anneeComplete: false, joursAbsence: 2, joursMois: 0 }, attendu: 0 },
  { n: "heures négatives (saisie aberrante)", a: { salaireMensualise: 700, anneeComplete: true, heuresAbsence: -8, heuresMois: 173 }, attendu: 0 },
];

// Allocation de formation : forfait de 5,57 EUR nets l'heure depuis le
// 1er avril 2025, plafonne a 58 h par an (plan de developpement des
// competences). Elle ne concerne que les heures suivies HORS temps d'accueil.
const extraitAlloc = src.match(/const allocationFormation = \([\s\S]*?\n\};/);
if (!extraitAlloc) {
  console.error("allocationFormation introuvable dans src/App.jsx");
  process.exit(1);
}
const TAUX_ALLOC = parseFloat((src.match(/ALLOC_FORMATION_H = ([\d.]+)/) || [])[1]);
const PLAFOND_ALLOC = parseFloat((src.match(/ALLOC_FORMATION_PLAFOND_H = (\d+)/) || [])[1]);
const allocationFormation = eval(
  `(function(){const ALLOC_FORMATION_H=${TAUX_ALLOC};const ALLOC_FORMATION_PLAFOND_H=${PLAFOND_ALLOC};`
  + extraitAlloc[0].replace(/^const allocationFormation = /, "return ").replace(/;$/, "") + "})()"
);

const casAlloc = [
  { n: "14 h de formation hors accueil", h: 14, attendu: +(14 * TAUX_ALLOC).toFixed(2) },
  { n: "une seule heure", h: 1, attendu: TAUX_ALLOC },
  { n: "aucune heure", h: 0, attendu: 0 },
  { n: "au-delà du plafond annuel de 58 h", h: 70, attendu: +(PLAFOND_ALLOC * TAUX_ALLOC).toFixed(2) },
  { n: "pile au plafond", h: PLAFOND_ALLOC, attendu: +(PLAFOND_ALLOC * TAUX_ALLOC).toFixed(2) },
  { n: "heures négatives (saisie aberrante)", h: -5, attendu: 0 },
  { n: "valeur non numérique", h: "abc", attendu: 0 },
];

let koAlloc = 0;
console.log("\n=== ALLOCATION DE FORMATION — hors temps d'accueil ===\n");
for (const c of casAlloc) {
  const r = allocationFormation(c.h);
  const ok = Math.abs(r - c.attendu) < 0.011;
  if (!ok) koAlloc++;
  console.log(`  ${ok ? "ok " : "KO "} ${c.n.padEnd(48)} ${r.toFixed(2)} € (attendu ${c.attendu.toFixed(2)} €)`);
}

let ko = koAlloc;
console.log("\n=== RETENUE POUR ABSENCE — CCN 3239 art. 111 ===\n");
for (const c of cas) {
  const r = retenueAbsence(c.a);
  const ok = Math.abs(r - c.attendu) < 0.011;
  if (!ok) ko++;
  console.log(`  ${ok ? "ok " : "KO "} ${c.n.padEnd(48)} ${r.toFixed(2)} € (attendu ${c.attendu.toFixed(2)} €)`);
}
const total = cas.length + casAlloc.length;
console.log(ko ? `\n${ko} cas en échec\n` : `\n${total} cas sur ${total} conformes\n`);
process.exit(ko ? 1 : 0);
