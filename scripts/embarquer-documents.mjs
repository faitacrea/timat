#!/usr/bin/env node
/**
 * Embarque les documents vendus dans un module JavaScript.
 *
 *   npm run documents        # les trois PDF
 *   npm run documents:kit    # le classeur
 *   npm run documents:embarquer
 *
 * Pourquoi ce détour plutôt qu'un dépôt dans un bucket : le téléversement
 * demandait une commande dans un terminal et une clé de service, à refaire à
 * chaque correction d'un document. Un fichier embarqué part avec le
 * déploiement, comme le reste du code — donc plus jamais d'étape manuelle, et
 * plus de risque qu'une ancienne version traîne dans le bucket pendant que le
 * site annonce la nouvelle.
 *
 * Le module est suivi par git : c'est du produit, pas un artefact de build,
 * et Vercel ne sait pas générer le classeur (il faut Python).
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUITS } from "../api/_catalogue-boutique.js";

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DOSSIER = path.join(RACINE, "documents");
const SORTIE = path.join(RACINE, "api", "_fichiers-boutique.js");

const fichiers = Object.entries(PRODUITS)
  .filter(([, p]) => p.fichier)
  .map(([cle, p]) => ({ cle, nom: p.fichier, type: p.typeMime || "application/pdf" }));

const absents = fichiers.filter((f) => !existsSync(path.join(DOSSIER, f.nom)));
if (absents.length) {
  console.error(
    "Fichiers manquants dans documents/ : " + absents.map((f) => f.nom).join(", ") +
      "\nLancez d'abord « npm run documents » puis « npm run documents:kit »."
  );
  process.exit(1);
}

const entrees = [];
for (const f of fichiers) {
  const contenu = await readFile(path.join(DOSSIER, f.nom));
  entrees.push(
    `  ${f.cle}: {\n` +
      `    nom: ${JSON.stringify(f.nom)},\n` +
      `    type: ${JSON.stringify(f.type)},\n` +
      `    octets: ${contenu.length},\n` +
      `    base64: ${JSON.stringify(contenu.toString("base64"))},\n` +
      `  },`
  );
  console.log(`✓ ${f.nom} (${Math.round(contenu.length / 1024)} Ko)`);
}

const module = `// Fichier généré par scripts/embarquer-documents.mjs — ne pas modifier à la main.
//
// Les documents vendus voyagent avec le déploiement plutôt que de vivre dans un
// bucket qu'il faudrait alimenter à la main. api/telecharger.js les sert après
// vérification du jeton d'achat.
//
// Pour mettre un document à jour : npm run documents && npm run documents:kit
// && npm run documents:embarquer, puis commiter ce fichier.
export const FICHIERS = {
${entrees.join("\n")}
};
`;

await writeFile(SORTIE, module, "utf8");
console.log(`\n${fichiers.length} documents embarqués dans api/_fichiers-boutique.js (${Math.round(module.length / 1024)} Ko).`);
