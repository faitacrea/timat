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

// LES RESEAUX SOCIAUX, au meme endroit que le reste des coordonnees.
// Instagram : compte cree par Sophie le 12 octobre 2026 (@timat_app).
export const INSTAGRAM_URL = "https://www.instagram.com/timat_app/";
export const INSTAGRAM_NOM = "@timat_app";

// Page et groupe Facebook, liens donnés par Sophie le 22 octobre 2026. Ce sont
// des liens de partage (facebook.com/share/...) : ils redirigent vers la Page
// et le groupe, et c'est la seule forme qu'on puisse vérifier d'ici (Facebook
// est bloqué depuis l'environnement de développement). On a retiré le suivi
// « ?mibextid=… » ajouté par l'application. Si l'adresse directe de la Page
// (facebook.com/<nom>) est connue un jour, c'est ici qu'elle se change.
export const FACEBOOK_PAGE_URL = "https://www.facebook.com/share/1EREng5TZz/";
export const FACEBOOK_GROUPE_URL = "https://www.facebook.com/share/g/1DrVY3qE2W/";

// L'HEBERGEUR, ECRIT UNE SEULE FOIS.
//
// Deux adresses differentes coexistaient : « 340 S Lemon Ave, Walnut » sur la
// landing et « 440 N Barranca Ave, Covina » dans l'application. Les deux ne
// peuvent pas etre vraies, et la loi n° 2004-575 (LCEN) impose de publier
// l'adresse de l'hebergeur. Une valeur recopiee a deux endroits finit toujours
// par diverger : il n'y en a plus qu'une, et une barriere d'audit interdit de
// la reecrire ailleurs.
//
// CORRECTION DU 12 OCTOBRE 2026 — J'AVAIS TRANCHE DANS LE MAUVAIS SENS.
//
// Le 30 septembre, j'ai retenu « 340 S Lemon Ave, Walnut » en ecrivant que
// c'etait l'adresse « que Vercel publie », et j'ai qualifie Covina de fausse.
// C'etait l'inverse. Verifie le 12 octobre sur les documents de Vercel
// lui-meme : sa politique de confidentialite (Privacy Notice), son avenant de
// traitement des donnees (DPA, « main address »), ses conditions generales
// (adresse de la demande d'arbitrage), sa politique DMCA et son ancienne
// politique de 2021 donnent TOUS « 440 N Barranca Ave #4133, Covina, CA
// 91723 ». Walnut n'apparait que dans un accord passe avec un tiers (Sitecore),
// et dans des annuaires qui le recopient. Le telephone, +1 559 288 7060, est
// celui de la politique DMCA de Vercel.
//
// La LCEN (art. 6 III-1) exige le nom, l'adresse ET le telephone de
// l'hebergeur. Le telephone manquait.
//
// SUPABASE N'EST PAS SUR OVHCLOUD. Ses regions sont des regions Amazon Web
// Services, et « eu-west-3 » est le code d'AWS Paris (documentation Supabase,
// « Available regions »). La ligne disait « Supabase, sur OVHcloud » : faux,
// sur la page meme qui dit aux familles ou sont les donnees de leurs enfants.
// L'entite qui contracte avec un client direct est Supabase Pte. Ltd., a
// Singapour (conditions generales et DPA de Supabase) ; Supabase ne publie pas
// de numero de telephone, seulement legal@supabase.io.
//
// ATTENTION AU CONTRESENS : Vercel est une societe AMERICAINE, et la loi
// impose de publier l'identite et l'adresse de l'hebergeur — donc celles-la.
// Ce qui est en France, c'est l'ENDROIT OU LE CODE S'EXECUTE (region cdg1) et
// l'endroit ou les donnees sont stockees (Supabase, eu-west-3). Ecrire
// « Vercel est en France » serait faux ; les deux phrases ci-dessous disent
// exactement ce qui est vrai, et elles sont les memes partout.
export const HEBERGEUR_WEB = "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — tél. +1 559 288 7060";
export const HEBERGEUR_BASE = "Supabase Pte. Ltd., 65 Chulia Street #38-02/03, OCBC Centre, Singapour 049513 (legal@supabase.io) — données stockées chez Amazon Web Services, région eu-west-3 (Paris, France)";
// La meme verite, en une ligne courte, pour les textes ou la phrase longue ne
// tient pas (FAQ, ecran RGPD). Une seule formulation, reprise partout.
export const STOCKAGE_DONNEES = "à Paris, chez Amazon Web Services (région eu-west-3), via Supabase";
export const HEBERGEUR_REGION = "Fonctions serveur exécutées en région cdg1 (Paris, France).";
