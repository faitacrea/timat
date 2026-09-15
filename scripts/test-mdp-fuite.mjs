// Le contrôle des mots de passe déjà fuités.
//
// Supabase sait le faire, mais le réserve à son plan Pro. On le fait nous-mêmes,
// avec l'API publique Have I Been Pwned et le modèle dit de k-anonymat : seuls
// les CINQ PREMIERS caractères de l'empreinte SHA-1 partent, jamais le mot de
// passe, jamais l'empreinte entière.
//
// Ce que ce test garde, dans l'ordre d'importance :
//   1. le mot de passe ne part pas, et l'empreinte complète non plus ;
//   2. une panne du service NE BLOQUE PAS l'inscription. Un contrôle qui
//      empêche de créer un compte parce qu'un tiers est lent est pire que pas
//      de contrôle du tout ;
//   3. un mot de passe fuité est bien reconnu, un mot de passe sain aussi.
//
// L'API elle-même n'est pas joignable depuis l'environnement de développement :
// le réseau y est filtré. On rejoue donc de vraies réponses, au format exact
// documenté par le service — suffixe de 35 caractères, deux-points, nombre.

import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";

const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const debut = src.indexOf("const MDP_FUITE_DELAI_MS");
const fin = src.indexOf("\nconst verifierMotDePasse");
if (debut < 0 || fin < 0) {
  console.error("\n  KO  le contrôle des mots de passe fuités est introuvable dans src/App.jsx\n");
  process.exit(1);
}
const module = src.slice(debut, fin);

let ko = 0;
const verifie = (nom, reel, attendu) => {
  const ok = JSON.stringify(reel) === JSON.stringify(attendu);
  if (!ok) { ko++; console.log(`  KO  ${nom}\n      attendu ${JSON.stringify(attendu)}\n      obtenu  ${JSON.stringify(reel)}`); }
  else console.log(`  ok  ${nom}`);
};

// « P@ssw0rd » : SHA-1 = 21BD1...A757. C'est un mot de passe massivement fuité.
const SHA_PASSW0RD = "21BD12DC183F740EE76F27B78EB39C8AD972A757";
const PREFIXE = SHA_PASSW0RD.slice(0, 5);
const SUFFIXE = SHA_PASSW0RD.slice(5);

let appels = [];
const faireModule = (reponse) => {
  appels = [];
  const fetchFaux = async (url, opts) => {
    appels.push({ url, entetes: opts && opts.headers });
    if (reponse === "panne") throw new TypeError("Failed to fetch");
    if (reponse === "500") return { ok: false, status: 500, text: async () => "" };
    if (reponse === "lent") return await new Promise((_, rejette) => {
      opts.signal.addEventListener("abort", () => rejette(new Error("AbortError")));
    });
    return { ok: true, status: 200, text: async () => reponse };
  };
  const portee = { crypto: webcrypto, fetch: fetchFaux, TextEncoder, AbortController, setTimeout, clearTimeout };
  const noms = Object.keys(portee);
  const usine = new Function(...noms, module + "\nreturn {motDePasseCompromis,messageMotDePasseFuite,MDP_FUITE_URL};");
  return usine(...noms.map((n) => portee[n]));
};

// Réponse réaliste : des suffixes qui commencent pareil, dont le nôtre.
const REPONSE_TROUVE = [
  "0018A45C4D1DEF81644B54AB7F969B88D65:1",
  SUFFIXE + ":83790",
  "011053FD0102E94D6AE2F8B83D76FAF94F6:3",
].join("\r\n");
const REPONSE_ABSENT = [
  "0018A45C4D1DEF81644B54AB7F969B88D65:1",
  "011053FD0102E94D6AE2F8B83D76FAF94F6:3",
].join("\r\n");

console.log("\nCE QUI PART SUR LE RÉSEAU");
{
  const M = faireModule(REPONSE_ABSENT);
  await M.motDePasseCompromis("P@ssw0rd");
  const url = appels[0]?.url || "";
  verifie("un seul appel", appels.length, 1);
  verifie("l'adresse porte les 5 premiers caractères de l'empreinte", url, M.MDP_FUITE_URL + PREFIXE);
  verifie("le mot de passe ne part pas", /P@ssw0rd/.test(url), false);
  verifie("l'empreinte complète ne part pas", url.includes(SHA_PASSW0RD), false);
  verifie("le suffixe ne part pas", url.includes(SUFFIXE), false);
  verifie("l'en-tête de remplissage est demandé", appels[0]?.entetes?.["Add-Padding"], "true");
}

console.log("\nUNE PANNE NE BLOQUE JAMAIS L'INSCRIPTION");
for (const [nom, rep] of [["réseau coupé", "panne"], ["erreur 500", "500"], ["service trop lent", "lent"]]) {
  const M = faireModule(rep);
  const r = await M.motDePasseCompromis("P@ssw0rd");
  verifie(nom + " : on laisse passer", r, { verifie: false, occurrences: 0 });
}

console.log("\nLA RÉPONSE EST LUE CORRECTEMENT");
{
  const M = faireModule(REPONSE_TROUVE);
  verifie("mot de passe fuité : reconnu, avec le nombre",
    await M.motDePasseCompromis("P@ssw0rd"), { verifie: true, occurrences: 83790 });
}
{
  const M = faireModule(REPONSE_ABSENT);
  verifie("mot de passe absent de la liste : accepté",
    await M.motDePasseCompromis("P@ssw0rd"), { verifie: true, occurrences: 0 });
}
{
  // Le remplissage ajoute de fausses lignes à zéro occurrence : elles ne
  // doivent jamais être prises pour une fuite.
  const M = faireModule([SUFFIXE + ":0", "0018A45C4D1DEF81644B54AB7F969B88D65:0"].join("\r\n"));
  verifie("ligne de remplissage (compte à zéro) : pas une fuite",
    await M.motDePasseCompromis("P@ssw0rd"), { verifie: true, occurrences: 0 });
}
{
  const M = faireModule(REPONSE_ABSENT);
  verifie("mot de passe vide : aucun appel", await M.motDePasseCompromis(""), { verifie: false, occurrences: 0 });
  verifie("mot de passe vide : le réseau n'est pas sollicité", appels.length, 0);
}

// Un contrôle que personne n'appelle ne contrôle rien. C'est la classe de
// défaut déjà trouvée deux fois dans ce dépôt : du code juste, jamais atteint.
// On vérifie donc que CHAQUE endroit qui valide un mot de passe enchaîne sur le
// contrôle des fuites — les deux inscriptions et le changement de mot de passe.
console.log("\nLE CONTRÔLE EST BRANCHÉ PARTOUT");
{
  const appels = [...src.matchAll(/verifierMotDePasse\s*\(/g)];
  verifie("trois endroits valident un mot de passe", appels.length, 3);
  let branches = 0;
  for (const m of appels) {
    // La suite immédiate doit appeler le contrôle : on regarde les 400
    // caractères qui suivent, soit largement la fin du bloc de validation.
    if (/motDePasseCompromis\s*\(/.test(src.slice(m.index, m.index + 400))) branches++;
  }
  verifie("les trois enchaînent sur le contrôle des fuites", branches, 3);
  verifie("le contrôle est toujours attendu (await)",
    (src.match(/await\s+motDePasseCompromis\s*\(/g) || []).length, 3);
  verifie("le service est déclaré dans la politique de confidentialité",
    /Have I Been Pwned/.test(src), true);
}

console.log("\nLE MESSAGE");
{
  const M = faireModule(REPONSE_ABSENT);
  const m = M.messageMotDePasseFuite(83790);
  verifie("le message ne recopie pas le mot de passe", /P@ssw0rd/.test(m), false);
  verifie("le message dit quoi faire", /choisissez-en un autre/i.test(m), true);
  verifie("un grand nombre reste lisible", /plus de mille/.test(m), true);
  verifie("un petit nombre est donné tel quel", /\b3 fuites\b/.test(M.messageMotDePasseFuite(3)), true);
}

console.log("");
if (ko) { console.log(`${ko} problème(s)\n`); process.exit(1); }
console.log("Aucune anomalie\n");
