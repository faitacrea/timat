import { EMAIL_CONTACT, EMAIL_EXPEDITEUR } from "../data/coordonnees.js";
// api/send-email.js
// Edge Function Vercel pour envoyer des emails via Resend
// Frontend envoie : { type, to, template, vars, from } + son jeton de session
// L'API compose le HTML, valide et envoie via Resend

export const config = {
  runtime: 'edge',
};

// « BONJOUR , » — LE SALUT QUAND LE PRENOM MANQUE.
//
// Les gabarits ecrivaient « ${salut(v.prenom)} ». esc() rend une chaine
// vide pour une variable absente : mieux que « undefined », mais ce qui arrive
// dans la boite est « Bonjour , ». Et ce n'est pas theorique — cron-essais.js
// passe « prenom: profil.prenom || '' », donc le cas est explicitement prevu.
//
// On degrade proprement : « Bonjour Marie, » quand on sait, « Bonjour, » quand
// on ne sait pas. Jamais de virgule orpheline.
const salut = (prenom) => {
  const p = esc(prenom).trim();
  return p ? `Bonjour ${p},` : "Bonjour,";
};

export const EMAIL_TEMPLATES = {
  signature_asmat_signed: {
    subject: "Votre assistante maternelle a signé le contrat",
    html: (v) => `<h2>${salut(v.parent_prenom)}</h2>
<p>${esc(v.asmat_prenom)} vient de signer électroniquement le contrat de ${esc(v.enfant_prenom)}.</p>
<p>Connectez-vous à TiMat pour le signer à votre tour :</p>
<p><a href="${lien(v.url)}" style="display:inline-block;background:#C4714A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Signer le contrat</a></p>`,
  },
  signature_parent_signed: {
    subject: "Le parent a signé le contrat",
    html: (v) => `<h2>${salut(v.asmat_prenom)}</h2>
<p>${esc(v.parent_prenom)} ${esc(v.parent_nom)} vient de signer le contrat de ${esc(v.enfant_prenom)}.</p>
<p>Le contrat est finalisé et archivé dans vos documents.</p>`,
  },
  // Les deux rappels de fin d'essai. Ils disent la date en clair, ce qui est
  // conservé (tout), et ce qui s'arrête. Aucun des deux ne demande de carte :
  // elle n'est demandée qu'au moment de continuer, dans Stripe.
  // L'AVERTISSEMENT D'INACTIVITE.
  //
  // Ce courriel n'annonce PAS une suppression automatique, parce qu'il n'y en
  // a pas : un compte inactif contient le dossier d'enfants reels, et TiMat
  // n'efface pas d'office des pieces qui servent de justificatifs. Il dit ce
  // qui est vrai — le compte est en sommeil, les donnees sont toujours la, et
  // une seule connexion suffit a le reveiller.
  inactivite_avertissement: {
    subject: 'Votre compte TiMat dort depuis deux ans',
    html: (v) => `<h2>${salut(v.prenom)}</h2>
<p>Vous ne vous êtes pas connectée à TiMat depuis <strong>deux ans</strong>. Nous vous le signalons parce que la CNIL le recommande, et parce que c'est normal de savoir ce qu'un service garde de vous.</p>
<p><strong>Vos données sont toujours là</strong> : vos dossiers d'enfants, vos pointages, vos contrats et vos bulletins n'ont pas été touchés. Nous ne les supprimons pas de notre propre initiative — ce sont vos justificatifs, et vous seule savez quand ils ne vous servent plus.</p>
<p>Une seule connexion suffit à remettre le compte en activité :</p>
<p><a href="${lien(v.url)}" style="display:inline-block;background:#B4543F;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Me reconnecter</a></p>
<p style="color:#55707C;font-size:14px">Si vous préférez que tout soit effacé, écrivez-nous : la suppression est faite, et nous vous envoyons une attestation écrite si vous la demandez.</p>`,
  },
  essai_rappel_7: {
    subject: "Il vous reste une semaine d'essai TiMat",
    html: (v) => `<h2>${salut(v.prenom)}</h2>
<p>Vos deux mois offerts se terminent le <strong>${esc(v.fin)}</strong>, dans ${esc(v.jours)} jours.</p>
<p>Vous n'avez rien à faire tout de suite, et aucune carte bancaire ne vous a été demandée. Si vous souhaitez continuer, vous pourrez le faire d'un clic depuis votre espace.</p>
<p><a href="${lien(v.url)}" style="display:inline-block;background:#B4543F;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Ouvrir TiMat</a></p>
<p style="color:#55707C;font-size:14px">Si vous ne continuez pas, votre compte repasse simplement en formule gratuite. Vos enfants, vos pointages et vos documents restent là où ils sont.</p>`,
  },
  essai_rappel_3: {
    subject: "Vos deux mois d'essai TiMat se terminent dans 3 jours",
    html: (v) => `<h2>${salut(v.prenom)}</h2>
<p>Vos deux mois offerts se terminent le <strong>${esc(v.fin)}</strong>.</p>
<p>Pour garder les bulletins de salaire, le récapitulatif Pajemploi et les contrats illimités, continuez avec TiMat à 9,99 € par mois — sans engagement, résiliable en un clic.</p>
<p><a href="${lien(v.url)}" style="display:inline-block;background:#B4543F;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Continuer avec TiMat</a></p>
<p style="color:#55707C;font-size:14px">Si vous ne faites rien, votre compte repasse en formule gratuite. <strong>Rien n'est supprimé</strong> : vos enfants, vos pointages et vos documents vous attendent, et reprendre l'abonnement rouvre exactement le dossier que vous aviez laissé.</p>`,
  },
  signature_reminder: {
    subject: "Rappel : signature de contrat en attente",
    html: (v) => `<p>Le contrat de ${esc(v.enfant_prenom)} attend votre signature depuis le ${esc(v.date)}.</p>
<p><a href="${lien(v.url)}">Signer maintenant</a></p>`,
  },
  bulletin_sent: {
    subject: "Votre bulletin de salaire est disponible",
    html: (v) => `<p>${salut(v.parent_prenom)}</p>
<p>Le bulletin de salaire pour ${esc(v.mois)} est disponible dans votre espace TiMat.</p>`,
  },
  // ATTENTION : CE GABARIT N'EST APPELE PAR AUCUN CODE DU DEPOT.
  //
  // L'invitation reellement envoyee est ecrite dans api/invite-parent.js, qui
  // construit son propre HTML et passe par Resend directement. Deux textes pour
  // un meme envoi : si l'un change, l'autre ne suit pas. C'est le piege qui a
  // produit un ecart de 492 EUR entre le simulateur d'abattement et le
  // bulletin.
  //
  // Je ne le supprime pas : je peux prouver qu'aucun code d'ici ne l'appelle,
  // pas qu'aucun appel n'existe ailleurs. Avant de toucher a l'un des deux,
  // lire l'autre — et si vous reliez invite-parent.js a ce gabarit, verifiez
  // que le texte envoye reste celui qui a ete relu, pas celui-ci.
  invitation_parent: {
    subject: "Invitation : votre assistante maternelle vous invite sur TiMat",
    html: (v) => `<h2>${salut(v.parent_prenom)}</h2>
<p>${esc(v.asmat_prenom)} vous invite à rejoindre TiMat pour suivre ${esc(v.enfant_prenom)}.</p>
<p>Votre espace parent est <strong>entièrement gratuit</strong> : vous y suivrez la journée de ${esc(v.enfant_prenom)} (repas, sieste, activités, photos privées), les heures de présence, vos documents et votre déclaration Pajemploi.</p>
<p><a href="${lien(v.url)}" style="display:inline-block;background:#C4714A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Créer mon espace parent</a></p>
<div style="background:#FDFBF8;border:1px solid #EDE6DE;border-radius:10px;padding:14px 16px;margin:22px 0">
  <p style="margin:0 0 8px;font-size:14px;color:#2E4859"><strong>À quoi sert votre espace parent ?</strong></p>
  <p style="margin:0;font-size:13px;color:#6B7A82;line-height:1.6">Découvrez en images tout ce que vous pourrez y faire, et comprenez le coût réel de la garde (CMG, crédit d'impôt) :<br/>
  <a href="https://www.timat.app/parents" style="color:#C4714A;font-weight:700;text-decoration:none">Découvrir l'espace parent →</a></p>
</div>
<p style="font-size:12px;color:#888;line-height:1.6">Important : créez d'abord votre compte avec le bouton ci-dessus. Ensuite, vous pourrez vous connecter à tout moment depuis <a href="https://www.timat.app/parents" style="color:#888">timat.app</a>.</p>`,
  },
  pointage_a_valider: {
    subject: "Un pointage attend votre validation",
    html: (v) => `<h2>${salut(v.parent_prenom)}</h2>
<p>L'assistante maternelle a enregistré le pointage de ${esc(v.enfant_prenom)} du ${esc(v.date)}.</p>
<p>Durée d'accueil : <strong>${esc(v.duree)}</strong></p>
<p>Merci de valider ce pointage dans votre application :</p>
<p><a href="${lien(v.url)}" style="display:inline-block;background:#C4714A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Valider le pointage</a></p>
<p style="font-size:11px;color:#888;margin-top:24px">Si vous oubliez, un rappel automatique sera envoyé sous 3 jours.</p>`,
  }, pointage_rappel: {
    subject: "Rappel : pointage en attente de validation depuis 3 jours",
    html: (v) => `<p>${salut(v.parent_prenom)}</p>
<p>Un pointage de ${esc(v.enfant_prenom)} est en attente de votre validation depuis le ${esc(v.date)}.</p>
<p><a href="${lien(v.url)}">Valider maintenant</a></p>`,
  },
  versement_recu: {
    subject: "Nouveau versement enregistré sur TiMat",
    html: (v) => `<h2>${salut(v.prenom)}</h2>
<p>${esc(v.qui)} a enregistré un versement${v.enfant_prenom ? ' pour ' + esc(v.enfant_prenom) : ''} le ${esc(v.date)}.</p>
<p>Retrouvez le détail dans l'onglet Versements de votre espace TiMat.</p>`,
  },
};

// UN BOUTON DE COURRIEL NE PEUT PAS POINTER VERS LE VIDE.
//
// Les gabarits ecrivaient href="${esc(v.url)}". Quand l'appel oublie « url » —
// un parametre mal passe, une donnee manquante — esc rend la chaine vide, et le
// courriel part avec un bouton qui ne mene nulle part. La destinataire clique,
// il ne se passe rien, et elle n'ecrira pas pour le dire.
//
// A defaut d'adresse precise, le bouton ramene a l'application. C'est toujours
// mieux que rien, et c'est vrai.
// ET IL NE PEUT PAS POINTER AILLEURS QUE CHEZ NOUS.
//
// Cette fonction acceptait n'importe quelle adresse en https. Combinee a une
// porte ouverte (voir plus bas), elle faisait de cet endroit un kit
// d'hameconnage : un courriel signe par le domaine timat.app, portant un vrai
// gabarit TiMat (« Votre bulletin de salaire est disponible »), avec un bouton
// vers le site de n'importe qui. Le danger n'est pas seulement pour la
// destinataire : un domaine qui sert a hameconner finit sur les listes noires,
// et les vrais courriels — demandes de signature, bulletins — cessent
// d'arriver.
//
// Un bouton dans un courriel TiMat n'a aucune raison legitime de mener
// ailleurs que sur timat.app ou l'un de ses sous-domaines.
const SITE = "https://www.timat.app";
const DOMAINE_AUTORISE = /^https:\/\/(?:[a-z0-9-]+\.)*timat\.app(?:[/?#]|$)/i;
function lien(u) {
  const v = String(u ?? "").trim();
  if (DOMAINE_AUTORISE.test(v)) return esc(v);
  if (v) console.warn("[send-email] lien hors domaine refusé, repli sur le site :", v.slice(0, 120));
  return esc(SITE);
}

function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(email) {
  if (typeof email !== 'string' || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

const rateLimitMap = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now - record.start > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

function cleanupRateLimit() {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.start > RATE_WINDOW_MS * 2) rateLimitMap.delete(ip);
  }
}

export default async function handler(req) {
  const allowedOrigins = [
    'https://timat.app',
    'https://www.timat.app',
    'https://timat-rho.vercel.app',
  ];
  const origin = req.headers.get('origin') || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // --- QUI A LE DROIT D'ENVOYER ----------------------------------------------
  //
  // Cette porte n'avait AUCUNE authentification. N'importe qui sur Internet
  // pouvait la poster et faire partir un courriel signe par le domaine
  // timat.app, vers n'importe quelle adresse, avec le sujet de son choix et un
  // bouton vers son propre site. La limite de dix par minute et par IP n'y
  // changeait rien : elle se contourne en changeant d'IP, et elle est tenue en
  // memoire d'une fonction edge, donc par instance.
  //
  // Deux appelants legitimes, et deux seulement :
  //   - l'application, qui presente le jeton de session de l'utilisatrice ;
  //   - la tache planifiee des rappels d'essai, qui presente le secret du cron.
  // Tout le reste repart avec un 401.
  const secretInterne = process.env.CRON_SECRET;
  const enteteInterne = req.headers.get("x-timat-interne") || "";
  const estInterne = Boolean(secretInterne) && enteteInterne === secretInterne;

  if (!estInterne) {
    const porteur = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const urlSupabase = process.env.VITE_SUPABASE_URL;
    const cleSupabase = process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!porteur || !urlSupabase || !cleSupabase) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    // On demande a Supabase si ce jeton designe quelqu'un. Cela ne reclame que
    // la cle publique : la cle de service n'a rien a faire ici.
    let valide = false;
    try {
      const r = await fetch(`${urlSupabase}/auth/v1/user`, {
        headers: { apikey: cleSupabase, Authorization: `Bearer ${porteur}` },
      });
      valide = r.ok;
    } catch (e) {
      console.error('[send-email] vérification du jeton impossible :', e.message);
    }
    if (!valide) {
      return new Response(JSON.stringify({ error: 'Jeton de session invalide ou expiré' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[send-email] RESEND_API_KEY non configurée dans Vercel');
    return new Response(JSON.stringify({ error: 'Email service not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded (max 10 emails/min)' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  if (Math.random() < 0.1) cleanupRateLimit();

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // LE SUJET APPARTIENT AU GABARIT, et n'est plus negociable par l'appelant.
  // « finalSubject = subject || tpl.subject » laissait choisir librement la
  // ligne d'objet d'un courriel signe par le domaine : de quoi fabriquer
  // « Votre virement a ete rejete » sous notre signature. Aucun appel n'en a
  // besoin : le seul qui en passait encore un donnait exactement le sujet du
  // gabarit.
  const { type, to, template, vars = {}, from } = body;

  if (!type || typeof type !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing or invalid type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  if (!isValidEmail(to)) {
    return new Response(JSON.stringify({ error: 'Invalid recipient email' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const tpl = EMAIL_TEMPLATES[type];
  if (!tpl) {
    return new Response(JSON.stringify({ error: 'Unknown template type: ' + type }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const finalSubject = tpl.subject;
  let finalHtml;
  try {
    finalHtml = tpl.html(vars);
  } catch (e) {
    console.error('[send-email] template render failed:', e.message);
    return new Response(JSON.stringify({ error: 'Template rendering failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Accepte timat.app et ses sous-domaines : Resend est configuré sur
  // send.timat.app, que l'ancienne expression ne reconnaissait pas.
  const FROM_AUTORISE = /<[^>@]+@(?:[a-z0-9-]+\.)*timat\.app>/i;
  const fromValide = Boolean(from) && FROM_AUTORISE.test(from);
  if (from && !fromValide) {
    console.warn('[send-email] expéditeur refusé, repli sur le défaut :', from);
  }
  const finalFrom = fromValide ? from : `TiMat <${EMAIL_EXPEDITEUR}>`;

  // noreply@ ne reçoit pas : sans reply_to, une réponse part dans le vide.
  const replyTo = EMAIL_CONTACT;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: finalFrom,
        to: [to],
        reply_to: replyTo,
        subject: finalSubject,
        html: finalHtml,
      }),
    });

    const resendData = await resendRes.json().catch(() => ({}));

    if (!resendRes.ok) {
      console.error('[send-email] Resend error:', resendRes.status, resendData);
      return new Response(JSON.stringify({
        error: 'Resend API error',
        status: resendRes.status,
        details: resendData,
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      id: resendData.id,
      type,
      to,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e) {
    console.error('[send-email] Fetch to Resend failed:', e.message);
    return new Response(JSON.stringify({ error: 'Internal server error', details: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
