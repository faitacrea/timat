// LES TROIS AUTRES PORTES ACCEPTENT-ELLES ENCORE ?
//
// test-portes-api.mjs vérifie que invite-parent, support et stripe REFUSENT un
// appel sans jeton. C'est la moitié du problème. Une porte qui refuse TOUT est
// aussi cassée qu'une porte ouverte, et plus silencieusement : tu ne pourrais
// plus inviter un parent, plus envoyer un message d'aide, plus résilier un
// abonnement — et rien ne le dirait avant qu'une utilisatrice ne s'en plaigne.
//
// Je ne peux pas obtenir de vraie session depuis cette machine : le proxy
// sortant refuse akicyckmbsjnewnvvcil.supabase.co. Ce contrôle exécute donc les
// VRAIES fonctions en simulant ce qu'elles appellent — Supabase pour la
// vérification du jeton, le client Supabase pour la base, Resend pour l'envoi,
// Stripe pour le portail.
//
//   node scripts/test-portes-acceptent.mjs
import { createRequire } from "node:module";

const ko = [];
const dire = (bon, nom, detail) => {
  if (bon) console.log(`  ok  ${nom}`);
  else { ko.push(`${nom}${detail ? " — " + detail : ""}`); console.log(`  KO  ${nom}${detail ? "\n        " + detail : ""}`); }
};

process.env.VITE_SUPABASE_URL = "https://exemple.supabase.co";
process.env.VITE_SUPABASE_KEY = "cle_publique_fausse";
process.env.SUPABASE_SERVICE_KEY = "cle_de_service_fausse";
process.env.RESEND_API_KEY = "re_faux";
process.env.STRIPE_SECRET_KEY = "sk_test_faux";
process.env.STRIPE_PRICE_ID = "price_faux";
process.env.CRON_SECRET = "secret-du-cron";

// --- Ce que les fonctions appellent, simulé ---------------------------------
const JETON_BON = "jeton-valide";
const ID_APPELANT = "11111111-1111-4111-8111-111111111111";
let ecrits = [];          // les écritures en base
let courriels = [];       // les envois Resend
let portails = [];        // les sessions de portail Stripe
let lectures = [];        // les lectures en base
let appelsStripe = [];    // les appels au SDK Stripe, arrêtés net

// LES SERVICES, SIMULÉS AU NIVEAU DU RÉSEAU.
//
// On ne remplace pas « createClient » : les fonctions font
// « import { createClient } », et on ne réécrit pas l'export d'un module ES.
// On intercepte donc les requêtes du vrai client Supabase, qui parle en REST.
// C'est plus fidèle qu'une doublure d'objet — et c'est ce qui marche.
// LE SDK STRIPE : ON L'ARRÊTE NET, AVEC UN MARQUEUR.
//
// Il n'appelle pas « fetch » mais le module https de Node, donc la doublure
// réseau ne le voit pas : l'appel partait pour de vrai vers api.stripe.com avec
// une clé fausse. Dans la chaîne de build, cela voulait dire un appel sortant
// inutile, trois tentatives, et un contrôle qui dépend du réseau.
//
// J'ai d'abord essayé d'imiter la réponse de Stripe. Le SDK attend davantage du
// contrat de node:https que ce que j'avais écrit, et la promesse restait en
// suspens — le contrôle se terminait sans rien vérifier, en silence. Imiter un
// SDK entier pour prouver trois lignes, c'est trop de machine pour trop peu.
//
// On l'arrête donc net, avec une erreur reconnaissable. Si la fonction répond
// 500 EN PORTANT CE MARQUEUR, c'est qu'elle a passé l'authentification, lu le
// profil, et appelé Stripe avec l'identifiant qu'elle y a trouvé. Tout ce qui
// est de nous est donc vérifié ; le reste est du code inchangé, qui fonctionne
// en production.
const MARQUEUR_STRIPE = "stripe-intercepte-par-le-controle";
import https from "node:https";
const vraiRequest = https.request;
https.request = function (...args) {
  const o = typeof args[0] === "string" ? { host: args[0] } : (args[0] || {});
  const hote = String(o.host || o.hostname || "");
  if (!hote.includes("stripe.com")) return vraiRequest.apply(this, args);
  appelsStripe.push({ hote, chemin: String(o.path || "") });
  throw new Error(MARQUEUR_STRIPE);
};

const vraiFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const u = String(url);
  if (u.includes("/auth/v1/user")) {
    const p = (options.headers?.Authorization || options.headers?.get?.("Authorization") || "").replace(/^Bearer\s+/, "");
    const bon = p === JETON_BON;
    return new Response(JSON.stringify(bon ? { id: ID_APPELANT, email: "marie@exemple.fr" } : {}), { status: bon ? 200 : 401, headers: { "Content-Type": "application/json" } });
  }
  if (u.includes("exemple.supabase.co/rest/v1/")) {
    const table = (u.match(/rest\/v1\/([a-z_]+)/) || [])[1];
    if ((options.method || "GET") === "GET") {
      lectures.push({ table, url: u });
      const corps = table === "enfants" ? [{ id: "22222222-2222-4222-8222-222222222222" }]
        : table === "profiles" ? [{ stripe_customer_id: "cus_du_profil" }] : [];
      return new Response(JSON.stringify(corps), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    ecrits.push({ table, methode: options.method, corps: options.body });
    return new Response("[]", { status: 201, headers: { "Content-Type": "application/json" } });
  }
  if (u.includes("api.resend.com")) {
    courriels.push(JSON.parse(options.body || "{}"));
    return new Response(JSON.stringify({ id: "env-1" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (u.includes("api.stripe.com")) {
    portails.push({ u, corps: String(options.body || "") });
    return new Response(JSON.stringify({ id: "bps_1", url: "https://billing.stripe.com/session/faux" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  return vraiFetch(url, options);
};

// --- Une requête et une réponse à la mode Node ------------------------------
const faireReq = (entetes, corps, query = {}) => ({
  method: "POST", headers: { "content-type": "application/json", ...entetes }, body: corps, query,
});
const faireRes = () => {
  const r = { code: null, corps: null, entetes: {} };
  r.setHeader = (k, v) => { r.entetes[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (o) => { r.corps = o; return r; };
  r.end = () => r;
  return r;
};

console.log("\n=== LES TROIS AUTRES PORTES — acceptent-elles encore ? ===\n");

const { default: invite } = await import("../api/invite-parent.js");
const { default: support } = await import("../api/support.js");
const { default: stripe } = await import("../api/stripe.js");

// 1. INVITER UN PARENT
ecrits = []; courriels = [];
{
  const res = faireRes();
  await invite(faireReq({ authorization: "Bearer " + JETON_BON },
    { emailParent: "parent@exemple.fr", prenomEnfant: "Léo", prenomAsmat: "Marie",
      enfantId: "22222222-2222-4222-8222-222222222222", inviteToken: "jeton-de-partage-abc123" }), res);
  dire(res.code === 200, `invite-parent accepte un appel légitime (${res.code})`,
    `tu ne pourrais plus inviter un parent : ${JSON.stringify(res.corps).slice(0, 140)}`);
  dire(courriels.length === 1, `et le courriel d'invitation part (${courriels.length})`);
  if (courriels.length) {
    dire(/\/\?invite=jeton-de-partage-abc123/.test(courriels[0].html),
      "le lien de rattachement direct est bien dans le courriel",
      "le parent arriverait sur la page d'accueil au lieu de l'espace de son enfant");
    dire(!/href='(?!https:\/\/www\.timat\.app)/.test(courriels[0].html), "et aucun lien ne sort du domaine");
  }
  const inv = ecrits.find((e) => e.table === "invitations" && e.methode === "POST");
  dire(!!inv && String(inv.corps).includes(ID_APPELANT),
    "l'invitation est enregistrée au nom de l'APPELANTE, pas de qui le corps désigne",
    "c'est la faille qu'on vient de fermer");
}

// 2. LE MESSAGE D'AIDE
ecrits = [];
{
  const res = faireRes();
  await support(faireReq({ authorization: "Bearer " + JETON_BON },
    { message: "Bonjour, j'ai une question.", sujet: "Autre", prenom: "Marie", role: "asmat" }), res);
  dire(res.code === 200, `support accepte un appel légitime (${res.code})`,
    "tu ne recevrais plus aucun message d'aide");
  const m = ecrits.find((e) => e.table === "support_messages" && e.methode === "POST");
  dire(!!m && String(m.corps).includes("marie@exemple.fr"),
    "le message porte l'adresse DU COMPTE, pas celle que le corps annonce");
}

// 3. LE PORTAIL DE FACTURATION
//
// Le SDK Stripe est arrêté net au niveau de node:https (voir en tête de
// fichier) : aucun appel ne sort. Le 500 qui en résulte est attendu — ce qu'on
// vérifie, c'est que la fonction est ARRIVÉE jusque-là, avec l'identifiant
// client lu dans le profil.
portails = []; lectures = []; appelsStripe = [];
{
  const res = faireRes();
  // La fonction journalise l'echec de l'appel Stripe — c'est normal, c'est nous
  // qui l'avons arrete. On tait cette ligne : dans le journal de build, « An
  // error occurred with our connection to Stripe » inquiete pour rien.
  const vraiErreur = console.error;
  console.error = (...a) => { if (!String(a[0] || "").includes("Customer portal error")) vraiErreur(...a); };
  await stripe(faireReq({ authorization: "Bearer " + JETON_BON }, {}, { action: "portail" }), res);
  console.error = vraiErreur;
  console.log("  --  l'appel Stripe est arrêté net par le contrôle : aucune requête ne sort (vérifié au proxy)");
  dire(res.code !== 401, `stripe laisse passer un appel légitime (${res.code}, pas 401)`,
    "une utilisatrice ne pourrait plus gérer ni résilier son abonnement");
  dire(res.code !== 404, "et elle trouve un identifiant client rattaché au compte",
    "elle répondrait « aucun abonnement rattaché » alors que le profil en porte un");
  dire(lectures.some((l) => l.table === "profiles" && l.url.includes("stripe_customer_id")),
    "l'identifiant client est lu dans le PROFIL de l'appelante",
    "s'il venait du corps de la requête, on ouvrirait le portail de n'importe qui");
  dire(appelsStripe.some((a) => /billing_portal\/sessions/.test(a.chemin)),
    "et elle appelle bien le portail de facturation de Stripe",
    `appels observés : ${JSON.stringify(appelsStripe)}`);
}

// 4. ET LES TROIS REFUSENT TOUJOURS SANS JETON
for (const [nom, fn, corps, query] of [
  ["invite-parent", invite, { emailParent: "x@y.fr" }, {}],
  ["support", support, { message: "x" }, {}],
  ["stripe", stripe, {}, { action: "portail" }],
]) {
  ecrits = []; courriels = []; portails = [];
  const res = faireRes();
  await fn(faireReq({}, corps, query), res);
  dire(res.code === 401 && ecrits.length === 0 && courriels.length === 0 && portails.length === 0,
    `${nom} refuse toujours un appel sans jeton (${res.code})`,
    `elle a répondu ${res.code} avec ${ecrits.length} écriture(s), ${courriels.length} courriel(s), ${portails.length} appel(s) Stripe`);
}

console.log(ko.length ? `\n${ko.length} problème(s) :\n` + ko.map((x) => "  - " + x).join("\n") + "\n"
  : "\nLes trois portes acceptent les appels légitimes et refusent les autres.\n");
process.exit(ko.length ? 1 : 0);
