import { createClient } from '@supabase/supabase-js';
import { jeton } from './desinscription.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Le site est servi depuis www ; l'apex reste accepté tant que la redirection
// 308 n'est pas en place côté Vercel.
const ORIGINES = ['https://www.timat.app', 'https://timat.app'];

// Le consentement se prouve par le texte affiché au moment du clic, pas par une
// case cochée. Cette constante DOIT rester identique à celle du formulaire.
const TEXTE_CONSENTEMENT =
  "J'accepte de recevoir le relevé mensuel d'heures par e-mail, ainsi que les " +
  "nouveaux outils et guides gratuits de TiMat. Je peux me désinscrire à tout " +
  'moment via le lien présent dans chaque e-mail.';

const EMAIL_VALIDE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const LIEN_RELEVE = 'https://www.timat.app/releve-heures-assistante-maternelle.html';

function corps(email) {
  const desinscription =
    `https://www.timat.app/api/desinscription?e=${encodeURIComponent(email)}` +
    `&t=${jeton(email)}`;
  return `<!DOCTYPE html><html lang="fr"><body style="margin:0;background:#FDFBF8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#2E4859;line-height:1.7">
  <div style="max-width:520px;margin:0 auto;padding:32px 22px">
    <p style="font-size:22px;font-weight:700;margin:0 0 18px">Votre relevé mensuel d'heures</p>
    <p style="margin:0 0 16px">Le voici — il s'ouvre dans votre navigateur, vous choisissez le mois, et le tableau se remplit aux bonnes dates.</p>
    <p style="margin:0 0 26px">
      <a href="${LIEN_RELEVE}" style="display:inline-block;background:#C84B31;color:#fff;text-decoration:none;font-weight:700;padding:13px 26px;border-radius:12px">Ouvrir le relevé</a>
    </p>
    <p style="margin:0 0 16px"><strong>Le réflexe qui compte :</strong> faites-le signer chaque fin de mois, pas au moment du désaccord. C'est ce qui tranche les discussions sur les heures, l'indemnité d'entretien et les repas.</p>
    <p style="margin:0 0 26px">Pour l'enregistrer en PDF, choisissez « Enregistrer au format PDF » comme imprimante.</p>
    <hr style="border:0;border-top:1px solid #EAE0E8;margin:26px 0">
    <p style="font-size:13px;color:#6B7A82;margin:0 0 8px">Vous recevez cet e-mail parce que vous avez demandé le relevé sur timat.app.</p>
    <p style="font-size:13px;color:#6B7A82;margin:0"><a href="${desinscription}" style="color:#6B7A82">Se désinscrire</a></p>
  </div>
</body></html>`;
}

export default async function handler(req, res) {
  const origine = req.headers.origin;
  if (ORIGINES.includes(origine)) {
    res.setHeader('Access-Control-Allow-Origin', origine);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST uniquement' });

  try {
    const { email, consentement, piege } = req.body || {};

    // Champ leurre : invisible pour un humain, rempli par la plupart des robots.
    if (piege) return res.status(200).json({ succes: true });

    const propre = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!propre || propre.length > 254 || !EMAIL_VALIDE.test(propre)) {
      return res.status(400).json({ error: 'Adresse e-mail invalide.' });
    }
    if (consentement !== true) {
      return res.status(400).json({ error: 'Le consentement est nécessaire pour vous écrire.' });
    }

    // L'enregistrement du consentement fait foi : pas d'insertion, pas d'envoi.
    const { error: erreurDb } = await supabase.from('prospects').insert({
      email: propre,
      source: 'releve-heures',
      consentement_texte: TEXTE_CONSENTEMENT,
    });

    // 23505 = violation d'unicité : la personne redemande le relevé, on le renvoie.
    if (erreurDb && erreurDb.code !== '23505') {
      console.error('[inscription-releve] Supabase :', erreurDb.message);
      return res.status(500).json({ error: 'Enregistrement impossible, réessayez dans un instant.' });
    }

    const cle = process.env.RESEND_API_KEY;
    if (!cle) {
      console.error('[inscription-releve] RESEND_API_KEY absente');
      return res.status(500).json({ error: 'Envoi indisponible, réessayez plus tard.' });
    }

    const envoi = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'TiMat <noreply@timat.app>',
        to: [propre],
        // noreply@ ne reçoit pas : sans reply_to, une réponse part dans le vide.
        reply_to: 'support@timat.app',
        subject: "Votre relevé mensuel d'heures",
        html: corps(propre),
      }),
    });

    if (!envoi.ok) {
      const detail = await envoi.text();
      console.error('[inscription-releve] Resend :', envoi.status, detail);
      return res.status(502).json({ error: "L'envoi a échoué, réessayez dans un instant." });
    }

    return res.status(200).json({ succes: true });
  } catch (e) {
    console.error('[inscription-releve] :', e);
    return res.status(500).json({ error: 'Une erreur est survenue.' });
  }
}
