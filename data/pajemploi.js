// LE MANDAT DE TIERCE DECLARATION, ET CE QU'IL AUTORISE.
//
// Pour transmettre une declaration a l'URSSAF, TiMat doit etre habilite comme
// tiers declarant ET detenir un mandat de l'EMPLOYEUR — c'est-a-dire du parent,
// pas de l'assistante maternelle, qui est la salariee (articles L.133-11,
// R.133-43 et R.133-44 du code de la securite sociale).
//
// Tant que l'habilitation n'est pas obtenue, rien de tout cela ne s'affiche.
// Un ecran qui proposerait de mandater alors qu'aucune declaration ne peut
// partir promettrait quelque chose que l'application ne sait pas faire — c'est
// le defaut qu'on a passe la session a retirer, on ne le reintroduit pas.

// L'habilitation est reputee obtenue quand l'identifiant client URSSAF est
// configure cote serveur. Une seule condition, verifiable, et qui bascule
// d'elle-meme le jour ou la demarche aboutit.
export const habilitationActive = (config) => !!String(config?.pajemploi?.clientId || "").trim();

// LE TEXTE DU MANDAT.
//
// Il est versionne : un mandat donne en 2026 ne vaut pas acceptation d'un
// texte reecrit plus tard. La version acceptee est enregistree avec le mandat,
// sans quoi on ne saurait plus a quoi le parent a consenti.
export const VERSION_MANDAT = "2026-09-30";

export const TEXTE_MANDAT = {
  version: VERSION_MANDAT,
  titre: "Mandat de déclaration Pajemploi",
  intro: "Vous êtes l'employeur de votre assistante maternelle. C'est donc à vous, et à vous seul, de décider si TiMat déclare à votre place.",
  points: [
    "TiMat transmettra à l'URSSAF, en votre nom, la déclaration Pajemploi mensuelle de cet enfant : heures d'accueil, salaire net, indemnités d'entretien et de repas.",
    "Les montants transmis sont ceux que vous voyez dans l'application avant chaque envoi. Rien ne part sans que vous les ayez vus.",
    "Vous restez l'employeur et restez responsable de l'exactitude de votre déclaration.",
    "Vous pouvez retirer ce mandat à tout moment, en un clic, depuis cet écran. Le retrait prend effet immédiatement : plus aucune déclaration ne partira.",
    "Le mandat et sa date sont conservés, même après retrait : ils prouvent qu'une déclaration déjà transmise était autorisée le jour de son envoi.",
  ],
  // Ce que le mandat NE couvre PAS. Un consentement qui ne dit que ce qu'il
  // autorise est un consentement incomplet.
  exclusions: [
    "TiMat ne consulte pas votre compte Pajemploi et n'y modifie rien d'autre.",
    "TiMat n'accède pas à vos moyens de paiement : le versement du salaire reste entièrement entre vos mains.",
    "TiMat ne déclare rien pour un autre employeur que vous, ni pour un autre enfant que celui-ci.",
  ],
};

// L'ETAT D'UN MANDAT, a partir de la ligne en base.
export const etatMandat = (ligne) => {
  if (!ligne) return "absent";
  if (ligne.revoque_le) return "revoque";
  if (ligne.version_texte !== VERSION_MANDAT) return "a_renouveler";
  return "actif";
};

export const LIBELLE_ETAT_MANDAT = {
  absent: "Aucun mandat",
  actif: "Mandat actif",
  revoque: "Mandat retiré",
  a_renouveler: "Mandat à renouveler",
};

// CE QUE VOIT L'UTILISATEUR QUAND L'URSSAF REFUSE.
//
// C'est la partie qu'on oublie, et la seule qui compte le jour ou ca se passe
// mal. La pire reponse serait un ecran qui laisse croire que c'est parti.
// Chaque statut dit donc trois choses : ou en est la declaration, si elle est
// partie ou non, et ce qu'il faut faire maintenant.
export const ETATS_TRANSMISSION = {
  en_attente: {
    libelle: "Envoi en cours",
    partie: null,
    explication: "La déclaration a été envoyée à l'URSSAF. Sa réponse n'est pas encore arrivée.",
    action: "Revenez dans quelques minutes. Ne renvoyez pas : vous déclareriez deux fois.",
  },
  transmise: {
    libelle: "Transmise",
    partie: true,
    explication: "L'URSSAF a accepté la déclaration et en a accusé réception.",
    action: "Rien à faire. Conservez le numéro d'accusé : c'est votre preuve.",
  },
  refusee: {
    libelle: "Refusée par l'URSSAF",
    partie: true,
    explication: "La déclaration est bien arrivée, mais l'URSSAF l'a refusée. Le motif est indiqué ci-dessous.",
    action: "Corrigez ce que le motif indique, puis renvoyez. Tant que ce n'est pas fait, la déclaration du mois n'est pas enregistrée.",
  },
  erreur: {
    libelle: "Non transmise",
    partie: false,
    explication: "L'envoi n'a pas abouti — panne ou coupure. Rien n'est parti : l'URSSAF n'a rien reçu.",
    action: "Réessayez. Si cela se reproduit, déclarez directement sur pajemploi.urssaf.fr pour ne pas dépasser la date limite.",
  },
};

// Une declaration peut-elle partir ? La reponse tient en une fonction, et
// c'est elle que l'ecran ET le serveur interrogent — pas deux regles qui
// finiraient par diverger.
export const peutTransmettre = ({ config, mandat, moisDejaTransmis }) => {
  if (!habilitationActive(config)) return { ok: false, raison: "pas_habilite" };
  if (etatMandat(mandat) !== "actif") return { ok: false, raison: "pas_de_mandat" };
  if (moisDejaTransmis) return { ok: false, raison: "deja_transmis" };
  return { ok: true };
};

export const RAISONS_REFUS = {
  pas_habilite: "La transmission directe n'est pas encore disponible.",
  pas_de_mandat: "Le parent employeur n'a pas donné son mandat, ou l'a retiré.",
  deja_transmis: "Ce mois a déjà été transmis et accepté.",
};
