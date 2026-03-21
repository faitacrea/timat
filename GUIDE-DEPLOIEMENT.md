# 🚀 TiMat en ligne — Guide pas-à-pas
## Durée totale estimée : 45 minutes

---

## VUE D'ENSEMBLE

Tu vas faire 4 choses dans cet ordre :
1. **GitHub** — mettre ton code en ligne (comme un Google Drive pour le code)
2. **Supabase** — créer ta base de données
3. **Vercel** — mettre l'app en ligne
4. **Connecter** les trois ensemble

Pas besoin de terminal. Tout se fait sur des sites web.

---

## PARTIE 1 — GITHUB (10 minutes)

### Étape 1.1 — Créer un compte GitHub

1. Va sur **github.com**
2. Clique sur **Sign up**
3. Entre ton email, crée un mot de passe
4. Choisis un nom d'utilisateur (ex: `sophietimat`)
5. Valide ton email

### Étape 1.2 — Créer un nouveau dépôt

1. Une fois connecté, clique sur le **+** en haut à droite
2. Clique sur **New repository**
3. Remplis :
   - **Repository name** : `timat`
   - **Description** : L'app TiMat pour assistantes maternelles
   - Coche **Private** (ton code reste privé)
4. Clique sur **Create repository**

### Étape 1.3 — Uploader les fichiers

Tu as une page avec des instructions — ignore-les et fais ceci :

1. Clique sur **uploading an existing file** (lien bleu au milieu de la page)
2. **Fais glisser TOUT le dossier** `timat-project` dans la zone grise
3. En bas de la page, dans "Commit changes", écris : `Premier commit TiMat`
4. Clique sur **Commit changes** (bouton vert)

⏳ Attends que tous les fichiers soient uploadés (peut prendre 1-2 minutes)

✅ **GitHub c'est fait !** Tu verras tous tes fichiers listés.

---

## PARTIE 2 — SUPABASE (15 minutes)

### Étape 2.1 — Créer un compte Supabase

1. Va sur **supabase.com**
2. Clique sur **Start your project**
3. Connecte-toi avec ton compte GitHub (bouton "Continue with GitHub")
4. Autorise Supabase à accéder à GitHub

### Étape 2.2 — Créer un projet

1. Clique sur **New project**
2. Remplis :
   - **Name** : `timat`
   - **Database Password** : génère un mot de passe fort et **SAUVEGARDE-LE** quelque part
   - **Region** : `West EU (Paris)` ← important pour la RGPD
3. Clique sur **Create new project**
4. ⏳ Attends 2-3 minutes que le projet se crée

### Étape 2.3 — Créer les tables

1. Dans le menu gauche, clique sur **SQL Editor** (icône avec `< >`)
2. Clique sur **New query**
3. Ouvre le fichier `supabase-schema.sql` de ton projet
4. **Copie tout le contenu** et colle-le dans la fenêtre SQL
5. Clique sur **Run** (bouton vert en bas à droite)
6. Tu dois voir : `Success. No rows returned` ✅

### Étape 2.4 — Configurer l'authentification

1. Dans le menu gauche, clique sur **Authentication**
2. Clique sur **Providers**
3. Dans **Email**, vérifie que c'est activé ✅
4. Dans **Email**, décoche "Confirm email" pour l'instant (plus simple au démarrage)
5. Clique sur **Save**

### Étape 2.5 — Récupérer tes clés API

1. Dans le menu gauche, clique sur **Settings** (icône engrenage)
2. Clique sur **API**
3. Tu vois deux choses importantes — **COPIE-LES** dans un fichier texte :
   - **Project URL** : ressemble à `https://abcdefgh.supabase.co`
   - **anon public** key : longue chaîne commençant par `eyJ...`

✅ **Supabase c'est fait !**

---

## PARTIE 3 — VERCEL (10 minutes)

### Étape 3.1 — Créer un compte Vercel

1. Va sur **vercel.com**
2. Clique sur **Sign Up**
3. Clique sur **Continue with GitHub**
4. Autorise Vercel

### Étape 3.2 — Importer le projet

1. Sur ton tableau de bord Vercel, clique sur **Add New Project**
2. Tu vois la liste de tes dépôts GitHub
3. Trouve **timat** et clique sur **Import**
4. Dans la page qui s'affiche :
   - **Framework Preset** : sélectionne `Vite`
   - Laisse tout le reste par défaut

### Étape 3.3 — Ajouter les variables d'environnement ← CRUCIAL

Avant de déployer, clique sur **Environment Variables** et ajoute ces deux variables :

**Variable 1 :**
- Name : `VITE_SUPABASE_URL`
- Value : *colle ton Project URL de Supabase* (ex: `https://abcdefgh.supabase.co`)

**Variable 2 :**
- Name : `VITE_SUPABASE_ANON_KEY`
- Value : *colle ta clé anon public de Supabase*

Clique sur **Add** après chaque variable.

### Étape 3.4 — Déployer !

1. Clique sur **Deploy**
2. ⏳ Attends 2-3 minutes
3. Tu vois une animation de déploiement
4. Quand c'est fini, tu vois **🎉 Congratulations !**

✅ **TiMat est en ligne !**

Clique sur **Visit** pour voir ton app à l'adresse `timat.vercel.app`

---

## PARTIE 4 — TESTER (5 minutes)

1. Va sur ton URL Vercel (ex: `timat-sophie.vercel.app`)
2. Tu dois voir la **landing page TiMat** 🎉
3. Clique sur **Essayer gratuitement**
4. Crée un compte test avec ton email
5. L'app s'ouvre !

---

## ❓ PROBLÈMES FRÉQUENTS

**L'app s'affiche en blanc :**
→ Les variables d'environnement sont mal copiées. Retourne sur Vercel > Settings > Environment Variables et vérifie qu'il n'y a pas d'espace en trop.

**Erreur "Invalid API key" :**
→ Même problème. Recopie la clé depuis Supabase > Settings > API.

**Le déploiement échoue :**
→ Va sur Vercel > ton projet > Deployments > clique sur le déploiement rouge > lis l'erreur et dis-moi ce que tu vois.

**Je ne trouve pas mon URL Vercel :**
→ Vercel > ton projet > le lien en haut (ex: `timat-xyz.vercel.app`)

---

## 🔄 METTRE À JOUR L'APP

Quand tu veux modifier TiMat plus tard :
1. Va sur GitHub > ton dépôt `timat`
2. Clique sur le fichier à modifier
3. Clique sur l'icône crayon ✏️
4. Fais tes modifications
5. Clique **Commit changes**

→ Vercel re-déploie **automatiquement** en 2 minutes ! Rien d'autre à faire.

---

## 📞 ÉTAPES SUIVANTES

Une fois l'app en ligne et fonctionnelle :

1. **Partager avec des assmat test** — envoie le lien à 3-5 assmat de confiance
2. **Nom de domaine** — acheter `timat.fr` sur OVH (~7€/an) et le connecter à Vercel
3. **Connexion Supabase réelle** — remplacer les données démo par la vraie base de données (je peux t'aider)

---

*Guide créé pour TiMat — Mars 2026*
