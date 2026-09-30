// UNE PANNE DE LECTURE NE DOIT PAS RESSEMBLER À UNE FIN D'ABONNEMENT.
//
// Le profil porte le rôle et l'abonnement. Quand sa lecture échouait, « data »
// valait null, le code partait dans la branche « else », marquait le
// chargement TERMINÉ et ne réessayait jamais. estPro() lit
// u.subscription_status — absent — donc une abonnée Pro se retrouvait derrière
// les murs du forfait gratuit pendant toute sa session, comme si elle avait
// cessé de payer.
//
// POURQUOI UN TEST SUR LA SOURCE ET NON AU NAVIGATEUR. Je n'ai pas réussi à
// faire aboutir une vraie connexion Supabase dans la construction locale : le
// client retombe en mode démonstration et n'appelle jamais « profiles ». Ce
// contrôle est donc plus faible qu'un parcours réel, et je le dis. Il verrouille
// malgré tout les quatre décisions qui comptent.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

let ko = 0;
const verifie = (nom, condition) => {
  console.log(`  ${condition ? "ok " : "ÉCHEC"}  ${nom}`);
  if (!condition) ko++;
};

console.log("\n=== L'ERREUR EST REGARDÉE ===");
verifie("la lecture du profil récupère « error »",
  /let\s*\{\s*data:\s*profil\s*,\s*error:\s*eProfil\s*\}\s*=\s*await supabase\.from\("profiles"\)/.test(src));

console.log("\n=== UNE PANNE PASSAGÈRE NE COÛTE PAS LA SESSION ===");
verifie("une seconde tentative a lieu après un délai",
  /if\(eProfil\)\{[\s\S]{0,200}setTimeout[\s\S]{0,300}await supabase\.from\("profiles"\)/.test(src));

console.log("\n=== APRÈS DEUX ÉCHECS, ON NE FAIT PAS SEMBLANT ===");
verifie("le compte est marqué en panne",
  /_profilePanne:\s*true/.test(src));
verifie("le profil n'est PAS confirmé dans ce cas",
  !/_profilePanne:\s*true[^}]*_profileConfirmed:\s*true/.test(src));
verifie("la panne est effacée quand la lecture réussit enfin",
  /_profileConfirmed:true,_profilePanne:false/.test(src));

console.log("\n=== L'ÉCRAN LE DIT, AU LIEU DE MONTRER UN MUR DE PAIEMENT ===");
verifie("un écran dédié existe", /_profilePanne\)\s*\n?\s*return/.test(src));
verifie("il dit que ce n'est pas l'abonnement", /pas un problème d'abonnement/.test(src));
verifie("il propose de réessayer", /window\.location\.reload\(\)/.test(src));

// L'ordre compte : si cet écran arrivait APRÈS le routeur, l'utilisatrice
// verrait d'abord les murs du forfait — exactement ce qu'on répare.
const iPanne = src.indexOf("_profilePanne)");
const iRole = src.indexOf("  const role=user.role;");
verifie("il s'affiche AVANT que le routeur ne décide quoi que ce soit",
  iPanne > 0 && iRole > 0 && iPanne < iRole);

console.log("\n=== CE QUI DÉPEND DE CE PROFIL ===");
verifie("estPro lit bien subscription_status (d'où le coût d'un profil manquant)",
  /estPro\s*=\s*\(u\)\s*=>[\s\S]{0,200}subscription_status/.test(src));

console.log(ko ? `\n${ko} vérification(s) en échec.\n` : "\nTout est conforme.\n");
process.exit(ko ? 1 : 0);
