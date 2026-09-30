// LE MANDAT DE TIERCE DECLARATION, ET LE JOURNAL DES TRANSMISSIONS.
//
// Deux regles tiennent tout ce dispositif, et une seule les enfreint suffit a
// le rendre illegal ou trompeur :
//   1. SEUL LE PARENT MANDATE. C'est lui l'employeur (L.133-11 CSS).
//      L'assistante maternelle ne peut pas s'autoriser a declarer a sa place.
//   2. RIEN NE S'AFFICHE TANT QUE L'HABILITATION N'EST PAS OBTENUE. Un ecran
//      qui propose de mandater sans pouvoir transmettre promet ce que
//      l'application ne sait pas faire.
import { readFileSync } from "node:fs";
import {
  ETATS_TRANSMISSION, LIBELLE_ETAT_MANDAT, TEXTE_MANDAT, VERSION_MANDAT,
  etatMandat, habilitationActive, peutTransmettre,
} from "../data/pajemploi.js";

let ko = 0;
const ok = (cond, libelle, detail = "") => {
  console.log(`  ${cond ? "ok " : "KO "} ${libelle}${detail ? "  " + detail : ""}`);
  if (!cond) ko++;
};
const lire = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");

console.log("\n— L'habilitation commande tout");
ok(!habilitationActive({}), "sans configuration, pas d'habilitation");
ok(!habilitationActive({ pajemploi: { clientId: "   " } }), "un identifiant vide ne suffit pas");
ok(habilitationActive({ pajemploi: { clientId: "abc" } }), "un identifiant renseigné l'active");

const avec = { pajemploi: { clientId: "abc" } };
const mandatOk = { version_texte: VERSION_MANDAT };
ok(peutTransmettre({ config: {}, mandat: mandatOk }).raison === "pas_habilite",
  "sans habilitation, aucune transmission même avec mandat");
ok(peutTransmettre({ config: avec, mandat: null }).raison === "pas_de_mandat",
  "sans mandat, aucune transmission même habilitée");
ok(peutTransmettre({ config: avec, mandat: { ...mandatOk, revoque_le: "2026-01-01" } }).raison === "pas_de_mandat",
  "un mandat retiré ne vaut plus rien");
ok(peutTransmettre({ config: avec, mandat: mandatOk, moisDejaTransmis: true }).raison === "deja_transmis",
  "un mois déjà transmis ne repart pas");
ok(peutTransmettre({ config: avec, mandat: mandatOk }).ok === true, "mandat actif et habilitation : ça part");

console.log("\n— Le mandat est versionné");
ok(etatMandat({ version_texte: "2020-01-01" }) === "a_renouveler",
  "un mandat signé sur un texte plus ancien est à renouveler");
ok(etatMandat(null) === "absent" && etatMandat({ revoque_le: "x" }) === "revoque",
  "absent et retiré se distinguent");
ok(Object.keys(LIBELLE_ETAT_MANDAT).length === 4, "chaque état a son libellé");

console.log("\n— Le texte du mandat dit aussi ce qu'il N'autorise PAS");
ok(TEXTE_MANDAT.exclusions.length >= 3, "les exclusions sont écrites");
ok(TEXTE_MANDAT.points.some((p) => /retirer ce mandat à tout moment/i.test(p)),
  "le droit de retrait figure dans le texte accepté");
ok(TEXTE_MANDAT.points.some((p) => /restez l'employeur/i.test(p)),
  "le texte rappelle que le parent reste l'employeur");

console.log("\n— Chaque état de transmission dit si la déclaration est PARTIE");
for (const [cle, e] of Object.entries(ETATS_TRANSMISSION)) {
  ok(typeof e.libelle === "string" && e.explication && e.action, `${cle} : libellé, explication et action`);
}
ok(ETATS_TRANSMISSION.erreur.partie === false,
  "« erreur » dit clairement que RIEN n'est parti");
ok(ETATS_TRANSMISSION.refusee.partie === true,
  "« refusée » dit que c'est bien arrivé, mais refusé");
ok(/ne renvoyez pas/i.test(ETATS_TRANSMISSION.en_attente.action),
  "en attente, on dit de NE PAS renvoyer — déclarer deux fois coûte cher");
ok(/pajemploi\.urssaf\.fr/i.test(ETATS_TRANSMISSION.erreur.action),
  "en cas d'échec, on donne la sortie de secours pour ne pas dépasser la date limite");

console.log("\n— Seul le parent mandate, et l'écran le dit comme la base");
{
  const src = lire("src/ecrans-secondaires.jsx");
  const i = src.indexOf("export function MandatPajemploi");
  const corps = src.slice(i, src.indexOf("\n}\n", i)).replace(/\s*\n\s*/g, " ");
  ok(/role==="parent"&&<div className="card"/.test(corps) || /\{role==="parent"&&/.test(corps),
    "les boutons donner/retirer sont réservés au parent");
  ok(/parent_id:user\.id/.test(corps), "le mandat est enregistré au nom du parent connecté");
  ok(/revoque_le:new Date\(\)/.test(corps), "le retrait date la ligne au lieu de la supprimer");
  ok(!/\.delete\(\)/.test(corps), "aucune suppression : un mandat est une preuve");
  ok(/disabled=\{!lu\}/.test(corps), "on ne peut pas mandater sans avoir coché avoir lu");
  ok(/etat==="panne"/.test(corps), "une lecture en échec affiche une panne, pas « aucun mandat »");
}

console.log("\n— Rien ne s'affiche tant que l'habilitation n'est pas obtenue");
{
  const app = lire("src/App.jsx");
  ok(/habilitationActive\(G\.config\)/.test(app), "le menu interroge l'habilitation");
  ok(/sub\.id!=="mandat_pajemploi"/.test(app), "l'entrée est retirée du menu sans habilitation");
  ok(app.includes('case "mandat_pajemploi"'), "l'écran reste routé — pour le jour où ça bascule");
}

console.log("\n— Le secret URSSAF ne quitte jamais le serveur");
{
  const lib = lire("lib/pajemploi-transmission.js");
  ok(/process\.env\.PAJEMPLOI_CLIENT_SECRET/.test(lib), "le secret est lu côté serveur");
  for (const f of ["src/App.jsx", "src/ecrans-secondaires.jsx", "data/pajemploi.js"])
    ok(!/PAJEMPLOI_CLIENT_SECRET/.test(lire(f)), `${f} n'a aucune trace du secret`);
  ok(/auth\.getUser\(\)/.test(lib), "le demandeur est lu depuis SON jeton, pas depuis le corps de la requête");
  ok(/insert\(\{ enfant_id, mois, mandat_id: mandat\.id, statut: "en_attente" \}\)/.test(lib),
    "le journal s'ouvre AVANT l'envoi — sinon une déclaration partie ne laisserait aucune trace");
  ok(/statut: "erreur"/.test(lib), "un envoi qui n'aboutit pas est marqué « erreur », pas « refusée »");
  ok(/spec_absente/.test(lib), "l'intégration refuse proprement là où la spécification manque");
  ok(!/https:\/\/[a-z.]*urssaf[a-z.]*\/[a-z]/i.test(lib.replace(/\/\/[^\n]*/g, "")),
    "aucune adresse d'API inventée");
}

console.log("\n— Le plan Hobby n'accepte que douze fonctions");
{
  const { readdirSync } = await import("node:fs");
  const fichiers = readdirSync(new URL("../api/", import.meta.url)).filter((f) => f.endsWith(".js") && !f.startsWith("_"));
  const node = fichiers.filter((f) => !/runtime:\s*'edge'/.test(lire("api/" + f)));
  ok(node.length <= 12, "douze fonctions serverless au maximum", `${node.length} actuellement`);
}

console.log(ko ? `\n${ko} problème(s)\n` : "\nTout est conforme.\n");
process.exit(ko ? 1 : 0);
