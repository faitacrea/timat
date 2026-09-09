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

// Salaire horaire minimum : le plus favorable entre le minimum conventionnel
// (table datee) et le minimum legal indexe sur le SMIC (0,281 x SMIC). Le titre
// professionnel AM-GE majore le conventionnel de 4 % (CCN 3239, art. 113 et
// annexe 5).
const bloc = (nom) => (src.match(new RegExp(`const ${nom}=(\\[[\\s\\S]*?\\]);`)) || [])[1];
const extraitMin = src.match(/const minimumHoraireAu=\([\s\S]*?\n\};/);
const contexte = `
  const isoJour=(d)=>d instanceof Date?new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10):String(d).slice(0,10);
  const SMIC_HORAIRE_HISTO=${bloc("SMIC_HORAIRE_HISTO")};
  const MINIMUM_CONV_HISTO=${bloc("MINIMUM_CONV_HISTO")};
  const smicHoraireAu=(d)=>{const j=isoJour(d);for(const[a,v]of SMIC_HORAIRE_HISTO)if(j>=a)return v;return SMIC_HORAIRE_HISTO[SMIC_HORAIRE_HISTO.length-1][1];};
  const COEF_MINIMUM_LEGAL=${(src.match(/const COEF_MINIMUM_LEGAL=([\d.]+)/) || [])[1]};
  const MAJORATION_TITRE_AMGE=${(src.match(/const MAJORATION_TITRE_AMGE=([\d.]+)/) || [])[1]};
  ${extraitMin ? extraitMin[0] : ""}
  return minimumHoraireAu;`;
const minimumHoraireAu = eval(`(function(){${contexte}})()`);

const casMin = [
  { d: "2026-09-01", t: false, a: 4.20, n: "aujourd'hui, sans le titre" },
  { d: "2026-09-01", t: true, a: 4.37, n: "aujourd'hui, avec le titre AM-GE (+4 %)" },
  { d: "2026-05-31", t: false, a: 3.64, n: "avant l'avenant du 1er juin 2026" },
  { d: "2026-05-31", t: true, a: 3.79, n: "avant l'avenant, avec le titre" },
];
let koMin = 0;
console.log("\n=== SALAIRE HORAIRE MINIMUM — CCN 3239 ===\n");
for (const c of casMin) {
  const r = minimumHoraireAu(c.d, c.t);
  const ok = Math.abs(r - c.a) < 0.011;
  if (!ok) koMin++;
  console.log(`  ${ok ? "ok " : "KO "} ${c.n.padEnd(48)} ${r.toFixed(2)} € (attendu ${c.a.toFixed(2)} €)`);
}
// Le legal ne doit jamais l'emporter tant que le conventionnel est au-dessus.
const legalAujourdhui = Math.round(12.31 * 0.281 * 100) / 100;
const legalIgnore = minimumHoraireAu("2026-09-01", false) > legalAujourdhui;
if (!legalIgnore) koMin++;
console.log(`  ${legalIgnore ? "ok " : "KO "} ${"le conventionnel l'emporte sur le légal".padEnd(48)} ${legalAujourdhui.toFixed(2)} € écarté`);

// --- Mensualisation : deux formules, pas une ---
const mens = eval(`(function(){
  ${(src.match(/const SEMAINES_ANNEE_COMPLETE=\d+;/) || [""])[0]}
  ${(src.match(/const SEMAINES_MAX_ANNEE_INCOMPLETE=\d+;/) || [""])[0]}
  ${(src.match(/const MOIS_PAR_AN=\d+;/) || [""])[0]}
  ${(src.match(/const estAnneeComplete=\([\s\S]*?;\n/) || [""])[0]}
  ${(src.match(/const semainesDuContrat=\([\s\S]*?\n\};/) || [""])[0]}
  ${(src.match(/const heuresMensualisees=\([\s\S]*?\n\};/) || [""])[0]}
  ${(src.match(/const salaireMensualise=\([\s\S]*?\n\};/) || [""])[0]}
  return {semainesDuContrat, heuresMensualisees, salaireMensualise, estAnneeComplete};
})()`);

let koMens = 0;
const m = (n, r, a, tol = 0.011) => {
  const ok = Math.abs(r - a) <= tol;
  if (!ok) koMens++;
  console.log(`  ${ok ? "ok " : "KO "} ${n.padEnd(52)} ${r.toFixed(2)} (attendu ${a.toFixed(2)})`);
};

console.log("\n=== MENSUALISATION — CCN 3239 ===\n");
// Annee complete : 40 h x 52 / 12 = 173,33 -> 173 h ; x 4,20 = 728,00 EUR.
const complet = { heuresHebdo: 40, tauxHoraire: 4.20 };
m("année complète — semaines retenues", mens.semainesDuContrat(complet), 52, 0);
m("année complète — heures par mois", mens.heuresMensualisees(complet), 173, 0);
m("année complète — salaire mensualisé", mens.salaireMensualise(complet), 728.00);

// Annee scolaire : 40 h x 46 / 12 = 153,33 -> 153 h ; x 4,20 = 644,00 EUR.
const scolaire = { heuresHebdo: 40, tauxHoraire: 4.20, anneeComplete: false, semainesAccueil: 46 };
m("année incomplète 46 sem. — semaines", mens.semainesDuContrat(scolaire), 46, 0);
m("année incomplète 46 sem. — heures", mens.heuresMensualisees(scolaire), 153, 0);
m("année incomplète 46 sem. — salaire", mens.salaireMensualise(scolaire), 644.00);

// 36 semaines : le cas ou l'ecart est le plus fort.
const court = { heuresHebdo: 40, tauxHoraire: 4.20, anneeComplete: false, semainesAccueil: 36 };
m("année incomplète 36 sem. — salaire", mens.salaireMensualise(court), 504.00);
const ecart = mens.salaireMensualise(complet) / mens.salaireMensualise(court);
m("écart avec la formule des 52 semaines", ecart, 52 / 36, 0.001);

// Garde-fous : un contrat sans information reste en annee complete.
m("contrat sans mode — reste en année complète", mens.semainesDuContrat({ heuresHebdo: 40 }), 52, 0);
m("année incomplète sans nombre — plafond 46", mens.semainesDuContrat({ heuresHebdo: 40, anneeComplete: false }), 46, 0);
m("plus de 52 semaines — ramené à 52", mens.semainesDuContrat({ heuresHebdo: 40, anneeComplete: false, semainesAccueil: 60 }), 52, 0);
m("colonnes en base (annee_complete/semaines_accueil)", mens.semainesDuContrat({ heures_hebdo: 40, annee_complete: false, semaines_accueil: 40 }), 40, 0);
m("heures nulles", mens.salaireMensualise({ heuresHebdo: 0, tauxHoraire: 4.2 }), 0);

// --- Fin de contrat : preavis, conges payes, indemnite de rupture ---
const fn = (nom, motif) => {
  const m = src.match(motif);
  if (!m) { console.error(`\n  KO  ${nom} est introuvable dans src/App.jsx\n`); process.exit(1); }
  return m[0];
};
const finContrat = eval(`(function(){
  ${fn("preavisJours", /const preavisJours=\([\s\S]*?\n\};/)}
  ${fn("CP_PAR_MOIS", /const CP_PAR_MOIS=[\d.]+;/)}
  ${fn("CP_MAX_AN", /const CP_MAX_AN=\d+;/)}
  ${fn("congesAcquis", /const congesAcquis=\([\s\S]*?;\n/)}
  ${fn("TAUX_DIXIEME", /const TAUX_DIXIEME=[\d.]+;/)}
  ${fn("iccpCalcul", /const iccpCalcul=\(\{[\s\S]*?\n\};/)}
  ${fn("DIVISEUR_INDEMNITE_RUPTURE", /const DIVISEUR_INDEMNITE_RUPTURE=\d+;/)}
  ${fn("ANCIENNETE_MIN_RUPTURE_MOIS", /const ANCIENNETE_MIN_RUPTURE_MOIS=\d+;/)}
  ${fn("indemniteRupture", /const indemniteRupture=\(\{[\s\S]*?\n\};/)}
  return {preavisJours, congesAcquis, iccpCalcul, indemniteRupture};
})()`);

let koFin = 0;
const v = (n, r, a, tol = 0.011) => {
  const ok = typeof a === "string" ? r === a : Math.abs(r - a) <= tol;
  if (!ok) koFin++;
  console.log(`  ${ok ? "ok " : "KO "} ${n.padEnd(52)} ${typeof r === "number" ? r.toFixed(2) : r} (attendu ${typeof a === "number" ? a.toFixed(2) : a})`);
};

console.log("\n=== FIN DE CONTRAT — CCN 3239 ===\n");
console.log("  préavis, en jours calendaires");
v("moins de 3 mois d'ancienneté", finContrat.preavisJours(2), 8, 0);
v("2 mois et demi", finContrat.preavisJours(2.9), 8, 0);
v("pile 3 mois", finContrat.preavisJours(3), 15, 0);
v("11 mois", finContrat.preavisJours(11), 15, 0);
v("pile 1 an", finContrat.preavisJours(12), 30, 0);
v("5 ans", finContrat.preavisJours(60), 30, 0);

console.log("\n  congés payés acquis (2,5 j ouvrables par mois, plafond 30)");
v("4 mois travaillés", finContrat.congesAcquis(4), 10, 0);
v("12 mois travaillés", finContrat.congesAcquis(12), 30, 0);
v("18 mois : plafonné à 30", finContrat.congesAcquis(18), 30, 0);
v("aucun mois", finContrat.congesAcquis(0), 0, 0);

console.log("\n  indemnité compensatrice : la méthode la plus favorable");
// 10 mois à 700 EUR = 7 000 EUR de brut ; 25 j acquis, 5 pris, 26,92 EUR/jour.
const cpA = finContrat.iccpCalcul({ brutPeriode: 7000, joursAcquis: 25, joursPris: 5, salaireJournalier: 26.92 });
v("jours restants", cpA.restants, 20, 0);
v("règle du dixième", cpA.dixieme, 700);
v("maintien de salaire", cpA.maintien, 538.4);
v("montant retenu = le plus favorable", cpA.montant, 700);
v("méthode annoncée", cpA.methode, "dixième");
// Cas inverse : peu de brut, beaucoup de jours restants.
const cpB = finContrat.iccpCalcul({ brutPeriode: 2000, joursAcquis: 30, joursPris: 0, salaireJournalier: 40 });
v("le maintien l'emporte", cpB.montant, 1200);
v("méthode annoncée", cpB.methode, "maintien de salaire");
v("aucun jour restant", finContrat.iccpCalcul({ brutPeriode: 0, joursAcquis: 3, joursPris: 5, salaireJournalier: 30 }).restants, 0, 0);

console.log("\n  indemnité de rupture (1/80 du brut, dès 9 mois)");
v("12 mois, rupture par le parent", finContrat.indemniteRupture({ brutTotal: 8000, moisAnciennete: 12 }), 100);
v("pile 9 mois", finContrat.indemniteRupture({ brutTotal: 8000, moisAnciennete: 9 }), 100);
v("8 mois : pas due", finContrat.indemniteRupture({ brutTotal: 8000, moisAnciennete: 8 }), 0);
v("démission de l'assmat : pas due", finContrat.indemniteRupture({ brutTotal: 8000, moisAnciennete: 24, parEmployeur: false }), 0);
v("faute grave : pas due", finContrat.indemniteRupture({ brutTotal: 8000, moisAnciennete: 24, fauteGrave: true }), 0);

let ko = koAlloc + koMin + koFin + koMens;
console.log("\n=== RETENUE POUR ABSENCE — CCN 3239 art. 111 ===\n");
for (const c of cas) {
  const r = retenueAbsence(c.a);
  const ok = Math.abs(r - c.attendu) < 0.011;
  if (!ok) ko++;
  console.log(`  ${ok ? "ok " : "KO "} ${c.n.padEnd(48)} ${r.toFixed(2)} € (attendu ${c.attendu.toFixed(2)} €)`);
}
const total = cas.length + casAlloc.length + casMin.length + 1 + 21 + 13;
console.log(ko ? `\n${ko} cas en échec\n` : `\n${total} cas sur ${total} conformes\n`);
process.exit(ko ? 1 : 0);
