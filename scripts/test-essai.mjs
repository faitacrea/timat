/**
 * L'essai de deux mois, sans carte bancaire.
 *
 * Ce test vérifie la SEULE chose qui décide de l'accès : estPro(). La version
 * d'avant acceptait « trialing » sans rien regarder d'autre, donc l'essai ne
 * finissait jamais. Un test qui ne regarderait que le jour de l'inscription ne
 * l'aurait pas vu — il faut faire avancer l'horloge.
 */
import { readFileSync } from "node:fs";

// On charge les fonctions depuis la source, sans démarrer React : elles sont
// écrites en un seul bloc et n'ont aucune dépendance.
const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const debut = src.indexOf("export const DUREE_ESSAI_JOURS");
const fin = src.indexOf("\nconst peutAjouterEnfant");
const bloc = src.slice(debut, fin).replace(/export const/g, "const");
const { DUREE_ESSAI_JOURS, abonnementInitial, joursRestantsEssai, essaiExpire, estPro } =
  await import("data:text/javascript," + encodeURIComponent(
    bloc + "\nexport { DUREE_ESSAI_JOURS, abonnementInitial, joursRestantsEssai, essaiExpire, estPro };"));

let ko = 0;
const ok = (cond, quoi) => { console.log((cond ? "  ok  " : "  ÉCHEC ") + quoi); if (!cond) ko++; };
const ilYA = (j) => new Date(Date.now() - j * 86400000);
const compte = (creeIlYA, role = "asmat") => {
  const a = abonnementInitial(role);
  // On recule la date de fin d'autant de jours que le compte est vieux.
  if (a.subscription_end_date) {
    a.subscription_end_date = new Date(
      new Date(a.subscription_end_date).getTime() - creeIlYA * 86400000).toISOString();
  }
  return { role, ...a };
};

console.log("\n=== L'ESSAI COMMENCE À L'INSCRIPTION, SANS CARTE ===\n");
const neuf = compte(0);
ok(neuf.subscription_status === "trialing", "une assistante maternelle qui s'inscrit est en essai, pas en gratuit");
ok(!!neuf.subscription_end_date, "et son essai a une date de fin");
ok(DUREE_ESSAI_JOURS === 60, "l'essai dure bien 60 jours");
ok(estPro(neuf), "elle a accès aux fonctions Pro dès le premier jour");

const parent = compte(0, "parent");
ok(parent.subscription_status === "free", "un parent n'a pas d'essai à user : son espace est gratuit");
ok(parent.subscription_end_date === null, "et donc aucune date de fin");
ok(estPro(parent), "il a malgré tout accès à son espace");

console.log("\n=== ET IL FINIT, MÊME SI PERSONNE N'OUVRE L'APPLICATION ===\n");
ok(estPro(compte(30)), "à 30 jours, l'accès Pro tient encore");
ok(joursRestantsEssai(compte(53)) === 7, "à 53 jours, il reste 7 jours — le premier rappel");
ok(joursRestantsEssai(compte(57)) === 3, "à 57 jours, il reste 3 jours — le second rappel");
ok(estPro(compte(59)), "la veille de la fin, l'accès tient");
ok(!estPro(compte(61)), "le lendemain de la fin, l'accès Pro est fermé");
ok(essaiExpire(compte(61)), "et l'essai est déclaré expiré");
ok(!estPro(compte(400)), "un compte oublié un an ne redevient pas Pro tout seul");

console.log("\n=== CE QU'ON NE DOIT SURTOUT PAS CASSER ===\n");
// Couper l'accès à quelqu'un par défaut de donnée serait la pire des deux
// erreurs : les comptes « trialing » d'avant ce changement n'ont pas de date.
ok(estPro({ role: "asmat", subscription_status: "trialing", subscription_end_date: null }),
   "un essai hérité, sans date de fin, garde son accès au lieu d'être coupé");
ok(joursRestantsEssai({ subscription_status: "trialing", subscription_end_date: "pas une date" }) === null,
   "une date illisible ne fait expirer personne");
ok(estPro({ role: "asmat", subscription_status: "pro", subscription_end_date: ilYA(400).toISOString() }),
   "une abonnée payante n'est jamais expirée par la règle de l'essai");
ok(!estPro({ role: "asmat", subscription_status: "free" }),
   "un compte gratuit n'a pas l'accès Pro");
ok(!estPro(null) && !estPro(undefined), "aucun utilisateur ne donne aucun accès");

console.log(ko ? `\n${ko} test(s) en échec.\n` : "\nTout est conforme.\n");
process.exit(ko ? 1 : 0);
