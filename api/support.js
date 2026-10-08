import { createClient } from '@supabase/supabase-js';
import { poserCors, utilisateurDeLaRequete } from './_authentifier.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  poserCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Cette porte ecrit dans « support_messages » AVEC LA CLE DE SERVICE, et
  // s'ouvrait a n'importe qui : de quoi remplir la boite d'aide de ce qu'on
  // voulait, au nom de l'adresse qu'on voulait. Tous les appels viennent de
  // l'application, ou la personne est connectee.
  const appelant = await utilisateurDeLaRequete(req);
  if (!appelant) return res.status(401).json({ error: 'Authentification requise' });

  try {
    const { prenom, nom, role, sujet, message, prioritaire } = req.body || {};
    // L'adresse et l'horodatage ne sont plus ceux que l'appelant annonce :
    // l'adresse est celle du compte, et l'heure celle du serveur. Un message
    // d'aide doit pouvoir etre rattache a quelqu'un.
    const email = appelant.email;
    const timestamp = new Date().toISOString();

    if (!message) {
      return res.status(400).json({ error: 'Message requis' });
    }
    if (!email) {
      return res.status(400).json({ error: 'Compte sans adresse e-mail' });
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
