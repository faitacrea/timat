// api/create-checkout-session.js
// Vercel Serverless Function — crée une session Stripe Checkout

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { userId, email, prenom } = req.body;

  if (!userId || !email) {
    return res.status(400).json({ error: 'userId et email requis' });
  }

  try {
    // Créer ou retrouver le customer Stripe
    let customerId;
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email,
        name: prenom || email,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
    }

    // Créer la session Checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID, // price_1... depuis Stripe Dashboard
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // Période d'essai 2 mois
      subscription_data: {
        trial_period_days: 60,
        metadata: { supabase_user_id: userId },
      },
      success_url: `${process.env.VITE_APP_URL || 'https://timat-rho.vercel.app'}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VITE_APP_URL || 'https://timat-rho.vercel.app'}/?payment=cancelled`,
      metadata: {
        supabase_user_id: userId,
        user_email: email,
      },
      locale: 'fr',
      allow_promotion_codes: true, // Active les codes promo
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });

  } catch (error) {
    console.error('Stripe error:', error);
    return res.status(500).json({ error: error.message });
  }
}
