// api/send-push.js — envoi d'une notification push Web.
//
// CE QUI A ETE CORRIGE ICI, ET POURQUOI
//
// La version precedente acceptait n'importe quelle requete venue de n'importe
// ou : « Access-Control-Allow-Origin: * », aucune verification de l'appelant,
// et le destinataire lu directement dans le corps du message. N'importe qui
// sur internet pouvait donc envoyer la notification de son choix a n'importe
// quel utilisateur de TiMat — par exemple « Votre contrat a ete resilie ».
//
// Desormais l'appelant doit presenter son jeton de session, et le droit de
// notifier quelqu'un est tranche par la base, avec la MEME regle que
// create_notification et get_recipient_email : soi-meme, ou quelqu'un avec qui
// on partage un enfant. Cette regle vit dans public.peut_notifier() et nulle
// part ailleurs : une deuxieme version finirait par diverger.
//
// Les abonnements morts sont supprimes au fil de l'eau. Un telephone change,
// une application est desinstallee : sans ce menage la table ne ferait que
// grossir et chaque envoi perdrait du temps sur des adresses mortes.

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const URL_SUPABASE = process.env.VITE_SUPABASE_URL;
const CLE_SERVICE = process.env.SUPABASE_SERVICE_KEY;
// Le nom de cette variable differe selon les endroits : VITE_SUPABASE_KEY cote
// application, VITE_SUPABASE_ANON_KEY dans d'autres fonctions. Accepter les
// deux evite une panne muette due au seul choix du nom.
const CLE_PUBLIABLE = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erreur: 'Méthode non autorisée' });

  // Sans ces trois reglages, l'envoi ne peut pas fonctionner. Le dire
  // franchement vaut mieux qu'un 500 que personne ne saura interpreter.
  const manquants = [
    !process.env.VAPID_PUBLIC_KEY && 'VAPID_PUBLIC_KEY',
    !process.env.VAPID_PRIVATE_KEY && 'VAPID_PRIVATE_KEY',
    !CLE_SERVICE && 'SUPABASE_SERVICE_KEY',
    !CLE_PUBLIABLE && 'VITE_SUPABASE_KEY (ou VITE_SUPABASE_ANON_KEY)',
  ].filter(Boolean);
  if (manquants.length) {
    return res.status(503).json({ erreur: 'Envoi push non configuré', manquants });
  }

  const jeton = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!jeton) return res.status(401).json({ erreur: 'Authentification requise' });

  const { userId, titre, corps, url, tag } = req.body || {};
  if (!userId || !titre) return res.status(400).json({ erreur: 'userId et titre requis' });

  try {
    // 1. Qui appelle ? Le jeton le dit ; le corps du message, non.
    const commeAppelant = createClient(URL_SUPABASE, CLE_PUBLIABLE, {
      global: { headers: { Authorization: 'Bearer ' + jeton } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: errAuth } = await commeAppelant.auth.getUser();
    if (errAuth || !user) return res.status(401).json({ erreur: 'Session invalide' });

    // 2. A-t-il le droit de notifier ce destinataire ? C'est la base qui tranche.
    const { data: autorise, error: errDroit } = await commeAppelant.rpc('peut_notifier', { p_user_id: userId });
    if (errDroit) return res.status(500).json({ erreur: errDroit.message });
    if (autorise !== true) return res.status(403).json({ erreur: 'Destinataire non autorisé' });

    webpush.setVapidDetails(
      'mailto:contact@timat.app',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );

    // 3. Les abonnements du destinataire se lisent avec la cle de service :
    //    ils appartiennent a quelqu'un d'autre que l'appelant.
    const service = createClient(URL_SUPABASE, CLE_SERVICE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: abonnements } = await service
      .from('push_subscriptions').select('id,endpoint,subscription').eq('user_id', userId);

    if (!abonnements?.length) {
      return res.status(200).json({ envoyes: 0, total: 0, raison: 'aucun appareil abonné' });
    }

    const charge = JSON.stringify({ titre, corps: corps || '', url: url || '/', tag: tag || 'timat' });
    const resultats = await Promise.allSettled(
      abonnements.map((a) => webpush.sendNotification(a.subscription, charge)),
    );

    // 404 / 410 : l'abonnement n'existe plus cote navigateur. On le retire.
    const morts = abonnements
      .filter((_, i) => {
        const r = resultats[i];
        return r.status === 'rejected' && [404, 410].includes(r.reason?.statusCode);
      })
      .map((a) => a.id);
    if (morts.length) await service.from('push_subscriptions').delete().in('id', morts);

    const envoyes = resultats.filter((r) => r.status === 'fulfilled').length;
    if (envoyes) {
      await service.from('push_subscriptions')
        .update({ derniere_utilisation: new Date().toISOString() })
        .eq('user_id', userId);
    }
    return res.status(200).json({ envoyes, total: abonnements.length, retires: morts.length });
  } catch (e) {
    console.error('[push]', e);
    return res.status(500).json({ erreur: e.message });
  }
}
