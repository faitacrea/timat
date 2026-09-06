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
