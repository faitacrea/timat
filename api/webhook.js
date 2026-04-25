const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Raw body for signature verification
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const handler = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  let event;
  try {
    const buf = await getRawBody(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('Webhook sig error:', e.message);
    return res.status(400).json({ error: e.message });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata && session.metadata.userId;
      if (userId) {
        await supabase.from('profiles').update({
          subscription_status: 'pro',
          stripe_customer_id: session.customer,
          subscription_updated_at: new Date().toISOString(),
        }).eq('id', userId);
        console.log('[Stripe] User ' + userId + ' upgraded to Pro');
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const { data: profile } = await supabase.from('profiles')
        .select('id').eq('stripe_customer_id', sub.customer).maybeSingle();
      if (profile) {
        await supabase.from('profiles').update({
          subscription_status: 'free',
          subscription_updated_at: new Date().toISOString(),
        }).eq('id', profile.id);
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object;
      const { data: profile } = await supabase.from('profiles')
        .select('id').eq('stripe_customer_id', sub.customer).maybeSingle();
      if (profile) {
        const status = ['active', 'trialing'].includes(sub.status) ? 'pro' : 'free';
        await supabase.from('profiles').update({
          subscription_status: status,
          subscription_updated_at: new Date().toISOString(),
        }).eq('id', profile.id);
      }
    }
  } catch (e) {
    console.error('Webhook error:', e.message);
    return res.status(500).json({ error: e.message });
  }

  return res.status(200).json({ received: true });
};

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
