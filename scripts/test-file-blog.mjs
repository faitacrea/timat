// La file de publication du blog s'épuise en silence.
//
// Le cron quotidien répond « Rien à publier aujourd'hui » avec un code 200
// quand il ne reste plus de brouillon. Personne ne lit cette réponse. Le blog
// s'arrêterait donc un matin sans que rien ne le signale, et l'on découvrirait
// un mois plus tard que la publication quotidienne est morte depuis trente
// jours — la même classe de défaut que le bandeau promettant une sauvegarde
// inexistante : quelque chose qui s'éteint sans bruit.
//
// Ce test garde :
//   1. l'alerte part AVANT la panne, pas après ;
//   2. elle ne part pas tous les jours quand la réserve est confortable ;
//   3. elle n'est jamais fatale — une alerte qui échoue ne doit pas faire
//      croire au cron que la publication du jour a raté ;
//   4. le message dit quoi faire, pas seulement que ça va mal.

import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../api/publier-article.js", import.meta.url), "utf8");

// Le fragment evalue plus bas utilise EMAIL_CONTACT, qui vient d'un import.
// On ne le recopie pas : on lit la vraie valeur du point unique, pour que ce
// test tombe aussi le jour ou l'alerte partirait a une adresse inventee.
const { EMAIL_CONTACT } = await import(new URL("../data/coordonnees.js", import.meta.url).href);

let ko = 0;
const verifie = (nom, reel, attendu) => {
  const ok = JSON.stringify(reel) === JSON.stringify(attendu);
  if (!ok) { ko++; console.log(`  KO  ${nom}\n      attendu ${JSON.stringify(attendu)}\n      obtenu  ${JSON.stringify(reel)}`); }
  else console.log(`  ok  ${nom}`);
};

const debut = src.indexOf("const PREVENIR_SOUS");
const fin = src.indexOf("async function redeployer");
if (debut < 0 || fin < 0) {
  console.error("\n  KO  l'alerte de file basse est introuvable dans api/publier-article.js\n");
  process.exit(1);
}

let envois = [];
const faireModule = (reponse) => {
  envois = [];
  const fetchFaux = async (url, opts) => {
    envois.push({ url, corps: JSON.parse(opts.body) });
    if (reponse === "panne") throw new TypeError("Failed to fetch");
    if (reponse === "429") return { ok: false, status: 429 };
    return { ok: true, status: 200 };
  };
  const portee = { fetch: fetchFaux, process: { env: { RESEND_API_KEY: reponse === "sans-cle" ? "" : "cle" } }, console: { warn() {}, error() {} }, EMAIL_CONTACT };
  const noms = Object.keys(portee);
  const usine = new Function(...noms, src.slice(debut, fin) + "\nreturn {prevenirFileBasse,PREVENIR_SOUS};");
  return usine(...noms.map((n) => portee[n]));
};

console.log("\nL'ALERTE PART AVANT LA PANNE");
{
  const M = faireModule("ok");
  verifie("le seuil laisse le temps de réagir (au moins 3 jours)", M.PREVENIR_SOUS >= 3, true);
  for (const n of [0, 1, 3, M.PREVENIR_SOUS]) {
    const r = await M.prevenirFileBasse(n);
    verifie(`${n} article(s) restant(s) : on prévient`, r.envoye, true);
  }
}

console.log("\nPAS D'ALERTE QUAND LA RÉSERVE EST CONFORTABLE");
{
  const M = faireModule("ok");
  for (const n of [M.PREVENIR_SOUS + 1, 10, 30]) {
    const r = await M.prevenirFileBasse(n);
    verifie(`${n} articles restants : on se tait`, r.envoye, false);
    verifie(`${n} articles restants : aucun e-mail`, envois.length, 0);
  }
}

console.log("\nUNE ALERTE QUI ÉCHOUE N'EST JAMAIS FATALE");
for (const [nom, rep] of [["réseau coupé", "panne"], ["Resend refuse", "429"], ["clé absente", "sans-cle"]]) {
  const M = faireModule(rep);
  const r = await M.prevenirFileBasse(0);
  verifie(nom + " : pas d'exception, un refus explicite", r.envoye, false);
  verifie(nom + " : la raison est dite", typeof r.raison === "string" && r.raison.length > 0, true);
}

console.log("\nLE MESSAGE DIT QUOI FAIRE");
{
  const M = faireModule("ok");
  await M.prevenirFileBasse(0);
  const m = envois.at(-1).corps;
  verifie("file vide : le sujet le dit", /plus rien a publier/i.test(m.subject), true);
  verifie("le message indique où écrire les articles", /Sanity/.test(m.text), true);
  verifie("et où déclarer leur ordre", /ordre-publication\.js/.test(m.text), true);
  verifie("l'alerte part à l'adresse de contact du produit", m.to, [EMAIL_CONTACT]);

  await M.prevenirFileBasse(3);
  const m3 = envois.at(-1).corps;
  verifie("réserve basse : le nombre est dans le sujet", /plus que 3 articles/.test(m3.subject), true);
  verifie("et le délai avant l'arrêt est donné", /3 jour/.test(m3.text), true);

  await M.prevenirFileBasse(1);
  verifie("un seul article restant : pas de « s » parasite", /plus que 1 article /.test(envois.at(-1).corps.subject), true);
}

console.log("\nL'ALERTE EST BRANCHÉE AUX DEUX SORTIES DU CRON");
{
  verifie("les deux retours appellent l'alerte",
    (src.match(/await prevenirFileBasse\(/g) || []).length, 2);
  // Publier d'abord, prévenir ensuite : l'inverse ferait rejouer demain sur
  // l'article suivant en laissant celui du jour invisible.
  const iPublie = src.indexOf("publié : ${cible.slug}");
  const iAlerte = src.indexOf("await prevenirFileBasse", iPublie);
  verifie("l'alerte vient APRÈS la publication du jour", iAlerte > iPublie, true);
}

console.log("");
if (ko) { console.log(`${ko} problème(s)\n`); process.exit(1); }
console.log("Aucune anomalie\n");
