// ═══════════════════════════════════════════════════════════
// lib/supabase.js — Connexion et fonctions Supabase pour TiMat
// ═══════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://akicyckmbsjnewnvvcil.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_mP5OBPADGTnq7IcsB3lJ5A_sCzq5naT'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
})

// ─── AUTH ─────────────────────────────────────────────────

export const inscrireAsmat = async ({ email, password, prenom, nom }) => {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { role: 'asmat', prenom, nom } }
  })
  if (error) throw error
  return data
}

export const inscrireParent = async ({ email, password, prenom, nom }) => {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { role: 'parent', prenom, nom } }
  })
  if (error) throw error
  return data
}

export const seConnecter = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export const seDeconnecter = async () => { await supabase.auth.signOut() }

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export const getProfil = async (userId) => {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data
}

// ─── ENFANTS ──────────────────────────────────────────────

export const getEnfants = async (asmId) => {
  const { data, error } = await supabase.from('enfants').select('*').eq('asmat_id', asmId).order('prenom')
  if (error) throw error
  return data || []
}

export const getEnfantsParent = async (parentId) => {
  const { data, error } = await supabase.from('enfants').select('*').eq('parent_id', parentId)
  if (error) throw error
  return data || []
}

export const ajouterEnfant = async (enfant) => {
  const { data, error } = await supabase.from('enfants').insert(enfant).select().single()
  if (error) throw error
  return data
}

// ─── TRANSMISSIONS ────────────────────────────────────────

export const getTransmissions = async (enfantId, date = null) => {
  let q = supabase.from('transmissions').select('*').eq('enfant_id', enfantId).order('created_at')
  if (date) q = q.eq('date', date)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export const ajouterTransmission = async ({ enfantId, auteurId, auteurRole, texte, mood }) => {
  const { data, error } = await supabase.from('transmissions').insert({
    enfant_id: enfantId, auteur_id: auteurId, auteur_role: auteurRole, texte, mood,
    date: new Date().toISOString().slice(0,10),
    heure: new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})
  }).select().single()
  if (error) throw error
  return data
}

// ─── PHOTOS ───────────────────────────────────────────────

export const uploaderPhoto = async (enfantId, fichier) => {
  const nom = `${enfantId}/${Date.now()}-${fichier.name}`
  const { error: e1 } = await supabase.storage.from('photos').upload(nom, fichier)
  if (e1) throw e1
  const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(nom)
  const { data, error: e2 } = await supabase.from('photos').insert({
    enfant_id: enfantId, url: publicUrl, date: new Date().toISOString().slice(0,10)
  }).select().single()
  if (e2) throw e2
  return data
}

export const getPhotos = async (enfantId) => {
  const { data } = await supabase.from('photos').select('*').eq('enfant_id', enfantId).order('created_at', { ascending: false })
  return data || []
}

// ─── POINTAGES ────────────────────────────────────────────

export const getPointages = async (enfantId) => {
  const { data } = await supabase.from('pointages').select('*').eq('enfant_id', enfantId).order('date', { ascending: false })
  return data || []
}

export const sauvegarderPointage = async ({ enfantId, arrivee, depart, total }) => {
  const { data, error } = await supabase.from('pointages').upsert({
    enfant_id: enfantId, date: new Date().toISOString().slice(0,10),
    arrivee, depart, total, valide: true
  }, { onConflict: 'enfant_id,date' }).select().single()
  if (error) throw error
  return data
}

// ─── MESSAGES ─────────────────────────────────────────────

export const getMessages = async (enfantId) => {
  const { data } = await supabase.from('messages').select('*').eq('enfant_id', enfantId).order('created_at')
  return data || []
}

export const envoyerMessage = async ({ enfantId, expediteurId, texte }) => {
  const { data, error } = await supabase.from('messages').insert({
    enfant_id: enfantId, expediteur_id: expediteurId, texte
  }).select().single()
  if (error) throw error
  return data
}

export const ecouterMessages = (enfantId, callback) => {
  return supabase.channel(`messages-${enfantId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `enfant_id=eq.${enfantId}` },
      (payload) => callback(payload.new))
    .subscribe()
}

// ─── BILANS ───────────────────────────────────────────────

export const sauvegarderBilan = async ({ enfantId, type, contenu, trimestre = null }) => {
  const { data, error } = await supabase.from('bilans').insert({
    enfant_id: enfantId, type, contenu, trimestre, date: new Date().toISOString().slice(0,10)
  }).select().single()
  if (error) throw error
  return data
}

export const envoyerBilan = async (bilanId) => {
  await supabase.from('bilans').update({ envoye: true, envoye_at: new Date().toISOString() }).eq('id', bilanId)
}

// ─── PMI ──────────────────────────────────────────────────

export const getMessagesPMI = async (asmId) => {
  const { data } = await supabase.from('messages_pmi').select('*').eq('asmat_id', asmId).order('created_at')
  return data || []
}

export const envoyerMessagePMI = async ({ asmId, texte }) => {
  const { data, error } = await supabase.from('messages_pmi').insert({
    asmat_id: asmId, de: 'asmat', texte, lu: true
  }).select().single()
  if (error) throw error
  return data
}

// ─── NOTIFICATIONS ────────────────────────────────────────

export const getNotifications = async (userId) => {
  const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
  return data || []
}

export const marquerNotifLue = async (id) => {
  await supabase.from('notifications').update({ lu: true }).eq('id', id)
}
