// LE RAPPEL DE POINTAGE NON VALIDÉ.
//
// Le courriel envoyé au parent se terminait par : « Si vous oubliez, un rappel
// automatique sera envoyé sous 3 jours. » Le gabarit existait, la colonne
// rappel_envoye_at existait — et rien ne l'envoyait. Ce test garde la promesse
// une fois tenue.
//
// Ce qui est vérifié a été choisi pour ce qui COÛTE si ça casse : un parent
// qui reçoit le même rappel tous les jours, ou des centaines de courriels
// d'un coup au premier passage.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../api/cron-essais.js", import.meta.url), "utf8");

let ko = 0;
const verifie = (nom, condition) => {
  console.log(`  ${condition ? "ok " : "ÉCHEC"}  ${nom}`);
  if (!condition) ko++;
};

console.log("\n=== LE RAPPEL PART VRAIMENT ===");
verifie("le gabarit pointage_rappel est appelé", /type:\s*'pointage_rappel'/.test(src));
verifie("il passe par /api/send-email, pas par un second jeu de HTML",
  /rappelerPointage[\s\S]{0,400}\/api\/send-email/.test(src));

console.log("\n=== UN SEUL RAPPEL, JAMAIS DEUX ===");
verifie("la requête écarte les pointages déjà rappelés",
  /\.is\('rappel_envoye_at',\s*null\)/.test(src));
verifie("elle ne prend que ceux non validés",
  /\.eq\('valide_parent',\s*false\)/.test(src));
verifie("rappel_envoye_at est marqué après l'envoi",
  /await rappelerPointage[\s\S]{0,400}update\(\{\s*rappel_envoye_at/.test(src));

console.log("\n=== LE PREMIER PASSAGE N'INONDE PERSONNE ===");
verifie("une borne basse existe (on ne remonte pas à l'origine des temps)",
  /JOURS_MAX_REMONTEE/.test(src) && /\.gte\('created_at'/.test(src));
verifie("la remontée est plafonnée à 30 jours", /JOURS_MAX_REMONTEE\s*=\s*30/.test(src));
verifie("le délai avant rappel est de 3 jours, comme annoncé au parent",
  /JOURS_AVANT_RAPPEL\s*=\s*3/.test(src));
verifie("le nombre de lignes traitées par passage est borné", /\.limit\(200\)/.test(src));

console.log("\n=== LA PROMESSE FAITE AU PARENT EST LA MÊME ===");
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const promesse = /rappel automatique sera envoye sous (\d+) jours/.exec(app);
verifie("le courriel annonce bien un délai", !!promesse);
verifie("et ce délai est celui que la tâche applique",
  !!promesse && promesse[1] === (/JOURS_AVANT_RAPPEL\s*=\s*(\d+)/.exec(src) || [])[1]);

console.log("\n=== LE PARENT EST CHERCHÉ AU BON ENDROIT ===");
// « enfants » ne porte ni parent_email ni parent_prenom : le parent est une
// ligne de « profiles » atteinte par enfants.parent_id. Une première version
// lisait des colonnes qui n'existent pas — la tâche aurait tourné à vide.
verifie("on lit enfants.parent_id", /enfants\(prenom,\s*parent_id\)/.test(src));
verifie("et on résout le parent dans profiles",
  /from\('profiles'\)\.select\('id, email, prenom'\)\.in\('id'/.test(src));
verifie("aucune colonne parent_email n'est lue sur enfants",
  !/enfants\([^)]*parent_email/.test(src));
verifie("les parents sont chargés en une seule requête, pas une par pointage",
  /\.in\('id',\s*idsParents\)/.test(src));

console.log("\n=== UNE PANNE NE FAIT PAS TOMBER LE RESTE ===");
verifie("chaque passe a son propre try, dans les deux sens",
  /---- LES ESSAIS[\s\S]{0,400}try\s*\{/.test(src) &&
  /---- LES POINTAGES[\s\S]{0,400}try\s*\{/.test(src));
verifie("un pointage sans parent invité n'est pas une erreur",
  /if \(!parent \|\| !parent\.email\) continue;/.test(src));
verifie("« simulation=1 » n'envoie rien", /if \(simulation\) continue;[\s\S]{0,300}rappelerPointage/.test(src));

console.log(ko ? `\n${ko} vérification(s) en échec.\n` : "\nTout est conforme.\n");
process.exit(ko ? 1 : 0);
