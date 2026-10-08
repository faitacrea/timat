// QUI APPELLE CETTE PORTE ?
//
// Trois fonctions serverless s'ouvraient à n'importe qui sur Internet, avec
// « Access-Control-Allow-Origin: * » et aucune authentification :
//
//   - /api/invite-parent  écrivait dans « invitations » AVEC LA CLÉ DE SERVICE,
//     en attribuant l'invitation à l'assistante maternelle que l'appelant
//     désignait dans le corps de la requête. Elle supprimait aussi les
//     invitations en attente de cette personne, et envoyait un courriel signé
//     par le domaine dont le lien du bouton venait, lui aussi, du corps de la
//     requête ;
//   - /api/stripe?action=portail rendait l'URL du portail de facturation de
//     n'importe quel client Stripe dont on donnait l'identifiant : factures,
//     quatre derniers chiffres de la carte, adresse — et le bouton de
//     résiliation ;
//   - /api/support insérait dans « support_messages », avec la clé de service,
//     ce que l'appelant voulait.
//
// Ce module est la réponse commune. Il porte un tiret bas pour que Vercel n'en
// fasse PAS une route : le forfait Hobby n'autorise que douze fonctions, et le
// projet y est.
//
// Le jeton est vérifié auprès de Supabase, et non décodé sur place : un jeton
// décodé sans être vérifié se fabrique à la main. Cela ne réclame que la clé
// publique — la clé de service n'entre jamais dans une vérification d'identité.

const ORIGINES = [
  "https://timat.app",
  "https://www.timat.app",
  "https://timat-rho.vercel.app",
];

/** Les en-têtes CORS, limités aux origines de TiMat. « * » laissait n'importe
 *  quel site appeler ces portes depuis le navigateur de ses visiteurs. */
export const corsDe = (req) => {
  const origine = req.headers?.origin || req.headers?.get?.("origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGINES.includes(origine) ? origine : ORIGINES[1],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
};

/** Pose les en-têtes CORS sur une réponse Node (req, res). */
export const poserCors = (req, res) => {
  const h = corsDe(req);
  for (const [k, v] of Object.entries(h)) res.setHeader(k, v);
};

/**
 * Rend l'identifiant de la personne qui appelle, ou null.
 * Ne fait AUCUNE confiance au corps de la requête : l'identité vient du jeton.
 */
export const utilisateurDeLaRequete = async (req) => {
  const brut = req.headers?.authorization || req.headers?.get?.("authorization") || "";
  const jeton = String(brut).replace(/^Bearer\s+/i, "").trim();
  const url = process.env.VITE_SUPABASE_URL;
  const cle = process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!jeton || !url || !cle) return null;
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: cle, Authorization: `Bearer ${jeton}` },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ? { id: u.id, email: u.email || null } : null;
  } catch (e) {
    console.error("[auth] vérification du jeton impossible :", e.message);
    return null;
  }
};

/** Le secret de la tâche planifiée, pour les appels de serveur à serveur. */
export const estInterne = (req) => {
  const secret = process.env.CRON_SECRET;
  const recu = req.headers?.["x-timat-interne"] || req.headers?.get?.("x-timat-interne") || "";
  return Boolean(secret) && recu === secret;
};

/** Échappe pour du HTML de courriel. Les prénoms partaient tels quels. */
export const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");
