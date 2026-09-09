-- Applique le 9 septembre 2026 sur le projet akicyckmbsjnewnvvcil.
--
-- Titre professionnel « Assistant maternel - Garde d'enfants » (AM-GE).
-- L'article 113 et l'annexe 5 de la convention collective (IDCC 3239) prevoient
-- une majoration de 4 % du salaire horaire minimum pour les titulaires :
-- 4,37 EUR brut au lieu de 4,20 EUR depuis le 1er juin 2026.
--
-- Sans cette information, l'application declarait conforme un taux de 4,25 EUR
-- alors qu'il est sous le plancher d'une titulaire.
--
-- Colonne additive, par defaut fausse : les profils existants restent valides.

alter table public.profiles add column if not exists titre_amge boolean not null default false;

comment on column public.profiles.titre_amge is
  'Titulaire du titre professionnel Assistant maternel - Garde d''enfants. Majore de 4 % le salaire horaire minimum (CCN 3239, art. 113 et annexe 5).';
