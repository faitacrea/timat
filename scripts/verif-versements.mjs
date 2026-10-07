// LE BOUTON QUI NE FAISAIT RIEN.
//
// Sur « Mes versements », chaque mois impayé porte un bouton « + Enregistrer ».
// On appuyait, et il ne se passait rien de visible : le formulaire s'ouvrait
// bel et bien, mais SOUS le tableau de suivi, qui fait plusieurs écrans sur un
// téléphone. Il était hors de vue.
//
// En allant voir, deux autres défauts tenaient dans les mêmes quatre lignes, et
// le second coûte de l'argent :
//
//   - la période était remplie avec le LIBELLE (« Juillet 2026 ») alors que la
//     liste déroulante ne connaît que des CLÉS (« 2026-07 ») : aucune option ne
//     correspondait, le champ retombait sur « — » juste après qu'on avait
//     cliqué sur le mois voulu ;
//
//   - la date était mise à AUJOURD'HUI quel que soit le mois choisi. Le
//     rapprochement groupe les versements par le mois de leur DATE : enregistrer
//     en octobre un versement de juillet le comptait en octobre, et juillet
//     restait marqué impayé pour toujours. Un parent à jour pouvait être relancé
//     pour un mois qu'il avait payé.
//
// Ce contrôle appuie sur le bouton d'un mois passé et exige les trois : le
// formulaire sous les yeux, la bonne période sélectionnée, et une date DANS le
// mois concerné.
//
// Hors chaîne de build : Vercel n'a pas de navigateur.
//   node scripts/verif-versements.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { REPONSE_URL, LIGNES, PID, EID, CID, BUNDLE_TESTABLE} from "./jeu-de-donnees.mjs";

const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];

// Un contrat qui a commencé il y a un an : il faut plusieurs mois passés et
// AUCUN versement, pour que chaque mois porte son bouton « + Enregistrer ».
const ilYaUnAn = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
const utilisateur = {
  id: PID, aud: "authenticated", role: "authenticated", email: "sophie@test.fr",
  app_metadata: {}, user_metadata: { prenom: "Sophie", nom: "Test", role: "parent" },
  created_at: new Date().toISOString(),
};
const session = { access_token: "faux", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "faux", user: utilisateur };

const N = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await N.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
const p = await ctx.newPage();
const erreurs = [];
p.on("pageerror", (e) => erreurs.push(e.message));
p.on("dialog", (d) => d.dismiss().catch(() => {}));
await p.addInitScript(([s, cle]) => {
  try {
    localStorage.setItem("timat_acces", cle);
    localStorage.setItem("sb-akicyckmbsjnewnvvcil-auth-token", JSON.stringify(s));
  } catch (e) { /* stockage indisponible : la page reste testable */ }
}, [session, CLE]);

const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
await p.route("**/storage/v1/**", (r) => r.fulfill(json([])));
await p.route("**/rest/v1/**", (r) => {
  const t = (r.request().url().match(/rest\/v1\/(?:rpc\/)?([a-z_]+)/) || [])[1];
  // Aucun versement : tous les mois sont impayés, donc tous portent le bouton.
  if (t === "versements") return r.fulfill(json([]));
  if (t === "contrats") {
    const c = { ...LIGNES("parent").contrats[0], id: CID, enfant_id: EID, parent_id: PID, debut: ilYaUnAn };
    return r.fulfill(json([c]));
  }
  return r.fulfill(json(REPONSE_URL(r.request().url(), r.request().headers(), "parent")));
});
await p.route("**/auth/v1/**", (r) => r.fulfill(json({ ...session, ...utilisateur })));

await p.goto(`http://127.0.0.1:4173/?acces=${CLE}`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(4000);
if (!(await BUNDLE_TESTABLE(p))) { await N.close(); process.exit(2); }
for (let i = 0; i < 5; i++) {
  const passer = p.getByRole("button", { name: /^Passer$/ });
  if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(400); } else break;
}

const ko = [];
await p.evaluate(() => window.dispatchEvent(new CustomEvent("timat:page", { detail: "admin_finances" })));
await p.waitForTimeout(1800);
// L'onglet « Mes versements », à côté de « Mon contrat & Signature ».
const ongletOuvert = await p.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /Mes versements/i.test(x.innerText || ""));
  if (!b) return false; b.click(); return true;
});
if (!ongletOuvert) { console.error("\n  KO  l'onglet « Mes versements » est introuvable : rien n'est vérifiable\n"); await N.close(); process.exit(1); }
await p.waitForTimeout(1800);

// On prend le DERNIER bouton « + Enregistrer » : le mois le plus ancien, donc le
// plus loin sous la ligne de flottaison et le plus éloigné du mois courant.
const cible = await p.evaluate(() => {
  const bs = [...document.querySelectorAll("button")].filter((x) => /\+\s*Enregistrer/i.test(x.innerText || ""));
  if (!bs.length) return null;
  const b = bs[bs.length - 1];
  // Le libellé du mois : le texte de la ligne qui porte ce bouton.
  // Le libelle du mois : le premier texte de la ligne qui porte ce bouton. On
  // remonte jusqu'a trouver un texte qui ressemble a « Mois Annee ».
  let n = b, mois = "";
  for (let k = 0; k < 4 && n; k++) {
    const t = (n.innerText || "").replace(/\s+/g, " ").trim();
    const m = t.match(/([A-ZÀÉÛ][a-zûéèê]+ \d{4})/);
    if (m) { mois = m[1]; break; }
    n = n.parentElement;
  }
  // ON NE FAIT PAS DEFILER NOUS-MEMES. C'est tout l'objet du controle : le
  // formulaire s'ouvre sous le tableau de suivi, et il faut qu'il vienne seul
  // sous les yeux. Premiere version, elle amenait le bouton au centre avant de
  // cliquer — et validait donc une mise en scene qui n'arrive jamais a une
  // utilisatrice.
  return { mois, total: bs.length };
});
if (!cible) { console.error("\n  KO  aucun bouton « + Enregistrer » : le suivi ne propose pas d'enregistrer un versement\n"); await N.close(); process.exit(1); }

// On remonte en haut de la page : c'est la position d'une utilisatrice qui
// arrive sur l'ecran, et c'est ce qui met le formulaire hors de vue.
await p.evaluate(() => {
  window.scrollTo(0, 0);
  const bs = [...document.querySelectorAll("button")].filter((x) => /\+\s*Enregistrer/i.test(x.innerText || ""));
  bs[bs.length - 1].click();
});
await p.waitForTimeout(1400);

const etat = await p.evaluate(() => {
  const titre = [...document.querySelectorAll("div")].find((d) => (d.innerText || "").trim() === "Nouveau versement");
  const carte = titre?.closest(".card");
  const r = carte?.getBoundingClientRect();
  // LA CARTE A DEUX LISTES DEROULANTES : le mode de paiement et la periode. On
  // prend celle dont les valeurs ressemblent a un mois, pas la premiere venue —
  // premiere version de ce controle, elle lisait « virement » et accusait le
  // code d'un defaut qui n'existait pas.
  const sel = [...(carte?.querySelectorAll("select") || [])]
    .find((x) => [...x.options].some((o) => /^\d{4}-\d{2}$/.test(o.value))) || null;
  const date = carte?.querySelector('input[type="date"]');
    // Les champs chiffres sont des <input type="text" inputMode="decimal"> depuis
    // champ-nombre.jsx : un type=number ne peut pas recevoir la virgule, et
    // « 350,50 » y devenait 35050 EUR.
    const montant = carte?.querySelector('input[inputmode="decimal"]');
  return {
    ouvert: !!carte,
    // « Sous les yeux » : une partie du formulaire est dans la fenêtre.
    visible: !!r && r.top < window.innerHeight && r.bottom > 0,
    periode: sel ? sel.value : null,
    optionsConnues: sel ? [...sel.options].map((o) => o.value) : [],
    date: date ? date.value : null,
    montant: montant ? montant.value : null,
  };
});

if (!etat.ouvert) ko.push("le formulaire « Nouveau versement » ne s'ouvre pas");
else {
  if (!etat.visible) ko.push("le formulaire s'ouvre hors de l'écran : on appuie, et il ne se passe rien de visible");
  // 1. La période choisie doit exister dans la liste déroulante.
  if (!etat.periode) ko.push(`la période n'est pas sélectionnée après le clic sur « ${cible.mois} » (le champ retombe sur « — »)`);
  else if (!etat.optionsConnues.includes(etat.periode)) ko.push(`la période « ${etat.periode} » ne correspond à aucune option de la liste (${etat.optionsConnues.slice(1, 3).join(", ")}…)`);
  // 2. La date doit tomber DANS le mois choisi, sinon le versement est compté
  //    dans le mauvais mois et celui qu'on paie reste marqué impayé.
  if (!etat.date) ko.push("la date n'est pas remplie");
  else if (etat.periode && etat.date.slice(0, 7) !== etat.periode) {
    ko.push(`la date (${etat.date}) n'est pas dans le mois enregistré (${etat.periode}) : le versement sera compté dans le mauvais mois, et « ${cible.mois} » restera impayé`);
  }
  if (!etat.montant || Number(etat.montant) <= 0) ko.push("le montant n'est pas prérempli");
}

const dur = erreurs.find((e) => /is not defined|is not a function|cannot read propert/i.test(e));
if (dur) ko.push(`le code casse à l'ouverture du formulaire : ${dur.slice(0, 120)}`);

await N.close();
console.log(`\n=== VERSEMENTS — « + Enregistrer » sur « ${cible.mois} » (${cible.total} mois impayés) ===\n`);
if (ko.length) { ko.forEach((x) => console.log(`  KO  ${x}`)); console.log(`\n${ko.length} problème(s).\n`); }
else console.log(`  ok  le formulaire s'ouvre sous les yeux, sur ${etat.periode}, daté du ${etat.date}, pour ${etat.montant} €\n`);
process.exit(ko.length ? 1 : 0);
