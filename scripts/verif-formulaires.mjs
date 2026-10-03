// ON REMPLIT LES FORMULAIRES, ET ON ENVOIE.
//
// Le parcours des boutons clique 365 boutons sans rien saisir. C'est ce qui lui
// a permis de trouver « enregistrerPointage is not defined » — un bouton qui ne
// demande rien. Mais la moitie de l'application ne se commande pas au clic :
// elle se commande au clavier. Un taux horaire, une date de debut, un message a
// envoyer, un prenom d'enfant. Et un bouton clique sur un formulaire VIDE part
// presque toujours dans la branche « champs obligatoires » : il ne touche jamais
// le code qui calcule, convertit ou enregistre.
//
// Ce controle fait donc l'inverse : il remplit chaque champ d'une valeur du bon
// type, PUIS envoie. Trois familles de defauts tombent dans ce filet :
//
//   1. le code qui manque — « is not defined », « is not a function », le meme
//      filet que le parcours des boutons, mais sur du code qu'on n'atteint
//      qu'avec des donnees ;
//   2. le champ qui refuse la frappe — on saisit, on relit, et la valeur n'est
//      pas la : un champ controle dont le onChange est casse. L'utilisatrice
//      tape et rien ne s'inscrit ;
//   3. le NaN et le « Invalid Date » a l'ecran — une valeur numerique ou une
//      date saisie que le calcul ne sait pas lire.
//
// Rien n'est ecrit nulle part : Supabase est intercepte. Les boutons
// destructeurs ne sont pas touches.
//
// Hors chaine de build : Vercel n'a pas de navigateur.
//   node scripts/verif-formulaires.mjs [asmat|parent]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];
const ESPACE = process.argv[2] || "asmat";

const ECRANS = ESPACE === "parent"
  ? ["accueil","journee","pointage","suivi_progres","sante_urgence","autorisations","calendrier","messagerie","aides_simulateurs","admin_finances","documents_complet","mes_alertes","faq"]
  : ["accueil","journee","pointage","suivi_progres","sante_urgence","autorisations","calendrier","messagerie","paie_contrats","documents_rapports","inviter_parent","reprise_contrat","liste_attente","page_vitrine","mes_employeurs","pmi","mes_alertes","faq"];

const DANGEREUX = /supprim|effac|r[ée]sili|d[ée]connex|se d[ée]connecter|payer|abonner|archiver|r[ée]initialis|vider|quitter|annuler mon|retirer|d[ée]sactiver mon/i;
// Les libelles qui envoient : on ne clique que ceux-la, apres avoir rempli.
const ENVOI = /enregistr|valider|ajouter|cr[ée]er|envoyer|g[ée]n[ée]rer|calculer|inviter|confirmer|appliquer|sauvegarder|publier|simuler|rechercher|continuer|terminer/i;
const CODE_MANQUANT = /is not defined|is not a function|cannot read propert|undefined is not|null is not an object/i;

const UID = "11111111-1111-4111-8111-111111111111";
const EID = "22222222-2222-4222-8222-222222222222";
const PID = "33333333-3333-4333-8333-333333333333";
const estParent = ESPACE === "parent";
const utilisateur = {
  id: estParent ? PID : UID, aud: "authenticated", role: "authenticated",
  email: estParent ? "sophie@test.fr" : "marie@test.fr", app_metadata: {},
  user_metadata: { prenom: estParent ? "Sophie" : "Marie", nom: "Test", role: estParent ? "parent" : "asmat" },
  created_at: new Date().toISOString(),
};
const session = { access_token: "faux", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "faux", user: utilisateur };

// LA VALEUR QU'ON SAISIT DEPEND DU CHAMP, PAS DE SON TYPE SEULEMENT.
//
// Mettre « 12 » dans un champ de taux horaire et « 12 » dans un champ d'heures
// hebdomadaires ne prouve pas la meme chose. On lit donc le nom, le libelle et
// le texte d'aide du champ pour choisir une valeur plausible — sinon le calcul
// qu'on veut declencher se refuse avant d'avoir commence.
const VALEUR = (indice, type) => {
  const i = (indice || "").toLowerCase();
  if (type === "date") return "2026-03-02";
  if (type === "time") return "08:30";
  if (type === "email") return "parent.test@mail.fr";
  if (type === "tel" || /t[ée]l[ée]phone|portable/.test(i)) return "0620873380";
  if (/code postal|cp\b/.test(i)) return "94230";
  if (/taux|tarif/.test(i)) return "4.20";
  if (/entretien/.test(i)) return "3.92";
  if (/repas/.test(i)) return "5.00";
  if (/heure/.test(i)) return "40";
  if (/semaine/.test(i)) return "47";
  if (/jour/.test(i)) return "5";
  if (/enfant|nombre/.test(i)) return "2";
  if (/revenu|salaire|montant|net|brut|ressource/.test(i)) return "28000";
  if (/naissance|n[ée] le/.test(i)) return "2023-03-01";
  if (/iban/.test(i)) return "FR7630006000011234567890189";
  if (/siret/.test(i)) return "90264808800026";
  if (/agr[ée]ment/.test(i)) return "94-2026-001";
  if (/adresse|rue/.test(i)) return "12 rue Étienne Dolet";
  if (/ville|commune/.test(i)) return "Cachan";
  if (type === "number") return "3";
  if (/pr[ée]nom/.test(i)) return "Léo";
  if (/nom/.test(i)) return "Durand";
  return "Essai de saisie";
};

const N = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await N.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris", serviceWorkers: "block" });
const p = await ctx.newPage();
let erreurs = [];
p.on("pageerror", (e) => erreurs.push(e.message));
p.on("console", (m) => { if (m.type() === "error") erreurs.push(m.text()); });
p.on("dialog", (d) => d.dismiss().catch(() => {}));
await p.addInitScript(([s, cle]) => {
  try {
    localStorage.setItem("timat_acces", cle);
    localStorage.setItem("sb-akicyckmbsjnewnvvcil-auth-token", JSON.stringify(s));
  } catch (e) { /* stockage indisponible : la page reste testable */ }
}, [session, CLE]);

const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
// La regle generale D'ABORD : Playwright essaie la derniere enregistree en premier.
await p.route("**/storage/v1/**", (r) => r.fulfill(json([])));
await p.route("**/rest/v1/**", (r) => {
  const t = (r.request().url().match(/rest\/v1\/(?:rpc\/)?([a-z_]+)/) || [])[1];
  if (t === "profiles") return r.fulfill(json([{ id: utilisateur.id, role: utilisateur.user_metadata.role, prenom: utilisateur.user_metadata.prenom, nom: "Test", email: utilisateur.email, code_postal: "94230", subscription_status: "pro", is_admin: false }]));
  if (t === "enfants") return r.fulfill(json([{ id: EID, asmat_id: UID, parent_id: PID, prenom: "Léo", naissance: "2023-03-01", emoji: "🦁", couleur: "#E4915F", actif: true, allergies: [] }]));
  if (t === "contrats") return r.fulfill(json([{ id: "c1", enfant_id: EID, asmat_id: UID, debut: "2026-01-01", heures_hebdo: 40, taux_horaire: 4.20, annee_complete: true, entretien: 3.92, jours: ["Lundi","Mardi","Mercredi","Jeudi","Vendredi"], horaires: "07h30–17h30" }]));
  return r.fulfill(json([]));
});
await p.route("**/auth/v1/**", (r) => r.fulfill(json({ ...session, ...utilisateur })));

await p.goto(`http://127.0.0.1:4173/?acces=${CLE}`, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(4000);
for (let i = 0; i < 5; i++) {
  const passer = p.getByRole("button", { name: /^Passer$/ });
  if (await passer.isVisible().catch(() => false)) { await passer.click(); await p.waitForTimeout(400); } else break;
}
const connecte = await p.evaluate(() => !/Je suis assistante maternelle/.test(document.body.innerText));
if (!connecte) { console.error("\n  KO  la session n'est pas ouverte : le contrôle ne vérifierait rien\n"); await N.close(); process.exit(1); }

// Le libelle d'un champ, tel qu'une utilisatrice le voit : son label, son
// placeholder, son aria-label, ou a defaut le texte qui le precede.
const INDICE = `(c) => {
  const bouts = [c.getAttribute("name"), c.getAttribute("placeholder"), c.getAttribute("aria-label"), c.id];
  if (c.id) { const l = document.querySelector('label[for="' + c.id + '"]'); if (l) bouts.push(l.innerText); }
  const pere = c.closest("label"); if (pere) bouts.push(pere.innerText);
  let n = c.previousElementSibling; let g = 0;
  while (n && g < 2) { if (n.innerText && n.innerText.length < 60) bouts.push(n.innerText); n = n.previousElementSibling; g++; }
  return bouts.filter(Boolean).join(" ").replace(/\\s+/g, " ").slice(0, 120);
}`;

// LA MOITIE DES FORMULAIRES SONT DERRIERE UN SOUS-ONGLET.
//
// Premiere version de ce controle : elle ne visitait que les 18 ecrans et ne
// remplissait que 42 champs. Les formulaires qui comptent — le contrat, la
// fiche enfant, la paie — vivent dans les sous-onglets de ces ecrans, et elle
// ne les voyait pas. On reconnait la barre a sa structure, comme le parcours
// des sous-onglets : le premier bloc dont tous les enfants sont des boutons
// courts.
// TOUTES les barres, pas la premiere.
//
// L'ecran « Paie & contrats » en a DEUX empilees : un groupe (Paie, Contrats,
// Fiscal...) puis les sections de ce groupe. Ne lire que la premiere laissait
// « Enregistrer le versement » hors d'atteinte — et c'est precisement la que
// j'avais casse le code pour verifier ce controle : il est passe au vert deux
// fois de suite sur un defaut volontaire. On enumere donc les barres, et on
// parcourt le deuxieme niveau pour chaque entree du premier.
const barresDe = () => p.evaluate(() => {
  const bar = [...document.querySelectorAll("div")].filter((d) =>
    d.children.length >= 2 && [...d.children].every((c) => c.tagName === "BUTTON") &&
    [...d.children].every((c) => c.innerText.trim().length > 0 && c.innerText.trim().length < 40));
  // Les barres imbriquees l'une dans l'autre comptent pour une : on garde les
  // plus exterieures, et on relit la page apres chaque clic de toute facon.
  return bar.filter((d, i) => !bar.some((o, j) => j !== i && o.contains(d)))
    .slice(0, 3)
    .map((d) => [...d.children].map((b) => b.innerText.replace(/\s+/g, " ").trim()));
});

// Les chemins a parcourir : la page nue, chaque entree du premier niveau, puis
// chaque entree du second niveau sous elle.
const cheminsDe = async (ecran) => {
  const chemins = [[]];
  const n1 = (await barresDe())[0] || [];
  for (const a of n1) {
    chemins.push([a]);
    await p.evaluate((x) => window.dispatchEvent(new CustomEvent("timat:page", { detail: x })), ecran);
    await p.waitForTimeout(700);
    const ok = await p.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => x.innerText.replace(/\s+/g, " ").trim() === t); if (!b) return false; b.click(); return true; }, a);
    if (!ok) continue;
    await p.waitForTimeout(1100);
    const barres = await barresDe();
    for (const nom of (barres[1] || [])) if (!n1.includes(nom)) chemins.push([a, nom]);
  }
  return chemins;
};

// Suivre un chemin : revenir a l'ecran, puis cliquer les onglets dans l'ordre.
const suivre = async (ecran, chemin) => {
  await p.evaluate((x) => window.dispatchEvent(new CustomEvent("timat:page", { detail: x })), ecran);
  await p.waitForTimeout(700);
  for (const nom of chemin) {
    const ok = await p.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => x.innerText.replace(/\s+/g, " ").trim() === t); if (!b) return false; b.click(); return true; }, nom);
    if (!ok) return false;
    await p.waitForTimeout(1100);
  }
  return true;
};

let ko = 0, remplis = 0, envois = 0;
console.log(`\n=== FORMULAIRES — on saisit puis on envoie (${ESPACE}, ${ECRANS.length} écrans) ===\n`);

for (const ecran of ECRANS) {
  await p.evaluate((x) => window.dispatchEvent(new CustomEvent("timat:page", { detail: x })), ecran);
  await p.waitForTimeout(1400);
  for (const chemin of await cheminsDe(ecran)) {
  if (!(await suivre(ecran, chemin))) continue;
  const retour = () => suivre(ecran, chemin);
  const ou = [ecran, ...chemin].join(" › ");

  // On ouvre les formulaires caches derriere un bouton (« Ajouter un enfant »,
  // « Nouveau contrat »...) : sans cela, la moitie des champs n'existent pas.
  // TOUS les boutons qui n'envoient pas, pas seulement ceux qui s'appellent
  // « Ajouter ». Premiere version : elle ne retenait que les libelles
  // commencant par ajouter/nouveau/creer, et elle a laisse passer une cassure
  // volontaire — « Enregistrer le versement » vit derriere un bouton qui ne
  // s'appelle rien de tout cela. C'est le parcours des boutons qui avait
  // raison : on ouvre tout, puis on remplit ce qui apparait.
  const ouvreurs = await p.evaluate((d) => {
    const re = new RegExp(d.source, d.flags), env = new RegExp(d.envoi, "i");
    return [...document.querySelectorAll("button")]
      .map((b) => (b.innerText || "").replace(/\s+/g, " ").trim())
      .filter((t) => t && t.length < 50 && !re.test(t) && !env.test(t));
  }, { source: DANGEREUX.source, flags: DANGEREUX.flags, envoi: ENVOI.source });

  for (const ouvreur of ["", ...new Set(ouvreurs)].slice(0, 26)) {
    await retour();
    if (ouvreur) {
      const fait = await p.evaluate((t) => {
        const b = [...document.querySelectorAll("button")].find((x) => (x.innerText || "").replace(/\s+/g, " ").trim() === t);
        if (!b || b.disabled) return false; b.click(); return true;
      }, ouvreur);
      if (!fait) continue;
      await p.waitForTimeout(900);
    }

    erreurs = [];
    // SAISIE — on remplit tout ce qui est visible, avec de vraies frappes.
    const champs = await p.evaluate((indice) => {
      const lire = eval(indice);
      return [...document.querySelectorAll("input,textarea,select")]
        .filter((c) => !c.disabled && !c.readOnly && c.offsetParent !== null && !["hidden","submit","button","file"].includes(c.type))
        .slice(0, 40)
        .map((c, i) => { c.setAttribute("data-verif", String(i)); return { i, type: c.type || c.tagName.toLowerCase(), balise: c.tagName.toLowerCase(), indice: lire(c) }; });
    }, INDICE);
    if (!champs.length) continue;

    const muets = [];
    for (const c of champs) {
      const sel = `[data-verif="${c.i}"]`;
      const l = p.locator(sel).first();
      try {
        if (c.balise === "select") { const o = await l.locator("option").nth(1).getAttribute("value").catch(() => null); if (o) await l.selectOption(o); continue; }
        if (c.type === "checkbox" || c.type === "radio") { await l.check({ timeout: 1500 }); continue; }
        const v = VALEUR(c.indice, c.type);
        await l.fill(v, { timeout: 1500 });
        remplis++;
        // LE CHAMP QUI REFUSE LA FRAPPE. On relit ce qu'on vient d'ecrire : si
        // ce n'est pas la, le onChange ne rend pas la valeur au champ et
        // l'utilisatrice tape dans le vide.
        const relu = await l.inputValue().catch(() => null);
        if (relu !== null && relu === "" && v !== "") muets.push(c.indice || c.type);
      } catch (e) { /* champ masque entre-temps : il n'est pas a nous */ }
    }
    if (muets.length) { ko += muets.length; console.log(`  KO  ${ou}${ouvreur ? " › " + ouvreur : ""}`); muets.forEach((m) => console.log(`        le champ « ${m} » n'accepte pas la frappe : la valeur ne s'inscrit pas`)); }

    // ENVOI — uniquement les boutons qui enregistrent, et un seul par tour.
    const envoyeurs = await p.evaluate((d) => {
      const re = new RegExp(d.source, d.flags), env = new RegExp(d.envoi, "i");
      return [...document.querySelectorAll("button")]
        .map((b) => (b.innerText || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim())
        .filter((t) => t && t.length < 50 && !re.test(t) && env.test(t));
    }, { source: DANGEREUX.source, flags: DANGEREUX.flags, envoi: ENVOI.source });

    for (const libelle of [...new Set(envoyeurs)].slice(0, 4)) {
      erreurs = [];
      const fait = await p.evaluate((t) => {
        const b = [...document.querySelectorAll("button")].find((x) => ((x.innerText || x.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim()) === t);
        if (!b || b.disabled) return false; b.click(); return true;
      }, libelle);
      if (!fait) continue;
      envois++;
      await p.waitForTimeout(1100);

      const dur = erreurs.find((e) => CODE_MANQUANT.test(e));
      const ecrit = await p.evaluate(() => document.body.innerText);
      const sale = ecrit.match(/\bNaN\b|Invalid Date|\[object Object\]|undefined ?€|€ ?undefined/);
      const pb = [];
      if (dur) pb.push(`le code casse à l'envoi : ${dur.slice(0, 130)}`);
      if (sale) pb.push(`« ${sale[0]} » s'affiche après l'envoi : une valeur saisie n'est pas lue`);
      if (pb.length) { ko += pb.length; console.log(`  KO  ${ou}${ouvreur ? " › " + ouvreur : ""} › ${libelle}`); pb.forEach((x) => console.log(`        ${x}`)); }
    }
  }
  }
}

await N.close();
console.log(`\n${remplis} champs remplis, ${envois} envois.`);
console.log(ko ? `${ko} problème(s) sur les formulaires.\n` : `Aucun formulaire ne casse à la saisie ni à l'envoi.\n`);
process.exit(ko ? 1 : 0);
