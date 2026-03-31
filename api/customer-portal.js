// api/customer-portal.js
// Vercel Serverless Function — portail de gestion d'abonnement Stripe

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { stripeCustomerId } = req.body;

  if (!stripeCustomerId) {
    return res.status(400).json({ error: 'stripeCustomerId requis' });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.VITE_APP_URL || 'https://timat-rho.vercel.app'}/`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Customer portal error:', error);
    return res.status(500).json({ error: error.message });
  }
}
