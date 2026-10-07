// CE QU'ON RÉCLAME AU PARENT DOIT ÊTRE CE QU'IL DOIT.
//
// « Suivi des versements » annonce un montant dû par mois, marque les mois
// impayés, et met un bouton « Relancer » en face. C'est le seul endroit de
// l'application qui réclame de l'argent à quelqu'un.
//
// Il réclamait le BRUT. L'étiquette affichée annonçait « heures lissées × taux
// net », le calcul prenait le taux horaire du contrat — qui est un taux brut.
// Sur un contrat de 40 h à 4,20 € brut en année complète : 814,24 € annoncés
// dus là où 654,95 € étaient à verser. 159,29 € par mois réclamés à un parent
// parfaitement à jour, pour toujours.
//
// Ce contrôle lit les deux chiffres dans l'application, pour le MÊME contrat :
// le « net à payer » du bulletin de salaire, et le dû du suivi. Le second doit
// valoir le premier plus les indemnités — jamais le brut.
//
// Hors chaîne de build : Vercel n'a pas de navigateur.
//   node scripts/verif-du-verse.mjs
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { REPONSE_URL, LIGNES, UID, EID, CID, BUNDLE_TESTABLE } from "./jeu-de-donnees.mjs";

const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];
const ilYaUnAn = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
const utilisateur = {
  id: UID, aud: "authenticated", role: "authenticated", email: "marie@test.fr",
  app_metadata: {}, user_metadata: { prenom: "Marie", nom: "Dupont", role: "asmat" },
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
  // AUCUN VERSEMENT : chaque mois est impaye, donc chaque mois affiche son du.
  if (t === "versements") return r.fulfill(json([]));
  if (t === "contrats") {
    const c = { ...LIGNES("asmat").contrats[0], id: CID, enfant_id: EID, asmat_id: UID, debut: ilYaUnAn };
    return r.fulfill(json([c]));
  }
  return r.fulfill(json(REPONSE_URL(r.request().url(), r.request().headers(), "asmat")));
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
const euros = (t) => {
  // « 1 234,56 € » → 1234.56. L'espace est une espace insecable dans le rendu.
  const m = String(t || "").replace(/ | /g, " ").match(/(-?[\d ]+(?:,\d{1,2})?)\s*€/);
  return m ? Number(m[1].replace(/ /g, "").replace(",", ".")) : null;
};

// --- Le suivi des versements affiche son detail : on le verifie ----------
await p.evaluate(() => window.dispatchEvent(new CustomEvent("timat:page", { detail: "admin_finances" })));
await p.waitForTimeout(2200);
await p.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /versements/i.test(x.innerText || ""));
  if (b) b.click();
});
await p.waitForTimeout(2200);

const lu = await p.evaluate(() => {
  const txt = document.body.innerText.replace(/\s+/g, " ");
  const m = txt.match(/verse chaque mois\s*:\s*([^=]+)=\s*salaire net\s*([^+]+)\+\s*entretien\s*([0-9 \u00a0\u202f,]+€)(?:\s*\+\s*repas\s*([0-9 \u00a0\u202f,]+€))?\s*\.\s*Le salaire brut lissé est de\s*([0-9 \u00a0\u202f,]+€)/i);
  if (!m) return { brut: null, texte: txt.slice(0, 400) };
  return { total: m[1], net: m[2], ent: m[3], rep: m[4] || null, brut: m[5] };
});
if (lu.brut === null) {
  ko.push("le suivi des versements n'affiche pas le détail du montant dû : rien n'est vérifiable");
  console.error("\n  (texte lu : " + lu.texte + ")\n");
} else {
  const total = euros(lu.total), net = euros(lu.net), ent = euros(lu.ent);
  const rep = lu.rep ? euros(lu.rep) : 0;
  const brut = euros(lu.brut);

  // 1. LE DETAIL DOIT S'ADDITIONNER. C'est le defaut trouve sur la
  //    demonstration de la page publique : des lignes qui ne font pas le total.
  const somme = Math.round((net + ent + rep) * 100) / 100;
  if (Math.abs(total - somme) > 0.02) {
    ko.push(`le détail ne fait pas le total : ${net} + ${ent}${rep ? " + " + rep : ""} = ${somme} €, mais ${total} € est annoncé`);
  }

  // 2. LE SALAIRE RECLAME NE DOIT PAS ETRE LE BRUT. Un parent employeur verse
  //    le net ; les cotisations passent par Pajemploi. Les cotisations
  //    salariales valent environ 21,7 % du brut : on accepte une bande large
  //    (70 a 90 %) pour ne pas recopier ici le bareme, qui n'a qu'une seule
  //    source dans App.jsx — mais le brut lui-meme, a 100 %, est refuse.
  if (brut > 0) {
    const part = net / brut;
    if (part > 0.9) {
      ko.push(`le suivi réclame ${net} € de salaire pour un brut de ${brut} € (${(part * 100).toFixed(1)} %) : c'est le BRUT qui est réclamé, or le parent ne verse que le net — sur un contrat type cela fait plus de 150 € réclamés à tort chaque mois`);
    } else if (part < 0.7) {
      ko.push(`le suivi ne réclame que ${net} € de salaire pour un brut de ${brut} € (${(part * 100).toFixed(1)} %) : c'est moins que le net, l'assistante maternelle serait sous-payée`);
    }
  }

  console.log(`  dû annoncé : ${total} € = net ${net} € + entretien ${ent} €${rep ? " + repas " + rep + " €" : ""}`);
  console.log(`  brut lissé : ${brut} €  (part nette : ${brut > 0 ? ((net / brut) * 100).toFixed(1) : "?"} %)\n`);
}

const dur = erreurs.find((e) => /is not defined|is not a function|cannot read propert/i.test(e));
if (dur) ko.push(`le code casse en lisant ces écrans : ${dur.slice(0, 120)}`);

await N.close();
console.log("\n=== DÛ / VERSÉ — le suivi réclame-t-il le bon montant ? ===\n");
if (ko.length) { ko.forEach((x) => console.log(`  KO  ${x}`)); console.log(`\n${ko.length} problème(s).\n`); }
else console.log("  ok  le suivi réclame le net plus les indemnités, pas le brut\n");
process.exit(ko.length ? 1 : 0);
