// LE PLANNING PERISCOLAIRE, ET LE CALENDRIER SUR LEQUEL IL REPOSE.
//
// Ce test existe parce que le defaut precedent n'etait pas une panne : les
// vacances scolaires et les jours feries etaient figes en 2024, et le
// calendrier a cesse de les afficher en silence pendant deux ans. Rien n'a
// plante, personne n'a ete prevenu. La barriere « peremption » ci-dessous est
// celle qui manquait.
import { readFileSync } from "node:fs";
import {
  ACADEMIES_PAR_ZONE, COUVERT_JUSQUAU, VACANCES, ZONES,
  anneeScolaireDe, estFerie, feriesDe, finVacances, paques, vacancesDe, vacancesAnnee,
} from "../data/calendrier-scolaire.js";

let ko = 0;
const ok = (cond, libelle, detail = "") => {
  console.log(`  ${cond ? "ok " : "KO "} ${libelle}${detail ? "  " + detail : ""}`);
  if (!cond) ko++;
};

console.log("\n— Les jours feries se calculent, donc ne se periment pas");
// Dates verifiees : Paques 2026 = 5 avril, 2027 = 28 mars, 2028 = 16 avril.
ok(paques(2026).toISOString().slice(0, 10) === "2026-04-05", "Pâques 2026 tombe le 5 avril");
ok(paques(2027).toISOString().slice(0, 10) === "2027-03-28", "Pâques 2027 tombe le 28 mars");
ok(paques(2028).toISOString().slice(0, 10) === "2028-04-16", "Pâques 2028 tombe le 16 avril");
ok(estFerie("2026-05-14")?.includes("Ascension"), "l'Ascension 2026 est le 14 mai");
ok(estFerie("2027-05-06")?.includes("Ascension"), "l'Ascension 2027 est le 6 mai");
ok(estFerie("2030-01-01") && estFerie("2030-12-25"), "les fériés existent encore en 2030");
ok(Object.keys(feriesDe(2027)).length === 11, "onze jours fériés par an", String(Object.keys(feriesDe(2027)).length));
ok(!estFerie("2026-09-30"), "un jour ordinaire n'est pas férié");

console.log("\n— Les vacances dependent de la zone, et la zone n'est plus ecrite en dur");
ok(vacancesDe("2027-02-25", "A")?.nom === "Hiver", "le 25 février 2027 est en vacances en zone A");
ok(vacancesDe("2027-02-25", "C") === null, "le même jour n'est PAS en vacances en zone C");
ok(vacancesDe("2027-04-28", "B")?.nom === "Printemps", "le 28 avril 2027 est en vacances en zone B");
ok(vacancesDe("2027-04-28", "A") === null, "le même jour n'est PAS en vacances en zone A");
ok(vacancesDe("2027-03-01", "A") === null, "le jour de la reprise n'est pas un jour de vacances");
ok(vacancesDe("2027-02-28", "A")?.nom === "Hiver", "la veille de la reprise l'est encore");
ok(finVacances({ reprise: "2026-11-02" }) === "2026-11-01", "le dernier jour est la veille de la reprise");

console.log("\n— Les trois zones existent, et chacune a ses academies");
for (const z of ZONES) ok((ACADEMIES_PAR_ZONE[z] || []).length > 0, `la zone ${z} nomme ses académies`);
for (const [annee, parZone] of Object.entries(VACANCES))
  for (const z of ZONES) ok((parZone[z] || []).length === 5, `${annee} zone ${z} : cinq périodes`);

console.log("\n— L'annee scolaire bascule en aout, pas en janvier");
ok(anneeScolaireDe("2026-09-30") === "2026-2027", "septembre 2026 est l'année 2026-2027");
ok(anneeScolaireDe("2027-05-01") === "2026-2027", "mai 2027 est encore l'année 2026-2027");
ok(anneeScolaireDe("2027-08-01") === "2027-2028", "août 2027 ouvre l'année suivante");

console.log("\n— PEREMPTION : la barriere qui manquait");
// Le defaut a dure deux ans parce que rien ne surveillait la fin des donnees.
// Six mois d'avance laissent le temps de recopier l'arrete suivant.
const dans6mois = new Date(Date.now() + 182 * 86400000).toISOString().slice(0, 10);
ok(COUVERT_JUSQUAU >= dans6mois,
  "le calendrier scolaire couvre encore au moins six mois",
  `couvert jusqu'au ${COUVERT_JUSQUAU}`);
if (COUVERT_JUSQUAU < dans6mois)
  console.log("        → recopier l'arrêté suivant depuis Légifrance dans data/calendrier-scolaire.js");
const aujourdhui = new Date().toISOString().slice(0, 10);
ok(vacancesAnnee(aujourdhui, "C").length === 5, "l'année scolaire en cours est couverte");

console.log("\n— Plus aucune liste figee dans le code");
for (const f of ["src/App.jsx", "src/socle.jsx", "src/ecrans-quotidien.jsx"]) {
  const t = readFileSync(new URL("../" + f, import.meta.url), "utf8");
  ok(!/FERIES_2024|VACANCES_2024/.test(t), `${f} n'utilise plus les listes de 2024`);
}
const cal = readFileSync(new URL("../src/ecrans-quotidien.jsx", import.meta.url), "utf8");
ok(!/Zone C["<]|- Zone C/.test(cal), "le calendrier n'annonce plus « Zone C » à tout le monde");

console.log("\n— L'ecran distingue une panne d'un planning vide");
const ecran = readFileSync(new URL("../src/ecrans-secondaires.jsx", import.meta.url), "utf8");
const corps = ecran.slice(ecran.indexOf("export function PlanningPeriscolaire"));
const fin = corps.indexOf("\n}\n");
const src = corps.slice(0, fin);
ok(/if\(error\)\{setEtat\("panne"\)/.test(src.replace(/\s+/g, "")) || /if\(error\)\s*\{\s*setEtat\("panne"\)/.test(src),
  "une lecture en échec affiche une panne, pas un planning vide");
ok(/planning_periscolaire["\s\S]{0,400}?upsert/.test(src), "les modifications sont enregistrées en base");
ok(/const\{error\}=await supabase\.from\("planning_periscolaire"\)\.upsert/.test(src.replace(/\s*\n\s*/g, "")),
  "l'écriture lit son erreur");
ok(!/useState\(\(\)=>\{[\s\S]{0,200}matin:\["Lundi"/.test(src), "plus de planning inventé en dur");

console.log(ko ? `\n${ko} problème(s)\n` : "\nTout est conforme.\n");
process.exit(ko ? 1 : 0);
