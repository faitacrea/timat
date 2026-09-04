import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { randomBytes } from 'node:crypto';
import { PRODUITS, reconnaitreProduit, developper } from './_catalogue-boutique.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Durée de validité des liens de téléchargement. Sept jours : assez pour qu'un
// courriel lu en fin de semaine reste utile, assez court pour qu'un lien qui
// circule ne serve pas indéfiniment. Passé ce délai, l'acheteuse écrit au
// support et on lui régénère un jeton depuis la table achats_boutique.
const VALIDITE_SECONDES = 7 * 24 * 3600;

const SITE = process.env.NEXT_PUBLIC_APP_URL || 'https://www.timat.app';

function echapper(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Retrouve ce qui a été acheté. Deux chemins d'achat, deux sources : depuis
// l'application, api/checkout-session.js pose metadata.productId ; depuis
// public/boutique.html, c'est un lien de paiement créé à la main dans Stripe,
// qui ne porte aucune métadonnée — il faut alors lire les lignes de la commande.
async function produitsAchetes(session) {
  const parMetadonnee = session.metadata && session.metadata.productId;
  if (parMetadonnee && PRODUITS[parMetadonnee]) return [parMetadonnee];

  const lignes = await stripe.checkout.sessions.listLineItems(session.id, { limit: 20 });
  const cles = [];
  for (const ligne of lignes.data) {
    const montant = typeof ligne.amount_total === 'number' && ligne.quantity
      ? Math.round(ligne.amount_total / ligne.quantity)
      : ligne.amount_total;
    const cle = reconnaitreProduit(ligne.description, montant);
    if (cle && !cles.includes(cle)) cles.push(cle);
    else if (!cle) console.warn('[boutique] ligne non reconnue :', ligne.description, montant);
  }
  return cles;
}

async function livrer(session) {
  const email = (session.customer_details && session.customer_details.email)
    || session.customer_email;
  if (!email) throw new Error('commande sans adresse de courriel');

  const achetes = await produitsAchetes(session);
  if (!achetes.length) throw new Error('aucun produit boutique reconnu dans la commande');

  // L'insertion d'abord, et avant tout envoi : la contrainte d'unicité sur
  // stripe_session_id fait office de verrou. Stripe rejoue un webhook tant
  // qu'il n'a pas reçu de 200, et sans cette garde la même commande partirait
  // deux fois par courriel.
  const { error: erreurInsertion } = await supabase.from('achats_boutique').insert({
    stripe_session_id: session.id,
    email,
    produits: achetes,
    montant_centimes: session.amount_total,
  });
  if (erreurInsertion) {
    if (erreurInsertion.code !== '23505') {
      throw new Error('insertion achats_boutique : ' + erreurInsertion.message);
    }
    // La ligne existe déjà : c'est un rejeu. On ne renvoie le courriel que si la
    // livraison précédente a échoué — sinon l'acheteuse recevrait deux fois la
    // même commande.
    const { data: existante } = await supabase.from('achats_boutique')
      .select('livre_le').eq('stripe_session_id', session.id).maybeSingle();
    if (existante && existante.livre_le) {
      console.log('[boutique] commande déjà livrée, rejeu ignoré :', session.id);
      return;
    }
    console.log('[boutique] rejeu après échec de livraison :', session.id);
  }

  // Un jeton par commande, tiré au hasard sur 32 octets : deviner un lien de
  // téléchargement est hors de portée, et le jeton ne dit rien de l'acheteuse.
  const jeton = randomBytes(32).toString('base64url');
  const expire = new Date(Date.now() + VALIDITE_SECONDES * 1000).toISOString();
  const { error: erreurJeton } = await supabase.from('achats_boutique')
    .update({ jeton, expire_le: expire })
    .eq('stripe_session_id', session.id);
  if (erreurJeton) throw new Error('jeton non enregistré : ' + erreurJeton.message);

  // Le pack se déplie ici en ses quatre documents.
  const liens = developper(achetes)
    .filter((cle) => PRODUITS[cle] && PRODUITS[cle].fichier)
    .map((cle) => ({
      nom: PRODUITS[cle].nom,
      url: `${SITE}/api/telecharger?jeton=${encodeURIComponent(jeton)}&f=${encodeURIComponent(cle)}`,
    }));

  if (!liens.length) throw new Error('aucun lien de téléchargement produit');

  await envoyerCourriel(email, liens);

  await supabase.from('achats_boutique').update({
    livre_le: new Date().toISOString(),
    erreur: null,
  }).eq('stripe_session_id', session.id);

  console.log('[boutique] livré à', email, ':', liens.map((l) => l.nom).join(', '));
}

async function envoyerCourriel(email, liens) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY manquante');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const boutons = liens.map((l) =>
    `<p style="margin:0 0 12px"><a href="${echapper(l.url)}" style="display:inline-block;background:#C4714A;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700">${echapper(l.nom)}</a></p>`
  ).join('\n');

  const { error } = await resend.emails.send({
    from: 'TiMat <noreply@timat.app>',
    to: [email],
    reply_to: 'support@timat.app',
    subject: 'Vos documents TiMat',
    html: `<h2 style="color:#2E4859">Merci pour votre commande</h2>
<p>Voici ${liens.length > 1 ? 'vos documents' : 'votre document'} :</p>
${boutons}
<p style="font-size:13px;color:#6B7A82;line-height:1.6">Ces liens restent valables sept jours : pensez à enregistrer les fichiers sur votre ordinateur ou votre téléphone. Passé ce délai, écrivez à <a href="mailto:support@timat.app" style="color:#C4714A">support@timat.app</a> et nous vous en renverrons.</p>
<p style="font-size:12px;color:#888">Une question sur l'utilisation d'un document ? Répondez simplement à ce message.</p>`,
  });
  if (error) throw new Error('Resend : ' + (error.message || JSON.stringify(error)));
}

// Raw body for signature verification
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handler(req, res) {
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
      // Un achat de la boutique porte lui aussi un userId : sans ce filtre, une
      // fiche a 6,90 EUR ouvrait l'acces Pro.
      const estAbonnement = session.mode === 'subscription' || (session.metadata && session.metadata.type === 'subscription');
      if (userId && estAbonnement) {
        await supabase.from('profiles').update({
          subscription_status: 'pro',
          stripe_customer_id: session.customer,
          subscription_updated_at: new Date().toISOString(),
        }).eq('id', userId);
        console.log('[Stripe] User ' + userId + ' upgraded to Pro');
      }

      // Livraison des documents de la boutique. Un échec ici ne doit pas
      // renvoyer une erreur à Stripe : l'accès Pro vient peut-être d'être
      // accordé au-dessus, et un rejeu le rejouerait aussi. On enregistre donc
      // la panne dans achats_boutique — la ligne garde l'identifiant de session,
      // ce qui suffit à relancer la livraison à la main — et on répond 200.
      if (session.mode === 'payment' && session.payment_status === 'paid') {
        try {
          await livrer(session);
        } catch (e) {
          console.error('[boutique] livraison échouée pour', session.id, ':', e.message);
          await supabase.from('achats_boutique')
            .update({ erreur: e.message })
            .eq('stripe_session_id', session.id);
        }
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

export default handler;
export const config = { api: { bodyParser: false } };
