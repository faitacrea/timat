// Maquette du parcours « Déclarer à ma place » pour la demande d'accès à
// l'API Tierce Déclaration Pajemploi (Urssaf). Version de travail du
// 30/10/2026, faite à la demande de Sophie pour voir ce que ça donnerait,
// AVANT de connaître le format que l'Urssaf demandera : à reprendre dès que
// leur documentation (Portail API Urssaf) sera accessible.
//
// Ce qui est sûr (fiche officielle de l'API sur api.gouv.fr) : l'API sert à
// enregistrer et annuler le mandat du parent, estimer les cotisations et
// déclarer. Le reste (noms des champs, mentions exigées) n'est pas publié :
// la maquette le dit au lieu de l'inventer. Données d'exemple fictives.
//
//   node docs/urssaf/generer-maquette-api-pajemploi.mjs [dossier de sortie]
import { chromium } from "playwright";
import { CHROMIUM } from "../../scripts/jeu-de-donnees.mjs";
import { readFileSync, mkdirSync } from "node:fs";

const SORTIE = process.argv[2] || new URL(".", import.meta.url).pathname;
mkdirSync(SORTIE, { recursive: true });
const b64 = (p) => readFileSync(p).toString("base64");
const POLICE = b64(new URL("../reseaux-sociaux/police/quicksand-latin.woff2", import.meta.url));
const LOGO = "data:image/png;base64," + b64(new URL("../../public/logo.png", import.meta.url));

// Palette de l'espace parent de l'application (src/App.jsx, :root).
const C = { fond: "#FDFBF8", carte: "#FFFFFF", encre: "#2E4A5A", second: "#61565C", bord: "#EAE0E8",
  T: "#A94C2F", Tp: "#FDF6F4", Tl: "#F3CEC2", G: "#2F6B64", Gp: "#F2F8F7", R: "#B3261E", Rp: "#FCEBEA" };

// Exemple fictif : accueil de 45 h par semaine (9 h par jour, 5 jours),
// année complète, au minimum conventionnel de 4,20 EUR brut (3,28 EUR net,
// DREETS Pays de la Loire, 12/06/2026). Mensualisation : 45 x 52 / 12 =
// 195 h ; 195 x 4,20 = 819,00 EUR brut ; 195 x 3,28 = 639,60 EUR net.
// Octobre 2026 : 22 jours ouvrés, sans jour férié ; indemnité d'entretien
// de 3,92 EUR par journée de 9 h, soit 86,24 EUR.
const ex = { parent: "Camille Martin", am: "Julie Bernard", enfant: "Léo", mois: "octobre 2026",
  jours: 22, heures: "195,00", net: "639,60", entretien: "86,24", repas: "0,00" };

const telephone = (titre, corps) => `
  <div class="tel"><div class="barre"><span>9:41</span><span>●●● ▮</span></div>
    <div class="entete"><span class="retour">‹</span><span>${titre}</span><img src="${LOGO}"></div>
    <div class="ecran">${corps}</div></div>`;

const page = (n, titre, explication, ecran, note = "") => `
  <section class="page">
    <div class="haut"><span class="num">${n}</span><h2>${titre}</h2></div>
    <div class="cols">
      <div class="texte">${explication}${note ? `<div class="note">${note}</div>` : ""}</div>
      ${ecran}
    </div>
    <div class="pied">TiMat · Maquette « Déclarer à ma place » · version de travail du 30 octobre 2026 · données fictives</div>
  </section>`;

const ligne = (g, d, gras = false) => `<div class="ligne${gras ? " gras" : ""}"><span>${g}</span><span>${d}</span></div>`;

const pages = [
`<section class="page couverture">
  <img class="logo" src="${LOGO}">
  <h1>Maquette du parcours « Déclarer à ma place »</h1>
  <p class="sous">Demande d'accès à l'API Tierce Déclaration Pajemploi (Urssaf)</p>
  <p class="meta">Version de travail du 30 octobre 2026 · données d'exemple fictives</p>
  <div class="bloc">
    <h3>L'éditeur</h3>
    <p>TiMat — Sophie Lefort, entrepreneur individuel, SIRET 902 648 088 00026 — www.timat.app<br>
    Application pour les assistantes maternelles et les parents employeurs : contrat, pointage signé des deux côtés, salaire mensualisé, congés payés, bulletins, récapitulatif Pajemploi.</p>
    <h3>Le principe</h3>
    <ul>
      <li>Le parent reste l'employeur : il donne son accord (mandat), vérifie et valide chaque déclaration avant l'envoi.</li>
      <li>TiMat ne reçoit ni ne verse aucune somme.</li>
      <li>Aucun appel à l'API sans mandat enregistré ; le mandat se retire à tout moment, en un geste.</li>
      <li>Les montants viennent du pointage signé par le parent et l'assistante maternelle, puis du calcul de l'Urssaf.</li>
    </ul>
    <h3>Les écrans</h3>
    <ol>
      <li>Information et accord du parent (mandat)</li>
      <li>Identifiants Pajemploi</li>
      <li>Récapitulatif du mois, issu du pointage</li>
      <li>Estimation par l'Urssaf et validation</li>
      <li>Confirmation de l'envoi</li>
      <li>Retrait de l'accord</li>
    </ol>
    <p class="avert">Cette maquette sera ajustée au format et aux mentions que l'Urssaf demandera : les noms exacts des champs et des services seront repris de la documentation du Portail API Urssaf.</p>
  </div>
</section>`,

page(1, "Information et accord du parent",
  `<p>Le parent découvre le service depuis son espace, dans « Paie &amp; Contrats », à côté du récapitulatif Pajemploi. L'écran dit clairement ce que TiMat fera, ce qui ne change pas, et comment revenir en arrière.</p>
   <p>Le bouton reste grisé tant que la case n'est pas cochée. À la validation, TiMat enregistre le mandat auprès de l'Urssaf ; sans mandat enregistré, aucune déclaration ne part.</p>`,
  telephone("Déclarer à ma place", `
    <div class="carte accent"><b>Pajemploi, sans ressaisie</b><p>Chaque mois, TiMat peut transmettre votre déclaration Pajemploi en votre nom, à partir du pointage signé avec ${ex.am}.</p></div>
    <div class="carte"><b>Ce qui ne change pas</b>
      <ul><li>Vous restez l'employeur de ${ex.am}.</li><li>Vous vérifiez et validez chaque déclaration avant l'envoi.</li><li>Les paiements restent entre vous, ${ex.am} et Pajemploi : TiMat ne reçoit aucune somme.</li><li>Vous pouvez retirer votre accord à tout moment.</li></ul></div>
    <label class="case"><span class="coche">✓</span><span>J'autorise TiMat, en tant que tiers déclarant, à effectuer en mon nom les déclarations Pajemploi pour l'emploi de ${ex.am}.</span></label>
    <div class="bouton">Donner mon accord</div>
    <p class="petit">Votre accord (mandat) est transmis à l'Urssaf. Conditions détaillées : lien vers la page d'information.</p>`),
  "Fonction de l'API utilisée : enregistrement du mandat."),

page(2, "Identifiants Pajemploi",
  `<p>TiMat a besoin des identifiants qui permettent à l'Urssaf de rattacher la déclaration au bon compte employeur et à la bonne salariée.</p>
   <p>Le parent les retrouve dans son espace pajemploi.urssaf.fr. TiMat les vérifie avant d'aller plus loin et dit précisément ce qui ne va pas si l'Urssaf les refuse.</p>`,
  telephone("Mes identifiants", `
    <div class="champ"><span>Mon numéro Pajemploi (employeur)</span><div class="saisie">• • • • • • • • 4 2</div></div>
    <div class="champ"><span>Numéro Pajemploi de ${ex.am}</span><div class="saisie">• • • • • • • • 1 7</div></div>
    <div class="champ"><span>Enfant accueilli</span><div class="saisie">${ex.enfant}</div></div>
    <div class="carte vert"><b>✓ Identifiants reconnus par l'Urssaf</b></div>
    <div class="bouton">Continuer</div>
    <p class="petit">Où trouver ces numéros : sur votre espace Pajemploi, rubrique « Mon compte ».</p>`),
  "Les champs exacts demandés seront ceux de la documentation de l'API."),

page(3, "Récapitulatif du mois, issu du pointage",
  `<p>Le récapitulatif reprend le pointage signé chaque jour par le parent et l'assistante maternelle, et le contrat enregistré dans TiMat : heures mensualisées, jours d'accueil, indemnités.</p>
   <p>La période de déclaration (du 25 du mois au 5 du mois suivant) est rappelée, avec une alerte avant l'échéance.</p>`,
  telephone("Octobre 2026", `
    <div class="carte accent"><b>À déclarer entre le 25 octobre et le 5 novembre</b></div>
    <div class="carte">
      ${ligne("Jours d'accueil", ex.jours)}
      ${ligne("Heures mensualisées", ex.heures + " h")}
      ${ligne("Heures complémentaires", "0,00 h")}
      ${ligne("Salaire net", ex.net + " €", true)}
      ${ligne("Indemnités d'entretien", ex.entretien + " €")}
      ${ligne("Indemnités de repas", ex.repas + " €")}
    </div>
    <p class="petit">Pointage signé des deux côtés pour les ${ex.jours} jours. Contrat : 45 h par semaine, année complète, 4,20 € brut de l'heure.</p>
    <div class="bouton">Voir l'estimation</div>`),
  "Montants d'exemple : 195 h × 3,28 € net ; 22 journées de 9 h × 3,92 €."),

page(4, "Estimation par l'Urssaf et validation",
  `<p>Avant tout envoi, TiMat demande à l'Urssaf l'estimation des cotisations et des montants, et l'affiche telle quelle. Le parent coche qu'il a vérifié, puis valide.</p>
   <p>Rien ne part sans cette validation explicite, mois par mois.</p>`,
  telephone("Avant l'envoi", `
    <div class="carte">
      ${ligne("Salaire net déclaré", ex.net + " €", true)}
      ${ligne("Indemnités", ex.entretien + " €")}
      ${ligne("Cotisations sociales", "calculées par l'Urssaf")}
      ${ligne("Prélèvement à la source", "calculé par l'Urssaf")}
    </div>
    <p class="petit">Montants renvoyés par l'Urssaf au moment de l'estimation.</p>
    <label class="case"><span class="coche">✓</span><span>J'ai vérifié les heures et les montants d'${ex.mois}.</span></label>
    <div class="bouton">Valider et envoyer à Pajemploi</div>
    <div class="lien">Modifier le pointage</div>`),
  "Fonctions de l'API utilisées : estimation des cotisations, puis déclaration."),

page(5, "Confirmation de l'envoi",
  `<p>Le parent voit immédiatement que la déclaration est partie, avec la date, l'heure et la référence renvoyée par l'Urssaf.</p>
   <p>L'assistante maternelle est prévenue dans son espace. L'historique garde chaque mois déclaré.</p>`,
  telephone("Déclaration envoyée", `
    <div class="carte vert grand"><div class="rond">✓</div><b>Déclaration d'${ex.mois} transmise à Pajemploi</b><p>Le 2 novembre 2026 à 20 h 14</p></div>
    <div class="carte">
      ${ligne("Référence", "renvoyée par l'Urssaf")}
      ${ligne("Salariée", ex.am)}
      ${ligne("Salaire net", ex.net + " €")}
    </div>
    <div class="carte"><b>Historique</b>
      ${ligne("Octobre 2026", "envoyée ✓")}
      ${ligne("Septembre 2026", "envoyée ✓")}
    </div>
    <p class="petit">${ex.am} a été prévenue dans son espace TiMat.</p>`)),

page(6, "Retrait de l'accord",
  `<p>Depuis « Paie &amp; Contrats », le parent voit que son accord est actif et peut le retirer à tout moment.</p>
   <p>Une confirmation explique la suite : TiMat annule le mandat auprès de l'Urssaf et le parent déclare de nouveau lui-même sur pajemploi.urssaf.fr.</p>`,
  telephone("Mon accord", `
    <div class="carte vert"><b>Accord actif depuis le 30 octobre 2026</b><p>TiMat déclare en votre nom pour l'emploi de ${ex.am}.</p></div>
    <div class="bouton secondaire">Retirer mon accord</div>
    <div class="fenetre">
      <b>Retirer votre accord ?</b>
      <p>TiMat annulera le mandat auprès de l'Urssaf. Vous déclarerez de nouveau vous-même sur pajemploi.urssaf.fr, à partir du mois prochain.</p>
      <div class="deux"><div class="bouton secondaire">Annuler</div><div class="bouton rouge">Retirer</div></div>
    </div>`),
  "Fonction de l'API utilisée : annulation du mandat."),
];

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
@font-face{font-family:Q;src:url(data:font/woff2;base64,${POLICE}) format("woff2");font-weight:300 700}
@page{size:A4 landscape;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Q,sans-serif;color:${C.encre};background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:297mm;height:210mm;padding:14mm 16mm 10mm;position:relative;page-break-after:always;background:${C.fond}}
.haut{display:flex;align-items:center;gap:12px}
.num{width:34px;height:34px;border-radius:50%;background:${C.T};color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:17px}
h2{font-size:24px}
.cols{display:flex;gap:22mm;align-items:flex-start;margin-top:9mm}
.texte{flex:1;font-size:14.5px;line-height:1.6;padding-top:6mm}
.texte p{margin-bottom:10px}
.note{margin-top:16px;padding:10px 14px;border-left:4px solid ${C.T};background:${C.Tp};font-size:12.5px;color:${C.second}}
.pied{position:absolute;bottom:7mm;left:16mm;right:16mm;font-size:10px;color:${C.second};text-align:center}
.tel{width:300px;height:600px;border:10px solid #22313C;border-radius:38px;background:${C.fond};overflow:hidden;flex:none;box-shadow:0 10px 30px rgba(46,74,90,.18)}
.barre{display:flex;justify-content:space-between;font-size:11px;padding:6px 18px 2px;font-weight:700}
.entete{display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-bottom:1px solid ${C.bord};font-weight:700;font-size:14px;background:#fff}
.entete img{height:16px}.retour{font-size:20px;color:${C.T}}
.ecran{padding:12px;font-size:11.5px;line-height:1.45}
.carte{background:#fff;border:1px solid ${C.bord};border-radius:14px;padding:10px 12px;margin-bottom:9px}
.carte p{margin-top:4px;color:${C.second}}
.carte ul{margin:6px 0 0 16px}.carte li{margin-bottom:3px}
.accent{background:${C.Tp};border-color:${C.Tl}}
.vert{background:${C.Gp};border-color:#BFE0DB;color:${C.G}}
.grand{text-align:center;padding:16px 12px}.grand b{display:block;font-size:13px;margin-top:6px}
.rond{width:38px;height:38px;border-radius:50%;background:${C.G};color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;margin:0 auto}
.case{display:flex;gap:8px;align-items:flex-start;margin:6px 2px 10px;font-size:11px}
.coche{flex:none;width:17px;height:17px;border-radius:5px;background:${C.T};color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center}
.bouton{background:${C.T};color:#fff;text-align:center;font-weight:700;border-radius:12px;padding:10px;margin:6px 0}
.bouton.secondaire{background:#fff;color:${C.T};border:1.5px solid ${C.T}}
.bouton.rouge{background:${C.R}}
.lien{text-align:center;color:${C.T};font-weight:700;margin-top:6px}
.petit{font-size:10px;color:${C.second};margin:4px 2px}
.champ{margin-bottom:9px}.champ span{font-size:10.5px;font-weight:700}
.saisie{background:#fff;border:1px solid ${C.bord};border-radius:10px;padding:8px 10px;margin-top:3px;letter-spacing:1px}
.ligne{display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px dashed ${C.bord}}
.ligne:last-child{border-bottom:none}.ligne span:last-child{text-align:right}
.ligne.gras{font-weight:700}
.fenetre{margin-top:12px;background:#fff;border-radius:14px;padding:12px;box-shadow:0 6px 20px rgba(0,0,0,.18);border:1px solid ${C.bord}}
.fenetre p{margin:6px 0 8px;color:${C.second}}
.deux{display:flex;gap:8px}.deux .bouton{flex:1;margin:0}
.couverture{padding:16mm 24mm}
.couverture .logo{height:34px}
.couverture h1{font-size:30px;margin-top:10mm}
.sous{font-size:17px;color:${C.T};font-weight:700;margin-top:4px}
.meta{font-size:12px;color:${C.second};margin-top:4px}
.bloc{margin-top:8mm;columns:2;column-gap:14mm;font-size:13px;line-height:1.55}
.bloc h3{font-size:14px;margin:0 0 4px;color:${C.T}}
.bloc p,.bloc ul,.bloc ol{margin-bottom:10px;break-inside:avoid}
.bloc ul,.bloc ol{padding-left:18px}
.avert{padding:8px 12px;background:${C.Tp};border-left:4px solid ${C.T};font-size:12px}
</style></head><body>${pages.join("")}</body></html>`;

const nav = await chromium.launch({ executablePath: CHROMIUM() });
const p = await nav.newPage();
await p.setContent(html, { waitUntil: "load" });
await p.evaluate(() => document.fonts.ready);
const pdf = `${SORTIE}/maquette-api-tierce-declaration-pajemploi.pdf`;
await p.pdf({ path: pdf, width: "297mm", height: "210mm", printBackground: true });
await nav.close();
console.log(pdf);
