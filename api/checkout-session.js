import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { userId, email, prenom } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'userId et email requis' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price: process.env.STRIPE_PRICE_ID, // ID du prix Pro mensuel dans Stripe
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://timat-rho.vercel.app'}?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://timat-rho.vercel.app'}?canceled=true`,
      metadata: {
        userId,
        prenom: prenom || '',
      },
      subscription_data: {
        trial_period_days: 60, // 2 mois d'essai gratuit
        metadata: { userId },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
