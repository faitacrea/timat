import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Disable body parsing — Stripe needs raw body for signature verification
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('Webhook signature verification failed:', e.message);
    return res.status(400).json({ error: `Webhook Error: ${e.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const customerId = session.customer;

        if (userId) {
          await supabase.from('profiles').update({
            subscription_status: 'pro',
            stripe_customer_id: customerId,
            subscription_updated_at: new Date().toISOString(),
          }).eq('id', userId);

          console.log(`[Stripe] ✅ User ${userId} upgraded to Pro`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by stripe_customer_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (profile) {
          await supabase.from('profiles').update({
            subscription_status: 'free',
            subscription_updated_at: new Date().toISOString(),
          }).eq('id', profile.id);

          console.log(`[Stripe] ❌ User ${profile.id} downgraded to Free`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const status = subscription.status; // 'active', 'past_due', 'canceled', 'trialing'

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (profile) {
          const subStatus = ['active', 'trialing'].includes(status) ? 'pro' : 'free';
          await supabase.from('profiles').update({
            subscription_status: subStatus,
            subscription_updated_at: new Date().toISOString(),
          }).eq('id', profile.id);

          console.log(`[Stripe] 🔄 User ${profile.id} subscription: ${status} → ${subStatus}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`[Stripe] ⚠️ Payment failed for customer ${invoice.customer}`);
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event: ${event.type}`);
    }
  } catch (e) {
    console.error('Webhook processing error:', e.message);
    return res.status(500).json({ error: e.message });
  }

  return res.status(200).json({ received: true });
}
