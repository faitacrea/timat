// LES COURRIELS QUE L'APPLICATION ENVOIE, PERSONNE NE LES LISAIT.
//
// Huit modèles partent vers de vraies boîtes aux lettres : le parent qu'on
// invite, le contrat signé, le pointage à valider, le compte qui dort depuis
// deux ans. Ils sortent du serveur et personne, jamais, n'en avait relu un seul
// rendu. Un « Bonjour undefined, », un bouton qui ne mène nulle part, une
// apostrophe qui casse la page : rien ne l'aurait vu, et surtout pas la
// destinataire, qui n'écrira pas pour le signaler.
//
// Ce contrôle les rend tous les huit, trois fois : avec de vraies valeurs, sans
// aucune valeur, et avec des valeurs hostiles (du HTML dans un prénom). Il
// n'envoie rien.
//
// Il tourne dans la chaîne de build : pas de navigateur, pas de réseau.
//   node scripts/verif-courriels.mjs
import { EMAIL_TEMPLATES } from "../api/send-email.js";
import { readFileSync, readdirSync } from "node:fs";

const ko = [];

// --- Les trois jeux de valeurs -----------------------------------------------
const VRAIES = {
  parent_prenom: "Sophie", parent_nom: "Martin", asmat_prenom: "Marie", asmat_nom: "Dupont",
  enfant_prenom: "Léo", prenom: "Marie", nom: "Dupont",
  url: "https://www.timat.app/?connexion=1", lien: "https://www.timat.app",
  date: "3 octobre 2026", mois: "septembre 2026", montant: "742,56 €",
  jour: "lundi 2 octobre", heures: "9 h 05", fin_essai: "3 décembre 2026",
};
// Une valeur hostile par champ : si l'échappement cède, le HTML le montre.
const HOSTILES = Object.fromEntries(Object.keys(VRAIES).map((k) => [k, `<script>alert(1)</script>"'&`]));

// Ce qu'on refuse de voir dans un courriel qui part.
const SALE = /\bundefined\b|\bnull\b|\bNaN\b|\[object Object\]|\{\{|\}\}/;

const rendre = (modele, vars) => {
  try { return { html: modele.html(vars) }; }
  catch (e) { return { erreur: e.message }; }
};

for (const [nom, modele] of Object.entries(EMAIL_TEMPLATES)) {
  // 1. Un objet et un sujet.
  if (typeof modele?.html !== "function") { ko.push(`${nom} : pas de corps`); continue; }
  if (!String(modele.subject || "").trim()) ko.push(`${nom} : pas d'objet — le courriel part avec une ligne d'objet vide`);

  // 2. Avec de vraies valeurs.
  const vrai = rendre(modele, VRAIES);
  if (vrai.erreur) { ko.push(`${nom} : le modèle lève avec des valeurs normales — ${vrai.erreur}`); continue; }
  const taché = vrai.html.match(SALE);
  if (taché) ko.push(`${nom} : « ${taché[0]} » s'affiche dans le courriel envoyé`);

  // 3. Les liens. Un bouton d'un courriel ne peut pas être relatif : il n'y a
  //    pas de page autour pour le résoudre.
  for (const m of vrai.html.matchAll(/href=["']([^"']*)["']/g)) {
    const u = m[1];
    if (!u.trim()) { ko.push(`${nom} : un lien vide — le bouton ne mène nulle part`); continue; }
    if (/^mailto:/i.test(u)) continue;
    if (!/^https:\/\//i.test(u)) ko.push(`${nom} : lien non absolu « ${u.slice(0, 50)} » — illisible depuis une boîte aux lettres`);
    else if (/localhost|127\.0\.0\.1|\.vercel\.app/i.test(u)) ko.push(`${nom} : lien vers « ${u.slice(0, 60)} » — ce n'est pas l'adresse du site`);
  }

  // 4. SANS AUCUNE VALEUR. C'est le cas d'un appel mal formé, et c'est là que
  //    « Bonjour undefined, » naît. Le modèle doit tenir, et surtout ne pas
  //    produire un bouton vide.
  const vide = rendre(modele, {});
  if (vide.erreur) ko.push(`${nom} : le modèle lève quand une valeur manque — ${vide.erreur}`);
  else {
    const t = vide.html.match(SALE);
    if (t) ko.push(`${nom} : « ${t[0]} » apparaît quand une valeur manque`);
    for (const m of vide.html.matchAll(/href=["']([^"']*)["']/g)) {
      if (!m[1].trim()) { ko.push(`${nom} : sans valeur, le bouton pointe vers le vide — mieux vaut l'adresse du site`); break; }
    }
  }

  // 5. AVEC DES VALEURS HOSTILES. Un prénom peut contenir une apostrophe, et
  //    rien n'empêche quelqu'un d'en mettre davantage.
  const hostile = rendre(modele, HOSTILES);
  if (hostile.erreur) ko.push(`${nom} : le modèle lève sur une valeur inattendue — ${hostile.erreur}`);
  else if (/<script/i.test(hostile.html)) ko.push(`${nom} : une balise <script> passée dans un prénom ressort telle quelle`);
}

// --- 6. Tout modèle demandé ailleurs doit exister -----------------------------
//
// Un type inconnu, et le courriel ne part tout simplement pas : la parente
// n'est jamais invitée, et rien ne le dit à personne.
const sources = [];
for (const dossier of ["src", "api", "lib"]) {
  for (const f of readdirSync(new URL("../" + dossier + "/", import.meta.url))) {
    if (/\.(jsx?|mjs)$/.test(f)) sources.push([dossier + "/" + f, readFileSync(new URL(`../${dossier}/${f}`, import.meta.url), "utf8")]);
  }
}
// LE SÉLECTEUR EST « type », PAS « template ».
//
// send-email.js choisit le modèle par EMAIL_TEMPLATES[type]. La première
// version de ce contrôle cherchait « template: », et annonçait donc que cinq
// modèles n'étaient demandés par personne — dont les deux rappels de fin
// d'essai. C'était faux, et c'eût été une belle frayeur.
// Et il n'est pas toujours écrit juste après « type: » : les deux rappels de
// fin d'essai sont choisis par un ternaire. On cherche donc le NOM du modèle
// partout dans le code, entre guillemets — c'est la seule façon de ne pas
// dépendre de la forme de l'appel.
const demandes = new Map();
for (const [fichier, contenu] of sources) {
  if (/scripts|verif-courriels/.test(fichier)) continue;
  for (const nom of Object.keys(EMAIL_TEMPLATES)) {
    if (demandes.has(nom)) continue;
    if (new RegExp(`["'\`]${nom}["'\`]`).test(contenu)) demandes.set(nom, fichier);
  }
  // UN « type: » N'EST PAS TOUJOURS UN COURRIEL.
  //
  // Première version : elle prenait tout « type: "..." », donc aussi
  // type:"date", type:"jpeg", type:"ferie", type:"anniv" — onze accusations,
  // toutes fausses. Un envoi de courriel se reconnaît à son DESTINATAIRE :
  // on n'accepte un type que s'il y a un « to: » dans le même objet.
  for (const m of contenu.matchAll(/\btype:\s*["'\`]([a-z_]{4,})["'\`]/g)) {
    const autour = contenu.slice(Math.max(0, m.index - 220), m.index + 320);
    if (!/\bto:\s/.test(autour)) continue;
    if (!demandes.has(m[1])) demandes.set(m[1], fichier);
  }
}
for (const [nom, fichier] of demandes)
  if (!EMAIL_TEMPLATES[nom]) ko.push(`${fichier} demande le modèle « ${nom} », qui n'existe pas — le courriel ne part pas du tout`);

// --- 7. Un seul endroit pour les sujets ---------------------------------------
//
// Il a existé un SECOND jeu de gabarits dans src/App.jsx, qui ne servait qu'à
// fournir la ligne d'objet — le corps venait du serveur, l'objet de la copie.
// Les deux ont divergé, et c'est l'objet qui gagnait : trois courriels partaient
// sans leurs accents, « a signe le contrat », « enregistre sur TiMat ».
//
// On refuse donc qu'un appel impose un sujet écrit ailleurs, et on refuse un
// second jeu de gabarits où que ce soit.
for (const [fichier, contenu] of sources) {
  if (/send-email/.test(fichier)) continue;
  if (/\bEMAIL_TEMPLATES\s*=/.test(contenu))
    ko.push(`${fichier} déclare un second jeu de gabarits — les sujets divergeront de ceux du serveur`);
  if (/subject:\s*EMAIL_TEMPLATES\./.test(contenu))
    ko.push(`${fichier} impose un sujet pris dans une copie — celui du serveur ne sortira jamais`);
}

// --- 8. Les sujets eux-mêmes ---------------------------------------------------
//
// Un sujet sans accents se voit dans la boîte de réception, et nulle part
// ailleurs. On vérifie qu'aucun mot courant n'a perdu les siens.
// CE QUI TRAHIT UN ACCENT PERDU : un auxiliaire suivi d'un participe nu.
//
// Premiere version : elle listait « signe », « enregistre »… en excluant ce qui
// suivait — et elle excluait donc « signe LE contrat », qui est precisement le
// defaut. Elle laissait passer « Votre assistante maternelle a signe le
// contrat » sans broncher. « Signe » seul peut etre un nom (« le signe ») ;
// « a signe » ne peut etre qu'un participe ampute.
const SANS_ACCENT = /\b(a|ont|est|sont|avez|avons|ete)\s+(signe|enregistre|regle|prepare|valide|cree|paye|declare|reserve|verifie|resume|rappele|arrive|envoye|recu|ajoute|modifie|supprime|termine|active|desactive)\b/i;
for (const [nom, modele] of Object.entries(EMAIL_TEMPLATES)) {
  const sujet = String(modele.subject || "");
  const m = sujet.match(SANS_ACCENT);
  if (m) ko.push(`${nom} : l'objet « ${sujet} » contient « ${m[0]} » — un participe sans accent`);
}

const jamais = Object.keys(EMAIL_TEMPLATES).filter((n) => !demandes.has(n));

console.log(`\n=== COURRIELS — ${Object.keys(EMAIL_TEMPLATES).length} modèles rendus trois fois ===\n`);
if (jamais.length) console.log(`  (${jamais.length} modèle(s) qu'aucun code ne demande : ${jamais.join(", ")})\n`);
if (ko.length) { ko.forEach((x) => console.log(`  KO  ${x}`)); console.log(`\n${ko.length} problème(s).\n`); }
else console.log("  ok  aucun courriel ne part avec un trou, un lien mort ou du HTML non échappé\n");
process.exit(ko.length ? 1 : 0);
