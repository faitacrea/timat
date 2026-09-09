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

let ko = 0;
console.log("\n=== RETENUE POUR ABSENCE — CCN 3239 art. 111 ===\n");
for (const c of cas) {
  const r = retenueAbsence(c.a);
  const ok = Math.abs(r - c.attendu) < 0.011;
  if (!ok) ko++;
  console.log(`  ${ok ? "ok " : "KO "} ${c.n.padEnd(48)} ${r.toFixed(2)} € (attendu ${c.attendu.toFixed(2)} €)`);
}
console.log(ko ? `\n${ko} cas en échec\n` : `\n${cas.length} cas sur ${cas.length} conformes\n`);
process.exit(ko ? 1 : 0);
