import { EMAIL_CONTACT } from "../data/coordonnees.js";
// ═══════════════════════════════════════════════════════════════════════
// TIMAT — Composants RGPD React
// 1. ConsentementRGPD  → case à cocher à l'inscription
// 2. (la suppression du compte vit dans src/socle.jsx)
// ═══════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { supabase } from '../lib/supabase'

// ─── 1. CASE CONSENTEMENT RGPD À L'INSCRIPTION ──────────────────────────────
// Usage : <ConsentementRGPD onChange={(ok) => setConsentValide(ok)} />

export function ConsentementRGPD({ onChange }) {
  const [politique, setPolitique] = useState(false)
  const [mentions, setMentions] = useState(false)
  const [newsletter, setNewsletter] = useState(false)

  const handleChange = (newPolitique, newMentions) => {
    const ok = newPolitique && newMentions
    onChange(ok)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 0' }}>

      {/* Obligatoire : Politique de confidentialité */}
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={politique}
          onChange={e => {
            setPolitique(e.target.checked)
            handleChange(e.target.checked, mentions)
          }}
          style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: '#B8622F' }}
        />
        <span style={{ fontSize: 13, color: '#2C1F14', lineHeight: 1.5 }}>
          J'ai lu et j'accepte la{' '}
          <a
            href="/confidentialite"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#B8622F', textDecoration: 'underline' }}
          >
            politique de confidentialité
          </a>{' '}
          et le traitement de mes données personnelles par TiMat.{' '}
          <span style={{ color: '#B84060', fontWeight: 700 }}>*</span>
        </span>
      </label>

      {/* Obligatoire : Mentions légales */}
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={mentions}
          onChange={e => {
            setMentions(e.target.checked)
            handleChange(politique, e.target.checked)
          }}
          style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: '#B8622F' }}
        />
        <span style={{ fontSize: 13, color: '#2C1F14', lineHeight: 1.5 }}>
          J'accepte les{' '}
          <a
            href="/mentions-legales"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#B8622F', textDecoration: 'underline' }}
          >
            conditions générales d'utilisation
          </a>
          .{' '}
          <span style={{ color: '#B84060', fontWeight: 700 }}>*</span>
        </span>
      </label>

      {/* Optionnel : Newsletter */}
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={newsletter}
          onChange={e => setNewsletter(e.target.checked)}
          style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: 'pointer', accentColor: '#B8622F' }}
        />
        <span style={{ fontSize: 12, color: '#6B4F3A', lineHeight: 1.5 }}>
          J'accepte de recevoir les actualités et conseils TiMat par email. (optionnel)
        </span>
      </label>

      <div style={{ fontSize: 11, color: '#A68970', marginTop: 4 }}>
        * Champs obligatoires — Vos données sont hébergées en France et ne sont jamais vendues.
        <br />
        Vous pouvez supprimer votre compte à tout moment depuis vos paramètres.
      </div>
    </div>
  )
}


// Fonction d'enregistrement du consentement en base (à appeler après inscription)
export async function enregistrerConsentement(userId, newsletter = false) {
  const { error } = await supabase.from('consentements').insert({
    user_id: userId,
    version_politique: '1.0',
    consent_politique_confidentialite: true,
    consent_mentions_legales: true,
    consent_newsletter: newsletter,
    user_agent: navigator.userAgent,
    // ip_address : récupéré côté serveur via edge function
  })
  if (error) console.error('Erreur enregistrement consentement:', error)
}

// ─── 2. LA SUPPRESSION DU COMPTE ───────────────────────────────────────────
// Elle vivait ici en double, jamais importee, et appelait delete_user_account
// avec un parametre « user_id » que la fonction ne connait pas (elle attend
// « p_user_id ») : utilisee, elle aurait echoue a chaque fois. La seule
// version est SupprimerCompte dans src/socle.jsx, qui previent aussi les
// familles et arrete l'abonnement Stripe.
