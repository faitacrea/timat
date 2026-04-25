import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { stripeCustomerId } = req.body;

    if (!stripeCustomerId) {
      return res.status(400).json({ error: 'stripeCustomerId requis' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: process.env.NEXT_PUBLIC_APP_URL || 'https://timat-rho.vercel.app',
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('Customer portal error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
