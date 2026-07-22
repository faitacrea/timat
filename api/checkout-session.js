import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const BOUTIQUE_PRODUCTS = {
  kit_sheets: { name: 'Kit Google Sheets Assmat', price: 1490 },
  fiche_urgence: { name: "Fiche d'urgence", price: 490 },
  projet_accueil: { name: "Projet d'accueil", price: 990 },
  pack_complet: { name: 'Pack Complet Assmat', price: 2490 },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

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
      subscription_data: {
        trial_period_days: 60,
        metadata: { userId },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
