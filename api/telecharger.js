import { createClient } from '@supabase/supabase-js';
import { PRODUITS, developper } from './_catalogue-boutique.js';
import { FICHIERS } from './_fichiers-boutique.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Sert un document acheté, après vérification du jeton remis par courriel.
//
// Les fichiers voyagent avec le déploiement plutôt que de vivre dans un bucket
// à alimenter à la main : une correction se publie alors comme le reste du
// code, et aucune ancienne version ne peut traîner pendant que le site annonce
// la nouvelle.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('GET only');

  const jeton = String(req.query.jeton || '');
  const cle = String(req.query.f || '');

  // Un message unique pour toutes les causes de refus : distinguer « jeton
  // inconnu » de « jeton expiré » indiquerait à un curieux qu'il a trouvé un
  // jeton valide, et un lien périmé se règle de toute façon par le support.
  const refuser = () => res.status(403).send(
    "Ce lien de téléchargement n'est plus valable. Écrivez à support@timat.app en indiquant votre adresse de commande, nous vous en renverrons un."
  );

  if (!jeton || jeton.length < 20 || !PRODUITS[cle]) return refuser();

  try {
    const { data: achat, error } = await supabase
      .from('achats_boutique')
      .select('produits, expire_le')
      .eq('jeton', jeton)
      .maybeSingle();

    if (error || !achat) return refuser();
    if (achat.expire_le && new Date(achat.expire_le) < new Date()) return refuser();

    // Le pack se déplie ici aussi : la commande ne stocke que ce qui a été
    // acheté, pas la liste des fichiers qu'il ouvre.
    const autorises = developper(achat.produits || []);
    if (!autorises.includes(cle)) return refuser();

    const fichier = FICHIERS[cle];
    if (!fichier) return res.status(404).send('Document introuvable.');

    const corps = Buffer.from(fichier.base64, 'base64');
    res.setHeader('Content-Type', fichier.type);
    res.setHeader('Content-Length', String(corps.length));
    res.setHeader('Content-Disposition', `attachment; filename="${fichier.nom}"`);
    // Un lien nominatif ne doit être gardé ni par un cache partagé ni par le
    // navigateur : le jeton est dans l'adresse.
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).send(corps);
  } catch (e) {
    console.error('[telecharger]', e.message);
    return res.status(500).send('Erreur serveur.');
  }
}
