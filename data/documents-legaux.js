// LA DATE DE MISE A JOUR DES DOCUMENTS LEGAUX.
//
// Les trois documents (mentions legales, CGU, politique de confidentialite)
// affichaient « Dernière mise à jour : <mois en cours> », calcule avec
// new Date(). Autrement dit : ils se declaraient mis a jour tous les jours,
// sans que rien ne change. Une date qui bouge toute seule ne dit plus rien —
// et c'est precisement ce qu'un utilisateur regarde pour savoir si le contrat
// qu'il a accepte a ete modifie depuis.
//
// La date est donc ecrite ici, a la main. Et pour qu'elle ne mente pas dans
// l'autre sens — un texte modifie sans que la date bouge — une barriere
// d'audit compare le texte legal a son empreinte : toute modification du
// texte fait echouer la construction tant que la date et l'empreinte n'ont
// pas ete mises a jour ensemble.
export const MAJ_DOCUMENTS_LEGAUX = "2026-10-01";

// Empreinte du texte lisible des trois documents. Se regenere avec :
//   node scripts/empreinte-legale.mjs --ecrire
export const EMPREINTE_DOCUMENTS_LEGAUX = "a73577b6ec15c4ab210230c82b279bde";

export const majLisible = () => {
  const [a, m, j] = MAJ_DOCUMENTS_LEGAUX.split("-");
  const mois = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"][Number(m) - 1];
  return `${Number(j)} ${mois} ${a}`;
};
