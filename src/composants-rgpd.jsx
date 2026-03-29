// ═══════════════════════════════════════════════════════════════════════
// TIMAT — Composants RGPD React
// 1. ConsentementRGPD  → case à cocher à l'inscription
// 2. SupprimerCompte   → bouton suppression avec confirmation
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


// ─── 2. BOUTON SUPPRESSION COMPTE ───────────────────────────────────────────
// Usage : <SupprimerCompte onDeleted={() => navigate('/')} />

export function SupprimerCompte({ onDeleted }) {
  const [etape, setEtape] = useState('idle') // idle | confirm1 | confirm2 | deleting | done | error
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState('')
  const MOT_CONFIRM = 'SUPPRIMER'

  const handleSupprimer = async () => {
    if (confirmation !== MOT_CONFIRM) return
    setEtape('deleting')
    setErreur('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      // Appel de la fonction PostgreSQL SECURITY DEFINER
      const { error } = await supabase.rpc('delete_user_account', {
        user_id: user.id
      })

      if (error) throw error

      // Déconnexion locale
      await supabase.auth.signOut()
      setEtape('done')

      setTimeout(() => {
        onDeleted?.()
      }, 2000)

    } catch (err) {
      console.error('Erreur suppression:', err)
      setErreur(err.message || 'Une erreur est survenue. Contactez privacy@timat.app')
      setEtape('error')
    }
  }

  // ── État initial
  if (etape === 'idle') {
    return (
      <div style={{
        background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 20
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#991B1B', marginBottom: 8 }}>
          ⚠️ Zone de danger — Suppression du compte
        </div>
        <div style={{ fontSize: 13, color: '#6B4F3A', marginBottom: 16, lineHeight: 1.6 }}>
          La suppression est <strong>définitive et irréversible</strong>. Toutes vos données
          (enfants, contrats, transmissions, photos, bilans, pointages) seront effacées
          immédiatement conformément au RGPD (droit à l'effacement).
        </div>
        <button
          onClick={() => setEtape('confirm1')}
          style={{
            background: 'none', border: '1.5px solid #B84060', color: '#B84060',
            borderRadius: 8, padding: '9px 18px', cursor: 'pointer',
            fontSize: 13, fontWeight: 600
          }}
        >
          Supprimer mon compte et toutes mes données
        </button>
      </div>
    )
  }

  // ── Première confirmation
  if (etape === 'confirm1') {
    return (
      <div style={{
        background: '#FEF2F2', border: '2px solid #B84060', borderRadius: 12, padding: 20
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#991B1B', marginBottom: 12 }}>
          Êtes-vous absolument sûre ?
        </div>
        <div style={{ fontSize: 13, color: '#6B4F3A', marginBottom: 8, lineHeight: 1.7 }}>
          Cette action va supprimer <strong>définitivement</strong> :
        </div>
        <ul style={{ fontSize: 13, color: '#6B4F3A', marginBottom: 16, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Votre profil et vos informations personnelles</li>
          <li>Toutes les fiches des enfants que vous accueillez</li>
          <li>Tous les contrats, pointages, transmissions, bilans</li>
          <li>Toutes les photos du journal</li>
          <li>Tous les échanges avec les parents</li>
        </ul>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setEtape('idle')}
            style={{
              flex: 1, background: '#F7F2EC', border: '1.5px solid #DDD5C8',
              color: '#6B4F3A', borderRadius: 8, padding: '10px', cursor: 'pointer',
              fontSize: 13, fontWeight: 600
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => setEtape('confirm2')}
            style={{
              flex: 1, background: '#B84060', border: 'none',
              color: '#fff', borderRadius: 8, padding: '10px', cursor: 'pointer',
              fontSize: 13, fontWeight: 700
            }}
          >
            Oui, continuer
          </button>
        </div>
      </div>
    )
  }

  // ── Deuxième confirmation (saisie du mot)
  if (etape === 'confirm2') {
    return (
      <div style={{
        background: '#FEF2F2', border: '2px solid #B84060', borderRadius: 12, padding: 20
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#991B1B', marginBottom: 8 }}>
          Confirmation finale
        </div>
        <div style={{ fontSize: 13, color: '#6B4F3A', marginBottom: 12 }}>
          Tapez <strong style={{ fontFamily: 'monospace', color: '#B84060' }}>SUPPRIMER</strong> pour confirmer la suppression définitive.
        </div>
        <input
          type="text"
          value={confirmation}
          onChange={e => setConfirmation(e.target.value.toUpperCase())}
          placeholder="SUPPRIMER"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8, marginBottom: 12,
            border: `2px solid ${confirmation === MOT_CONFIRM ? '#B84060' : '#DDD5C8'}`,
            fontSize: 14, fontFamily: 'monospace', textAlign: 'center', boxSizing: 'border-box',
            outline: 'none'
          }}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { setEtape('idle'); setConfirmation('') }}
            style={{
              flex: 1, background: '#F7F2EC', border: '1.5px solid #DDD5C8',
              color: '#6B4F3A', borderRadius: 8, padding: '10px', cursor: 'pointer',
              fontSize: 13, fontWeight: 600
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSupprimer}
            disabled={confirmation !== MOT_CONFIRM}
            style={{
              flex: 1, background: confirmation === MOT_CONFIRM ? '#B84060' : '#DDD5C8',
              border: 'none', color: '#fff', borderRadius: 8, padding: '10px',
              cursor: confirmation === MOT_CONFIRM ? 'pointer' : 'not-allowed',
              fontSize: 13, fontWeight: 700, transition: 'background .2s'
            }}
          >
            Supprimer définitivement
          </button>
        </div>
      </div>
    )
  }

  // ── Suppression en cours
  if (etape === 'deleting') {
    return (
      <div style={{ textAlign: 'center', padding: 24, background: '#FEF2F2', borderRadius: 12, border: '1px solid #FECACA' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 14, color: '#991B1B', fontWeight: 600 }}>
          Suppression en cours…
        </div>
        <div style={{ fontSize: 12, color: '#6B4F3A', marginTop: 8 }}>
          Toutes vos données sont effacées de nos serveurs.
        </div>
      </div>
    )
  }

  // ── Suppression terminée
  if (etape === 'done') {
    return (
      <div style={{ textAlign: 'center', padding: 24, background: '#F0FDF4', borderRadius: 12, border: '1px solid #86EFAC' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 14, color: '#166534', fontWeight: 700 }}>
          Compte supprimé
        </div>
        <div style={{ fontSize: 12, color: '#6B4F3A', marginTop: 8 }}>
          Toutes vos données ont été effacées. Vous allez être redirigée.
        </div>
      </div>
    )
  }

  // ── Erreur
  if (etape === 'error') {
    return (
      <div style={{ padding: 20, background: '#FEF2F2', borderRadius: 12, border: '1px solid #FECACA' }}>
        <div style={{ fontWeight: 700, color: '#991B1B', marginBottom: 8 }}>Une erreur est survenue</div>
        <div style={{ fontSize: 13, color: '#6B4F3A', marginBottom: 12 }}>{erreur}</div>
        <button
          onClick={() => setEtape('idle')}
          style={{
            background: '#F7F2EC', border: '1.5px solid #DDD5C8', color: '#6B4F3A',
            borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13
          }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  return null
}
