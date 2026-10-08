// ON CLIQUE TOUS LES BOUTONS, ET ON REGARDE CE QUI TOMBE.
//
// « Pointer l'arrivee » levait « enregistrerPointage is not defined » depuis des
// mois. Aucun controle ne l'avait vu, et pour une raison simple : tous
// ouvraient des ecrans, aucun ne CLIQUAIT. Un ecran qui s'ouvre ne prouve rien
// de son bouton principal.
//
// Ce controle parcourt les ecrans, clique chaque bouton, et ne retient qu'une
// seule famille d'erreurs : celles qui disent qu'un bout de code manque —
// « is not defined », « is not a function », « cannot read properties of
// undefined ». Les echecs reseau sont attendus ici : ils ne comptent pas.
//
// Les boutons dangereux ne sont pas cliques : supprimer, resilier, payer,
// se deconnecter. Un controle qui se deconnecte au troisieme clic ne verifie
// plus rien de ce qui suit.
//
// Hors chaine de build : Vercel n'a pas de navigateur.
//   node scripts/verif-boutons.mjs [asmat|parent]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { BUNDLE_TESTABLE, CHROMIUM, ATTENDRE_PRET } from "./jeu-de-donnees.mjs";
const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];
const ESPACE = process.argv[2] || "asmat";

const ECRANS = ESPACE === "parent"
  ? ["accueil","journee","pointage","suivi_progres","sante_urgence","autorisations","calendrier","messagerie","aides_simulateurs","admin_finances","documents_complet","mes_alertes","faq"]
  : ["accueil","journee","pointage","suivi_progres","sante_urgence","autorisations","calendrier","messagerie","paie_contrats","documents_rapports","inviter_parent","reprise_contrat","liste_attente","page_vitrine","mes_employeurs","pmi","mes_alertes","faq"];

// Ce qu'on ne clique pas : l'irreversible, et ce qui ferme la session.
const DANGEREUX = /supprim|effac|r[ée]sili|d[ée]connex|se d[ée]connecter|payer|abonner|archiver|r[ée]initialis|vider|quitter|annuler mon|retirer|d[ée]sactiver mon/i;
// Les erreurs qui disent qu'un bout de code manque, par opposition au reseau.
const CODE_MANQUANT = /is not defined|is not a function|cannot read propert|undefined is not|null is not an object/i;

// ON N'ENTRE PAS PAR LE COMPTE DE DEMONSTRATION.
//
// Premiere version de ce controle : elle se connectait avec le compte de
// demonstration. Elle a clique 226 boutons sans rien trouver — et pour cause :
// en demonstration, les actions sont volontairement desactivees. Le bouton
// « Pointer l'arrivee » rend « Demo : action desactivee » et ne touche jamais
// au code qui etait casse. Un controle qui passe au vert sur un defaut connu
// ne vaut rien.
//
// On ouvre donc une vraie session, avec de vraies donnees, comme le parcours
// hors ligne : c'est le seul moyen d'executer le code qui compte.
const UID = "11111111-1111-4111-8111-111111111111";
const EID = "22222222-2222-4222-8222-222222222222";
const PID = "33333333-3333-4333-8333-333333333333";
const estParent = ESPACE === "parent";
const utilisateur = {
  id: estParent ? PID : UID, aud: "authenticated", role: "authenticated",
  email: estParent ? "sophie@test.fr" : "marie@test.fr", app_metadata: {},
  user_metadata: { prenom: estParent ? "Sophie" : "Marie", nom: "Test", role: estParent ? "parent" : "asmat" },
  created_at: new Date().toISOString(),
};
const session = { access_token: "faux", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "faux", user: utilisateur };

const N = await chromium.launch({ executablePath: CHROMIUM() });
const ctx = await N.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
const p = await ctx.newPage();
let erreurs = [];
p.on("pageerror", (e) => erreurs.push(e.message));
p.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text()); });
p.on("dialog", (d) => d.dismiss().catch(() => {}));
await p.addInitScript(([s, cle]) => {
  try {
    localStorage.setItem("timat_acces", cle);
    localStorage.setItem("sb-akicyckmbsjnewnvvcil-auth-token", JSON.stringify(s));
  } catch (e) { /* stockage indisponible : la page reste testable */ }
}, [session, CLE]);

const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
// La regle generale D'ABORD : Playwright essaie la derniere enregistree en premier.
await p.route("**/storage/v1/**", (r) => r.fulfill(json([])));
await p.route("**/rest/v1/**", (r) => {
  const t = (r.request().url().match(/rest\/v1\/([a-z_]+)/) || [])[1];
  if (t === "profiles") return r.fulfill(json([{ id: utilisateur.id, role: utilisateur.user_metadata.role, prenom: utilisateur.user_metadata.prenom, nom: "Test", email: utilisateur.email, code_postal: "94230", subscription_status: "pro", is_admin: false }]));
  if (t === "enfants") return r.fulfill(json([{ id: EID, asmat_id: UID, parent_id: PID, prenom: "Léo", naissance: "2023-03-01", emoji: "🦁", couleur: "#E4915F", actif: true, allergies: [] }]));
  if (t === "contrats") return r.fulfill(json([{ id: "c1", enfant_id: EID, asmat_id: UID, debut: "2026-01-01", heures_hebdo: 40, taux_horaire: 4.20, annee_complete: true, entretien: 3.92, jours: ["Lundi","Mardi","Mercredi","Jeudi","Vendredi"], horaires: "07h30–17h30" }]));
  return r.fulfill(json([]));
});
await p.route("**/auth/v1/**", (r) => r.fulfill(json({ ...session, ...utilisateur })));

await p.goto(`http://127.0.0.1:4173/?acces=${CLE}`, { waitUntil: "domcontentloaded" });
// LE PIÈGE DU BUNDLE SANS CLÉ : « npm run build » construit sans
// VITE_SUPABASE_KEY, l'application retombe alors sur la page vitrine sans
// un mot, et ce contrôle rendrait un KO qui n'existe pas. verif-avis a
// accusé un code sain pour cette raison exacte.
if(!await BUNDLE_TESTABLE(p)){await N.close();process.exit(1);}
await ATTENDRE_PRET(p);
for (let i = 0; i < 5; i++) {
  const passer = p.getByRole("button", { name: /^Passer$/ });
  if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(400); } else break;
}
const connecte = await p.evaluate(() => !/Je suis assistante maternelle/.test(document.body.innerText));
if (!connecte) { console.error("\n  KO  la session n'est pas ouverte : le contrôle ne vérifierait rien\n"); await N.close(); process.exit(1); }

let ko = 0, cliques = 0;
const vus = new Set();
for (const ecran of ECRANS) {
  await p.evaluate((x) => window.dispatchEvent(new CustomEvent("timat:page", { detail: x })), ecran);
  await p.waitForTimeout(1200);
  // La liste est relue a chaque tour : un clic change la page.
  const libelles = await p.evaluate((dangereux) => {
    const re = new RegExp(dangereux.source, dangereux.flags);
    return [...document.querySelectorAll("button")]
      .map((b) => (b.innerText || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim())
      .filter((t) => t && t.length < 60 && !re.test(t));
  }, { source: DANGEREUX.source, flags: DANGEREUX.flags });

  for (const libelle of [...new Set(libelles)]) {
    const cle = ecran + "|" + libelle;
    if (vus.has(cle)) continue;
    vus.add(cle);
    // On revient sur l'ecran : le clic precedent a pu ouvrir autre chose.
    await p.evaluate((x) => window.dispatchEvent(new CustomEvent("timat:page", { detail: x })), ecran);
    await p.waitForTimeout(700);
    erreurs = [];
    const trouve = await p.evaluate((t) => {
      const b = [...document.querySelectorAll("button")].find((x) => ((x.innerText || x.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim()) === t);
      if (!b || b.disabled) return false;
      b.click(); return true;
    }, libelle);
    if (!trouve) continue;
    cliques++;
    await p.waitForTimeout(650);
    const fautes = [...new Set(erreurs.filter((e) => CODE_MANQUANT.test(e)))];
    if (fautes.length) {
      ko++;
      console.log(`  KO  ${ecran.padEnd(20)} « ${libelle.slice(0, 40)} »  →  ${fautes[0].slice(0, 110)}`);
    }
  }
}
await N.close();
console.log(ko
  ? `\n${ko} bouton(s) en panne sur ${cliques} cliqués dans l'espace ${ESPACE}\n`
  : `\n${cliques} boutons cliqués dans l'espace ${ESPACE} : aucun ne tombe sur du code manquant.\n`);
process.exit(ko ? 1 : 0);
