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
const vraiFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const u = String(url);
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

console.log(ko.length ? `\n${ko.length} problème(s) :\n` + ko.map((x) => "  - " + x).join("\n") + "\n"
  : "\nLa porte accepte les deux appelants légitimes, refuse tout le reste, et ne laisse sortir aucun lien.\n");
process.exit(ko.length ? 1 : 0);
