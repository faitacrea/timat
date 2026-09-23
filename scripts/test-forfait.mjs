// CE QUE LE FORFAIT PRO OUVRE — la liste, epinglee.
//
// ECRANS_PRO est une decision commerciale, pas un detail technique : la page
// tarifs la promet, ligne par ligne. Elle a pourtant disparu d'un ecran sans
// que rien ne le dise — « reprise_contrat » est sorti de la liste au detour
// d'une resolution de conflit, et la fonction vendue au forfait Pro est
// devenue gratuite. La construction passait, l'audit aussi, le parcours visuel
// affichait l'ecran au lieu du verrou et personne ne trouvait ca anormal.
//
// Une barriere ne peut pas deviner l'intention commerciale. Elle est donc
// ecrite ici, en toutes lettres : toute difference se voit, dans les deux sens.
//
//   node scripts/test-forfait.mjs
import { readFileSync } from "node:fs";

const ATTENDUS = [
  "attestation_fiscale",
  "attestation_pe",
  "bilans",
  "documents_complet",
  "mes_employeurs",
  "pmi",
  "rapport_annuel",
  "recap_fiscal",
  "reprise_contrat",
  "solde_compte",
  "temps_travail",
];

const src = readFileSync("src/App.jsx", "utf8");
const bloc = src.match(/export const ECRANS_PRO = \{([\s\S]*?)\n\};/);
if (!bloc) { console.log("KO  ECRANS_PRO est introuvable."); process.exit(1); }
const trouves = [...bloc[1].matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]).sort();

let ko = 0;
const manquants = ATTENDUS.filter((x) => !trouves.includes(x));
const enTrop = trouves.filter((x) => !ATTENDUS.includes(x));

console.log("\n=== LES ECRANS RESERVES AU FORFAIT PRO ===\n");
for (const id of ATTENDUS) {
  const ok = trouves.includes(id);
  if (!ok) ko++;
  console.log(`  ${ok ? "ok " : "KO "} ${id}${ok ? "" : "  ← N'EST PLUS VERROUILLE : cette fonction est devenue gratuite"}`);
}
for (const id of enTrop) {
  ko++;
  console.log(`  KO  ${id}  ← verrouille sans figurer dans la liste attendue : si c'est voulu, ajoutez-le a ATTENDUS et a la page tarifs`);
}

console.log(ko
  ? `\n${ko} écart(s). La page tarifs promet une chose, le code en fait une autre.`
  : `\n${trouves.length} écrans, conformes à ce que la page tarifs annonce.`);
process.exit(ko ? 1 : 0);
