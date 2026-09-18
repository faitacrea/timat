// Le code de l'application a longtemps tenu dans src/App.jsx, et vingt-cinq
// scripts le lisaient par ce chemin, en dur.
//
// Le découpage du bundle l'a réparti sur plusieurs modules. Un contrôle qui
// cherche un motif dans « src/App.jsx » continue alors de passer — sur un
// fichier plus petit, où le motif n'est plus. C'est le pire des résultats :
// vert, et faux. Le test des notifications l'a montré le jour même, en tombant
// sur une ligne partie dans un autre module.
//
// Tout ce qui lit « le code de l'application » passe donc par ici, et un
// fichier nouveau est couvert du jour où il existe.
import { readFileSync, readdirSync } from "node:fs";

export const fichiersApp = () =>
  readdirSync(new URL("../src/", import.meta.url))
    .filter((f) => f.endsWith(".jsx") || f.endsWith(".js"))
    .sort()
    .map((f) => new URL("../src/" + f, import.meta.url));

export const lireApp = () =>
  fichiersApp().map((u) => readFileSync(u, "utf8")).join("\n");

// Plusieurs contrôles découpent un morceau de ce code et l'exécutent dans un
// new Function, qui n'accepte pas le mot-clé « export ». Depuis le découpage du
// bundle, les helpers partagés sont exportés pour que les morceaux paresseux
// les réutilisent : on retire le mot-clé, jamais l'export lui-même.
export const lireAppExecutable = () =>
  lireApp().replace(/^export (?=(?:function|const|let|var|async)\s)/gm, "");
