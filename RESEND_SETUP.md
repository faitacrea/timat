# Activation des notifications email (Resend)

Le système de notifications email est prêt côté code. Il faut juste configurer Resend pour qu'il fonctionne.

## Étapes d'activation (à faire après ton rebranding)

### 1. Domaine vérifié chez Resend

Une fois ton nouveau nom validé et ton domaine OVH configuré :

1. Va sur https://resend.com → Domains → Add Domain
2. Ajoute ton domaine (ex: `timat.app` ou ton nouveau nom)
3. Resend te donne 3 enregistrements DNS à ajouter chez OVH :
   - 1 enregistrement MX (pour la réception, optionnel mais recommandé)
   - 2 enregistrements TXT (DKIM + SPF, obligatoires pour passer les filtres anti-spam)
4. Ajoute-les dans ton zone DNS OVH (Manager OVH → ton domaine → DNS)
5. Reviens sur Resend → clique "Verify" sur ton domaine
6. Attendre 5-15 min que le DNS se propage

### 2. Récupérer la clé API Resend

1. Resend → API Keys → Create API Key
2. Nom : "TiMat production"
3. Permission : "Full access"
4. Copie la clé (commence par `re_...`)

### 3. Ajouter les variables d'environnement dans Vercel

1. Vercel Dashboard → ton projet TiMat → Settings → Environment Variables
2. Ajoute 2 variables :
   - `RESEND_API_KEY` = la clé `re_...` copiée à l'étape 2
   - `EMAIL_FROM` = `TonNomApp <noreply@tondomaine.com>` (utilise l'email du domaine vérifié)
3. Coche "Production" + "Preview" + "Development" pour chaque
4. Save

### 4. Déployer le fichier API

Le fichier `send-email.js` doit être placé dans le dossier `/api/` à la racine de ton projet Vercel.

```bash
mkdir -p api
mv send-email.js api/send-email.js
git add api/send-email.js
git commit -m "feat(email): API Vercel send-email avec Resend"
git push
```

Vercel détecte automatiquement le fichier et crée la route `/api/send-email`.

### 5. Tester

Une fois Vercel "Ready" après le push :

1. Connecte-toi en asmat
2. Signe un contrat
3. Va voir les emails du compte parent test
4. Tu dois recevoir l'email "Votre assistante maternelle a signé le contrat"

Pour debug, regarde :
- Vercel → Deployments → ton deployment → Functions logs → tu vois `[send-email]` logs
- Resend → Logs → tu vois l'historique des envois et leur statut

## Notifications actives automatiquement

Une fois Resend configuré, ces emails partent automatiquement :

| Événement | Destinataire | Template |
|---|---|---|
| Asmat signe un contrat | Parent | `signature_asmat_signed` |
| Parent signe un contrat | Asmat | `signature_parent_signed` |
| Invitation parent | Parent invité | `invitation_parent` |
| Bulletin envoyé | Parent | `bulletin_sent` |

## Notifications à brancher plus tard (rappels automatiques)

Pour les rappels auto signature en attente après 7 jours :

1. Créer une Edge Function Vercel `api/cron-reminders.js`
2. Configurer `vercel.json` avec un cron `0 9 * * 1` (lundi 9h)
3. La fonction scanne les contrats `signe_asmat=true AND signe_parent=false AND date_signature_asmat < NOW() - 7 days`
4. Envoie un email `signature_reminder` au parent_id de chacun

(À faire en P14 quand on aura testé les notifs basiques.)

## Mode "dégradé" (avant configuration Resend)

Tant que `RESEND_API_KEY` n'est pas configurée :
- Les appels `sendNotificationEmail()` retournent `{success:true, simulated:true}`
- Les logs sont écrits dans la console Vercel et dans `audit_log` (action: `email_sent` ou `email_send_unavailable`)
- L'app continue de fonctionner normalement, juste sans envoi réel

Tu peux donc déployer ce code dès maintenant sans risque.
