// Le rappel d'anniversaire, et les quatre dates qui le cassent.
//
// Un calcul de date qui marche en mars se trompe le 31 decembre, le 29 fevrier,
// ou a l'heure d'ete. Ici l'erreur est benigne — un rappel rate — mais le meme
// code recopie ailleurs ne l'est pas, et c'est ainsi que ces bugs voyagent.
//
//   TZ=Europe/Paris node scripts/test-anniversaires.mjs
import { readFileSync } from "node:fs";
import esbuild from "esbuild";

const src = readFileSync("src/App.jsx", "utf8");
const bloc = src.slice(src.indexOf("  const anniversairesProches=(()=>{"), src.indexOf("  const [sansUrgence,setSansUrgence]"));
// On remplace la premiere ligne (qui declare et calcule « aujourdhui ») par
// une signature qui le recoit : c'est le seul moyen de rejouer le calcul a une
// date choisie sans toucher au code de l'ecran.
const corps = bloc
  .replace("const anniversairesProches=(()=>{", "const calculer=(enfants,aujourdhui)=>{")
  .replace("const aujourdhui=new Date(); aujourdhui.setHours(0,0,0,0);", "")
  .replace(/\}\)\(\);\s*$/, "};");

const js = (await esbuild.transform(corps + "\nexport { calculer };", { loader: "js" })).code;
const { calculer } = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

let ko = 0;
const ok = (quoi, obtenu, attendu) => {
  const bon = JSON.stringify(obtenu) === JSON.stringify(attendu);
  if (!bon) ko++;
  console.log(`  ${bon ? "ok " : "KO "} ${quoi} → ${JSON.stringify(obtenu)}${bon ? "" : " (attendu " + JSON.stringify(attendu) + ")"}`);
};
const le = (iso) => { const d = new Date(iso + "T00:00:00"); d.setHours(0,0,0,0); return d; };
const jours = (enfants, iso) => calculer(enfants, le(iso)).map(e => e.prenom + ":" + e.jours);

console.log("\n=== LE CAS ORDINAIRE ===");
const leo = { id: "1", prenom: "Léo", naissance: "2023-06-20" };
ok("le jour meme",        jours([leo], "2026-06-20"), ["Léo:0"]);
ok("la veille",           jours([leo], "2026-06-19"), ["Léo:1"]);
ok("sept jours avant",    jours([leo], "2026-06-13"), ["Léo:7"]);
ok("huit jours : trop tot", jours([leo], "2026-06-12"), []);
ok("le lendemain : passe", jours([leo], "2026-06-21"), []);

console.log("\n=== L'AGE ANNONCE ===");
ok("3 ans le jour meme", calculer([leo], le("2026-06-20"))[0].age, 3);
ok("3 ans la veille",    calculer([leo], le("2026-06-19"))[0].age, 3);

console.log("\n=== LE PASSAGE D'ANNEE ===");
const nina = { id: "2", prenom: "Nina", naissance: "2024-01-03" };
ok("le 30 decembre, l'anniversaire du 3 janvier est dans 4 jours", jours([nina], "2026-12-30"), ["Nina:4"]);
ok("et son age tient compte de l'annee suivante", calculer([nina], le("2026-12-30"))[0].age, 3);

console.log("\n=== LE 29 FEVRIER ===");
const zoe = { id: "3", prenom: "Zoé", naissance: "2024-02-29" };
// 2026 n'est pas bissextile : le 29 fevrier n'existe pas, JS bascule au 1er mars.
ok("rappele autour du 1er mars", jours([zoe], "2026-02-28").length, 1);

console.log("\n=== CE QUI NE DOIT PAS PLANTER ===");
ok("aucune date de naissance", jours([{ id: "4", prenom: "Sans" }], "2026-06-20"), []);
ok("date illisible", jours([{ id: "5", prenom: "Faux", naissance: "pas-une-date" }], "2026-06-20"), []);
ok("liste vide", jours([], "2026-06-20"), []);
ok("liste absente", calculer(null, le("2026-06-20")), []);

console.log("\n=== L'ORDRE ===");
const deux = [{ id: "6", prenom: "Loin", naissance: "2022-06-25" }, { id: "7", prenom: "Proche", naissance: "2022-06-21" }];
ok("le plus proche d'abord", jours(deux, "2026-06-20"), ["Proche:1", "Loin:5"]);

console.log(ko ? `\n${ko} échec(s).` : "\nTout est conforme.");
process.exit(ko ? 1 : 0);
