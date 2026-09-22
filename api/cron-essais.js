/**
 * Les essais de deux mois : rappels et expiration, une fois par jour.
 *
 * Pourquoi une tâche planifiée et pas un contrôle au chargement de
 * l'application : un essai doit finir même si personne n'ouvre TiMat. Le test
 * fait côté navigateur (voir estPro dans src/App.jsx) protège l'accès en
 * lecture — il ne peut rien écrire pour une utilisatrice absente, et il
 * n'enverra jamais de courriel à quelqu'un qui ne revient plus. Or c'est
 * précisément celle qui ne revient plus qu'il faut prévenir.
 *
 * Deux choses, dans cet ordre :
 *
 *   1. les rappels — à sept jours puis à trois jours de la fin ;
 *   2. l'expiration — retour en « free », données conservées.
 *
 * L'ordre compte : un compte qui expire aujourd'hui ne doit pas recevoir un
 * rappel « il vous reste 0 jour » dans le même passage.
 *
 * RIEN N'EST SUPPRIMÉ. L'expiration remet le compte en gratuit ; les enfants,
 * les pointages et les documents restent où ils sont. Reprendre l'abonnement
 * rouvre exactement le dossier qu'on avait laissé.
 *
 * La carte bancaire n'apparaît nulle part ici : elle n'est demandée qu'au
 * moment de continuer, dans Stripe, et seulement là.
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/** Les seuils de rappel, en jours avant la fin. Du plus lointain au plus proche. */
const SEUILS = [7, 3];

const APP_URL = process.env.APP_URL || 'https://www.timat.app';

/**
 * Un courriel de rappel. Il passe par /api/send-email, qui est le seul endroit
 * où vivent les gabarits — un second jeu de HTML ici aurait divergé.
 */
async function rappeler(profil, jours) {
  const res = await fetch(`${APP_URL}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: jours === 7 ? 'essai_rappel_7' : 'essai_rappel_3',
      to: profil.email,
      vars: {
        prenom: profil.prenom || '',
        jours: String(jours),
        // La date que la personne verra, en clair, plutôt qu'un nombre de jours
        // qu'elle devra reporter dans son calendrier elle-même.
        fin: new Date(profil.subscription_end_date).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
        }),
        url: APP_URL,
      },
    }),
  });
  if (!res.ok) {
    const corps = await res.text().catch(() => '');
    throw new Error(`send-email ${res.status} : ${corps.slice(0, 200)}`);
  }
}

export default async function handler(req, res) {
  // Échec fermé, comme la publication d'articles : sans secret configuré, cet
  // endpoint ne touche à aucun abonnement. Ouvert au monde, il permettrait de
  // faire expirer les essais de tout le monde.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'CRON_SECRET absent : tâche désactivée.' });
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Non autorisé.' });
  }
  if (!process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY absente.' });
  }

  // « simulation=1 » dit ce qui serait fait, sans rien écrire ni envoyer.
  const simulation = req.query?.simulation === '1';
  const maintenant = new Date();
  const journal = { simulation, rappels: [], expires: [], erreurs: [] };

  try {
    const { data: essais, error } = await supabase
      .from('profiles')
      .select('id, email, prenom, subscription_end_date, essai_rappels')
      .eq('subscription_status', 'trialing')
      .not('subscription_end_date', 'is', null);
    if (error) throw new Error(error.message);

    for (const p of essais || []) {
      const fin = new Date(p.subscription_end_date);
      if (Number.isNaN(fin.getTime())) {
        journal.erreurs.push({ id: p.id, raison: 'date de fin illisible' });
        continue;
      }
      // Le même calcul que joursRestantsEssai() côté application : un compte ne
      // doit pas être « expiré ici, encore actif là-bas » pendant une journée.
      const jours = Math.ceil((fin.getTime() - maintenant.getTime()) / 86400000);

      // 1. L'ESSAI EST FINI.
      if (jours <= 0) {
        journal.expires.push({ id: p.id, fin: p.subscription_end_date });
        if (!simulation) {
          const { error: e } = await supabase.from('profiles').update({
            subscription_status: 'free',
            subscription_updated_at: maintenant.toISOString(),
          }).eq('id', p.id)
            // Garde-fou : si l'abonnement a changé entre la lecture et
            // l'écriture — un paiement pendant que la tâche tourne — on ne
            // repasse pas une abonnée payante en gratuit.
            .eq('subscription_status', 'trialing');
          if (e) journal.erreurs.push({ id: p.id, raison: e.message });
        }
        continue;
      }

      // 2. UN RAPPEL EST-IL DÛ ?
      //
      // On prend le seuil le plus proche encore non envoyé et déjà atteint :
      // un compte créé puis laissé de côté, que la tâche n'aurait pas vu
      // pendant une semaine, reçoit le rappel à trois jours et non celui à
      // sept, qui n'aurait plus aucun sens.
      const envoyes = p.essai_rappels || [];
      const seuil = SEUILS.filter((s) => jours <= s && !envoyes.includes(s)).pop();
      if (seuil === undefined) continue;

      journal.rappels.push({ id: p.id, seuil, joursRestants: jours });
      if (simulation) continue;
      try {
        await rappeler(p, seuil);
        // On note l'envoi APRÈS coup : si le courriel échoue, le rappel sera
        // retenté demain plutôt que perdu en silence. Les seuils déjà passés
        // sont marqués avec lui, pour ne pas envoyer J-7 le lendemain de J-3.
        const aMarquer = [...new Set([...envoyes, ...SEUILS.filter((s) => s >= seuil)])];
        const { error: e } = await supabase.from('profiles')
          .update({ essai_rappels: aMarquer }).eq('id', p.id);
        if (e) journal.erreurs.push({ id: p.id, raison: e.message });
      } catch (e) {
        journal.erreurs.push({ id: p.id, raison: e.message });
      }
    }

    // Une erreur sur un compte n'arrête pas les autres, mais elle doit se voir :
    // une tâche qui répond « tout va bien » en ayant échoué partout est pire
    // que pas de tâche du tout.
    const code = journal.erreurs.length ? 207 : 200;
    return res.status(code).json(journal);
  } catch (e) {
    console.error('[cron-essais]', e.message);
    return res.status(500).json({ error: e.message, journal });
  }
}
