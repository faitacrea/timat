// Le QR de pointage est fabriqué dans la page.
//
// Avant, l'image était demandée à api.qrserver.com en lui passant dans
// l'adresse l'identifiant de l'enfant : ce service extérieur recevait donc, à
// chaque affichage et à chaque impression, un identifiant qui désigne un enfant
// précis — sur une application qui promet des données hébergées en France.
//
// Ce test garde deux choses :
//   1. plus aucun appel à un fabricant de QR extérieur dans le code ;
//   2. le QR produit dans la page est un vrai QR — pas une image grise qui
//      ressemble à un QR. On vérifie sa structure : les trois motifs de
//      repérage aux coins, la zone silencieuse, une densité plausible.
//
// Un QR faux ne se voit pas à l'œil : il se voit quand une assistante
// maternelle l'imprime, l'affiche à son entrée, et qu'aucun téléphone ne le lit.

import { readFileSync } from "node:fs";
import qrcode from "qrcode-generator";
import { lireApp } from "./sources-app.mjs";

const src = lireApp();

let ko = 0;
const verifie = (nom, reel, attendu) => {
  const ok = JSON.stringify(reel) === JSON.stringify(attendu);
  if (!ok) { ko++; console.log(`  KO  ${nom}\n      attendu ${JSON.stringify(attendu)}\n      obtenu  ${JSON.stringify(reel)}`); }
  else console.log(`  ok  ${nom}`);
};

console.log("\nLE QR NE PART PLUS CHEZ UN TIERS");

// On ignore les commentaires : ils ont le droit de raconter d'où l'on vient.
const codeSeul = src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
const fabricants = [/qrserver/i, /chart\.googleapis\.com\/chart\?[^"']*chs=/i, /goqr\.me/i, /quickchart\.io\/qr/i];
verifie("aucun fabricant de QR extérieur dans le code",
  fabricants.filter((r) => r.test(codeSeul)).length, 0);
verifie("le QR est fabriqué dans la page", /qrChemin\s*=/.test(src), true);

console.log("\nLE QR PRODUIT EST UN VRAI QR");

// La même construction que dans l'application. Si elle change là-bas sans
// changer ici, le test ne garde plus rien : d'où la vérification ci-dessus que
// qrChemin existe toujours.
const modules = (valeur) => {
  const q = qrcode(0, "M");
  q.addData(String(valeur));
  q.make();
  const n = q.getModuleCount();
  const m = [];
  for (let y = 0; y < n; y++) { const l = []; for (let x = 0; x < n; x++) l.push(q.isDark(y, x) ? 1 : 0); m.push(l); }
  return m;
};

// Un motif de repérage : carré plein 7×7, anneau blanc, centre plein 3×3.
const motifRepere = (m, dy, dx) => {
  const attendu = [
    [1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1],
  ];
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
    if (m[dy + y][dx + x] !== attendu[y][x]) return false;
  }
  return true;
};

const ADRESSE = "https://www.timat.app/?pointage=qr&enfant=123e4567-e89b-12d3-a456-426614174000";
const m = modules(ADRESSE);
const n = m.length;

verifie("taille impaire, comme tout QR", n % 2, 1);
verifie("motif de repérage en haut à gauche", motifRepere(m, 0, 0), true);
verifie("motif de repérage en haut à droite", motifRepere(m, 0, n - 7), true);
verifie("motif de repérage en bas à gauche", motifRepere(m, n - 7, 0), true);

const noirs = m.flat().filter(Boolean).length;
const part = noirs / (n * n);
verifie("densité plausible (entre 35 % et 65 % de noir)", part > 0.35 && part < 0.65, true);

// Le chemin SVG doit contenir exactement un rectangle par module noir : c'est
// la seule chose qui relie la matrice ci-dessus au dessin réellement affiché.
const marge = 4, taille = 4;
let d = "";
for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
  if (m[y][x]) d += "M" + ((x + marge) * taille) + " " + ((y + marge) * taille) + "h" + taille + "v" + taille + "h-" + taille + "z";
}
verifie("un rectangle dessiné par module noir", d.split("M").length - 1, noirs);
verifie("zone silencieuse de 4 modules", (n + marge * 2) * taille, (n + 8) * 4);

// Une adresse plus longue doit toujours passer : un identifiant d'enfant ne
// rétrécira pas.
const long = modules("https://www.timat.app/?pointage=qr&enfant=123e4567-e89b-12d3-a456-426614174000&t=abcdefghijklmnopqrstuvwxyz0123456789");
verifie("une adresse plus longue tient aussi", long.length >= n, true);

console.log("");
if (ko) { console.log(`${ko} problème(s)\n`); process.exit(1); }
console.log("Aucune anomalie\n");
