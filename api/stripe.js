// LES DEUX CHEMINS STRIPE, REUNIS EN UNE SEULE FONCTION.
//
// POURQUOI. Le forfait Vercel Hobby n'autorise que DOUZE fonctions serverless
// par deploiement, et le projet y etait exactement. Ouvrir une treizieme route
// — celle de la transmission Pajemploi, le jour de l'habilitation — aurait
// fait ECHOUER le deploiement de production alors que la construction
// reussissait : le site serait reste sur la version precedente, sans que rien
// ne le dise.
//
// Ces deux-la etaient les meilleures candidates : meme dependance (Stripe),
// meme secret, aucune adresse publique dans un courriel deja envoye. Les
// anciens chemins /api/checkout-session et /api/customer-portal continuent de
// fonctionner : vercel.json les redirige ici. Rien a changer cote application,
// et une page gardee en cache par un navigateur marche encore.
//
// Le chemin est choisi par « action » : "portail" pour le portail client,
// tout le reste (valeur absente comprise) pour la creation d'une session de
// paiement — c'est ce que l'application envoyait deja.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { poserCors, utilisateurDeLaRequete, origineDeRetour } from './_authentifier.js';
import { DELAI_FERMETURE_JOURS, famillesDe, prevenirFamilles, reglerAbonnements } from './_fermeture.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Prix en centimes. Ils font foi : la session Stripe est creee a la volee a
// partir de ces montants, il n'y a pas de catalogue Stripe a synchroniser. Toute
// modification ici doit etre reportee sur les prix affiches — vue boutique de
// l'application, public/boutique.html et data/documents-assmat.json.
const BOUTIQUE_PRODUCTS = {
  kit_sheets: { name: 'Kit de gestion Assmat', price: 1490 },
  fiche_urgence: { name: "Fiche d'urgence", price: 690 },
  projet_accueil: { name: "Projet d'accueil", price: 1290 },
  registre_medicaments: { name: 'Registre des médicaments administrés', price: 690 },
  pack_complet: { name: 'Pack Complet Assmat', price: 3490 },
};

export default async function handler(req, res) {
  poserCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // Les deux chemins touchent a de l'argent : ils exigent une session ouverte.
  const appelant = await utilisateurDeLaRequete(req);
  if (!appelant) return res.status(401).json({ error: 'Authentification requise' });

  const action = req.query?.action || req.body?.action;

  // --- La fermeture du compte : programmer, annuler, ou supprimer tout de suite. ---
  //
  // Elle vit ici parce qu'elle touche a l'abonnement : supprimer son compte
  // n'arretait pas Stripe, et une assistante maternelle partie continuait
  // d'etre prelevee. Aucune suppression ne se fait plus sans que l'abonnement
  // soit regle d'abord ; si Stripe refuse, rien n'est supprime ni programme.
  if (action === 'fermeture') {
    try {
      const mode = req.body?.mode;
      const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data: profil, error } = await sb.from('profiles')
        .select('prenom, role, stripe_customer_id, suppression_prevue_le').eq('id', appelant.id).maybeSingle();
      if (error) return res.status(502).json({ error: 'Profil illisible : ' + error.message });
      if (!profil) return res.status(404).json({ error: 'Profil introuvable' });
      const appUrl = process.env.APP_URL || 'https://www.timat.app';
      const secret = process.env.CRON_SECRET;

      if (mode === 'immediat') {
        const arretes = await reglerAbonnements(profil.stripe_customer_id, 'immediat');
        return res.status(200).json({ ok: true, abonnements_arretes: arretes });
      }

      if (mode === 'programmer') {
        if (profil.role === 'parent') return res.status(400).json({ error: "La suppression d'un compte parent est immédiate." });
        const familles = await famillesDe(sb, appelant.id);
        if (!familles.length) return res.status(409).json({ error: 'Aucune famille reliée : la suppression peut être immédiate.' });
        // L'abonnement d'abord : si Stripe refuse, on n'a encore rien promis.
        await reglerAbonnements(profil.stripe_customer_id, 'fin_periode');
        const le = new Date(Date.now() + DELAI_FERMETURE_JOURS * 86400000).toISOString();
        const { error: eMaj } = await sb.from('profiles').update({ suppression_prevue_le: le }).eq('id', appelant.id);
        if (eMaj) {
          // Rien n'est programme : l'abonnement ne doit pas s'arreter pour autant.
          await reglerAbonnements(profil.stripe_customer_id, 'reprendre').catch((e) => console.error('Fermeture, reprise :', e.message));
          return res.status(502).json({ error: 'Date non enregistrée : ' + eMaj.message });
        }
        const envoi = await prevenirFamilles({ supabase: sb, asmatId: appelant.id, asmatPrenom: profil.prenom,
          type: 'fermeture_compte_parent', le, appUrl, secret, dejaLues: familles });
        return res.status(200).json({ ok: true, le, familles: envoi.familles, courriels: envoi.envoyes });
      }

      if (mode === 'annuler') {
        if (!profil.suppression_prevue_le) return res.status(200).json({ ok: true, deja: true });
        const { error: eMaj } = await sb.from('profiles').update({ suppression_prevue_le: null }).eq('id', appelant.id);
        if (eMaj) return res.status(502).json({ error: 'Annulation non enregistrée : ' + eMaj.message });
        // La suppression est annulee quoi qu'il arrive ensuite : si Stripe
        // refuse de relancer l'abonnement, on le dit au lieu de pretendre
        // l'echec de toute l'annulation (le compte, lui, est bien conserve).
        let repris = 0, abonnementARelancer = false;
        try { repris = await reglerAbonnements(profil.stripe_customer_id, 'reprendre'); }
        catch (e) { console.error('Fermeture, reprise :', e.message); abonnementARelancer = true; }
        const envoi = await prevenirFamilles({ supabase: sb, asmatId: appelant.id, asmatPrenom: profil.prenom,
          type: 'fermeture_compte_annulee_parent', le: null, appUrl, secret });
        return res.status(200).json({ ok: true, abonnements_repris: repris, abonnement_a_relancer: abonnementARelancer,
          familles: envoi.familles, courriels: envoi.envoyes });
      }

      return res.status(400).json({ error: 'Mode inconnu' });
    } catch (e) {
      console.error('Fermeture error:', e.message);
      return res.status(502).json({ error: e.message });
    }
  }

  // --- Le portail client : gerer ou resilier un abonnement en cours. ---
  if (action === 'portail') {
    try {
      // L'IDENTIFIANT CLIENT VIENT DU PROFIL DE L'APPELANTE, PLUS DU CORPS.
      //
      // « stripeCustomerId » arrivait dans la requete, sans authentification :
      // quiconque disposait d'un identifiant « cus_... » obtenait l'URL du
      // portail de facturation de cette personne — ses factures, les quatre
      // derniers chiffres de sa carte, son adresse, et le bouton de
      // resiliation de son abonnement.
      const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const { data: profil, error } = await sb.from('profiles')
        .select('stripe_customer_id').eq('id', appelant.id).maybeSingle();
      if (error) return res.status(502).json({ error: 'Profil illisible : ' + error.message });
      const stripeCustomerId = profil?.stripe_customer_id;
      if (!stripeCustomerId) return res.status(404).json({ error: "Aucun abonnement Stripe rattaché à ce compte" });
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: origineDeRetour(req),
      });
      return res.status(200).json({ url: session.url });
    } catch (e) {
      console.error('Customer portal error:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  // --- La creation d'une session de paiement. ---


  try {
    // L'identite vient du jeton : « userId » et « email » arrivaient dans le
    // corps, et se retrouvaient dans les metadonnees Stripe — donc dans le
    // webhook qui accorde l'abonnement. Les accepter du corps permettait de
    // faire crediter le compte de quelqu'un d'autre.
    const { prenom, productId } = req.body || {};
    const userId = appelant.id;
    const email = appelant.email;
    if (!email) return res.status(400).json({ error: 'Compte sans adresse e-mail' });

    const appUrl = origineDeRetour(req);

    // BOUTIQUE: one-time payment
    if (productId && BOUTIQUE_PRODUCTS[productId]) {
      const product = BOUTIQUE_PRODUCTS[productId];
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: { name: product.name },
            unit_amount: product.price,
          },
          quantity: 1,
        }],
        success_url: appUrl + '?purchase=' + productId + '&success=true',
        cancel_url: appUrl + '?canceled=true',
        metadata: { userId, prenom: prenom || '', productId, type: 'boutique' },
      });
      return res.status(200).json({ url: session.url });
    }

    // SUBSCRIPTION: Pro monthly
    if (!process.env.STRIPE_PRICE_ID) {
      return res.status(500).json({ error: 'STRIPE_PRICE_ID manquant dans les variables Vercel' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      success_url: appUrl + '?session_id={CHECKOUT_SESSION_ID}&success=true',
      cancel_url: appUrl + '?canceled=true',
      metadata: { userId, prenom: prenom || '', type: 'subscription' },
      // PLUS DE trial_period_days ICI. Les deux mois offerts sont consommés
      // AVANT Stripe, dans TiMat, sans carte. Les laisser aussi chez Stripe
      // offrait donc quatre mois à qui décidait de continuer — et repoussait
      // le premier paiement de deux mois de plus.
      subscription_data: {
        metadata: { userId },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error('Stripe checkout error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
