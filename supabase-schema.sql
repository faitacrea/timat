-- ════════════════════════════════════════════════════════════
-- TIMAT — Schéma Supabase complet
-- Copie-colle tout ce fichier dans Supabase > SQL Editor > Run
-- ════════════════════════════════════════════════════════════

-- ── TABLES ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('asmat', 'parent')),
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  couleur TEXT DEFAULT '#C4714A',
  agrement TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enfants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asmat_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  naissance DATE NOT NULL,
  emoji TEXT DEFAULT '👶',
  couleur TEXT DEFAULT '#3A72A8',
  allergies TEXT[] DEFAULT '{}',
  groupe_sanguin TEXT,
  medecin TEXT,
  signe BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transmissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id UUID REFERENCES enfants(id) ON DELETE CASCADE,
  auteur_id UUID REFERENCES profiles(id),
  auteur_role TEXT CHECK (auteur_role IN ('asmat', 'parent')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  heure TEXT,
  texte TEXT NOT NULL,
  mood TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id UUID REFERENCES enfants(id) ON DELETE CASCADE,
  transmission_id UUID REFERENCES transmissions(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pointages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id UUID REFERENCES enfants(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  arrivee TEXT,
  depart TEXT,
  total TEXT,
  valide BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enfant_id, date)
);

CREATE TABLE IF NOT EXISTS repas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id UUID REFERENCES enfants(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  dejeuner TEXT,
  gouter TEXT,
  biberon TEXT,
  notes TEXT,
  qualite TEXT CHECK (qualite IN ('bien', 'peu', 'refus')),
  UNIQUE(enfant_id, date)
);

CREATE TABLE IF NOT EXISTS changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id UUID REFERENCES enfants(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  heure TEXT,
  type TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS sommeils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id UUID REFERENCES enfants(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  debut TEXT,
  fin TEXT,
  duree TEXT,
  qualite TEXT CHECK (qualite IN ('bien', 'agite', 'court'))
);

CREATE TABLE IF NOT EXISTS bilans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id UUID REFERENCES enfants(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT CHECK (type IN ('journee', 'trimestriel')),
  trimestre TEXT,
  contenu TEXT NOT NULL,
  envoye BOOLEAN DEFAULT FALSE,
  envoye_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id UUID REFERENCES enfants(id) ON DELETE CASCADE,
  expediteur_id UUID REFERENCES profiles(id),
  texte TEXT NOT NULL,
  lu BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages_pmi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asmat_id UUID REFERENCES profiles(id),
  de TEXT CHECK (de IN ('asmat', 'pmi')),
  texte TEXT NOT NULL,
  email_from TEXT,
  lu BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contrats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id UUID REFERENCES enfants(id) ON DELETE CASCADE,
  debut DATE,
  fin DATE,
  heures_hebdo NUMERIC,
  taux_horaire NUMERIC DEFAULT 4.05,
  jours TEXT[],
  horaires TEXT,
  entretien NUMERIC DEFAULT 3.80,
  signe_asmat BOOLEAN DEFAULT FALSE,
  signe_parent BOOLEAN DEFAULT FALSE,
  signature_asmat TEXT,
  signature_parent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id UUID REFERENCES enfants(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  titre TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '🎨',
  competences TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jalons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id UUID REFERENCES enfants(id) ON DELETE CASCADE,
  categorie TEXT,
  texte TEXT NOT NULL,
  age_attendu TEXT,
  acquis BOOLEAN DEFAULT FALSE,
  acquis_at DATE
);

CREATE TABLE IF NOT EXISTS croissance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id UUID REFERENCES enfants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  age_mois INTEGER,
  poids NUMERIC,
  taille NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id UUID REFERENCES enfants(id) ON DELETE SET NULL,
  asmat_id UUID REFERENCES profiles(id),
  nom TEXT NOT NULL,
  categorie TEXT CHECK (categorie IN ('medical', 'admin', 'peda', 'agrement')),
  sous_type TEXT,
  url TEXT,
  taille TEXT,
  partage BOOLEAN DEFAULT TRUE,
  annee TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evenements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asmat_id UUID REFERENCES profiles(id),
  date DATE NOT NULL,
  type TEXT,
  texte TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  icone TEXT DEFAULT '🔔',
  texte TEXT NOT NULL,
  page TEXT,
  lu BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enfants ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pointages ENABLE ROW LEVEL SECURITY;
ALTER TABLE repas ENABLE ROW LEVEL SECURITY;
ALTER TABLE changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sommeils ENABLE ROW LEVEL SECURITY;
ALTER TABLE bilans ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_pmi ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrats ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE jalons ENABLE ROW LEVEL SECURITY;
ALTER TABLE croissance ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profils
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

-- Enfants : asmat et parent concerné
CREATE POLICY "enfants_access" ON enfants FOR ALL USING (
  auth.uid() = asmat_id OR auth.uid() = parent_id
);

-- Toutes les tables liées aux enfants
CREATE POLICY "transmissions_access" ON transmissions FOR ALL USING (
  enfant_id IN (SELECT id FROM enfants WHERE asmat_id = auth.uid() OR parent_id = auth.uid())
);
CREATE POLICY "photos_access" ON photos FOR ALL USING (
  enfant_id IN (SELECT id FROM enfants WHERE asmat_id = auth.uid() OR parent_id = auth.uid())
);
CREATE POLICY "pointages_access" ON pointages FOR ALL USING (
  enfant_id IN (SELECT id FROM enfants WHERE asmat_id = auth.uid() OR parent_id = auth.uid())
);
CREATE POLICY "repas_access" ON repas FOR ALL USING (
  enfant_id IN (SELECT id FROM enfants WHERE asmat_id = auth.uid() OR parent_id = auth.uid())
);
CREATE POLICY "changes_access" ON changes FOR ALL USING (
  enfant_id IN (SELECT id FROM enfants WHERE asmat_id = auth.uid() OR parent_id = auth.uid())
);
CREATE POLICY "sommeils_access" ON sommeils FOR ALL USING (
  enfant_id IN (SELECT id FROM enfants WHERE asmat_id = auth.uid() OR parent_id = auth.uid())
);
CREATE POLICY "bilans_access" ON bilans FOR ALL USING (
  enfant_id IN (SELECT id FROM enfants WHERE asmat_id = auth.uid() OR parent_id = auth.uid())
);
CREATE POLICY "messages_access" ON messages FOR ALL USING (
  enfant_id IN (SELECT id FROM enfants WHERE asmat_id = auth.uid() OR parent_id = auth.uid())
);
CREATE POLICY "contrats_access" ON contrats FOR ALL USING (
  enfant_id IN (SELECT id FROM enfants WHERE asmat_id = auth.uid() OR parent_id = auth.uid())
);
CREATE POLICY "portfolio_access" ON portfolio FOR ALL USING (
  enfant_id IN (SELECT id FROM enfants WHERE asmat_id = auth.uid() OR parent_id = auth.uid())
);
CREATE POLICY "jalons_access" ON jalons FOR ALL USING (
  enfant_id IN (SELECT id FROM enfants WHERE asmat_id = auth.uid() OR parent_id = auth.uid())
);
CREATE POLICY "croissance_access" ON croissance FOR ALL USING (
  enfant_id IN (SELECT id FROM enfants WHERE asmat_id = auth.uid() OR parent_id = auth.uid())
);
CREATE POLICY "documents_access" ON documents FOR ALL USING (
  asmat_id = auth.uid() OR
  (partage = TRUE AND enfant_id IN (SELECT id FROM enfants WHERE parent_id = auth.uid()))
);
CREATE POLICY "messages_pmi_access" ON messages_pmi FOR ALL USING (asmat_id = auth.uid());
CREATE POLICY "evenements_access" ON evenements FOR ALL USING (asmat_id = auth.uid());
CREATE POLICY "notifications_access" ON notifications FOR ALL USING (user_id = auth.uid());

-- ── TRIGGER : créer profil automatiquement à l'inscription ──

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, prenom, nom, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
    COALESCE(NEW.raw_user_meta_data->>'prenom', 'Utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── STORAGE : buckets pour les fichiers ─────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', false)
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');
CREATE POLICY "photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos' AND auth.role() = 'authenticated');
CREATE POLICY "documents_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
CREATE POLICY "documents_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND auth.role() = 'authenticated');

-- ════════════════════════════════════════════════════════════
-- ✅ TERMINÉ — Toutes les tables et politiques sont créées
-- ════════════════════════════════════════════════════════════
