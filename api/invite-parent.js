// api/invite-parent.js
// Vercel Serverless Function — invite un parent par email via Supabase

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { emailParent, prenomEnfant, prenomAsmat, enfantId, asmatId } = req.body;

  if (!emailParent || !prenomEnfant) {
    return res.status(400).json({ error: 'emailParent et prenomEnfant requis' });
  }

  try {
    // 1. Créer l'invitation dans Supabase
    const { data: invite, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        asmat_id: asmatId,
        enfant_id: enfantId,
        email_parent: emailParent,
      })
      .select()
      .single();

    if (inviteError && !inviteError.message.includes('duplicate')) {
      console.error('Invite error:', inviteError);
    }

    // 2. Inviter le parent via Supabase Auth (envoie un email automatique)
    const { error: authError } = await supabase.auth.admin.inviteUserByEmail(
      emailParent,
      {
        redirectTo: `${process.env.VITE_APP_URL || 'https://timat-rho.vercel.app'}/?invited=true`,
        data: {
          role: 'parent',
          prenom: '',
          invited_by: prenomAsmat || 'Votre assistante maternelle',
          enfant: prenomEnfant,
        }
      }
    );

    if (authError) {
      // Si l'utilisateur existe déjà, pas d'erreur critique
      if (authError.message?.includes('already been registered')) {
        return res.status(200).json({ 
          success: true, 
          message: 'Parent déjà inscrit — invitation enregistrée' 
        });
      }
      throw authError;
    }

    return res.status(200).json({ 
      success: true, 
      message: `Invitation envoyée à ${emailParent}` 
    });

  } catch (error) {
    console.error('Invite error:', error);
    return res.status(500).json({ error: error.message });
  }
}
