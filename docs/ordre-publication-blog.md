# Ordre de publication du blog

Un article par jour. Cet ordre n'est pas décoratif : il encode des
**dépendances de liens internes**. Publier hors ordre crée des liens morts,
parce qu'un article publié peut pointer vers un article encore en brouillon.

Dernière mise à jour : 5 septembre 2026 — 28 brouillons dans la file, 33 articles
publiés.

Quatre articles ont été publiés le 5 septembre **hors file** : absences de
l'enfant, congé pour enfant malade, retrait ou suspension d'agrément,
attestation d'honorabilité. Ils comblaient des trous que la file ne prévoyait
pas, et leurs liens internes ne pointent que vers des articles déjà en ligne —
l'audit le vérifie à chaque construction. La file, elle, n'a pas bougé : le
cron reprend où il en était.

## L'ordre

| Jour | Slug | Format |
|---:|---|---|
| 1 | `parents-vacances-hors-conges-assistante-maternelle` | Situation pratique |
| 2 | `fin-de-contrat-assistante-maternelle` | Guide |
| 3 | `quand-chercher-mode-de-garde` | Guide parents |
| 4 | `vaccins-obligatoires-refus-accueil-assistante-maternelle` | Situation pratique |
| 5 | `periode-adaptation-essai-assistante-maternelle` | Guide |
| 6 | `declaration-pajemploi-par-enfant-2026` | Guide parents |
| 7 | `jours-feries-assistante-maternelle` | Guide |
| 8 | `contrat-travail-assistante-maternelle` | Guide |
| 9 | `changement-horaires-contrat-assistante-maternelle` | Situation pratique |
| 10 | `pajemploi-plus-obligation-2027` | Guide |
| 11 | `questions-a-poser-assistante-maternelle-avant-signature` | Guide parents |
| 12 | `separation-parents-contrat-assistante-maternelle` | Situation pratique |
| 13 | `retards-depassements-horaires-assistante-maternelle` | Guide |
| 14 | `avance-immediate-credit-impot-garde-enfant` | Guide parents |
| 15 | `tiers-vient-chercher-enfant-assistante-maternelle` | Situation pratique |
| 16 | `impayes-salaire-assistante-maternelle` | Guide |
| 17 | `parents-ne-viennent-pas-chercher-enfant-assistante-maternelle` | Situation pratique |
| 18 | `indemnite-repas-assistante-maternelle` | Guide |
| 19 | `nombre-enfants-accueillis-agrement-assistante-maternelle` | Situation pratique |
| 20 | `arret-travail-assistante-maternelle` | Guide |
| 21 | `augmenter-son-tarif-horaire-assistante-maternelle` | Situation pratique |
| 22 | `micro-creche-cmg-structure` | Guide |
| 23 | `bulletin-de-paie-manquant-assistante-maternelle` | Situation pratique |
| 24 | `maison-assistantes-maternelles-mam` | Guide |
| 25 | `demenagement-agrement-contrats-assistante-maternelle` | Situation pratique |
| 26 | `developpement-moteur-motricite-libre-assistante-maternelle` | Guide |
| 27 | `declaration-revenus-assistante-maternelle-abattement` | Guide |

## Les contraintes à respecter

Ce sont les seules. Tout le reste de l'ordre est éditorial et peut bouger.

- `fin-de-contrat` **avant** `periode-adaptation`, `arret-travail` et `contrat-travail`
- `jours-feries` **avant** `contrat-travail`
- `periode-adaptation` **avant** `contrat-travail`
- `pajemploi-plus-obligation-2027` **avant** `impayes-salaire`
- `separation-parents-contrat` **avant** `tiers-vient-chercher-enfant`
- `tiers-vient-chercher-enfant` **avant** `parents-ne-viennent-pas-chercher-enfant`
- `pajemploi-plus-obligation-2027` **avant** `avance-immediate-credit-impot-garde-enfant`

Les sept autres fiches « situation pratique » ne pointent que vers des articles
déjà publiés et vers les pages d'outils statiques : elles sont libres de
contrainte et servent à aérer la suite de guides.

Ces contraintes se revérifient d'une requête, sans se fier à la mémoire :

```groq
*[_type=="article" && _id in path("drafts.**")]{"slug": slug.current, "liens": corps[].markDefs[].href}
```

Tout lien `/blog/<slug>` pointant vers un slug encore en brouillon est une
dépendance : l'article cible doit être publié avant.

## Le raisonnement éditorial

L'ordre est calé sur la rentrée, période où se signent les nouveaux contrats :
fin de contrat, période d'adaptation, vaccins à l'admission et contrat de
travail arrivent dans les six premiers jours. Les sujets sans saison
(motricité, MAM, micro-crèche, déclaration de revenus) ferment la marche.

Une fiche « situation pratique » tombe tous les deux à trois jours, pour
installer la rubrique sans noyer les guides. Dix fiches pour treize guides
assmat : la rubrique a désormais assez de volume pour tenir seule.

Quatre guides s'adressent aux parents employeurs et alimentent les deux
rubriques qui étaient vides. Ils sont répartis dans le premier tiers du
calendrier, de façon à faire vivre le filtre « Je suis → Parent employeur »
plutôt que de le laisser ne montrer qu'un seul article.

## Réapprovisionnement du 14 octobre 2026

La file ne tenait plus que cinq jours (dernier brouillon prévu le 19 octobre).
Huit articles ajoutés à la fin de `data/ordre-publication.js`, sans aucune
dépendance — leurs liens internes ne visent que des articles déjà en ligne :

| Ordre | Slug | Rubrique |
|---:|---|---|
| 1 | `reunion-information-agrement-assistante-maternelle` | Devenir assistante maternelle |
| 2 | `indemnites-kilometriques-assistante-maternelle` | Contrat et paie |
| 3 | `sante-arret-maladie-pmi-agrement-assistante-maternelle` | Démarches et agrément |
| 4 | `freres-soeurs-deux-contrats-assistante-maternelle` | Côté parent employeur |
| 5 | `controle-pmi-droits-assistante-maternelle` | Démarches et agrément |
| 6 | `rupture-conventionnelle-assistante-maternelle` | Contrat et paie |
| 7 | `modification-agrement-augmenter-capacite-assistante-maternelle` | Démarches et agrément |
| 8 | `attestation-fiscale-pajemploi-credit-impot-parent` | Côté parent employeur |

Les quatre articles d'agrément s'appuient sur les fiches pratiques de
l'animation nationale des services de PMI (DGCS, janvier à avril 2026,
publiées sur solidarites.gouv.fr) : réunion d'information facultative,
contrôle proportionné et compte rendu écrit, santé de l'assistante maternelle,
et sur la démarche « silence vaut accord » de service-public.fr pour la
modification d'agrément. Les autres : Code du travail numérique (rupture
conventionnelle impossible), fiche DREETS Pays de la Loire du 12 juin 2026
(indemnités kilométriques), Pajemploi et Urssaf (attestation fiscale,
déclaration par enfant).

Sujets écartés faute de source officielle solide : le CDD d'assistante
maternelle (sources privées contradictoires sur les cas de recours), et
l'exercice en logement loué ou en copropriété (jurisprudence citée par des
cabinets d'avocats, non vérifiée à la source).

## Ajout du 17 octobre 2026

Deux articles à la suite des huit précédents, sur les deux fiches pratiques
de l'animation nationale des services de PMI que le blog ne couvrait pas :

| Ordre | Slug | Rubrique | Source principale |
|---:|---|---|---|
| 9 | `decision-agrement-nombre-enfants-assistante-maternelle` | Démarches et agrément | Fiche n°2, DGCS, janvier 2026 |
| 10 | `accueillir-stagiaire-assistante-maternelle` | Le quotidien de l'accueil | Fiche n°6, DGCS, mai 2026 |

Liens internes uniquement vers des articles en ligne (recours contre un refus,
nombre d'enfants, retrait/suspension, formation 120 h, honorabilité).

La fiche n°2 a aussi révélé une erreur dans `devenir-assistante-maternelle-agrement`
(« l'arrêté précise […] leur âge ») : corrigée en brouillon le 16/10, publication
soumise à l'accord de Sophie.

## Comment publier (le piège)

La publication se fait en **deux temps**, et oublier le second laisse
l'article invisible :

1. `patch_documents` sur `drafts.<id>` : `statut` → `"publie"`, et
   `datePublication` → la date du jour.
2. `publish_documents` avec l'identifiant **préfixé `drafts.`**.

Vérifier ensuite que `dateMiseAJour`, s'il existe, n'est pas *antérieur* à
`datePublication` — sinon le `dateModified` du JSON-LD précède le
`datePublished`, ce que Google relève. Le vider dans ce cas.

**Publier dans Sanity ne suffit pas.** Les pages du blog sont écrites au build
par `scripts/generate-blog.mjs` ; tant que le site n'est pas reconstruit,
l'article reste invisible sur timat.app. Il faut donc un redéploiement Vercel
après chaque publication — c'est ce que fait le cron ci-dessous.

## État de l'automatisation

La routine Claude quotidienne `trig_01SLCVMJeUTyXKk6bShswsye` est **désactivée**
et le reste : la création de routine refuse les connecteurs pour cette
organisation, la routine n'aurait donc aucun accès à Sanity et échouerait chaque
jour.

La publication est automatisée par `api/publier-article.js`, déclenché chaque
jour à 6 h UTC par le cron déclaré dans `vercel.json`. Il choisit le premier
article de l'ordre dont toutes les dépendances sont publiées, le publie, puis
reconstruit le site.

### Variables d'environnement nécessaires

| Variable | Rôle | Si absente |
| --- | --- | --- |
| `CRON_SECRET` | Authentifie l'appel. Vercel l'envoie automatiquement en `Authorization: Bearer`. | L'endpoint renvoie 500 et ne publie rien. |
| `SANITY_WRITE_TOKEN` | Écriture dans Sanity. | L'endpoint renvoie 500 et ne publie rien. |
| `VERCEL_DEPLOY_HOOK` | Reconstruit le site après publication. Se crée dans Vercel → Settings → Git → Deploy Hooks. | L'article est publié dans Sanity mais **n'apparaît pas** sur le site avant le prochain push. Signalé dans les logs et dans la réponse. |

Aucune de ces valeurs ne doit comporter d'espace ni de retour à la ligne avant
ou après : Vercel refuse de construire le projet si une variable en contient
un, et le site continue alors de servir l'ancien déploiement.

### Vérifier sans rien publier

`https://www.timat.app/api/publier-article?simulation=1`

- `{"error":"Non autorisé."}` — attendu depuis un navigateur : la variable est
  lue, l'endpoint est protégé. C'est le signe que tout va bien.
- `{"error":"CRON_SECRET absent…"}` — la variable n'est pas lue, ou le dernier
  build a échoué et le site sert une version antérieure à son ajout.

Appelé avec le bon en-tête, le mode simulation renvoie aussi
`deploiementConfigure`, qui dit si `VERCEL_DEPLOY_HOOK` est en place.

## Ajout du 24 octobre 2026

Un article demandé par Sophie (« un article nouveau, bien sourcé ») : le seul
sujet du guide officiel des assistants maternels de la DREETS
Bourgogne-Franche-Comté (juin 2026) que le blog ne couvrait pas.

| Ordre | Slug | Rubrique | Source principale |
|---:|---|---|---|
| 11 | `accueil-occasionnel-cdd-assistante-maternelle` | Contrat et paie | DREETS BFC, fiche 09 (juin 2026) ; DREETS Occitanie, guide CDD (novembre 2024) |

Les deux DREETS se nuancent sur l'accueil occasionnel (BFC : CDI si la date de
fin n'est pas connue ; Occitanie : CDI recommandé dans tous les cas) :
l'article le dit tel quel. Aucun lien interne vers un brouillon.

## Ajout du 24 octobre 2026 (suite) : cinq articles pour réapprovisionner la file

La file ne comptait plus que six brouillons (dernier prévu le 30 octobre).
Sophie : « il faut refaire des brouillons d'articles, on arrive à la fin ».
Cinq articles sur des points du guide DREETS Bourgogne-Franche-Comté (juin
2026) que le blog ne traitait pas, chacun vérifié sur une seconde source
officielle. Aucun lien interne : aucune dépendance. Dates prévues avec une
publication par jour à 6 h UTC (7 h à Paris depuis le passage à l'heure d'hiver, le 25 octobre).

| Ordre | Date prévue | Slug | Rubrique | Sources principales |
|---:|---|---|---|---|
| 12 | 31 octobre | `conge-naissance-2026-assistante-maternelle` | Situation pratique | DREETS BFC fiche 03 ; ameli ; décret n° 2026-426 du 30 mai 2026 |
| 13 | 1er novembre | `engagement-reciproque-promesse-embauche-assistante-maternelle` | Contrat et paie | DREETS BFC ; DREETS Occitanie (FAQ 16/12/2025, guide 52 semaines) |
| 14 | 2 novembre | `conges-complementaires-non-remuneres-assistante-maternelle` | Contrat et paie | DREETS BFC fiche 03 (art. 102-2) ; DREETS Occitanie FAQ q. 2.30 ; code du travail L3141-7 |
| 15 | 3 novembre | `conge-parental-education-assistante-maternelle` | Situation pratique | DREETS BFC fiche 03 (art. 48-1-2-5) ; code du travail L1225-47 à L1225-54 |
| 16 | 4 novembre | `conge-proche-aidant-solidarite-familiale-assistante-maternelle` | Situation pratique | DREETS BFC fiche 03 (art. 48-2-4 et 48-2-5) ; pour-les-personnes-agees.gouv.fr (AJPA) ; ameli (AJAP) |

## Ajout du 26 octobre 2026 : quatre articles

Sophie : « on peut faire de nouveaux brouillons d'articles pour ne pas être en
rade ». Quatre sujets que le blog ne traitait pas, chacun appuyé sur au moins
deux sources officielles. Leurs liens internes ne visent que des articles déjà
en ligne (et le simulateur de fin de contrat) : aucune dépendance.

| Ordre | Date prévue | Slug | Rubrique | Sources principales |
|---:|---|---|---|---|
| 17 | 5 novembre | `ecrans-interdits-moins-3-ans-assistante-maternelle` | Le quotidien de l'accueil | Service-Public A18388 (juillet 2025) ; arrêté du 23 septembre 2021 modifié le 27 juin 2025 ; référentiel national qualité 2025 |
| 18 | 6 novembre | `regularisation-salaire-annee-incomplete-assistante-maternelle` | Contrat et paie | DREETS BFC fiche 11-IV (art. 109-2 et 124) ; DREETS Occitanie FAQ q. 3.23 à 3.25 ; fiche régularisation DDETS 31 |
| 19 | 7 novembre | `calculer-date-fin-preavis-assistante-maternelle` | Contrat et paie | Service-Public F33164 ; DREETS BFC fiche 10 ; code du travail numérique |
| 20 | 8 novembre | `naissance-enfant-assistante-maternelle-agrement-contrats` | Situation pratique | DREETS BFC fiche 10-III (art. 103 et 119.3) ; CASF L. 421-4 |

Le cas du préavis parti un 31 (pas de veille du même quantième dans le mois
d'arrivée) n'est réglé par aucun texte : l'article le dit, et donne la lecture
retenue par le simulateur (dernier jour du mois).

## Ajout du 27 octobre 2026 : un article

| Ordre | Date prévue | Slug | Rubrique | Sources principales |
|---:|---|---|---|---|
| 21 | 9 novembre | `recu-solde-de-tout-compte-assistante-maternelle` | Contrat et paie | DREETS Occitanie FAQ q. 3.26 et 3.33 ; DREETS BFC fiche 11 (art. 69) |

Piste écartée le même jour : le titre professionnel et son minimum majoré de
4 % (4,37 €). Le titre « Assistant maternel / Garde d'enfants » (RNCP 37795)
n'est plus enregistré depuis le 19 juillet 2026 ; France compétences le donne
remplacé par « Assistant maternel - Assistant parental » (RNCP 42319). Rien
trouvé d'officiel sur la majoration pour le nouveau titre : article à écrire
seulement une fois ce point établi.

Après le 9 novembre, la file est vide : il faudra d'autres brouillons d'ici là
(le cron envoie une alerte dès qu'il en reste cinq ou moins).
