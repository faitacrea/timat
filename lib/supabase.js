// ═══════════════════════════════════════════════════════════
// lib/supabase.js — la connexion Supabase, et rien d'autre
// ═══════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://akicyckmbsjnewnvvcil.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || ''

// UN TÉMOIN QUAND LA CLÉ MANQUE.
//
// « npm run build » sans VITE_SUPABASE_KEY produit un bundle qui ne peut ouvrir
// aucune session : l'application retombe sur la page vitrine, sans rien dire.
// Les contrôles navigateur, eux, cherchent leurs boutons et rapportent des KO
// qui n'existent pas — c'est arrivé deux fois, dont une où j'ai accusé du code
// sain. Et en production, un déploiement sans la clé donnerait une vitrine
// muette où personne ne peut se connecter, sans trace dans la console.
//
// Ce témoin ne change rien à ce que voit une utilisatrice. Il dit la vérité à
// qui regarde : la console, et scripts/jeu-de-donnees.mjs (BUNDLE_TESTABLE).
if (!SUPABASE_KEY) {
  if (typeof window !== 'undefined') window.__TIMAT_SANS_CLE = true
  console.error('TiMat : VITE_SUPABASE_KEY est absente de ce bundle. Aucune session ne peut être ouverte.')
}

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
