-- Date de derniere modification du contrat.
--
-- Pourquoi : le PDF est ecrit une fois puis relu tel quel. L'application
-- reperait un PDF perime en comparant sa date a une date de refonte FIGEE dans
-- le code : une fois le fichier refait, le bouton de mise a jour disparaissait
-- pour de bon. Modifier ensuite le contrat — le rythme d'accueil, les
-- indemnites, qui fournit les repas — laissait donc le PDF sur ses anciennes
-- valeurs, sans aucun moyen de le regenerer.
--
-- Avec cette colonne, « perime » se compare a la derniere modification reelle :
-- toute ecriture sur le contrat rend le PDF a refaire, autant de fois qu'il le
-- faut.
alter table public.contrats
  add column if not exists updated_at timestamptz not null default now();

comment on column public.contrats.updated_at is
  'Derniere modification du contrat. Sert a savoir si le PDF stocke est perime.';

create or replace function public.contrats_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  -- La regeneration du PDF ecrit pdf_storage_path et pdf_generated_at : elle ne
  -- doit pas se compter comme une modification du contrat, sinon le document
  -- serait perime au moment meme ou il vient d'etre refait.
  if (new.pdf_generated_at is distinct from old.pdf_generated_at)
     and (to_jsonb(new) - 'pdf_generated_at' - 'pdf_storage_path' - 'updated_at')
       = (to_jsonb(old) - 'pdf_generated_at' - 'pdf_storage_path' - 'updated_at') then
    new.updated_at := old.updated_at;
  else
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists contrats_touch_updated_at on public.contrats;
create trigger contrats_touch_updated_at
  before update on public.contrats
  for each row execute function public.contrats_touch_updated_at();
