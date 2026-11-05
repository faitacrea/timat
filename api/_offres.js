// LES OFFRES PAYANTES ET LEURS PRIX STRIPE.
//
// Module, pas route : le tiret bas empêche Vercel d'en faire une fonction
// (forfait Hobby, douze fonctions au plus, le projet y est).
//
// Grille décidée par Sophie le 5 novembre 2026 :
//   - Gratuit : 1 enfant, accès limité (le quotidien) ;
//   - Essentiel : 1 enfant, accès complet — 4,99 €/mois ou 49 €/an ;
//   - Pro : 2 enfants et plus, accès complet — 9,99 €/mois ou 99 €/an.
//
// Les prix ont été créés sur le compte Stripe réel le 3 novembre 2026, à sa
// demande ; le Pro mensuel existait déjà et n'a pas été touché. Un identifiant
// de prix n'est pas un secret : il s'écrit ici, lisible et relu, plutôt que
// dans quatre variables Vercel de plus. Le Pro mensuel garde sa variable
// STRIPE_PRICE_ID, qui est déjà en production et qu'on ne change pas.
//
// C'est le PRIX qui dit l'offre, jamais le montant : un changement d'offre
// fait dans le portail Stripe, ou par l'application, arrive au webhook sous la
// forme d'un nouveau prix sur l'abonnement.

export const OFFRES = ["essentiel", "pro"];
export const PERIODES = ["mois", "an"];

const PRIX = {
  essentiel: {
    mois: "price_1UXkDL1AsEXBU0aLGZ5WMAIf", // 4,99 €/mois, lookup timat_essentiel_mensuel
    an: "price_1UXkFG1AsEXBU0aLC3xawUGf", // 49 €/an, lookup timat_essentiel_annuel
  },
  pro: {
    mois: null, // STRIPE_PRICE_ID (price_1U00xu1AsEXBU0aL9ARcyMVN, 9,99 €/mois)
    an: "price_1UXkFg1AsEXBU0aLwtYnX6Yt", // 99 €/an, lookup timat_pro_annuel
  },
};
const PRO_MENSUEL_PAR_DEFAUT = "price_1U00xu1AsEXBU0aL9ARcyMVN";

// Une valeur inconnue retombe sur l'offre historique (Pro, au mois) : c'est ce
// que l'application envoyait avant qu'on puisse choisir.
export const offreValide = (o) => (OFFRES.includes(o) ? o : "pro");
export const periodeValide = (p) => (PERIODES.includes(p) ? p : "mois");

export const prixDe = (offre, periode) => {
  const o = offreValide(offre), p = periodeValide(periode);
  if (o === "pro" && p === "mois") return process.env.STRIPE_PRICE_ID || PRO_MENSUEL_PAR_DEFAUT;
  return PRIX[o][p];
};

// L'offre que donne un prix Stripe. Inconnu : null, et l'appelant décide.
export const offreDuPrix = (priceId) => {
  if (!priceId) return null;
  if (priceId === (process.env.STRIPE_PRICE_ID || PRO_MENSUEL_PAR_DEFAUT) || priceId === PRO_MENSUEL_PAR_DEFAUT) return "pro";
  for (const o of OFFRES) for (const p of PERIODES) if (PRIX[o][p] && PRIX[o][p] === priceId) return o;
  return null;
};

// Les montants des prix ci-dessus, en centimes, relevés sur Stripe. Ils ne
// servent pas au paiement (c'est le prix Stripe qui fait foi) : l'audit les
// compare aux prix AFFICHÉS (OFFRES_TIMAT, App.jsx), pour qu'une page ne
// promette jamais un autre montant que celui qui sera prélevé.
export const MONTANTS = {
  essentiel: { mois: 499, an: 4900 },
  pro: { mois: 999, an: 9900 },
};

// Le nombre d'enfants actifs que chaque offre accepte.
export const LIMITE_ENFANTS = { essentiel: 1, pro: Infinity };
