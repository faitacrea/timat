// « BONJOUR , » — LES TROUS DANS LES COURRIELS QUI PARTENT VRAIMENT.
//
// Les onze gabarits écrivent « Bonjour ${esc(v.parent_prenom)}, ». esc() rend
// une chaîne vide pour une variable absente — c'est mieux que « undefined »,
// mais ce qui arrive dans la boîte d'un parent est alors « Bonjour , », suivi
// de phrases amputées : « Le bulletin de salaire pour est disponible ».
//
// AU MOMENT OÙ J'ÉCRIS, AUCUN APPEL N'A DE TROU. Les onze sont complets. Ce
// contrôle ne répare donc rien : il empêche le douzième de partir cassé, et il
// le fait AVANT l'envoi, pas après la plainte d'une utilisatrice.
//
// UNE ERREUR À NE PAS REFAIRE. Mon premier jet accusait un appel qui passait
// « url » en forme abrégée — « {enfant_prenom: e.prenom, url} » — parce qu'il
// ne cherchait que « nom: ». Un faux KO est pire qu'une absence de contrôle :
// il apprend à ignorer le rapport. On reconnaît donc les deux formes.
//
//   node scripts/test-courriel-trous.mjs
import { readFileSync, readdirSync } from "node:fs";

process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://exemple.supabase.co";
const { EMAIL_TEMPLATES: T } = await import("../api/send-email.js");

const ko = [];
const dire = (bon, quoi, detail) => {
  if (bon) console.log(`  ok  ${quoi}`);
  else { ko.push(`${quoi}${detail ? " — " + detail : ""}`); console.log(`  KO  ${quoi}${detail ? "\n        " + detail : ""}`); }
};

console.log("\n=== LES COURRIELS — aucune variable oubliée ===\n");

// 1. Ce que chaque gabarit demande.
const besoin = {};
for (const [nom, t] of Object.entries(T)) {
  const src = String(t.html) + (typeof t.subject === "function" ? String(t.subject) : "");
  besoin[nom] = [...new Set([...src.matchAll(/v\.([a-zA-Z_][a-zA-Z0-9_]*)/g)].map((m) => m[1]))];
}

// 2. Ce que chaque appel fournit.
//
// On lit le bloc « vars:{...} » qui suit le gabarit, en comptant les accolades
// pour s'arrêter au bon endroit : un objet imbriqué ne doit pas faire déborder
// la lecture sur le code d'après.
const fichiers = ["src/App.jsx", "src/gestion.jsx", "src/ecrans-quotidien.jsx",
  "src/ecrans-app.jsx", "src/ecrans-secondaires.jsx", "src/socle.jsx", "src/backoffice.jsx"]
  .filter((f) => { try { readFileSync(new URL("../" + f, import.meta.url)); return true; } catch { return false; } })
  .concat(readdirSync(new URL("../api/", import.meta.url)).filter((f) => f.endsWith(".js")).map((f) => "api/" + f));

// L'OBJET QUI PORTE LE NOM, PAS SON VOISINAGE.
//
// Deux erreurs de mon premier jet, que je garde écrites parce qu'elles disent
// comment ce contrôle peut mentir :
//
//   1. il ne voyait que « template: "..." », l'écriture de l'application, et
//      ratait « type: '...' », celle des crons — six appels examinés sur neuf,
//      et un vert trompeur ;
//   2. élargi à « type », il a accusé « createNotification({type:"versement"}) »,
//      qui est la cloche dans l'application, pas un courriel — simplement parce
//      qu'un envoi se trouvait trois lignes plus bas.
//
// On remonte donc jusqu'à l'accolade qui ouvre l'objet portant le nom, et on
// n'examine que ce qu'il contient. Un envoi de courriel porte « to » et
// « vars » ; la cloche n'en a aucun.
const objetAutour = (s, i) => {
  let p = 0;
  for (let k = i; k >= 0 && i - k < 4000; k--) {
    if (s[k] === "}") p++;
    else if (s[k] === "{") { if (p === 0) {
      let q = 0;
      for (let j = k; j < s.length && j - k < 6000; j++) {
        if (s[j] === "{") q++;
        else if (s[j] === "}") { q--; if (q === 0) return s.slice(k + 1, j); }
      }
      return null;
    } p--; }
  }
  return null;
};
const clesDe = (bloc) => {
  const cles = new Set();
  for (const m of bloc.matchAll(/(?:^|[,{])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=[,:}]|$)/g)) cles.add(m[1]);
  for (const m of bloc.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g)) cles.add(m[1]);
  return cles;
};
const blocVars = (objet) => {
  const i = objet.search(/\bvars\b/);
  if (i < 0) return null;
  const j = objet.indexOf("{", i);
  if (j < 0) return null;
  let p = 0;
  for (let k = j; k < objet.length; k++) {
    if (objet[k] === "{") p++;
    else if (objet[k] === "}") { p--; if (p === 0) return objet.slice(j + 1, k); }
  }
  return null;
};

let appels = 0;
const vus = new Set();
for (const f of fichiers) {
  const s = readFileSync(new URL("../" + f, import.meta.url), "utf8");
  // Le cron choisit son gabarit par un ternaire : « type: jours === 7 ?
  // 'essai_rappel_7' : 'essai_rappel_3' ». Les deux branches sont des envois
  // réels, et toutes deux doivent être complètes.
  const motif = /(?:template|type)\s*:\s*(?:[^,}]*?\?\s*)?["']([a-z_0-9]+)["'](?:\s*:\s*["']([a-z_0-9]+)["'])?/g;
  for (const m of s.matchAll(motif)) {
    const objet = objetAutour(s, m.index);
    if (objet === null) continue;
    // Un envoi de courriel, et rien d'autre.
    if (!/\bto\b\s*:/.test(objet) || !/\bvars\b/.test(objet)) continue;
    // « template » fait foi quand les deux sont là : un même appel ne compte
    // qu'une fois.
    for (const nom of [m[1], m[2]].filter(Boolean)) {
    if (!besoin[nom]) { /* une branche qui n'est pas un gabarit : on passe */ if (![m[1], m[2]].some((x) => besoin[x])) { dire(false, `${f} appelle le gabarit « ${nom} »`, "ce gabarit n'existe pas dans EMAIL_TEMPLATES : le courriel ne partira pas"); } continue; }
    const signature = f + "|" + nom + "|" + objet.slice(0, 80);
    if (vus.has(signature)) continue;
    vus.add(signature);
    appels++;
    const bloc = blocVars(objet);
    if (bloc === null) { dire(false, `${f} · ${nom}`, "aucun bloc « vars » trouvé dans l'appel"); continue; }
    const fournies = clesDe(bloc);
    const manque = besoin[nom].filter((v) => !fournies.has(v));
    dire(manque.length === 0, `${f} · ${nom}`,
      `variable(s) non fournie(s) : ${manque.join(", ")} — le courriel partirait avec un trou à la place`);
    }
  }
}
// LES GABARITS QUE PERSONNE N'APPELLE.
//
// « invitation_parent » est écrit ici et n'est appelé par aucun code du dépôt :
// l'invitation réellement envoyée vit dans api/invite-parent.js, avec son
// propre HTML. Deux textes pour un même envoi, c'est deux textes qui divergent.
// On ne le compte pas comme un défaut — on refuse seulement qu'il passe
// inaperçu.
{
  const appeles = new Set([...vus].map((v) => v.split("|")[1]));
  const jamais = Object.keys(T).filter((n) => !appeles.has(n));
  if (jamais.length) {
    console.log(`  --  gabarit(s) défini(s) mais jamais appelé(s) depuis ce dépôt : ${jamais.join(", ")}`);
    console.log("      (l'invitation réellement envoyée est écrite dans api/invite-parent.js)");
  }
}

dire(appels >= 9, `les ${appels} appels sont passés en revue`, "trop peu d'appels trouvés : la lecture du code a échoué, ce contrôle ne vérifie rien");

// 3. Et le filet : rendu à vide, chaque gabarit montre bien un trou. C'est ce
// qui prouve que la vérification ci-dessus porte sur quelque chose de réel.
let gabaritsCreux = 0;
for (const [nom, t] of Object.entries(T)) {
  const txt = t.html({}).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  if (/Bonjour\s*,|\bundefined\b|\bNaN\b/.test(txt)) gabaritsCreux++;
}
dire(gabaritsCreux > 0, `rendus sans variables, ${gabaritsCreux} gabarit(s) sur ${Object.keys(T).length} montrent un trou visible`,
  "aucun gabarit ne se dégrade : ce contrôle ne protège de rien, il faut le relire");

console.log(ko.length ? `\n${ko.length} problème(s) :\n` + ko.map((x) => "  - " + x).join("\n") + "\n"
  : "\nAucun courriel ne partirait avec un « Bonjour , ».\n");
process.exit(ko.length ? 1 : 0);
