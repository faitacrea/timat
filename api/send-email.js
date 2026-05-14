// api/send-email.js
// Endpoint Vercel pour envoi d'emails via Resend.
// A activer quand le domaine sera verifie chez Resend (besoin de RESEND_API_KEY dans Vercel).
//
// Variables d'environnement requises :
//   RESEND_API_KEY  : cle API Resend (commence par "re_")
//   EMAIL_FROM      : email expediteur, ex "TiMat <noreply@timat.app>"
//
// Templates definis dans App.jsx (constante EMAIL_TEMPLATES) :
//   - signature_asmat_signed
//   - signature_parent_signed
//   - signature_reminder
//   - bulletin_sent
//   - invitation_parent

const TEMPLATES = {
  signature_asmat_signed: {
    subject: "Votre assistante maternelle a signe le contrat",
    html: (v) => `<h2>Bonjour ${v.parent_prenom},</h2>
      <p>${v.asmat_prenom} vient de signer electroniquement le contrat de ${v.enfant_prenom}.</p>
      <p>Connectez-vous a TiMat pour le signer a votre tour :</p>
      <p><a href="${v.url}" style="display:inline-block;background:#C4714A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Signer le contrat</a></p>
      <p style="font-size:11px;color:#888;margin-top:24px">Email automatique - ne pas repondre. Si vous n'attendez pas cet email, ignorez-le.</p>`,
  },
  signature_parent_signed: {
    subject: "Le parent a signe le contrat",
    html: (v) => `<h2>Bonjour ${v.asmat_prenom},</h2>
      <p>${v.parent_prenom} ${v.parent_nom} vient de signer le contrat de ${v.enfant_prenom}.</p>
      <p>Le contrat est finalise et archive dans vos documents.</p>`,
  },
  signature_reminder: {
    subject: "Rappel : signature de contrat en attente",
    html: (v) => `<p>Bonjour,</p>
      <p>Le contrat de ${v.enfant_prenom} attend votre signature depuis le ${v.date}.</p>
      <p><a href="${v.url}">Signer maintenant</a></p>`,
  },
  bulletin_sent: {
    subject: "Votre bulletin de salaire est disponible",
    html: (v) => `<p>Bonjour ${v.parent_prenom},</p>
      <p>Le bulletin de salaire pour ${v.mois} est disponible dans votre espace TiMat.</p>`,
  },
  invitation_parent: {
    subject: "Invitation : votre assistante maternelle vous invite sur TiMat",
    html: (v) => `<h2>Bonjour ${v.parent_prenom},</h2>
      <p>${v.asmat_prenom} vous invite a rejoindre TiMat pour suivre ${v.enfant_prenom}.</p>
      <p><a href="${v.url}">Rejoindre TiMat</a></p>`,
  },
  // P14E - notifications pointage
  pointage_a_valider: {
    subject: "Un pointage attend votre validation",
    html: (v) => `<h2>Bonjour ${v.parent_prenom},</h2>
      <p>L'assistante maternelle a enregistre le pointage de ${v.enfant_prenom} du ${v.date}.</p>
      <p>Duree d'accueil : <strong>${v.duree}</strong></p>
      <p>Merci de valider ce pointage dans votre application :</p>
      <p><a href="${v.url}" style="display:inline-block;background:#C4714A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700">Valider le pointage</a></p>
      <p style="font-size:11px;color:#888;margin-top:24px">Si vous oubliez, un rappel automatique sera envoye sous 3 jours.</p>`,
  },
  pointage_rappel: {
    subject: "Rappel : pointage en attente de validation depuis 3 jours",
    html: (v) => `<p>Bonjour ${v.parent_prenom},</p>
      <p>Un pointage de ${v.enfant_prenom} est en attente de votre validation depuis le ${v.date}.</p>
      <p><a href="${v.url}">Valider maintenant</a></p>`,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { type, to, subject, template, vars = {}, from } = req.body || {};

  if (!to || !template) {
    return res.status(400).json({ success: false, error: "Missing 'to' or 'template'" });
  }

  const tpl = TEMPLATES[template];
  if (!tpl) {
    return res.status(400).json({ success: false, error: "Unknown template: " + template });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const EMAIL_FROM = from || process.env.EMAIL_FROM || "TiMat <noreply@timat.app>";

  if (!RESEND_API_KEY) {
    // Mode dev : pas de cle Resend, on logge seulement
    console.log("[send-email] RESEND_API_KEY absente. Email simule :", { to, template, subject });
    return res.status(200).json({
      success: true,
      simulated: true,
      message: "Email simule (Resend non configure)",
    });
  }

  try {
    const html = tpl.html(vars);
    const finalSubject = subject || tpl.subject;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject: finalSubject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.message || "Resend API error",
        details: data,
      });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    console.error("[send-email] Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
