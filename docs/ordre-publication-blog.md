# Ordre de publication du blog

Un article par jour. Cet ordre n'est pas décoratif : il encode des
**dépendances de liens internes**. Publier hors ordre crée des liens morts,
parce qu'un article publié peut pointer vers un article encore en brouillon.

Dernière mise à jour : 24 août 2026 — 18 brouillons en attente, 16 articles
publiés.

## L'ordre

| Jour | Slug | Format |
|---:|---|---|
| 1 | `parents-vacances-hors-conges-assistante-maternelle` | Situation pratique |
| 2 | `fin-de-contrat-assistante-maternelle` | Guide |
| 3 | `vaccins-obligatoires-refus-accueil-assistante-maternelle` | Situation pratique |
| 4 | `periode-adaptation-essai-assistante-maternelle` | Guide |
| 5 | `jours-feries-assistante-maternelle` | Guide |
| 6 | `contrat-travail-assistante-maternelle` | Guide |
| 7 | `changement-horaires-contrat-assistante-maternelle` | Situation pratique |
| 8 | `pajemploi-plus-obligation-2027` | Guide |
| 9 | `bulletin-de-paie-manquant-assistante-maternelle` | Situation pratique |
| 10 | `retards-depassements-horaires-assistante-maternelle` | Guide |
| 11 | `impayes-salaire-assistante-maternelle` | Guide |
| 12 | `separation-parents-contrat-assistante-maternelle` | Situation pratique |
| 13 | `indemnite-repas-assistante-maternelle` | Guide |
| 14 | `arret-travail-assistante-maternelle` | Guide |
| 15 | `micro-creche-cmg-structure` | Guide |
| 16 | `maison-assistantes-maternelles-mam` | Guide |
| 17 | `developpement-moteur-motricite-libre-assistante-maternelle` | Guide |
| 18 | `declaration-revenus-assistante-maternelle-abattement` | Guide |

## Les contraintes à respecter

Ce sont les seules. Tout le reste de l'ordre est éditorial et peut bouger.

- `fin-de-contrat` **avant** `periode-adaptation`, `arret-travail` et `contrat-travail`
- `jours-feries` **avant** `contrat-travail`
- `periode-adaptation` **avant** `contrat-travail`
- `pajemploi-plus-obligation-2027` **avant** `impayes-salaire`

Les cinq fiches « situation pratique » ne pointent que vers des articles déjà
publiés et vers les pages d'outils statiques : elles sont libres de contrainte
et servent à aérer la suite de guides.

## Le raisonnement éditorial

L'ordre est calé sur la rentrée, période où se signent les nouveaux contrats :
fin de contrat, période d'adaptation, vaccins à l'admission et contrat de
travail arrivent dans les six premiers jours. Les sujets sans saison
(motricité, MAM, micro-crèche, déclaration de revenus) ferment la marche.

Une fiche « situation pratique » tombe tous les trois à quatre jours, pour
installer la rubrique sans noyer les guides.

## Comment publier (le piège)

La publication se fait en **deux temps**, et oublier le second laisse
l'article invisible :

1. `patch_documents` sur `drafts.<id>` : `statut` → `"publie"`, et
   `datePublication` → la date du jour.
2. `publish_documents` avec l'identifiant **préfixé `drafts.`**.

Vérifier ensuite que `dateMiseAJour`, s'il existe, n'est pas *antérieur* à
`datePublication` — sinon le `dateModified` du JSON-LD précède le
`datePublished`, ce que Google relève. Le vider dans ce cas.

Le webhook Sanity déclenche le déploiement Vercel ; l'article apparaît en
ligne deux à trois minutes plus tard.

## État de l'automatisation

La routine quotidienne `trig_01SLCVMJeUTyXKk6bShswsye` est **désactivée** et le
reste : la création de routine refuse les connecteurs pour cette organisation,
la routine n'aurait donc aucun accès à Sanity et échouerait chaque jour. La
publication est manuelle.
