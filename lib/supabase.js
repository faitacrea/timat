// ═══════════════════════════════════════════════════════════
// lib/supabase.js — la connexion Supabase, et rien d'autre
// ═══════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://akicyckmbsjnewnvvcil.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
})

// CE FICHIER PORTAIT VINGT-TROIS FONCTIONS QUE PERSONNE N'APPELAIT.
//
// inscrireAsmat, seConnecter, getProfil, getEnfants, ajouterEnfant,
// uploaderPhoto, getPointages, envoyerMessage… Vingt-cinq exports, et deux
// seulement étaient importés : « supabase » — et encore, seul lui. Toute
// l'application parle directement au client.
//
// Ce n'était pas qu'inutile, c'était trompeur : uploaderPhoto et getPhotos
// écrivaient dans une table « photos » qui n'existe pas dans la base, et
// getDocuments lisait une table « documents » qui n'existe pas davantage. Du
// code mort qui vise des tables fantômes finit toujours par être recopié par
// quelqu'un qui le croit vivant.
//
// C'est le registre des tables (data/tables-donnees.js) qui les a fait sortir :
// l'audit a demandé pourquoi « photos » et « documents » n'y figuraient pas.
