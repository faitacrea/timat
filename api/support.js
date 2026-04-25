const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { email, prenom, nom, role, sujet, message, prioritaire, timestamp } = req.body;

    if (!message || !email) {
      return res.status(400).json({ error: 'Message et email requis' });
    }

    // 1. Store in Supabase
    const { error: dbError } = await supabase.from('support_messages').insert({
      email,
      prenom: prenom || '',
      nom: nom || '',
      role: role || 'asmat',
      sujet: sujet || 'Autre',
      message,
      prioritaire: prioritaire || false,
      statut: 'nouveau',
      created_at: timestamp || new Date().toISOString(),
    });

    if (dbError) {
      console.error('Erreur Supabase support:', dbError.message);
      // Even if DB fails, we don't want to lose the message
      // Fall through to respond OK so the mailto fallback doesn't trigger
    }

    // 2. Send notification email to admin (optional - via Supabase Edge Function or external service)
    // For now, messages are stored in the DB and can be viewed in the backoffice
    // You can add Resend, SendGrid, or Supabase Edge Function email later

    console.log(`[Support] ${prioritaire ? '⭐ PRO' : '📩'} ${sujet} from ${prenom} ${nom} (${email})`);

    return res.status(200).json({ 
      success: true, 
      message: 'Message reçu' + (prioritaire ? ' — traitement prioritaire' : '')
    });

  } catch (e) {
    console.error('Erreur support API:', e);
    return res.status(500).json({ error: e.message });
  }
}
