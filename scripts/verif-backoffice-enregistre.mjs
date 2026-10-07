// AU BACK-OFFICE, ON SAISIT ET ON ENREGISTRE.
//
// Le parcours des boutons du back-office clique tout, mais refuse « Enregistrer »
// — par prudence, pour ne rien modifier en production. La prudence était de
// trop : Supabase est intercepté, rien n'atteint la base. Du coup le geste qui
// compte vraiment — taper un texte et l'enregistrer — n'était vérifié par
// personne.
//
// C'est pourtant l'écran d'où la page publique est écrite. Un réglage qui ne
// part pas, ou qui part vide, et c'est la landing page qui change — celle que
// lit un visiteur, ou l'URSSAF. On a déjà trouvé cinq réglages qui ne faisaient
// rien du tout ; rien n'empêchait le sixième.
//
// Ce contrôle, pour chaque section : écrit une marque reconnaissable dans les
// champs de texte, clique « Enregistrer », et exige que l'écriture vers
// app_config parte VRAIMENT, qu'elle soit du JSON valide, et qu'elle contienne
// la marque qu'on vient de taper.
//
// Hors chaîne de build : Vercel n'a pas de navigateur.
//   node scripts/verif-backoffice-enregistre.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { BUNDLE_TESTABLE } from "./jeu-de-donnees.mjs";

const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];
const ADMIN = "99999999-9999-4999-8999-999999999999";
const MARQUE = "VERIF-" + Date.now().toString(36).toUpperCase();

const utilisateur = {
  id: ADMIN, aud: "authenticated", role: "authenticated", email: "admin@test.fr",
  app_metadata: {}, user_metadata: { prenom: "Sophie", nom: "Test", role: "asmat" },
  created_at: new Date().toISOString(),
};
const session = { access_token: "faux", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "faux", user: utilisateur };

const N = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await N.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
const p = await ctx.newPage();
let erreurs = [];
const ecritures = [];
p.on("pageerror", (e) => erreurs.push(e.message));
p.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text()); });
p.on("dialog", (d) => d.accept().catch(() => {}));
await p.addInitScript(([s, cle]) => {
  try {
    localStorage.setItem("timat_acces", cle);
    localStorage.setItem("sb-akicyckmbsjnewnvvcil-auth-token", JSON.stringify(s));
  } catch (e) { /* stockage indisponible : la page reste testable */ }
}, [session, CLE]);

const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
await p.route("**/storage/v1/**", (r) => r.fulfill(json([])));
await p.route("**/rest/v1/**", (r) => {
  const req = r.request();
  const t = (req.url().match(/rest\/v1\/(?:rpc\/)?([a-z_]+)/) || [])[1];
  // RIEN N'ATTEINT LA BASE : on note l'écriture et on répond « c'est fait ».
  if (req.method() !== "GET") ecritures.push({ table: t, methode: req.method(), corps: req.postData() || "" });
  if (t === "profiles") return r.fulfill(json([{ id: ADMIN, role: "asmat", prenom: "Sophie", nom: "Test", email: "admin@test.fr", is_admin: true, subscription_status: "pro" }]));
  if (t === "app_config") return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "main", config: {} }) });
  return r.fulfill(json([]));
});
await p.route("**/auth/v1/**", (r) => r.fulfill(json({ ...session, ...utilisateur })));
await p.route("**/api/**", (r) => r.fulfill(json({ ok: true })));

await p.goto(`http://127.0.0.1:4173/backoffice?acces=${CLE}`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(4500);
if (!(await BUNDLE_TESTABLE(p))) { await N.close(); process.exit(2); }
const dedans = await p.evaluate(() => !/Accès réservé|Je suis assistante maternelle|Se connecter/.test(document.body.innerText.slice(0, 400)));
if (!dedans) { console.error("\n  KO  le back-office ne s'ouvre pas : le contrôle ne vérifierait rien\n"); await N.close(); process.exit(1); }

// LES SECTIONS, LUES DANS LE CODE — pas tous les boutons de la page.
//
// Premiere version : elle prenait tout bouton au libelle court, donc aussi
// « ↻ Recharger », « 👁 Masquer », « ☰ Gauche »… Ce sont des actions de barre
// d'outils, pas des sections : elle leur reprochait de n'avoir pas de bouton
// « Enregistrer », douze fois. La liste des sections est declaree dans
// src/backoffice.jsx — on l'y lit, elle ne peut pas se desynchroniser.
const SRC_BO = readFileSync(new URL("../src/backoffice.jsx", import.meta.url), "utf8");
const onglets = [...(SRC_BO.match(/const GROUPS=\[[\s\S]*?\n  \];/) || [""])[0]
  .matchAll(/\bl:"([^"]+)"/g)].map((m) => m[1]);
if (onglets.length < 5) { console.error("\n  KO  la liste des sections du back-office n'a pas pu être lue\n"); await N.close(); process.exit(1); }

const ko = [];
let sections = 0, champs = 0;
for (const onglet of [...new Set(onglets)]) {
  await p.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => (x.innerText || "").replace(/\s+/g, " ").trim() === t); if (b) b.click(); }, onglet);
  await p.waitForTimeout(1100);

  // On n'écrit QUE dans les champs de texte libre : un nombre ou une couleur
  // remplacés par une marque feraient échouer l'enregistrement pour une raison
  // qui n'a rien à voir avec ce qu'on vérifie.
  const écrits = await p.evaluate((marque) => {
    const cibles = [...document.querySelectorAll('input[type="text"], input:not([type]), textarea')]
      .filter((c) => !c.disabled && !c.readOnly && c.offsetParent !== null);
    let n = 0;
    for (const c of cibles.slice(0, 6)) {
      const avant = c.value;
      const valeur = (avant && avant.length > 2 ? avant.slice(0, 40) + " " : "") + marque;
      const poseur = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")
        || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
      // React écoute l'événement natif : on pose la valeur par le prototype,
      // sinon le onChange ne part pas et l'état du composant ne bouge pas.
      const proto = c.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(c, valeur);
      c.dispatchEvent(new Event("input", { bubbles: true }));
      c.dispatchEvent(new Event("change", { bubbles: true }));
      n++;
    }
    return n;
  }, MARQUE);
  if (process.env.TRACE) console.log(`      « ${onglet} » : ${écrits} champ(s) de texte`);

  // UNE SECTION NE DOIT JAMAIS VIDER LA PAGE.
  //
  // C'est ainsi qu'on a trouve le defaut : avec une reponse d'API a laquelle il
  // manquait un champ, la section SEO levait « Cannot read properties of
  // undefined » et TOUT le back-office disparaissait — ecran entierement blanc,
  // aucun message, plus rien de cliquable, et les sections suivantes
  // inatteignables. Le back-office etait monte hors du filet qui protege le
  // reste de l'application.
  //
  // On verifie donc apres CHAQUE section qu'il reste quelque chose a l'ecran.
  const etat = await p.evaluate(() => {
    const t = document.body.innerText.replace(/\s+/g, " ").trim();
    return { taille: t.length, filet: /n'a pas pu s'ouvrir/i.test(t) };
  });
  if (etat.taille < 40) {
    ko.push(`« ${onglet} » : la page devient blanche — une section en panne emporte tout le back-office`);
    break;
  }
  // LE FILET RATTRAPE, MAIS LA SECTION RESTE CASSEE.
  //
  // Une fois le back-office protege, une section qui leve n'emporte plus la
  // page : elle affiche « cet ecran n'a pas pu s'ouvrir ». La page survit, donc
  // le controle passait au vert — alors que la section est inutilisable. On
  // exige donc aussi que le filet ne se soit PAS declenche.
  if (etat.filet) {
    ko.push(`« ${onglet} » : la section tombe — le filet affiche « cet écran n'a pas pu s'ouvrir » à la place de son contenu`);
    continue;
  }
  if (!écrits) continue;
  sections++; champs += écrits;
  await p.waitForTimeout(500);

  const avant = ecritures.length;
  erreurs = [];
  const enregistre = await p.evaluate(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /^(💾\s*)?(Enregistrer|Sauvegarder|Publier)/i.test((x.innerText || "").replace(/\s+/g, " ").trim()) && !x.disabled);
    if (!b) return null;
    b.click();
    return (b.innerText || "").replace(/\s+/g, " ").trim();
  });
  if (!enregistre) { ko.push(`« ${onglet} » : ${écrits} champ(s) modifiés, et aucun bouton pour enregistrer`); continue; }
  await p.waitForTimeout(1800);

  const dur = erreurs.find((e) => /is not defined|is not a function|cannot read propert|undefined is not/i.test(e));
  if (dur) { ko.push(`« ${onglet} » › ${enregistre} : le code casse à l'enregistrement — ${dur.slice(0, 110)}`); continue; }

  const nouvelles = ecritures.slice(avant).filter((e) => e.table === "app_config");
  if (!nouvelles.length) {
    ko.push(`« ${onglet} » › ${enregistre} : rien ne part vers app_config — le réglage ne sera jamais appliqué`);
    continue;
  }
  const corps = nouvelles.map((e) => e.corps).join("");
  try { JSON.parse(nouvelles[nouvelles.length - 1].corps); }
  catch (e) { ko.push(`« ${onglet} » › ${enregistre} : ce qui part vers app_config n'est pas du JSON valide`); continue; }
  if (!corps.includes(MARQUE)) {
    ko.push(`« ${onglet} » › ${enregistre} : l'enregistrement part SANS le texte qui vient d'être saisi — le réglage ne fait rien`);
  }
}

await N.close();
console.log(`\n=== BACK-OFFICE — on saisit et on enregistre (${sections} section(s), ${champs} champ(s)) ===\n`);
if (ko.length) { ko.forEach((x) => console.log(`  KO  ${x}`)); console.log(`\n${ko.length} problème(s).\n`); }
else console.log(`  ok  chaque section enregistre, et ce qui part contient bien ce qui a été saisi\n`);
process.exit(ko.length ? 1 : 0);
