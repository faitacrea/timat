-- Applique le 9 septembre 2026 sur le projet akicyckmbsjnewnvvcil.
--
-- 1. Mensualisation : deux formules, pas une
-- ------------------------------------------
-- La convention collective (IDCC 3239) prevoit deux calculs, et l'application
-- n'en appliquait qu'un : celui des 52 semaines, a tous les contrats.
--   annee complete (52 semaines) : taux x heures/semaine x 52 / 12, conges
--     payes inclus dans le lissage ;
--   annee incomplete (46 semaines ou moins) : taux x heures/semaine x semaines
--     programmees / 12, conges payes verses separement.
-- Sur un accueil en annee scolaire de 36 semaines, l'application annoncait
-- 728 EUR au lieu de 504 — 44 % de trop — et les conges payes se retrouvaient
-- comptes deux fois.

alter table public.contrats add column if not exists annee_complete boolean;
alter table public.contrats add column if not exists semaines_accueil numeric;

comment on column public.contrats.annee_complete is
  'Accueil sur 52 semaines (annee complete) ou sur un nombre de semaines programmees. NULL = annee complete.';
comment on column public.contrats.semaines_accueil is
  'Semaines d''accueil programmees dans l''annee. Base de la mensualisation en annee incomplete.';

-- 2. Titre professionnel AM-GE
-- ----------------------------
-- Article 113 et annexe 5 de la CCN : + 4 % sur le salaire horaire minimum,
-- soit 4,37 EUR au lieu de 4,20 EUR depuis le 1er juin 2026.

alter table public.profiles add column if not exists titre_amge boolean not null default false;

comment on column public.profiles.titre_amge is
  'Titulaire du titre Assistant maternel - Garde d''enfants. Majore de 4 % le minimum horaire.';

-- 3. Comptes inactifs
-- -------------------
-- La politique de confidentialite annonce « signale a 2 ans, supprime apres
-- avertissement ». Rien ne le mettait en oeuvre. Cette fonction LISTE, elle ne
-- supprime pas : l'avertissement prealable reste requis.

create or replace function public.comptes_inactifs(seuil_mois integer default 24)
returns table(id uuid, email text, role text, derniere_connexion timestamptz, mois_inactivite integer)
language sql security definer set search_path = public, auth as $$
  select p.id, p.email, p.role, u.last_sign_in_at,
         (extract(epoch from (now() - coalesce(u.last_sign_in_at, u.created_at))) / 2629746)::integer
    from public.profiles p join auth.users u on u.id = p.id
   where coalesce(u.last_sign_in_at, u.created_at) < now() - (seuil_mois || ' months')::interval
   order by coalesce(u.last_sign_in_at, u.created_at) asc;
$$;

revoke all on function public.comptes_inactifs(integer) from public, anon, authenticated;
grant execute on function public.comptes_inactifs(integer) to service_role;
