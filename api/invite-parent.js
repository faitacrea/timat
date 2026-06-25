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

    const html = [
      "<h2>Bienvenue sur TiMat</h2>",
      "<p>" + (prenomAsmat || "Votre assistante maternelle") + " vous invite a suivre le quotidien de " + (prenomEnfant || "votre enfant") + " sur TiMat.</p>",
      "<p>Creez votre compte avec <strong>cette adresse email</strong> pour acceder directement a l'espace de votre enfant.</p>",
      "<p><a href='https://timat.app?role=parent' style='background:#C4714A;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;'>Creer mon espace parent</a></p>"
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
