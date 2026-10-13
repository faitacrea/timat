// Après Stripe, on revient là où l'on était connectée.
//
// Pourquoi : le retour du paiement et du portail de facturation lisait
// NEXT_PUBLIC_APP_URL, et à défaut l'ancienne adresse timat-rho.vercel.app. La
// session de connexion est rangée par le navigateur pour UNE adresse : revenir
// sur une autre, c'est se retrouver déconnectée juste après avoir payé.
//
//   node scripts/test-retour-paiement.mjs
import { readFileSync } from "node:fs";
import { origineDeRetour } from "../api/_authentifier.js";

let ko = 0;
const verifie = (nom, reel, attendu) => {
  const ok = JSON.stringify(reel) === JSON.stringify(attendu);
  if (!ok) { ko++; console.log(`  KO  ${nom}\n      attendu ${JSON.stringify(attendu)}\n      obtenu  ${JSON.stringify(reel)}`); }
  else console.log(`  ok  ${nom}`);
};
const req = (origin) => ({ headers: origin === undefined ? {} : { origin } });

console.log("\nRETOUR APRÈS STRIPE");
verifie("depuis www.timat.app : retour sur www.timat.app", origineDeRetour(req("https://www.timat.app")), "https://www.timat.app");
verifie("depuis timat.app : retour sur timat.app (même session)", origineDeRetour(req("https://timat.app")), "https://timat.app");
verifie("un site étranger ne choisit pas le retour", origineDeRetour(req("https://site-de-pirate.example")), "https://www.timat.app");
verifie("sans en-tête Origin : le site", origineDeRetour(req(undefined)), "https://www.timat.app");
verifie("en-têtes à la mode Edge (Headers)", origineDeRetour({ headers: new Headers({ origin: "https://timat.app" }) }), "https://timat.app");

// La porte elle-même : les trois adresses de retour passent par
// origineDeRetour(), et plus aucune ne dépend d'une variable ou de l'ancienne
// adresse.
const stripe = readFileSync(new URL("../api/stripe.js", import.meta.url), "utf8")
  .split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
verifie("success_url et cancel_url partent de l'origine de l'appelante",
  /const appUrl = origineDeRetour\(req\);/.test(stripe) && /success_url: appUrl/.test(stripe) && /cancel_url: appUrl/.test(stripe), true);
verifie("le portail de facturation ramène au même endroit", /return_url: origineDeRetour\(req\)/.test(stripe), true);
verifie("plus de retour vers timat-rho.vercel.app ni NEXT_PUBLIC_APP_URL", /timat-rho|NEXT_PUBLIC_APP_URL/.test(stripe), false);

console.log(ko ? `\n${ko} anomalie(s)\n` : "\nAucune anomalie\n");
process.exit(ko ? 1 : 0);
