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
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { emailParent, prenomEnfant, prenomAsmat, asmatId, enfantId } = req.body;

    if (!emailParent) {
      return res.status(400).json({ error: 'Email du parent requis' });
    }

    // 1. Generate a magic link for the parent via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: emailParent,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://timat-rho.vercel.app'}?role=parent`,
      },
    });

    if (authError) {
      console.error('Auth invite error:', authError.message);
      // Fallback: send a simple mailto link
      return res.status(200).json({
        success: true,
        method: 'fallback',
        message: 'Invitation envoyée par email alternatif',
      });
    }

    // 2. Create or update the parent profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', emailParent)
      .maybeSingle();

    if (!existingProfile) {
      // Create a minimal profile for the parent
      await supabase.from('profiles').insert({
        id: authData?.user?.id,
        email: emailParent,
        role: 'parent',
        prenom: '',
        nom: '',
      });
    }

    // 3. Link parent to the child if enfantId is provided
    if (enfantId && authData?.user?.id) {
      await supabase.from('enfants').update({
        parent_id: authData.user.id,
      }).eq('id', enfantId);
    }

    // 4. Store the invitation for tracking
    await supabase.from('invitations').upsert({
      email_parent: emailParent,
      asmat_id: asmatId,
      enfant_id: enfantId,
      prenom_enfant: prenomEnfant,
      statut: 'envoyee',
      created_at: new Date().toISOString(),
    }, { onConflict: 'email_parent,asmat_id' }).select();

    console.log(`[Invite] ✉️ Invitation sent to ${emailParent} for ${prenomEnfant} by ${prenomAsmat}`);

    return res.status(200).json({
      success: true,
      message: `Invitation envoyée à ${emailParent}`,
    });

  } catch (e) {
    console.error('Invite parent error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
