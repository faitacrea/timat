// LES DEUX CHEMINS STRIPE, REUNIS EN UNE SEULE FONCTION.
//
// POURQUOI. Le forfait Vercel Hobby n'autorise que DOUZE fonctions serverless
// par deploiement, et le projet y etait exactement. Ouvrir une treizieme route
// — celle de la transmission Pajemploi, le jour de l'habilitation — aurait
// fait ECHOUER le deploiement de production alors que la construction
// reussissait : le site serait reste sur la version precedente, sans que rien
// ne le dise.
//
// Ces deux-la etaient les meilleures candidates : meme dependance (Stripe),
// meme secret, aucune adresse publique dans un courriel deja envoye. Les
// anciens chemins /api/checkout-session et /api/customer-portal continuent de
// fonctionner : vercel.json les redirige ici. Rien a changer cote application,
// et une page gardee en cache par un navigateur marche encore.
//
// Le chemin est choisi par « action » : "portail" pour le portail client,
// tout le reste (valeur absente comprise) pour la creation d'une session de
// paiement — c'est ce que l'application envoyait deja.

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Prix en centimes. Ils font foi : la session Stripe est creee a la volee a
// partir de ces montants, il n'y a pas de catalogue Stripe a synchroniser. Toute
// modification ici doit etre reportee sur les prix affiches — vue boutique de
// l'application, public/boutique.html et data/documents-assmat.json.
const BOUTIQUE_PRODUCTS = {
  kit_sheets: { name: 'Kit de gestion Assmat', price: 1490 },
  fiche_urgence: { name: "Fiche d'urgence", price: 690 },
  projet_accueil: { name: "Projet d'accueil", price: 1290 },
  registre_medicaments: { name: 'Registre des médicaments administrés', price: 690 },
  pack_complet: { name: 'Pack Complet Assmat', price: 3490 },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // --- Le portail client : gerer ou resilier un abonnement en cours. ---
  const action = req.query?.action || req.body?.action;
  if (action === 'portail') {
    try {
      const { stripeCustomerId } = req.body || {};
      if (!stripeCustomerId) return res.status(400).json({ error: 'stripeCustomerId requis' });
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: process.env.NEXT_PUBLIC_APP_URL || 'https://www.timat.app',
      });
      return res.status(200).json({ url: session.url });
    } catch (e) {
      console.error('Customer portal error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // --- La creation d'une session de paiement. ---


  try {
    const { userId, email, prenom, productId } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'userId et email requis' });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://timat-rho.vercel.app';

    // BOUTIQUE: one-time payment
    if (productId && BOUTIQUE_PRODUCTS[productId]) {
      const product = BOUTIQUE_PRODUCTS[productId];
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: { name: product.name },
            unit_amount: product.price,
          },
          quantity: 1,
        }],
        success_url: appUrl + '?purchase=' + productId + '&success=true',
        cancel_url: appUrl + '?canceled=true',
        metadata: { userId, prenom: prenom || '', productId, type: 'boutique' },
      });
      return res.status(200).json({ url: session.url });
    }

    // SUBSCRIPTION: Pro monthly
    if (!process.env.STRIPE_PRICE_ID) {
      return res.status(500).json({ error: 'STRIPE_PRICE_ID manquant dans les variables Vercel' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      success_url: appUrl + '?session_id={CHECKOUT_SESSION_ID}&success=true',
      cancel_url: appUrl + '?canceled=true',
      metadata: { userId, prenom: prenom || '', type: 'subscription' },
      // PLUS DE trial_period_days ICI. Les deux mois offerts sont consommés
      // AVANT Stripe, dans TiMat, sans carte. Les laisser aussi chez Stripe
      // offrait donc quatre mois à qui décidait de continuer — et repoussait
      // le premier paiement de deux mois de plus.
      subscription_data: {
        metadata: { userId },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
