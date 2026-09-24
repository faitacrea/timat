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
// noreply@timat.app n'est PAS une adresse de contact : c'est l'expediteur
// technique des envois Resend, sur le domaine verifie. Elle ne recoit rien et
// ne doit jamais etre proposee a quelqu'un.
export const EMAIL_CONTACT = "contact.timat.app@gmail.com";
export const EMAIL_EXPEDITEUR = "noreply@timat.app";
