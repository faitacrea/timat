# TiMat — consignes pour Claude

Application pour assistantes maternelles et parents employeurs
(www.timat.app), créée par Sophie Lefort. Avant toute chose, lire
`docs/passation-2026-10-13.md` : état du projet, ce qui reste à faire,
identifiants utiles.

## Continuité entre les sessions

Une session ne se souvient pas des précédentes : seuls ce fichier, le dépôt
et l'historique git font le lien. Donc :

- au début, lire la passation ci-dessus et l'historique récent
  (`git log --oneline -20`) ;
- à la fin, ou dès que Sophie annonce qu'elle ouvre une nouvelle session :
  mettre à jour la passation (fait, reste à faire, décisions, état des
  comptes externes), la pousser et la fusionner — sans attendre qu'elle le
  demande.

## Règles de Sophie (permanentes)

- Être honnête et précis, avec de vraies informations ; chercher sur le net
  avant de répondre ; sources officielles, citées.
- Toujours comparer avec les concurrents directs : Pandi-Panda, Nounou-Top,
  AssmatZen, Mam360.
- Sophie n'utilise pas de terminal : lui donner des étapes à cliquer.
- Ne jamais lui demander la clé de service Supabase.
- Ne jamais modifier le schéma de la base de production sans son accord
  explicite.
- Sophie a un CAP petite enfance ; son agrément est EN PRÉPARATION : ne
  jamais écrire qu'elle est agréée.
- Ne rien programmer sur ses réseaux (Metricool) sans son accord ; aucune
  photo d'enfant.
- Stories (règle du 27/10/2026, « on fait toujours comme ça ») : la story du
  jour lui est envoyée chaque jour (rappel programmé « Story Instagram du
  jour ») ; les stories à programmer dans Meta Business Suite lui sont
  envoyées 5 jours avant la fin de la série programmée en cours. Toujours
  des étapes très explicites, et les images À LA FIN du message, jamais au
  milieu. Son compte Instagram n'a pas l'autocollant « Quiz » : image quiz
  avec les réponses A/B/C + autocollant Sondage, puis le soir une story
  « Réponse » avec la bonne réponse en vert.
- Vocabulaire : « période de familiarisation » (référentiel national de la
  qualité d'accueil, 2025, employé par la PMI) ; au contrat, le terme reste
  « période d'adaptation » (convention collective, art. 94).
- Répondre en français.

## Méthode de travail

- Construire : `VITE_SUPABASE_KEY="verification-locale" npm run build`
  (vérifier le code de sortie et « Aucune anomalie. » en fin d'audit).
- Prouver chaque nouvelle barrière en cassant volontairement le code.
- Jamais de test navigateur dans `npm run build` ; ils vont dans
  `.github/workflows/controles-navigateur.yml`.
- Commits en français qui expliquent pourquoi ; PR, aperçu Vercel au vert,
  fusion (squash), vérification en production.
- Ne jamais dire « aucune erreur » : dire précisément ce qui est vérifié.
- Vercel Hobby : 12 fonctions maximum, ne pas ajouter de fichier dans `api/`
  (les `api/_*.js` sont des modules).
