// api/send-email.js
// Edge Function Vercel pour envoyer des emails via Resend
// Frontend envoie : { type, to, subject, template, vars, from }
// L'API compose le HTML, valide et envoie via Resend

export const config = {
  runtime: 'edge',
};

const EMAIL_TEMPLATES = {
  signature_asmat_signed: {
    subject: "Votre assistante maternelle a signé le contrat",
    html: (v) => `<h2>Bonjour ${esc(v.parent_prenom)},</h2>
<p>${esc(v.asmat_prenom)} vient de signer électroniquement le contrat de ${esc(v.enfant_prenom)}.</p>
<p>Connectez-vous à TiMat pour le signer à votre tour :</p>
<p><a href="${esc(v.url)}" style="display:inline-block;background:#C4714A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Signer le contrat</a></p>`,
  },
  signature_parent_signed: {
    subject: "Le parent a signé le contrat",
    html: (v) => `<h2>Bonjour ${esc(v.asmat_prenom)},</h2>
<p>${esc(v.parent_prenom)} ${esc(v.parent_nom)} vient de signer le contrat de ${esc(v.enfant_prenom)}.</p>
<p>Le contrat est finalisé et archivé dans vos documents.</p>`,
  },
  signature_reminder: {
    subject: "Rappel : signature de contrat en attente",
    html: (v) => `<p>Le contrat de ${esc(v.enfant_prenom)} attend votre signature depuis le ${esc(v.date)}.</p>
<p><a href="${esc(v.url)}">Signer maintenant</a></p>`,
  },
  bulletin_sent: {
    subject: "Votre bulletin de salaire est disponible",
    html: (v) => `<p>Bonjour ${esc(v.parent_prenom)},</p>
<p>Le bulletin de salaire pour ${esc(v.mois)} est disponible dans votre espace TiMat.</p>`,
  },
  invitation_parent: {
    subject: "Invitation : votre assistante maternelle vous invite sur TiMat",
    html: (v) => `<h2>Bonjour ${esc(v.parent_prenom)},</h2>
<p>${esc(v.asmat_prenom)} vous invite à rejoindre TiMat pour suivre ${esc(v.enfant_prenom)}.</p>
<p>Votre espace parent est <strong>entièrement gratuit</strong> : vous y suivrez la journée de ${esc(v.enfant_prenom)} (repas, sieste, activités, photos privées), les heures de présence, vos documents et votre déclaration Pajemploi.</p>
<p><a href="${esc(v.url)}" style="display:inline-block;background:#C4714A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Créer mon espace parent</a></p>
<div style="background:#FDFBF8;border:1px solid #EDE6DE;border-radius:10px;padding:14px 16px;margin:22px 0">
  <p style="margin:0 0 8px;font-size:14px;color:#2E4859"><strong>À quoi sert votre espace parent ?</strong></p>
  <p style="margin:0;font-size:13px;color:#6B7A82;line-height:1.6">Découvrez en images tout ce que vous pourrez y faire, et comprenez le coût réel de la garde (CMG, crédit d'impôt) :<br/>
  <a href="https://timat.app/pour-les-parents.html" style="color:#C4714A;font-weight:700;text-decoration:none">Découvrir l'espace parent →</a></p>
</div>
<p style="font-size:12px;color:#888;line-height:1.6">Important : créez d'abord votre compte avec le bouton ci-dessus. Ensuite, vous pourrez vous connecter à tout moment depuis <a href="https://timat.app/pour-les-parents.html" style="color:#888">timat.app</a>.</p>`,
  },
  pointage_a_valider: {
    subject: "Un pointage attend votre validation",
    html: (v) => `<h2>Bonjour ${esc(v.parent_prenom)},</h2>
<p>L'assistante maternelle a enregistré le pointage de ${esc(v.enfant_prenom)} du ${esc(v.date)}.</p>
<p>Durée d'accueil : <strong>${esc(v.duree)}</strong></p>
<p>Merci de valider ce pointage dans votre application :</p>
<p><a href="${esc(v.url)}" style="display:inline-block;background:#C4714A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Valider le pointage</a></p>
<p style="font-size:11px;color:#888;margin-top:24px">Si vous oubliez, un rappel automatique sera envoyé sous 3 jours.</p>`,
  }, pointage_rappel: {
    subject: "Rappel : pointage en attente de validation depuis 3 jours",
    html: (v) => `<p>Bonjour ${esc(v.parent_prenom)},</p>
<p>Un pointage de ${esc(v.enfant_prenom)} est en attente de votre validation depuis le ${esc(v.date)}.</p>
<p><a href="${esc(v.url)}">Valider maintenant</a></p>`,
  },
  versement_recu: {
    subject: "Nouveau versement enregistré sur TiMat",
    html: (v) => `<h2>Bonjour ${esc(v.prenom)},</h2>
<p>${esc(v.qui)} a enregistré un versement${v.enfant_prenom ? ' pour ' + esc(v.enfant_prenom) : ''} le ${esc(v.date)}.</p>
<p>Retrouvez le détail dans l'onglet Versements de votre espace TiMat.</p>`,
  },
};

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

  const { type, to, subject, template, vars = {}, from } = body;

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

  const finalSubject = subject || tpl.subject;
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

  const finalFrom = from && /<[^>]+@timat\.app>/.test(from)
    ? from
    : 'TiMat <noreply@timat.app>';

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
