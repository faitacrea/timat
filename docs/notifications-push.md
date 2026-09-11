# Notifications push — ce qu'il reste à faire, une seule fois

Tout le code est en place. Il manque **deux réglages à poser chez Vercel**, que
seule la propriétaire du compte peut faire. Rien à installer, rien à taper dans
un terminal : c'est un formulaire sur une page web.

## Pourquoi ça ne peut pas être fait depuis le code

Envoyer une notification demande une **clé privée**. Elle permet d'envoyer des
notifications à tous les utilisateurs de TiMat au nom de TiMat. Écrite dans le
dépôt, elle serait visible par quiconque a accès au code. Elle doit donc vivre
chez Vercel, et nulle part ailleurs.

## Les deux réglages

Sur **vercel.com** → projet **timat** → **Settings** → **Environment Variables**,
ajouter :

| Nom | Valeur |
|---|---|
| `VAPID_PUBLIC_KEY` | `BGrkaQL78BMZ8LClsnl_t05IYDklLYrUN7I-GvXatBHomnvJ0dkB84xQaTP7RVdWtTmE6i5AVdz7cJ_QweB1U7g` |
| `VAPID_PRIVATE_KEY` | *(la clé privée, transmise à part — à ne jamais coller dans le code)* |

Cocher les trois environnements (Production, Preview, Development), puis
**Save**. Il faut ensuite **redéployer** pour que les fonctions les voient :
onglet **Deployments** → sur le dernier déploiement, menu `…` → **Redeploy**.

La clé publique ci-dessus est **déjà dans le code de l'application** : c'est
normal, elle est publique par nature. Les deux doivent être **la même paire** —
une clé publique qui ne correspond pas à la privée fait échouer tous les envois.

## Vérifier que c'est bon

1. Ouvrir TiMat → **Outils Pro** → **Mes alertes** (côté parent :
   **Administratif** → **Mes alertes**).
2. Appuyer sur **Recevoir les notifications ici** et accepter la demande du
   navigateur.
3. L'appareil doit apparaître dans **Vos appareils**.

Si l'appareil n'apparaît pas, l'écran affiche la raison exacte : il ne dit
jamais que c'est activé sans l'avoir vérifié.

## Ce qui ne dépend d'aucun réglage

L'**e-mail part dans tous les cas**, et la notification dans l'application aussi.
Le push ne fait que s'ajouter. Tant que les deux réglages ne sont pas posés,
`/api/send-push` répond `503` en nommant ce qui manque — rien d'autre ne casse.

## Le cas de l'iPhone

Apple ne donne les notifications qu'aux applications **ajoutées à l'écran
d'accueil**. Sur iPhone, tant que TiMat est ouvert dans Safari comme un site
ordinaire, aucune notification n'est possible — c'est une règle d'Apple, pas un
choix de TiMat. L'écran « Mes alertes » le dit et donne la marche à suivre.

Sur Android, sur ordinateur et dans Chrome, Edge ou Firefox, cela fonctionne
depuis le navigateur, sans rien installer.
