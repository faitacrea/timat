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
    const { emailParent, prenomEnfant, prenomAsmat, asmatId, enfantId } = req.body;
    if (!emailParent) return res.status(400).json({ error: "Email requis" });

    await supabase.auth.admin.inviteUserByEmail(emailParent, {
      redirectTo: "https://timat-rho.vercel.app?role=parent",
      data: { role: "parent", prenom_enfant: prenomEnfant, asmat_id: asmatId, enfant_id: enfantId }
    });

    const html = [
      "<h2>Bienvenue sur TiMat</h2>",
      "<p>" + (prenomAsmat || "Votre assistante maternelle") + " vous invite a suivre le quotidien de " + (prenomEnfant || "votre enfant") + " sur TiMat.</p>",
      "<p><a href='https://timat-rho.vercel.app?role=parent' style='background:#C4714A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;'>Acceder a mon espace parent</a></p>"
    ].join("");

    const { error: emailError } = await resend.emails.send({
      from: "TiMat <onboarding@resend.dev>",
      to: emailParent,
      subject: "Votre assistante maternelle vous invite sur TiMat",
      html: html
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return res.status(500).json({ error: emailError.message });
    }

    await supabase.from("invitations").upsert({
      email_parent: emailParent, asmat_id: asmatId, enfant_id: enfantId,
      prenom_enfant: prenomEnfant, statut: "envoyee", created_at: new Date().toISOString()
    }, { onConflict: "email_parent,asmat_id" });

    console.log("[Invite] Email envoye a", emailParent);
    return res.status(200).json({ success: true, message: "Invitation envoyee a " + emailParent });

  } catch (e) {
    console.error("Invite error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
