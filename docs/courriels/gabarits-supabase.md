# Les courriels d'authentification, en français

## Pourquoi ce document

Supabase envoie lui-même quatre courriels : confirmation d'inscription,
réinitialisation de mot de passe, lien magique, changement d'adresse. Ils ne
passent pas par `api/send-email.js` et **ne sont donc pas dans ce dépôt** : ils
vivent dans le tableau de bord Supabase.

Tant qu'ils n'ont pas été remplacés, ce sont les gabarits par défaut. Vérifié
le 29 septembre 2026 en lisant un vrai courriel reçu :

> **Objet :** Reset Your Password
> RESET PASSWORD
> Follow this link to reset the password for your user:

En anglais, sans une mention de TiMat, avec un lien qui pointe visiblement vers
`supabase.co`. Une assistante maternelle française qui a oublié son mot de passe
reçoit ça. Elle ne comprend pas, et si elle comprend, elle se méfie.

Ce n'est pas qu'une question de confort : un gabarit générique en anglais
expédié depuis un domaine français récent est exactement ce qu'un filtre
anti-spam sanctionne.

## Où les coller

Supabase → **Authentication → Emails → onglet Templates**. Un gabarit par
onglet. Coller le HTML, enregistrer, recommencer.

⚠️ `{{ .ConfirmationURL }}` est la variable que Supabase remplace par le lien
réel. **Ne pas la modifier, ne pas la traduire.** Sans elle, le courriel ne
sert à rien.

## Ce que ces textes respectent

- **Le vouvoiement**, comme le reste des courriels du produit.
- **Aucune promesse que TiMat ne tient pas.** On ne dit pas « votre compte est
  sécurisé », on dit ce qui se passe et ce qu'il faut faire.
- **La phrase qui compte est la dernière** : si vous n'avez rien demandé,
  ignorez ce message. C'est elle qui évite la panique quand quelqu'un reçoit un
  courriel qu'il n'attendait pas.
- Les couleurs du produit : marine `#2E4859`, terracotta `#B4543F`, fond
  `#FDFBF8`.

---

## 1. Reset Password — « Réinitialiser votre mot de passe »

**Objet :** `Réinitialiser votre mot de passe TiMat`

```html
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#FDFBF8;padding:28px 18px;color:#2E4859;line-height:1.65">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #EDE6DE;border-radius:16px;padding:28px 26px">
    <h2 style="margin:0 0 14px;font-size:21px;color:#2E4859">Réinitialiser votre mot de passe</h2>
    <p style="margin:0 0 16px;font-size:15.5px">Vous avez demandé à choisir un nouveau mot de passe pour votre espace TiMat. Ce lien est valable une heure.</p>
    <p style="margin:0 0 20px">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#B4543F;color:#fff;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15.5px">Choisir un nouveau mot de passe</a>
    </p>
    <p style="margin:0 0 6px;font-size:13px;color:#55707C">Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :</p>
    <p style="margin:0 0 20px;font-size:12px;color:#8A9AA3;word-break:break-all">{{ .ConfirmationURL }}</p>
    <p style="margin:0;padding-top:16px;border-top:1px solid #EDE6DE;font-size:13px;color:#55707C">
      <strong>Vous n'avez rien demandé ?</strong> Ignorez ce message : votre mot de passe actuel reste valable, et personne n'a accès à votre compte.
    </p>
  </div>
  <p style="max-width:520px;margin:14px auto 0;text-align:center;font-size:12px;color:#8A9AA3">TiMat — <a href="mailto:contact@timat.app" style="color:#B4543F">contact@timat.app</a></p>
</div>
```

---

## 2. Confirm signup — « Confirmer votre adresse »

**Objet :** `Confirmez votre adresse pour activer votre espace TiMat`

```html
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#FDFBF8;padding:28px 18px;color:#2E4859;line-height:1.65">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #EDE6DE;border-radius:16px;padding:28px 26px">
    <h2 style="margin:0 0 14px;font-size:21px;color:#2E4859">Bienvenue sur TiMat</h2>
    <p style="margin:0 0 16px;font-size:15.5px">Il reste une étape : confirmer que cette adresse est bien la vôtre. C'est elle qui vous permettra de retrouver votre compte si vous oubliez votre mot de passe.</p>
    <p style="margin:0 0 20px">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#B4543F;color:#fff;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15.5px">Confirmer mon adresse</a>
    </p>
    <p style="margin:0 0 6px;font-size:13px;color:#55707C">Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :</p>
    <p style="margin:0 0 20px;font-size:12px;color:#8A9AA3;word-break:break-all">{{ .ConfirmationURL }}</p>
    <p style="margin:0;padding-top:16px;border-top:1px solid #EDE6DE;font-size:13px;color:#55707C">
      <strong>Vous n'avez pas créé de compte ?</strong> Ignorez ce message, aucun espace ne sera ouvert à votre nom.
    </p>
  </div>
  <p style="max-width:520px;margin:14px auto 0;text-align:center;font-size:12px;color:#8A9AA3">TiMat — <a href="mailto:contact@timat.app" style="color:#B4543F">contact@timat.app</a></p>
</div>
```

---

## 3. Magic Link — « Votre lien de connexion »

**Objet :** `Votre lien de connexion TiMat`

```html
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#FDFBF8;padding:28px 18px;color:#2E4859;line-height:1.65">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #EDE6DE;border-radius:16px;padding:28px 26px">
    <h2 style="margin:0 0 14px;font-size:21px;color:#2E4859">Votre lien de connexion</h2>
    <p style="margin:0 0 16px;font-size:15.5px">Cliquez pour ouvrir votre espace TiMat, sans mot de passe à saisir. Ce lien est valable une heure et ne fonctionne qu'une fois.</p>
    <p style="margin:0 0 20px">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#B4543F;color:#fff;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15.5px">Ouvrir mon espace</a>
    </p>
    <p style="margin:0 0 6px;font-size:13px;color:#55707C">Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :</p>
    <p style="margin:0 0 20px;font-size:12px;color:#8A9AA3;word-break:break-all">{{ .ConfirmationURL }}</p>
    <p style="margin:0;padding-top:16px;border-top:1px solid #EDE6DE;font-size:13px;color:#55707C">
      <strong>Vous n'avez rien demandé ?</strong> Ignorez ce message : sans ce clic, personne n'entre dans votre compte.
    </p>
  </div>
  <p style="max-width:520px;margin:14px auto 0;text-align:center;font-size:12px;color:#8A9AA3">TiMat — <a href="mailto:contact@timat.app" style="color:#B4543F">contact@timat.app</a></p>
</div>
```

---

## 4. Change Email Address — « Confirmer votre nouvelle adresse »

**Objet :** `Confirmez votre nouvelle adresse TiMat`

```html
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#FDFBF8;padding:28px 18px;color:#2E4859;line-height:1.65">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #EDE6DE;border-radius:16px;padding:28px 26px">
    <h2 style="margin:0 0 14px;font-size:21px;color:#2E4859">Confirmer votre nouvelle adresse</h2>
    <p style="margin:0 0 16px;font-size:15.5px">Vous avez demandé à utiliser cette adresse pour votre espace TiMat. Ce clic la rend effective ; l'ancienne ne permettra plus de se connecter.</p>
    <p style="margin:0 0 20px">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#B4543F;color:#fff;padding:13px 26px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15.5px">Confirmer cette adresse</a>
    </p>
    <p style="margin:0 0 6px;font-size:13px;color:#55707C">Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :</p>
    <p style="margin:0 0 20px;font-size:12px;color:#8A9AA3;word-break:break-all">{{ .ConfirmationURL }}</p>
    <p style="margin:0;padding-top:16px;border-top:1px solid #EDE6DE;font-size:13px;color:#55707C">
      <strong>Vous n'avez rien demandé ?</strong> Ne cliquez pas, et écrivez-nous à contact@timat.app : quelqu'un tente peut-être de détourner un compte.
    </p>
  </div>
  <p style="max-width:520px;margin:14px auto 0;text-align:center;font-size:12px;color:#8A9AA3">TiMat — <a href="mailto:contact@timat.app" style="color:#B4543F">contact@timat.app</a></p>
</div>
```

---

## Un second réglage à vérifier, dans le même écran

Le courriel reçu le 29 septembre contenait `redirect_to=https://timat.app`,
**sans le `www`** — alors que la demande était partie de `www.timat.app`.

Supabase remplace silencieusement une adresse de redirection qui n'est pas dans
sa liste blanche par la « Site URL ». C'est donc que `https://www.timat.app`
n'y figure pas.

Ça fonctionne quand même, parce que `timat.app` redirige vers `www.timat.app`
et que les navigateurs conservent le jeton pendant cette redirection. Mais
c'est un détour inutile sur le chemin le plus fragile du produit — celui où
quelqu'un est déjà bloqué dehors.

Supabase → **Authentication → URL Configuration** :

- **Site URL** : `https://www.timat.app`
- **Redirect URLs** : ajouter `https://www.timat.app/**`

## Ce que ces courriels ne changeront pas

Le classement en indésirables des premiers envois. Vérifié le 29 septembre sur
les en-têtes d'un vrai courriel : `spf=pass`, `dkim=pass` (signé `d=timat.app`),
`dmarc=pass`. L'authentification est irréprochable — Gmail ne connaît
simplement pas encore cet expéditeur. Cela se construit avec le volume et les
ouvertures, pas avec un réglage.
