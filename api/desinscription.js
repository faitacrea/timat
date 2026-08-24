import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Jeton de désinscription : sans lui, n'importe qui pourrait désinscrire
 * n'importe quelle adresse en devinant l'URL. La clé de service ne quitte
 * jamais le serveur, elle sert donc de secret sans variable d'environnement
 * supplémentaire.
 */
export function jeton(email) {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_KEY || '')
    .update(`desinscription:${email}`)
    .digest('base64url')
    .slice(0, 32);
}

function jetonValide(email, fourni) {
  const attendu = Buffer.from(jeton(email));
  const recu = Buffer.from(String(fourni || ''));
  return attendu.length === recu.length && timingSafeEqual(attendu, recu);
}

function page(titre, message, ton) {
  const couleur = ton === 'ok' ? '#3F7A63' : '#B33A24';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${titre} | TiMat</title>
<style>
body{margin:0;background:#FDFBF8;color:#2E4859;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;
  display:flex;align-items:center;justify-content:center;min-height:100vh;padding:22px}
.b{max-width:460px;background:#fff;border:1px solid #E4DCD0;border-radius:16px;padding:32px 30px;text-align:center;
  box-shadow:0 8px 28px rgba(46,72,89,.09)}
h1{font-size:22px;margin:0 0 12px;color:${couleur}}
p{margin:0 0 20px;font-size:15.5px}
a{display:inline-block;background:#C84B31;color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:12px}
</style></head><body><div class="b">
<h1>${titre}</h1><p>${message}</p><a href="https://www.timat.app/">Retour à TiMat</a>
</div></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex');

  const email = String(req.query?.e || '').trim().toLowerCase();
  const t = req.query?.t;

  if (!email || !jetonValide(email, t)) {
    return res
      .status(400)
      .send(page('Lien invalide', "Ce lien de désinscription n'est pas valable. Écrivez-nous à support@timat.app et nous nous en occupons.", 'ko'));
  }

  const { error } = await supabase
    .from('prospects')
    .update({ desinscrit_le: new Date().toISOString() })
    .eq('email', email)
    .is('desinscrit_le', null);

  if (error) {
    console.error('[desinscription] Supabase :', error.message);
    return res
      .status(500)
      .send(page('Une erreur est survenue', "Nous n'avons pas pu enregistrer votre désinscription. Écrivez-nous à support@timat.app.", 'ko'));
  }

  return res
    .status(200)
    .send(page('C’est fait', "Vous ne recevrez plus d'e-mail de notre part. Les outils et le blog restent accessibles librement.", 'ok'));
}
