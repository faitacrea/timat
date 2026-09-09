-- Applique le 9 septembre 2026 sur le projet akicyckmbsjnewnvvcil.
--
-- Pourquoi : le calendrier ne savait pas dire combien d'heures d'accueil une
-- journee d'absence de l'assistante maternelle faisait perdre. Sans cette
-- donnee, la retenue sur salaire prevue par l'article 111 de la convention
-- collective (IDCC 3239) ne pouvait pas etre calculee.
--
-- Colonne nullable et additive : les evenements sans effet sur la paie
-- (rendez-vous, sortie, conges) la laissent vide, et les lignes existantes
-- restent valides. Reversible par « alter table ... drop column heures ».

alter table public.evenements add column if not exists heures numeric;

comment on column public.evenements.heures is
  'Heures d''accueil perdues ce jour. Base de la retenue pour absence (CCN 3239 art. 111). NULL si l''evenement n''affecte pas la paie.';
