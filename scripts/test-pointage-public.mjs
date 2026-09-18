// Le QR affiché à l'entrée : la seule adresse publique de TiMat.
//
// Une adresse ouverte qui enregistre des pointages, on en a déjà supprimé une :
// api/pointage-qr prenait l'identifiant de l'enfant dans l'URL, sans rien
// demander, et affichait au passage le prénom et les heures du jour à qui
// connaissait cet identifiant. Celle-ci la remplace, et ce test garde
// précisément ce qui manquait à l'autre :
//
//   1. la page servie ne révèle RIEN avant le code — ni prénom, ni heures, ni
//      même si le jeton existe ;
//   2. un jeton mal formé reçoit exactement la même réponse qu'un code faux :
//      on ne peut pas fabriquer un détecteur de jetons valides ;
//   3. une entrée mal formée ne descend jamais jusqu'à la base ;
//   4. la clé de service ne part pas dans la page ;
//   5. l'adresse /p/<jeton> est réellement branchée sur la route.
//
// Le comptage des tentatives n'est PAS testé ici : il est tenu par la base, pas
// par cette route — c'est justement pour ça qu'il est fiable.

import { readFileSync } from "node:fs";
import { lireApp } from "./sources-app.mjs";

const src = readFileSync(new URL("../api/pointage-public.js", import.meta.url), "utf8");

let ko = 0;
const verifie = (nom, reel, attendu) => {
  const ok = JSON.stringify(reel) === JSON.stringify(attendu);
  if (!ok) { ko++; console.log(`  KO  ${nom}\n      attendu ${JSON.stringify(attendu)}\n      obtenu  ${JSON.stringify(reel)}`); }
  else console.log(`  ok  ${nom}`);
};

// On remplace l'import de Supabase par un faux client qui NOTE les appels :
// c'est la seule façon de prouver qu'une entrée mal formée ne l'atteint pas.
let rpcs = [];
let reponseRpc = { data: { success: true, action: "arrivee", heure: "08:12", prenom: "Léa", emoji: "🐣" }, error: null };
const code = src
  .replace(/^import .*$/m, "")
  .replace(/const supabase = createClient\([\s\S]*?\);/, "const supabase = __faux;")
  .replace(/^export default /m, "");
const usine = new Function("__faux", "process", code + "\nreturn {handler:handler,page:page};");
const faux = { rpc: async (nom, args) => { rpcs.push({ nom, args }); return reponseRpc; } };
const { handler, page } = usine(faux, { env: { VITE_SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_KEY: "cle-de-service-tres-secrete" } });

const fausseReponse = () => {
  const r = { code: 0, corps: null, entetes: {} };
  r.setHeader = (k, v) => { r.entetes[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.send = (b) => { r.corps = b; return r; };
  r.json = (b) => { r.corps = b; return r; };
  return r;
};
const appel = async (req) => { rpcs = []; const r = fausseReponse(); await handler(req, r); return r; };

const JETON = "aZ09_-aZ09_-aZ09_-aZ09_-aZ09_-ab";

console.log("\nLA PAGE NE RÉVÈLE RIEN AVANT LE CODE");
{
  const r = await appel({ method: "GET", query: { j: JETON } });
  verifie("la page est servie", r.code, 200);
  verifie("aucun appel à la base sur un simple affichage", rpcs.length, 0);
  verifie("la clé de service ne part pas dans la page", /cle-de-service/.test(r.corps), false);
  verifie("l'adresse de la base ne part pas dans la page", /supabase\.co/.test(r.corps), false);
  verifie("la page n'est pas indexable", r.entetes["X-Robots-Tag"], "noindex, nofollow");
  verifie("la page n'est pas mise en cache", r.entetes["Cache-Control"], "no-store");

  const inconnu = await appel({ method: "GET", query: { j: "zzzz-jeton-qui-nexiste-pas-du-tout" } });
  verifie("un jeton inconnu donne le même écran", inconnu.code, 200);
  // Ce que le parent LIT : les commentaires du script ne sont pas affichés.
  const lisible = inconnu.corps.replace(/^\s*\/\/.*$/gm, "");
  verifie("rien ne dit que le jeton est inconnu", /invalide|inconnu|introuvable/i.test(lisible), false);

  const tordu = await appel({ method: "GET", query: { j: "<script>alert(1)</script>" } });
  verifie("un jeton mal formé ne se retrouve pas dans la page", /<script>alert/.test(tordu.corps), false);
  // Un jeton mal formé doit recevoir le MÊME écran qu'un jeton valide. Servir
  // une erreur ici donnerait un détecteur de forme : on saurait, sans jamais
  // connaître un code, à quoi ressemble un jeton qui vaut la peine d'être tenté.
  verifie("un jeton mal formé reçoit le même écran", tordu.code, 200);
  verifie("et le même écran de saisie du code", /Entrez le code/.test(tordu.corps), true);
}

console.log("\nCE QUI NE DESCEND PAS JUSQU'À LA BASE");
for (const [nom, corps] of [
  ["jeton absent", { code: "1234" }],
  ["jeton trop court", { jeton: "abc", code: "1234" }],
  ["jeton avec un caractère interdit", { jeton: JETON.slice(0, 31) + "'", code: "1234" }],
  ["code absent", { jeton: JETON }],
  ["code à 3 chiffres", { jeton: JETON, code: "123" }],
  ["code avec des lettres", { jeton: JETON, code: "12a4" }],
]) {
  const r = await appel({ method: "POST", body: corps });
  verifie(nom + " : la base n'est pas appelée", rpcs.length, 0);
  verifie(nom + " : même réponse qu'un code faux", r.corps, { success: false, error: "Code incorrect" });
  verifie(nom + " : et le même code HTTP", r.code, 200);
}

console.log("\nUNE DEMANDE BIEN FORMÉE PASSE");
{
  const r = await appel({ method: "POST", body: { jeton: JETON, code: "4071" } });
  verifie("la base est appelée une fois", rpcs.length, 1);
  verifie("avec le bon RPC et les bons arguments", rpcs[0], { nom: "pointage_par_jeton", args: { p_jeton: JETON, p_code: "4071" } });
  verifie("la réponse de la base est rendue telle quelle", r.corps.prenom, "Léa");
}
{
  // Certains hébergeurs livrent le corps en texte : le parent ne doit pas
  // dépendre de cette différence.
  const r = await appel({ method: "POST", body: JSON.stringify({ jeton: JETON, code: "4071" }) });
  verifie("un corps livré en texte est lu aussi", rpcs.length, 1);
  const casse = await appel({ method: "POST", body: "{pas du json" });
  verifie("un corps illisible ne fait pas tomber la route", casse.code, 200);
}

console.log("\nLE PRÉNOM N'EST JAMAIS DU HTML");
{
  // Le prénom vient de la base, pas d'un inconnu. Mais toute la page est écrite
  // à la main, sans React pour échapper à notre place : une seule concaténation
  // dans innerHTML suffirait à rouvrir la porte.
  const script = src.slice(src.indexOf("<script>"), src.indexOf("</script>"));
  verifie("rien n'est injecté en HTML", /innerHTML/.test(script), false);
  verifie("le prénom passe par du texte", /textContent\s*=\s*\(?d\.prenom/.test(script), true);
}

console.log("\nQUAND LA BASE TOMBE");
{
  reponseRpc = { data: null, error: { message: "connection refused chez le fournisseur" } };
  const r = await appel({ method: "POST", body: { jeton: JETON, code: "4071" } });
  verifie("le parent voit une erreur", r.code, 500);
  verifie("le détail technique ne lui est pas montré", /connection refused/.test(JSON.stringify(r.corps)), false);
  reponseRpc = { data: { success: false, error: "Code incorrect" }, error: null };
}

console.log("\nLES AUTRES MÉTHODES");
{
  const r = await appel({ method: "DELETE", body: {} });
  verifie("DELETE est refusé", r.code, 405);
  verifie("la base n'est pas touchée", rpcs.length, 0);
}

console.log("\nL'ADRESSE EST BRANCHÉE");
{
  const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const r = (vercel.rewrites || []).find((x) => x.source === "/p/:jeton");
  verifie("/p/<jeton> mène à la route", r && r.destination, "/api/pointage-public?j=:jeton");

  // Un QR qui pointe ailleurs que sur la route n'enregistre rien. C'est le
  // genre de défaut qui ne se voit qu'une fois l'affiche au mur.
  const app = lireApp();
  verifie("l'application fabrique bien une adresse /p/", /\/\s*\+\s*"\/p\/"|"\/p\/"\s*\+/.test(app), true);
  verifie("le jeton du QR est tiré au sort, pas dérivé de l'enfant",
    /getRandomValues/.test(app.slice(app.indexOf("const tirerJetonBorne"), app.indexOf("const tirerJetonBorne") + 400)), true);
  verifie("le QR ne porte jamais l'identifiant de l'enfant",
    /"\/p\/"\s*\+\s*[a-zA-Z]*[Ee]nfant/.test(app), false);
}

console.log("");
if (ko) { console.log(`${ko} problème(s)\n`); process.exit(1); }
console.log("Aucune anomalie\n");
