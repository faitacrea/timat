import { createClient } from '@supabase/supabase-js';
import { jeton, jetonValide } from '../lib/infolettre-jeton.js';

import { EMAIL_CONTACT } from "../data/coordonnees.js";
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
  // L'INSCRIPTION ET LA DESINSCRIPTION, DANS UNE SEULE FONCTION.
  //
  // Elles allaient deja ensemble — inscription-releve.js importait jeton()
  // d'ici — et les reunir libere une place sous les douze fonctions du plan
  // Hobby. Le chemin se choisit par la METHODE : POST pour un formulaire
  // d'inscription, GET pour un lien de desinscription clique dans un courriel.
  //
  // L'adresse /api/desinscription?e=…&t=… figure dans des courriels DEJA
  // ENVOYES : elle doit continuer de repondre, et vercel.json la redirige ici.
  if (req.method === 'POST' || req.method === 'OPTIONS') {
    const { inscrire } = await import('../lib/infolettre-inscription.js');
    return inscrire(req, res);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex');

  const email = String(req.query?.e || '').trim().toLowerCase();
  const t = req.query?.t;

  if (!email || !jetonValide(email, t)) {
    return res
      .status(400)
      .send(page('Lien invalide', `Ce lien de désinscription n'est pas valable. Écrivez-nous à ${EMAIL_CONTACT} et nous nous en occupons.`, 'ko'));
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
      .send(page('Une erreur est survenue', `Nous n'avons pas pu enregistrer votre désinscription. Écrivez-nous à ${EMAIL_CONTACT}.`, 'ko'));
  }

  return res
    .status(200)
    .send(page('C’est fait', "Vous ne recevrez plus d'e-mail de notre part. Les outils et le blog restent accessibles librement.", 'ok'));
}
