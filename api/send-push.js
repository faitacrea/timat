// api/send-push.js
// Vercel Serverless Function — envoie une notification push Web
// Nécessite la librairie web-push et des clés VAPID

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

webpush.setVapidDetails(
  'mailto:contact@timat.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, title, body, url, tag } = req.body;

  if (!userId || !title) {
    return res.status(400).json({ error: 'userId et title requis' });
  }

  try {
    // Récupérer les abonnements push de l'utilisateur
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId);

    if (!subscriptions?.length) {
      return res.status(200).json({ sent: 0, message: 'Aucun abonnement push trouvé' });
    }

    const payload = JSON.stringify({ title, body, url: url || '/', tag: tag || 'timat' });
    const results = await Promise.allSettled(
      subscriptions.map(({ subscription }) =>
        webpush.sendNotification(JSON.parse(subscription), payload)
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return res.status(200).json({ sent, total: subscriptions.length });

  } catch (error) {
    console.error('Push error:', error);
    return res.status(500).json({ error: error.message });
  }
}
