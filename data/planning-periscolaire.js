// CE QUI CHANGE DANS UNE DEMANDE DE PLANNING.
//
// Une confirmation qui dit seulement « le parent demande une modification »
// n'est pas une confirmation : c'est un bouton qu'on presse sans savoir. Ces
// heures sont un salaire — l'assistante maternelle doit lire exactement ce
// qu'elle accepte.
//
// Cette fonction est volontairement hors de l'ecran : elle est pure, donc
// elle se teste, et c'est la seule facon de garantir qu'elle ne dira jamais
// « rien ne change » sur une demande qui change quelque chose.

const MOMENTS = { matin: "matin", midi: "méridien", soir: "soir" };
const JOURS_COURTS = { Lundi: "lundi", Mardi: "mardi", Mercredi: "mercredi", Jeudi: "jeudi", Vendredi: "vendredi" };

// « vacances de Été », « vacances de Hiver », « vacances de Toussaint » : les
// trois se lisent mal, et pour trois raisons differentes (elision, h muet,
// article). Les cinq periodes sont connues et ne changent pas : on les ecrit,
// plutot que de deviner avec une regle qui se trompera.
const VACANCES_DE = {
  "Toussaint": "de la Toussaint",
  "Noël": "de Noël",
  "Hiver": "d'hiver",
  "Printemps": "de printemps",
  "Été": "d'été",
};
const de = (nom) => VACANCES_DE[nom] || "de " + nom;

const liste = (xs) => xs.length <= 1 ? (xs[0] || "")
  : xs.slice(0, -1).join(", ") + " et " + xs[xs.length - 1];

export const differencesDemande = (demande, semaine, vacances) => {
  const changements = [];
  const dSem = demande?.semaine || {};
  const dVac = demande?.vacances || {};

  for (const [cle, nom] of Object.entries(MOMENTS)) {
    const avant = new Set(semaine?.[cle] || []);
    const apres = new Set(dSem[cle] || []);
    const ajoutes = [...apres].filter((j) => !avant.has(j)).map((j) => JOURS_COURTS[j] || j);
    const retires = [...avant].filter((j) => !apres.has(j)).map((j) => JOURS_COURTS[j] || j);
    if (ajoutes.length) changements.push(`accueil du ${nom} ajouté le ${liste(ajoutes)}`);
    if (retires.length) changements.push(`accueil du ${nom} retiré le ${liste(retires)}`);
  }

  const mAvant = !!semaine?.mercredi, mApres = !!dSem.mercredi;
  if (mAvant !== mApres) changements.push(mApres ? "mercredi en journée ajouté" : "mercredi en journée retiré");

  // Les vacances : une periode dont la reponse passe de « pas encore repondu »
  // a une reponse compte autant qu'un changement d'avis.
  for (const cle of new Set([...Object.keys(vacances || {}), ...Object.keys(dVac)])) {
    const avant = vacances?.[cle], apres = dVac[cle];
    if (avant === apres) continue;
    const nom = cle.split("|")[1] || cle;
    if (apres === true) changements.push(`accueil souhaité pendant les vacances ${de(nom)}`);
    else if (apres === false) changements.push(`pas d'accueil pendant les vacances ${de(nom)}`);
    else changements.push(`réponse retirée pour les vacances ${de(nom)}`);
  }

  return changements;
};

// La phrase montree a l'assistante maternelle. Elle ne dit jamais « rien ne
// change » sans que ce soit vrai : quand la comparaison ne trouve rien, elle
// le dit franchement plutot que d'inventer un resume.
export const resumeDemande = (demande, semaine, vacances) => {
  const d = differencesDemande(demande, semaine, vacances);
  if (!d.length) return "Le parent a renvoyé le planning sans le changer.";
  return d.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" · ");
};
