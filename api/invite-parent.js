import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { emailParent, prenomEnfant, prenomAsmat, prenomParent, asmatId, enfantId, inviteUrl } = req.body;
    if (!emailParent) return res.status(400).json({ error: "Email requis" });

    let delQuery = supabase.from("invitations").delete()
      .eq("asmat_id", asmatId)
      .eq("email_parent", emailParent)
      .eq("acceptee", false);
    delQuery = enfantId ? delQuery.eq("enfant_id", enfantId) : delQuery.is("enfant_id", null);
    await delQuery;

    const { error: dbError } = await supabase.from("invitations").insert({
      email_parent: emailParent,
      asmat_id: asmatId,
      enfant_id: enfantId || null,
      acceptee: false,
      created_at: new Date().toISOString()
    });

    if (dbError) {
      console.error("Invitation DB error:", dbError);
      return res.status(500).json({ error: "Enregistrement invitation : " + dbError.message });
    }

    const lien = inviteUrl || "https://timat.app?role=parent";
    const html = [
      "<h2 style='color:#2E4859'>Bonjour" + (prenomParent ? " " + prenomParent : "") + " 👋</h2>",
      "<p>" + (prenomAsmat || "Votre assistante maternelle") + " vous invite à rejoindre TiMat pour suivre le quotidien de " + (prenomEnfant || "votre enfant") + ".</p>",
      "<p>Dans votre espace parent, vous retrouverez :</p>",
      "<ul style='line-height:1.8;color:#33413F'>",
      "<li>📖 Sa journée en direct : repas, siestes, activités et photos privées</li>",
      "<li>🧮 Le salaire et les indemnités calculés automatiquement</li>",
      "<li>📋 Vos montants Pajemploi prêts à déclarer chaque mois</li>",
      "<li>📄 Contrat, bulletins et documents au même endroit</li>",
      "</ul>",
      "<p><strong>C'est 100 % gratuit pour vous</strong>, sans carte bancaire : votre accès est inclus dans l'abonnement de votre assistante maternelle.</p>",
      "<p>Créez votre compte avec <strong>cette adresse e-mail</strong> pour accéder directement à l'espace de votre enfant :</p>",
      "<p><a href='" + lien + "' style='background:#C4714A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700'>Créer mon espace parent</a></p>",
      "<p style='font-size:12px;color:#888;margin-top:22px'>Envie d'en savoir plus avant de créer votre compte ? <a href='https://timat.app/brochure-parents.html' style='color:#C4714A'>Découvrez ce que TiMat va changer pour vous</a>.</p>"
    ].join("");

    const { error: emailError } = await resend.emails.send({
      from: "TiMat <noreply@timat.app>",
      to: emailParent,
      subject: "Votre assistante maternelle vous invite sur TiMat",
      html: html
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return res.status(200).json({ success: true, warning: "Invitation enregistree, mais email non envoye : " + emailError.message });
    }

    console.log("[Invite] Email envoye a", emailParent);
    return res.status(200).json({ success: true, message: "Invitation envoyee a " + emailParent });

  } catch (e) {
    console.error("Invite error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
