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
- **Vérifications de fin de journée (24/10)** : PR #279 fusionnée ; les 5
  couvertures répondent en 200 (image/png) sur www.timat.app et sont
  rattachées aux brouillons (requête Sanity : les 11 brouillons de la file
  ont une image et un texte alternatif). Les 5 corrections du matin sont
  lues en ligne (API publique et pages du blog). Metricool : 30 publications
  en attente du 26/10 au 4/12, une par réseau et par date, aucun doublon
  (série 2 : 26/10 → 4/11 ; série 3 : 6/11 → 4/12).
- **Indexation jour 2** : le matin, seule une notification était partie,
  sans les adresses ; liste redonnée en entier à Sophie le 24/10 en fin de
  matinée. Conseil donné : ne PAS demander l'indexation de
  `indemnite-depart-retraite-assistante-maternelle` tant que sa correction
  n'est pas publiée (la version en ligne est fausse).
- **24/10, après-midi — « je confirme : publie les 6 corrections »** : retraite,
  arrêt de travail, MAM, chômage, visite PMI, tarif PUBLIÉS et relus en ligne.
  La page retraite peut être indexée.
- **Indexation** : quota Google dépassé pour Sophie le 24/10 ; seule
  `retraite-assistante-maternelle-trimestres-ircem` était déjà indexée. Rappel
  du 25/10 (`trig_01BWDBRUKZ2DMnTucHW7RtcW`) réécrit : les 8 restantes + la
  page retraite corrigée + `formation-obligatoire-120-heures` ; nouveau rappel
  le 26/10 (`trig_01WBYgTYWpoL97XdsZdC5dRS`) : reste de l'ancienne liste du
  jour 3 + `arret-travail` corrigée, puis demander une nouvelle capture.
- **Revérification générale (« re vérifie tout »)** :
  - PR #281 (fusionnée, vérifiée en production) : écran « Fin de contrat » —
    retrait de « Démission du parent » et « Rupture amiable » (rupture
    conventionnelle inapplicable, DREETS BFC fiche 10-IV) ; démission sans
    préavis avant 3 mois (CASF L. 423-26) ; retraite 1 mois / 2 mois
    (art. 63-2-2), sans indemnité de rupture ; fin de CDD avec précarité 10 %
    (aussi sur le reçu). Simulateur public corrigé (démission < 3 mois) et
    complété (retraite). Barrières : test-retenue, verif-calculs-identiques
    (durées comparées en toutes lettres), parcours-documents-imprimes.
  - Chiffres revérifiés : SMIC 12,31 € et MG 4,35 € (arrêté du 22 mai 2026,
    pas de revalorisation depuis) ; CMG 4,91 € / 8,09 € (1/4/2026) ;
    allocation de formation 5,57 € (Iperia) ; abattement fiscal par période de
    SMIC (précédent BOFiP 2012).
  - Brouillons de la file : 5 avaient des liens relatifs (« /blog/… »),
    convertis ; `rupture-conventionnelle` disait 8 jours de préavis pour une
    démission avant 3 mois (corrigé) ; `attestation-fiscale` : phrase non
    sourcée « le CMG de décembre est versé en janvier » remplacée.
  - Pages départements « devenir » (98) : « extrait de casier judiciaire »
    → attestation d'honorabilité ; 80 h dans les 6 mois (8 dans les petits
    départements, D. 421-44) ; renouvellement « au moins quatre mois avant »
    (D. 421-19).
  - Article `devenir-assistante-maternelle-agrement` : même correction
    (casier → honorabilité) EN BROUILLON, attend l'accord écrit de Sophie.
  - Non tranché : date de généralisation de l'attestation d'honorabilité
    (1/10/2025 dans `data/documents-assmat.json`, 1/1/2026 dans l'article
    honorabilité ; un centre de gestion évoque une transition jusqu'au
    31/12/2026 pour les assistants maternels). Arrêté du 8 juillet 2024 non
    lisible depuis la session : ne rien changer sans le texte.
- **24/10, soir — « Je confirme : publie la correction Devenir assistante
  maternelle »** : PUBLIÉE (casier → attestation d'honorabilité, 4 liens
  relatifs convertis), lue en ligne.
- **Stripe** : Sophie « laisse le test d'abonnement » pour l'instant (24/10).
  Ne plus le relancer ; il reste à faire le jour où elle le décide.
- **Simulateurs de fin de contrat des concurrents** (recherche web ; sites de
  Pandi-Panda, AssmatZen et Mam360 injoignables depuis la session) :
  - Pandi-Panda : un « simulateur de préavis » (durée et date de fin selon
    le motif et l'ancienneté), motifs non vérifiables ;
  - Nounou-Top : outil de calcul dans son service ; sa page « démission » se
    contredit (tableau « aucun préavis » avant 3 mois, FAQ « 8 jours ») ; sa
    page des motifs n'a ni durée de préavis pour la retraite, ni fin de CDD ;
  - AssmatZen, Mam360 : aucun simulateur de fin de contrat trouvé.
  - Idée proposée à Sophie (non faite) : calculer aussi la DATE de fin du
    préavis à partir de la date de la lettre, comme Pandi-Panda.

## Session du 26 octobre 2026

- **Indexation** : listes du 25/10 (10, faites le 26 au matin) et du 26/10
  (seules 1 et 2 faites : `formation-continue-58-heures`,
  `developpement-moteur` ; quota dépassé ensuite, parce que les deux listes
  ont été faites le même jour). Le quota semble glissant sur 24 h (une
  dizaine de demandes ; chiffre non officiel, Google ne le publie pas).
  Capture du rapport « Détectée, actuellement non indexée » : 37 adresses,
  toutes vérifiées (200, présentes dans les sitemaps, pas de noindex,
  canonique juste) — aucun défaut technique, c'est l'exploration qui attend.
  Rappels programmés : 27/10 (`trig_01LY9LRLPSFVHbzNwgSACH6R`), 28/10
  (`trig_01YbwdWvNDjzuJVkYLLJsAL7`), 29/10 (`trig_01KsrS1YcpEnqcEEBYPjQMkm`),
  avec les 8 restantes du 26, le reste des 37, les nouveaux articles du cron
  et les pages corrigées le 24/10. Nouvelle capture à demander vers le 2/11.
- **Stories / Metricool** : Metricool publie seul les publications du fil
  (Page et Instagram). Le « partage en story » du kit (lundi, mercredi) est
  un geste FACULTATIF de Sophie dans l'application. Metricool sait
  programmer une story à part (voir plus bas), mais pas « partager » une
  publication en story.
- **Chasse aux erreurs (suite)** :
  - **Mensualisation sur 47 semaines** : le simulateur de salaire (défaut 47)
    et le vérificateur de bulletin multipliaient par 47 en année complète —
    658 € au lieu de 728 € pour 40 h à 4,20 € ; le vérificateur jugeait donc
    « exacte » une mensualisation trop basse. Les ~100 pages « tarif » des
    départements chiffraient leurs écarts sur 156,7 h au lieu de 173,3 h.
    Tout corrigé (année complète = 52 semaines, congés compris ; au-delà de
    46 semaines saisies, on retient 52), modèle « ct1 » corrigé. Barrières :
    règle d'audit bloquante (« paie ») et cas « 47 semaines » dans
    verif-calculs-identiques, prouvées en cassant (code 1 / KO 658 contre
    728) puis en réparant.
  - **Engagement réciproque** (modèle de lettre r8 de l'application) : il
    disait que la convention ne le prévoit pas et que le dédit se négocie.
    Article 93 : facultatif, dédit = un demi-mois de salaire brut, pas dû si
    décès de l'enfant ou retrait/suspension/non-renouvellement de
    l'agrément. Modèle réécrit ; règle d'audit bloquante prouvée.
  - Articles corrigés EN BROUILLON (accord écrit de Sophie attendu) :
    `calcul-mensualisation-assistante-maternelle` (formule 52 semaines ;
    régularisation seulement en année incomplète, définitive en fin de
    contrat — DREETS BFC fiche 11-IV, Occitanie FAQ 3.23-3.25) et
    `salaire-assistante-maternelle-par-departement` (173,3 h : écarts 76 €,
    149 €, 315 € au lieu de 69, 135, 285 ; « plancher légal » → « minimum
    conventionnel »).
  - **Publiés le 26/10** avec l'accord écrit de Sophie (« Je confirme
    publier les deux corrections ») : les deux articles ci-dessus, vérifiés
    en ligne (52 semaines ; 173,3 h).
- **Date de fin du préavis** (demandée par Sophie, comme Pandi-Panda) :
  PR #285. Simulateur public ET écran « Fin de contrat » de l'application
  (champ « Date de départ du préavis », bouton « Reporter en date de fin »,
  PR #286). Règle Service-Public F33164 : le jour de première présentation
  compte ; un mois finit la veille du même quantième ; sans veille dans le
  mois d'arrivée (départ un 31), dernier jour du mois — cas qu'aucun texte
  ne règle, dit tel quel dans l'article. Vérifié en production :
  31/01/2027 → 28 février ; 13/02/2023 → 12 mars (exemple Service-Public).
- **Relecture des écrans et documents (PR #286, #287)** :
  - contrat imprimé : démission avant 3 mois sans préavis (DREETS ARA
    18/03/2024), échelle retraite (art. 63-2-2), année incomplète lissée sur
    douze mois et versée même un mois sans accueil, date de paie « convenue
    entre les parties » (et non « au plus tard à la fin du mois »).
    DOCUMENTS_REFONTE avancé au 26/10 12:24:40 UTC : les contrats générés
    avant sont signalés périmés (même décision que le 24/10) ;
  - registre des médicaments : cinq vérifications (R2111-1), annexe au
    contrat ; projet d'accueil (PDF et modèle de l'application) : aucun
    écran avant 3 ans, RPE au lieu de « RAM », ~30 accents manquants ;
  - bulletin : conservation sans limite pour le salarié (R. 3243-5), cinq
    ans pour l'employeur (L. 3243-4) — deux endroits ;
  - lettre de renouvellement d'agrément adressée au président du conseil
    départemental, au moins 3 mois avant (D. 421-19) ; aide « solde de tout
    compte » : vrai chemin (Paie & Contrats > Contrats > Fin de contrat) ;
  - attestation France Travail : l'adresse « findecontrat-pajemploi » et
    « les agences refusent le papier » n'étaient pas vérifiables → démarche
    officielle (espace Pajemploi, transmission automatique) ;
  - **documents VENDUS** : ils sont embarqués dans `api/_fichiers-boutique.js`
    et n'avaient pas suivi la correction (décodés depuis main : « position
    sur les écrans », « quatre conditions »). Réembarqués ; le module porte
    l'empreinte des générateurs et l'audit bloque si elle ne correspond plus.
    **Toute correction de `generer-documents.mjs` ou `generer-kit.py` doit
    être suivie de `npm run documents && npm run documents:kit && npm run
    documents:embarquer`**, sinon la construction s'arrête ;
  - barrières d'audit bloquantes (catégorie `modele-contrat`) sur chacune
    de ces phrases, prouvées en cassant ; `parcours-contrat` réparé (son PDF
    « à jour » datait du 30/09, il échouait depuis le 24/10) ;
    `rendre-contrat` réparé.
- **Vérifiés sans erreur trouvée** : textes du groupe G1 à G13 (minimum
  4,20 €, plancher 3,46 €, fériés art. 47.2, congés au 1er mars) ;
  publications programmées du 26/10 au 4/11 (congés payés, crédit d'impôt,
  heures majorées, indemnité de rupture, offre 2 mois).
- **Article `projet-accueil-assistante-maternelle`** : correction EN
  BROUILLON (« sa position sur les écrans » → l'interdiction avant trois
  ans ; source Service-Public A18388). À publier sur accord écrit de Sophie.
- **4 nouveaux brouillons** (ordres 17 à 20, 5 au 8 novembre, détail dans
  `docs/ordre-publication-blog.md`) : écrans interdits avant 3 ans
  (`drafts.ee763e6d-978f-4b71-958b-c2aa9cec0ddf`), régularisation en année
  incomplète (`drafts.30acbb42-f2ac-4834-ab1b-3638e81e6467`), date de fin du
  préavis (`drafts.d7b4073e-0d96-45a9-b101-952f8b4edd59`), arrivée d'un bébé
  et article 103 (`drafts.fe6c81c7-4980-4582-9ce1-8f610c0a79ed`).
  Couvertures dans `public/couvertures-blog/` (PR #288), importées dans
  Sanity depuis www.timat.app (l'envoi direct est bloqué) et posées sur les
  4 brouillons avec un texte alternatif chacun (FAIT le 26/10).
- **Stories automatiques** (demande de Sophie) : l'API Metricool sait
  programmer une STORY (image seule, sans autocollant ni lien) sur la Page
  et sur Instagram. Mais le plan gratuit compte 20 publications par mois et
  par réseau, et novembre en a déjà 20 : les stories ne partiraient pas.
  Choix laissé à Sophie : passer au plan payant de Metricool (environ 16 €
  HT par mois en annuel, chiffre de sources tierces, à vérifier sur
  metricool.com) ou programmer les stories elle-même dans Meta Business
  Suite (gratuit). Rien n'est programmé sans son accord.
- **Coquille Instagram** : la légende de présentation porte
  « #parentemployeur petiteenfance » (dièse manquant) ; Sophie peut la
  corriger dans Instagram (« … » > Modifier).

## Session du 26 (soir) et du 27 octobre 2026

Réponses de Sophie (26/10) : stories en **plan gratuit, option B** (elle les
programme dans Meta Business Suite, Claude fournit les images) ; « Je
confirme, publie la correction projet d'accueil » ; elle corrige elle-même la
légende Instagram (hashtag) ; demandes : un nouveau brouillon, le motif
« arrivée d'un enfant au foyer » et le calcul de la régularisation dans
l'écran Fin de contrat.

- **Publié** (accord écrit) : `projet-accueil-assistante-maternelle`
  (écrans interdits avant 3 ans ; lien relatif converti), vérifié en ligne.
- **PR #290, en production** (vérifiée par `parcours-documents-imprimes`
  lancé contre www.timat.app) :
  - régularisation en année incomplète (art. 109-2 et 124) dans l'écran Fin
    de contrat : heures faites saisies (heures pointées proposées, plafonnées
    chaque semaine à la durée du contrat), heures payées proposées
    (heures mensualisées × mois du contrat) ; le manque se paie, le
    trop-perçu reste acquis ; le montant entre dans le dixième des congés,
    l'indemnité de rupture, la précarité, le total et le reçu ;
  - motif « Arrivée d'un enfant au foyer de l'assistante maternelle »
    (art. 103) : sans préavis ni indemnité de rupture ;
  - **défaut corrigé** : les mois du contrat se comptent dates incluses
    (DREETS BFC : 1er septembre → 31 mai = 9 mois ; l'écran en trouvait 8,
    ce qui amputait le brut, les congés acquis, et refusait l'indemnité de
    rupture à 9 mois tout juste) ; l'ancienneté du préavis se lit au jour de
    la lettre quand elle est saisie ;
  - retiré : le bouton « Envoyer au parent » du solde de tout compte, qui
    affichait « Envoyé ✓ » sans rien envoyer ;
  - passe `parcours-documents-imprimes:annee-incomplete` ajoutée au
    workflow (son mode n'était pas lu quand l'intégration continue le passe).
- **Metricool** : la publication Facebook du 6/11 (préavis) disait que
  l'ancienneté s'apprécie à la première présentation ; la DREETS BFC dit « au
  jour de l'envoi de la lettre ou de sa remise en main propre ». Texte
  corrigé (même date, même image), Instagram inchangé (il n'en parle pas).
- **Stories (option B)** : 12 images 1080 × 1920, une par publication du
  28/10 au 27/11 (`docs/reseaux-sociaux/visuels/43` à `54`), mêmes chiffres
  et mêmes sources que la publication du jour, avec « Le détail : notre
  publication du jour ». Générées par `generer-visuels.mjs` (les anciens
  visuels, redessinés au pixel près, ont été remis tels quels). Envoyées à
  Sophie avec les étapes Meta Business Suite ; à programmer vers 20 h 35,
  après la publication de 20 h 30. Rien programmé par Claude.
- **Nouveau brouillon** : `recu-solde-de-tout-compte-assistante-maternelle`
  (`drafts.9af96d05-339a-4e7e-a136-dd6ca8271292`), ordre 21, 9 novembre ;
  couverture dans `public/couvertures-blog/`, à importer dans Sanity une
  fois déployée.
- **Indexation du 27/10** : liste de 10 envoyée (toutes en 200), en tête
  d'un long message. Sophie a d'abord écrit « J'ai fait l'indexation jusqu'au
  numéro 10 », puis a RECTIFIÉ : elle ne l'avait pas faite, la liste lui
  ayant échappé. Liste redonnée seule, en premier, le 27/10 au matin :
  **les 10 indexations sont FAITES** (Sophie, 27/10 après-midi). Leçon : la
  liste d'indexation se donne dans un message à part, en premier.
- **Stories refaites le 27/10** à la demande de Sophie (« il y a un espace au
  milieu, qu'est-ce que je dois mettre ? J'aimerais juste repartager les
  publications ») : les images 43 à 54 montrent désormais la publication du
  jour elle-même, en grand, au milieu (images identiques octet pour octet à
  celles que Metricool publie, `www.timat.app/reseaux/`). L'espace vide des
  images 25 à 29 et 40 à 42 reste : il sert à l'autocollant (quiz, sondage).
  Réponse donnée : Metricool et Meta Business Suite ne se relient pas ; aucun
  réglage d'Instagram ne repartage seul une publication en story (recherche
  du 27/10) ; deux façons de faire, au choix de Sophie : programmer d'avance
  les images 43 à 54 dans Meta Business Suite (20 h 35), ou repartager à la
  main dans Instagram après 20 h 30 (avion en papier → Ajouter à votre story).
- **Pas d'autocollant « Quiz »** sur le compte Instagram de Sophie (27/10 :
  seulement « Sondage » et « Questions »). Les quiz du kit (27, 29, 40, 42)
  deviennent des sondages à trois réponses, et la bonne réponse se donne le
  soir avec une story « Réponse » (images 55 à 57, texte centré) ; pour 42,
  c'est la publication du 6/11. Kit mis à jour en conséquence.
- **Règle des stories** (Sophie, 27/10, « on fait toujours comme ça ») :
  story du jour envoyée chaque jour (rappel `trig_019T4fYCSVA7h4risE2danFL`,
  consigne réécrite : image à la fin du message, sondage au lieu de quiz) ;
  stories à programmer envoyées 5 jours avant la fin de la série (rappel
  `trig_01Ax8g28ipqvukL3RXpg7Hm1`, le 22/11 pour la série qui finit le
  27/11). Règle copiée dans CLAUDE.md.
- Couverture du brouillon `recu-solde-de-tout-compte-assistante-maternelle` :
  importée dans Sanity et posée (FAIT le 27/10).
- **G7** : commentaire posté par Sophie sous le sondage du groupe (27/10).
- **Stories programmées par Sophie** dans Meta Business Suite jusqu'au
  **6/11 à 20 h 35** ; au-delà, Meta refuse la date. Pas de chiffre officiel
  trouvé pour la version gratuite ; ce qui est officiel : depuis septembre
  2026, l'abonnement payant Meta One (offre Advanced, à partir de 49,99 $
  par mois) vend la programmation des stories jusqu'à 30 jours à l'avance
  (annonce Meta, about.fb.com, septembre 2026 — page non ouvrable depuis la
  session, lue par extrait de recherche). Constat : environ 10 jours en
  gratuit. On ne paie pas : on programme par tranches. Rappel du **1/11**
  (`trig_016Ufx8g9ArFdo5gaqSmDnv5`) : renvoie les stories 48 à 54 avec les
  étapes ; Sophie programme jusqu'à la première date refusée et donne la
  dernière date acceptée ; le rappel suivant se pose 5 jours avant.
- **Quiz « comme un quiz, bonne réponse en vert »** (Sophie, 27/10) : les
  images 27, 29, 40, 42 montrent la question et les réponses A, B, C ;
  autocollant Sondage « A / B / C » sous « Votez juste en dessous » ; le
  soir, images 55 à 58 (58 = préavis, nouvelle) : même question, bonne
  réponse en vert avec coche, autres estompées, explication et source.
  Fonctions `quiz` et `quizReponse` de `generer-visuels.mjs`. Chiffres
  revérifiés (DREETS BFC juin 2026 : préavis 8 j / 15 j / 1 mois ; 2,5 jours
  ouvrables par mois). Rappel quotidien `trig_019T4fYCSVA7h4risE2danFL`
  réécrit en conséquence (les deux images à la fin du message).
- **Familiarisation** (Sophie, 27/10, dit par la puéricultrice de PMI) :
  confirmé par le référentiel national de la qualité d'accueil du jeune
  enfant (avril 2025, publié le 2/07/2025, p. 16-17) : « La notion de
  familiarisation est préférée à celle d'adaptation » ; il refuse le
  protocole rigide et la présence progressive « 1 heure puis un repas »,
  préfère une présence parentale prolongée et des moments répétés. La
  convention collective garde « période d'adaptation » (art. 94 : « peut
  être comprise dans l'éventuelle période d'essai », 30 jours calendaires
  au plus, horaires fixés au contrat, heures non faites déduites du salaire
  mensualisé, art. 108.1 et 111 ; DREETS BFC fiche 1). Fait :
  - projet d'accueil imprimé (`ecrans-secondaires.jsx`) : « Période de
    familiarisation », sans le protocole « Jour 1 : 1 h avec le parent… » ;
  - contrat imprimé : « période d'adaptation, dite aussi période de
    familiarisation », salaire par déduction des heures non faites (il
    disait « calculé sur les heures réellement effectuées ») ;
    `DOCUMENTS_REFONTE` = 2026-10-27T12:25:33Z, empreinte c3d7ecb1d15310d4 ;
  - barrière d'audit (projet d'accueil + clause), prouvée en cassant le code ;
  - kit : publication 17 (23/11, période d'essai) avec la familiarisation et
    le référentiel en source. **Le texte programmé dans Metricool n'est PAS
    modifié** : demander l'accord de Sophie avant.
  - **5 brouillons Sanity, à publier sur accord écrit** :
    `periode-adaptation-assistante-maternelle-parent` (titre, section
    « Adaptation ou familiarisation », méthode du référentiel, FAQ, 2
    sources) ; `periode-adaptation-essai-assistante-maternelle` ; ces deux
    articles affirmaient à tort que l'adaptation est « toujours » dans
    l'essai (« il ne peut pas y avoir d'adaptation sans période d'essai ») ;
    `quand-chercher-mode-de-garde`, `budget-mensuel-parent-employeur-…`
    (« facturées à l'heure réelle » corrigé), `vaccins-obligatoires-…`
    (vocabulaire). Adresses (slugs) inchangées : déjà indexées.
  - Concurrents : Nounou-Top, 62 actualités, aucune sur le sujet ;
    Pandi-Panda, AssmatZen, Mam360 injoignables depuis la session, rien
    trouvé par recherche. La CAF (caf.fr) écrit encore « adaptation ».
- **27/10 au soir, réponses de Sophie** :
  - « Je confirme, publier les 5 corrections familiarisation » : **publiées**
    (dates de mise à jour au 27/10 ; les liens internes relatifs de trois
    articles convertis en adresses complètes, exigées par la validation
    Sanity). Le blog se régénère au déploiement (`public/blog/` n'est pas
    versionné) : vérifié en ligne après la fusion de la PR suivante.
  - Accord pour la publication du 23/11 : **modifiée dans Metricool** (même
    date 20 h 30, même image ; Facebook `408240807`, Instagram `408242179`,
    « Pending ») : familiarisation + référentiel en source, comme le kit.
  - **Quiz** : « je ne veux pas une image le matin et une le soir ; un quiz
    où ils ont la réponse directement, vert ou rouge, sur le moment ». Seul
    l'autocollant Quiz d'Instagram le fait. Il manque sur son compte ;
    astuce rapportée par Storrito (2026, non officielle) : l'ajouter dans un
    Reel en brouillon, il revient ensuite dans les autocollants des
    stories. Images 27, 29, 40, 42 refaites : la question, « Touchez la
    bonne réponse juste en dessous », la place de l'autocollant, la source ;
    les réponses vont dans l'autocollant. 55 à 58 deviennent l'explication,
    publiée juste après (facultatif), jamais le soir. Repli si le Quiz
    reste introuvable : Sondage + explication tout de suite après. Kit, rappel
    quotidien et CLAUDE.md à jour. **À noter ici** : si l'astuce a marché.
  - Plan Meta Business Suite confirmé (rappel du 1/11).
  - Commentaire Instagram d'`epimeno.care` sous la publication congés payés
    (« C'est clair et utile, merci pour ce rappel ») : réponse proposée à
    Sophie, à poster elle-même.
- **28/10** :
  - Indexation du 28/10 : liste envoyée seule (10 adresses, toutes en 200) ;
    Sophie la fait le 28 au soir. **À noter ici** : jusqu'à quel numéro. Le
    rappel du 29/10 (`trig_01KsrS1YcpEnqcEEBYPjQMkm`) est décalé au 29/10 à
    21 h 13 (Paris) pour laisser passer le quota glissant d'environ 24 h.
  - **Quiz** : l'astuce du Reel en brouillon n'a rien donné, l'autocollant
    Quiz reste introuvable. Repli adopté : image quiz + Sondage, puis TOUT
    DE SUITE l'image réponse (55 à 58, bonne réponse en vert). Images 27,
    29, 40, 42 : « Votez juste en dessous » + « La bonne réponse : sur la
    story suivante ». Kit, rappel quotidien et CLAUDE.md à jour.
  - **Chasse** :
    - titre professionnel : l'avenant n° 10 du 5/02/2026 (étendu, Légifrance
      KALIARTI000054254156) vise « Assistant maternel – Assistant parental »
      (AM-AP) ; l'application, le vérificateur de bulletin et un article ne
      parlaient que de l'ancien « Garde d'enfants » (AM-GE). La DREETS Pays
      de la Loire (12/06/2026) cite encore l'ancien titre avec l'avenant n° 9.
      Corrigé (les deux titres nommés, majoration 4 % inchangée) ;
    - un taux sous 4,20 € était dit « sous le minimum légal » (écran de
      paie, récapitulatif Pajemploi) : c'est le minimum conventionnel (le
      légal est 3,46 €). Corrigé ;
    - barrière d'audit sur ces deux points, prouvée en cassant (3 fois) ;
    - article `salaire-assistante-maternelle-net-brut` : correction du titre
      **EN BROUILLON** (`drafts.7bc11c82-4240-463f-80ba-81d9ba7c3fe7`), à
      publier sur accord écrit de Sophie ;
    - vérifiés sans erreur : les 14 publications Metricool du 6 au 27/11
      (préavis, congé enfant malade art. 48-2-2, documents de fin de
      contrat, 0,33 €/km arrêté du 29/05/2026, fin de contrat TiMat, repas
      art. 114-2, absences de l'enfant art. 105, période d'essai) ;
      pages du site : aucun « Pôle emploi », « RAM » seulement en
      « anciennement », 1/120e seulement pour dire que c'est périmé,
      SMIC de l'abattement fiscal par période (11,88 / 12,02 / 12,31 €),
      indemnité d'entretien (0,435 €/h, plancher 2,65 €) cohérente.
- **À vérifier** : le titre « Assistant maternel / Garde d'enfants »
  (RNCP 37795) n'est plus enregistré depuis le 19/07/2026, remplacé par
  « Assistant maternel - Assistant parental » (RNCP 42319, France
  compétences). L'application majore le minimum de 4 % pour le « titre
  AM-GE » (annexe 5, avenant n° 9) : une titulaire de l'ancien titre le
  reste, mais rien d'officiel trouvé sur le nouveau titre. Ne rien écrire sur
  le blog avant de l'avoir établi.

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
  code ne l'utilise nulle part. **RESTE (mis de côté par Sophie le 24/10, ne pas relancer)** : le vrai test d'abonnement de
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
- Publier la correction du titre dans `salaire-assistante-maternelle-net-brut`
  dès l'accord écrit de Sophie.
- Publier la correction de `projet-accueil-assistante-maternelle` dès
  l'accord écrit de Sophie.
- La file de publication se vide après le 8 novembre : écrire d'autres
  brouillons avant (pistes : titre professionnel et minimum majoré de 4 %,
  avec la fiche DREETS Pays de la Loire du 12/06/2026 ; motif « arrivée
  d'un enfant au foyer » à ajouter à l'écran Fin de contrat, article 103).
- Vérifier dans Metricool que les publications du 19 octobre sont bien
  parties (statut), puis préparer la série 3 (Sophie valide avant).
- Lien de la Page Facebook sur le site : FAIT (PR #272).
- Après le vrai test Stripe : vérifier en base `stripe_customer_id`,
  `subscription_status`, puis le retour en gratuit après résiliation.
- Points mineurs connus : `profiles.role` n'est pas protégé par le
  déclencheur (risque faible) ; le jeu de données de test utilise
  `signe_asmat_at` au lieu de la vraie colonne `date_signature_asmat`.
