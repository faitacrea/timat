#!/usr/bin/env node
/**
 * Téléverse les PDF de la boutique dans le bucket privé Supabase.
 *
 *   npm run documents        # (re)génère les PDF dans documents/
 *   npm run documents:publier
 *
 * À relancer chaque fois qu'un document change : le téléversement écrase le
 * fichier existant, et les liens signés déjà envoyés continuent de pointer au
 * même endroit — les acheteuses récupèrent donc la version corrigée.
 *
 * Nécessite VITE_SUPABASE_URL et SUPABASE_SERVICE_KEY dans l'environnement.
 * La clé de service contourne les politiques RLS : elle ne doit jamais être
 * placée dans le code ni dans un fichier suivi par git.
 */
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUCKET, fichiersAttendus } from "../api/_catalogue-boutique.js";

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DOSSIER = path.join(RACINE, "documents");

const url = process.env.VITE_SUPABASE_URL;
const cle = process.env.SUPABASE_SERVICE_KEY;
if (!url || !cle) {
  console.error(
    "Il manque VITE_SUPABASE_URL ou SUPABASE_SERVICE_KEY.\n" +
      "Les deux se trouvent dans Supabase > Project Settings > API.\n" +
      "Exemple : VITE_SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npm run documents:publier"
  );
  process.exit(1);
}

const supabase = createClient(url, cle, { auth: { persistSession: false } });

const fichiers = fichiersAttendus();
const absents = fichiers.filter((f) => !existsSync(path.join(DOSSIER, f)));
if (absents.length) {
  console.error(
    "PDF manquants dans documents/ : " + absents.join(", ") + "\n" +
      "Lancez d'abord « npm run documents »."
  );
  process.exit(1);
}

let erreurs = 0;
for (const fichier of fichiers) {
  const contenu = await readFile(path.join(DOSSIER, fichier));
  const { error } = await supabase.storage.from(BUCKET).upload(fichier, contenu, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) {
    console.error("✗ " + fichier + " : " + error.message);
    erreurs++;
  } else {
    console.log("✓ " + fichier + " (" + Math.round(contenu.length / 1024) + " Ko)");
  }
}

if (erreurs) {
  console.error(
    "\n" + erreurs + " téléversement(s) en échec. Si le bucket n'existe pas, " +
      "exécutez d'abord sql/boutique-livraison.sql dans l'éditeur SQL de Supabase."
  );
  process.exit(1);
}

console.log("\n" + fichiers.length + " documents publiés dans le bucket « " + BUCKET + " ».");
