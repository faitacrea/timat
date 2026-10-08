-- DURCISSEMENT DES FONCTIONS-DÉCLENCHEURS
--
-- APPLIQUÉ le 8 octobre 2026, et vérifié : les sept fonctions-déclencheurs de
-- « public » sont désormais à anon=false, authenticated=false, PUBLIC=false, et
-- toutes portent « search_path=public ».
--
-- Les déclencheurs continuent de fonctionner — vérifié pour de vrai, pas
-- supposé : une modification de contrat met toujours « updated_at » à jour
-- (le_declencheur_a_agi: true). Un déclencheur s'exécute sous l'identité du
-- propriétaire de la table, pas sous les droits de l'appelant.
--
-- Rien à refaire. Ce fichier reste comme trace de ce qui a été passé.
--
-- Ce que les advisors Supabase signalaient, et ce que j'ai vérifié avant d'y
-- toucher :
--
-- Sur les 7 fonctions-déclencheurs de « public », 3 sont exécutables par
-- « anon » (un visiteur non connecté) et par « authenticated » :
--   contrats_touch_updated_at, maj_derniere_connexion, messages_champs_immuables.
-- Les 4 autres (handle_new_user, profiles_protege_colonnes_privilegiees,
-- profiles_refuse_privileges_a_creation, rotate_app_config_backups) ne le sont
-- pas : elles montrent l'état voulu.
--
-- Honnêteté sur le risque réel : PostgreSQL refuse d'exécuter une fonction qui
-- « RETURNS trigger » en appel direct (« trigger functions can only be called
-- as triggers »). Aucun visiteur ne peut donc en tirer quoi que ce soit
-- aujourd'hui, maj_derniere_connexion comprise bien qu'elle soit SECURITY
-- DEFINER. Ce n'est pas une faille ouverte : c'est un droit accordé sans
-- raison, qui deviendrait une faille le jour où l'une d'elles serait réécrite
-- en fonction normale. On le retire, le coût est nul.
--
-- Le vrai défaut du lot est ailleurs : messages_champs_immuables n'a pas de
-- « search_path » fixé. Elle garde les champs d'un message immuables ; sans
-- search_path figé, les noms qu'elle résout dépendent de qui l'appelle. Les
-- six autres l'ont déjà (search_path=public). On la met au même niveau.

-- 1. Retirer le droit d'exécution. Il vient de DEUX endroits : le droit par
--    défaut donné à PUBLIC, et un droit nommé donné à anon/authenticated.
--    Révoquer seulement l'un des deux ne change rien — c'est pour ça que les
--    trois lignes sont là.
revoke execute on function public.contrats_touch_updated_at()  from public, anon, authenticated;
revoke execute on function public.maj_derniere_connexion()     from public, anon, authenticated;
revoke execute on function public.messages_champs_immuables()  from public, anon, authenticated;

-- 2. Figer le search_path de celle qui n'en avait pas.
alter function public.messages_champs_immuables() set search_path to 'public';

-- 3. Le contrôle. Il doit renvoyer exactement 7 lignes, toutes à « false,
--    false, false » et toutes avec « search_path=public ». Si une seule ligne
--    reste à « true », le revoke n'a pas pris.
select p.proname                                       as fonction,
       has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_peut,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as connecte_peut,
       has_function_privilege('public', p.oid, 'EXECUTE')        as tout_le_monde_peut,
       coalesce(array_to_string(p.proconfig, ', '), 'AUCUN search_path') as reglages
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prorettype = 'trigger'::regtype
order by 1;

-- Les déclencheurs continuent de fonctionner : un déclencheur s'exécute sous
-- l'identité du propriétaire de la table, pas sous les droits de l'appelant.
-- Enregistrer un message ou modifier un contrat après ce script fait foi.
