// ENTRER DANS LA BORNE SANS POUVOIR EN SORTIR.
//
// Le mode borne transforme le téléphone ou la tablette en pointeuse : on le
// laisse dans l'entrée, les parents y tapent leur code, et on en sort avec un
// code de sortie à soi.
//
// Ce code de sortie est gardé par borneOuvrir(), qui avalait son échec. Or
// tenterSortie() compare le code tapé à ce qui a été gardé : si rien ne l'a
// été, borneCodeSortie() rend la chaîne vide, et le bon code est refusé —
// « Code de sortie incorrect », indéfiniment. La borne est ouverte, et il faut
// effacer les données du site pour en sortir.
//
// Le stockage plein suffit à déclencher cela, et cette application garde des
// photos, des documents et des copies hors ligne.
//
// Ce contrôle extrait les trois fonctions de src/socle.jsx au lieu de les
// recopier, comme les autres : il n'en existe qu'un exemplaire, et c'est celui
// de l'application.
//
//   node scripts/test-borne-sortie.mjs
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/socle.jsx", import.meta.url), "utf8");
const morceaux = ["borneCodeSortie", "borneOuvrir", "borneFermer"].map((nom) => {
  const i = src.indexOf("export const " + nom + "=");
  if (i < 0) throw new Error("Introuvable dans socle.jsx : " + nom);
  const fin = src.indexOf("\n", src.indexOf("};", i));
  return src.slice(i, fin).replace(/^export /, "");
});

let ko = 0;
const verifie = (nom, obtenu, attendu) => {
  const bon = JSON.stringify(obtenu) === JSON.stringify(attendu);
  if (!bon) ko++;
  console.log(`  ${bon ? "ok" : "KO"}  ${nom}` + (bon ? "" : `\n        obtenu ${JSON.stringify(obtenu)}, attendu ${JSON.stringify(attendu)}`));
};

// Le stockage, sous contrôle, et capable de refuser comme un vrai téléphone.
let plein = false;
const memoire = new Map();
const localStorage = {
  getItem: (k) => (memoire.has(k) ? memoire.get(k) : null),
  setItem: (k, v) => {
    if (plein) { const e = new Error("QuotaExceededError"); e.name = "QuotaExceededError"; throw e; }
    memoire.set(k, String(v));
  },
  removeItem: (k) => memoire.delete(k),
};
const BORNE_CLE_SORTIE = "timat:borne:sortie";
const BORNE_CLE_ACTIVE = "timat:borne:active";

const M = new Function("localStorage", "BORNE_CLE_SORTIE", "BORNE_CLE_ACTIVE",
  morceaux.join("\n") + "\nreturn {borneCodeSortie,borneOuvrir,borneFermer};")(localStorage, BORNE_CLE_SORTIE, BORNE_CLE_ACTIVE);

// La règle de sortie, telle que l'écran l'applique (ecrans-quotidien.jsx) :
// le code tapé doit égaler le code gardé.
const sortiePossible = (codeTape) => codeTape === M.borneCodeSortie();

console.log("\n=== LA BORNE — peut-on toujours en sortir ? ===\n");

// 1. Le cas normal.
memoire.clear(); plein = false;
verifie("stockage normal : la borne s'ouvre", M.borneOuvrir("4731"), true);
verifie("stockage normal : le code de sortie est gardé", M.borneCodeSortie(), "4731");
verifie("stockage normal : le bon code fait sortir", sortiePossible("4731"), true);
verifie("stockage normal : un mauvais code ne fait pas sortir", sortiePossible("0000"), false);
verifie("stockage normal : la borne est marquée active", localStorage.getItem(BORNE_CLE_ACTIVE), "1");

// 2. LE PIÈGE : le stockage refuse.
//
// borneOuvrir DOIT le dire. C'est tout ce qui sépare « la borne ne s'ouvre
// pas » de « la borne s'ouvre et on ne peut plus en sortir ».
memoire.clear(); plein = true;
verifie("stockage plein : borneOuvrir rend false", M.borneOuvrir("4731"), false);
verifie("stockage plein : rien n'a été gardé", M.borneCodeSortie(), "");
verifie("stockage plein : la borne n'est pas marquée active", localStorage.getItem(BORNE_CLE_ACTIVE), null);
// Et la démonstration du piège : SI on était entré malgré tout, le bon code
// serait refusé. C'est pour cela que l'écran refuse d'entrer.
verifie("stockage plein : le bon code serait refusé — d'où le refus d'entrer", sortiePossible("4731"), false);

// 3. La place revient : tout remarche.
plein = false;
verifie("place revenue : la borne s'ouvre", M.borneOuvrir("4731"), true);
verifie("place revenue : le bon code fait sortir", sortiePossible("4731"), true);

// 4. Fermer la borne la démarque, et ne perd pas le code.
M.borneFermer();
verifie("fermeture : la borne n'est plus active", localStorage.getItem(BORNE_CLE_ACTIVE), null);

// 5. L'ÉCRAN REFUSE D'ENTRER quand le code n'a pas pu être gardé.
//    On le lit dans le code de l'écran : c'est là que la décision se prend.
{
  const ecran = readFileSync(new URL("../src/ecrans-quotidien.jsx", import.meta.url), "utf8");
  verifie("l'écran teste le retour de borneOuvrir avant d'entrer",
    /if\s*\(\s*!\s*borneOuvrir\s*\([^)]*\)\s*\)/.test(ecran), true);
  verifie("et il dit pourquoi, en parlant de la sortie",
    /n'auriez|ne pourriez plus en sortir|code de sortie n'a pas pu/i.test(ecran), true);
}

console.log(ko ? `\n${ko} anomalie(s)\n` : "\nOn peut toujours sortir de la borne, ou bien on n'y entre pas.\n");
process.exit(ko ? 1 : 0);
