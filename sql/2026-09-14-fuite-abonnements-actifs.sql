-- Applique le 2026-09-14 sur le projet akicyckmbsjnewnvvcil.
--
-- FUITE DE DONNEES PERSONNELLES — fermeture.
--
-- La vue public.abonnements_actifs exposait, pour chaque abonne :
--   nom, prenom, adresse e-mail, identifiant client Stripe, dates de paiement.
--
-- Deux choses se cumulaient :
--   1. la vue etait en SECURITY DEFINER, donc elle contournait les regles de
--      securite (RLS) de la table profiles ;
--   2. le role « anon » — celui qu'emploie la cle publique du site, sans
--      aucune connexion — avait le droit de la lire.
--
-- Mesure faite AVANT suppression, en prenant le role anon :
--   3 lignes visibles, 3 adresses e-mail, 1 identifiant Stripe.
-- Peu aujourd'hui parce que les inscriptions ne sont pas ouvertes ; autant
-- que d'abonnes ensuite.
--
-- Mesure faite APRES : un visiteur non connecte voit 0 profil, un utilisateur
-- connecte voit le sien et lui seul (1 sur 3).
--
-- La vue n'etait appelee NULLE PART : ni dans src/App.jsx, ni dans api/, ni
-- dans scripts/. Elle est donc supprimee plutot que corrigee. Un backoffice
-- qui aurait besoin de cette liste doit la lire avec la cle de service, cote
-- serveur, comme il le fait deja pour les autres donnees sensibles.
drop view if exists public.abonnements_actifs;

-- Trois fonctions SECURITY DEFINER n'avaient pas de search_path fige. Sans
-- lui, le chemin de recherche des tables depend de l'appelant : une table
-- glissee dans un schema prioritaire peut detourner ce que la fonction lit ou
-- ecrit, avec les droits de son proprietaire.
-- contrats_touch_updated_at vient de la migration du 2026-09-11 : l'oubli
-- etait de mon fait.
alter function public.handle_new_user() set search_path = public;
alter function public.rotate_app_config_backups() set search_path = public;
alter function public.contrats_touch_updated_at() set search_path = public;
