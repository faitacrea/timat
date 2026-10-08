// LE MÊME MOT ÉCRIT DE DEUX FAÇONS.
//
// Quatre fois cette semaine, le même défaut : un mot français privé de ses
// accents dans un texte que l'utilisatrice lit.
//
//   « Votre assistante maternelle a signe le contrat »   (objet d'un courriel)
//   « Indemnite de repas »   (juste sous « Indemnité d'entretien », sur le
//                             bulletin de salaire)
//   « PDF du contrat regenere ✓ »   (message après enregistrement)
//   « Modeles & Templates »   (onglet du back-office)
//
// Chercher les mots sans accent dans l'absolu ne marche pas : « signe » peut
// être un nom, « cote » aussi, et une liste de mots interdits produit surtout
// des fausses alertes — j'en ai fait l'expérience deux fois.
//
// LA RÈGLE QUI MARCHE est différente : quand le MÊME mot apparaît dans le code
// sous deux orthographes — « Indemnité » quelque part et « Indemnite » ailleurs
// — l'une des deux est fautive. Pas besoin de dictionnaire : le projet se
// contredit lui-même, et c'est cette contradiction qu'on relève.
//
// On ne regarde que ce qui s'affiche : les chaînes de caractères contenant un
// espace et des lettres, pas les noms de variables, de tables ni de colonnes.
//
// Dans la chaîne de build : pas de navigateur, pas de réseau.
//   node scripts/verif-accents.mjs
import { readFileSync, readdirSync } from "node:fs";

const RACINE = new URL("../", import.meta.url);

// Les fichiers où vit du texte lu par quelqu'un.
const fichiers = [];
for (const [dossier, motif] of [["src/", /\.jsx?$/], ["api/", /\.js$/], ["lib/", /\.js$/], ["public/", /\.html$/], ["data/", /\.js$/]]) {
  let noms = [];
  try { noms = readdirSync(new URL(dossier, RACINE)); } catch (e) { continue; }
  for (const n of noms) if (motif.test(n)) fichiers.push([dossier + n, readFileSync(new URL(dossier + n, RACINE), "utf8")]);
}

const sansAccent = (m) => m.normalize("NFD").replace(/[̀-ͯ]/g, "");
// Un mot assez long pour que la coïncidence soit improbable, et qui contient
// une voyelle susceptible de porter un accent.
const INTERESSANT = (m) => m.length >= 5 && /[eauioc]/i.test(m);

// EN FRANÇAIS, « demande » ET « demandé » SONT DEUX MOTS.
//
// Première version de ce contrôle : elle signalait toute paire accentuée /
// non accentuée, et accusait donc « compte » face à « compté », « passe » face
// à « passé », « garde » face à « gardé » — une vingtaine de fausses alertes,
// toutes des couples parfaitement légitimes (le nom ou l'infinitif d'un côté,
// le participe de l'autre).
//
// Ce qui les distingue : dans ces couples, l'accent tombe sur la DERNIÈRE
// lettre. « demandé » reste « demande » sans son accent, et « demande » est un
// mot. Alors que « année », « écran », « prénom », « régénéré » portent un
// accent AILLEURS qu'à la fin : privés de cet accent, ils ne sont plus rien.
// C'est cette forme-là qu'on retient.
const accentNonFinal = (mot) => {
  const nu = sansAccent(mot);
  for (let i = 0; i < mot.length - 1; i++) if (mot[i] !== nu[i]) return true;
  return false;
};

// Les quelques mots dont l'accent est final mais dont la forme nue n'existe
// pas : la règle ci-dessus ne peut pas les voir, et ils reviennent souvent ici.
const NUS_IMPOSSIBLES = new Set(["indemnite", "indemnites", "agree", "agreee", "agrees", "cle", "cles", "conges", "apercu", "apercus"]);

// Les mots qui s'écrivent légitimement des deux façons.
const TOLERES = new Set([
  "a", "la", "ou", "ca", "des", "les", "sur", "cote", "cotes",
  "mode", "modes", "pres", "tache", "taches", "marche", "cree",
  "pate", "jeune", "jeunes", "notre", "votre", "foret",
  // Ceux-ci existent bel et bien sans accent : « les chiffres », « les dates ».
  // Leur jumeau accentue est un participe (« chiffres » / « chiffrés »).
  "chiffres", "dates", "ecrit", "entres", "listes", "etats", "notes", "cotes",
]);

// --- 1. Relever les mots, avec l'endroit où on les a vus --------------------
const vus = new Map(); // forme sans accent -> Map(orthographe -> Set(fichiers))
const noter = (mot, fichier, phrase) => {
  const nu = sansAccent(mot).toLowerCase();
  if (!INTERESSANT(mot) || TOLERES.has(nu)) return;
  if (!vus.has(nu)) vus.set(nu, new Map());
  const formes = vus.get(nu);
  const forme = mot.toLowerCase();
  if (!formes.has(forme)) formes.set(forme, new Map());
  // On garde LA PHRASE, pas seulement le fichier : sans elle, impossible de
  // distinguer un texte affiché d'un nom de colonne. « prenom », « debut »,
  // « annee », « periode » sont des colonnes de la base, et elles s'écrivent
  // sans accent à juste titre.
  const parPhrase = formes.get(forme);
  if (!parPhrase.has(phrase)) parPhrase.set(phrase, fichier);
};

// LES COMMENTAIRES DE CE PROJET S'ÉCRIVENT SANS ACCENTS, EXPRÈS.
//
// Et ils sont longs. Sans les retirer, ce contrôle relevait « etait », « ecrit »,
// « donnees », « verifie »… qui ne sont pas des textes affichés mais des
// explications destinées à qui relit le code. On ne garde que ce qu'une
// utilisatrice peut lire à l'écran.
const sansCommentaires = (t, html) => (html
  ? t.replace(/<!--[\s\S]*?-->/g, " ")
  : t.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " "));

for (const [nom, brut] of fichiers) {
  const contenu = sansCommentaires(brut, nom.endsWith(".html"));
  // Les textes affichés : chaînes entre guillemets contenant un espace et des
  // lettres, et le texte libre entre balises JSX ou HTML.
  const textes = [];
  for (const m of contenu.matchAll(/"([^"\\\n]{8,200})"|'([^'\\\n]{8,200})'|`([^`\\]{8,400})`/g)) {
    const t = m[1] ?? m[2] ?? m[3];
    if (/\s/.test(t) && /[a-zàâäéèêëîïôöùûüç]{4,}/i.test(t)) textes.push(t);
  }
  for (const m of contenu.matchAll(/>([^<>{}\n]{8,300})</g)) textes.push(m[1]);

  for (const t of textes) {
    // ON ÉCARTE CE QUI N'EST PAS DE LA PROSE.
    //
    // Ni code, ni styles, ni URL, ni chemins — et ni morceaux de code recollés :
    // « Heures travaillees '+annee+' » est un texte affiché, mais « annee » y est
    // un nom de variable. On coupe donc la chaîne aux endroits où le code
    // reprend la main, et on ne lit que les morceaux de français.
    if (/[{}<>$;]|https?:|\/\/|#[0-9a-f]{3,6}\b|px\b|rgba?\(/i.test(t)) continue;
    const prose = t.split(/['"`]?\s*\+\s*[^+]*?\s*\+\s*['"`]?|['"`]\s*\+|\+\s*['"`]/).join(" | ");
    // Un nom de propriété (« prenom: ») n'est pas un texte affiché.
    if (/^\s*,?\s*[a-z_]+\s*:\s*$/.test(t)) continue;
    for (const morceau of prose.split(" | ")) {
      if (!/[a-zàâäéèêëîïôöùûüç]{4,}\s+[a-zàâäéèêëîïôöùûüç]{3,}/i.test(morceau)) continue;
      for (const mot of morceau.match(/[A-Za-zÀ-ÿ]{5,}/g) || []) noter(mot, nom, morceau.replace(/\s+/g, " ").trim().slice(0, 110));
    }
  }
}

// --- 2. Ne garder que les mots écrits de deux façons ------------------------
const ko = [];
for (const [nu, formes] of vus) {
  if (formes.size < 2) continue;
  const avec = [...formes.keys()].filter((f) => f !== sansAccent(f));
  const sans = [...formes.keys()].filter((f) => f === sansAccent(f));
  if (!avec.length || !sans.length) continue;
  // On ne retient que les mots dont la forme nue n'existe pas en français.
  if (!avec.some(accentNonFinal) && !NUS_IMPOSSIBLES.has(nu)) continue;
  const phrases = sans.flatMap((f) => [...formes.get(f)].map(([ph, fi]) => ({ ph, fi })));
  ko.push({ mot: nu, juste: avec[0], faute: sans[0], ou: phrases });
}
ko.sort((a, b) => b.ou.length - a.ou.length || a.mot.localeCompare(b.mot));

console.log(`\n=== ACCENTS — ${vus.size} mots relevés dans les textes affichés ===\n`);
if (!ko.length) { console.log("  ok  aucun mot n'est écrit de deux façons\n"); process.exit(0); }
for (const k of ko) {
  console.log(`  KO  « ${k.faute} » écrit sans accent, alors que « ${k.juste} » existe ailleurs`);
  const n = process.env.TOUT ? k.ou.length : 3;
  for (const { ph, fi } of k.ou.slice(0, n)) console.log(`        ${fi} : « ${ph} »`);
  if (k.ou.length > n) console.log(`        … et ${k.ou.length - n} autre(s)`);
}
console.log(`\n${ko.length} mot(s) écrit(s) de deux façons.\n`);
process.exit(1);
