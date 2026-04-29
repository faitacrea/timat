-- ============================================================
-- TiMat — Tables techniques restantes
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. MESSAGERIE
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enfant_id UUID REFERENCES enfants(id),
  auteur_id UUID REFERENCES profiles(id),
  auteur_role TEXT CHECK (auteur_role IN ('asmat','parent')),
  texte TEXT NOT NULL,
  heure TEXT,
  lu BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_insert" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "msg_select" ON messages FOR SELECT USING (true);
CREATE POLICY "msg_update" ON messages FOR UPDATE USING (true);
CREATE INDEX IF NOT EXISTS idx_msg_enfant ON messages(enfant_id);
CREATE INDEX IF NOT EXISTS idx_msg_created ON messages(created_at DESC);

-- 2. APP_CONFIG (si pas encore fait)
CREATE TABLE IF NOT EXISTS app_config (
  id TEXT PRIMARY KEY,
  config JSONB,
  updated_at TIMESTAMPTZ
);
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "app_config_all" ON app_config FOR ALL USING (true) WITH CHECK (true);

-- 3. SUPPORT MESSAGES (si pas encore fait)
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  prenom TEXT,
  nom TEXT,
  role TEXT DEFAULT 'asmat',
  sujet TEXT DEFAULT 'Autre',
  message TEXT NOT NULL,
  prioritaire BOOLEAN DEFAULT false,
  statut TEXT DEFAULT 'nouveau',
  reponse TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "support_insert" ON support_messages FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "support_read" ON support_messages FOR SELECT USING (true);

-- 4. DOCUMENTS META (si pas encore fait)
CREATE TABLE IF NOT EXISTS documents_meta (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asmat_id UUID REFERENCES profiles(id),
  enfant_id UUID REFERENCES enfants(id),
  categorie TEXT DEFAULT 'admin',
  sous_type TEXT,
  nom TEXT NOT NULL,
  taille TEXT,
  storage_path TEXT,
  storage_url TEXT,
  partage BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE documents_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "docs_meta_insert" ON documents_meta FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "docs_meta_select" ON documents_meta FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "docs_meta_delete" ON documents_meta FOR DELETE USING (auth.uid() = asmat_id);

-- 5. Activer Realtime sur messages (pour la messagerie en temps réel)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 6. INVITATIONS (pour le flux parent)
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_parent TEXT NOT NULL,
  asmat_id UUID REFERENCES profiles(id),
  enfant_id UUID,
  prenom_enfant TEXT,
  statut TEXT DEFAULT 'envoyee' CHECK (statut IN ('envoyee','acceptee','expiree')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email_parent, asmat_id)
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_insert" ON invitations FOR INSERT WITH CHECK (true);
CREATE POLICY "inv_select" ON invitations FOR SELECT USING (true);
CREATE POLICY "inv_update" ON invitations FOR UPDATE USING (true);

-- 7. Ajouter colonnes Stripe à profiles (si pas encore fait)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscription_status') THEN
    ALTER TABLE profiles ADD COLUMN subscription_status TEXT DEFAULT 'free';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='stripe_customer_id') THEN
    ALTER TABLE profiles ADD COLUMN stripe_customer_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscription_updated_at') THEN
    ALTER TABLE profiles ADD COLUMN subscription_updated_at TIMESTAMPTZ;
  END IF;
END $$;
