# Habilitation « tiers déclarant » Pajemploi — dossier

*Relevé du 30 septembre 2026. Les pages officielles bougent : tout ce qui suit
est à revérifier au moment d'envoyer la demande.*

## Pourquoi c'est le seul écart qui compte

Un logiciel ne peut transmettre une déclaration à l'URSSAF que s'il est habilité
comme **tiers déclarant**, via l'API officielle *Tierce déclaration Pajemploi*,
et s'il détient un **mandat du parent employeur**. Tous les autres outils
*préparent* la déclaration : ils calculent, puis affichent les cases à recopier.

Pandi-Panda est habilité. TiMat ne l'est pas. C'est le seul point où un
concurrent fait quelque chose que TiMat ne peut pas faire du tout — le reste
n'est qu'une question de prix ou de finition.

**L'API est gratuite.** Ce n'est pas un partenariat payant ni une barrière
technique : c'est une démarche administrative, avec un délai. D'où l'intérêt de
la lancer tôt.

## Le cadre juridique

Le prestataire qui utilise l'API est un tiers déclarant au sens des articles
**L.133-11, R.133-43 et R.133-44 du code de la sécurité sociale**. Il doit
détenir un mandat explicite de chaque employeur pour lequel il déclare.

Deux conséquences à retenir :

1. **Le mandat vient du parent employeur, pas de l'assistante maternelle.**
   C'est le parent qui est l'employeur, donc c'est lui qui mandate. L'espace
   parent de TiMat étant gratuit, les parents sont déjà dans l'application :
   c'est un avantage, pas un obstacle.
2. **Le mandat doit être explicite et traçable.** Il faudra le recueillir, le
   dater, le conserver, et permettre sa révocation. C'est la même mécanique que
   les autorisations parentales déjà en place.

## Les étapes

1. **Demande de souscription** — via le portail `portailapi.urssaf.fr`, ou par
   courriel à `contact.tiercedeclaration@urssaf.fr`, en précisant : le nom de
   l'organisme, la qualité (éditeur partenaire ou usage logiciel interne), et le
   lieu de l'activité.
2. **Signature de la licence d'usage.**
3. **Accès au bac à sable** une fois le dossier validé.
4. **Accès à la production.**

Authentification : **OAuth2 Client Credentials**.

## Ce qu'il faut avoir sous la main

- Dénomination et **SIRET** : `902 648 088 00026`.
- **Adresse du siège** de l'activité.
- Description du service et de la population servie : assistantes maternelles
  agréées et parents employeurs, particuliers employeurs du secteur Pajemploi.
- Volumétrie envisagée. **Écrire la vérité, sans la gonfler** : l'URSSAF
  dimensionne des quotas techniques, elle ne juge pas une ambition. Formulation
  retenue : *« Service en lancement, volumétrie estimée à quelques dizaines de
  déclarations mensuelles la première année. »*
- Le mécanisme de recueil du mandat de l'employeur — à décrire, donc à avoir
  pensé avant d'écrire.
- Les mesures de sécurité : hébergement des données en France (Supabase,
  région eu-west-3 à Paris), fonctions serveur en région `cdg1` (Paris),
  chiffrement en transit et au repos, RLS sur chaque table, journal d'audit.
- Les mentions légales et la politique de confidentialité **complètes**.

## Ce qui est construit, et ce qui ne l'est pas

*Mis à jour le 30 septembre 2026. Quatre des cinq chantiers sont faits.*

- [x] **L'écran de mandat côté parent** — `MandatPajemploi`, dans
      `src/ecrans-secondaires.jsx`. Le texte dit ce qu'il autorise ET ce qu'il
      n'autorise pas ; une case à cocher précède le bouton, parce qu'un mandat
      donné sans avoir lu n'est pas un consentement éclairé.
- [x] **La conservation du mandat** — table `mandats_pajemploi`, aucune
      politique DELETE : un mandat se révoque en datant `revoque_le`. Le texte
      accepté est versionné, sans quoi on ne saurait plus à quoi le parent a
      consenti.
      La règle « seul le parent mandate » est imposée **par la base**, pas par
      l'écran, et vérifiée en production : l'assistante maternelle ne peut ni se
      mandater elle-même, ni mandater au nom du parent.
- [x] **Le journal des déclarations transmises** — table
      `transmissions_pajemploi`, en lecture seule côté navigateur : un client
      qui pourrait y écrire pourrait inscrire « transmise » sans que rien ne
      parte.
- [x] **Le cas d'échec** — quatre états, et chacun dit trois choses : où en est
      la déclaration, **si elle est partie**, et quoi faire. « erreur » (rien
      n'est parti) ne se confond pas avec « refusée » (c'est arrivé, corrigez).
      En attente, l'écran dit de NE PAS renvoyer.

- [ ] **L'intégration OAuth2 et l'appel de l'API.** Seul chantier non fait, et
      délibérément : la spécification n'est remise qu'après signature de la
      licence. Écrire un appel « probable » aurait produit une intégration qui
      compile, qui passe les tests, et qui échoue le jour où elle sert. La
      logique autour est complète — mandat vérifié côté serveur, secret qui ne
      quitte jamais le serveur, journal ouvert **avant** l'envoi — dans
      `lib/pajemploi-transmission.js`. Il restera trois choses à brancher :
      le point d'accès OAuth2, le format de la charge utile, et la traduction
      des codes de réponse de l'URSSAF.

### Une réserve à connaître avant une démonstration

Tout cela est **invisible dans l'application tant que l'habilitation n'est pas
obtenue** : l'entrée de menu n'apparaît que lorsque l'identifiant client URSSAF
est configuré. C'est volontaire — proposer de mandater sans pouvoir transmettre
promettrait ce que l'application ne sait pas faire.

Conséquence pratique : si l'URSSAF demande une démonstration, il faut renseigner
une valeur dans le réglage `pajemploi.clientId` au back-office pour rendre
l'écran visible le temps de la montrer.

### La place sous le plafond Vercel

Le forfait Hobby n'autorise que douze fonctions serverless. Les deux routes
Stripe ont été réunies : il reste **onze sur douze**, donc une place libre pour
`api/pajemploi-transmettre.js` le jour venu.

## L'adresse publiée : décision prise le 1er octobre 2026

L'adresse déclarée à l'INSEE est **non diffusible** — l'option de non-diffusion
du répertoire SIRENE a été activée. C'est une protection volontaire, et la
publier sur le site la défait : une page web est indexée, archivée et mise en
cache, ce qu'un registre consultable au cas par cas n'est pas.

L'URSSAF, elle, a besoin de l'adresse réelle : c'est une administration, pas
une publication. La donner dans le dossier ne pose aucun problème.

Le choix ne porte donc que sur ce qui est **publié sur le site**. Une adresse de
domiciliation commerciale (15 à 30 € par mois pour une offre simple) se déclare
à l'INSEE, devient l'adresse de l'entreprise, et c'est elle qu'on publie. La
non-diffusion du domicile reste acquise.

**Décision : l'adresse personnelle est publiée**, en connaissance de la
conséquence — une page web est indexée et mise en cache, là où un registre ne
se consulte qu'au cas par cas. Le retour en arrière reste possible à tout
moment : une domiciliation se souscrit, se déclare à l'INSEE, et le champ se
change en une ligne au back-office. Rien dans le code ne dépend de cette
adresse.

## Brouillon du courriel de demande

> Objet : Demande d'accès à l'API Tierce déclaration Pajemploi — éditeur TiMat
>
> Madame, Monsieur,
>
> Je souhaite demander l'accès à l'API Tierce déclaration Pajemploi en qualité
> d'éditeur de logiciel, et connaître la marche à suivre ainsi que la licence
> d'usage à signer.
>
> J'ai tenté de créer un compte sur portailapi.urssaf.fr sans y parvenir : la
> définition du mot de passe échoue systématiquement et me renvoie au début de
> la création. Je vous écris donc directement.
>
> Éditeur : Lefort Sophie, entrepreneur individuel
> SIRET : 902 648 088 00026
> Adresse : 12 rue Étienne Dolet, 94230 Cachan, France
> Téléphone : 06 20 87 33 80
> Service : TiMat — https://www.timat.app
> Lieu de l'activité : France
> Usage : éditeur partenaire (service proposé à des employeurs tiers)
>
> TiMat est une application de gestion destinée aux assistantes maternelles
> agréées et aux parents employeurs relevant de Pajemploi. Elle calcule les
> heures d'accueil, le salaire, les indemnités d'entretien et de repas et les
> congés, et prépare aujourd'hui les montants que le parent employeur reporte
> lui-même sur son compte Pajemploi.
>
> L'accès à l'API nous permettrait de transmettre la déclaration mensuelle
> directement, sur mandat explicite du parent employeur.
>
> Le recueil du mandat est déjà en place dans l'application. Le mandat est
> donné par le parent employeur lui-même, jamais par l'assistante maternelle
> qui est la salariée ; le texte accepté est horodaté et versionné ; le mandat
> est révocable à tout moment d'un seul geste, avec effet immédiat ; et il est
> conservé après révocation, de sorte qu'une déclaration déjà transmise reste
> rattachable à l'autorisation en vigueur le jour de son envoi.
>
> Volumétrie : service en lancement, volumétrie estimée à quelques dizaines de
> déclarations mensuelles la première année.
>
> Hébergement et sécurité : les données sont hébergées en France — base de
> données à Paris (région eu-west-3) et fonctions serveur en région cdg1 — avec
> chiffrement en transit et au repos, cloisonnement par ligne au niveau de la
> base, et journal d'audit. Le service est conforme au RGPD ; les mentions
> légales et la politique de confidentialité sont publiées sur le site.
>
> Je me tiens à votre disposition pour toute pièce complémentaire ou pour une
> démonstration du service.
>
> Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations
> distinguées.
>
> Sophie Lefort
> TiMat — https://www.timat.app
> 06 20 87 33 80
> Contact.timat.app@gmail.com

**Le texte prêt à copier** : `courriel-urssaf.txt`, à la racine du dépôt.

**L'adresse de contact doit être celle des mentions légales.** La configuration
publiée porte `Contact.timat.app@gmail.com` ; c'est donc elle qui figure dans la
signature. Si `contact@timat.app` devient une vraie boîte aux lettres un jour,
il faudra changer les deux ensemble — une adresse dans le courriel et une autre
sur le site est exactement le genre d'écart qu'un relecteur relève.

**Où l'envoyer** : `contact.tiercedeclaration@urssaf.fr`.

**Pourquoi deux adresses dans la signature.** Le message part d'une adresse
Gmail, et c'est elle qui apparaît dans l'en-tête. Le site, lui, affiche
`contact@timat.app` dans ses mentions légales. Les donner toutes les deux évite
un décalage qu'il faudrait sinon expliquer, et dit clairement où arrive la
réponse. Envoyer depuis `contact@timat.app` demanderait une vraie boîte aux
lettres chez OVH, et non une simple redirection : à vérifier avec eux si la
question se pose un jour.

## Sources

- API Tierce Déclaration Pajemploi — data.gouv.fr
- Portail API URSSAF — portailapi.urssaf.fr
- Articles L.133-11, R.133-43 et R.133-44 du code de la sécurité sociale
