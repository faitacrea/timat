import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// Produits de boutique - paiements uniques (prix en centimes)
const BOUTIQUE_PRODUCTS = {
  kit_sheets: { name: 'Kit Google Sheets Assmat', price: 1490 },
  fiche_urgence: { name: "Fiche d'urgence", price: 490 },
  projet_accueil: { name: "Projet d'accueil", price: 990 },
  pack_complet: { name: 'Pack Complet Assmat', price: 2490 },
};

export default async function handler(req, res) {
  try {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST only' });
    }

    const body = req.body || {};
    const { userId, email, prenom, productId } = body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'userId et email requis' });
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://timat-rho.vercel.app';

    // -------------------------
    // BOUTIQUE (paiement unique)
    // -------------------------
    if (productId && BOUTIQUE_PRODUCTS[productId]) {
      const product = BOUTIQUE_PRODUCTS[productId];

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: product.name,
              },
              unit_amount: product.price,
            },
            quantity: 1,
          },
        ],
        success
