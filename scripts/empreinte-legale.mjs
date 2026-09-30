// L'empreinte du texte legal affiche aux utilisateurs.
//
// Elle sert a une seule chose : empecher qu'un contrat soit modifie sans que
// la date de mise a jour le dise. Lancer avec --ecrire apres avoir change le
// texte ET la date dans data/documents-legaux.js.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const RACINE = new URL("../", import.meta.url);

// Le texte LISIBLE seulement : la mise en forme peut bouger sans que le
// contrat change, et faire echouer la construction sur un changement de
// couleur apprendrait a ignorer la barriere.
export const texteLegal = () => {
  const app = readFileSync(new URL("src/App.jsx", RACINE), "utf8");
  const deb = app.indexOf('{showLegal==="mentions"&&<div>');
  const fin = app.indexOf("Dernière mise à jour", app.indexOf('{showLegal==="confidentialite"&&<div>'));
  if (deb < 0 || fin < 0) throw new Error("les blocs légaux sont introuvables dans src/App.jsx");
  const ecran = readFileSync(new URL("src/ecrans-app.jsx", RACINE), "utf8");
  const d2 = ecran.indexOf("export function MentionsLegales(){");
  const f2 = ecran.indexOf("\n}\n", d2);
  const brut = app.slice(deb, fin) + ecran.slice(d2, f2);
  return [...brut.matchAll(/>([^<>{}]{3,})</g)].map((m) => m[1].trim()).join(" ").replace(/\s+/g, " ");
};

export const empreinte = () => createHash("sha256").update(texteLegal()).digest("hex").slice(0, 32);

if (process.argv.includes("--ecrire")) {
  const p = new URL("data/documents-legaux.js", RACINE);
  const s = readFileSync(p, "utf8").replace(/EMPREINTE_DOCUMENTS_LEGAUX = "[^"]*"/, `EMPREINTE_DOCUMENTS_LEGAUX = "${empreinte()}"`);
  writeFileSync(p, s);
  console.log("empreinte écrite :", empreinte());
} else {
  console.log("empreinte actuelle :", empreinte());
}
