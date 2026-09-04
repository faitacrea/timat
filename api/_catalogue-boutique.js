// Catalogue de la boutique, partagé par le webhook de livraison et le script
// qui téléverse les PDF dans Supabase. Le préfixe « _ » empêche Vercel d'en
// faire une route HTTP : c'est un module, pas une fonction.
//
// Un même produit s'achète par deux chemins qui ne portent pas la même
// information :
//   — depuis l'application, la session Stripe est créée par api/checkout-session.js
//     et porte metadata.productId ;
//   — depuis public/boutique.html, c'est un lien de paiement Stripe, créé à la
//     main dans le tableau de bord : aucune métadonnée, seulement le libellé du
//     produit et son montant.
// La reconnaissance doit donc fonctionner dans les deux cas, d'où les mots-clés
// et le montant ci-dessous.

export const PRODUITS = {
  kit_sheets: {
    nom: 'Kit de gestion — tableur',
    prix: 1490,
    // Le kit est un classeur, pas un PDF, mais il se livre comme les autres :
    // par api/telecharger.js, sur présentation du jeton d'achat. Le classeur
    // s'ouvre dans Excel, LibreOffice, Numbers, et s'importe dans Google Sheets
    // pour qui le préfère.
    fichier: 'kit-gestion-assmat.xlsx',
    typeMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    motsCles: ['kit', 'sheets', 'tableur', 'gestion'],
  },
  fiche_urgence: {
    nom: "Fiche de renseignements et d'urgence",
    prix: 690,
    fichier: 'fiche-renseignements-urgence.pdf',
    motsCles: ['urgence', 'renseignements'],
  },
  projet_accueil: {
    nom: "Projet d'accueil",
    prix: 1290,
    fichier: 'projet-accueil.pdf',
    motsCles: ['projet'],
  },
  registre_medicaments: {
    nom: 'Registre des médicaments administrés',
    prix: 690,
    fichier: 'registre-medicaments-administres.pdf',
    motsCles: ['registre', 'medicament', 'medicaments'],
  },
  pack_complet: {
    nom: 'Pack complet',
    prix: 3490,
    // Le pack ne livre pas de fichier propre : il ouvre les trois autres.
    contient: ['kit_sheets', 'fiche_urgence', 'projet_accueil', 'registre_medicaments'],
    motsCles: ['pack', 'complet'],
  },
};

function normaliser(texte) {
  return String(texte || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Retrouve la clé produit à partir d'un libellé et d'un montant. Le libellé est
// saisi à la main dans Stripe : on ne peut pas exiger qu'il corresponde au mot
// près, seulement qu'il contienne un mot reconnaissable. Le montant sert
// d'appui, jamais seul — la fiche d'urgence et le registre coûtent tous deux
// 6,90 €, un montant ne les distingue pas.
export function reconnaitreProduit(libelle, montantCentimes) {
  const texte = normaliser(libelle);
  if (!texte) return null;

  // Le pack d'abord : « pack complet » contiendrait sinon d'autres mots-clés.
  const ordre = ['pack_complet', ...Object.keys(PRODUITS).filter((k) => k !== 'pack_complet')];

  const candidats = ordre.filter((cle) =>
    PRODUITS[cle].motsCles.some((mot) => texte.includes(mot))
  );

  if (candidats.length === 1) return candidats[0];
  if (candidats.length > 1 && typeof montantCentimes === 'number') {
    const parPrix = candidats.find((cle) => PRODUITS[cle].prix === montantCentimes);
    if (parPrix) return parPrix;
  }
  return candidats[0] || null;
}

// Développe un achat en la liste des produits livrables : le pack se déplie.
export function developper(cles) {
  const sortie = [];
  for (const cle of cles) {
    const produit = PRODUITS[cle];
    if (!produit) continue;
    if (produit.contient) {
      for (const inclus of produit.contient) {
        if (!sortie.includes(inclus)) sortie.push(inclus);
      }
    } else if (!sortie.includes(cle)) {
      sortie.push(cle);
    }
  }
  return sortie;
}
