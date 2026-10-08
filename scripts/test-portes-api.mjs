// LES PORTES OUVERTES SUR INTERNET.
//
// Les fonctions de api/ sont les seules parties de TiMat que n'importe qui peut
// appeler. Quatre d'entre elles s'ouvraient sans aucune authentification, avec
// « Access-Control-Allow-Origin: * », et trois écrivaient AVEC LA CLÉ DE
// SERVICE — c'est-à-dire en passant outre toutes les politiques RLS :
//
//   /api/send-email    faisait partir un courriel signé par le domaine, sujet
//                      libre, bouton vers n'importe quelle URL ;
//   /api/invite-parent écrivait dans « invitations » en attribuant l'invitation
//                      à l'assistante maternelle que l'appelant désignait,
//                      supprimait ses invitations en attente, et envoyait un
//                      courriel dont le lien venait du corps de la requête ;
//   /api/stripe        rendait l'URL du portail de facturation de n'importe
//                      quel client Stripe dont on donnait l'identifiant —
//                      factures, carte, adresse, bouton de résiliation ;
//   /api/support       insérait dans « support_messages » ce qu'on voulait, au
//                      nom de l'adresse qu'on voulait.
//
// Ce contrôle est statique et tient dans la chaîne de build. Sa règle vaut pour
// les portes à venir : une fonction qui accepte un POST et qui écrit avec la
// clé de service doit vérifier qui appelle.
//
//   node scripts/test-portes-api.mjs
import { readFileSync, readdirSync } from "node:fs";

const dossier = new URL("../api/", import.meta.url);
const ko = [];
const dire = (bon, nom, detail) => {
  if (bon) console.log(`  ok  ${nom}`);
  else { ko.push(`${nom}${detail ? " — " + detail : ""}`); console.log(`  KO  ${nom}${detail ? "\n        " + detail : ""}`); }
};

console.log("\n=== LES PORTES DE api/ ===\n");

// Les fichiers commençant par « _ » ne sont pas des routes : Vercel les ignore.
// C'est ainsi que api/_authentifier.js peut être partagé sans consommer une des
// douze fonctions du forfait Hobby.
const routes = readdirSync(dossier).filter((f) => f.endsWith(".js") && !f.startsWith("_"));

// Le forfait Vercel Hobby n'autorise que douze fonctions SERVERLESS par
// déploiement. Une treizième fait ÉCHOUER le déploiement de production alors
// que la construction réussit : le site reste sur la version précédente, sans
// que rien ne le dise.
//
// Les fonctions EDGE ne comptent pas dans cette limite. Première version de ce
// contrôle, elle comptait les quatorze routes et criait au dépassement alors
// que dix seulement comptent — vérifié sur Vercel, où la production était en
// READY. Une alerte fausse sur une limite est particulièrement nuisible :
// elle pousse à supprimer du code qui va bien.
const estEdge = (nom) => /runtime:\s*['"]edge['"]/.test(readFileSync(new URL(nom, dossier), "utf8"));
const serverless = routes.filter((n) => !estEdge(n));
const edge = routes.filter(estEdge);
console.log(`  --  ${serverless.length} fonctions serverless + ${edge.length} edge = ${routes.length} routes`);
dire(serverless.length <= 12, `${serverless.length} fonctions serverless (douze au maximum sur le forfait Hobby)`,
  serverless.length > 12 ? "le déploiement de production échouerait en silence, en restant sur la version précédente" : "");

// Les portes qui n'écrivent rien et ne lisent que du public : elles n'ont pas
// besoin d'authentification, et on dit pourquoi plutôt que de les oublier.
const SANS_AUTHENTIFICATION = {
  "webhook.js": "appelée par Stripe, qui signe sa requête (STRIPE_WEBHOOK_SECRET vérifié)",
  "cron-essais.js": "appelée par le planificateur Vercel, qui présente CRON_SECRET",
  "pointage-public.js": "la borne de pointage : son jeton EST l'authentification",
  "demande-publique.js": "formulaire de contact public : son jeton de page l'identifie",
  "vitrine.js": "page vitrine publique, en lecture seule",
  "telecharger.js": "téléchargement d'un achat : le jeton de la commande l'autorise",
  "infolettre.js": "inscription à l'infolettre : volontairement ouverte",
  "publier-article.js": "appelée par Sanity, qui présente son secret",
  "backoffice.js": "protégée par la clé de maintenance",
  "send-push.js": "vérifie l'abonnement push de la destinataire",
};

for (const nom of routes.sort()) {
  const src = readFileSync(new URL(nom, dossier), "utf8");
  const code = src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");

  const accepteUnPost = /req\.method\s*[!=]==?\s*['"]POST['"]|method:\s*['"]POST['"]/.test(code);
  const cleDeService = /SUPABASE_SERVICE_KEY/.test(code);
  const envoieUnCourriel = /resend|Resend/.test(code);
  const toucheALArgent = /stripe|Stripe/.test(code);
  const sensible = accepteUnPost && (cleDeService || envoieUnCourriel || toucheALArgent);
  if (!sensible) continue;

  if (SANS_AUTHENTIFICATION[nom]) {
    console.log(`  --  ${nom} : sans authentification, et c'est voulu (${SANS_AUTHENTIFICATION[nom]})`);
    continue;
  }

  // ON EXIGE L'APPEL ET LE REFUS, PAS LE NOM.
  //
  // Premiere version de cette verification, elle cherchait simplement le nom
  // « utilisateurDeLaRequete » dans le fichier. Or ce nom figure aussi dans la
  // ligne d'import : remplacer l'appel par « const appelant = { id:
  // req.body?.asmatId } » laissait l'import en place, et la barriere passait au
  // vert sur une porte grande ouverte. Je l'ai verifie en sabotant le code
  // expres, et elle n'a rien vu.
  //
  // Il faut donc l'APPEL effectif, et le REFUS qui en decoule.
  const appelleLaVerification = /await\s+(?:utilisateurDeLaRequete\(req\)|verifierJeton)/.test(code)
    || /fetch\([^)]*auth\/v1\/user/.test(code)
    || /estInterne\(req\)/.test(code)
    || /CRON_SECRET/.test(code);
  const refuseSansJeton = /401/.test(code);
  dire(appelleLaVerification && refuseSansJeton, `${nom} vérifie qui appelle, et refuse sinon`,
    "elle accepte un POST et écrit ou envoie avec un secret du serveur : sans l'appel ET le 401, n'importe qui sur Internet peut l'utiliser");

  // ET L'IDENTITE NE VIENT JAMAIS DU CORPS DE LA REQUETE.
  //
  // C'est la vraie faille, et celle qu'un nom present dans un import ne dit
  // pas : tant que le corps peut designer qui on est, la verification ne sert
  // a rien.
  const IDENTITES = ["asmatId", "asmat_id", "userId", "user_id", "stripeCustomerId", "parentId", "parent_id"];
  const prisDansLeCorps = IDENTITES.filter((nomChamp) =>
    new RegExp("req\\.body\\??\\.?\\s*\\??\\.?" + nomChamp + "\\b").test(code)
    || new RegExp("\\{[^}]*\\b" + nomChamp + "\\b[^}]*\\}\\s*=\\s*req\\.body").test(code));
  dire(prisDansLeCorps.length === 0, `${nom} ne prend aucune identité dans le corps de la requête`,
    prisDansLeCorps.length ? `${prisDansLeCorps.join(", ")} y est lu : l'appelant désigne alors qui il veut` : "");

  const corsOuvert = /Access-Control-Allow-Origin['"]?\s*[,:]\s*['"]\*['"]/.test(code);
  dire(!corsOuvert, `${nom} ne laisse pas « Access-Control-Allow-Origin: * »`,
    "n'importe quel site pourrait l'appeler depuis le navigateur de ses visiteurs");
}

// Les identités ne se prennent pas dans le corps de la requête.
{
  const invite = readFileSync(new URL("invite-parent.js", dossier), "utf8");
  const code = invite.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  dire(/const asmatId = appelant\.id;/.test(code) && !/asmatId,?\s*enfantId.*=\s*req\.body/.test(code),
    "invite-parent prend l'assistante maternelle dans le jeton, pas dans le corps",
    "sinon on invite au nom de n'importe qui, avec la clé de service");
  dire(!/inviteUrl/.test(code),
    "invite-parent ne reçoit plus d'URL entière",
    "un lien reçu entier part dans le bouton d'un courriel signé par le domaine");
  dire(/esc\(prenom/.test(code),
    "invite-parent échappe les prénoms dans le courriel",
    "un prénom contenant une balise s'exécutait chez la destinataire");
}
{
  const st = readFileSync(new URL("stripe.js", dossier), "utf8");
  const code = st.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  dire(/select\('stripe_customer_id'\)[\s\S]{0,120}appelant\.id/.test(code)
    && !/req\.body[^\n]{0,40}stripeCustomerId|stripeCustomerId[^\n]{0,40}req\.body/.test(code),
    "stripe lit l'identifiant client dans le profil de l'appelante, et nulle part ailleurs",
    "le prendre dans le corps ouvrait le portail de facturation de n'importe quel client — factures, carte, résiliation");
  dire(/const userId = appelant\.id;/.test(code),
    "stripe prend l'utilisateur dans le jeton, pas dans le corps",
    "les métadonnées de la session servent au webhook qui accorde l'abonnement");
}
{
  const su = readFileSync(new URL("support.js", dossier), "utf8");
  const code = su.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  dire(/const email = appelant\.email;/.test(code),
    "support prend l'adresse dans le jeton, pas dans le corps",
    "sinon un message d'aide peut être déposé au nom de n'importe qui");
}

console.log(ko.length ? `\n${ko.length} problème(s) :\n` + ko.map((x) => "  - " + x).join("\n") + "\n"
  : "\nToutes les portes sensibles vérifient qui appelle.\n");
process.exit(ko.length ? 1 : 0);
