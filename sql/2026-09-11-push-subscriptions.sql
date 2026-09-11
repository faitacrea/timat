-- Applique le 2026-09-11 sur le projet akicyckmbsjnewnvvcil.
-- Les abonnements aux notifications push.
--
-- La table n'existait pas. L'application proposait pourtant « Activer les
-- notifications », demandait l'autorisation au navigateur, puis annoncait
-- « Notifications activees ✓ » : l'enregistrement echouait en silence et
-- personne n'a jamais recu la moindre notification.
--
-- Une personne a UN abonnement PAR APPAREIL ET PAR NAVIGATEUR : le telephone,
-- la tablette, l'ordinateur. L'identite d'un abonnement est donc son endpoint,
-- pas l'utilisateur.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  appareil text,
  created_at timestamptz not null default now(),
  derniere_utilisation timestamptz
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Chacun ne voit et ne gere QUE ses propres abonnements. Un abonnement push est
-- une adresse d'envoi vers un telephone : le lire, c'est pouvoir y ecrire.
create policy push_lire_les_siens on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy push_ajouter_les_siens on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy push_modifier_les_siens on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy push_supprimer_les_siens on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- La meme regle de lien que create_notification et get_recipient_email : on
-- ne peut notifier que soi-meme, ou quelqu'un avec qui on partage un enfant.
-- Ecrite une seule fois ici pour que le serveur d'envoi n'en invente pas une
-- troisieme version qui divergerait.
create or replace function public.peut_notifier(p_user_id uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select p_user_id = auth.uid()
     or exists (
       select 1 from public.enfants e
       where (e.asmat_id  = auth.uid() and e.parent_id = p_user_id)
          or (e.parent_id = auth.uid() and e.asmat_id  = p_user_id)
     );
$$;

grant execute on function public.peut_notifier(uuid) to authenticated;
