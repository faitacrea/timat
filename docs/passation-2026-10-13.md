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
  et servies depuis `public/couvertures-blog/`. **FAIT** : importées dans
  Sanity (`dataset_assets_upload_from_url` depuis
  `https://www.timat.app/couvertures-blog/<slug>.png`, l'envoi direct étant
  bloqué par le proxy) et posées sur les 8 brouillons avec un `alt` distinct
  chacun. Construction du 14/10 : l'audit ne signale plus de brouillon sans
  couverture ; seul avertissement blog restant, les 7 paragraphes en double
  ci-dessus (corrigés en brouillon, en attente de l'accord de Sophie).
- **Purge quotidienne en panne depuis le 29/09** : `borne_tentatives` n'a pas
  de colonne `id` ; la purge demandait les `id` effacés et échouait chaque
  jour. Corrigé (`cle: 'jeton'`), le test vérifie désormais aussi la colonne
  renvoyée (prouvé en cassant). **Vérifié le 16/10** dans les journaux
  Supabase : le 15/10 à 07:49 UTC, `DELETE borne_tentatives …&select=jeton`
  a répondu 200 (les journaux Vercel ne gardent qu'une heure en Hobby).
- **Sécurité** : les 18 fonctions SECURITY DEFINER signalées par Supabase ont
  été relues ; celles qui touchent aux données d'autrui (`get_recipient_email`,
  `get_parent_contact`, `create_notification`, `delete_user_account`,
  `fichiers_anciens`, `quota_stockage`, `fermetures_prevues`) vérifient toutes
  `auth.uid()`. Restent signalés, non traités : search_path non fixé sur deux
  fonctions de déclencheur, et la protection contre les mots de passe divulgués
  (réglage Auth). **Vérifié le 16/10 : réservé au plan Pro de Supabase**
  (doc officielle « Password security »), l'organisation est en plan gratuit
  — et l'application fait déjà ce contrôle elle-même (Have I Been Pwned,
  k-anonymat, `scripts/test-mdp-fuite.mjs`). Ne pas payer pour ça ; Sophie
  peut seulement aligner la longueur minimale Supabase sur celle de l'appli
  (8 caractères, lettres + chiffres).
- **URSSAF (tierce déclaration)** : aucun courriel envoyé trouvé dans le Gmail
  de Sophie (elle a sans doute écrit depuis contact@timat.app). Aucun délai
  officiel publié. Conseil donné : relancer vers le 4 novembre (3 semaines),
  en réponse au premier envoi.
  Envoyé depuis **contact.timat.app@gmail.com**, que le connecteur Gmail
  (relié à faitacreapro@gmail.com) ne lit pas : un connecteur = un compte.
  Conseillé : un filtre de transfert des courriels `urssaf.fr` vers
  faitacreapro@gmail.com.
- **Revérification du 16/10** : les 8 brouillons ont tous au moins une
  source officielle avec lien (les références de code — CASF, CGI — sont
  citées sans lien) ; ajout de la page impots.gouv.fr qui fixe les 2,65 €
  par journée d'accueil sur `attestation-fiscale`. Fiches n°2 (janvier 2026)
  et n°6 (mai 2026) lues dans le texte : non encore traitées par TiMat.
  Nounou-Top : toutes ses actualités passées en revue (plan du site) —
  fiche 5 traitée, contrôle PMI traité (rapport transmis, délai précis,
  sans la proportionnalité ni le compte rendu systématique de la fiche 3),
  rien sur les fiches 1, 2, 6. Pandi-Panda, AssmatZen (assmatzen.fr),
  Mam360 (mam360.fr) : sites inaccessibles depuis l'environnement, rien
  trouvé par recherche web.
- **Fiches PMI de la DGCS (2026) chez les concurrents** : Nounou-Top a déjà
  traité la fiche n°5 (santé, article du 15/05/2026) et le guide national des
  contrôles. Rien trouvé chez Pandi-Panda, AssmatZen, Mam360 — recherche web,
  pas une preuve d'absence. L'angle propre à TiMat : la fiche n°1 (réunion
  d'information facultative), non trouvée chez les quatre.
- **3 corrections d'articles PUBLIÉES le 16/10** sur confirmation écrite de
  Sophie (`dateMiseAJour` = 2026-10-16), production redéployée
  (`dpl_EqdGrrrGWNajS5deHYmRUrLyQUCh`) ; les 3 pages en ligne portent
  `dateModified` 2026-10-16 et l'audit local ne signale plus rien en blog.
  Purge RGPD du 16/10 07:49 UTC : les 4 suppressions ont répondu 200.

## Session du 17 octobre 2026

- **2 nouveaux brouillons** (fiches PMI n°2 et n°6), couvertures posées,
  ajoutés en fin de file : `decision-agrement-nombre-enfants-assistante-maternelle`
  (`drafts.bb4cf842-…`) et `accueillir-stagiaire-assistante-maternelle`
  (`drafts.4bd35aa4-…`). File : 13 brouillons, dernier prévu vers le 30/10.
  Construction du 17/10 : code 0, « Aucune anomalie. ».
- **Erreur trouvée dans un article en ligne** : `devenir-assistante-maternelle-agrement`
  disait que la décision d'agrément précise l'âge des enfants (contraire à
  D421-12 et à la fiche n°2). Corrigé en brouillon (`drafts.cac3c578-…`, bloc
  a012), source fiche n°2 ajoutée ; la phrase « doit être affiché à votre
  domicile », sans source trouvée, a été retirée. **Publiée le 18/10** sur
  accord écrit de Sophie, production redéployée, vérifiée en ligne.
- **Metricool vérifié le 18/10** : 15 publications en attente (10 Page
  Facebook du 19/10 au 4/11, 5 Instagram du 26/10 au 4/11), toutes en
  publication automatique, sans doublon ; textes alternatifs présents sur les
  5 Instagram, absents sur la Page (facultatif sur Facebook).
- **Nouveau concurrent signalé par Sophie** : compte Instagram
  « assmartgestion ». Instagram et les domaines devinés sont inaccessibles
  depuis l'environnement, aucune trace par recherche web : à documenter à
  partir de captures de Sophie.
- **Groupe Facebook** : G6 à G9 écrits dans le kit (22/10, 27/10, 29/10,
  3/11), d'après les fiches n°1, 5, 6 et 3. Correction : G5 tombe le
  **mardi** 20/10 (et non lundi), G4 le lundi 19/10.

## Session du 21 octobre 2026

- **Groupe Facebook** : G2 à G5 publiés par Sophie (G5 le 20/10, avec son
  commentaire). G6 à G9 transmis pour le 22/10, 27/10, 29/10 et 3/11.
- **Metricool** : P1 (19/10) et P2 (20/10) publiés sur la Page. Texte
  alternatif ajouté aux 8 publications de la Page encore à venir (même texte
  que sur Instagram quand l'image est la même) ; Sophie a ajouté elle-même
  ceux des deux déjà publiées. 13 publications en attente, sans doublon.
- **Référencement** :
  - `timat.app` (sans www) redirigeait vers `www.timat.app` en **307
    temporaire** : le domaine nu n'était pas rattaché au projet, la règle
    `permanent: true` de `vercel.json` ne s'appliquait donc jamais. Domaine
    ajouté au projet avec redirection **308** vers www (Google : 301/308 =
    signal canonique, 307 = non). Vérifié en ligne.
  - Les 308 adresses des trois sitemaps répondent 200, sans redirection,
    canonique = adresse, aucune balise noindex, aucun titre en double, toutes
    ont une description.
  - Search Console : branchée au back-office (`GSC_SERVICE_ACCOUNT`,
    `GSC_SITE_URL`), mais pas lisible depuis la session : il faut des
    captures de Sophie (Pages, Sitemaps, Performances).
- **Vercel signale « readable-secret »** sur GSC_SERVICE_ACCOUNT,
  SUPABASE_SERVICE_KEY, STRIPE_SECRET_KEY et VAPID_PRIVATE_KEY (non marquées
  « Sensitive »). Les passer en Sensitive suppose de ressaisir la valeur :
  à faire par Sophie, jamais en me transmettant les clés.

## Nuit du 21 au 22 octobre 2026

- **Search Console (captures de Sophie)** : 3 mois = 522 clics, 22,8 k
  impressions, CTR 2,3 %. Index au 12/10 : 255 indexées, 46 non (5 motifs :
  redirection, canonique correcte, explorée non indexée, double canonique,
  détectée non indexée). **Sitemap mal saisi : « /sitemap.xml. » (point
  final), type Inconnu, jamais lu** → à supprimer et renvoyer « sitemap.xml ».
- **Erreur dans l'article en ligne `jours-feries-assistante-maternelle`** :
  il disait que le paiement d'un férié ordinaire chômé dépend du contrat. La
  convention (art. 47.2) prévoit le maintien du salaire si l'assistante
  maternelle a travaillé le dernier jour prévu avant et le premier après.
  Corrigé et **publié le 22/10** sur accord écrit de Sophie (règle confirmée
  par la page Pajemploi « Tout savoir sur les jours fériés »), vérifié en ligne.
- **22/10, Search Console** : sitemap.xml renvoyé par Sophie. « Explorée, non
  indexée » = les 3 fichiers sitemap eux-mêmes (normal). « Détectée, non
  indexée » = 37 adresses, presque toutes des articles du blog et 3 pages
  locales : connues, jamais explorées. Cause plausible : l'accueil pré-affiché
  n'avait aucun lien. PR #268 : 9 liens en dur dans `index.html` + règle
  d'audit bloquante `liens-statiques` (prouvée en cassant). Vérifié en ligne.
  À suivre dans la Search Console d'ici 2 à 4 semaines.
- **22/10, PR #270** : « Page en double » (heures-complementaires, sommeil) →
  chaque page répondait aussi avec « / » final et « /index.html ». Ajout de
  `trailingSlash: false` + redirection `/:chemin+/index.html` (308, vérifié en
  production). Sommaire et rubriques du blog sans og:image → image de partage
  du site par défaut, règle d'audit `apercu` (prouvée en cassant). Liens
  internes des 308 pages : tous en 200. Aucune image sans alt, un seul h1 par
  page, aucune date de modification antérieure à la publication.
- **22/10, PR #272** : liens Page et groupe Facebook (liens de partage donnés
  par Sophie, `data/coordonnees.js`) dans le pied de page de l'accueil et du
  blog, et dans `sameAs`. Vérifié en ligne. Bio Instagram : à faire par
  Sophie (5 liens possibles). Kit : section « Canal de diffusion Instagram »
  (C1 à C3), éligibilité au canal non confirmée par une source Meta.
- **Rappels d'indexation programmés** (10 adresses par jour, 23, 24 et 25/10) :
  `trig_01SbCujjLpPG4fhFMBkDoJHn`, `trig_016eyWBEruwdfAjsi4hH3Qmi`,
  `trig_01BWDBRUKZ2DMnTucHW7RtcW`. Le 25/10 : demander une nouvelle capture
  du rapport pour la suite.
- **Groupe** : G10 à G13 écrits dans le kit (5, 10, 12 et 17/11). Rappels
  programmés dans cette session pour les commentaires G7 (27/10), G9 (3/11)
  et G11 (10/11) : `trig_01GPp6WuaCG1bdw7ZtdsQctg`, `trig_01UtaNvVuP4hphx6JBHb7NMT`,
  `trig_01R9NpUwAQjCvbcG8KpYkDnW`.

## Session du 23 octobre 2026

- **Indexation jour 1** : les 10 adresses vérifiées en 200, demandées par
  Sophie le 23/10. Jours 2 et 3 : rappels déjà programmés (24 et 25/10).
- **Bio Instagram** : liens ajoutés par Sophie le 23/10.
- **Canal de diffusion abandonné** (décision de Sophie) → stories Instagram
  à la place. Kit, section « Stories » : ST1 (sondage « désaccord sur les
  heures », image 22), ST2 (autocollant Lien vers le groupe, image 23),
  à la une « Le groupe » (couverture 24), idées de sondages suivants. Images
  produites par `generer-visuels.mjs`. Stories publiées par Sophie dans
  l'application : les autocollants ne passent pas par Metricool (API
  Instagram, selon des sources tierces, pas de page Meta trouvée).
- **Page Facebook** : ajouter le lien Instagram dans « Modifier les
  détails » ; relier le groupe à la Page depuis les paramètres du groupe
  (aide Facebook « Make a Page an admin of a Facebook group you manage »,
  illisible d'ici : proxy).
- **Groupe relié à la Page** : Sophie a choisi TiMat dans « Affiliation »
  (paramètres du groupe) le 23/10 ; selon les guides, la Page s'affiche
  alors sous la couverture du groupe (à vérifier sur l'écran).
- **ST1 et ST2 publiées** le 23/10. Kit : une story par jour du 24 au 30/10
  (images 25 à 29 : boîte à questions, sondage, quiz minimum 4,20 €,
  11 novembre art. 47.2 avec lien vers l'article, quiz Pajemploi par
  enfant) ; les 26, 28 et 30/10, partage en story des publications de
  20 h 30.
- **Rappel quotidien des stories** (demandé par Sophie) : tous les jours à
  8 h 39 (Paris), `trig_019T4fYCSVA7h4risE2danFL`. Il lit les tableaux « Une
  story par jour » du kit sur origin/main ; à désactiver si elle le demande.
- **Stories du 31/10 au 6/11** dans le kit (images 40 à 42 : quiz congés,
  rappel Pajemploi du 5/11 avec lien vers le simulateur, quiz préavis).
- **Série 3 (publications 11 à 20, images 30 à 39) VALIDÉE par Sophie le
  23/10 et PROGRAMMÉE le 24/10** dans Metricool (20 publications : Page +
  Instagram, texte alternatif sur chacune ; vérifié : 20 « Pending », aucun
  doublon ; identifiants 404814612 à 404846991). Dates :
  6, 9, 13, 16, 18, 20, 23, 27 novembre, 2 et 4 décembre à 20 h 30 (8 en
  novembre à cause de la limite de 20 publications par mois du forfait
  gratuit de Metricool). Images en ligne dans `public/reseaux/`.
  Source principale : guide assistants maternels de la DREETS
  Bourgogne-Franche-Comté (mise à jour juin 2026), lu en entier.
- **Absences de l'enfant malade (5 jours / 14 jours)** : ce guide DREETS
  (art. 105) tranche la question laissée ouverte ; publication 18 de la
  série 3, à valider par Sophie. Légifrance toujours illisible d'ici.
- **Écart relevé** : la fiche DREETS Pays de la Loire du 12/06/2026 montre
  encore le barème kilométrique de l'administration de 2022 (0,32 €) ;
  l'application utilise celui de l'arrêté du 29 mai 2026 (0,33 €), qui
  s'applique du 1er juin au 31 décembre 2026.

## Session du 24 octobre 2026

- **Indexation jour 2** : 10 adresses vérifiées en 200, envoyées à Sophie.
  Story du 24/10 rappelée (boîte à questions, image 25).
- **Série 3 programmée** (voir plus haut) après la validation de Sophie.
- **Relecture des articles du blog sur les sujets de la série 3**, contre le
  guide DREETS Bourgogne-Franche-Comté (juin 2026) et le guide CDI DREETS
  Occitanie (2024). Cinq erreurs, corrigées EN BROUILLON (publication sur
  accord écrit de Sophie seulement), `dateMiseAJour` = 2026-10-24, source
  ajoutée à chacun :
  - `indemnites-kilometriques-assistante-maternelle` : plancher 0,32 € →
    0,33 € du 1/6 au 31/12/2026 (arrêté du 29 mai 2026, +3,2 %) ;
  - `enfant-malade-absence-ce-que-le-parent-doit-payer` : « quatre mois » et
    « si votre contrat prévoit la déduction » faux → limites de 5 jours et
    14 jours (art. 105) ;
  - `rompre-contrat-assistante-maternelle-parent-employeur` et
    `periode-adaptation-assistante-maternelle-parent` : « délai de prévenance
    prévu par la convention » pendant l'essai → il n'y en a aucun ;
  - `fin-de-contrat-assistante-maternelle` : démission avant 3 mois
    d'ancienneté = pas de préavis (L. 423-26 CASF).
- **Même erreur dans le contrat imprimé par l'application** (`src/App.jsx`,
  article période d'essai) : corrigée ; nouvelle règle d'audit bloquante
  (« délai de prévenance prévu par la convention » interdit dans src/ et
  public/), prouvée en cassant (code 1) puis en réparant (code 0).
  `DOCUMENTS_REFONTE` avancé au 2026-10-24T08:37:22Z (texte faux dans un
  document signé : les contrats générés avant sont signalés périmés),
  empreinte du modèle mise à jour.
- **Nouvel article (brouillon)** `accueil-occasionnel-cdd-assistante-maternelle`
  (`drafts.ce986df4-eb9a-4476-8790-710822630019`), rubrique Contrat et paie,
  4 sources officielles, ajouté en fin de file de publication, couverture
  dans `public/couvertures-blog/`.

- **24/10, après-midi** : les 5 corrections du matin PUBLIÉES sur accord
  écrit de Sophie (« je confirme : publie les 5 corrections »). Le schéma
  Sanity refuse les liens internes relatifs (« /blog/… ») : convertis en
  « https://www.timat.app/… » (le générateur les traite comme internes).
- **Vérification de tous les articles (84 publiés)** : contrôle mécanique
  (mots doublés, espaces, guillemets, phrases répétées, longueurs SEO) sans
  défaut ; correcteur orthographique (pyspellchecker, dictionnaire FR) :
  3 fautes ; relecture des faits contre le guide DREETS
  Bourgogne-Franche-Comté (juin 2026) : 3 articles faux. Six corrections EN
  BROUILLON, à publier sur accord écrit de Sophie :
  - `indemnite-depart-retraite-assistante-maternelle` : RÉÉCRIT — l'indemnité
    n'est pas « une par famille après un an » : une seule, versée par l'APNI,
    après 10 ans dans la branche dont 60 mois sur 7 ans ; préavis de départ à
    la retraite 1 mois (6 mois-2 ans) / 2 mois (2 ans et plus) ; nouvelle
    couverture ;
  - `arret-travail-assistante-maternelle` : avec Pajemploi, c'est
    l'assistante maternelle qui envoie une attestation sur l'honneur (réponses
    des conseillers ameli), pas d'attestation de salaire obligatoire du
    parent ; un arrêt maladie ordinaire ne suspend pas le préavis ; nouvelle
    couverture ;
  - `maison-assistantes-maternelles-mam` : 1 à 6 professionnels dont 4
    simultanément (ordonnance 2021-611, réponse AN n° 9652 d'avril 2026),
    20 enfants dont 16 de moins de 3 ans ; nouvelle couverture ;
  - fautes : « dûs » → « dus » (chômage), « dénivélé » → « dénivelé »
    (visite PMI), « une représaille » → « des représailles » (tarif horaire).
- **Textes réseaux du kit** (97 textes : Page, Instagram, groupe, stories) :
  correcteur et contrôle mécanique sans défaut ; G12 (1er mars) conforme au
  guide DREETS.
- **File de publication réapprovisionnée** (« on arrive à la fin », Sophie) :
  il ne restait que 6 brouillons (dernier le 30/10). Cinq nouveaux articles
  EN BROUILLON, sur des points du guide DREETS BFC (juin 2026) que le blog ne
  traitait pas, chacun recoupé avec une seconde source officielle (ameli,
  décret n° 2026-426, DREETS Occitanie, code du travail numérique,
  pour-les-personnes-agees.gouv.fr) ; aucun lien interne ; correcteur
  orthographique passé. Ajoutés à `data/ordre-publication.js` (ordres 12 à
  16, détail et dates dans `docs/ordre-publication-blog.md`) ; ils partent
  seuls avec le cron, du 31/10 au 4/11 :
  - `conge-naissance-2026-assistante-maternelle` (`drafts.25a7cdda-b78d-46f2-bc72-47e962e0c7ed`) ;
  - `engagement-reciproque-promesse-embauche-assistante-maternelle` (`drafts.3ea3a754-2bd7-4685-8a26-762cc2594ac9`) ;
  - `conges-complementaires-non-remuneres-assistante-maternelle` (`drafts.075c9189-bf00-47f8-bf9d-2751e8cb6844`) ;
  - `conge-parental-education-assistante-maternelle` (`drafts.deae3276-eeee-4adc-a92d-306247fa50d3`) ;
  - `conge-proche-aidant-solidarite-familiale-assistante-maternelle` (`drafts.a9904241-36a6-4b55-bbd7-eff2f95d032b`).
  Couvertures dans `public/couvertures-blog/`, rattachées aux brouillons
  après le déploiement. Montants de la PreParE volontairement absents : le
  barème caf.fr n'était pas lisible depuis la session.
  **La file sera vide après le 4 novembre** : écrire d'autres brouillons
  avant (idée sans seconde source pour l'instant : art. 103, arrivée d'un
  nouvel enfant au foyer et agrément).

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
- Lien de la Page Facebook sur le site : FAIT (PR #272).
- Après le vrai test Stripe : vérifier en base `stripe_customer_id`,
  `subscription_status`, puis le retour en gratuit après résiliation.
- Points mineurs connus : `profiles.role` n'est pas protégé par le
  déclencheur (risque faible) ; le jeu de données de test utilise
  `signe_asmat_at` au lieu de la vraie colonne `date_signature_asmat`.
