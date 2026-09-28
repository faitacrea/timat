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
