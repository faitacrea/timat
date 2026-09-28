// LA PURGE DES DURÉES DE CONSERVATION.
//
// La politique de confidentialité annonçait des durées que rien n'appliquait.
// Une durée annoncée et non tenue est pire qu'une durée non annoncée : c'est
// la ligne même qu'un contrôle reprendrait.
//
// Ce test garde deux choses, et la seconde compte plus que la première :
//   1. que la purge fasse ce qu'elle dit ;
//   2. qu'elle ne touche JAMAIS aux données professionnelles. Un pointage
//      efface, c'est la preuve d'heures travaillées qui disparaît.
import { readFileSync } from "node:fs";

const cron = readFileSync(new URL("../api/cron-essais.js", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

let ko = 0;
const verifie = (nom, condition) => {
  console.log(`  ${condition ? "ok " : "ÉCHEC"}  ${nom}`);
  if (!condition) ko++;
};

// Les durées déclarées dans le code, lues depuis le code lui-même.
const durees = new Map();
for (const m of cron.matchAll(/\{\s*table:\s*'([a-z_]+)',\s*colonne:\s*'[a-z_]+',\s*mois:\s*(\d+)\s*\}/g)) {
  durees.set(m[1], Number(m[2]));
}

console.log("\n=== LA PURGE EXISTE ET DIT CE QU'ELLE FAIT ===");
verifie("des durées sont déclarées", durees.size >= 5);
verifie("chaque suppression renvoie les lignes effacées (sinon on journalise 0 à l'aveugle)",
  /\.delete\(\)\.lt\(p\.colonne, limite\)\.select\('id'\)/.test(cron));
verifie("« simulation=1 » compte sans rien effacer",
  /if \(simulation\) \{[\s\S]{0,300}head: true[\s\S]{0,200}continue;/.test(cron));
verifie("une purge en échec n'empêche pas les autres",
  /for \(const p of PURGES\)[\s\S]{0,100}try \{/.test(cron));

console.log("\n=== LES DURÉES DU CODE SONT CELLES DE LA POLITIQUE ===");
// Si l'une bouge sans l'autre, la construction tombe. C'est tout l'intérêt.
verifie("journaux de connexion : 12 mois", durees.get("audit_log") === 12
  && /Journaux de connexion\s*:?<\/strong>\s*12 mois/.test(app));
verifie("messages de support : 2 ans", durees.get("support_messages") === 24
  && /Messages de support\s*:?<\/strong>\s*2 ans/.test(app));
verifie("prospection : 3 ans", durees.get("prospects") === 36
  && /Prospection\s*:?<\/strong>\s*3 ans/.test(app));

console.log("\n=== LES COLONNES DE PURGE EXISTENT VRAIMENT ===");
// « borne_tentatives.created_at » n'existe pas : cette table porte
// « dernier_echec ». Ecrit a l'aveugle, ce nom aurait fait echouer la purge
// tous les jours, en silence, dans un journal que personne ne lit. C'est la
// base reelle qui l'a trouve, pas ce test — d'ou ce controle.
const schema = JSON.parse(readFileSync(new URL("../data/schema-supabase.json", import.meta.url), "utf8"));
for (const m of cron.matchAll(/\{\s*table:\s*'([a-z_]+)',\s*colonne:\s*'([a-z_]+)'/g)) {
  const [, table, colonne] = m;
  verifie(`« ${table} » est déclarée dans le schéma`, Array.isArray(schema[table]));
  verifie(`« ${table}.${colonne} » existe`, (schema[table] || []).includes(colonne));
}
for (const col of ["derniere_connexion_at", "inactivite_avertie_at"]) {
  verifie(`« profiles.${col} » existe`, (schema.profiles || []).includes(col));
}

console.log("\n=== CE QUI NE DOIT JAMAIS ÊTRE PURGÉ ===");
// La liste des tables qui portent des justificatifs. Si l'une d'elles entre
// un jour dans PURGES, c'est la preuve de quelqu'un qui disparaît.
const INTOUCHABLES = ["enfants", "pointages", "contrats", "bulletins", "medicaments",
  "autorisations", "versements", "historique_mois", "paiements", "consentements",
  "transmissions", "documents_meta", "achats_boutique", "demandes"];
for (const t of INTOUCHABLES) {
  verifie(`« ${t} » n'est pas dans la liste des purges`, !durees.has(t));
}

console.log("\n=== UN COMPTE N'EST JAMAIS SUPPRIMÉ AUTOMATIQUEMENT ===");
verifie("aucune suppression sur profiles", !/from\('profiles'\)\s*\.delete\(\)/.test(cron));
verifie("aucune suppression sur un compte d'authentification", !/auth\.admin\.deleteUser/.test(cron));
verifie("l'inactivité ne fait qu'avertir",
  /COMPTES INACTIFS[\s\S]{0,2500}inactivite_avertissement/.test(cron));
verifie("on n'avertit qu'une fois", /\.is\('inactivite_avertie_at', null\)/.test(cron));
verifie("l'avertissement est marqué en base après l'envoi",
  /inactivite_avertissement[\s\S]{0,500}update\(\{ inactivite_avertie_at/.test(cron));
verifie("le nombre d'avertissements par passage est borné",
  /derniere_connexion_at[\s\S]{0,120}\.limit\(50\)/.test(cron));

console.log("\n=== LA POLITIQUE NE PROMET PLUS DE SUPPRESSION AUTOMATIQUE ===");
// Ces phrases affirmaient une suppression 30 jours après la fin de
// l'abonnement. TiMat a une formule GRATUITE permanente : le compte continue.
// Appliquées à la lettre, elles auraient détruit le dossier d'utilisatrices
// actives — celles que cron-essais remet en gratuit en disant, dans son propre
// code, « RIEN N'EST SUPPRIMÉ ».
verifie("plus de « les données sont supprimées » après résiliation",
  !/sans choix exprimé de votre part, les données sont supprimées/.test(app));
verifie("plus de « supprimées définitivement » dans les CGU",
  !/Passé ce délai, elles sont supprimées définitivement/.test(app));
verifie("la politique dit que rien n'est supprimé d'office",
  /ne sont jamais supprimées d'office/.test(app));

console.log(ko ? `\n${ko} vérification(s) en échec.\n` : "\nTout est conforme.\n");
process.exit(ko ? 1 : 0);
