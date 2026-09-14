-- Applique le 2026-09-14 sur le projet akicyckmbsjnewnvvcil.
-- Quatre migrations, appliquees dans cet ordre. Chacune se verifie elle-meme
-- et s'annule au moindre ecart de comportement.

-- ═══ 1. Index sur les cles etrangeres ═══
-- 31 cles etrangeres n'avaient aucun index. Ce n'est pas qu'une question de
-- vitesse future : la suppression d'un compte (delete_user_account, obligation
-- RGPD) parcourt une trentaine de tables sur exactement ces colonnes, et les
-- regles de securite y joignent a chaque lecture. Un index ne change aucun
-- resultat : c'est un chemin d'acces, pas une regle.
create index if not exists idx_absences_asmat_id on public.absences (asmat_id);
create index if not exists idx_absences_enfant_id on public.absences (enfant_id);
create index if not exists idx_activites_faites_asmat_id on public.activites_faites (asmat_id);
create index if not exists idx_activites_faites_enfant_id on public.activites_faites (enfant_id);
create index if not exists idx_activites_perso_asmat_id on public.activites_perso (asmat_id);
create index if not exists idx_app_config_backup_created_by on public.app_config_backup (created_by);
create index if not exists idx_bulletins_asmat_id on public.bulletins (asmat_id);
create index if not exists idx_bulletins_enfant_id on public.bulletins (enfant_id);
create index if not exists idx_bulletins_parent_id on public.bulletins (parent_id);
create index if not exists idx_changes_couches_enfant_id on public.changes_couches (enfant_id);
create index if not exists idx_consentements_user_id on public.consentements (user_id);
create index if not exists idx_contrats_asmat_id on public.contrats (asmat_id);
create index if not exists idx_contrats_enfant_id on public.contrats (enfant_id);
create index if not exists idx_contrats_parent_id on public.contrats (parent_id);
create index if not exists idx_declarations_pajemploi_parent_id on public.declarations_pajemploi (parent_id);
create index if not exists idx_enfants_asmat_id on public.enfants (asmat_id);
create index if not exists idx_enfants_parent_id on public.enfants (parent_id);
create index if not exists idx_evenements_asmat_id on public.evenements (asmat_id);
create index if not exists idx_evenements_enfant_id on public.evenements (enfant_id);
create index if not exists idx_invitations_asmat_id on public.invitations (asmat_id);
create index if not exists idx_invitations_enfant_id on public.invitations (enfant_id);
create index if not exists idx_messages_destinataire_id on public.messages (destinataire_id);
create index if not exists idx_messages_expediteur_id on public.messages (expediteur_id);
create index if not exists idx_messages_pmi_asmat_id on public.messages_pmi (asmat_id);
create index if not exists idx_paiements_user_id on public.paiements (user_id);
create index if not exists idx_pointages_asmat_id on public.pointages (asmat_id);
create index if not exists idx_trajets_asmat_id on public.trajets (asmat_id);
create index if not exists idx_trajets_enfant_id on public.trajets (enfant_id);
create index if not exists idx_transmissions_auteur_id on public.transmissions (auteur_id);
create index if not exists idx_transmissions_enfant_id on public.transmissions (enfant_id);
create index if not exists idx_versements_contrat_id on public.versements (contrat_id);

-- ═══ 2. auth.uid() evalue une fois, non par ligne ═══
-- 101 regles appelaient auth.uid() sans parentheses de sous-requete :
-- PostgreSQL la reevaluait pour CHAQUE ligne examinee. Ecrire
-- (select auth.uid()) donne exactement la meme valeur, calculee une fois.
-- Applique par un parcours de pg_policies, avec mesure du comportement avant
-- et apres sur 15 tables et tous les comptes : identique (59/46/9/0).
-- Voir la migration « rls_auth_uid_evalue_une_fois » dans l'historique Supabase.

-- ═══ 3. Regles permissives en double ═══
-- Trois tables portaient deux regles de lecture la ou une suffisait.
--   croissance    : asmat_read_croissance etait CONTENUE dans select_croissance
--   enfants       : parent_select_enfants etait CONTENUE dans select_enfants
--   fiche_urgence : deux regles complementaires, reunies en une
drop policy if exists asmat_read_croissance on public.croissance;
drop policy if exists parent_select_enfants on public.enfants;
drop policy if exists fiche_asmat_read on public.fiche_urgence;
drop policy if exists fiche_parent_sel on public.fiche_urgence;
create policy fiche_urgence_lecture on public.fiche_urgence
  for select using (
    exists (
      select 1 from public.enfants e
      where e.id = fiche_urgence.enfant_id
        and (e.asmat_id = (select auth.uid()) or e.parent_id = (select auth.uid()))
    )
  );

-- ═══ 4. Plus aucune fonction appelable sans connexion ═══
-- 18 fonctions SECURITY DEFINER etaient joignables via /rest/v1/rpc/ SANS
-- AUCUNE CONNEXION. Elles verifient toutes auth.uid() dans leur corps, donc
-- rien ne fuyait — mais une erreur future dans l'une d'elles deviendrait
-- exploitable sans compte.
--
-- Piege rencontre : « revoke ... from anon » n'a presque aucun effet, parce
-- que le droit vient de PUBLIC, a qui PostgreSQL accorde EXECUTE par defaut.
-- Il faut retirer a PUBLIC, puis redonner nommement.
--
-- Verifie dans le code avant d'agir : les 14 RPC qu'appelle l'application le
-- font toutes APRES connexion (le jeton d'invitation attend dans le navigateur
-- et n'est reclame qu'une fois connecte).
--
-- Les quatre fonctions de DECLENCHEUR (handle_new_user,
-- profiles_protege_colonnes_privilegiees, profiles_refuse_privileges_a_creation,
-- rotate_app_config_backups) ne sont appelables par personne : elles
-- s'executent seules quand une ligne change. rotate_app_config_backups, en
-- particulier, supprime des sauvegardes.
--
-- Resultat mesure : 0 fonction appelable sans connexion (contre 18),
-- 17 appelables par un connecte, le push toujours fonctionnel.
-- Voir la migration « retrait_execution_public » dans l'historique Supabase.

-- ═══ Ce qui a ete examine et DELIBEREMENT laisse tel quel ═══
--
-- Les 12 index dits « inutilises » NE SONT PAS supprimes. Ils sont signales
-- ainsi parce que la base compte trois comptes : sur une table de dix lignes,
-- PostgreSQL prefere tout lire plutot que passer par un index, quel qu'il
-- soit. Le code montre pourtant que l'application s'en sert :
--   sommeil      interroge par enfant_id (6 appels) et filtre par date
--   bilans       trie par date
--   croissance   trie par date
-- Les supprimer serait une regression le jour ou il y aura de vraies donnees.
-- idx_sommeil_enfant_id est meme un index de cle etrangere — exactement ce
-- qu'on vient d'ajouter 31 fois.

-- ═══ 5. Complement du 14 septembre (apres relecture des 17 fonctions) ═══
--
-- J'avais verifie 4 fonctions sur 17. En les relisant TOUTES, une seule ne
-- verifiait pas qui l'appelle : invitation_par_token. Elle rend l'adresse
-- e-mail du parent sur simple presentation d'un jeton, et n'est appelee nulle
-- part — ni application, ni fonction serveur, ni regle de securite.
revoke execute on function public.invitation_par_token(text) from public, anon, authenticated;

-- ATTENTION — piege evite de justesse : peut_acceder_enfant() est citee par
-- QUATRE regles de securite (documents_meta, messages x3). Une regle qui
-- appelle une fonction exige que le role interrogeant puisse l'executer.
-- Lui retirer ce droit, comme le suggerait l'avertissement, aurait casse
-- TOUTES les lectures de documents et de messages. Elle reste accessible.
-- Verifie apres coup : documents 4 lignes, messages 3 lignes, toujours lus.

-- Les quatre tables « sans regle » etaient deja fermees a tous : sans regle,
-- la securite au niveau ligne refuse tout. Mais cette fermeture etait
-- IMPLICITE — elle tenait a une absence, invisible a la lecture du schema.
-- Quelqu'un ajoutant une regle permissive demain ouvrirait la table sans s'en
-- rendre compte. On ecrit donc l'intention noir sur blanc, en RESTRICTIVE.
create policy achats_boutique_serveur_seul on public.achats_boutique
  as restrictive for all to public using (false) with check (false);
create policy prospects_serveur_seul on public.prospects
  as restrictive for all to public using (false) with check (false);
create policy seo_audit_history_serveur_seul on public.seo_audit_history
  as restrictive for all to public using (false) with check (false);
create policy support_messages_serveur_seul on public.support_messages
  as restrictive for all to public using (false) with check (false);

-- ═══ Les 12 index « inutilises » : mesure, pas opinion ═══
-- Verifie un par un : AUCUN n'est redondant. Pour chacun, les colonnes qu'il
-- couvre ne sont le prefixe d'aucun autre index de la meme table. Les
-- supprimer ferait donc perdre un chemin d'acces reel, sans rien gagner
-- d'autre qu'un avertissement en moins. Ils restent.
