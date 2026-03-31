// api/webhook.js
// Vercel Serverless Function — reçoit les événements Stripe
// ⚠️ Ce endpoint doit recevoir le body RAW (pas JSON parsé)

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Client Supabase avec la clé SERVICE (pas la clé publique)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // À ajouter dans Vercel env vars
);

// Vercel : désactiver le body parser pour recevoir le raw body
export const config = { api: { bodyParser: false } };

// Lire le raw body
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const rawBody = await getRawBody(req);
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature invalide:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  console.log('Stripe event reçu:', event.type);

  try {
    switch (event.type) {

      // ── Essai démarré ou abonnement activé ──────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;
        if (!userId) break;

        const isActive = ['active', 'trialing'].includes(subscription.status);
        await supabase.from('profiles').update({
          subscription_status: isActive ? 'pro' : 'free',
          stripe_customer_id: subscription.customer,
          stripe_subscription_id: subscription.id,
          subscription_end_date: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        }).eq('id', userId);

        console.log(`✅ Profil ${userId} → ${isActive ? 'pro' : 'free'}`);
        break;
      }

      // ── Paiement réussi ─────────────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const userId = invoice.subscription_details?.metadata?.supabase_user_id;
        if (userId) {
          await supabase.from('profiles').update({
            subscription_status: 'pro',
            last_payment_date: new Date().toISOString(),
          }).eq('id', userId);
        }
        break;
      }

      // ── Paiement échoué ─────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const userId = invoice.subscription_details?.metadata?.supabase_user_id;
        if (userId) {
          await supabase.from('profiles').update({
            subscription_status: 'past_due',
          }).eq('id', userId);
        }
        break;
      }

      // ── Abonnement annulé ───────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;
        if (userId) {
          await supabase.from('profiles').update({
            subscription_status: 'free',
            stripe_subscription_id: null,
          }).eq('id', userId);
          console.log(`❌ Profil ${userId} → free (annulation)`);
        }
        break;
      }

      // ── Checkout complété ───────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          const isTrialing = subscription.status === 'trialing';
          await supabase.from('profiles').update({
            subscription_status: isTrialing ? 'trialing' : 'pro',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          }).eq('id', userId);
        }
        break;
      }

      default:
        console.log(`Événement ignoré: ${event.type}`);
    }
  } catch (dbError) {
    console.error('Erreur Supabase:', dbError);
    // On répond quand même 200 pour que Stripe ne réessaie pas
  }

  return res.status(200).json({ received: true });
}
