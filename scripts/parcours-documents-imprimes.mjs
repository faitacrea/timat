// Ouvre les documents que l'application imprime dans une nouvelle fenetre.
//
// Pourquoi : ce ne sont pas des PDF mais des pages HTML ecrites avec
// document.write, et aucun parcours ne les avait jamais ouvertes. La conversion
// des emoji en icones y avait laisse des balises <IconeOuEmoji/> — un composant
// React, que le navigateur ne sait pas afficher. Six icones avaient ainsi
// disparu du recapitulatif Pajemploi, celui qu'on imprime pour declarer, sans
// que rien ne le signale : ni le build, ni l'audit, ni les autres parcours.
//
// Le compte de demonstration n'est pas Pro : cet ecran y est remplace par un
// refus. Il faut donc une session Pro simulee, comme pour le bulletin.
//
//   node scripts/parcours-documents-imprimes.mjs [url]
import { chromium } from "playwright";
import { BUNDLE_TESTABLE, CHROMIUM } from "./jeu-de-donnees.mjs";
import { readFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";
import { lireApp } from "./sources-app.mjs";

// L'adresse est le premier argument qui ressemble a une adresse, et le mode
// peut venir seul : l'integration continue separe les arguments par « : »,
// ce qui casserait « http://localhost:4173 » si on devait le passer en premier.
const URL_BASE = process.argv.slice(2).find((a) => /^https?:\/\//.test(a)) || "http://localhost:4173";
// Passe « sous-minimum » : le contrat porte un taux illegal, l'alerte doit sortir.
const SOUS_MINIMUM = process.argv[3] === "sous-minimum";
// Passe « revalorise » : le contrat reel de la base. Signe le 5 janvier 2026 a
// 4,05 EUR — conforme alors (minimum 3,64 EUR) — mais sous le minimum depuis le
// 1er juin 2026 (4,20 EUR, avenant n° 10). L'ecran du contrat comparait au
// minimum de la date de debut et ne disait rien.
const REVALORISE = process.argv.slice(2).includes("revalorise");
// Passe « annee-incomplete » : accueil sur 36 semaines. La mensualisation doit
// tomber a 504 EUR au lieu de 728 — l'application appliquait 52 semaines a tous
// les contrats.
// Lu comme « revalorise » : l'integration continue passe le mode seul, en
// premier argument, et « argv[3] » ne le voyait pas.
const ANNEE_INCOMPLETE = process.argv.slice(2).includes("annee-incomplete");
// Passe « envoye » : le bulletin du mois a deja ete envoye au parent. Le
// bandeau annoncait « disponible dans Documents » sans donner le moyen de
// l'ouvrir : il fallait quitter l'ecran pour relire ce qu'on venait d'envoyer.
const DEJA_ENVOYE = process.argv[3] === "envoye" || process.argv[3] === "envoye-ancien";
// Passe « envoye-ancien » : le bulletin a ete envoye AVANT la refonte du
// modele. Le PDF stocke n'est jamais recalcule : l'application doit le dire.
const BULLETIN_ANCIEN = process.argv[3] === "envoye-ancien";
const SORTIE = "/tmp/timat-imprimes";
const src = lireApp();
const CLE = (src.match(/MAINTENANCE_CLE\s*=\s*"([^"]+)"/) || [])[1];
if (!CLE) { console.error("Clé d'accès introuvable."); process.exit(1); }

const chercherChromium = () => {
  const racine = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!racine || !existsSync(racine)) return undefined;
  for (const d of readdirSync(racine).filter((x) => x.startsWith("chromium-")).sort().reverse()) {
    const bin = path.join(racine, d, "chrome-linux", "chrome");
    if (existsSync(bin)) return bin;
  }
  return undefined;
};

const UID = "11111111-1111-4111-8111-111111111111";
const EID = "22222222-2222-4222-8222-222222222222";
const now = new Date();
const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const session = {
  access_token: "faux", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "faux",
  user: { id: UID, aud: "authenticated", role: "authenticated", email: "marie@test.fr",
    app_metadata: {}, user_metadata: { prenom: "Marie", nom: "Test", role: "asmat" },
    created_at: new Date().toISOString() },
};

mkdirSync(SORTIE, { recursive: true });
const nav = await chromium.launch({ executablePath: CHROMIUM() });
const ctx = await nav.newContext({ viewport: { width: 900, height: 1000 } });
const page = await ctx.newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message.slice(0, 200)));

await ctx.addInitScript(([s, cle]) => {
  try {
    localStorage.setItem("timat_acces", cle);
    localStorage.setItem("sb-akicyckmbsjnewnvvcil-auth-token", JSON.stringify(s));
  } catch (e) { /* stockage indisponible : la page reste testable */ }
}, [session, CLE]);

const json = (b) => ({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
await ctx.route("**/auth/v1/**", (r) => r.fulfill(json({ ...session, ...session.user })));
await ctx.route("**/rest/v1/**", (r) => {
  const t = (r.request().url().match(/rest\/v1\/([a-z_]+)/) || [])[1];
  if (t === "profiles") return r.fulfill(json([{ id: UID, role: "asmat", prenom: "Marie", nom: "Test", email: "marie@test.fr", subscription_status: "pro", is_admin: false }]));
  if (t === "enfants") return r.fulfill(json([{ id: EID, asmat_id: UID, prenom: "Léo", naissance: "2023-03-01", emoji: "🦁", couleur: "#E4915F" }]));
  if (t === "contrats") return r.fulfill(json([{ id: "c1", enfant_id: EID, asmat_id: UID, debut: REVALORISE ? "2026-01-05" : "2026-01-01", fin: "2027-08-31", heures_hebdo: 40, taux_horaire: SOUS_MINIMUM ? 3.5 : REVALORISE ? 4.05 : 4.20, annee_complete: !ANNEE_INCOMPLETE, semaines_accueil: ANNEE_INCOMPLETE ? 36 : null, entretien: 3.8, jours: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"], horaires: "07h30–17h30" }]));
  // Quatre journees : 8 h de maladie, 8 h de formation sur le temps d'accueil,
  // 8 h de fermeture, 6 h de formation hors temps d'accueil. Seules la maladie
  // et la fermeture se deduisent ; la formation hors accueil ouvre droit a
  // l'allocation, qui n'est PAS une ligne de salaire.
  if (t === "versements") return r.fulfill(json([
    { id: "v1", enfant_id: EID, montant: 728, date: `${mk}-05`, mode: "virement", periode: mk, note: "" },
    { id: "v2", enfant_id: EID, montant: 728, date: `${mk}-05`, mode: "virement", periode: mk, note: "" },
  ]));
  if (t === "pointages") return r.fulfill(json([
    { id: "p1", enfant_id: EID, date: `${mk}-02`, arrivee: "07:30", depart: "17:30", total_minutes: 600 },
    { id: "p2", enfant_id: EID, date: `${mk}-03`, arrivee: "07:30", depart: "17:30", total_minutes: 600 },
  ]));
  if (t === "evenements") return r.fulfill(json([
    { id: "e-mal", asmat_id: UID, date: `${mk}-03`, type: "mal", texte: "Maladie", heures: 8 },
    { id: "e-frm", asmat_id: UID, date: `${mk}-10`, type: "form", texte: "Formation", heures: 8 },
    { id: "e-fer", asmat_id: UID, date: `${mk}-17`, type: "fer", texte: "Fermeture", heures: 8 },
    { id: "e-fmh", asmat_id: UID, date: `${mk}-24`, type: "formh", texte: "Formation du soir", heures: 6 },
  ]));
  if (t === "bulletins" && DEJA_ENVOYE) return r.fulfill(json([{
    mois: mk, annee: Number(mk.slice(0, 4)), contrat_id: "c1", enfant_id: EID,
    envoye_au_parent: true, date_envoi: BULLETIN_ANCIEN ? "2026-08-01T10:00:00Z" : new Date().toISOString(),
    pdf_storage_path: UID + "/bulletins/" + mk + ".pdf",
  }]));
  return r.fulfill(json([]));
});

await page.goto(`${URL_BASE}/?acces=${CLE}`, { waitUntil: "domcontentloaded" });
// LE PIÈGE DU BUNDLE SANS CLÉ : « npm run build » construit sans
// VITE_SUPABASE_KEY, l'application retombe alors sur la page vitrine sans
// un mot, et ce contrôle rendrait un KO qui n'existe pas. verif-avis a
// accusé un code sain pour cette raison exacte.
if(!await BUNDLE_TESTABLE(page)){await nav.close();process.exit(1);}
await page.waitForTimeout(4000);
const passer = async () => {
  for (let i = 0; i < 6; i++) {
    const b = page.getByRole("button", { name: /^Passer$/ });
    if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(400); } else break;
  }
};
await passer();
const clic = (t) => page.evaluate((t) => {
  const L = (b) => b.innerText.split("\n")[0].trim();
  const n = [...document.querySelectorAll("button")].find((b) => L(b) === t)
    || [...document.querySelectorAll("button")].find((b) => L(b).includes(t));
  if (n) { n.click(); return true; }
  return false;
}, t);

let ko = 0;
const dire = (ok, quoi, detail = "") => { if (!ko && !ok) {} if (!ok) ko++; console.log(`  ${ok ? "ok " : "KO "} ${quoi.padEnd(58)} ${detail}`); };
console.log("\n=== DOCUMENTS IMPRIMÉS — pages ouvertes dans une nouvelle fenêtre ===\n");

const ouvrirEtLire = async (chemin, bouton, nom) => {
  for (const t of chemin) { await clic(t); await page.waitForTimeout(1200); }
  const [onglet] = await Promise.all([
    ctx.waitForEvent("page", { timeout: 8000 }).catch(() => null),
    clic(bouton),
  ]);
  if (!onglet) {
    const boutons = await page.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.innerText.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 30));
    dire(false, `${nom} : la fenêtre ne s'ouvre pas`, "boutons : " + boutons.join(" | "));
    return null;
  }
  await onglet.waitForLoadState("domcontentloaded").catch(() => {});
  await onglet.waitForTimeout(700);
  const html = await onglet.content();
  const texte = await onglet.evaluate(() => document.body.innerText).catch(() => "");
  await onglet.screenshot({ path: `${SORTIE}/${nom}.png`, fullPage: true }).catch(() => {});
  await onglet.close();
  return { html, texte };
};

if (REVALORISE) {
  console.log("  — l'écran du contrat, sur un contrat devenu non conforme —");
  for (const t of ["Administratif", "Paie & Contrats", "Contrats"]) { await clic(t); await page.waitForTimeout(1200); }
  const ecran = await page.evaluate(() => document.body.innerText);
  dire(/sous le minimum légal/i.test(ecran), "l'écran du contrat signale le taux sous le minimum",
    (ecran.match(/.{0,40}minimum légal.{0,60}/i) || ["(aucune alerte)"])[0]);
  // On lit l'ALERTE, pas toute la page : « revalorisé » apparaît ailleurs sur
  // l'écran, et ma première version validait ce mot alors que l'alerte
  // n'existait même pas.
  const alerte = (ecran.match(/Taux horaire sous le minimum légal[\s\S]{0,400}/i) || [""])[0];
  dire(/4,20/.test(alerte), "l'alerte donne le minimum d'aujourd'hui, 4,20 €");
  dire(/revaloris/i.test(alerte), "elle explique que c'est le minimum qui a été revalorisé");
  dire(erreurs.length === 0, "aucune erreur JavaScript", erreurs.join(" | "));
  await page.screenshot({ path: `${SORTIE}/contrat-revalorise.png`, fullPage: true }).catch(() => {});
  await nav.close();
  console.log(ko ? `\n${ko} problème(s)\n` : "\nL'écran du contrat signale le contrat devenu non conforme.\n");
  process.exit(ko ? 1 : 0);
}

const recap = await ouvrirEtLire(["Administratif", "Paie & Contrats", "Facturation"], "Exporter vers Pajemploi", "recap-pajemploi");
if (recap) {
  dire(!/IconeOuEmoji/.test(recap.html), "aucun composant React laissé dans le HTML du récap");
  dire(/Récapitulatif Pajemploi/.test(recap.texte), "le récapitulatif s'affiche");
  dire(/🏛/.test(recap.texte), "les icônes de section s'affichent réellement");
  dire(/TOTAL VERSÉ/.test(recap.texte) && /Salaire NET à déclarer/.test(recap.texte), "le salaire à déclarer et le total versé sont distingués");
  dire(!/undefined|NaN|Infinity|\[Votre nom\]/.test(recap.texte), "aucune valeur manquante affichée");
  // L'indemnite d'entretien n'est pas du salaire : elle se declare a part et
  // ne subit pas les cotisations. Elle etait ajoutee au brut puis amputee de 22 %.
  dire(/ligne distincte/.test(recap.texte), "les indemnités sont annoncées sur une ligne distincte");
  dire(/Taux horaire brut \(contrat\)/.test(recap.texte), "le taux est présenté comme un brut");
  dire(!/Salaire net horaire/.test(recap.texte), "plus de « salaire net horaire » calculé par division");
  dire(/Marie Test/.test(recap.texte), "le nom de l'assistante maternelle s'affiche");
  dire(/<\/td><\/tr>/.test(recap.html), "le tableau du nom est bien refermé");
}

// --- Les autres documents imprimes, jamais ouverts jusqu'ici ---
const defauts = (nom, d) => {
  if (!d) return;
  dire(!/IconeOuEmoji/.test(d.html), `${nom} : aucun composant React laissé dans le HTML`);
  dire(!/undefined|NaN|Infinity/.test(d.texte), `${nom} : aucune valeur manquante affichée`);
  dire(!/\d+\.\d{2}\s*€/.test(d.texte), `${nom} : les montants s'écrivent avec une virgule`);
};

const att = await ouvrirEtLire(["Administratif", "Documents & Rapports", "Attestation France Travail" /* renomme : c'etait « Att. France Travail » */], "Voir / télécharger l'attestation", "attestation-france-travail");
defauts("attestation France Travail", att);
if (att) {
  // France Travail : l'attestation faite sur l'espace Pajemploi lui est
  // transmise automatiquement (« Nouveau service Pajemploi »).
  dire(/sur l'espace en ligne Pajemploi/i.test(att.texte) && /transmet automatiquement à France Travail/i.test(att.texte),
    "l'attestation dit que l'officielle passe par Pajemploi");
}

const recapVers = await ouvrirEtLire(["Administratif", "Documents & Rapports", "Récap. versements"], "Imprimer", "recap-versements");
defauts("récapitulatif des versements", recapVers);
if (recapVers) {
  console.log("\n--- texte du récapitulatif des versements ---");
  console.log(recapVers.texte.split("\n").filter(Boolean).slice(0, 40).join("\n"));
  console.log("--- fin ---\n");
}

const fin = await ouvrirEtLire(["Administratif", "Paie & Contrats", "Contrats", "Fin de contrat"], "Lettre de rupture", "lettre-rupture");
defauts("lettre de rupture", fin);

// --- LA RUPTURE POUR FAUTE GRAVE ---
//
// Convention collective IDCC 3239 : l'article 120 exclut le preavis « en cas de
// faute grave et faute lourde et de retrait impose aux parties », et l'article
// 121.1 exclut l'indemnite de rupture dans les memes cas. L'ecran ne proposait
// aucun de ces motifs et comptait preavis et indemnite dans tous les cas : une
// rupture pour faute grave annonçait un mois de salaire et une indemnite qui ne
// sont pas dus. Le reçu pour solde de tout compte, lui, detaillait un total
// dont il omettait l'indemnite de rupture : la somme ecrite ne correspondait
// pas a sa propre decomposition.
//
// On rejoue donc l'ecran avec le motif de faute grave et on lit les deux
// documents. Sur un solde de tout compte, c'est de l'argent reclame a un
// parent : rien ici ne doit rester a l'appreciation du lecteur.
const choisirMotif = (valeur) => page.evaluate((v) => {
  const sel = [...document.querySelectorAll("select")]
    .find((s) => [...s.options].some((o) => o.value.includes(v) || o.text.includes(v)));
  if (!sel) return false;
  const o = [...sel.options].find((x) => x.value.includes(v) || x.text.includes(v));
  sel.value = o.value;
  sel.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}, valeur);

// Le detail ne s'affiche qu'une fois la date de fin saisie et le calcul lance.
const dateFinPosee = await page.evaluate(() => {
  const i = document.querySelector('input[type="date"]');
  if (!i) return false;
  const d = new Date(); d.setMonth(d.getMonth() + 1);
  const v = d.toISOString().slice(0, 10);
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(i, v);
  i.dispatchEvent(new Event("input", { bubbles: true }));
  i.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
});
dire(dateFinPosee, "la date de fin de contrat est saisissable");
await page.waitForTimeout(400);
await clic("Calculer le solde de tout compte");
await page.waitForTimeout(800);

// Le total ecrit sur le reçu doit etre exactement la somme des montants qu'il
// detaille. C'est au motif par defaut que ça compte : preavis ET indemnite de
// rupture sont dus, et c'est justement l'indemnite de rupture que le detail
// oubliait — le reçu annonçait donc une somme superieure a sa decomposition.
const sommeDuRecu = async (nom, cle) => {
  const d = await ouvrirEtLire([], "Reçu pour solde de tout compte", cle);
  defauts(`reçu (${nom})`, d);
  if (!d) return;
  const montants = [...d.texte.matchAll(/(\d[\d  ]*,\d{2})\s*€/g)]
    .map((m) => Number(m[1].replace(/[  ]/g, "").replace(",", ".")));
  const total = montants[0];
  const detail = montants.slice(1);
  const somme = Math.round(detail.reduce((a, b) => a + b, 0) * 100) / 100;
  dire(detail.length > 0, `reçu (${nom}) : le total est décomposé`, "détail : " + detail.join(" + "));
  dire(Math.abs(total - somme) < 0.02,
    `reçu (${nom}) : le total est exactement la somme de son détail`,
    `total ${total} / détail ${detail.join(" + ")} = ${somme}`);
};
await sommeDuRecu("retrait de l'enfant", "recu-retrait");

// --- LES MOTIFS EUX-MEMES ---
//
// La liste proposait « Démission du parent » et « Rupture amiable » (la rupture
// conventionnelle n'est pas applicable aux assistants maternels : DREETS
// Bourgogne-Franche-Comte, juin 2026, fiche 10-IV), et calculait la retraite
// comme un retrait de l'enfant, indemnite de rupture comprise. La demission
// de l'assistante maternelle n'y figurait pas.
const optionsMotif = await page.evaluate(() => {
  const sel = [...document.querySelectorAll("select")]
    .find((s) => [...s.options].some((o) => o.text.includes("Faute grave")));
  return sel ? [...sel.options].map((o) => o.text) : [];
});
dire(!optionsMotif.some((t) => /Rupture amiable|Rupture conventionnelle|Démission du parent/.test(t)),
  "aucun motif inapplicable (rupture amiable ou conventionnelle, « démission du parent »)", optionsMotif.join(" | "));
for (const [motif, attendu, nom] of [
  ["Démission de l'assistante maternelle", /Non due : démission/, "démission"],
  ["Départ volontaire à la retraite", /Non due : départ volontaire à la retraite/, "retraite"],
  ["Fin d'un CDD", /précarité/, "fin de CDD"],
]) {
  const pose = await choisirMotif(motif);
  dire(pose, `le motif « ${nom} » est proposé à l'écran`);
  if (!pose) continue;
  await page.waitForTimeout(600);
  const ecran = await page.evaluate(() => document.body.innerText);
  dire(attendu.test(ecran), `${nom} : l'écran applique ses propres règles`,
    (ecran.match(/.{0,80}(Non due|précarité).{0,80}/) || [""])[0]);
  await sommeDuRecu(nom, `recu-${nom.replace(/\W+/g, "-")}`);
}

const motifPose = await choisirMotif("Faute grave");
dire(motifPose, "le motif « faute grave » est proposé à l'écran");
if (motifPose) {
  await page.waitForTimeout(600);
  const ecran = await page.evaluate(() => document.body.innerText);
  dire(/Pas de préavis/.test(ecran), "l'écran dit qu'aucun préavis n'est dû",
    (ecran.match(/.{0,60}préavis.{0,60}/i) || [""])[0]);
  dire(!/préavis \(0 jours\)|0 jours calendaires/.test(ecran), "aucun « préavis de 0 jours » affiché");
  dire(/Non due : faute grave/.test(ecran), "l'indemnité de rupture est annoncée non due, avec son motif");

  const lettre = await ouvrirEtLire([], "Lettre de rupture", "lettre-rupture-faute-grave");
  defauts("lettre de rupture (faute grave)", lettre);
  if (lettre) {
    dire(/sans préavis/.test(lettre.texte), "la lettre écrit « sans préavis » au lieu de « préavis de 0 jours »");
    dire(!/préavis de 0 jours|préavis de <b>0/.test(lettre.texte), "la lettre ne parle pas d'un préavis de 0 jours");
  }

  await sommeDuRecu("faute grave", "recu-faute-grave");
}

// --- ARRIVEE D'UN ENFANT AU FOYER DE L'ASSISTANTE MATERNELLE (art. 103) ---
//
// Le motif manquait. Il rompt le contrat sans preavis ni indemnite de rupture
// (procedure du retrait force, art. 119.3 ; DREETS BFC, fiche 10-III).
const arriveePose = await choisirMotif("Arrivée d'un enfant au foyer");
dire(arriveePose, "le motif « arrivée d'un enfant au foyer » est proposé à l'écran");
if (arriveePose) {
  await page.waitForTimeout(600);
  const ecran = await page.evaluate(() => document.body.innerText);
  dire(/Non due : arrivée d'un enfant au foyer/.test(ecran), "arrivée d'un enfant : indemnité de rupture non due, avec son motif",
    (ecran.match(/.{0,60}Non due.{0,80}/) || [""])[0]);
  dire(/Pas de préavis : arrivée d'un enfant au foyer/.test(ecran), "arrivée d'un enfant : pas de préavis, avec sa raison");
  dire(/au moins un mois avant l'arrivée de votre enfant/.test(ecran), "arrivée d'un enfant : le délai d'un mois pour prévenir est rappelé");
  await sommeDuRecu("arrivée d'un enfant", "recu-arrivee-enfant");
}

// --- LA REGULARISATION EN ANNEE INCOMPLETE (art. 109-2 et 124) ---
//
// Contrat de la passe : 40 h sur 36 semaines, soit 120 h payees par mois.
// Avec 100 h faites de plus que payees, au taux de 4,20 EUR, la
// regularisation vaut 420 EUR, et le reçu doit la detailler. Avec moins
// d'heures faites que payees, rien n'est du : le trop-percu reste acquis.
await choisirMotif("Retrait de l'enfant");
await page.waitForTimeout(500);
if (ANNEE_INCOMPLETE) {
  const bloc = page.locator("[data-regularisation]");
  dire(await bloc.count() === 1, "année incomplète : le bloc de régularisation est affiché");
  const payees = await page.evaluate(() => {
    const champs = document.querySelectorAll("[data-regularisation] input");
    return champs[1] ? Number(String(champs[1].value).replace(",", ".")) : NaN;
  });
  dire(payees > 0 && Math.abs(payees / 120 - Math.round(payees / 120)) < 1e-9,
    "les heures payées proposées sont un multiple de 120 h (40 h × 36 semaines ÷ 12)", String(payees));
  const texteBloc = await bloc.innerText().catch(() => "");
  dire(/Heures pointées dans TiMat sur le contrat : 20,00 h/.test(texteBloc),
    "les heures pointées sont proposées (2 journées de 10 h, même semaine)", texteBloc.replace(/\s+/g, " ").slice(0, 160));
  await page.locator("[data-regularisation] input").first().fill(String(payees + 100));
  await page.locator("[data-regularisation] input").first().blur();
  await page.waitForTimeout(400);
  let ecran = await page.evaluate(() => document.body.innerText);
  dire(/Régularisation de salaire \(année incomplète\)\s*420,00\s*€/.test(ecran),
    "100 h faites et non payées à 4,20 € : 420,00 € de régularisation", (ecran.match(/Régularisation de salaire.{0,140}/s) || [""])[0].replace(/\s+/g, " "));
  const recuRegul = await ouvrirEtLire([], "Reçu pour solde de tout compte", "recu-regularisation");
  if (recuRegul) dire(/régularisation de salaire \(année incomplète\) 420,00/.test(recuRegul.texte), "le reçu détaille la régularisation");
  await sommeDuRecu("régularisation", "recu-regularisation-somme");
  await page.locator("[data-regularisation] input").first().fill(String(payees - 50));
  await page.locator("[data-regularisation] input").first().blur();
  await page.waitForTimeout(400);
  ecran = await page.evaluate(() => document.body.innerText);
  dire(/Rien à régulariser/.test(ecran), "moins d'heures faites que payées : rien à régulariser, le trop-perçu reste acquis");
} else {
  dire(await page.locator("[data-regularisation]").count() === 0, "année complète : pas de bloc de régularisation");
}

// --- LA DATE DE FIN DU PREAVIS ---
//
// Le simulateur public la donnait, l'ecran non. Le calcul lui-meme est teste
// (test-retenue) et compare au site (verif-calculs-identiques) ; on verifie ici
// que l'ecran l'affiche, et que « Reporter en date de fin » pose bien CETTE
// date dans le champ de la date de fin, sans la decaler d'un jour.
await choisirMotif("Retrait de l'enfant");
await page.waitForTimeout(400);
const notifPosee = await page.evaluate(() => {
  const champs = document.querySelectorAll('input[type="date"]');
  if (champs.length < 2) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(champs[1], "2027-01-31");
  champs[1].dispatchEvent(new Event("input", { bubbles: true }));
  champs[1].dispatchEvent(new Event("change", { bubbles: true }));
  return true;
});
dire(notifPosee, "la date de départ du préavis est saisissable");
await page.waitForTimeout(500);
const finAffichee = await page.evaluate(() => document.querySelector("[data-fin-preavis]")?.innerText || "");
const mFin = finAffichee.match(/Fin du préavis : le (\d{1,2}) (\S+) (\d{4}) inclus/);
dire(!!mFin, "l'écran affiche la date de fin du préavis", finAffichee.slice(0, 120));
if (mFin) {
  await clic("Reporter en date de fin");
  await page.waitForTimeout(400);
  const posee = await page.evaluate(() => document.querySelector('input[type="date"]')?.value || "");
  const lue = posee ? new Date(posee + "T00:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";
  dire(lue === `${mFin[1]} ${mFin[2]} ${mFin[3]}`, "« Reporter en date de fin » pose la même date", `affichée ${mFin[0]} / posée ${posee}`);
}

dire(erreurs.length === 0, "aucune erreur JavaScript", erreurs.join(" | "));
await nav.close();
console.log(ko ? `\n${ko} problème(s)\n` : `\nTout est conforme. Captures dans ${SORTIE}\n`);
process.exit(ko ? 1 : 0);
