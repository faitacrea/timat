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
// CE QU'IL NE COUVRE PAS ENCORE — a lire avant de se fier a son vert.
//
// Mesure du 3 octobre 2026 : 249 champs remplis et 216 envois, mais TOUS sur
// l'ecran « accueil ». Les huit autres ecrans de la premiere moitie n'ont
// produit aucun envoi. Le chiffre global (763 champs, 213 envois) donnait donc
// une impression de couverture que la realite ne porte pas — c'est pour cela
// que le controle nomme desormais les ecrans ou il n'atteint rien.
//
// Deux causes identifiees, aucune encore reparee :
//
//   1. L'interception renvoie un tableau vide pour presque toutes les tables.
//      La messagerie n'a donc aucun echange, la paie aucun bulletin, les
//      versements aucune ligne : les formulaires qui en dependent ne
//      s'affichent pas. La section « Versements recus » ne rend rien du tout
//      dans ce harnais — c'est la que j'avais casse le code pour verifier ce
//      controle, et c'est pour cela qu'il est passe au vert deux fois sur un
//      defaut volontaire. Il faut donner au harnais un jeu de donnees
//      plausible, table par table.
//
//   2. Sur la messagerie, le bouton « Envoyer » est trouve mais DESACTIVE au
//      moment du clic, alors que la saisie dans le textarea a bien pris (aucun
//      champ muet signale). Un rendu intervient entre la frappe et le clic et
//      remet l'etat a zero. Il faudra attendre que le bouton s'active plutot
//      que de cliquer a l'aveugle.
//
// Ce qui EST prouve : la barriere attrape bien un defaut place expres. Le
// handler derriere « Envoyer l'invitation » casse, et les huit envois du
// parcours le signalent.
//
// Hors chaine de build : Vercel n'a pas de navigateur.
//   node scripts/verif-formulaires.mjs [asmat|parent] [ecran,ecran...]
//   TRACE=1 pour lister chaque envoi, donc la portee reelle.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
// Le jeu de donnees du harnais : de vraies lignes, aux colonnes de la vraie
// base. Sans elles, la moitie des ecrans n'affiche aucun formulaire.
import { REPONSE, UID, EID, PID } from "./jeu-de-donnees.mjs";
const CLE = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8").match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/)[1];
const ESPACE = process.argv[2] || "asmat";
// Troisieme argument : les ecrans a parcourir, separes par une virgule. Le tour
// complet depasse la demi-heure ; pour PROUVER que le filet atteint un endroit
// precis, on ne parcourt que celui-la.
const CHOISIS = (process.argv[3] || "").split(",").map((x) => x.trim()).filter(Boolean);

const ECRANS = ESPACE === "parent"
  ? ["accueil","journee","pointage","suivi_progres","sante_urgence","autorisations","calendrier","messagerie","aides_simulateurs","admin_finances","documents_complet","mes_alertes","faq"]
  : ["accueil","journee","pointage","suivi_progres","sante_urgence","autorisations","calendrier","messagerie","paie_contrats","documents_rapports","inviter_parent","reprise_contrat","liste_attente","page_vitrine","mes_employeurs","pmi","mes_alertes","faq"];

const ECRANS_A_FAIRE = () => CHOISIS.length ? ECRANS.filter((e) => CHOISIS.includes(e)) : ECRANS;

const DANGEREUX = /supprim|effac|r[ée]sili|d[ée]connex|se d[ée]connecter|payer|abonner|archiver|r[ée]initialis|vider|quitter|annuler mon|retirer|d[ée]sactiver mon/i;
// Les libelles qui envoient : on ne clique que ceux-la, apres avoir rempli.
// Les libelles qui envoient — ET les boutons qui n'ont qu'un signe pour tout
// libelle. La messagerie envoie par une fleche « ➤ » : sans elle dans cette
// liste, l'ecran entier passait pour depourvu de formulaire.
//
// « ▶ » en revanche a ete RETIREE : c'est la fleche qui change de jour sur le
// cahier du jour, pas un envoi. Le parcours la prenait pour un bouton
// d'enregistrement et tournait dessus jusqu'a epuiser son temps, sans jamais
// atteindre « Enregistrer le mot du jour ». Un signe ne dit pas ce qu'il fait :
// seuls ceux dont le sens est sans ambiguite entrent dans cette liste.
const ENVOI = /enregistr|valider|ajouter|cr[ée]er|envoyer|g[ée]n[ée]rer|calculer|inviter|confirmer|appliquer|sauvegarder|publier|simuler|rechercher|continuer|terminer|^(?:➤|✓|✔|💾|📧)$/i;
const CODE_MANQUANT = /is not defined|is not a function|cannot read propert|undefined is not|null is not an object/i;

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
  return r.fulfill(json(REPONSE(t, ESPACE === "parent" ? "parent" : "asmat")));
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
    await p.waitForTimeout(500);
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
    await p.waitForTimeout(500);
  }
  return true;
};

let ko = 0, remplis = 0, envois = 0;
// CE QUE LE FILET N'ATTEINT PAS, IL DOIT LE DIRE.
//
// Un ecran qui ne produit aucun envoi n'est pas un ecran sain : c'est un ecran
// que ce controle ne protege pas. Le taire rendrait le vert mensonger — c'est
// exactement ce qui s'est passe ici : la section « Versements recus » ne
// s'affiche pas dans ce harnais, et le controle a donc annonce deux fois
// « aucun formulaire ne casse » sur un defaut que j'y avais mis expres.
const portee = new Map();
const inactifs = [];
const dejaEnvoyes = new Set();
console.log(`\n=== FORMULAIRES — on saisit puis on envoie (${ESPACE}, ${ECRANS_A_FAIRE().length} écrans) ===\n`);

for (const ecran of ECRANS_A_FAIRE()) {
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

  for (const ouvreur of ["", ...new Set(ouvreurs)].slice(0, 14)) {
    await retour();
    if (ouvreur) {
      const fait = await p.evaluate((t) => {
        const b = [...document.querySelectorAll("button")].find((x) => (x.innerText || "").replace(/\s+/g, " ").trim() === t);
        if (!b || b.disabled) return false; b.click(); return true;
      }, ouvreur);
      if (!fait) continue;
      await p.waitForTimeout(500);
    }

    // ON LIT LES BOUTONS D'ENVOI AVANT DE REMPLIR.
    //
    // Remplir coute cher : c'est lui, et pas les envois, qui faisait durer un
    // seul ecran sept minutes — 340 champs remplis pour six envois utiles. Si
    // un chemin n'offre aucun envoi qu'on n'ait pas deja exerce sur cet ecran,
    // on l'abandonne sans rien saisir.
    //
    // Le prix de ce raccourci : un bouton d'envoi qui n'APPARAITRAIT qu'apres
    // la saisie resterait invisible. Un bouton seulement desactive, lui, est vu
    // — la lecture ne regarde pas son etat.
    const envoyeurs = await p.evaluate((d) => {
      const re = new RegExp(d.source, d.flags), env = new RegExp(d.envoi, "i");
      return [...document.querySelectorAll("button")]
        .map((b) => (b.innerText || b.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim())
        .filter((t) => t && t.length < 50 && !re.test(t) && env.test(t));
    }, { source: DANGEREUX.source, flags: DANGEREUX.flags, envoi: ENVOI.source });
    const aFaire = [...new Set(envoyeurs)].filter((t) => !dejaEnvoyes.has(ecran + "|" + t));
    if (!aFaire.length) continue;

    erreurs = [];
    // SAISIE — on remplit tout ce qui est visible, avec de vraies frappes.
    const champs = await p.evaluate((indice) => {
      const lire = eval(indice);
      return [...document.querySelectorAll("input,textarea,select")]
        .filter((c) => !c.disabled && !c.readOnly && c.offsetParent !== null && !["hidden","submit","button","file"].includes(c.type))
        .slice(0, 25)
        .map((c, i) => { c.setAttribute("data-verif", String(i)); return { i, type: c.type || c.tagName.toLowerCase(), balise: c.tagName.toLowerCase(), indice: lire(c) }; });
    }, INDICE);
    if (!champs.length) continue;

    const muets = [];
    // UN RENDU PASSE ENTRE LA FRAPPE ET LE CLIC.
    //
    // Sur la messagerie, le bouton « Envoyer » etait bien trouve, mais
    // DESACTIVE au moment du clic, alors que la saisie dans le textarea avait
    // pris (aucun champ muet signale) : le chargement des donnees re-rend le
    // composant et remet son etat a zero. On remplit donc une seconde fois,
    // juste avant d'envoyer.
    const remplirTout = async (compter) => {
    for (const c of champs) {
      const sel = `[data-verif="${c.i}"]`;
      const l = p.locator(sel).first();
      try {
        if (c.balise === "select") { const o = await l.locator("option").nth(1).getAttribute("value").catch(() => null); if (o) await l.selectOption(o); continue; }
        if (c.type === "checkbox" || c.type === "radio") { await l.check({ timeout: 1500 }); continue; }
        const v = VALEUR(c.indice, c.type);
        await l.fill(v, { timeout: 1500 });
        if (compter) remplis++;
        // LE CHAMP QUI REFUSE LA FRAPPE. On relit ce qu'on vient d'ecrire : si
        // ce n'est pas la, le onChange ne rend pas la valeur au champ et
        // l'utilisatrice tape dans le vide.
        const relu = await l.inputValue().catch(() => null);
        if (compter && relu !== null && relu === "" && v !== "") muets.push(c.indice || c.type);
      } catch (e) { /* champ masque entre-temps : il n'est pas a nous */ }
    }
    };
    await remplirTout(true);
    if (muets.length) { ko += muets.length; console.log(`  KO  ${ou}${ouvreur ? " › " + ouvreur : ""}`); muets.forEach((m) => console.log(`        le champ « ${m} » n'accepte pas la frappe : la valeur ne s'inscrit pas`)); }

    for (const libelle of aFaire.slice(0, 4)) {
      // UN MEME ENVOI NE SE REFAIT PAS DEPUIS TRENTE CHEMINS.
      //
      // L'ecran « journee » a produit 243 envois pour huit boutons distincts :
      // le parcours rejouait « Enregistrer le mot du jour » depuis chaque
      // combinaison d'onglets et de boutons qui y menait. Cela ne verifie rien
      // de plus — le meme code s'execute — et cela rendait le tour complet
      // impossible a finir dans le temps imparti. Un bouton d'envoi est donc
      // exerce UNE fois par ecran.
      const empreinte = ecran + "|" + libelle;
      if (dejaEnvoyes.has(empreinte)) continue;
      dejaEnvoyes.add(empreinte);
      await remplirTout(false);
      await p.waitForTimeout(250);
      erreurs = [];
      const fait = await p.evaluate((t) => {
        const b = [...document.querySelectorAll("button")].find((x) => ((x.innerText || x.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim()) === t);
        if (!b) return "absent";
        if (b.disabled) return "inactif";
        b.click(); return "clique";
      }, libelle);
      if (fait === "absent") continue;
      // Un bouton d'envoi qui reste eteint alors que TOUS les champs visibles
      // sont remplis : on le compte et on le nomme. Ce n'est pas toujours un
      // defaut (certains attendent une selection ailleurs), mais c'est toujours
      // un endroit que ce controle ne traverse pas.
      if (fait === "inactif") { inactifs.push(`${ou}${ouvreur ? " › " + ouvreur : ""} › ${libelle}`); continue; }
      envois++;
      portee.set(ecran, (portee.get(ecran) || 0) + 1);
      // TRACE=1 : la liste de ce qu'on a reellement envoye. C'est ce qui dit la
      // PORTEE du controle — et donc ce qu'il ne protege pas.
      if (process.env.TRACE) console.log(`      → ${ou}${ouvreur ? " › " + ouvreur : ""} › ${libelle}`);
      await p.waitForTimeout(500);

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
const aveugles = ECRANS_A_FAIRE().filter((e) => !portee.get(e));
console.log(`\n${remplis} champs remplis, ${envois} envois sur ${ECRANS_A_FAIRE().length - aveugles.length} écran(s).`);
if (inactifs.length) {
  console.log(`\n  ${inactifs.length} bouton(s) d'envoi restés éteints alors que tous les champs visibles étaient remplis :`);
  [...new Set(inactifs)].slice(0, 20).forEach((x) => console.log(`        ${x}`));
}
if (aveugles.length) {
  console.log(`\n  Aucun formulaire atteint sur ${aveugles.length} écran(s) — ce contrôle ne les protège pas :`);
  aveugles.forEach((e) => console.log(`        ${e}`));
}
console.log(ko ? `${ko} problème(s) sur les formulaires.\n` : `Aucun formulaire ne casse à la saisie ni à l'envoi.\n`);
process.exit(ko ? 1 : 0);
