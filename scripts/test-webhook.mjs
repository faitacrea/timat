// Le webhook Stripe : une panne de la base doit faire réessayer Stripe.
//
// Pourquoi : les écritures en base n'étaient pas vérifiées. Une panne Supabase
// (clé de service invalide, base injoignable) laissait le webhook répondre 200 :
// Stripe tenait l'événement pour livré et ne le renvoyait jamais. Une
// assistante maternelle venait de payer et restait en formule gratuite, sans
// que rien ne le signale. Une réponse 500 fait réessayer Stripe.
//
// On exécute la vraie fonction, avec de vrais événements signés (la signature
// est calculée par le SDK Stripe), et Supabase simulé au niveau du réseau.
//
//   node scripts/test-webhook.mjs
import { Readable } from "node:stream";
import Stripe from "stripe";

process.env.STRIPE_SECRET_KEY = "sk_test_faux";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_secret_du_controle";
process.env.VITE_SUPABASE_URL = "https://exemple.supabase.co";
process.env.SUPABASE_SERVICE_KEY = "cle_de_service_fausse";

let ko = 0;
const verifie = (nom, reel, attendu) => {
  const ok = JSON.stringify(reel) === JSON.stringify(attendu);
  if (!ok) { ko++; console.log(`  KO  ${nom}\n      attendu ${JSON.stringify(attendu)}\n      obtenu  ${JSON.stringify(reel)}`); }
  else console.log(`  ok  ${nom}`);
};

// Supabase : un profil relié au client « cus_1 » ; « panne » fait échouer
// toute requête, comme une clé de service refusée.
let panne = false;
let ecritures = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(String(url));
  if (u.hostname !== "exemple.supabase.co") throw new Error("appel inattendu : " + u);
  if (panne) return new Response(JSON.stringify({ message: "Invalid API key" }), { status: 401, headers: { "Content-Type": "application/json" } });
  if ((opts.method || "GET") !== "GET") {
    ecritures.push(JSON.parse(opts.body || "null"));
    return new Response(null, { status: 204 });
  }
  const lie = /stripe_customer_id=eq\.cus_1(&|$)/.test(u.search);
  return new Response(JSON.stringify(lie ? [{ id: "u-1" }] : []), { status: 200, headers: { "Content-Type": "application/json" } });
};

const { default: webhook } = await import("../api/webhook.js");
const signeur = new Stripe("sk_test_faux");

const appeler = async (evenement, { secret = process.env.STRIPE_WEBHOOK_SECRET } = {}) => {
  const payload = JSON.stringify({ id: "evt_1", object: "event", ...evenement });
  const req = Readable.from([Buffer.from(payload)]);
  req.method = "POST";
  req.headers = { "stripe-signature": signeur.webhooks.generateTestHeaderString({ payload, secret }) };
  const res = { code: null, corps: null, status(c) { this.code = c; return this; }, json(o) { this.corps = o; return this; }, end() { return this; } };
  const silence = console.error; console.error = () => {};
  const bavard = console.log; console.log = () => {};
  await webhook(req, res);
  console.error = silence; console.log = bavard;
  return res.code;
};
const abo = (statut, client = "cus_1") => ({ type: "customer.subscription.updated", data: { object: { customer: client, status: statut } } });

console.log("\nWEBHOOK STRIPE");
verifie("signature fausse : refus 400", await appeler(abo("active"), { secret: "whsec_autre" }), 400);
verifie("événement inconnu bien signé : 200, rien n'est écrit", [await appeler({ type: "test.verification", data: { object: {} } }), ecritures.length], [200, 0]);

ecritures = [];
verifie("abonnement actif : 200 et le profil passe en Pro", [await appeler(abo("active")), ecritures[0]?.subscription_status], [200, "pro"]);
ecritures = [];
verifie("abonnement impayé : le profil repasse en gratuit", [await appeler(abo("unpaid")), ecritures[0]?.subscription_status], [200, "free"]);
ecritures = [];
verifie("client inconnu : 200, rien n'est écrit", [await appeler(abo("active", "cus_inconnu")), ecritures.length], [200, 0]);

panne = true;
verifie("base en panne (abonnement mis à jour) : 500, Stripe réessaiera", await appeler(abo("active")), 500);
verifie("base en panne (abonnement supprimé) : 500", await appeler({ type: "customer.subscription.deleted", data: { object: { customer: "cus_1" } } }), 500);
verifie("base en panne (paiement réussi) : 500, l'accès Pro n'est pas perdu en silence",
  await appeler({ type: "checkout.session.completed", data: { object: { mode: "subscription", customer: "cus_1", metadata: { userId: "u-1" } } } }), 500);
panne = false;

console.log(ko ? `\n${ko} anomalie(s)\n` : "\nAucune anomalie\n");
process.exit(ko ? 1 : 0);
