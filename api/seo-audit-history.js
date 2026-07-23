// api/seo-audit-history.js
// Retourne les dernieres executions de l'audit SEO (resume, pas le detail
// page par page) pour comparer d'une fois a l'autre dans le backoffice.
// GET /api/seo-audit-history

import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "./_admin.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
