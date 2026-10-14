# Passation — session du 22 septembre au 13 octobre 2026

Une session de travail avec Sophie Lefort sur TiMat, de la PR #146 à la
PR #252 : **100 modifications fusionnées**, toutes déployées sur
www.timat.app. Ce fichier sert de point de départ à la session suivante.

## Qui, quoi

- **TiMat** (www.timat.app) : application pour assistantes maternelles et
  parents employeurs — contrat, pointage signé des deux côtés, salaire
  mensualisé, congés payés, indemnités, bulletins, récapitulatif Pajemploi.
  Pro à 9,99 €/mois quel que soit le nombre d'enfants, 2 mois offerts sans
  carte ; gratuit pour 1 enfant (sans bulletins ni Pajemploi) ; parents
  gratuits.
- **Sophie** : fondatrice, CAP petite enfance, **agrément en préparation**
  (ne jamais écrire qu'elle est agréée). Entrepreneur individuel (EI),
  régime micro-entrepreneur, SIRET 902 648 088 00026. Elle n'utilise pas de
  terminal.

## Ses règles permanentes

1. Être honnête et précis, avec de vraies informations ; chercher sur le net
   avant de répondre ; sources officielles et citées.
2. Toujours comparer avec ses concurrents directs : Pandi-Panda, Nounou-Top,
   AssmatZen, Mam360 (et MAM App pour les MAM).
3. Ne jamais lui demander la clé de service Supabase.
4. Ne jamais modifier le schéma de la base de production sans son accord
   explicite (et le dire dans le compte rendu quand c'est fait).
5. Ne jamais désactiver la vérification TLS ni contourner le proxy.
6. Ne rien programmer sur ses réseaux (Metricool) sans son accord explicite.
7. Aucune photo d'enfant sur les réseaux.
8. Méthode : prouver chaque barrière en cassant volontairement le code ;
   audit en fin de travail ; commits en français qui disent pourquoi ; PR
   ouverte, aperçu Vercel au vert, fusion (squash), vérification en
   production ; vérifier les codes de sortie ; jamais de test navigateur
   dans `npm run build` ; ne jamais dire « aucune erreur » — dire
   précisément ce qui est vérifié.

## Repères techniques

- Construire : `VITE_SUPABASE_KEY="verification-locale" npm run build` →
  code 0 et audit « Aucune anomalie. » (tests Node + audit inclus).
- Contrôles navigateur : `npx vite preview --port 4173 --host 127.0.0.1`,
  puis `node scripts/<controle>.mjs` ; la CI navigateur est
  `.github/workflows/controles-navigateur.yml`.
- Textes légaux : après modification, `node scripts/empreinte-legale.mjs --ecrire`,
  date `MAJ_DOCUMENTS_LEGAUX` (data/documents-legaux.js) et date de
  `public/confidentialite.html` (l'audit vérifie qu'elles concordent).
- Vercel Hobby : 12 fonctions maximum ; `api/_*.js` sont des modules, pas
  des fonctions. Ne pas ajouter de fichier de fonction.
- Le proxy de l'environnement bloque beaucoup de sites (mam360.fr,
  facebook.com, instagram.com, plusieurs .gouv) : passer par la recherche web.
- Identifiants (non secrets) : Supabase `akicyckmbsjnewnvvcil` (Paris) ;
  Vercel équipe `team_RtgE3GvC9MI93wJASvENljPE`, projet
  `prj_dAewWDgybJnz9vsGyZgutqJpPvKO` ; Metricool marque `7382551`
  (Europe/Paris, Page Facebook `832950663238296`, Instagram `timat_app`).
- Connecteurs disponibles en fin de session : Metricool (marque « Timat »)
  et Stripe (reconnecté par Sophie le 13 octobre : la session suivante peut
  vérifier elle-même le webhook, les e-mails clients et le pied de page des
  factures).
- Kit réseaux : `docs/reseaux-sociaux/kit-reseaux.html`, publié aussi sur
  https://claude.ai/artifact/BPTUbrHqAeVPDfs2w6cc5J ; images des
  publications en ligne sur `https://www.timat.app/reseaux/`.

## Ce qui a été fait, par thème

- **Site et vitrine** (#146–#165, #189, #200–#202) : thème marine, hero de la
  maquette, 2 mois offerts sans carte, version bureau, une seule police,
  page parents, comparatif et grille tarifaire de Pandi-Panda prise à la
  source, prix lisible, HTML de l'accueil lisible par les moteurs.
- **Documents et outils** (#166–#173, #177) : registre des médicaments,
  reprise d'un contrat en cours, autorisations parentales signées, récap
  fiscal, abattement, liste d'attente réellement en base, modèles PMI, QR
  de la page publique.
- **Données qui se perdaient en silence** (#183–#188, #215, #216) : coches
  vertes avant enregistrement, quinze écritures sans contrôle d'erreur,
  pannes lues comme « aucune donnée », fiches écrasées, fichiers survivant à
  une suppression, pages blanches.
- **Sécurité** (#190, #220–#222, #250) : clé de maintenance distribuée par
  une page publique, quatre portes d'API ouvertes, courriels envoyables à
  n'importe qui par n'importe quel compte.
- **Paie et convention collective** (#227, #231–#235, #238–#240, #242–#244) :
  bulletin incohérent avec la déclaration URSSAF, CMG plafonné par un article
  abrogé, majoration, indemnité de rupture (1/80e des salaires BRUTS, deux cas
  d'exclusion), préavis, arrondi Pajemploi, 1er mai payé double, minimum du
  mois appliqué à toute la paie, départ avant l'arrivée.
- **Pajemploi et URSSAF** (#195–#199, #210, #212) : mandat accordé par le
  parent seul, dossier d'habilitation, courriel à l'URSSAF relu et complet.
- **Organisation de l'application** (#191–#193, #204–#209) : notifications
  push, menu, planning périscolaire, onglets regroupés et renommés.
- **Contrôles automatiques** (#162, #168, #217–#219, #223, #225, #229, #230) :
  365 boutons cliqués, back-office, contrôles navigateur en CI, audit qui
  bloque.
- **Textes légaux et RGPD** (#176, #178–#182, #194, #213, #236, #241, #252) :
  une seule adresse de contact, purge RGPD réelle, courriels
  d'authentification en français, adresses, SIRET, hébergeur, mention
  « Entrepreneur individuel (EI) ».
- **Comptes et argent** (#245, #249, #251, #252) : invitations des parents
  réparées ; suppression de compte qui arrête l'abonnement Stripe et prévient
  les familles (15 jours, export, rappel J-3) ; webhook Stripe qui fait
  réessayer Stripe si la base est en panne ; retour après paiement sur la
  bonne adresse.
- **Réseaux sociaux** (#247, #252 et la PR de ce jour) : kit complet (Page,
  groupe, Instagram), 21 visuels, lien Instagram sur le site, série 2 prête
  pour Metricool.

## Base de production modifiée pendant la session (avec l'accord de Sophie)

Voir les PR #178 (purge RGPD), #221 (durcissement des fonctions), #245
(invitations : `claim_invite_token`, `claim_invitations`,
`get_or_create_share_token`), #244 (`modify_and_validate_pointage_as_parent`)
et #249 (colonne `profiles.suppression_prevue_le` protégée par
déclencheur, fonctions `fermetures_prevues()` et
`supprimer_compte_programme()` réservée à la clé de service).

## Session du 14 octobre 2026

- **Blog — 7 paragraphes en double dans 3 articles en ligne** (coût réel,
  salaire net/brut, déclaration Pajemploi) : une ancienne correction avait
  réécrit le premier morceau sans retirer les suivants. Corrigés dans des
  BROUILLONS (`drafts.9e6b8b20-…`, `drafts.7bc11c82-…`,
  `drafts.fa1cc744-…`) ; **la publication attend l'accord de Sophie** (le
  garde-fou de la session a refusé de publier sans elle). Barrière ajoutée à
  l'audit (catégorie blog, non bloquante) : elle signale ces 7 paragraphes
  tant que les corrections ne sont pas publiées, et aucun autre.
- **Blog — 8 nouveaux brouillons** ajoutés à la file (voir
  `docs/ordre-publication-blog.md`) : la file tient désormais jusqu'au
  27 octobre environ. Couvertures fabriquées (`scripts/couvertures-blog.mjs`)
  et servies depuis `public/couvertures-blog/` ; **reste à les importer dans
  Sanity** (`dataset_assets_upload_from_url` depuis
  `https://www.timat.app/couvertures-blog/<slug>.png`) puis à poser
  `imageCouverture` (+ `alt`) sur chaque brouillon. L'envoi direct est bloqué
  par le proxy de l'environnement (mcp.sanity.io refusé).
- **Purge quotidienne en panne depuis le 29/09** : `borne_tentatives` n'a pas
  de colonne `id` ; la purge demandait les `id` effacés et échouait chaque
  jour. Corrigé (`cle: 'jeton'`), le test vérifie désormais aussi la colonne
  renvoyée (prouvé en cassant). Vérifier au passage du cron de 7 h UTC que
  l'erreur « borne_tentatives.id does not exist » a disparu.
- **Sécurité** : les 18 fonctions SECURITY DEFINER signalées par Supabase ont
  été relues ; celles qui touchent aux données d'autrui (`get_recipient_email`,
  `get_parent_contact`, `create_notification`, `delete_user_account`,
  `fichiers_anciens`, `quota_stockage`, `fermetures_prevues`) vérifient toutes
  `auth.uid()`. Restent signalés, non traités : search_path non fixé sur deux
  fonctions de déclencheur, et la protection contre les mots de passe divulgués
  (réglage Auth, à activer par Sophie dans Supabase).
- **URSSAF (tierce déclaration)** : aucun courriel envoyé trouvé dans le Gmail
  de Sophie (elle a sans doute écrit depuis contact@timat.app). Aucun délai
  officiel publié. Conseil donné : relancer vers le 4 novembre (3 semaines),
  en réponse au premier envoi.

## Ce qu'il reste à faire

**Sophie**
- Stripe : portail client FAIT (annulation en fin de période) ; e-mail
  d'échec de paiement ACTIVÉ. **13 octobre, fait par Claude avec l'accord
  de Sophie** : webhook créé sur le compte réel (`we_1UQ7Pu1AsEXBU0aLwngtYYAI`,
  `https://www.timat.app/api/webhook`, événements
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`) ; son secret est dans la variable Vercel
  `STRIPE_WEBHOOK_SECRET` (désormais « Sensitive », Production + Preview) ;
  `STRIPE_PRICE_ID` = `price_1U00xu1AsEXBU0aL9ARcyMVN` (Timat Pro 9,99 €/mois,
  mode réel), remis le 13/10 au soir. **Découverte : la production tournait sur des clés de TEST.**
  L'ancien `STRIPE_PRICE_ID` (`price_1TGyFp1pl8ynUceg2B9qDm3y`) n'existe pas
  sur le compte réel ; les trois variables Stripe dataient du 31 mars, avant
  la création du prix réel (août). Aucun abonnement ni paiement réel à ce
  jour ; un seul profil a un `stripe_customer_id`, absent du compte réel
  (test de Sophie). **FAIT le 13/10 au soir** : Sophie a remplacé
  `STRIPE_SECRET_KEY` par la clé du mode réel (date de modification vérifiée
  dans Vercel, valeur jamais lue) ; Claude a remis le prix réel et redéployé
  la production. `STRIPE_PUBLISHABLE_KEY` est encore la clé de test, mais le
  code ne l'utilise nulle part. **RESTE** : le vrai test d'abonnement de
  Sophie, puis vérifier dans Stripe la livraison au webhook
  (`pending_webhooks: 0`) et en base le passage en Pro, puis le
  remboursement. Également vu : e-mail et adresse d'assistance
  vides dans les informations publiques, ni logo ni icône. Non lisibles par
  l'API (à vérifier à l'écran) : reçu « Paiements réussis » et pied de page
  des factures.
- Facebook : finir « À propos » ; envoyer le lien direct de la Page (pour
  l'ajouter au site) ; vérifier ce qui a déjà été publié sur la Page et dans
  le groupe.
- Instagram : relier le compte à la Page Facebook ; vérifier la grille (I1 à
  I5 publiés ?).
- Série 2 VALIDÉE et PROGRAMMÉE le 13 octobre (accord de Sophie) : 15
  publications Metricool à 20 h 30 — P1 à P5 sur la Page du 19 au 23 octobre
  (Instagram les avait déjà, capture du 13 octobre), puis 6 à 10 sur la Page
  ET Instagram les 26, 28, 30 octobre, 2 et 4 novembre. Vérifié : 15
  publications « Pending », aucun doublon. Groupe (programmé par Sophie
  dans Facebook, vérifié sur ses captures) : G2 sondage le 14/10, G3 rappel
  du minimum le 15/10, G4 sondage le 19/10, G5 sondage le 20/10, tous à
  10 h 30, conformes au kit. Le commentaire G5 (année complète/incomplète)
  est à poster à la main sous le sondage le 20/10. G1 (bienvenue,
  épinglée) n'était NI publié NI programmé au 13/10 au soir : texte redonné
  à Sophie pour publication immédiate, avant le sondage du 14/10.
- Facultatif : clés Vercel en « Sensitive » (le garde-fou de la session a
  bloqué Claude ; procédure dans la conversation du 12 octobre).
- Décisions produit en attente : gratuité, offre intermédiaire, offre MAM
  (Sophie préfère attendre pour la MAM).

**Claude, à la prochaine session**
- Vérifier dans Metricool que les publications du 19 octobre sont bien
  parties (statut), puis préparer la série 3 (Sophie valide avant).
- Ajouter le lien de la Page Facebook au site (`data/coordonnees.js`,
  pied de page, `sameAs` de `index.html`) quand Sophie l'envoie.
- Après le vrai test Stripe : vérifier en base `stripe_customer_id`,
  `subscription_status`, puis le retour en gratuit après résiliation.
- Points mineurs connus : `profiles.role` n'est pas protégé par le
  déclencheur (risque faible) ; le jeu de données de test utilise
  `signe_asmat_at` au lieu de la vraie colonne `date_signature_asmat`.
