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

## Ce qu'il reste à faire

**Sophie**
- Stripe : portail client FAIT (annulation en fin de période) ; e-mail
  d'échec de paiement ACTIVÉ. **Vérifié par le connecteur le 13 octobre
  (compte réel `acct_1TGy7E1AsEXBU0aL`) : AUCUN webhook** — liste
  `webhook_endpoints` vide, aucune destination d'événements v2, et tous les
  événements portent `pending_webhooks: 0`. Le secret `STRIPE_WEBHOOK_SECRET`
  existe pourtant dans Vercel (créé le 31 mars 2026) : il ne correspond donc
  à aucun point de réception du mode réel. Conséquence : un paiement ne
  ferait jamais passer le compte en Pro, et la boutique ne livrerait rien.
  Personne n'est touché à ce jour (aucun abonnement, aucun paiement en mode
  réel). À FAIRE AVANT LE VRAI TEST : créer la destination
  `https://www.timat.app/api/webhook` (événements
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`), copier son secret `whsec_…` dans la
  variable Vercel `STRIPE_WEBHOOK_SECRET` (Production), redéployer. Également
  vu : e-mail et adresse d'assistance vides dans les informations publiques,
  ni logo ni icône. Non lisibles par l'API (à vérifier à l'écran) : reçu
  « Paiements réussis » et pied de page des factures. Ensuite : vrai test
  d'abonnement et remboursement.
- Facebook : finir « À propos » ; envoyer le lien direct de la Page (pour
  l'ajouter au site) ; vérifier ce qui a déjà été publié sur la Page et dans
  le groupe.
- Instagram : relier le compte à la Page Facebook ; vérifier la grille (I1 à
  I5 publiés ?).
- Valider la série 2 (kit, onglet « Série 2 ») avant toute programmation.
  Montrée à Sophie le 13 octobre ; Metricool vérifié le même jour : aucune
  publication programmée.
- Facultatif : clés Vercel en « Sensitive » (le garde-fou de la session a
  bloqué Claude ; procédure dans la conversation du 12 octobre).
- Décisions produit en attente : gratuité, offre intermédiaire, offre MAM
  (Sophie préfère attendre pour la MAM).

**Claude, à la prochaine session**
- Programmer sur Metricool ce que Sophie aura validé (marque 7382551).
- Ajouter le lien de la Page Facebook au site (`data/coordonnees.js`,
  pied de page, `sameAs` de `index.html`) quand Sophie l'envoie.
- Après le vrai test Stripe : vérifier en base `stripe_customer_id`,
  `subscription_status`, puis le retour en gratuit après résiliation.
- Points mineurs connus : `profiles.role` n'est pas protégé par le
  déclencheur (risque faible) ; le jeu de données de test utilise
  `signe_asmat_at` au lieu de la vraie colonne `date_signature_asmat`.
