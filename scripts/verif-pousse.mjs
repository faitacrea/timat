// LE TRAVAIL EST-IL REELLEMENT PARTI ?
//
// Un jour, « git push -u origin <branche> » lance depuis une AUTRE branche a
// pousse la branche locale du meme nom — restee en arriere — au lieu du travail
// qui venait d'etre commite. Le push a reussi, la pull request etait vide, la
// fusion n'a rien change, et le rapport annoncait une correction livree qui ne
// l'etait pas. Un echec silencieux : rien dans la sortie de git ne le disait.
//
// Ce controle compare le commit local au commit que porte reellement la branche
// distante. A lancer avant d'annoncer qu'une correction est partie.
//   node scripts/verif-pousse.mjs [branche]
import { execSync } from "node:child_process";
const git = (c) => execSync(`git ${c}`, { encoding: "utf8" }).trim();
const branche = process.argv[2] || git("rev-parse --abbrev-ref HEAD");
const local = git("rev-parse HEAD");
const distant = (git(`ls-remote origin refs/heads/${branche}`).split(/\s+/)[0]) || "";
const sale = git("status --porcelain");

let ko = 0;
const dit = (bon, m) => { if (!bon) ko++; console.log(`  ${bon ? "ok " : "KO "} ${m}`); };
dit(!sale, sale ? `des fichiers modifiés ne sont pas commités :\n      ${sale.split("\n").slice(0,5).join("\n      ")}` : "tout est commité");
dit(!!distant, distant ? `la branche « ${branche} » existe sur GitHub` : `la branche « ${branche} » n'existe pas sur GitHub : rien n'a été poussé`);
if (distant)
  dit(distant === local,
    distant === local
      ? `GitHub porte bien le commit local (${local.slice(0, 7)})`
      : `GitHub porte ${distant.slice(0, 7)} alors que le travail local est ${local.slice(0, 7)} : le push n'a pas envoyé ce commit`);
console.log(ko ? `\n${ko} problème(s) — ne pas annoncer la correction comme livrée.\n` : "\nLe travail commité est bien celui que porte GitHub.\n");
process.exit(ko ? 1 : 0);
