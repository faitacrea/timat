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
import { differencesDemande, resumeDemande } from "../data/planning-periscolaire.js";

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


console.log("\n— La confirmation : le parent demande, l'assistante maternelle decide");
{
  const sem = { matin: ["Lundi"], midi: [], soir: ["Lundi", "Mardi"], mercredi: false };
  const vac = { "2026-2027|Noël": false };

  // Le resume doit nommer CE QUI change. Un bouton « Accepter » sur « le parent
  // demande une modification » se presse a l'aveugle, et ce sont des heures de
  // travail.
  const d = { semaine: { matin: ["Lundi", "Jeudi"], midi: [], soir: ["Lundi"], mercredi: true }, vacances: { "2026-2027|Noël": true } };
  const r = resumeDemande(d, sem, vac);
  ok(/matin ajouté le jeudi/i.test(r), "le résumé nomme le jour ajouté", r);
  ok(/soir retiré le mardi/i.test(r), "le résumé nomme le jour retiré");
  ok(/mercredi en journée ajouté/i.test(r), "le résumé signale le mercredi");
  ok(/vacances de Noël/i.test(r), "le résumé signale le changement de vacances");
  ok(differencesDemande(d, sem, vac).length === 4, "quatre changements, pas un de plus", String(differencesDemande(d, sem, vac).length));

  // Une demande identique ne doit pas se resumer en une liste vide qui ferait
  // croire a un changement invisible.
  ok(/sans le changer/.test(resumeDemande({ semaine: sem, vacances: vac }, sem, vac)),
    "une demande sans changement le dit franchement");

  // Une premiere reponse de vacances part de « pas encore repondu ».
  ok(/vacances d'été/.test(resumeDemande({ semaine: sem, vacances: { "2026-2027|Été": true } }, sem, {})),
    "répondre pour la première fois compte comme un changement");

  // Les elisions : « vacances de Été » ou « de Hiver » se lisent mal.
  const el = (n) => resumeDemande({ semaine: {}, vacances: { ["2026-2027|" + n]: true } }, {}, {});
  ok(/vacances d'été/.test(el("Été")), "« vacances d'été », pas « de Été »");
  ok(/vacances d'hiver/.test(el("Hiver")), "« vacances d'hiver », pas « de Hiver »");
  ok(/vacances de la Toussaint/.test(el("Toussaint")), "« vacances de la Toussaint »");
}

console.log("\n— Le planning confirme est le seul qui fasse foi");
{
  const ecranSrc = readFileSync(new URL("../src/ecrans-secondaires.jsx", import.meta.url), "utf8");
  const dep = ecranSrc.slice(ecranSrc.indexOf("export function PlanningPeriscolaire"));
  const src = dep.slice(0, dep.indexOf("\n}\n")).replace(/\s*\n\s*/g, " ");
  ok(/if\(role==="parent"\)\{.{0,600}?demande:\{/.test(src),
    "une modification du parent devient une demande, pas le planning");
  ok(/semaine:sem,vacances:vac,demande:\{/.test(src),
    "le planning confirmé ne bouge pas quand le parent demande");
  ok(/repondreDemande=async\(accepte\)/.test(src) && /demande:null/.test(src),
    "l'assistante maternelle peut accepter ou refuser");
  ok(/createNotification\(\{ userId:enfant\.asmat_id/.test(src), "l'assistante maternelle est prévenue de la demande");
  ok(/createNotification\(\{ userId:enfant\.parent_id/.test(src), "le parent est prévenu de la réponse");

  // Le calendrier ne doit JAMAIS afficher une demande non confirmee : ce serait
  // promettre un accueil que personne n'a accepte.
  const cal = readFileSync(new URL("../src/ecrans-quotidien.jsx", import.meta.url), "utf8");
  ok(!/plannings\[[^\]]*\]\?\.demande/.test(cal) && !/\.demande\b/.test(cal),
    "le calendrier n'affiche jamais une demande en attente");
  ok(/select\("enfant_id,semaine,vacances,zone"\)/.test(cal),
    "le calendrier ne lit même pas la colonne des demandes");
}

console.log(ko ? `\n${ko} problème(s)\n` : "\nTout est conforme.\n");
process.exit(ko ? 1 : 0);
