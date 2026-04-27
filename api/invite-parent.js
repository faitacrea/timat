import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { emailParent, prenomEnfant, prenomAsmat, asmatId, enfantId } = req.body;

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(emailParent, {
      redirectTo: "https://timat-rho.vercel.app?role=parent",
      data: { role: "parent", prenom_enfant: prenomEnfant, asmat_id: asmatId, enfant_id: enfantId }
    });

    if (error) return res.status(500).json({ error: error.message });

    if (enfantId && data?.user?.id) {
      await supabase.from("enfants").update({ parent_id: data.user.id }).eq("id", enfantId);
    }

    await supabase.from("invitations").upsert({
      email_parent: emailParent, asmat_id: asmatId, enfant_id: enfantId,
      prenom_enfant: prenomEnfant, statut: "envoyee", created_at: new Date().toISOString()
    }, { onConflict: "email_parent,asmat_id" });

    return res.status(200).json({ success: true, message: "Invitation envoyee a " + emailParent });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
