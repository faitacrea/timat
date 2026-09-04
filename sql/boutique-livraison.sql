-- TiMat — livraison des documents achetés en boutique
--
-- À exécuter une fois dans l'éditeur SQL de Supabase. Déjà appliqué en
-- production ; ce fichier sert de référence et de point de départ si la base
-- devait être recréée.
--
-- Les documents vendus ne sont pas stockés ici : ils voyagent avec le
-- déploiement, embarqués dans api/_fichiers-boutique.js, et api/telecharger.js
-- les sert après vérification du jeton. Ce choix supprime l'étape manuelle de
-- téléversement — qui devait être refaite à chaque correction d'un document, et
-- laissait traîner d'anciennes versions pendant que le site annonçait la
-- nouvelle.
--
-- Cette table sert donc à deux choses : l'idempotence, parce que Stripe rejoue
-- un webhook tant qu'il n'a pas reçu de réponse et que sans garde-fou la même
-- commande partirait plusieurs fois par courriel ; et le contrôle d'accès au
-- téléchargement.

create table if not exists achats_boutique (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  email text not null,
  produits text[] not null default '{}',
  montant_centimes integer,
  -- Secret de téléchargement remis par courriel, tiré sur 32 octets.
  jeton text,
  expire_le timestamptz,
  livre_le timestamptz,
  erreur text,
  cree_le timestamptz not null default now()
);

comment on table achats_boutique is
  'Une ligne par commande de la boutique. La contrainte d''unicité sur stripe_session_id empêche une double livraison lorsque Stripe rejoue un événement.';
comment on column achats_boutique.jeton is
  'Secret de téléchargement remis par courriel. Sept jours de validité, puis le support en régénère un.';

create index if not exists achats_boutique_email_idx on achats_boutique (email);
create index if not exists achats_boutique_cree_le_idx on achats_boutique (cree_le desc);
create unique index if not exists achats_boutique_jeton_idx
  on achats_boutique (jeton) where jeton is not null;

-- Accès. Seule la clé de service — celle du webhook et de la fonction de
-- téléchargement — écrit et lit cette table. Aucune politique n'est ouverte au
-- public : une commande contient un courriel d'acheteuse, et le jeton donne
-- accès aux fichiers.
alter table achats_boutique enable row level security;
