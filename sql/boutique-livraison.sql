-- TiMat — livraison des documents achetés en boutique
--
-- À exécuter une fois dans l'éditeur SQL de Supabase.
--
-- Deux choses ici : le bucket privé qui stocke les PDF vendus, et la table qui
-- garde trace des livraisons. Cette table sert d'abord à l'idempotence : Stripe
-- réessaie un webhook tant qu'il n'a pas reçu de réponse, et sans garde-fou la
-- même commande partirait plusieurs fois par courriel.

-- 1. Le bucket. Privé : aucun fichier n'est lisible sans URL signée, même en
--    connaissant son chemin. C'est toute la différence avec un dépôt dans
--    public/, où qui devine l'adresse télécharge sans payer.
insert into storage.buckets (id, name, public)
values ('documents-boutique', 'documents-boutique', false)
on conflict (id) do nothing;

-- 2. Le journal des livraisons.
create table if not exists achats_boutique (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  email text not null,
  produits text[] not null default '{}',
  montant_centimes integer,
  livre_le timestamptz,
  erreur text,
  cree_le timestamptz not null default now()
);

comment on table achats_boutique is
  'Une ligne par commande de la boutique. La contrainte d''unicité sur stripe_session_id empêche une double livraison lorsque Stripe rejoue un événement.';

create index if not exists achats_boutique_email_idx on achats_boutique (email);
create index if not exists achats_boutique_cree_le_idx on achats_boutique (cree_le desc);

-- 3. Accès. Seule la clé de service — celle du webhook — écrit et lit cette
--    table. Aucune politique n'est ouverte au public : une commande contient un
--    courriel d'acheteuse.
alter table achats_boutique enable row level security;
