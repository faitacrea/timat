// Verifie la file d'attente hors ligne sur des scenarios joues de bout en bout.
//
// Pourquoi ce fichier : le mode hors ligne ne se voit pas. Quand il marche, il
// ne se passe rien de visible ; quand il ne marche pas, une journee de travail
// disparait sans un message d'erreur. Il n'existe aucune facon de s'en rendre
// compte a l'oeil. Le seul controle possible est un test qui coupe vraiment le
// reseau et verifie que rien ne se perd.
//
// Comme les autres tests, il EXTRAIT le code de src/App.jsx au lieu de le
// recopier : il n'existe qu'une seule file, et c'est celle de l'application.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const debut = src.indexOf('const CLE_HL="timat:hl:";');
const ancre = src.indexOf("async function rejouerFile(){");
if (debut < 0 || ancre < 0) {
  console.error("Module hors ligne introuvable dans src/App.jsx");
  process.exit(1);
}
const fin = src.indexOf("\n}\n", ancre) + 3;
const module = src.slice(debut, fin);

// --- Le monde autour du module, entierement sous controle ---
const memoire = new Map();
const localStorage = {
  getItem: (k) => (memoire.has(k) ? memoire.get(k) : null),
  setItem: (k, v) => memoire.set(k, String(v)),
  removeItem: (k) => memoire.delete(k),
};
const navigator = { onLine: true };
const window = { dispatchEvent() {} };
class CustomEvent { constructor(t) { this.type = t; } }

// Faux Supabase : une table pointages en memoire, et un interrupteur reseau.
const serveur = { lignes: [], coupe: false, refus: null };
const supabase = {
  from() {
    const api = {
      _filtres: {},
      upsert(ligne) {
        if (serveur.coupe) return Promise.reject(new TypeError("Failed to fetch"));
        if (serveur.refus) return Promise.resolve({ error: { message: serveur.refus } });
        const i = serveur.lignes.findIndex((l) => l.enfant_id === ligne.enfant_id && l.date === ligne.date);
        if (i >= 0) serveur.lignes[i] = { ...serveur.lignes[i], ...ligne };
        else serveur.lignes.push({ ...ligne });
        return Promise.resolve({ error: null });
      },
      select() { return api; },
      eq(col, val) { api._filtres[col] = val; return api; },
      maybeSingle() {
        if (serveur.coupe) return Promise.reject(new TypeError("Failed to fetch"));
        const l = serveur.lignes.find((x) => x.enfant_id === api._filtres.enfant_id && x.date === api._filtres.date);
        return Promise.resolve({ data: l || null, error: null });
      },
    };
    return api;
  },
};

const scope = { localStorage, navigator, window, CustomEvent, supabase };
const noms = Object.keys(scope);
const usine = new Function(...noms, module + "\nreturn {enregistrerPointage,rejouerFile,fileHorsLigne,memoriserHorsLigne,lireHorsLigne,panneReseau,filerOperation};");
const M = usine(...noms.map((n) => scope[n]));

let ko = 0;
const verifie = (nom, reel, attendu) => {
  const ok = JSON.stringify(reel) === JSON.stringify(attendu);
  if (!ok) { ko++; console.log(`  KO  ${nom}\n      attendu ${JSON.stringify(attendu)}\n      obtenu  ${JSON.stringify(reel)}`); }
  else console.log(`  ok  ${nom}`);
};
const ligne = (jour, arr, dep) => ({ enfant_id: "e1", asmat_id: "a1", date: jour, arrivee: arr, depart: dep, total_minutes: null, valide_parent: false, mode_pointage: "asmat" });
const raz = () => { memoire.clear(); serveur.lignes = []; serveur.coupe = false; serveur.refus = null; navigator.onLine = true; };

console.log("\nFILE D'ATTENTE HORS LIGNE");

// 1. Avec du reseau, rien ne doit trainer dans la file.
raz();
verifie("en ligne : le pointage part", (await M.enregistrerPointage(ligne("2026-09-11", "08:00", null))).etat, "envoye");
verifie("en ligne : la file reste vide", M.fileHorsLigne().length, 0);
verifie("en ligne : le serveur a la ligne", serveur.lignes.length, 1);

// 2. Sans reseau, rien ne doit se perdre.
raz();
navigator.onLine = false;
verifie("hors ligne : le pointage est mis en file", (await M.enregistrerPointage(ligne("2026-09-11", "08:00", null))).etat, "en-file");
verifie("hors ligne : le serveur n'a rien recu", serveur.lignes.length, 0);
verifie("hors ligne : la file garde une entree", M.fileHorsLigne().length, 1);

// 3. Coupure sans que le navigateur le sache (onLine ment souvent).
raz();
serveur.coupe = true;
verifie("coupure silencieuse : mise en file quand meme", (await M.enregistrerPointage(ligne("2026-09-11", "08:00", null))).etat, "en-file");

// 4. Le retour du reseau vide la file, dans l'ordre.
raz();
navigator.onLine = false;
await M.enregistrerPointage(ligne("2026-09-10", "08:00", "17:00"));
await M.enregistrerPointage(ligne("2026-09-11", "08:15", null));
navigator.onLine = true;
const r4 = await M.rejouerFile();
verifie("retour du reseau : deux pointages envoyes", r4.envoyees, 2);
verifie("retour du reseau : file videe", r4.restantes, 0);
verifie("retour du reseau : le serveur a les deux jours", serveur.lignes.map((l) => l.date), ["2026-09-10", "2026-09-11"]);

// 5. Re-pointer le meme jour remplace, n'empile pas.
raz();
navigator.onLine = false;
await M.enregistrerPointage(ligne("2026-09-11", "08:00", null));
await M.enregistrerPointage(ligne("2026-09-11", "08:00", "17:30"));
verifie("meme jour : une seule entree en file", M.fileHorsLigne().length, 1);
navigator.onLine = true;
await M.rejouerFile();
verifie("meme jour : c'est la derniere version qui part", serveur.lignes[0].depart, "17:30");

// 6. Le conflit : le parent a corrige pendant la coupure.
raz();
navigator.onLine = false;
await M.enregistrerPointage(ligne("2026-09-11", "08:00", "17:00"));
navigator.onLine = true;
serveur.lignes.push({ enfant_id: "e1", date: "2026-09-11", arrivee: "08:30", depart: "17:00", modified_by_parent_at: new Date(Date.now() + 60000).toISOString() });
const r6 = await M.rejouerFile();
verifie("conflit : signale, pas envoye", [r6.envoyees, r6.conflits], [0, 1]);
verifie("conflit : la correction du parent n'est pas ecrasee", serveur.lignes[0].arrivee, "08:30");
verifie("conflit : l'entree reste, avec sa raison", !!M.fileHorsLigne()[0].conflit, true);

// 7. Une correction du parent ANTERIEURE a la coupure ne bloque rien.
raz();
serveur.lignes.push({ enfant_id: "e1", date: "2026-09-11", arrivee: "08:30", modified_by_parent_at: new Date(Date.now() - 3600000).toISOString() });
navigator.onLine = false;
await M.enregistrerPointage(ligne("2026-09-11", "09:00", "17:00"));
navigator.onLine = true;
verifie("correction ancienne : le rejeu passe", (await M.rejouerFile()).envoyees, 1);

// 8. Une erreur METIER n'est pas une coupure : la mettre en file la ferait
//    echouer indefiniment, sans que personne ne le sache.
raz();
serveur.refus = "new row violates row-level security policy";
const r8 = await M.enregistrerPointage(ligne("2026-09-11", "08:00", null));
verifie("erreur de droits : signalee tout de suite", r8.etat, "erreur");
verifie("erreur de droits : rien en file", M.fileHorsLigne().length, 0);

// 9. Le rejeu s'arrete si le reseau est toujours coupe : la file survit.
raz();
navigator.onLine = false;
await M.enregistrerPointage(ligne("2026-09-11", "08:00", null));
navigator.onLine = true;
serveur.coupe = true;
const r9 = await M.rejouerFile();
verifie("rejeu sans reseau : rien d'envoye, rien de perdu", [r9.envoyees, r9.restantes], [0, 1]);

console.log("\nCOPIE LOCALE POUR CONSULTATION");

// 10. Toute copie porte sa date : c'est ce qui empeche de la croire fraiche.
raz();
M.memoriserHorsLigne("pointages:e1", [{ date: "2026-09-11" }]);
const copie = M.lireHorsLigne("pointages:e1");
verifie("copie : la valeur est rendue", copie.valeur.length, 1);
verifie("copie : elle est horodatee", !isNaN(new Date(copie.le)), true);
verifie("copie absente : rien, jamais une valeur vide", M.lireHorsLigne("inexistant"), null);

// 11. Un stockage corrompu ne doit pas casser l'ecran.
raz();
memoire.set("timat:hl:pointages:e1", "{ceci n'est pas du json");
verifie("copie illisible : traitee comme absente", M.lireHorsLigne("pointages:e1"), null);
memoire.set("timat:hl:file", "pas du json non plus");
verifie("file illisible : traitee comme vide", M.fileHorsLigne(), []);

console.log(ko ? `\n${ko} anomalie(s)\n` : "\nAucune anomalie\n");
process.exit(ko ? 1 : 0);
