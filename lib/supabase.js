import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://akicyckmbsjnewnvvcil.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_mP5OBPADGTnq7IcsB3lJ5A_sCzq5naT'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export const seConnecter = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export const seDeconnecter = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export const getProfil = async (userId) => {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data
}

export const inscrireAsmat = async (email, password, prenom, nom) => {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { prenom, nom, role: 'asmat' } }
  })
  return { data, error }
}

export const inscrireParent = async (email, password, prenom, nom) => {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { prenom, nom, role: 'parent' } }
  })
  return { data, error }
}
