// LA PORTE DES COURRIELS EST-ELLE FERMÉE ?
//
// /api/send-email n'avait AUCUNE authentification. N'importe qui sur Internet
// pouvait la poster et faire partir un courriel :
//
//   De      : TiMat <noreply@timat.app>   ← le domaine, avec sa signature DKIM
//   À       : n'importe quelle adresse
//   Objet   : au choix de l'appelant      ← « subject || tpl.subject »
//   Corps   : un vrai gabarit TiMat, bouton compris
//   Bouton  : vers n'importe quelle URL https  ← lien() ne contraignait rien
//
// C'est un kit d'hameçonnage complet. Et le danger n'est pas seulement pour la
// destinataire : un domaine qui sert à hameçonner finit sur les listes noires,
// et les vrais courriels — demandes de signature, bulletins de salaire —
// cessent d'arriver.
//
// La limite de dix par minute et par IP n'y changeait rien : elle se contourne
// en changeant d'IP, et elle est tenue en mémoire d'une fonction edge, donc par
// instance.
//
// Ce contrôle est statique, il ne touche à rien, et il tient dans la chaîne de
// build. Il vérifie les quatre verrous, et refuse qu'on en retire un.
//
//   node scripts/test-courriel-ferme.mjs
import { readFileSync } from "node:fs";

const lire = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
// ON RETIRE LES COMMENTAIRES AVANT DE CHERCHER.
//
// Les verifications en creux (« ce motif ne doit plus apparaitre ») tombent
// sinon sur le commentaire qui explique le defaut corrige. Premiere version de
// ce controle, elle lisait sa propre explication — « subject || tpl.subject » —
// et declarait le defaut toujours present. C'est la deuxieme fois dans la
// seance : une barriere doit lire le code, pas ce qu'on en dit.
const sansCommentaires = (src) => src
  .split("\n")
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .map((l) => l.replace(/\s\/\/.*$/, ""))
  .join("\n");

const api = lire("../api/send-email.js");
const apiCode = sansCommentaires(api);
const cron = lire("../api/cron-essais.js");
const app = lire("../src/App.jsx");

const ko = [];
const verifie = (nom, condition, detail) => {
  if (condition) console.log(`  ok  ${nom}`);
  else { ko.push(`${nom}${detail ? " — " + detail : ""}`); console.log(`  KO  ${nom}`); }
};

console.log("\n=== LA PORTE DES COURRIELS ===\n");

// 1. L'appelant doit être authentifié.
verifie("un appel sans jeton ni secret interne repart en 401",
  /Authentification requise[\s\S]{0,200}status: 401/.test(api) && /auth\/v1\/user/.test(api),
  "le 401 ou la vérification du jeton a disparu de api/send-email.js");

verifie("le jeton est vérifié auprès de Supabase, pas décodé sur place",
  /fetch\(`\$\{urlSupabase\}\/auth\/v1\/user`/.test(api),
  "un jeton décodé sans être vérifié se fabrique à la main");

verifie("la vérification n'utilise pas la clé de service",
  !/SUPABASE_SERVICE_KEY/.test(api),
  "la clé de service n'a rien à faire dans une fonction appelée par le navigateur");

// 2. Le sujet appartient au gabarit.
verifie("le sujet ne peut pas être choisi par l'appelant",
  /const finalSubject = tpl\.subject;/.test(apiCode) && !/subject \|\| tpl\.subject/.test(apiCode),
  "« subject || tpl.subject » laisse écrire n'importe quelle ligne d'objet sous notre signature");

verifie("aucun appel de l'application ne passe encore un sujet",
  !/sendNotificationEmail\(\{[\s\S]{0,300}?subject\s*:/.test(lire("../src/ecrans-quotidien.jsx")
    + lire("../src/ecrans-app.jsx") + lire("../src/gestion.jsx") + lire("../src/ecrans-secondaires.jsx")),
  "un appel qui passe un sujet sera silencieusement ignoré : autant le retirer");

// 3. Les boutons ne sortent pas du domaine.
verifie("un bouton de courriel ne peut pointer que sur timat.app",
  /DOMAINE_AUTORISE\s*=\s*\/\^https:\\\/\\\/\(\?:\[a-z0-9-\]\+\\\.\)\*timat\\\.app/.test(api),
  "lien() acceptait n'importe quelle adresse https");

verifie("l'expéditeur reste contraint au domaine",
  /FROM_AUTORISE\s*=/.test(api) && /timat\\\.app>/.test(api),
  "sans cela, on signe au nom de n'importe qui");

// 4. Les deux appelants légitimes présentent leur preuve.
verifie("l'application envoie le jeton de session",
  /supabase\.auth\.getSession\(\)[\s\S]{0,400}Authorization["']?\s*:\s*["']Bearer/.test(app),
  "sendNotificationEmail() doit présenter le jeton, sinon tous les courriels partent en 401");

verifie("la tâche planifiée présente le secret du cron",
  (cron.match(/'x-timat-interne': process\.env\.CRON_SECRET/g) || []).length >= 3,
  "les rappels d'essai partiraient en 401");

// 5. ET LE SECRET NE DOIT JAMAIS REPARTIR DANS UNE REPONSE.
//
// Cette vérification existe parce que je l'ai cassé moi-même : un
// remplacement automatique a ajouté « x-timat-interne » dans les en-têtes de la
// fonction repondre() de cron-essais.js, c'est-à-dire dans la REPONSE HTTP. Le
// secret du cron serait parti à qui appelait la tâche planifiée. Rien ne
// l'aurait signalé.
{
  const lignes = cron.split("\n");
  const fautes = [];
  lignes.forEach((l, i) => {
    if (!/x-timat-interne/.test(l)) return;
    const contexte = lignes.slice(Math.max(0, i - 3), i + 1).join("\n");
    if (!/fetch\(|method:\s*'POST'/.test(contexte)) fautes.push(i + 1);
  });
  verifie("le secret du cron ne figure que dans des appels SORTANTS",
    fautes.length === 0,
    fautes.length ? `ligne(s) ${fautes.join(", ")} : hors d'un fetch, c'est une réponse HTTP — le secret serait publié` : "");
}

verifie("aucune réponse de cron-essais ne porte d'en-tête secret",
  !/new Response\([\s\S]{0,200}x-timat-interne/.test(cron),
  "le secret partirait à qui appelle la tâche planifiée");

console.log(ko.length ? `\n${ko.length} problème(s) :\n` + ko.map((x) => "  - " + x).join("\n") + "\n"
  : "\nLa porte des courriels est fermée, et les deux appelants légitimes ont leur clé.\n");
process.exit(ko.length ? 1 : 0);
