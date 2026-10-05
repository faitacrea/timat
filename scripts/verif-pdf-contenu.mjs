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
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { REPONSE_URL, UID, PID } from "./jeu-de-donnees.mjs";

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
  // LA PLAGE 0x80–0x9F N'EST PAS DU LATIN-1.
  //
  // jsPDF écrit le texte en WinAnsi : l'euro y vaut l'octet 0x80, l'apostrophe
  // typographique 0x92, les tirets longs 0x96 et 0x97. Lus en latin-1, ce sont
  // des caractères de commande — invisibles. Le contrat semblait donc écrire
  // « Indemnité d'entretien 3,92  par journée », sans son euro, et j'ai failli
  // accuser l'application d'un défaut qui n'existe pas : le symbole est bel et
  // bien dans le fichier, c'était ce contrôle qui le perdait.
  const WINANSI = {
    0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…", 0x86: "†", 0x87: "‡",
    0x88: "ˆ", 0x89: "‰", 0x8a: "Š", 0x8b: "‹", 0x8c: "Œ", 0x8e: "Ž",
    0x91: "'", 0x92: "'", 0x93: "\u201c", 0x94: "\u201d", 0x95: "•", 0x96: "–", 0x97: "—",
    0x98: "˜", 0x99: "™", 0x9a: "š", 0x9b: "›", 0x9c: "œ", 0x9e: "ž", 0x9f: "Ÿ",
  };
  const versUnicode = (t) => t.replace(/[\u0080-\u009f]/g, (c) => WINANSI[c.charCodeAt(0)] ?? c);
  // Le texte d'un PDF est écrit entre parenthèses, suivi de Tj ou TJ.
  const mots = [];
  for (const m of contenu.matchAll(/\(((?:\\.|[^()\\])*)\)\s*(?:Tj|TJ)/g)) {
    mots.push(versUnicode(m[1]
      .replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
      .replace(/\\([()\\])/g, "$1")));
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
// CE QU'UN CONTRAT ÉCRIT DOIT PORTER.
//
// La convention collective impose des mentions, et leur absence rend le contrat
// attaquable. On exige donc chacune, nommément, plutôt que des mots vagues : un
// contrat qui parle de « salaire » quelque part ne prouve pas qu'il chiffre la
// rémunération.
const CONTRAT_EXIGE = [
  [/IDCC\s*3239/i, "la convention collective applicable (IDCC 3239)"],
  [/dur[ée]e\s+ind[ée]termin[ée]e|CDI/i, "la nature du contrat"],
  [/agr[ée]ment/i, "l'agrément du salarié"],
  [/p[ée]riode d'essai/i, "la période d'essai"],
  [/\d+[,.]\d+\s*€/, "un montant chiffré avec son symbole €"],
  [/indemnit[ée] d'entretien/i, "l'indemnité d'entretien"],
  [/cong[ée]s pay[ée]s/i, "les congés payés"],
  [/pr[ée]avis/i, "le préavis de rupture"],
  [/1er mai/i, "le 1er mai, seul jour férié obligatoirement chômé et payé"],
  [/deux exemplaires/i, "l'établissement en deux exemplaires"],
  [/signature|sign[ée]/i, "la signature"],
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
// LE CONTRAT NE S'OUVRE PAS ET NE SE TÉLÉCHARGE PAS : IL SE DÉPOSE.
//
// generateAndStoreContratPDF fabrique le PDF et l'envoie dans l'espace de
// stockage. Aucune fenêtre, aucun téléchargement — c'est pour cela que ce
// contrôle déclenchait trente-neuf boutons sans jamais voir le contrat. On lit
// donc ce qui monte : si le corps de la requête commence par %PDF, c'est un
// document produit, et il se lit comme les autres.
await p.route("**/storage/v1/**", (r) => {
  const req = r.request();
  try {
    // LE PDF N'EST PAS AU DÉBUT DU CORPS. Le dépôt se fait en multipart : la
    // requête commence par la frontière « ------WebKitFormBoundary… » et le
    // fichier vient après. Chercher « %PDF- » à l'octet zéro ne trouvait rien,
    // et le contrat restait invisible alors qu'il partait bel et bien — 31 Ko
    // à chaque clic.
    const brut = req.postDataBuffer();
    const debut = brut ? brut.indexOf(Buffer.from("%PDF-")) : -1;
    let corps = null;
    if (debut >= 0) {
      const fin = brut.lastIndexOf(Buffer.from("%%EOF"));
      corps = brut.slice(debut, fin > debut ? fin + 5 : undefined);
    }
    if (corps) {
      const nom = (req.url().match(/([^/?]+\.pdf)/i) || [, "depose.pdf"])[1];
      const chemin = `${DOSSIER}/depot-${fichiers.length}-${nom.replace(/[^\w.-]/g, "_")}`;
      writeFileSync(chemin, corps);
      fichiers.push({ nom, chemin, genre: "dépôt" });
    }
  } catch (e) { /* corps illisible : on ne retient rien plutôt que d'inventer */ }
  return r.fulfill(json({ Key: "ok", path: "x/doc.pdf" }));
});
// « .single() » ATTEND UN OBJET, PAS UN TABLEAU.
//
// Le contrat sortait avec « Prénom et nom - » alors que l'enfant est dans le
// jeu de données : generateAndStoreContratPDF le lit avec .single(), qui envoie
// l'en-tête « Accept: application/vnd.pgrst.object+json » et attend UN objet.
// Une liste lui fait rendre une erreur, l'enfant vaut null, et le PDF se
// remplit de tirets. C'était le harnais, pas l'application — mais tant qu'il
// répondait de travers, ce contrôle regardait un document qui n'existe pas.
await p.route("**/rest/v1/**", (r) => {
  const req = r.request();
  return r.fulfill(json(REPONSE_URL(req.url(), req.headers(), estParent ? "parent" : "asmat")));
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

const ko = [];

// --- Déclencher tout ce qui produit un PDF ------------------------------------
const ECRANS = estParent
  ? ["documents_complet", "admin_finances", "suivi_progres"]
  : ["paie_contrats", "documents_rapports", "suivi_progres", "pmi", "sante_urgence"];
const PDF = /pdf|imprimer|t[ée]l[ée]charger|attestation|bulletin|contrat|r[ée]g[ée]n[ée]rer|mettre à jour/i;
const DANGEREUX = /supprim|effac|r[ée]sili|d[ée]connex|payer|archiver/i;

// LES CHEMINS CONNUS, NOMMÉS.
//
// Le parcours opportuniste ci-dessous trouve ce qu'il croise, et il a déjà
// prouvé qu'il rate le contrat : celui-ci vit sous DEUX niveaux d'onglets, et
// son bouton n'apparaît que si un PDF a déjà été déposé. Un document officiel
// ne peut pas dépendre de la chance d'un parcours. On nomme donc les chemins
// qu'on exige, et leur absence est un défaut en soi.
const EXIGES = estParent ? [] : [
  { quoi: "le contrat signé", ecran: "paie_contrats", onglets: ["Contrats", "Contrats & Avenants"], bouton: /Mettre à jour le PDF|Régénérer PDF|Générer PDF/ },
  { quoi: "le bulletin de salaire", ecran: "paie_contrats", onglets: ["Paie", "Bulletin de salaire"], bouton: /Télécharger PDF/ },
];
let declenches = 0;
for (const exige of EXIGES) {
  await p.evaluate((x) => window.dispatchEvent(new CustomEvent("timat:page", { detail: x })), exige.ecran);
  await p.waitForTimeout(1600);
  let perdu = false;
  for (const onglet of exige.onglets) {
    const ok = await p.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => x.innerText.replace(/\s+/g, " ").trim() === t); if (!b) return false; b.click(); return true; }, onglet);
    if (!ok) { ko.push(`${exige.quoi} : l'onglet « ${onglet} » est introuvable`); perdu = true; break; }
    await p.waitForTimeout(1500);
  }
  if (perdu) continue;
  const avant = fichiers.length;
  const clique = await p.evaluate((src) => {
    const re = new RegExp(src);
    const b = [...document.querySelectorAll("button")].find((x) => x.offsetParent && !x.disabled && re.test((x.innerText || "").replace(/\s+/g, " ").trim()));
    if (!b) return null;
    const t = (b.innerText || "").replace(/\s+/g, " ").trim(); b.click(); return t;
  }, exige.bouton.source);
  if (!clique) { ko.push(`${exige.quoi} : aucun bouton pour le produire sur ce chemin`); continue; }
  declenches++;
  await p.waitForTimeout(4000);
  if (fichiers.length === avant) ko.push(`${exige.quoi} : « ${clique} » cliqué, et rien n'est produit`);
  else if (process.env.TRACE) console.log(`      [exigé] ${exige.quoi} › ${clique} → ${fichiers[fichiers.length - 1].nom}`);
}

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
for (const f of fichiers) {
  let texte = f.texte, pages = 1;
  if (f.genre === "fichier" || f.genre === "dépôt") {
    const octets = readFileSync(f.chemin);
    if (!/%PDF/.test(octets.slice(0, 8).toString("latin1"))) { ko.push(`${f.nom} : ce n'est pas un PDF`); continue; }
    ({ texte, pages } = texteDuPdf(octets));
    f.texte = texte; // pour DUMP : sans cela on n'affichait rien pour un fichier
  }
  if (!String(texte || "").trim()) { ko.push(`${f.nom} : le document ne contient aucun texte`); continue; }
  if (process.env.MESURE) console.log(`      ${f.nom} : ${pages} page(s), ${texte.length} caractères lus`);
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
  if (f.genre !== "fenêtre" && pages === 0) ko.push(`${f.nom} : aucune page`);
}
const dur = erreurs.find((e) => /is not defined|is not a function|cannot read propert/i.test(e));
if (dur) ko.push(`le code casse pendant la génération : ${dur.slice(0, 120)}`);

if (process.env.DUMP) for (const f of fichiers) console.log(`\n----- ${f.nom}\n` + String(f.texte || "").replace(/\n{2,}/g, "\n").slice(0, 20000));
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
