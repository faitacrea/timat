-- Le planning periscolaire d'un enfant : la semaine type (matin, midi, soir,
-- mercredi) et, pour chaque periode de vacances scolaires, si le parent
-- souhaite y confier son enfant. Applique le 30 septembre 2026.
--
-- Une ligne par enfant, comme fiche_urgence et projet_accueil : le planning
-- est un document, pas un journal d'evenements.
--
-- Le parent ET l'assistante maternelle peuvent le modifier : c'est le parent
-- qui sait quand il a besoin d'un accueil, et l'assistante maternelle qui
-- tient le planning au quotidien. La colonne « modifie_par » garde qui a
-- touche en dernier, parce que ces heures sont aussi son salaire.
create table if not exists public.planning_periscolaire (
  enfant_id   uuid primary key references public.enfants(id) on delete cascade,
  semaine     jsonb not null default '{"matin":[],"midi":[],"soir":[],"mercredi":false}'::jsonb,
  vacances    jsonb not null default '{}'::jsonb,
  zone        text  not null default 'C',
  updated_at  timestamptz not null default now(),
  modifie_par uuid references public.profiles(id)
);

comment on table public.planning_periscolaire is
  'Semaine type d''accueil periscolaire et souhaits de garde pendant les vacances scolaires. Modifiable par le parent comme par l''assistante maternelle ; modifie_par garde la trace du dernier auteur, ces heures etant aussi un salaire.';

alter table public.planning_periscolaire enable row level security;

create policy planning_peri_lecture on public.planning_periscolaire
  for select using (exists (
    select 1 from public.enfants e
    where e.id = planning_periscolaire.enfant_id
      and (e.asmat_id = (select auth.uid()) or e.parent_id = (select auth.uid()))));

create policy planning_peri_insert on public.planning_periscolaire
  for insert with check (exists (
    select 1 from public.enfants e
    where e.id = planning_periscolaire.enfant_id
      and (e.asmat_id = (select auth.uid()) or e.parent_id = (select auth.uid()))));

create policy planning_peri_update on public.planning_periscolaire
  for update using (exists (
    select 1 from public.enfants e
    where e.id = planning_periscolaire.enfant_id
      and (e.asmat_id = (select auth.uid()) or e.parent_id = (select auth.uid()))))
  with check (exists (
    select 1 from public.enfants e
    where e.id = planning_periscolaire.enfant_id
      and (e.asmat_id = (select auth.uid()) or e.parent_id = (select auth.uid()))));

-- Pas de politique DELETE : un planning se vide, il ne se supprime pas. La
-- suppression de l'enfant emporte la ligne (on delete cascade).
