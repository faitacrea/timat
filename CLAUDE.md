# TiMat — consignes pour Claude

Application pour assistantes maternelles et parents employeurs
(www.timat.app), créée par Sophie Lefort. Avant toute chose, lire
`docs/passation-2026-10-13.md` : état du projet, ce qui reste à faire,
identifiants utiles.

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
