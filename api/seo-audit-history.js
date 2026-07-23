// api/seo-audit-history.js
// Retourne les dernieres executions de l'audit SEO (resume, pas le detail
// page par page) pour comparer d'une fois a l'autre dans le backoffice.
// GET /api/seo-audit-history

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Verification serveur que l appelant est bien l administrateur.
// Volontairement recopiee dans chaque endpoint : aucun fichier partage a creer,
// donc rien qui puisse casser au moment de l upload.
async function requireAdmin(req, res) {
  try {
    const header = req.headers["authorization"] || req.headers["Authorization"] || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) {
      res.status(401).json({ ok: false, error: "Authentification requise." });
      return null;
    }
    const adminDb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await adminDb.auth.getUser(token);
    if (error || !data || !data.user) {
      res.status(401).json({ ok: false, error: "Session invalide ou expiree." });
      return null;
    }
    const { data: profile, error: pErr } = await adminDb
      .from("profiles").select("is_admin").eq("id", data.user.id).maybeSingle();
    if (pErr || !profile || profile.is_admin !== true) {
      res.status(403).json({ ok: false, error: "Acces reserve a l administrateur." });
      return null;
    }
    return data.user;
  } catch (e) {
    res.status(500).json({ ok: false, error: "Erreur de verification des droits." });
    return null;
  }
}

export default async function handler(req, res) {
  try {
    if (!(await requireAdmin(req, res))) return;

    const { data, error } = await supabase
      .from("seo_audit_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    res.status(200).json({ ok: true, history: data || [] });
  } catch (e) {
    res.status(500).json({ ok: false, error: (e && e.message) || "Erreur historique SEO." });
  }
}
