// ET QUAND L'APPEL EST LÉGITIME, LE COURRIEL PART-IL ?
//
// test-courriel-ferme.mjs vérifie que la porte REFUSE. Il ne vérifie pas
// qu'elle ACCEPTE — et une porte qui refuse tout est aussi cassée qu'une porte
// ouverte : plus aucune demande de signature, plus aucun bulletin, plus aucun
// rappel de fin d'essai ne partirait, en silence.
//
// Je ne peux pas obtenir de vraie session depuis cette machine : le proxy
// sortant refuse akicyckmbsjnewnvvcil.supabase.co (403 sur le CONNECT). Ce
// contrôle exécute donc la vraie fonction — celle de api/send-email.js, pas une
// copie — en simulant les DEUX services qu'elle appelle : Supabase, qui dit si
// le jeton désigne quelqu'un, et Resend, qui envoie.
//
// Ce qu'il prouve : avec un jeton que Supabase reconnaît, la fonction répond
// 200 et appelle bien Resend, avec le sujet du gabarit, l'expéditeur du domaine
// et un lien qui reste chez nous. Avec le secret du cron, pareil. Et le
// courriel ne part toujours PAS sans l'un des deux.
//
//   node scripts/test-courriel-accepte.mjs
const ko = [];
const dire = (bon, nom, detail) => {
  if (bon) console.log(`  ok  ${nom}`);
  else { ko.push(`${nom}${detail ? " — " + detail : ""}`); console.log(`  KO  ${nom}${detail ? "\n        " + detail : ""}`); }
};

// Les variables que la fonction lit. Elles existent en production (vérifié sur
// Vercel) ; ici on les pose pour pouvoir l'exécuter.
process.env.RESEND_API_KEY = "re_faux_pour_le_controle";
process.env.VITE_SUPABASE_URL = "https://exemple.supabase.co";
process.env.VITE_SUPABASE_KEY = "cle_publique_fausse";
process.env.CRON_SECRET = "secret-du-cron-pour-le-controle";

// --- Les deux services, simulés ---------------------------------------------
let envois = [];
let jetonsPresentes = [];
// Supabase sous les droits de l'appelante « u-1 » : un enfant la relie au
// parent « p-1 », dont get_recipient_email() rend l'adresse. Tout autre
// identifiant n'est relié à rien (la fonction rend null).
let panneSupabase = false;
let lecturesRest = [];
const vraiFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const u = String(url);
  if (u.includes("/rest/v1/")) {
    lecturesRest.push({ u, jeton: (options.headers?.Authorization || "").replace(/^Bearer\s+/, "") });
    if (panneSupabase) return { ok: false, status: 500, json: async () => ({ message: "panne" }) };
    if (u.includes("/rest/v1/enfants")) return { ok: true, status: 200, json: async () => [{ asmat_id: "u-1", parent_id: "p-1" }] };
    if (u.includes("/rest/v1/rpc/get_recipient_email")) {
      const id = JSON.parse(options.body || "{}").p_user_id;
      return { ok: true, status: 200, json: async () => (id === "p-1" ? { email: "parent@exemple.fr", prenom: "Sophie" } : null) };
    }
  }
  if (u.includes("/auth/v1/user")) {
    const porteur = (options.headers?.Authorization || "").replace(/^Bearer\s+/, "");
    jetonsPresentes.push(porteur);
    // « jeton-valide » est le seul que ce Supabase simulé reconnaît.
    const bon = porteur === "jeton-valide";
    return { ok: bon, status: bon ? 200 : 401, json: async () => (bon ? { id: "u-1", email: "marie@exemple.fr" } : { msg: "invalid" }) };
  }
  if (u.includes("api.resend.com")) {
    envois.push(JSON.parse(options.body));
    return { ok: true, status: 200, json: async () => ({ id: "env-1" }) };
  }
  return vraiFetch(url, options);
};

const { default: handler } = await import("../api/send-email.js");

const requete = (entetes, corps) => ({
  method: "POST",
  headers: new Headers({ "Content-Type": "application/json", ...entetes }),
  json: async () => corps,
});
const CORPS = {
  type: "bulletin_sent",
  to: "parent@exemple.fr",
  vars: { parent_prenom: "Sophie", mois: "octobre 2026" },
};

console.log("\n=== LA PORTE DES COURRIELS — et quand l'appel est légitime ? ===\n");

// 1. AVEC UN JETON QUE SUPABASE RECONNAÎT : le courriel part.
envois = []; jetonsPresentes = [];
{
  const r = await handler(requete({ Authorization: "Bearer jeton-valide" }, CORPS));
  const corps = await r.json();
  dire(r.status === 200 && corps.success === true,
    "un appel avec un jeton valide repart en 200",
    `reçu ${r.status} ${JSON.stringify(corps).slice(0, 120)}`);
  dire(jetonsPresentes.includes("jeton-valide"),
    "le jeton est bien présenté à Supabase pour vérification",
    "la fonction ne demande pas à Supabase qui appelle");
  dire(envois.length === 1, `un seul courriel part (${envois.length})`);
  if (envois.length === 1) {
    const e = envois[0];
    dire(/^TiMat </.test(e.from) && /@(?:[a-z0-9-]+\.)*timat\.app>/.test(e.from),
      `l'expéditeur reste sur le domaine (${e.from})`);
    dire(e.subject === "Votre bulletin de salaire est disponible",
      `le sujet est celui du gabarit (${e.subject})`);
    dire(e.to[0] === "parent@exemple.fr", "le destinataire est celui demandé");
    dire(/Sophie/.test(e.html) && /octobre 2026/.test(e.html),
      "les données du gabarit sont bien dans le corps");
    dire(!/href=['"](?!https:\/\/(?:[a-z0-9-]+\.)*timat\.app)/i.test(e.html),
      "aucun lien ne sort du domaine");
  }
}

// 2. AVEC LE SECRET DU CRON : le courriel part aussi, sans jeton d'utilisateur.
envois = []; jetonsPresentes = [];
{
  const r = await handler(requete({ "x-timat-interne": process.env.CRON_SECRET },
    { type: "essai_rappel_3", to: "marie@exemple.fr", vars: { prenom: "Marie", fin: "1er décembre 2026", url: "https://www.timat.app" } }));
  dire(r.status === 200 && envois.length === 1,
    "la tâche planifiée passe avec son secret, sans jeton d'utilisateur",
    `reçu ${r.status}, ${envois.length} envoi(s) — les rappels de fin d'essai ne partiraient plus`);
  dire(jetonsPresentes.length === 0,
    "et elle ne déclenche aucune vérification de jeton inutile");
}

// 3. SANS RIEN, ET AVEC UN MAUVAIS SECRET : rien ne part.
for (const [nom, entetes] of [
  ["sans aucun en-tête", {}],
  ["avec un jeton que Supabase refuse", { Authorization: "Bearer jeton-bidon" }],
  ["avec un mauvais secret interne", { "x-timat-interne": "pas-le-bon" }],
]) {
  envois = [];
  const r = await handler(requete(entetes, CORPS));
  dire(r.status === 401 && envois.length === 0, `${nom} : 401 et aucun envoi`,
    `reçu ${r.status} avec ${envois.length} envoi(s)`);
}

// 4. UN LIEN HORS DOMAINE EST REMPLACÉ, PAS TRANSMIS.
envois = [];
{
  await handler(requete({ Authorization: "Bearer jeton-valide" },
    { type: "signature_reminder", to: "parent@exemple.fr",
      vars: { enfant_prenom: "Léo", date: "1er octobre 2026", url: "https://site-de-pirate.example/piege" } }));
  const html = envois[0]?.html || "";
  dire(!/site-de-pirate/.test(html), "un lien hors domaine n'arrive pas dans le courriel",
    "le bouton mènerait chez l'attaquant, signé par notre domaine");
  dire(/https:\/\/www\.timat\.app/.test(html), "il est remplacé par le site");
}

// 5. LE DESTINATAIRE DOIT ÊTRE RELIÉ À L'APPELANTE.
//
// Une fois connecté — et l'inscription est libre —, n'importe quel compte
// pouvait faire partir un gabarit TiMat vers n'importe quelle adresse.
envois = []; lecturesRest = [];
{
  const r = await handler(requete({ Authorization: "Bearer jeton-valide" }, { ...CORPS, to: "inconnue@exemple.fr" }));
  dire(r.status === 403 && envois.length === 0, "une adresse reliée à personne : 403 et aucun envoi",
    `reçu ${r.status} avec ${envois.length} envoi(s) — un compte quelconque écrirait à qui il veut sous notre nom`);
  dire(lecturesRest.length > 0 && lecturesRest.every((l) => l.jeton === "jeton-valide"),
    "la vérification se fait avec le jeton de l'appelante (ses droits, pas la clé de service)");
}
envois = [];
{
  const r = await handler(requete({ Authorization: "Bearer jeton-valide" }, { ...CORPS, to: "Parent@Exemple.FR" }));
  dire(r.status === 200 && envois.length === 1, "la casse de l'adresse ne bloque pas un envoi légitime", `reçu ${r.status}`);
}

// 6. LES GABARITS DU SERVEUR NE PARTENT PAS DU NAVIGATEUR.
envois = [];
{
  const r = await handler(requete({ Authorization: "Bearer jeton-valide" },
    { type: "fermeture_compte_parent", to: "parent@exemple.fr", vars: { asmat_prenom: "X", date: "demain" } }));
  dire(r.status === 403 && envois.length === 0, "« fermeture_compte_parent » demandé par un navigateur : 403",
    "n'importe quel compte pourrait annoncer à un parent la fermeture d'un compte qui n'est pas le sien");
}

// 7. VÉRIFICATION IMPOSSIBLE : ON REFUSE, ON NE DEVINE PAS.
envois = []; panneSupabase = true;
{
  const r = await handler(requete({ Authorization: "Bearer jeton-valide" }, CORPS));
  dire(r.status === 503 && envois.length === 0, "base injoignable : refus (503) et aucun envoi", `reçu ${r.status}`);
}
panneSupabase = false;

// 8. LE SERVEUR, LUI, N'EST PAS BORNÉ : il écrit aux familles d'une
// assistante maternelle qui ferme son compte, sans jeton d'utilisatrice.
envois = []; lecturesRest = [];
{
  const r = await handler(requete({ "x-timat-interne": process.env.CRON_SECRET },
    { type: "fermeture_compte_parent", to: "parent@exemple.fr", vars: { asmat_prenom: "Marie", enfants: "Léo", date: "27 octobre 2026", url: "https://www.timat.app" } }));
  dire(r.status === 200 && envois.length === 1 && lecturesRest.length === 0,
    "le secret interne passe sans vérification de destinataire", `reçu ${r.status}, ${envois.length} envoi(s)`);
}

console.log(ko.length ? `\n${ko.length} problème(s) :\n` + ko.map((x) => "  - " + x).join("\n") + "\n"
  : "\nLa porte accepte les deux appelants légitimes, refuse tout le reste, et ne laisse sortir aucun lien.\n");
process.exit(ko.length ? 1 : 0);
