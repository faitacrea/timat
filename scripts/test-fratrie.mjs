// Reconnaitre une fratrie, et surtout ne pas en inventer une.
//
// Se tromper ici melange deux familles : les conges de l'une apparaitraient
// chez l'autre, et le recapitulatif fiscal d'un parent porterait les revenus
// d'un autre. Ne PAS voir une fratrie coute une saisie en double. Voir une
// fratrie qui n'existe pas coute la confiance.
//
// La regle est donc asymetrique, et testee comme telle : dans le doute, on
// separe.
//
//   node scripts/test-fratrie.mjs
import { readFileSync } from "node:fs";
import esbuild from "esbuild";

const src = readFileSync("src/App.jsx", "utf8");
const bloc = src.slice(src.indexOf("export const cleFamille ="), src.indexOf("\n// ---------------------------------------------------------------------------\n// L'ESSAI DE DEUX MOIS"));
const js = (await esbuild.transform(bloc.replace(/^export /gm, ""), { loader: "js" })).code;
const { cleFamille, fratrieDe, debutAnciennete } = await import(
  "data:text/javascript;base64," + Buffer.from(js + "\nexport { cleFamille, fratrieDe, debutAnciennete };").toString("base64"));

let ko = 0;
const ok = (quoi, obtenu, attendu) => {
  const bon = JSON.stringify(obtenu) === JSON.stringify(attendu);
  if (!bon) ko++;
  console.log(`  ${bon ? "ok " : "KO "} ${quoi} → ${JSON.stringify(obtenu)}${bon ? "" : " (attendu " + JSON.stringify(attendu) + ")"}`);
};
const noms = (l) => l.map((e) => e.prenom);

console.log("\n=== LE LIEN SÛR : parent_id ===");
{
  const a = { id: "1", prenom: "Léo", parent_id: "p1" };
  const b = { id: "2", prenom: "Lina", parent_id: "p1" };
  const c = { id: "3", prenom: "Tom", parent_id: "p2" };
  ok("Léo et Lina sont frère et soeur", noms(fratrieDe(a, [a, b, c])), ["Lina"]);
  ok("Tom est seul", noms(fratrieDe(c, [a, b, c])), []);
  ok("un enfant n'est jamais son propre frère", noms(fratrieDe(a, [a])), []);
}

console.log("\n=== LE REPLI : l'identité de l'employeur ===");
{
  const emp = (email, nom) => ({ contrat: { employeur_snapshot: { email, nom } } });
  const a = { id: "1", prenom: "Léo", ...emp("marie@mail.fr", "DUPONT") };
  const b = { id: "2", prenom: "Lina", ...emp("MARIE@Mail.fr", "  dupont ") };
  const c = { id: "3", prenom: "Tom", ...emp("autre@mail.fr", "MARTIN") };
  ok("la casse et les espaces ne séparent pas une famille", noms(fratrieDe(a, [a, b, c])), ["Lina"]);
  ok("deux employeurs différents restent séparés", noms(fratrieDe(c, [a, b, c])), []);
}

console.log("\n=== DANS LE DOUTE, ON SÉPARE ===");
{
  const vide = { id: "1", prenom: "Sans" };
  const vide2 = { id: "2", prenom: "Sans2" };
  ok("sans parent_id ni employeur : aucune clé", cleFamille(vide), null);
  ok("et donc aucune fratrie, jamais", noms(fratrieDe(vide, [vide, vide2])), []);
  const ctVide = { id: "3", prenom: "Ct", contrat: { employeur_snapshot: {} } };
  ok("un employeur vide ne rapproche personne", cleFamille(ctVide), null);
}

console.log("\n=== parent_id PRIME SUR L'EMPLOYEUR ===");
{
  const emp = { employeur_snapshot: { email: "meme@mail.fr" } };
  const a = { id: "1", prenom: "A", parent_id: "p1", contrat: emp };
  const b = { id: "2", prenom: "B", parent_id: "p2", contrat: emp };
  ok("deux parent_id différents séparent, même e-mail identique", noms(fratrieDe(a, [a, b])), []);
}

console.log("\n=== CE QUI NE DOIT PAS PLANTER ===");
{
  ok("enfant absent", fratrieDe(null, [{ id: "1" }]), []);
  ok("liste absente", fratrieDe({ id: "1", parent_id: "p" }, null), []);
  ok("trou dans la liste", noms(fratrieDe({ id: "1", parent_id: "p" }, [null, { id: "2", prenom: "B", parent_id: "p" }])), ["B"]);
}

// L'anciennete d'un contrat de fratrie : celle du contrat le plus ancien
// toujours en cours (CCN 3239, art. 90-1 ; DREETS BFC, fiche 12 ; Code du
// travail numerique). La fin de contrat la comptait depuis le seul contrat de
// l'enfant : 8 jours de preavis annonces au lieu d'un mois.
console.log("\n=== L'ANCIENNETÉ REPRISE D'UNE FRATRIE ===");
{
  const e = (id, prenom, debut, fin) => ({ id, prenom, parent_id: "p1", contrat: { debut, fin } });
  const aine = e("1", "Léo", "2023-09-04");
  const cadet = e("2", "Lina", "2026-09-01");
  const r = debutAnciennete(cadet, [aine, cadet]);
  ok("le cadet reprend l'ancienneté de l'aîné", r.debut, "2023-09-04");
  ok("et l'écran peut dire de qui", r.depuis?.prenom, "Léo");
  ok("l'aîné garde la sienne", debutAnciennete(aine, [aine, cadet]).debut, "2023-09-04");
  ok("l'aîné ne reprend rien du cadet", debutAnciennete(aine, [aine, cadet]).depuis, null);

  const clos = e("3", "Tom", "2022-01-03", "2025-06-30");
  const apres = e("4", "Zoé", "2026-01-05");
  ok("un contrat déjà fini à l'arrivée ne compte pas", debutAnciennete(apres, [clos, apres]).debut, "2026-01-05");

  const fin = e("5", "Noé", "2022-01-03", "2026-03-31");
  const pendant = e("6", "Ana", "2026-01-05");
  ok("un contrat qui courait encore à l'arrivée compte", debutAnciennete(pendant, [fin, pendant]).debut, "2022-01-03");

  // Chaine : A (2021) court a l'arrivee de B (2023) ; A finit ; C arrive (2026)
  // pendant B. C reprend l'anciennete de B, qui est celle de A.
  const A = e("7", "A", "2021-09-01", "2024-08-31");
  const B = e("8", "B", "2023-09-04");
  const C = e("9", "C", "2026-09-01");
  ok("la reprise se transmet de contrat en contrat", debutAnciennete(C, [A, B, C]).debut, "2021-09-01");

  const voisin = { id: "10", prenom: "Autre", parent_id: "p2", contrat: { debut: "2020-01-06" } };
  ok("un enfant d'une autre famille ne donne rien", debutAnciennete(cadet, [voisin, cadet]).debut, "2026-09-01");
  ok("même jour d'arrivée : rien à reprendre", debutAnciennete(e("11", "J1", "2026-09-01"), [e("12", "J2", "2026-09-01")]).debut, "2026-09-01");
  ok("sans date de début : rien d'inventé", debutAnciennete({ id: "13", parent_id: "p1", contrat: {} }, [aine]).depuis, null);
}

console.log(ko ? `\n${ko} échec(s).` : "\nTout est conforme.");
process.exit(ko ? 1 : 0);
