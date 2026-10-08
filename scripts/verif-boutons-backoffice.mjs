// LE BACK-OFFICE AUSSI A DES BOUTONS, ET PERSONNE NE LES CLIQUAIT.
//
// C'est l'ecran d'ou tout se regle : les textes de la page publique, les
// couleurs, les tarifs, l'identifiant Pajemploi, les temoignages. Il n'a
// qu'une seule utilisatrice, donc aucun defaut n'y est signale par personne —
// et on y a deja trouve cinq reglages qui ne faisaient rien du tout.
//
// Meme regle que pour l'application : on clique, et on ne retient que les
// erreurs qui disent qu'un bout de code manque. On ne clique ni « Enregistrer »
// ni rien d'irreversible : ce controle lit, il ne modifie pas la production.
//
// Hors chaine de build : Vercel n'a pas de navigateur.
//   node scripts/verif-boutons-backoffice.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { BUNDLE_TESTABLE, CHROMIUM, ATTENDRE_PRET } from "./jeu-de-donnees.mjs";
const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];

const DANGEREUX = /enregistr|sauvegard|publier|supprim|effac|r[ée]initialis|vider|envoyer|d[ée]connex|appliquer|valider|restaurer|importer|exporter|purger|migrer/i;
const CODE_MANQUANT = /is not defined|is not a function|cannot read propert|undefined is not|null is not an object/i;

const ADMIN = "44444444-4444-4444-8444-444444444444";
const utilisateur = { id: ADMIN, aud: "authenticated", role: "authenticated", email: "admin@test.fr",
  app_metadata: {}, user_metadata: { prenom: "Sophie", nom: "Test", role: "asmat" }, created_at: new Date().toISOString() };
const session = { access_token: "faux", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "faux", user: utilisateur };

const N = await chromium.launch({ executablePath: CHROMIUM() });
const ctx = await N.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR", serviceWorkers: "block" });
const p = await ctx.newPage();
let erreurs = [];
p.on("pageerror", (e) => erreurs.push(e.message));
p.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text()); });
p.on("dialog", (d) => d.dismiss().catch(() => {}));
await p.addInitScript(([s, cle]) => {
  try { localStorage.setItem("timat_acces", cle); localStorage.setItem("sb-akicyckmbsjnewnvvcil-auth-token", JSON.stringify(s)); } catch (e) {}
}, [session, CLE]);
const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
await p.route("**/storage/v1/**", (r) => r.fulfill(json([])));
await p.route("**/rest/v1/**", (r) => {
  const t = (r.request().url().match(/rest\/v1\/([a-z_]+)/) || [])[1];
  // LE DROIT D'ADMINISTRER EST SIMULE ICI, ET NULLE PART AILLEURS. Il n'ouvre
  // rien en production : c'est une reponse de serveur fabriquee pour ce test.
  if (t === "profiles") return r.fulfill(json([{ id: ADMIN, role: "asmat", prenom: "Sophie", nom: "Test", email: "admin@test.fr", is_admin: true, subscription_status: "pro" }]));
  if (t === "app_config") return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ config: {} }) });
  return r.fulfill(json([]));
});
await p.route("**/auth/v1/**", (r) => r.fulfill(json({ ...session, ...utilisateur })));

await p.goto(`http://127.0.0.1:4173/backoffice?acces=${CLE}`, { waitUntil: "domcontentloaded" });
// LE PIÈGE DU BUNDLE SANS CLÉ : « npm run build » construit sans
// VITE_SUPABASE_KEY, l'application retombe alors sur la page vitrine sans
// un mot, et ce contrôle rendrait un KO qui n'existe pas. verif-avis a
// accusé un code sain pour cette raison exacte.
if(!await BUNDLE_TESTABLE(p)){await N.close();process.exit(1);}
await ATTENDRE_PRET(p);
const dedans = await p.evaluate(() => !/Accès réservé|Je suis assistante maternelle|Se connecter/.test(document.body.innerText.slice(0, 400)));
if (!dedans) {
  console.error("\n  KO  le back-office ne s'ouvre pas : le contrôle ne vérifierait rien\n");
  console.error("      " + (await p.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 200));
  await N.close(); process.exit(1);
}

// Les onglets du back-office, lus sur la page plutot qu'ecrits en dur.
const onglets = await p.evaluate(() => [...document.querySelectorAll("button, [role=tab]")]
  .map((b) => (b.innerText || "").replace(/\s+/g, " ").trim())
  .filter((t) => t && t.length < 28).slice(0, 40));

let ko = 0, cliques = 0;
const vus = new Set();
for (const onglet of [...new Set(onglets)]) {
  if (DANGEREUX.test(onglet)) continue;
  await p.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => (x.innerText || "").replace(/\s+/g, " ").trim() === t); if (b) b.click(); }, onglet);
  await p.waitForTimeout(900);
  const libelles = await p.evaluate(() => [...document.querySelectorAll("button")]
    .map((b) => (b.innerText || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim())
    .filter((t) => t && t.length < 60));
  for (const libelle of [...new Set(libelles)]) {
    if (DANGEREUX.test(libelle) || vus.has(libelle)) continue;
    vus.add(libelle);
    erreurs = [];
    const ok = await p.evaluate((t) => {
      const b = [...document.querySelectorAll("button")].find((x) => ((x.innerText || x.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim()) === t);
      if (!b || b.disabled) return false; b.click(); return true;
    }, libelle);
    if (!ok) continue;
    cliques++;
    await p.waitForTimeout(500);
    const fautes = [...new Set(erreurs.filter((e) => CODE_MANQUANT.test(e)))];
    if (fautes.length) { ko++; console.log(`  KO  « ${libelle.slice(0, 44)} »  →  ${fautes[0].slice(0, 110)}`); }
  }
}
await N.close();
console.log(ko ? `\n${ko} bouton(s) en panne sur ${cliques} cliqués au back-office\n`
               : `\n${cliques} boutons cliqués au back-office : aucun ne tombe sur du code manquant.\n`);
process.exit(ko ? 1 : 0);
