-- LE MANDAT DU PARENT EMPLOYEUR, ET LE JOURNAL DES TRANSMISSIONS.
-- Applique le 30 septembre 2026.
--
-- Pour transmettre une declaration a l'URSSAF, un tiers declarant doit detenir
-- un mandat explicite de l'EMPLOYEUR (L.133-11, R.133-43, R.133-44 CSS).
-- L'employeur, c'est le parent — pas l'assistante maternelle, qui est la
-- salariee.
--
-- Ne pas confondre avec declarations_pajemploi, qui existe deja : celle-la
-- porte une case que le parent coche pour dire « j'ai declare de mon cote ».
-- Elle se decoche. Une transmission, non : c'est un acte adresse a l'URSSAF.

create table if not exists public.mandats_pajemploi (
  id          uuid primary key default gen_random_uuid(),
  enfant_id   uuid not null references public.enfants(id) on delete cascade,
  parent_id   uuid not null references public.profiles(id),
  asmat_id    uuid not null references public.profiles(id),
  version_texte text not null,
  accorde_le  timestamptz not null default now(),
  revoque_le  timestamptz,
  preuve      jsonb
);

create unique index if not exists mandats_pajemploi_actif
  on public.mandats_pajemploi (enfant_id) where revoque_le is null;

alter table public.mandats_pajemploi enable row level security;

create policy mandats_lecture on public.mandats_pajemploi
  for select using (exists (
    select 1 from public.enfants e
    where e.id = mandats_pajemploi.enfant_id
      and (e.asmat_id = (select auth.uid()) or e.parent_id = (select auth.uid()))));

-- SEUL LE PARENT MANDATE : verifie a l'insertion, cote base, plutot que de
-- compter sur l'ecran. Prouve le 30 septembre 2026 en se mettant dans la peau
-- de l'assistante maternelle : les deux tentatives ont ete refusees.
create policy mandats_parent_donne on public.mandats_pajemploi
  for insert with check (
    parent_id = (select auth.uid())
    and exists (select 1 from public.enfants e
                where e.id = mandats_pajemploi.enfant_id
                  and e.parent_id = (select auth.uid())));

create policy mandats_parent_revoque on public.mandats_pajemploi
  for update using (parent_id = (select auth.uid()))
  with check (parent_id = (select auth.uid()));

-- Pas de politique DELETE : un mandat se revoque en datant revoque_le. L'effacer
-- reviendrait a effacer la preuve qu'une declaration etait autorisee le jour ou
-- elle est partie.

create table if not exists public.transmissions_pajemploi (
  id          uuid primary key default gen_random_uuid(),
  enfant_id   uuid not null references public.enfants(id) on delete cascade,
  mois        text not null,
  mandat_id   uuid references public.mandats_pajemploi(id),
  statut      text not null default 'en_attente'
              check (statut in ('en_attente','transmise','refusee','erreur')),
  accuse      text,
  message     text,
  envoye_le   timestamptz not null default now(),
  repondu_le  timestamptz
);

create index if not exists transmissions_pajemploi_enfant_mois
  on public.transmissions_pajemploi (enfant_id, mois);

alter table public.transmissions_pajemploi enable row level security;

-- Lecture seule pour les deux parties, AUCUNE ecriture depuis le navigateur :
-- un client qui pourrait ecrire ici pourrait inscrire « transmise » sans que
-- rien ne parte.
create policy transmissions_lecture on public.transmissions_pajemploi
  for select using (exists (
    select 1 from public.enfants e
    where e.id = transmissions_pajemploi.enfant_id
      and (e.asmat_id = (select auth.uid()) or e.parent_id = (select auth.uid()))));
