// L'ADRESSE DE CONTACT DE TIMAT — UN SEUL ENDROIT.
//
// Avant ce fichier, « support@timat.app » etait ecrite en dur a vingt-huit
// endroits : pages legales, mentions RGPD, messages d'erreur, reponses des
// fonctions serveur. Le back-office proposait bien un champ « Email de
// contact », mais il n'alimentait qu'une seule ligne : le pied de page. On
// pouvait donc changer l'adresse dans les reglages et ne rien voir changer
// sur le site — c'est exactement ce qui s'est passe.
//
// Desormais tout part d'ici. Le back-office reste prioritaire la ou une
// configuration est disponible (elle se pose PAR-DESSUS cette valeur), mais
// la valeur par defaut est la meme partout, y compris cote serveur, ou aucune
// configuration n'est lue.
//
// L'EXPEDITEUR EST DESORMAIS LA MEME ADRESSE, et c'est possible parce qu'elle
// est sur le domaine verifie chez Resend. Le gmail, lui, ne pouvait pas :
// Resend refuse gmail.com (403, domaine non verifiable). On a donc pris une
// adresse du domaine, redirigee gratuitement par OVH vers la boite gmail qui
// sert de lecture.
//
// UNE CONSEQUENCE A CONNAITRE : les rebonds automatiques (adresse de parent
// invalide, boite pleine) arrivent maintenant dans une vraie boite au lieu de
// disparaitre dans noreply@. C'est quelques courriels par mois, et c'est
// plutot une bonne chose de les voir.
export const EMAIL_CONTACT = "contact@timat.app";
export const EMAIL_EXPEDITEUR = "contact@timat.app";

// L'HEBERGEUR, ECRIT UNE SEULE FOIS.
//
// Deux adresses differentes coexistaient : « 340 S Lemon Ave, Walnut » sur la
// landing et « 440 N Barranca Ave, Covina » dans l'application. Les deux ne
// peuvent pas etre vraies, et la loi n° 2004-575 (LCEN) impose de publier
// l'adresse de l'hebergeur. Une valeur recopiee a deux endroits finit toujours
// par diverger : il n'y en a plus qu'une, et une barriere d'audit interdit de
// la reecrire ailleurs.
//
// L'adresse est celle que Vercel publie pour ses mentions legales et sa
// politique de confidentialite ; plusieurs sources independantes la citent a
// l'identique. C'est bien celle de la landing d'origine : la seconde, que
// j'avais ecrite dans l'application (« 440 N Barranca Ave, Covina »), etait
// fausse.
//
// ATTENTION AU CONTRESENS : Vercel est une societe AMERICAINE, et la loi
// impose de publier l'identite et l'adresse de l'hebergeur — donc celles-la.
// Ce qui est en France, c'est l'ENDROIT OU LE CODE S'EXECUTE (region cdg1) et
// l'endroit ou les donnees sont stockees (Supabase, eu-west-3). Ecrire
// « Vercel est en France » serait faux ; les deux phrases ci-dessous disent
// exactement ce qui est vrai, et elles sont les memes partout.
export const HEBERGEUR_WEB = "Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis";
export const HEBERGEUR_BASE = "Supabase, sur OVHcloud — région eu-west-3 (Paris, France)";
export const HEBERGEUR_REGION = "Fonctions serveur exécutées en région cdg1 (Paris, France).";
