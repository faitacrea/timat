// ON S'INSCRIT POUR DE VRAI, ET ON REGARDE OU ON ATTERRIT.
//
// Jusqu'ici, aucun controle ne traversait la porte d'entree. Les parcours
// existants injectent une session deja ouverte — c'est ce qui leur permet de
// cliquer les 365 boutons de l'application, mais cela veut dire que le
// formulaire d'inscription, celui que TOUT nouvel utilisateur remplit, n'etait
// verifie par personne. Pas une fois. Cliquer un bouton ne prouve rien d'un
// formulaire : il faut SAISIR, puis ENVOYER, puis regarder ce qui s'affiche.
//
// Les huit scenarios ci-dessous sont les huit facons dont une inscription se
// passe dans la vraie vie. Pour chacun, on dit ce que l'ecran DOIT montrer.
// Un message brut de Supabase ou un ecran qui ne bouge pas sont des echecs.
//
// Supabase est intercepte : on ne cree aucun compte reel, et surtout on peut
// FABRIQUER les refus (email deja pris, limite de debit, profil qui ne
// s'enregistre pas) qu'on ne sait pas provoquer autrement.
//
// Hors chaine de build : Vercel n'a pas de navigateur.
//   node scripts/verif-inscription.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { BUNDLE_TESTABLE, ATTENDRE_PRET} from "./jeu-de-donnees.mjs";

const SRC = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const CLE = SRC.match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];
const BASE = "http://127.0.0.1:4173";
const JETON = "jeton-d-invitation-de-test-assez-long-pour-passer-le-filtre";

const UID = "11111111-1111-4111-8111-111111111111";
const utilisateur = (role) => ({
  id: UID, aud: "authenticated", role: "authenticated", email: "nouvelle@test.fr",
  app_metadata: {}, user_metadata: { prenom: "Marie", nom: "Test", role },
  created_at: new Date().toISOString(),
});
const session = (role) => ({
  access_token: "faux", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "faux",
  user: utilisateur(role),
});

const json = (b, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(b) });

// Ce qu'on refuse de voir a l'ecran : le jargon de la bibliotheque. Si l'un de
// ces fragments s'affiche, c'est que le message d'erreur de Supabase est passe
// tel quel sous les yeux de l'utilisatrice.
const JARGON = /User already registered|Invalid login credentials|Password should be|rate limit|email rate|Failed to fetch|AuthApiError|unexpected_failure|500|supabase/i;

// ---------------------------------------------------------------------------
// Les scenarios. Chacun decrit l'interception reseau, ce qu'on saisit, et ce
// que l'ecran doit montrer ensuite.
// ---------------------------------------------------------------------------
const SCENARIOS = [
  {
    nom: "assmat · inscription qui aboutit",
    role: "asmat",
    auth: () => json(session("asmat")),
    saisie: { prenom: "Marie", nom: "Durand", email: "nouvelle@test.fr", mdp: "Timat2026motdepasse", consent: true },
    attendu: { entre: true },
  },
  {
    nom: "assmat · email déjà pris",
    role: "asmat",
    auth: (url) => /signup/.test(url)
      ? json({ code: "user_already_exists", error_code: "user_already_exists", msg: "User already registered", message: "User already registered" }, 422)
      : json(session("asmat")),
    saisie: { prenom: "Marie", nom: "Durand", email: "deja@test.fr", mdp: "Timat2026motdepasse", consent: true },
    attendu: { texte: /compte existe déjà/i, reste: true },
  },
  {
    nom: "assmat · mot de passe trop faible",
    role: "asmat",
    auth: () => json(session("asmat")),
    saisie: { prenom: "Marie", nom: "Durand", email: "nouvelle@test.fr", mdp: "motdepasse", consent: true },
    attendu: { texte: /chiffre|8 caract|trop/i, reste: true, sansReseau: /signup/ },
  },
  {
    nom: "assmat · consentement non coché",
    role: "asmat",
    auth: () => json(session("asmat")),
    saisie: { prenom: "Marie", nom: "Durand", email: "nouvelle@test.fr", mdp: "Timat2026motdepasse", consent: false },
    attendu: { reste: true, sansReseau: /signup/ },
  },
  {
    nom: "assmat · prénom manquant",
    role: "asmat",
    auth: () => json(session("asmat")),
    saisie: { prenom: "", nom: "Durand", email: "nouvelle@test.fr", mdp: "Timat2026motdepasse", consent: true },
    attendu: { texte: /champs obligatoires|Remplis/i, reste: true, sansReseau: /signup/ },
  },
  {
    // LE SCENARIO LE PLUS IMPORTANT. Le compte existe cote authentification,
    // mais la table profiles refuse l'enregistrement. L'utilisatrice est
    // connectee et son espace est vide : si rien ne le dit, elle croit que
    // l'application est cassee.
    nom: "assmat · le compte se crée mais le profil ne s'enregistre pas",
    role: "asmat",
    auth: () => json(session("asmat")),
    // La LECTURE repond « aucune ligne », l'ECRITURE est refusee : c'est
    // exactement l'etat d'un compte cree dont le profil n'a pas pu s'ecrire.
    // Refuser la lecture aussi aurait fait passer ce controle pour une tout
    // autre raison — une panne reseau, qui a deja son propre chemin.
    rest: (t, methode) => t === "profiles" ? (methode === "GET" ? json([]) : json({ message: "insert refusé" }, 403)) : null,
    saisie: { prenom: "Marie", nom: "Durand", email: "nouvelle@test.fr", mdp: "Timat2026motdepasse", consent: true },
    // La reparation se fait au chargement du profil, pas sur l'ecran
    // d'inscription : celui-ci a deja disparu quand le refus arrive. Ce qu'on
    // exige donc, c'est qu'elle ne se retrouve PAS dans un espace vide sans
    // explication — l'ecran de panne, qui dit que ce n'est pas l'abonnement.
    attendu: { texte: /compte n'a pas pu être chargé/i, attente: 6000 },
  },
  {
    // Le parent arrive par le lien de son assistante maternelle. Si le jeton
    // n'est pas reclame, le compte est cree mais rattache a personne : espace
    // vide, et aucun moyen de reparer sans passer par le support.
    nom: "parent · inscription depuis un lien d'invitation",
    role: "parent",
    url: `${BASE}/?acces=${CLE}&connexion=parent&invite=${JETON}`,
    auth: () => json(session("parent")),
    saisie: { prenom: "Sophie", nom: "Martin", email: "nouvelle@test.fr", mdp: "Timat2026motdepasse", consent: true },
    attendu: { rpc: "claim_invite_token", jeton: JETON, attente: 3000 },
  },
  {
    // Un compte parent qui tente la porte des assistantes maternelles : il doit
    // etre deconnecte, avec la raison, et non laisse dans un espace qui n'est
    // pas le sien.
    nom: "assmat · un compte parent tente la porte des pros",
    role: "asmat",
    mode: "connexion",
    auth: () => json(session("parent")),
    rest: (t) => t === "profiles" ? json([{ id: UID, role: "parent" }]) : null,
    saisie: { email: "parent@test.fr", mdp: "Timat2026motdepasse" },
    attendu: { texte: /réservé aux assistantes maternelles/i, reste: true },
  },
];

// ---------------------------------------------------------------------------
const N = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
let ko = 0;
console.log("\n=== PARCOURS D'INSCRIPTION — on saisit et on envoie ===\n");

for (const s of SCENARIOS) {
  const ctx = await N.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
  const p = await ctx.newPage();
  const erreurs = [];
  const appels = [];
  const corps = [];
  p.on("pageerror", (e) => erreurs.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/favicon|net::ERR|Failed to load resource/i.test(m.text())) erreurs.push(m.text()); });
  p.on("dialog", (d) => d.dismiss().catch(() => {}));
  await p.addInitScript((cle) => { try { localStorage.setItem("timat_acces", cle); } catch (e) {} }, CLE);

  // La regle generale D'ABORD : Playwright essaie la derniere enregistree en premier.
  await p.route("**/storage/v1/**", (r) => r.fulfill(json([])));
  await p.route("**/rest/v1/**", (r) => {
    const url = r.request().url();
    appels.push(url);
    if (r.request().method() !== "GET") corps.push(r.request().postData() || "");
    const t = (url.match(/rest\/v1\/(?:rpc\/)?([a-z_]+)/) || [])[1];
    const sur = s.rest && s.rest(t, r.request().method());
    if (sur) return r.fulfill(sur);
    if (t === "profiles") return r.fulfill(json([{ id: UID, role: s.role === "parent" ? "parent" : "asmat", prenom: "Marie", nom: "Test", email: "nouvelle@test.fr", subscription_status: "free" }]));
    return r.fulfill(json([]));
  });
  await p.route("**/auth/v1/**", (r) => {
    const url = r.request().url();
    appels.push(url);
    corps.push(r.request().postData() || "");
    r.fulfill(s.auth(url));
  });

  await p.goto(s.url || `${BASE}/?acces=${CLE}${s.role === "parent" ? "&connexion=parent" : "&connexion=1"}`, { waitUntil: "domcontentloaded" });
  await ATTENDRE_PRET(p);
  // Un bundle construit sans VITE_SUPABASE_KEY n'ouvre aucun ecran : tout KO
  // rapporte ensuite serait faux. On le dit, et on s'arrete.
  if (!(await BUNDLE_TESTABLE(p))) { await N.close(); process.exit(2); }
  for (let i = 0; i < 5; i++) {
    const passer = p.getByRole("button", { name: /^Passer$/ });
    if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(300); } else break;
  }

  // Ouvrir le formulaire. Selon l'entree, il est deja la ou derriere un bouton.
  if (!(await p.locator('input[name="email"]').first().isVisible().catch(() => false))) {
    for (const re of [/Créer mon compte/i, /Je suis assistante maternelle/i, /Je suis parent/i, /connexion/i]) {
      const b = p.getByRole("button", { name: re }).first();
      if (await b.isVisible().catch(() => false)) { await b.click(); await p.waitForTimeout(900); break; }
    }
  }
  // Basculer en mode inscription si besoin (par defaut certains ecrans ouvrent la connexion).
  const veutInscription = (s.mode || "inscription") === "inscription";
  const bascule = p.getByRole("button", { name: /Créer un compte|Pas encore de compte|S'inscrire|créer mon espace/i }).first();
  const dejaInscription = await p.locator('input[name="prenom"]').first().isVisible().catch(() => false);
  if (veutInscription && !dejaInscription && await bascule.isVisible().catch(() => false)) { await bascule.click(); await p.waitForTimeout(600); }
  if (!veutInscription && dejaInscription) {
    const b2 = p.getByRole("button", { name: /Déjà un compte|Se connecter|connexion/i }).first();
    if (await b2.isVisible().catch(() => false)) { await b2.click(); await p.waitForTimeout(600); }
  }

  const ouvert = await p.locator('input[name="email"]').first().isVisible().catch(() => false);
  if (!ouvert) { console.log(`  KO  ${s.nom}\n        le formulaire ne s'ouvre pas : rien n'est vérifiable`); ko++; await ctx.close(); continue; }

  // SAISIE — un vrai remplissage, caractere par caractere, pas un set() de React.
  const remplir = async (sel, val) => {
    const c = p.locator(sel).first();
    if (!(await c.isVisible().catch(() => false))) return;
    await c.fill(""); if (val) await c.type(val, { delay: 12 });
  };
  if (veutInscription) { await remplir('input[name="prenom"]', s.saisie.prenom); await remplir('input[name="nom"]', s.saisie.nom); }
  await remplir('input[name="email"]', s.saisie.email);
  await remplir('input[name="password"]', s.saisie.mdp);
  if (veutInscription) {
    const cases = p.locator('input[type="checkbox"]');
    const n = await cases.count();
    for (let i = 0; i < Math.min(n, 2); i++) { if (s.saisie.consent) await cases.nth(i).check().catch(() => {}); else await cases.nth(i).uncheck().catch(() => {}); }
  }

  // ENVOI — par la touche Entrée dans le champ mot de passe quand le bouton est
  // volontairement desactive (consentement non coche) : c'est exactement ce que
  // fait une utilisatrice pressee, et c'est le chemin que personne ne teste.
  const avant = appels.length;
  const envoi = p.getByRole("button", { name: /Créer mon espace|Créer mon compte parent|Accéder à mon espace|Accéder à l'espace famille/i }).first();
  if (await envoi.isEnabled().catch(() => false)) await envoi.click();
  else await p.locator('input[name="password"]').first().press("Enter");
  await p.waitForTimeout(s.attendu.attente || 2200);

  const texte = await p.evaluate(() => document.body.innerText);
  const nouveaux = appels.slice(avant);
  const probleme = [];

  // 1. Jamais de jargon de bibliotheque sous les yeux de l'utilisatrice.
  const vu = texte.match(JARGON);
  if (vu) probleme.push(`message technique affiché : « ${vu[0]} »`);

  // 2. Jamais d'erreur JavaScript : un formulaire qui leve ne finit pas.
  const dur = erreurs.find((e) => /is not defined|is not a function|cannot read propert|undefined is not|null is not an object/i.test(e));
  if (dur) probleme.push(`le code casse à l'envoi : ${dur.slice(0, 120)}`);

  // 3. Le message attendu est bien la.
  if (s.attendu.texte && !s.attendu.texte.test(texte)) probleme.push(`le message attendu (${s.attendu.texte}) ne s'affiche pas`);

  // 4. Entré ou reste : l'ecran doit bouger quand il faut, et pas quand il ne faut pas.
  const encoreFormulaire = await p.locator('input[name="email"]').first().isVisible().catch(() => false);
  if (s.attendu.entre && encoreFormulaire) probleme.push("l'inscription aboutit mais l'écran reste sur le formulaire");
  if (s.attendu.reste && !encoreFormulaire) probleme.push("le refus laisse quand même entrer dans l'application");

  // 5. Les refus locaux ne doivent pas partir sur le reseau.
  if (s.attendu.sansReseau && nouveaux.some((u) => s.attendu.sansReseau.test(u))) probleme.push("le refus local part quand même sur le réseau");

  // 6. L'appel attendu a bien lieu, avec la bonne donnee.
  if (s.attendu.rpc) {
    const re = new RegExp("rpc/" + s.attendu.rpc);
    if (!appels.some((u) => re.test(u))) probleme.push(`${s.attendu.rpc} n'est jamais appelé : le compte ne sera rattaché à personne`);
    else if (s.attendu.jeton && !corps.some((c) => c.includes(s.attendu.jeton))) probleme.push(`${s.attendu.rpc} est appelé sans le jeton d'invitation`);
  }

  if (probleme.length) { ko += probleme.length; console.log(`  KO  ${s.nom}`); probleme.forEach((x) => console.log(`        ${x}`)); }
  else console.log(`  ok  ${s.nom}`);
  await ctx.close();
}

await N.close();
console.log(ko ? `\n${ko} problème(s) sur le parcours d'inscription.\n` : "\nLes huit entrées dans l'application tiennent.\n");
process.exit(ko ? 1 : 0);
