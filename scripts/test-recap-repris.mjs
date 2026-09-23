// Le calcul fiscal des mois repris d'un autre outil.
//
// C'est un montant qui part sur une declaration d'impots. Les trois regles
// ci-dessous ne sont pas des preferences : chacune, cassee, produit un chiffre
// faux que personne ne verra avant un controle.
//
//   1. Un mois sans net IMPOSABLE reste dehors. Le net verse ne le remplace
//      pas : ce ne sont pas les memes montants.
//   2. Un mois deja couvert par un bulletin TiMat ne compte pas deux fois.
//   3. L'abattement saisi prime sur l'abattement estime. L'estimation suppose
//      des journees completes ; trop haute, elle ferait SOUS-declarer.
//
//   node scripts/test-recap-repris.mjs
import { readFileSync } from "node:fs";
import esbuild from "esbuild";

const src = readFileSync("src/gestion.jsx", "utf8");

// On rejoue la logique telle qu'elle est ecrite dans l'ecran, extraite du
// source : une copie ici finirait par diverger de l'originale.
const bloc = src.slice(src.indexOf("  const reprisUtiles=useMemo("), src.indexOf("  const totauxRepris=useMemo("));
const corps = bloc
  .replace(/useMemo\(\(\)=>\{/g, "(()=>{")
  .replace(/\},\[[^\]]*\]\);/g, "})();");

const js = (await esbuild.transform(
  `export const calcul = (reprisAnnee, bulletins, smicHoraireAu) => {\n${corps}\n  return { reprisUtiles, reprisParEnfant };\n};`,
  { loader: "js" })).code;
const { calcul } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

const SMIC = () => 12;   // valeur fixe : on teste la regle, pas le bareme
let ko = 0;
const ok = (quoi, obtenu, attendu) => {
  const bon = JSON.stringify(obtenu) === JSON.stringify(attendu);
  if (!bon) ko++;
  console.log(`  ${bon ? "ok " : "KO "} ${quoi} → ${JSON.stringify(obtenu)}${bon ? "" : " (attendu " + JSON.stringify(attendu) + ")"}`);
};

console.log("\n=== 1. UN MOIS SANS NET IMPOSABLE RESTE DEHORS ===");
{
  const { reprisParEnfant: r } = calcul(
    [{ enfant_id: "e1", mois: "2026-01", salaire_net: 900, net_imposable: null, jours_travailles: 20 }],
    [], SMIC);
  ok("le net verse n'est pas compte comme imposable", r.e1.imposable, 0);
  ok("le mois est signale comme incomplet", r.e1.moisSansImposable, 1);
  ok("aucun abattement sur un mois hors calcul", r.e1.abattement, 0);
}

console.log("\n=== 2. UN MOIS NE COMPTE QU'UNE FOIS ===");
{
  const repris = [
    { enfant_id: "e1", mois: "2026-01", net_imposable: 1000, jours_travailles: 20 },
    { enfant_id: "e1", mois: "2026-02", net_imposable: 1000, jours_travailles: 20 },
  ];
  const bulletins = [{ enfant_id: "e1", mois: "2026-01", net_imposable: 1000 }];
  const { reprisUtiles, reprisParEnfant: r } = calcul(repris, bulletins, SMIC);
  ok("le mois deja au bulletin est ecarte", reprisUtiles.length, 1);
  ok("seul le mois restant est compte", r.e1.imposable, 1000);
  ok("un bulletin d'un AUTRE enfant n'ecarte rien",
     calcul(repris, [{ enfant_id: "e2", mois: "2026-01", net_imposable: 1000 }], SMIC).reprisUtiles.length, 2);
}

console.log("\n=== 3. L'ABATTEMENT SAISI PRIME SUR L'ESTIME ===");
{
  const estime = calcul([{ enfant_id: "e1", mois: "2026-03", net_imposable: 1000, jours_travailles: 20 }], [], SMIC).reprisParEnfant.e1;
  ok("estime a 3 x SMIC x jours", estime.abattement, 3 * 12 * 20);
  ok("et signale comme estimation", estime.abattementEstime, true);

  const saisi = calcul([{ enfant_id: "e1", mois: "2026-03", net_imposable: 1000, jours_travailles: 20, abattement: 500 }], [], SMIC).reprisParEnfant.e1;
  ok("l'abattement saisi remplace l'estimation", saisi.abattement, 500);
  ok("et n'est plus signale comme estime", saisi.abattementEstime, false);

  const zero = calcul([{ enfant_id: "e1", mois: "2026-03", net_imposable: 1000, jours_travailles: 20, abattement: 0 }], [], SMIC).reprisParEnfant.e1;
  ok("un abattement saisi a ZERO est respecte, pas estime", zero.abattement, 0);
}

console.log("\n=== 4. SANS JOURS D'ACCUEIL, PAS D'ABATTEMENT INVENTE ===");
{
  const r = calcul([{ enfant_id: "e1", mois: "2026-04", net_imposable: 1000 }], [], SMIC).reprisParEnfant.e1;
  ok("aucun abattement", r.abattement, 0);
  ok("le revenu est bien compte", r.imposable, 1000);
}

console.log(ko ? `\n${ko} échec(s).` : "\nTout est conforme.");
process.exit(ko ? 1 : 0);
