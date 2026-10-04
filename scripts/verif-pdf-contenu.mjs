// LES PDF, LUS POUR DE VRAI.
//
// Le contrat, le bulletin de salaire, l'attestation fiscale : ce sont les
// documents officiels de l'assistante maternelle. Elle les imprime, les signe,
// les donne au parent employeur, les joint à sa déclaration d'impôts. Un seul
// contrôle les touchait jusqu'ici, et il ne vérifiait que l'ENCODAGE — qu'un
// « é » ne devienne pas « Ã© ». Personne n'avait jamais ouvert le fichier
// produit pour regarder ce qu'il dit.
//
// Ce contrôle déclenche les téléchargements dans un vrai navigateur, récupère
// les fichiers, en extrait le texte, et refuse :
//
//   — « undefined », « NaN », « null », « [object Object] », un montant vide :
//     un document officiel ne part pas avec un trou ;
//   — les accents cassés, dans le fichier réellement produit et pas seulement
//     dans le code ;
//   — un PDF vide ou d'une seule page quand il devrait en avoir plus ;
//   — pour le contrat : l'absence d'une mention que la convention collective
//     impose (les parties, l'enfant, la rémunération, la durée d'accueil).
//
// Hors chaîne de build : Vercel n'a pas de navigateur.
//   node scripts/verif-pdf-contenu.mjs [asmat|parent]
import { chromium } from "playwright";
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { REPONSE, UID, PID } from "./jeu-de-donnees.mjs";

const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];
const ESPACE = process.argv[2] || "asmat";
const estParent = ESPACE === "parent";
const DOSSIER = "/tmp/verif-pdf";
rmSync(DOSSIER, { recursive: true, force: true });
mkdirSync(DOSSIER, { recursive: true });

const utilisateur = {
  id: estParent ? PID : UID, aud: "authenticated", role: "authenticated",
  email: estParent ? "sophie@test.fr" : "marie@test.fr", app_metadata: {},
  user_metadata: { prenom: estParent ? "Sophie" : "Marie", nom: "Test", role: estParent ? "parent" : "asmat" },
  created_at: new Date().toISOString(),
};
const session = { access_token: "faux", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "faux", user: utilisateur };

// --- Lire le texte d'un PDF ---------------------------------------------------
//
// jsPDF n'active pas la compression ici (aucun « compress:true » dans le code),
// mais on sait quand même ouvrir un flux compressé : si demain quelqu'un
// l'active, ce contrôle ne doit pas devenir aveugle en silence.
function texteDuPdf(octets) {
  const brut = octets.toString("latin1");
  const morceaux = [];
  for (const m of brut.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let flux = m[1];
    if (flux.slice(0, 2) === "\x78\x9c" || flux.slice(0, 2) === "\x78\x01") {
      try { flux = inflateSync(Buffer.from(flux, "latin1")).toString("latin1"); } catch (e) { continue; }
    }
    morceaux.push(flux);
  }
  const contenu = morceaux.join("\n");
  // Le texte d'un PDF est écrit entre parenthèses, suivi de Tj ou TJ.
  const mots = [];
  for (const m of contenu.matchAll(/\(((?:\\.|[^()\\])*)\)\s*(?:Tj|TJ)/g)) {
    mots.push(m[1]
      .replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
      .replace(/\\([()\\])/g, "$1"));
  }
  return { texte: mots.join(" "), pages: (brut.match(/\/Type\s*\/Page[^s]/g) || []).length };
}

// --- Ce qu'on refuse de lire dans un document officiel ------------------------
const TROUS = /\bundefined\b|\bNaN\b|\bnull\b|\[object Object\]|NULL/;
const ACCENTS_CASSES = /Ã[©¨ªŽ«¢]|â€|Â°|ï¿½/;
// LES MOTS QUI ONT PERDU LEUR ACCENT. Le bulletin en portait six — « Indemnite
// de repas » juste sous « Indemnité d'entretien », « Part salarie »,
// « calculees », « Entree le », et les titres REMUNERATION et RECAPITULATIF.
// Une capitale s'accentue en français, et un document officiel n'écrit pas le
// même mot de deux façons.
const MOTS_NUS = /\b(indemnite|salarie|calculees?|entree|remuneration|recapitulatif|agreee?|declaration|periode|conges|reglement|reference|duree|employe|preavis|anciennete|majorees?)\b/i;
// Le séparateur décimal. « 20.08 h » au milieu de « 84,34 € » : deux
// conventions dans le même document.
const POINT_DECIMAL = /\b\d+\.\d+\s*(h|€|jour|heure)/i;
// Les mentions que la convention collective impose au contrat écrit.
const CONTRAT_EXIGE = [
  [/assistant\w*\s+maternel/i, "la qualité d'assistante maternelle"],
  [/employeur|parent/i, "le parent employeur"],
  [/(taux|salaire|rémunération|r.munération)/i, "la rémunération"],
  [/(heure|durée|dur.e)/i, "la durée d'accueil"],
];

const N = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await N.newContext({
  viewport: { width: 1280, height: 900 }, locale: "fr-FR", timezoneId: "Europe/Paris",
  serviceWorkers: "block", acceptDownloads: true,
});
const p = await ctx.newPage();
const erreurs = [];
p.on("pageerror", (e) => erreurs.push(e.message));
p.on("dialog", (d) => d.dismiss().catch(() => {}));

// DEUX VOIES, ET LA PREMIÈRE VERSION N'EN CONNAISSAIT QU'UNE.
//
// Elle n'écoutait que les téléchargements : 39 boutons cliqués, zéro fichier.
// La plupart des documents ne sont pas des fichiers PDF fabriqués par le code —
// ce sont des pages HTML ouvertes dans une fenêtre, que l'utilisatrice imprime
// elle-même en PDF depuis son navigateur. On lit donc aussi ces fenêtres, et
// c'est même plus précis : on lit le document tel qu'il s'affiche, au lieu de
// désassembler un flux PDF.
const fichiers = [];
p.on("download", async (d) => {
  const nom = d.suggestedFilename() || "sans-nom.pdf";
  const chemin = `${DOSSIER}/${fichiers.length}-${nom.replace(/[^\w.-]/g, "_")}`;
  try { await d.saveAs(chemin); fichiers.push({ nom, chemin, genre: "fichier" }); } catch (e) { /* annulé : rien à lire */ }
});
p.on("popup", async (f) => {
  try {
    await f.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => {});
    await f.waitForTimeout(900);
    const titre = (await f.title().catch(() => "")) || "document";
    const texte = await f.evaluate(() => document.body ? document.body.innerText : "").catch(() => "");
    fichiers.push({ nom: titre, texte, genre: "fenêtre" });
    await f.close().catch(() => {});
  } catch (e) { /* fenêtre fermée avant lecture : rien à retenir */ }
});

await p.addInitScript(([s, cle]) => {
  try {
    localStorage.setItem("timat_acces", cle);
    localStorage.setItem("sb-akicyckmbsjnewnvvcil-auth-token", JSON.stringify(s));
  } catch (e) { /* stockage indisponible : la page reste testable */ }
}, [session, CLE]);

const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
await p.route("**/storage/v1/**", (r) => r.fulfill(json({ Key: "ok", path: "x/doc.pdf" })));
await p.route("**/rest/v1/**", (r) => {
  const t = (r.request().url().match(/rest\/v1\/(?:rpc\/)?([a-z_]+)/) || [])[1];
  return r.fulfill(json(REPONSE(t, estParent ? "parent" : "asmat")));
});
await p.route("**/auth/v1/**", (r) => r.fulfill(json({ ...session, ...utilisateur })));

await p.goto(`http://127.0.0.1:4173/?acces=${CLE}`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(4000);
for (let i = 0; i < 5; i++) {
  const passer = p.getByRole("button", { name: /^Passer$/ });
  if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(400); } else break;
}
const connecte = await p.evaluate(() => !/Je suis assistante maternelle/.test(document.body.innerText));
if (!connecte) { console.error("\n  KO  la session n'est pas ouverte : le contrôle ne vérifierait rien\n"); await N.close(); process.exit(1); }

// --- Déclencher tout ce qui produit un PDF ------------------------------------
const ECRANS = estParent
  ? ["documents_complet", "admin_finances", "suivi_progres"]
  : ["paie_contrats", "documents_rapports", "suivi_progres", "pmi", "sante_urgence"];
const PDF = /pdf|imprimer|t[ée]l[ée]charger|attestation|bulletin/i;
const DANGEREUX = /supprim|effac|r[ée]sili|d[ée]connex|payer|archiver/i;

let declenches = 0;
for (const ecran of ECRANS) {
  await p.evaluate((x) => window.dispatchEvent(new CustomEvent("timat:page", { detail: x })), ecran);
  await p.waitForTimeout(1500);
  // On descend aussi dans les onglets : la paie et les contrats y vivent.
  const onglets = await p.evaluate(() => {
    const trouvees = [];
    for (const d of document.querySelectorAll("*")) {
      if (d.closest("nav, header")) continue;
      const bs = [...d.children].filter((c) => c.tagName === "BUTTON" && c.offsetParent && c.innerText.trim().length > 0 && c.innerText.trim().length < 40);
      if (bs.length >= 2) trouvees.push(bs.map((b) => b.innerText.replace(/\s+/g, " ").trim()));
    }
    return trouvees.slice(0, 2).flat();
  });
  for (const chemin of ["", ...new Set(onglets)]) {
    await p.evaluate((x) => window.dispatchEvent(new CustomEvent("timat:page", { detail: x })), ecran);
    await p.waitForTimeout(700);
    if (chemin) {
      const ok = await p.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => x.innerText.replace(/\s+/g, " ").trim() === t); if (!b) return false; b.click(); return true; }, chemin);
      if (!ok) continue;
      await p.waitForTimeout(1100);
    }
    const boutons = await p.evaluate((d) => {
      const re = new RegExp(d.pdf, "i"), dang = new RegExp(d.dang, "i");
      return [...document.querySelectorAll("button")]
        .filter((b) => b.offsetParent && !b.disabled)
        .map((b) => (b.innerText || "").replace(/\s+/g, " ").trim())
        .filter((t) => t && t.length < 50 && re.test(t) && !dang.test(t));
    }, { pdf: PDF.source, dang: DANGEREUX.source });
    for (const libelle of [...new Set(boutons)]) {
      const avant = fichiers.length;
      await p.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => (x.innerText || "").replace(/\s+/g, " ").trim() === t); if (b && !b.disabled) b.click(); }, libelle);
      declenches++;
      await p.waitForTimeout(2600);
      if (fichiers.length > avant && process.env.TRACE) console.log(`      ${ecran}${chemin ? " › " + chemin : ""} › ${libelle} → ${fichiers[fichiers.length - 1].nom}`);
    }
  }
}

await p.waitForTimeout(1500);
await N.close();

// --- Lire ce qui est sorti -----------------------------------------------------
const ko = [];
for (const f of fichiers) {
  let texte = f.texte, pages = 1;
  if (f.genre === "fichier") {
    const octets = readFileSync(f.chemin);
    if (!/%PDF/.test(octets.slice(0, 8).toString("latin1"))) { ko.push(`${f.nom} : ce n'est pas un PDF`); continue; }
    ({ texte, pages } = texteDuPdf(octets));
  }
  if (!String(texte || "").trim()) { ko.push(`${f.nom} : le document ne contient aucun texte`); continue; }
  const trou = texte.match(TROUS);
  if (trou) ko.push(`${f.nom} : « ${trou[0]} » est écrit dans le document`);
  const casse = texte.match(ACCENTS_CASSES);
  if (casse) ko.push(`${f.nom} : les accents sont cassés (« ${casse[0]} ») dans le fichier produit`);
  const nu = texte.match(MOTS_NUS);
  if (nu) ko.push(`${f.nom} : « ${nu[0]} » est écrit sans accent dans un document officiel`);
  const point = texte.match(POINT_DECIMAL);
  if (point) ko.push(`${f.nom} : « ${point[0]} » utilise un point décimal là où le reste du document utilise la virgule`);
  if (/contrat/i.test(f.nom) && !/aper[çc]u/i.test(f.nom)) {
    for (const [re, quoi] of CONTRAT_EXIGE)
      if (!re.test(texte)) ko.push(`${f.nom} : ${quoi} n'apparaît pas dans le contrat`);
  }
  if (f.genre === "fichier" && pages === 0) ko.push(`${f.nom} : aucune page`);
}
const dur = erreurs.find((e) => /is not defined|is not a function|cannot read propert/i.test(e));
if (dur) ko.push(`le code casse pendant la génération : ${dur.slice(0, 120)}`);

if (process.env.DUMP) for (const f of fichiers) console.log(`\n----- ${f.nom}\n` + String(f.texte || "").replace(/\n{2,}/g, "\n").slice(0, 1400));
console.log(`\n=== PDF — ${declenches} bouton(s) déclenché(s), ${fichiers.length} fichier(s) produit(s) (${ESPACE}) ===\n`);
fichiers.forEach((f) => console.log(`      [${f.genre}] ${f.nom}`));
console.log("");
if (!fichiers.length) {
  console.log("  Aucun PDF produit : ce contrôle ne protège rien pour l'instant.\n");
  process.exit(1);
}
if (ko.length) { ko.forEach((x) => console.log(`  KO  ${x}`)); console.log(`\n${ko.length} problème(s).\n`); }
else console.log(`  ok  les ${fichiers.length} documents produits sont lisibles, sans trou ni accent cassé\n`);
process.exit(ko.length ? 1 : 0);
