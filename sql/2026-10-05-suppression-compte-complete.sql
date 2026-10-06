-- LA SUPPRESSION DE COMPTE LAISSAIT NEUF TABLES DERRIÈRE ELLE.
--
-- L'application promet « Effacement immédiat » (politique de confidentialité,
-- § 4) et « Supprimer mon compte et toutes mes données ». La fonction en
-- effaçait trente-trois sur quarante-deux.
--
-- Survivaient, côté assistante maternelle :
--
--   autorisations          — les autorisations parentales, AVEC LEUR SIGNATURE
--   medicaments            — le registre des médicaments : données de santé
--   historique_mois        — le récapitulatif de salaire mois par mois
--   planning_periscolaire  — les rythmes d'accueil
--   transmissions_pajemploi— ce qui a été transmis à Pajemploi
--   contestations_pointage — les désaccords sur les heures
--   mandats_pajemploi      — LE MANDAT DE DÉCLARATION LUI-MÊME
--   demandes               — les demandes d'accueil reçues
--   push_subscriptions     — le jeton de notification du navigateur
--
-- Et le pire tient à l'ordre : « enfants » était bien supprimée, mais ces
-- tables-là sont rattachées à l'enfant. Une fois l'enfant parti, leurs lignes
-- ne sont plus rattachables à personne : ni consultables, ni exportables, ni
-- effaçables. Des données de santé et des signatures, devenues invisibles et
-- permanentes.
--
-- Côté parent employeur, trois manquaient aussi : contestations_pointage,
-- mandats_pajemploi et push_subscriptions. Le mandat Pajemploi — l'autorisation
-- de déclarer en son nom — survivait donc à la suppression de son compte.
--
-- CE QUI RESTE VOLONTAIREMENT, et que la politique annonce déjà :
--   audit_log         — journaux de connexion, 12 mois (sécurité)
--   support_messages  — 2 ans (suivi de la demande)
--   achats_boutique   — 10 ans (code de commerce, art. L123-22)
--   prospects         — 3 ans (norme CNIL prospection), et sans compte associé
--
-- Les « consentements » étaient et restent effacés avec le compte : la
-- politique annonçait 5 ans, elle est corrigée pour dire ce que le code fait.

create or replace function public.delete_user_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r_role text;
  ids_enfants uuid[];
  ids_contrats uuid[];
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Non autorise';
  end if;

  select role into r_role from profiles where id = p_user_id;

  if r_role = 'parent' then
    -- Le parent s'efface, mais l'assistante maternelle reste tenue de
    -- conserver ses propres registres pendant les durees legales : on detache
    -- le parent au lieu de detruire le dossier professionnel d'un tiers.
    update enfants   set parent_id = null where parent_id = p_user_id;
    update contrats  set parent_id = null where parent_id = p_user_id;
    update bulletins set parent_id = null where parent_id = p_user_id;
    delete from declarations_pajemploi where parent_id = p_user_id;
    delete from transmissions where auteur_id = p_user_id;
    delete from messages where expediteur_id = p_user_id or destinataire_id = p_user_id;
    delete from notifications where user_id = p_user_id;
    delete from consentements where user_id = p_user_id;
    delete from paiements     where user_id = p_user_id;
    -- Ajoutes : ils portaient le parent et lui survivaient.
    delete from contestations_pointage where parent_id = p_user_id;
    delete from mandats_pajemploi      where parent_id = p_user_id;
    delete from push_subscriptions     where user_id   = p_user_id;
    delete from profiles   where id = p_user_id;
    delete from auth.users where id = p_user_id;
    return;
  end if;

  select coalesce(array_agg(id), '{}') into ids_enfants from enfants where asmat_id = p_user_id;
  -- Les contrats sont releves AVANT d'etre supprimes : plusieurs tables s'y
  -- rattachent, et une fois le contrat parti elles seraient inatteignables.
  select coalesce(array_agg(id), '{}') into ids_contrats
    from contrats where enfant_id = any(ids_enfants) or asmat_id = p_user_id;

  delete from messages where enfant_id = any(ids_enfants)
     or expediteur_id = p_user_id or destinataire_id = p_user_id;
  delete from transmissions where enfant_id = any(ids_enfants) or auteur_id = p_user_id;
  delete from bilans              where enfant_id = any(ids_enfants);
  delete from portfolio           where enfant_id = any(ids_enfants);
  delete from jalons              where enfant_id = any(ids_enfants);
  delete from croissance          where enfant_id = any(ids_enfants);
  delete from vaccins             where enfant_id = any(ids_enfants);
  delete from fiche_urgence       where enfant_id = any(ids_enfants);
  delete from changes_couches     where enfant_id = any(ids_enfants);
  delete from repas               where enfant_id = any(ids_enfants);
  delete from sommeil             where enfant_id = any(ids_enfants);
  delete from cahier_jour         where enfant_id = any(ids_enfants) or asmat_id = p_user_id;
  delete from pointages           where enfant_id = any(ids_enfants) or asmat_id = p_user_id;
  delete from absences            where enfant_id = any(ids_enfants) or asmat_id = p_user_id;
  delete from activites_faites    where enfant_id = any(ids_enfants) or asmat_id = p_user_id;
  delete from trajets             where enfant_id = any(ids_enfants) or asmat_id = p_user_id;
  delete from declarations_pajemploi where enfant_id = any(ids_enfants);
  delete from versements          where enfant_id = any(ids_enfants) or asmat_id = p_user_id;
  delete from bulletins           where enfant_id = any(ids_enfants) or asmat_id = p_user_id;

  -- LES NEUF OUBLIEES.
  delete from autorisations          where enfant_id = any(ids_enfants);
  delete from medicaments            where enfant_id = any(ids_enfants);
  delete from historique_mois        where enfant_id = any(ids_enfants);
  delete from planning_periscolaire  where enfant_id = any(ids_enfants);
  delete from transmissions_pajemploi where enfant_id = any(ids_enfants);
  delete from contestations_pointage where asmat_id = p_user_id;
  delete from mandats_pajemploi      where asmat_id = p_user_id or enfant_id = any(ids_enfants);
  delete from demandes               where asmat_id = p_user_id;
  delete from push_subscriptions     where user_id  = p_user_id;

  delete from modifications_contrat where contrat_id = any(ids_contrats);
  delete from contrats            where id = any(ids_contrats);
  delete from documents_meta      where enfant_id = any(ids_enfants) or asmat_id = p_user_id;
  delete from invitations         where enfant_id = any(ids_enfants) or asmat_id = p_user_id;
  delete from enfants             where asmat_id = p_user_id;

  delete from evenements      where asmat_id = p_user_id;
  delete from activites_perso where asmat_id = p_user_id;
  delete from projet_accueil  where asmat_id = p_user_id;
  delete from messages_pmi    where asmat_id = p_user_id;
  delete from notifications   where user_id  = p_user_id;
  delete from consentements   where user_id  = p_user_id;
  delete from paiements       where user_id  = p_user_id;

  delete from profiles   where id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$function$;
