// LES CHIFFRES QUE LE PARENT RECOPIE SUR MONENFANT.FR.
//
// Le kit de déclaration CMG porte un bouton « Copier » devant chaque ligne. Le
// parent les recopie sur monenfant.fr, et la CAF calcule son Complément Mode de
// Garde dessus. Ce ne sont pas des chiffres décoratifs : ils partent sur une
// déclaration, et doivent concorder avec ce qui est déclaré à Pajemploi.
//
// L'un d'eux était divisé par dix. L'indemnité d'entretien mensuelle s'écrivait
//
//     Math.round(entretien * heuresMois / heuresHebdo * 5) / 10
//
// où le « /10 » final, qui devait arrondir à une décimale, divisait le résultat.
// Le kit annonçait 8,50 € par mois là où 84,77 € étaient dus.
//
// Ce contrôle lit les lignes du kit et vérifie qu'elles se tiennent entre
// elles : l'entretien du mois doit valoir celui du jour multiplié par un nombre
// de journées plausible, et le net doit être inférieur au brut.
//
// Hors chaîne de build : Vercel n'a pas de navigateur.
//   node scripts/verif-kit-cmg.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { REPONSE_URL, LIGNES, PID, EID, CID, BUNDLE_TESTABLE } from "./jeu-de-donnees.mjs";

const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];
const utilisateur = {
  id: PID, aud: "authenticated", role: "authenticated", email: "sophie@test.fr",
  app_metadata: {}, user_metadata: { prenom: "Sophie", nom: "Test", role: "parent" },
  created_at: new Date().toISOString(),
};
const session = { access_token: "faux", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "faux", user: utilisateur };

const N = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await N.newContext({ viewport: { width: 1280, height: 1000 }, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
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
  if (t === "contrats") {
    const c = { ...LIGNES("parent").contrats[0], id: CID, enfant_id: EID, parent_id: PID };
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
await p.evaluate(() => window.dispatchEvent(new CustomEvent("timat:page", { detail: "aides_simulateurs" })));
await p.waitForTimeout(2000);
// Le kit est un onglet de l'ecran des aides.
await p.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /CMG|Kit/i.test(x.innerText || ""));
  if (b) b.click();
});
await p.waitForTimeout(2200);

// Les lignes du kit sont « libelle » puis « valeur » : on les lit par paires
// dans le DOM, et non par une expression reguliere sur tout le texte de la page
// — c'est ce qui m'avait fait lire des chiffres colles bout a bout.
const lignes = await p.evaluate(() => {
  const out = {};
  for (const b of document.querySelectorAll("button")) {
    if (!/Copier/i.test(b.innerText || "")) continue;
    const rangee = b.closest("div")?.parentElement;
    const spans = [...(rangee?.querySelectorAll("span") || [])].map((s) => (s.innerText || "").trim());
    if (spans.length >= 2) out[spans[0]] = spans[1];
  }
  return out;
});
const euros = (t) => {
  const m = String(t || "").replace(/ | /g, " ").match(/(-?[\d ]+(?:[,.]\d{1,2})?)/);
  return m ? Number(m[1].replace(/ /g, "").replace(",", ".")) : null;
};
const trouve = (motif) => {
  const k = Object.keys(lignes).find((x) => new RegExp(motif, "i").test(x));
  return k ? euros(lignes[k]) : null;
};

if (!Object.keys(lignes).length) {
  console.error("\n  KO  le kit de déclaration CMG ne s'ouvre pas : rien n'est vérifiable\n");
  await N.close(); process.exit(1);
}

const entJour = trouve("entretien/jour");
const entMois = trouve("entretien/mois");
const brut = trouve("Salaire brut mensuel");
const net = trouve("Salaire net mensuel");
const heuresSem = trouve("Heures par semaine");
const heuresMois = trouve("Heures par mois");

// 1. L'ENTRETIEN DU MOIS DOIT VALOIR CELUI DU JOUR FOIS DES JOURNEES.
//    Un mois d'accueil compte entre 15 et 23 journees selon le rythme : hors de
//    cette fourchette, le chiffre ne decrit plus un mois.
if (entJour === null || entMois === null) ko.push("le kit n'affiche pas l'indemnité d'entretien par jour et par mois : la cohérence n'est pas vérifiable");
else {
  const journees = entJour > 0 ? entMois / entJour : 0;
  if (journees < 12 || journees > 24) {
    ko.push(`l'indemnité d'entretien du mois (${entMois} €) vaut ${journees.toFixed(1)} journées à ${entJour} € : un mois d'accueil en compte entre 15 et 23. Le parent recopie ce montant sur monenfant.fr`);
  }
}

// 2. LE NET NE PEUT PAS DEPASSER LE BRUT, NI TOMBER SOUS 70 %.
if (brut !== null && net !== null && brut > 0) {
  if (net >= brut) ko.push(`le kit annonce un salaire net (${net} €) supérieur ou égal au brut (${brut} €)`);
  else if (net / brut < 0.7) ko.push(`le kit annonce un net de ${net} € pour un brut de ${brut} € (${((net / brut) * 100).toFixed(1)} %) : trop bas pour des cotisations salariales`);
}

// 3. LES HEURES DU MOIS DOIVENT DECOULER DE CELLES DE LA SEMAINE.
if (heuresSem !== null && heuresMois !== null && heuresSem > 0) {
  const semaines = heuresMois / heuresSem;
  if (semaines < 3.5 || semaines > 4.5) {
    ko.push(`${heuresMois} h par mois pour ${heuresSem} h par semaine, soit ${semaines.toFixed(2)} semaines : un mois en compte entre 3,8 et 4,34`);
  }
}

const dur = erreurs.find((e) => /is not defined|is not a function|cannot read propert/i.test(e));
if (dur) ko.push(`le code casse sur le kit : ${dur.slice(0, 120)}`);

await N.close();
console.log("\n=== KIT CMG — les chiffres que le parent recopie ===\n");
console.log(`  entretien : ${entJour} €/jour → ${entMois} €/mois`);
console.log(`  salaire   : brut ${brut} € → net ${net} €`);
console.log(`  heures    : ${heuresSem} h/semaine → ${heuresMois} h/mois\n`);
if (ko.length) { ko.forEach((x) => console.log(`  KO  ${x}`)); console.log(`\n${ko.length} problème(s).\n`); }
else console.log("  ok  les chiffres du kit se tiennent entre eux\n");
process.exit(ko.length ? 1 : 0);
