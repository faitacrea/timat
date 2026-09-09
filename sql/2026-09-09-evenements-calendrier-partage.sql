-- Applique le 9 septembre 2026 sur le projet akicyckmbsjnewnvvcil.
--
-- Le calendrier n'etait visible que par l'assistante maternelle : la seule
-- politique etait « asmat_id = auth.uid() ». Cote parent, l'ecran restait donc
-- vide sur un vrai compte, et un rendez-vous ajoute par un parent ne pouvait
-- pas etre enregistre.
--
-- On reprend le modele deja en place sur « transmissions » : un auteur, une
-- lecture ouverte aux deux cotes du meme enfant, une ecriture reservee a
-- l'auteur — et bornee au calendrier auquel il est rattache, sans quoi un
-- parent pourrait deposer un evenement chez n'importe quelle assistante
-- maternelle.

alter table public.evenements add column if not exists auteur_id uuid;
alter table public.evenements add column if not exists enfant_id uuid
  references public.enfants(id) on delete cascade;

update public.evenements set auteur_id = asmat_id where auteur_id is null;

comment on column public.evenements.auteur_id is
  'Qui a cree l''evenement. Seul l''auteur peut le modifier ou le supprimer.';
comment on column public.evenements.enfant_id is
  'Enfant concerne, quand l''evenement vient d''un parent. NULL pour les evenements de l''assistante maternelle.';

drop policy if exists evenements_access on public.evenements;

create policy select_evenements on public.evenements for select using (
  auteur_id = auth.uid()
  or asmat_id = auth.uid()
  or asmat_id in (select e.asmat_id from public.enfants e where e.parent_id = auth.uid())
);

create policy insert_evenements on public.evenements for insert with check (
  auteur_id = auth.uid()
  and (
    asmat_id = auth.uid()
    or asmat_id in (select e.asmat_id from public.enfants e where e.parent_id = auth.uid())
  )
);

create policy update_evenements on public.evenements for update using (auteur_id = auth.uid());
create policy delete_evenements on public.evenements for delete using (auteur_id = auth.uid());
