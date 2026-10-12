// Le reglage de l'abonnement a la fermeture d'un compte, contre un faux Stripe.
//
// Pourquoi : supprimer son compte n'arretait pas l'abonnement — une
// assistante maternelle partie continuait d'etre prelevee. Et la reprise,
// quand une fermeture programmee est annulee, ne doit JAMAIS relancer un
// abonnement que l'utilisatrice avait resilie elle-meme dans le portail :
// seul l'arret pose par TiMat (marque « fermeture_timat ») se reprend.
//
//   node scripts/test-fermeture.mjs
process.env.STRIPE_SECRET_KEY = "sk_test_faux";
const { reglerAbonnements, famillesDe, DELAI_FERMETURE_JOURS } = await import("../api/_fermeture.js");

let ko = 0;
const verifie = (nom, reel, attendu) => {
  const ok = JSON.stringify(reel) === JSON.stringify(attendu);
  if (!ok) { ko++; console.log(`  KO  ${nom}\n      attendu ${JSON.stringify(attendu)}\n      obtenu  ${JSON.stringify(reel)}`); }
  else console.log(`  ok  ${nom}`);
};

// Un faux Stripe : des abonnements en memoire, et le journal des appels.
let abos = [];
let journal = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  const chemin = u.pathname.replace("/v1/", "");
  const methode = opts.method || "GET";
  journal.push(methode + " " + chemin);
  if (methode === "GET" && chemin === "subscriptions") {
    return new Response(JSON.stringify({ data: abos.filter((a) => a.customer === u.searchParams.get("customer")) }), { status: 200 });
  }
  const id = chemin.split("/")[1];
  const a = abos.find((x) => x.id === id);
  if (!a) return new Response(JSON.stringify({ error: { message: "introuvable" } }), { status: 404 });
  if (methode === "DELETE") { a.status = "canceled"; return new Response(JSON.stringify(a), { status: 200 }); }
  const corps = new URLSearchParams(opts.body || "");
  if (corps.has("cancel_at_period_end")) a.cancel_at_period_end = corps.get("cancel_at_period_end") === "true";
  for (const [k, v] of corps) {
    const m = k.match(/^metadata\[(.+)\]$/);
    if (m) { if (v === "") delete a.metadata[m[1]]; else a.metadata[m[1]] = v; }
  }
  return new Response(JSON.stringify(a), { status: 200 });
};
const abo = (id, extra = {}) => ({ id, customer: "cus_1", status: "active", cancel_at_period_end: false, metadata: {}, ...extra });

console.log("\nFERMETURE — L'ABONNEMENT");

abos = [abo("sub_a")]; journal = [];
verifie("sans client Stripe : rien à faire, aucun appel", [await reglerAbonnements(null, "immediat"), journal.length], [0, 0]);

abos = [abo("sub_a")];
verifie("programmer : l'abonnement ne se renouvelle plus", await reglerAbonnements("cus_1", "fin_periode"), 1);
verifie("programmer : arrêt en fin de période, marqué TiMat", [abos[0].cancel_at_period_end, abos[0].metadata.fermeture_timat], [true, "1"]);
verifie("annuler la fermeture : l'abonnement reprend", await reglerAbonnements("cus_1", "reprendre"), 1);
verifie("annuler la fermeture : plus d'arrêt, plus de marque", [abos[0].cancel_at_period_end, abos[0].metadata.fermeture_timat], [false, undefined]);

abos = [abo("sub_b", { cancel_at_period_end: true })];
verifie("résilié par l'utilisatrice : programmer n'y touche pas", await reglerAbonnements("cus_1", "fin_periode"), 0);
verifie("résilié par l'utilisatrice : JAMAIS relancé à l'annulation", [await reglerAbonnements("cus_1", "reprendre"), abos[0].cancel_at_period_end], [0, true]);

abos = [abo("sub_c"), abo("sub_d", { status: "canceled" }), abo("sub_e", { status: "past_due" }), abo("sub_f", { customer: "cus_autre" })];
verifie("suppression : tout abonnement facturable est arrêté", await reglerAbonnements("cus_1", "immediat"), 2);
verifie("suppression : les deux facturables sont annulés, l'ancien reste tel quel", abos.map((a) => a.status), ["canceled", "canceled", "canceled", "active"]);
verifie("suppression : l'abonnement d'une autre cliente n'est pas touché", abos[3].status, "active");

globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: "panne" } }), { status: 500 });
let leve = false;
try { await reglerAbonnements("cus_1", "immediat"); } catch (e) { leve = /Stripe 500/.test(e.message); }
verifie("Stripe en panne : l'erreur remonte (et bloque la suppression)", leve, true);

const cle = process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_SECRET_KEY;
leve = false;
try { await reglerAbonnements("cus_1", "immediat"); } catch (e) { leve = /STRIPE_SECRET_KEY absente/.test(e.message); }
verifie("clé Stripe absente avec une cliente : refus, pas de silence", leve, true);
process.env.STRIPE_SECRET_KEY = cle;

console.log("\nFERMETURE — LES FAMILLES");
const faux = (enfants, parents) => ({
  from: (table) => {
    const q = { select() { return q; }, eq() { return q; }, not() { return q; }, in() { return q; },
      then: (ok) => ok(table === "enfants" ? { data: enfants, error: null } : { data: parents, error: null }) };
    return q;
  },
});
verifie("une famille, deux enfants : un seul courriel, les deux prénoms",
  await famillesDe(faux([{ prenom: "Léo", parent_id: "p1" }, { prenom: "Jade", parent_id: "p1" }], [{ id: "p1", email: "a@b.fr", prenom: "Sophie" }]), "x"),
  [{ email: "a@b.fr", prenom: "Sophie", enfants: "Léo et Jade" }]);
verifie("aucune famille reliée : aucun courriel", await famillesDe(faux([], []), "x"), []);
verifie("parent sans adresse : écarté", await famillesDe(faux([{ prenom: "Tom", parent_id: "p2" }], [{ id: "p2", email: null, prenom: "X" }]), "x"), []);
verifie("le délai annoncé est de 15 jours", DELAI_FERMETURE_JOURS, 15);

// LA PORTE ELLE-MEME, /api/stripe?action=fermeture, avec Supabase, Stripe et
// l'envoi des courriels simules au niveau du reseau (comme
// test-portes-acceptent.mjs). Ce qu'on y verifie : l'ORDRE, et ce qui se
// passe quand une moitie reussit et l'autre non.
console.log("\nFERMETURE — LA PORTE /api/stripe");
process.env.VITE_SUPABASE_URL = "https://exemple.supabase.co";
process.env.VITE_SUPABASE_KEY = "cle_publique_fausse";
process.env.SUPABASE_SERVICE_KEY = "cle_de_service_fausse";
process.env.CRON_SECRET = "secret-du-cron";
const ID = "11111111-1111-4111-8111-111111111111";
let base, panne, ecritures, courriels;
const repondre = (corps, status = 200) => new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });
const fauxStripe = (u, opts) => {
  if (panne.stripe) return repondre({ error: { message: "panne" } }, 500);
  const methode = opts.method || "GET";
  const chemin = u.pathname.replace("/v1/", "");
  if (methode === "GET") return repondre({ data: abos.filter((a) => a.customer === u.searchParams.get("customer")) });
  const a = abos.find((x) => x.id === chemin.split("/")[1]);
  if (methode === "DELETE") { a.status = "canceled"; return repondre(a); }
  const corps = new URLSearchParams(opts.body || "");
  if (corps.has("cancel_at_period_end")) a.cancel_at_period_end = corps.get("cancel_at_period_end") === "true";
  for (const [k, v] of corps) { const m = k.match(/^metadata\[(.+)\]$/); if (m) { if (v === "") delete a.metadata[m[1]]; else a.metadata[m[1]] = v; } }
  return repondre(a);
};
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(String(url));
  if (u.pathname === "/auth/v1/user") return repondre({ id: ID, email: "marie@exemple.fr" });
  if (u.hostname === "api.stripe.com") return fauxStripe(u, opts);
  if (u.pathname === "/api/send-email") { courriels.push(JSON.parse(opts.body)); return repondre({ ok: true }); }
  if (u.hostname === "exemple.supabase.co") {
    const table = u.pathname.split("/").pop();
    const methode = opts.method || "GET";
    if (methode !== "GET") {
      ecritures.push({ table, corps: JSON.parse(opts.body || "null") });
      return panne.ecriture ? repondre({ message: "panne d'écriture" }, 500) : new Response(null, { status: 204 });
    }
    if (table === "enfants") return repondre(base.enfants);
    if (u.searchParams.get("id")?.startsWith("in.")) return repondre(base.parents);
    return repondre([base.profil]);
  }
  throw new Error("appel inattendu : " + u);
};
const { default: porte } = await import("../api/stripe.js");
const appeler = async (mode) => {
  const r = { code: null, corps: null, setHeader() {}, status(c) { r.code = c; return r; }, json(o) { r.corps = o; return r; }, end() { return r; } };
  const silence = console.error; console.error = () => {};
  await porte({ method: "POST", headers: { authorization: "Bearer jeton" }, body: { action: "fermeture", mode }, query: {} }, r);
  console.error = silence;
  return r;
};
const remettre = (profil = {}) => {
  base = { profil: { prenom: "Marie", role: "asmat", stripe_customer_id: "cus_1", suppression_prevue_le: null, ...profil },
    enfants: [{ prenom: "Léo", parent_id: "p1" }], parents: [{ id: "p1", email: "parent@exemple.fr", prenom: "Sophie" }] };
  panne = {}; ecritures = []; courriels = []; abos = [abo("sub_a")];
};
const datePosee = () => ecritures.some((e) => e.table === "profiles" && e.corps && e.corps.suppression_prevue_le);

remettre();
let r = await appeler("programmer");
verifie("programmer : 200, la date est posée", [r.code, datePosee()], [200, true]);
verifie("programmer : la famille reçoit « fermeture_compte_parent »", courriels.map((c) => [c.type, c.to, c.vars.enfants]), [["fermeture_compte_parent", "parent@exemple.fr", "Léo"]]);
verifie("programmer : l'abonnement s'arrêtera en fin de période", abos[0].cancel_at_period_end, true);

remettre(); panne.stripe = true;
r = await appeler("programmer");
verifie("programmer, Stripe en panne : refus, AUCUNE date posée, aucun courriel", [r.code, datePosee(), courriels.length], [502, false, 0]);

remettre(); panne.ecriture = true;
r = await appeler("programmer");
verifie("programmer, date non enregistrée : refus et aucun courriel", [r.code, courriels.length], [502, 0]);
verifie("programmer, date non enregistrée : l'abonnement n'est PAS laissé à l'arrêt", [abos[0].cancel_at_period_end, abos[0].metadata.fermeture_timat], [false, undefined]);

remettre({ role: "parent" });
r = await appeler("programmer");
verifie("programmer, compte parent : refus, rien ne bouge", [r.code, datePosee(), courriels.length], [400, false, 0]);

remettre(); base.enfants = [];
r = await appeler("programmer");
verifie("programmer sans famille reliée : refus, Stripe intact", [r.code, abos[0].cancel_at_period_end], [409, false]);

remettre({ suppression_prevue_le: "2026-10-27T10:00:00Z" }); abos = [abo("sub_a", { cancel_at_period_end: true, metadata: { fermeture_timat: "1" } })];
panne.stripe = true;
r = await appeler("annuler");
verifie("annuler, Stripe en panne : la suppression est quand même annulée", [r.code, ecritures.some((e) => e.corps && e.corps.suppression_prevue_le === null)], [200, true]);
verifie("annuler, Stripe en panne : l'abonnement à relancer est SIGNALÉ", r.corps.abonnement_a_relancer, true);
verifie("annuler : les familles sont prévenues", courriels.map((c) => c.type), ["fermeture_compte_annulee_parent"]);

remettre();
r = await appeler("immediat");
verifie("suppression immédiate : l'abonnement est arrêté", [r.code, abos[0].status], [200, "canceled"]);
remettre(); panne.stripe = true;
r = await appeler("immediat");
verifie("suppression immédiate, Stripe en panne : refus (le navigateur ne supprime rien)", r.code, 502);

console.log(ko ? `\n${ko} anomalie(s)\n` : "\nAucune anomalie\n");
process.exit(ko ? 1 : 0);
