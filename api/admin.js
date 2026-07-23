// api/_admin.js
// Verification serveur que l'appelant est bien l'administrateur.
// Le prefixe "_" fait que Vercel N'EXPOSE PAS ce fichier comme une route :
// c'est un utilitaire partage par les endpoints du backoffice.
//
// Principe : le navigateur envoie le jeton de session Supabase dans l'en-tete
// Authorization. On verifie ce jeton cote serveur, puis on relit la colonne
// is_admin dans la table profiles. Cacher un bouton dans l'interface ne protege
// rien : c'est cette verification qui protege reellement les donnees.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Retourne l'utilisateur admin si tout est bon, sinon repond directement
// avec une erreur et retourne null (l'appelant doit alors s'arreter).
export async function requireAdmin(req, res) {
  try {
    const header = req.headers["authorization"] || req.headers["Authorization"] || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) {
      res.status(401).json({ ok: false, error: "Authentification requise." });
      return null;
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) {
      res.status(401).json({ ok: false, error: "Session invalide ou expiree." });
      return null;
    }

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", data.user.id)
      .maybeSingle();

    if (pErr || !profile || profile.is_admin !== true) {
      res.status(403).json({ ok: false, error: "Acces reserve a l'administrateur." });
      return null;
    }

    return data.user;
  } catch (e) {
    res.status(500).json({ ok: false, error: "Erreur de verification des droits." });
    return null;
  }
}
