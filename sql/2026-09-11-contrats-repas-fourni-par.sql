-- Qui fournit les repas de l'enfant.
--
-- Pourquoi : la convention laisse les deux parties en decider, se mettre
-- d'accord sur la nature des repas, et impose que ce choix soit precise au
-- contrat. L'application ne stockait que le MONTANT de l'indemnite : un montant
-- a zero pouvait aussi bien vouloir dire « c'est l'employeur qui fournit » que
-- « l'assistante maternelle fournit sans rien demander ». Le contrat imprime
-- tranchait donc a la place des parties, sur une clause qu'elles doivent
-- convenir ensemble.
--
-- NULL = pas encore convenu ; le contrat imprime alors une ligne a completer
-- plutot qu'une affirmation.
alter table public.contrats
  add column if not exists repas_fourni_par text
  check (repas_fourni_par in ('employeur','assmat','mixte'));

comment on column public.contrats.repas_fourni_par is
  'Qui fournit les repas : employeur | assmat | mixte. NULL = non encore convenu entre les parties.';
