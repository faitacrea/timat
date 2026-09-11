// Vérifie que les documents ouverts dans une nouvelle fenêtre échappent bien
// ce que les familles ont tapé.
//
// Pourquoi : l'attestation, la fiche d'urgence, le récap Pajemploi et les
// e-mails sont assemblés à la main, chaîne par chaîne. Ils y injectaient telles
// quelles des valeurs saisies — un prénom, une adresse, le nom d'un médecin.
// Deux conséquences : une apostrophe ou un « < » dans un nom cassait la mise en
// page du document, et un texte saisi par un parent pouvait faire exécuter du
// code dans la fenêtre que l'assistante maternelle ouvre pour imprimer.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
let ko = 0;

// --- 1. Le filtre, extrait du source plutôt que recopié ---
const extrait = src.match(/const H = \(v\) =>[\s\S]*?;\n/);
if (!extrait) {
  console.error("\n  KO  la fonction H() est introuvable dans src/App.jsx\n");
  process.exit(1);
}
const H = eval("(" + extrait[0].replace(/^const H = /, "").replace(/;\s*$/, "") + ")");

console.log("\n=== ÉCHAPPEMENT DES DOCUMENTS HTML ===\n");
const cas = [
  { e: "Léa", a: "Léa", n: "prénom ordinaire, inchangé" },
  { e: "L'Haÿ-les-Roses", a: "L&#39;Haÿ-les-Roses", n: "apostrophe dans une adresse" },
  { e: "Marie & Paul", a: "Marie &amp; Paul", n: "esperluette" },
  { e: '<script>alert(1)</script>', a: "&lt;script&gt;alert(1)&lt;/script&gt;", n: "script injecté par un parent" },
  { e: '" onerror="alert(1)', a: "&quot; onerror=&quot;alert(1)", n: "évasion d'attribut" },
  { e: "Dr <O'Neil>", a: "Dr &lt;O&#39;Neil&gt;", n: "nom de médecin avec chevrons" },
  { e: null, a: "", n: "valeur absente" },
  { e: undefined, a: "", n: "valeur non renseignée" },
  { e: 12.5, a: "12.5", n: "nombre" },
];
for (const c of cas) {
  const r = H(c.e);
  const ok = r === c.a;
  if (!ok) ko++;
  console.log(`  ${ok ? "ok " : "KO "} ${c.n.padEnd(42)} ${JSON.stringify(r)}`);
}

// --- 2. Aucune valeur saisie ne doit repartir sans échappement ---
// On relit le source comme le ferait une relecture : toute interpolation d'un
// champ saisi dans une chaîne HTML doit passer par H().
// Les noms de champ se cherchaient en MOT ENTIER. Le controle ne voyait donc
// ni « f.asmatTel » (le nom est colle en camelCase), ni « f.allergies » (le
// pluriel casse la limite de mot), ni « v.parent_prenom ». Trente-six valeurs
// saisies partaient ainsi sans echappement — dans la fiche d'urgence, dans les
// courriels et sur le bulletin imprimable — pendant que ce test passait au
// vert. On cherche desormais les noms comme sous-chaines.
// Deux listes, parce que deux risques opposes. Les noms longs se cherchent en
// sous-chaine : c'est ce qui permet de voir « asmatTel » ou « allergies ».
// Les noms courts et ambigus, eux, doivent etre delimites — sans quoi « pai »
// (le projet d'accueil individualise) attrapait « paiements », et le controle
// signalait un texte fige qui ne vient d'aucune saisie.
const CHAMPS = /(prenom|nom|adresse|mail|texte|titre|motif|message|commentaire|remarque|libelle|ville|agrement|medecin|allergie|traitement|particularite|vaccin|employeur|url)/i;
const CHAMPS_COURTS = new RegExp([
  // en minuscules, delimite : f.tel, ["note"], .pai
  "(^|[._\\[\\]\"'])(tel|txt|note|desc|detail|objet|groupe|lien|pai)([._\\[\\]\"']|$|[A-Z])",
  // colle en camelCase : asmatTel, medecinTel, monGroupe — c'est la forme qui
  // echappait au controle d'origine, il faut la nommer explicitement.
  "[a-z](Tel|Txt|Note|Desc|Detail|Objet|Groupe|Lien|Pai)",
].join("|"));
// « g( » est l'helper de l'attestation France Travail : il echappe desormais
// lui-meme, une fois, pour tous les champs du document.
const TECHNIQUE = /toFixed|nbf\(|fmtEur|Math\.|length|getFullYear|\.slice\(|new Date|JSON\.|\.map\(|\.join\(|ageEnfant\(|^H\(|^g\(/;
// Convention : un nom terminé par « H » porte une valeur DÉJÀ échappée, à sa
// construction. Le contrôle ne sait pas suivre une variable d'une ligne à
// l'autre ; ce suffixe le lui dit. Il ne dispense de rien d'autre.
const DEJA_ECHAPPE = /[a-z0-9]H$/;
const oublis = [];

// Le controle ne lisait que les chaines a GUILLEMETS DOUBLES. Le
// recapitulatif Pajemploi, l'export RGPD, le rapport annuel et l'attestation
// destinee a France Travail sont ecrits en guillemets simples : dix-sept
// valeurs saisies leur echappaient entierement, dont le nom, l'adresse et le
// courriel du parent employeur sur un document juridique.
for (const m of [...src.matchAll(/"\s*\+\s*([^+"]{1,70}?)\s*\+\s*"/g),
                 ...src.matchAll(/'\s*\+\s*([^+']{1,70}?)\s*\+\s*'/g)]) {
  const avant = src.slice(Math.max(0, m.index - 600), m.index);
  if (!/<(tr|td|div|p|h[1-6]|span|li|title|option|b)[ >]/.test(avant)) continue;
  const e = m[1].trim();
  if ((!CHAMPS.test(e) && !CHAMPS_COURTS.test(e)) || TECHNIQUE.test(e) || DEJA_ECHAPPE.test(e)) continue;
  oublis.push(`ligne ${src.slice(0, m.index).split("\n").length} : ${e}`);
}
for (const m of src.matchAll(/\$\{([^}]{1,60})\}/g)) {
  const avant = src.slice(Math.max(0, m.index - 500), m.index);
  if (!/document\.write|<div|<td|<p>|<h[1-6]|<title/.test(avant)) continue;
  const e = m[1].trim();
  if ((!CHAMPS.test(e) && !CHAMPS_COURTS.test(e)) || TECHNIQUE.test(e) || DEJA_ECHAPPE.test(e)) continue;
  oublis.push(`ligne ${src.slice(0, m.index).split("\n").length} : \${${e}}`);
}

console.log("");
if (oublis.length) {
  ko += oublis.length;
  console.log(`  KO  ${oublis.length} valeur(s) saisie(s) injectée(s) dans un document sans H() :`);
  for (const o of oublis) console.log("        " + o);
} else {
  console.log("  ok  toute valeur saisie injectée dans un document passe par H()");
}

console.log(ko ? `\n${ko} problème(s)\n` : "\nTout est conforme.\n");
process.exit(ko ? 1 : 0);
