# Politique de confidentialité — TiMat

*Dernière mise à jour : mars 2026 — Version 1.0*

---

## 1. Identité du responsable de traitement

**TiMat**
Représentée par : Sophie LEFORT
Email de contact : privacy@timat.app
Adresse :12 rue étienne dolet 94230 cachan, France

---

## 2. Données collectées et finalités

### 2.1 Données des assistantes maternelles

| Donnée | Finalité | Base légale |
|--------|----------|-------------|
| Nom, prénom | Identification, contrats | Exécution du contrat |
| Adresse email | Connexion, notifications | Exécution du contrat |
| Numéro de téléphone | Contact d'urgence | Consentement |
| Numéro d'agrément PMI | Conformité réglementaire | Obligation légale |
| Données de paiement (Stripe) | Facturation abonnement | Exécution du contrat |

### 2.2 Données des enfants accueillis

| Donnée | Finalité | Base légale |
|--------|----------|-------------|
| Prénom | Identification | Exécution du contrat |
| Date de naissance | Calcul de l'âge, suivi PMI | Exécution du contrat |
| Allergies / données médicales | Sécurité de l'enfant | Intérêt vital |
| Photos | Journal partagé | Consentement explicite des parents |

**Note :** Les données des enfants sont des données sensibles (données concernant des mineurs). Elles ne sont accessibles qu'à l'assistante maternelle concernée et aux parents de l'enfant.

### 2.3 Données des parents

| Donnée | Finalité | Base légale |
|--------|----------|-------------|
| Nom, prénom | Identification, contrats | Exécution du contrat |
| Adresse email | Connexion, communications | Exécution du contrat |
| Numéro de téléphone | Communications | Consentement |
| Profession | Calcul aide CMG | Consentement |

### 2.4 Données financières

| Donnée | Finalité | Base légale |
|--------|----------|-------------|
| Salaires déclarés | Récapitulatifs Pajemploi | Obligation légale |
| Indemnités d'entretien | Récapitulatifs | Exécution du contrat |
| Attestations fiscales | Déclaration d'impôts | Obligation légale |
| Paiements abonnement | Facturation (via Stripe) | Exécution du contrat |

---

## 3. Durées de conservation

| Catégorie | Durée | Justification |
|-----------|-------|---------------|
| Compte actif | Durée de l'abonnement | Nécessité du service |
| Données après suppression | 0 jour | Droit à l'effacement immédiat |
| Données financières / contrats | 10 ans | Obligation légale comptable |
| Logs de connexion | 12 mois | Sécurité |
| Consentements RGPD | 5 ans | Preuve de conformité |

---

## 4. Hébergement et localisation des données

Toutes les données sont hébergées **en France** (région Paris) via :
- **Supabase** (PostgreSQL, stockage fichiers) — serveurs OVHcloud Paris
- **Vercel** (application web) — Edge Network Europe

Aucun transfert de données hors de l'Union Européenne n'est effectué, à l'exception de :
- **Stripe** (paiements) — encadré par les clauses contractuelles types UE
- **Anthropic** (génération IA des bilans) — données anonymisées, sans noms d'enfants

---

## 5. Destinataires des données

Vos données ne sont **jamais vendues** ni partagées à des fins commerciales.

Accès limité à :
- Vous-même (accès à vos propres données)
- Les parents des enfants que vous accueillez (uniquement les données les concernant)
- TiMat (accès technique limité, sous obligation de confidentialité)
- Sous-traitants techniques : Supabase, Vercel, Stripe, Anthropic (données anonymisées)

---

## 6. Vos droits

Conformément au RGPD (articles 15 à 22), vous disposez des droits suivants :

- **Droit d'accès** : télécharger toutes vos données depuis Administratif → Documents → Export dossier
- **Droit de rectification** : modifier vos informations dans Paramètres
- **Droit à l'effacement** : bouton "Supprimer mon compte" dans Paramètres → suppression immédiate et définitive
- **Droit à la portabilité** : export en CSV/PDF depuis l'application
- **Droit d'opposition** : pour les traitements basés sur l'intérêt légitime
- **Droit à la limitation** : contactez privacy@timat.app

Pour exercer vos droits : **privacy@timat.app** — réponse sous 30 jours.

En cas de réclamation non résolue : **CNIL — 3 Place de Fontenoy, 75007 Paris — www.cnil.fr**

---

## 7. Cookies

TiMat utilise uniquement :
- **Cookies techniques** (session, authentification) — nécessaires, pas de consentement requis
- **Aucun cookie publicitaire**
- **Aucun cookie de tracking tiers**

---

## 8. Sécurité

- Chiffrement en transit (HTTPS/TLS 1.3)
- Chiffrement au repos (AES-256)
- Row Level Security (RLS) : chaque utilisateur ne peut accéder qu'à ses propres données
- Authentification sécurisée via Supabase Auth
- Mots de passe hachés (bcrypt)
- Journaux d'audit des accès aux données sensibles

---

## 9. Mineurs

TiMat traite des données concernant des enfants mineurs dans le cadre strict de la relation professionnelle assmat/parents. Ces données sont :
- Accessibles uniquement aux parties concernées (asmat + parents de l'enfant)
- Jamais utilisées à des fins de profilage ou de marketing
- Protégées par les politiques RLS les plus restrictives

---

## 10. Modifications

Toute modification substantielle de cette politique sera notifiée par email avec un délai de 30 jours avant entrée en vigueur. L'utilisation continue du service après ce délai vaut acceptation.

---

*Cette politique est conforme au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés modifiée.*
