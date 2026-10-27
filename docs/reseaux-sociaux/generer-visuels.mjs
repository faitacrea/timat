// Genere les visuels reseaux sociaux de TiMat (PNG) avec Chromium.
//   node docs/reseaux-sociaux/generer-visuels.mjs
// A relancer quand un chiffre change (minimum horaire, minimum garanti) :
// les montants sont ecrits dans les publications 05 a 08 ci-dessous.
// Formats : profil 1080x1080 ; couverture de Page 1702x630 (2x 851x315,
// recommandation Meta) ; couverture de groupe 1640x856 ; publications
// 1080x1350 (4:5) ; stories 1080x1920.
import { chromium } from "playwright";
import { CHROMIUM } from "../../scripts/jeu-de-donnees.mjs";
import { readFileSync, mkdirSync } from "node:fs";

const SORTIE = process.argv[2] || new URL("./visuels", import.meta.url).pathname;
mkdirSync(SORTIE, { recursive: true });
const b64 = (p) => readFileSync(p).toString("base64");
const POLICE = b64(new URL("./police/quicksand-latin.woff2", import.meta.url));
const LOGO = "data:image/png;base64," + b64(new URL("../../public/logo.png", import.meta.url));
const LOGO_CLAIR = "data:image/png;base64," + b64(new URL("../../public/logo-dark.png", import.meta.url));

const NAVY = "#2E4A5A", TERRA = "#A94C2F", PECHE = "#E4917A", CREME = "#FDFBF8", SABLE = "#F6EDE3";

const base = (w, h, corps, fond = CREME) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Q;src:url(data:font/woff2;base64,${POLICE}) format("woff2");font-weight:300 700}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:Q,sans-serif;background:${fond};color:${NAVY};position:relative;-webkit-font-smoothing:antialiased}
.rond{position:absolute;border-radius:50%}
.src{font-weight:600;color:#5E6E78}
</style></head><body>${corps}</body></html>`;

const visuels = [];

// 1. PHOTO DE PROFIL — logo clair sur marine, dans le cercle de recadrage.
visuels.push(["01-photo-profil-1080x1080.png", 1080, 1080, base(1080, 1080, `
  <img src="${LOGO_CLAIR}" style="position:absolute;left:50%;top:50%;width:720px;transform:translate(-50%,-46%)">
`, NAVY)]);

// 2. COUVERTURE DE PAGE — tout l'essentiel au centre ; le bas a gauche et le
// bas au centre restent libres (la photo de profil s'y pose).
visuels.push(["02-couverture-page-1702x630.png", 1702, 630, base(1702, 630, `
  <div class="rond" style="width:520px;height:520px;background:${PECHE};right:-140px;top:-210px;opacity:.9"></div>
  <div class="rond" style="width:300px;height:300px;background:${TERRA};right:-60px;top:-140px;opacity:.85"></div>
  <div class="rond" style="width:220px;height:220px;background:${SABLE};left:-70px;bottom:-90px"></div>
  <div style="position:absolute;left:0;right:0;top:92px;text-align:center">
    <img src="${LOGO}" style="height:96px">
    <div style="font-size:54px;font-weight:700;margin-top:26px;letter-spacing:-.5px">L'application des assistantes maternelles</div>
    <div style="font-size:31px;font-weight:600;margin-top:16px;color:${TERRA}">Contrat · Salaire · Congés payés · Pajemploi</div>
    <div style="font-size:25px;font-weight:600;margin-top:16px;color:#4E5E68">Accès gratuit pour les parents employeurs · timat.app</div>
  </div>
`, `linear-gradient(180deg,#FDF6EF,#F7EEE4)`)]);

// 3. COUVERTURE DE GROUPE — pas de photo de profil par-dessus, contenu centre.
visuels.push(["03-couverture-groupe-1640x856.png", 1640, 856, base(1640, 856, `
  <div class="rond" style="width:640px;height:640px;background:#3A5A6B;left:-220px;top:-260px"></div>
  <div class="rond" style="width:420px;height:420px;background:${PECHE};right:-150px;bottom:-170px;opacity:.95"></div>
  <div style="position:absolute;left:0;right:0;top:190px;text-align:center;color:#fff">
    <div style="display:inline-block;font-size:26px;font-weight:700;padding:10px 26px;border-radius:40px;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.35)">Groupe d'entraide</div>
    <div style="font-size:74px;font-weight:700;margin-top:30px;line-height:1.08">Assistantes maternelles</div>
    <div style="font-size:52px;font-weight:600;margin-top:12px;color:#F7C7B3">paie, contrat et Pajemploi</div>
    <div style="font-size:28px;font-weight:600;margin-top:34px;opacity:.92">Des réponses avec la source · Zéro publicité · Bienveillance</div>
  </div>
`, NAVY)]);

// Gabarit commun des publications 1080x1350 : marges de 80 px (la zone 3:4 du
// quadrillage Instagram coupe 34 px de chaque cote).
const pub = (nom, contenu, fond = CREME) => visuels.push([nom, 1080, 1350, base(1080, 1350, `
  <div style="position:absolute;left:92px;right:92px;top:70px;bottom:190px;display:flex;flex-direction:column;justify-content:center">${contenu}</div>
  <div style="position:absolute;left:92px;right:92px;bottom:74px;display:flex;align-items:center;justify-content:space-between">
    <img src="${fond === NAVY ? LOGO_CLAIR : LOGO}" style="height:46px">
    <div style="font-size:26px;font-weight:700;color:${fond === NAVY ? "#F7C7B3" : TERRA}">timat.app</div>
  </div>`, fond)]);

// 4. PRESENTATION
pub("04-publication-1-presentation.png", `
  <div class="rond" style="width:300px;height:300px;background:${PECHE};right:-200px;top:-150px;opacity:.9"></div>
  <div style="font-size:32px;font-weight:700;color:${TERRA}">Bonjour !</div>
  <div style="font-size:80px;font-weight:700;line-height:1.08;margin-top:22px;max-width:800px">Moins de temps sur la paie. Plus de temps pour les enfants.</div>
  <div style="font-size:36px;font-weight:600;line-height:1.45;margin-top:48px;color:#3C5463;max-width:860px">Je m'appelle Sophie. J'ai créé TiMat, une application pour les assistantes maternelles et les parents employeurs : contrat, heures, salaire, congés payés et récapitulatif Pajemploi, au même endroit.</div>
  <div style="font-size:33px;font-weight:700;margin-top:52px;color:${TERRA}">Ici : des repères officiels, sourcés, chaque semaine.</div>
  <div style="font-size:30px;font-weight:600;margin-top:18px;color:#5E6E78">— Sophie, fondatrice de TiMat</div>
`);

// 5. LE MINIMUM HORAIRE
pub("05-publication-2-minimum-4-20.png", `
  <div style="font-size:32px;font-weight:700;color:#F7C7B3;">Depuis le 1<sup style=\"font-size:.6em\">er</sup> juin 2026</div>
  <div style="font-size:230px;font-weight:700;line-height:1;margin-top:34px;color:#fff;letter-spacing:-4px">4,20 €</div>
  <div style="font-size:44px;font-weight:600;line-height:1.3;margin-top:26px;color:#fff;max-width:860px">brut de l'heure, par enfant : c'est le minimum conventionnel des assistantes maternelles.</div>
  <div style="font-size:33px;font-weight:600;line-height:1.45;margin-top:40px;color:#D6E1E7;max-width:860px">4,37 € avec le titre professionnel de la branche. Un contrat signé plus bas avant juin passe au minimum à cette date.</div>
  <div style="font-size:23px;font-weight:600;margin-top:44px;color:#AFC0CA">Source : DREETS Pays de la Loire, fiche du 12 juin 2026 (avenant n° 10 de la convention collective IDCC 3239)</div>
`, NAVY);

// 6. INDEMNITE D'ENTRETIEN
pub("06-publication-3-entretien-3-92.png", `
  <div style="font-size:32px;font-weight:700;color:${TERRA};">Indemnité d'entretien · depuis le 1<sup style=\"font-size:.6em\">er</sup> juin 2026</div>
  <div style="font-size:230px;font-weight:700;line-height:1;margin-top:34px;letter-spacing:-4px">3,92 €</div>
  <div style="font-size:44px;font-weight:600;line-height:1.3;margin-top:26px;max-width:860px">minimum pour une journée de 9 heures d'accueil.</div>
  <div style="margin-top:44px;font-size:33px;font-weight:600;line-height:1.55;color:#3C5463">
    <div>• Au-delà de 9 h : + 0,435 € par heure</div>
    <div>• Moins de 9 h : 0,435 € par heure,</div>
    <div style="padding-left:30px">jamais moins de 2,65 € par jour</div>
  </div>
  <div style="font-size:23px;font-weight:600;margin-top:40px" class="src">Source : DREETS Pays de la Loire, fiche du 12 juin 2026 (90 % du minimum garanti, 4,35 €)</div>
`);

// 7. PAJEMPLOI : UNE DECLARATION PAR ENFANT
pub("07-publication-4-pajemploi-par-enfant.png", `
  <div style="font-size:32px;font-weight:700;color:${TERRA};">Pajemploi · depuis janvier 2026</div>
  <div style="font-size:92px;font-weight:700;line-height:1.05;margin-top:30px;max-width:880px">Une déclaration par enfant.</div>
  <div style="font-size:38px;font-weight:600;line-height:1.45;margin-top:40px;color:#3C5463;max-width:860px">Deux enfants de la même famille chez la même assistante maternelle ? Deux déclarations distinctes, chaque mois.</div>
  <div style="margin-top:56px;padding:40px 44px;border-radius:28px;background:${SABLE}">
    <div style="font-size:30px;font-weight:700;color:${TERRA}">Quand déclarer ?</div>
    <div style="font-size:46px;font-weight:700;margin-top:12px;line-height:1.2">Du 25 du mois au 5 du mois suivant</div>
  </div>
  <div style="font-size:23px;font-weight:600;margin-top:36px" class="src">Source : urssaf.fr et pajemploi.urssaf.fr</div>
`);

// 8. LA MENSUALISATION
pub("08-publication-5-mensualisation.png", `
  <div style="font-size:32px;font-weight:700;color:#F7C7B3;">La mensualisation, en une ligne</div>
  <div style="font-size:62px;font-weight:700;line-height:1.2;margin-top:40px;color:#fff">40 h × 52 semaines ÷ 12</div>
  <div style="font-size:62px;font-weight:700;line-height:1.2;margin-top:14px;color:#F7C7B3">= 173,33 h par mois</div>
  <div style="font-size:62px;font-weight:700;line-height:1.2;margin-top:14px;color:#fff">× 4,20 € = 728,00 € brut</div>
  <div style="font-size:36px;font-weight:600;line-height:1.45;margin-top:52px;color:#D6E1E7;max-width:860px">Le même salaire chaque mois, février compris. En année incomplète, on remplace 52 par le nombre de semaines d'accueil prévues au contrat.</div>
  <div style="font-size:23px;font-weight:600;margin-top:40px;color:#AFC0CA">Source : urssaf.fr, « Rémunérer un salarié à domicile ou un assistant maternel »</div>
`, NAVY);

// 9-14. COUVERTURES DES STORIES A LA UNE — l'icone tient dans le cercle central.
const icones = {
  salaire: `<div style="font-size:360px;font-weight:700;color:#fff;line-height:1;margin-top:-20px">€</div>`,
  conges: `<svg width="380" height="380" viewBox="0 0 100 100"><circle cx="50" cy="50" r="19" fill="#fff"/>${[...Array(8)].map((_, i) => { const a = i * Math.PI / 4; return `<line x1="${50 + 28 * Math.cos(a)}" y1="${50 + 28 * Math.sin(a)}" x2="${50 + 40 * Math.cos(a)}" y2="${50 + 40 * Math.sin(a)}" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`; }).join("")}</svg>`,
  pajemploi: `<svg width="330" height="380" viewBox="0 0 80 100"><rect x="6" y="4" width="68" height="92" rx="9" fill="none" stroke="#fff" stroke-width="7"/><line x1="20" y1="30" x2="60" y2="30" stroke="#fff" stroke-width="7" stroke-linecap="round"/><line x1="20" y1="50" x2="60" y2="50" stroke="#fff" stroke-width="7" stroke-linecap="round"/><line x1="20" y1="70" x2="46" y2="70" stroke="#fff" stroke-width="7" stroke-linecap="round"/></svg>`,
  indemnites: `<svg width="380" height="380" viewBox="0 0 100 100"><path d="M14 48 L50 16 L86 48" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 44 V86 H76 V44" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round"/><rect x="42" y="60" width="16" height="26" rx="3" fill="#fff"/></svg>`,
  appli: `<svg width="260" height="400" viewBox="0 0 64 100"><rect x="5" y="4" width="54" height="92" rx="11" fill="none" stroke="#fff" stroke-width="7"/><circle cx="32" cy="82" r="5" fill="#fff"/><line x1="24" y1="13" x2="40" y2="13" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,
  questions: `<div style="font-size:400px;font-weight:700;color:#fff;line-height:1;margin-top:-30px">?</div>`,
};
const couleurs = [NAVY, TERRA, NAVY, TERRA, NAVY, TERRA];
Object.entries(icones).forEach(([nom, svg], i) => {
  const libelle = { salaire: "Salaire", conges: "Congés", pajemploi: "Pajemploi", indemnites: "Indemnités", appli: "L'appli", questions: "Vos questions" }[nom];
  visuels.push([`${String(9 + i).padStart(2, "0")}-story-a-la-une-${nom}-1080x1920.png`, 1080, 1920, base(1080, 1920, `
    <div class="rond" style="width:760px;height:760px;left:160px;top:580px;background:${couleurs[i]};display:flex;align-items:center;justify-content:center">${svg}</div>
    <div style="position:absolute;left:0;right:0;top:1420px;text-align:center;font-size:64px;font-weight:700">${libelle}</div>
  `, CREME)]);
});

// 15-16. FONDS DE SONDAGE EN STORY — la question en haut, la place du
// sticker « Sondage » au milieu, le logo en bas.
const sondage = (nom, question, aide) => visuels.push([nom, 1080, 1920, base(1080, 1920, `
  <div class="rond" style="width:520px;height:520px;background:${PECHE};right:-160px;top:-160px;opacity:.9"></div>
  <div style="position:absolute;left:90px;right:90px;top:300px">
    <div style="font-size:34px;font-weight:700;color:${TERRA}">Sondage</div>
    <div style="font-size:76px;font-weight:700;line-height:1.12;margin-top:22px">${question}</div>
    <div style="font-size:34px;font-weight:600;line-height:1.4;margin-top:30px;color:#4E5E68">${aide}</div>
  </div>
  <img src="${LOGO}" style="position:absolute;left:50%;transform:translateX(-50%);bottom:170px;height:70px">
`, CREME)]);
sondage("15-story-sondage-temps-paie-1080x1920.png", "Combien de temps vous prend la paie chaque mois ?", "Heures, congés, indemnités, Pajemploi : tout compris.");
sondage("16-story-sondage-minimum-1080x1920.png", "Votre taux horaire est-il au moins de 4,20 € brut ?", "C'est le minimum depuis le 1<sup style=\"font-size:.6em\">er</sup> juin 2026.");

// 17-21. LA DEUXIEME SERIE DE PUBLICATIONS (13 octobre 2026). Chaque chiffre
// porte sa source sur l'image ; les legendes sont dans kit-reseaux.html.

// 17. LES CONGES PAYES
pub("17-publication-6-conges-payes.png", `
  <div style="font-size:32px;font-weight:700;color:${TERRA};">Congés payés des assistantes maternelles</div>
  <div style="font-size:170px;font-weight:700;line-height:1;margin-top:34px;letter-spacing:-3px">2,5 jours</div>
  <div style="font-size:42px;font-weight:600;line-height:1.3;margin-top:22px;max-width:860px">ouvrables acquis par mois de travail (ou par période de 4 semaines), dans la limite de 30 jours par an.</div>
  <div style="margin-top:44px;padding:36px 42px;border-radius:28px;background:${SABLE}">
    <div style="font-size:30px;font-weight:700;color:${TERRA}">Combien sont-ils payés ?</div>
    <div style="font-size:38px;font-weight:700;margin-top:12px;line-height:1.3">Le plus favorable des deux : le maintien de salaire ou le dixième de ce qui a été perçu sur l'année.</div>
  </div>
  <div style="font-size:23px;font-weight:600;margin-top:34px" class="src">Sources : DREETS Auvergne-Rhône-Alpes, fiches année complète et incomplète · convention collective IDCC 3239</div>
`);

// 18. LE CREDIT D'IMPOT POUR LES PARENTS
pub("18-publication-7-credit-impot.png", `
  <div style="font-size:32px;font-weight:700;color:#F7C7B3;">Parents employeurs · crédit d'impôt</div>
  <div style="font-size:230px;font-weight:700;line-height:1;margin-top:30px;color:#fff;letter-spacing:-4px">50 %</div>
  <div style="font-size:42px;font-weight:600;line-height:1.3;margin-top:22px;color:#fff;max-width:880px">des frais de garde chez une assistante maternelle, pour un enfant de moins de 6 ans au 1<sup style="font-size:.6em">er</sup> janvier.</div>
  <div style="font-size:34px;font-weight:600;line-height:1.5;margin-top:40px;color:#D6E1E7;max-width:880px">
    <div>• Dépenses retenues : 3 500 € maximum par enfant</div>
    <div>• Soit 1 750 € de crédit au plus</div>
    <div>• Les aides reçues, comme le CMG, se déduisent</div>
  </div>
  <div style="font-size:23px;font-weight:600;margin-top:36px;color:#AFC0CA">Source : Code général des impôts, article 200 quater B</div>
`, NAVY);

// 19. AU-DELA DE 45 HEURES
pub("19-publication-8-heures-majorees.png", `
  <div style="font-size:32px;font-weight:700;color:${TERRA};">Heures majorées</div>
  <div style="font-size:72px;font-weight:700;line-height:1.1;margin-top:30px;max-width:880px">Au-delà de 45 heures par semaine,</div>
  <div style="font-size:72px;font-weight:700;line-height:1.1;margin-top:8px;color:${TERRA};max-width:880px">l'heure est majorée.</div>
  <div style="font-size:38px;font-weight:600;line-height:1.45;margin-top:40px;color:#3C5463;max-width:860px">Le taux est écrit dans le contrat, et il ne peut pas être inférieur à 10 %.</div>
  <div style="margin-top:44px;padding:34px 40px;border-radius:28px;background:${SABLE}">
    <div style="font-size:30px;font-weight:700;color:${TERRA}">Et entre le contrat et 45 h ?</div>
    <div style="font-size:34px;font-weight:600;margin-top:10px;line-height:1.4">Ce sont des heures complémentaires : majorées seulement si le contrat le prévoit.</div>
  </div>
  <div style="font-size:23px;font-weight:600;margin-top:32px" class="src">Sources : code.travail.gouv.fr (convention IDCC 3239) · DREETS Occitanie et Pays de la Loire</div>
`);

// 20. L'INDEMNITE DE RUPTURE
pub("20-publication-9-indemnite-rupture.png", `
  <div style="font-size:32px;font-weight:700;color:#F7C7B3;">Fin de contrat · indemnité de rupture</div>
  <div style="font-size:200px;font-weight:700;line-height:1;margin-top:30px;color:#fff;letter-spacing:-3px">1/80<sup style="font-size:.35em">e</sup></div>
  <div style="font-size:40px;font-weight:600;line-height:1.3;margin-top:22px;color:#fff;max-width:880px">des salaires bruts perçus pendant le contrat, quand le parent retire l'enfant après au moins 9 mois d'accueil.</div>
  <div style="font-size:31px;font-weight:600;line-height:1.5;margin-top:36px;color:#D6E1E7;max-width:880px">
    <div>• Ni cotisée, ni imposable</div>
    <div>• Pas due en cas de faute grave, ni de retrait, suspension ou modification de l'agrément</div>
    <div>• Exemple : 36 mois à 728 € brut → 327,60 €</div>
  </div>
  <div style="font-size:23px;font-weight:600;margin-top:32px;color:#AFC0CA">Source : convention collective IDCC 3239, article 121.1</div>
`, NAVY);

// 21. LE POINTAGE SIGNE DES DEUX COTES (TiMat)
pub("21-publication-10-pointage-signe.png", `
  <div class="rond" style="width:300px;height:300px;background:${PECHE};right:-200px;top:-150px;opacity:.9"></div>
  <div style="font-size:32px;font-weight:700;color:${TERRA}">Dans TiMat</div>
  <div style="font-size:84px;font-weight:700;line-height:1.08;margin-top:22px;max-width:820px">Les heures, signées des deux côtés.</div>
  <div style="font-size:36px;font-weight:600;line-height:1.5;margin-top:44px;color:#3C5463;max-width:860px">
    <div>1. L'assistante maternelle pointe l'arrivée et le départ.</div>
    <div style="margin-top:10px">2. Le parent valide, depuis son accès gratuit.</div>
    <div style="margin-top:10px">3. Le salaire et le récapitulatif Pajemploi partent de ces heures-là.</div>
  </div>
  <div style="font-size:33px;font-weight:700;margin-top:48px;color:${TERRA}">2 mois offerts, sans carte bancaire.</div>
`);

// 22-24. STORIES DU 23 OCTOBRE 2026 (a la place du canal de diffusion) :
// un sondage, puis une story qui porte le sticker « Lien » vers le groupe,
// et la couverture d'une « a la une » Groupe pour garder le lien.
sondage("22-story-sondage-desaccord-heures-1080x1920.png", "Un désaccord sur les heures avec un parent, ça vous est déjà arrivé ?", "Retards, dépassements, heures oubliées sur le relevé…");

visuels.push(["23-story-lien-groupe-1080x1920.png", 1080, 1920, base(1080, 1920, `
  <div class="rond" style="width:640px;height:640px;background:#3A5A6B;left:-240px;top:-240px"></div>
  <div class="rond" style="width:420px;height:420px;background:${PECHE};right:-170px;bottom:-150px;opacity:.95"></div>
  <div style="position:absolute;left:90px;right:90px;top:330px;color:#fff">
    <div style="display:inline-block;font-size:32px;font-weight:700;padding:10px 26px;border-radius:40px;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.35)">Groupe d'entraide Facebook</div>
    <div style="font-size:84px;font-weight:700;line-height:1.08;margin-top:36px">Vos questions sur la paie, le contrat et Pajemploi</div>
    <div style="font-size:40px;font-weight:600;line-height:1.4;margin-top:30px;color:#F7C7B3">On y répond avec la source.</div>
  </div>
  <div style="position:absolute;left:0;right:0;top:1440px;text-align:center;font-size:30px;font-weight:600;color:#D6E1E7">Assistantes maternelles et parents employeurs · zéro publicité</div>
`, NAVY)]);

visuels.push(["24-story-a-la-une-groupe-1080x1920.png", 1080, 1920, base(1080, 1920, `
  <div class="rond" style="width:760px;height:760px;left:160px;top:580px;background:${NAVY};display:flex;align-items:center;justify-content:center"><svg width="420" height="380" viewBox="0 0 110 100"><path d="M46 30 h52 a8 8 0 0 1 8 8 v28 a8 8 0 0 1 -8 8 h-10 v12 l-14 -12 h-28 a8 8 0 0 1 -8 -8 v-28 a8 8 0 0 1 8 -8 z" fill="#F7C7B3"/><path d="M10 12 h56 a8 8 0 0 1 8 8 v28 a8 8 0 0 1 -8 8 h-30 l-14 12 v-12 h-12 a8 8 0 0 1 -8 -8 v-28 a8 8 0 0 1 8 -8 z" fill="#fff" stroke="${NAVY}" stroke-width="5" stroke-linejoin="round"/></svg></div>
  <div style="position:absolute;left:0;right:0;top:1420px;text-align:center;font-size:64px;font-weight:700">Le groupe</div>
`, CREME)]);

// 25-29. STORIES DU 24 AU 30 OCTOBRE 2026 — meme mise en page que les
// sondages : le texte en haut, la place de l'autocollant au milieu, la
// source au-dessus du logo quand l'image affirme une regle.
const story = (nom, etiquette, titre, aide, source = "") => visuels.push([nom, 1080, 1920, base(1080, 1920, `
  <div class="rond" style="width:520px;height:520px;background:${PECHE};right:-160px;top:-160px;opacity:.9"></div>
  <div style="position:absolute;left:90px;right:90px;top:300px">
    <div style="font-size:34px;font-weight:700;color:${TERRA}">${etiquette}</div>
    <div style="font-size:72px;font-weight:700;line-height:1.12;margin-top:22px">${titre}</div>
    <div style="font-size:34px;font-weight:600;line-height:1.4;margin-top:30px;color:#4E5E68">${aide}</div>
  </div>
  ${source ? `<div style="position:absolute;left:90px;right:90px;bottom:290px;font-size:26px;text-align:center" class="src">${source}</div>` : ""}
  <img src="${LOGO}" style="position:absolute;left:50%;transform:translateX(-50%);bottom:170px;height:70px">
`, CREME)]);
story("25-story-boite-questions-1080x1920.png", "Vos questions", "Une question sur votre contrat, votre salaire ou Pajemploi ?", "Posez-la ici 👇 Les réponses viendront avec leur source officielle.");
story("26-story-sondage-1080x1920.png", "Sondage", "Votre avis en un clic", "La question est juste en dessous 👇");
// QUIZ. Sophie veut le vrai quiz d'Instagram : on touche une reponse, elle
// devient verte (bonne) ou rouge (fausse), tout de suite (27/10/2026 : « pas
// une image le matin et une le soir »). Seul l'autocollant Quiz le fait ; il
// manquait sur son compte, l'astuce du Reel en brouillon le fait revenir
// (Storrito, 2026). L'image porte donc la question et laisse la place de
// l'autocollant sous « Touchez la bonne reponse » ; les reponses sont dans
// l'autocollant. quizReponse (55 a 58) sert d'explication sourcee, publiee
// juste apres le quiz, ou de solution de repli si l'autocollant manque.
const VERT = "#23874A";
const carte = (lettre, texte, etat = "") => {
  const bon = etat === "bon", eteint = etat === "eteint";
  return `<div style="display:flex;align-items:center;gap:30px;margin-top:24px;padding:22px 30px;border-radius:30px;background:${bon ? VERT : "#fff"};border:3px solid ${bon ? VERT : "#E6DCD1"};opacity:${eteint ? ".45" : "1"}">
    <div style="flex:none;width:76px;height:76px;border-radius:50%;background:${bon ? "#fff" : NAVY};color:${bon ? VERT : "#fff"};font-size:40px;font-weight:700;display:flex;align-items:center;justify-content:center">${bon ? "✓" : lettre}</div>
    <div style="font-size:48px;font-weight:700;line-height:1.15;color:${bon ? "#fff" : NAVY}">${texte}</div>
  </div>`;
};
const LETTRES = ["A", "B", "C", "D"];
const quiz = (nom, question, aide, source) => visuels.push([nom, 1080, 1920, base(1080, 1920, `
  <div class="rond" style="width:520px;height:520px;background:${PECHE};right:-160px;top:-160px;opacity:.9"></div>
  <div style="position:absolute;left:90px;right:90px;top:270px">
    <div style="display:inline-block;padding:12px 30px;border-radius:40px;background:${TERRA};color:#fff;font-size:34px;font-weight:700;letter-spacing:3px">QUIZ</div>
    <div style="font-size:66px;font-weight:700;line-height:1.14;margin-top:30px">${question}</div>
    <div style="font-size:34px;font-weight:600;line-height:1.4;margin-top:24px;color:#4E5E68">${aide}</div>
    <div style="font-size:36px;font-weight:700;margin-top:44px;color:${TERRA}">Touchez la bonne réponse juste en dessous 👇</div>
  </div>
  <div style="position:absolute;left:90px;right:90px;bottom:290px;font-size:26px;text-align:center" class="src">${source}</div>
  <img src="${LOGO}" style="position:absolute;left:50%;transform:translateX(-50%);bottom:170px;height:70px">
`, CREME)]);
const quizReponse = (nom, question, options, bonne, explication, source) => visuels.push([nom, 1080, 1920, base(1080, 1920, `
  <div class="rond" style="width:520px;height:520px;background:${PECHE};right:-160px;top:-160px;opacity:.9"></div>
  <div style="position:absolute;left:90px;right:90px;top:270px">
    <div style="display:inline-block;padding:12px 30px;border-radius:40px;background:${VERT};color:#fff;font-size:34px;font-weight:700;letter-spacing:3px">QUIZ · LA RÉPONSE</div>
    <div style="font-size:50px;font-weight:700;line-height:1.16;margin-top:30px">${question}</div>
    <div style="margin-top:20px">${options.map((o, k) => carte(LETTRES[k], o, k === bonne ? "bon" : "eteint")).join("")}</div>
    <div style="font-size:36px;font-weight:600;line-height:1.4;margin-top:40px;color:#3F4F59">${explication}</div>
    <div style="font-size:26px;margin-top:30px" class="src">${source}</div>
  </div>
  <img src="${LOGO}" style="position:absolute;left:50%;transform:translateX(-50%);bottom:170px;height:70px">
`, CREME)]);
const er = '<sup style="font-size:.6em">er</sup>';
const Q_MINIMUM = `Le salaire minimum d'une assistante maternelle depuis le 1${er} juin 2026 ?`;
const O_MINIMUM = ["3,46 € brut de l'heure", "3,64 € brut de l'heure", "4,20 € brut de l'heure"];
const Q_PAJEMPLOI = "Deux enfants de la même famille : combien de déclarations Pajemploi par mois ?";
const O_PAJEMPLOI = ["Une seule", "Deux"];
const Q_CONGES = "Combien de jours de congés payés acquis par mois de travail ?";
const O_CONGES = ["2 jours", "2,5 jours", "3 jours"];
const Q_PREAVIS = "6 mois d'accueil, le parent retire l'enfant : quel préavis ?";
const O_PREAVIS = ["8 jours", "15 jours", "1 mois"];
quiz("27-story-quiz-minimum-1080x1920.png", Q_MINIMUM, "Brut, par heure et par enfant, sans le titre professionnel.", "Source : DREETS Pays de la Loire, fiche du 12 juin 2026");
quiz("29-story-quiz-pajemploi-1080x1920.png", Q_PAJEMPLOI, "Depuis janvier 2026.", "Source : urssaf.fr, « Pajemploi : une déclaration par enfant à partir de janvier 2026 »");

visuels.push(["28-story-11-novembre-1080x1920.png", 1080, 1920, base(1080, 1920, `
  <div class="rond" style="width:560px;height:560px;background:#3A5A6B;left:-220px;top:-220px"></div>
  <div style="position:absolute;left:90px;right:90px;top:300px;color:#fff">
    <div style="font-size:34px;font-weight:700;color:#F7C7B3">Mercredi 11 novembre · jour férié</div>
    <div style="font-size:80px;font-weight:700;line-height:1.1;margin-top:26px">Pas travaillé : payé ou pas ?</div>
    <div style="font-size:38px;font-weight:600;line-height:1.42;margin-top:36px;color:#E3EBF0">Payé normalement s'il tombe un jour habituellement travaillé, si vous avez travaillé le dernier jour prévu avant et le premier jour prévu après (sauf absence autorisée).</div>
    <div style="font-size:38px;font-weight:700;line-height:1.42;margin-top:26px;color:#F7C7B3">Travaillé : +10 % sur les heures du jour.</div>
  </div>
  <div style="position:absolute;left:90px;right:90px;bottom:250px;font-size:26px;font-weight:600;text-align:center;color:#AFC0CA">Source : convention collective IDCC 3239, article 47.2</div>
  <img src="${LOGO_CLAIR}" style="position:absolute;left:50%;transform:translateX(-50%);bottom:140px;height:70px">
`, NAVY)]);

// 30-39. LA TROISIEME SERIE DE PUBLICATIONS (23 octobre 2026). Les regles
// viennent surtout du guide de la DREETS Bourgogne-Franche-Comte mis a jour
// en juin 2026 ; les legendes sont dans kit-reseaux.html.
const liste = (lignes, couleur, taille = 36) => `<div style="font-size:${taille}px;font-weight:600;line-height:1.45;margin-top:34px;color:${couleur};max-width:880px">${lignes.map((l, i) => `<div style="margin-top:${i ? 12 : 0}px">${l}</div>`).join("")}</div>`;
const SRC_BFC = "DREETS Bourgogne-Franche-Comté, guide assistants maternels (juin 2026)";

// 30. LE PREAVIS
pub("30-publication-11-preavis.png", `
  <div style="font-size:32px;font-weight:700;color:#F7C7B3;">Retrait de l'enfant · le préavis</div>
  <div style="font-size:120px;font-weight:700;line-height:1;margin-top:30px;color:#fff;letter-spacing:-2px">8 j · 15 j · 1 mois</div>
  <div style="font-size:40px;font-weight:600;line-height:1.3;margin-top:26px;color:#fff">selon l'ancienneté avec le parent employeur :</div>
  ${liste(["• moins de 3 mois : 8 jours calendaires", "• de 3 mois à moins d'un an : 15 jours calendaires", "• un an et plus : 1 mois"], "#D6E1E7")}
  <div style="font-size:30px;font-weight:600;line-height:1.45;margin-top:30px;color:#F7C7B3">Il part de la première présentation de la lettre recommandée (ou de la remise en main propre).</div>
  <div style="font-size:23px;font-weight:600;margin-top:30px;color:#AFC0CA">Sources : ${SRC_BFC} · convention collective IDCC 3239, art. 119.1</div>
`, NAVY);

// 31. LE CONGE POUR ENFANT MALADE
pub("31-publication-12-conge-enfant-malade.png", `
  <div style="font-size:32px;font-weight:700;color:${TERRA};">Votre enfant est malade</div>
  <div style="font-size:190px;font-weight:700;line-height:1;margin-top:30px;letter-spacing:-3px">3 jours</div>
  <div style="font-size:42px;font-weight:600;line-height:1.3;margin-top:22px;max-width:880px">de congé par an, sur certificat médical, pour un enfant de moins de 16 ans à votre charge.</div>
  <div style="margin-top:42px;padding:34px 40px;border-radius:28px;background:${SABLE}">
    <div style="font-size:36px;font-weight:700;line-height:1.35">5 jours si l'enfant a moins d'un an, ou si vous avez au moins trois enfants de moins de 16 ans.</div>
    <div style="font-size:31px;font-weight:600;margin-top:14px;color:${TERRA}">Ce congé n'est pas rémunéré.</div>
  </div>
  <div style="font-size:23px;font-weight:600;margin-top:32px" class="src">Sources : ${SRC_BFC} · convention collective IDCC 3239, art. 48-2-2</div>
`);

// 32. LES DOCUMENTS DE FIN DE CONTRAT
pub("32-publication-13-documents-fin-contrat.png", `
  <div style="font-size:32px;font-weight:700;color:${TERRA};">Fin de contrat</div>
  <div style="font-size:76px;font-weight:700;line-height:1.1;margin-top:26px;max-width:880px">3 documents à remettre à la fin du contrat</div>
  ${liste(["1. Le certificat de travail", "2. L'attestation France Travail", "3. Le reçu pour solde de tout compte"], NAVY, 44)}
  <div style="margin-top:40px;padding:30px 38px;border-radius:28px;background:${SABLE}">
    <div style="font-size:33px;font-weight:700;line-height:1.4">Le reçu peut être contesté dans les 6 mois qui suivent sa signature.</div>
  </div>
  <div style="font-size:23px;font-weight:600;margin-top:32px" class="src">Sources : ${SRC_BFC} · convention collective IDCC 3239, art. 69</div>
`);

// 33. LES INDEMNITES KILOMETRIQUES
pub("33-publication-14-indemnites-kilometriques.png", `
  <div style="font-size:32px;font-weight:700;color:#F7C7B3;">Frais kilométriques</div>
  <div style="font-size:150px;font-weight:700;line-height:1;margin-top:30px;color:#fff;letter-spacing:-3px">0,33 €/km</div>
  <div style="font-size:38px;font-weight:600;line-height:1.35;margin-top:24px;color:#fff;max-width:880px">au minimum pour une voiture de 5 CV et moins, jusqu'à 2 000 km par an, du 1<sup style="font-size:.6em">er</sup> juin au 31 décembre 2026.</div>
  ${liste(["• Le taux est écrit au contrat : ni sous le barème de l'administration, ni au-dessus du barème fiscal.", "• Plusieurs familles : chacune paie sa part, au prorata des enfants transportés."], "#D6E1E7", 33)}
  <div style="font-size:23px;font-weight:600;margin-top:32px;color:#AFC0CA">Sources : convention collective IDCC 3239, art. 57 et 113 (DREETS Pays de la Loire, juin 2026) · arrêté du 29 mai 2026</div>
`, NAVY);

// 34. LA FIN DE CONTRAT DANS TIMAT
pub("34-publication-15-fin-de-contrat-timat.png", `
  <div class="rond" style="width:300px;height:300px;background:${PECHE};right:-200px;top:-150px;opacity:.9"></div>
  <div style="font-size:32px;font-weight:700;color:${TERRA}">Dans TiMat</div>
  <div style="font-size:84px;font-weight:700;line-height:1.08;margin-top:22px;max-width:820px">La fin de contrat, calculée pour vous.</div>
  <div style="font-size:36px;font-weight:600;line-height:1.5;margin-top:44px;color:#3C5463;max-width:860px">
    <div>1. Le préavis, selon l'ancienneté.</div>
    <div style="margin-top:10px">2. Les congés payés restants et l'indemnité de rupture, quand elle est due.</div>
    <div style="margin-top:10px">3. La lettre, le certificat de travail et le reçu pour solde de tout compte, prêts à imprimer.</div>
  </div>
  <div style="font-size:33px;font-weight:700;margin-top:48px;color:${TERRA}">2 mois offerts, sans carte bancaire.</div>
`);

// 35. LES REPAS
pub("35-publication-16-repas.png", `
  <div style="font-size:32px;font-weight:700;color:${TERRA};">Les repas</div>
  <div style="font-size:72px;font-weight:700;line-height:1.1;margin-top:26px;max-width:880px">Qui les fournit ? C'est écrit au contrat.</div>
  <div style="margin-top:40px;padding:30px 38px;border-radius:28px;background:${SABLE}">
    <div style="font-size:30px;font-weight:700;color:${TERRA}">Vous les fournissez</div>
    <div style="font-size:33px;font-weight:600;margin-top:8px;line-height:1.4">Une indemnité de repas s'ajoute au salaire. Le contrat fixe la nature des repas, leur nombre et le montant.</div>
  </div>
  <div style="margin-top:22px;padding:30px 38px;border-radius:28px;background:${SABLE}">
    <div style="font-size:30px;font-weight:700;color:${TERRA}">Le parent les fournit</div>
    <div style="font-size:33px;font-weight:600;margin-top:8px;line-height:1.4">Pas d'indemnité. Il vous indique par écrit le coût des repas fournis.</div>
  </div>
  <div style="font-size:23px;font-weight:600;margin-top:30px" class="src">Sources : DREETS Pays de la Loire, fiche du 12 juin 2026 · convention collective IDCC 3239, art. 114-2</div>
`);

// 36. LA PERIODE D'ESSAI
pub("36-publication-17-periode-essai.png", `
  <div style="font-size:32px;font-weight:700;color:#F7C7B3;">Embauche · la période d'essai</div>
  <div style="font-size:112px;font-weight:700;line-height:1;margin-top:30px;color:#fff;letter-spacing:-2px">3 mois ou 2 mois</div>
  <div style="font-size:38px;font-weight:600;line-height:1.3;margin-top:24px;color:#fff">au maximum, selon les jours d'accueil prévus au contrat :</div>
  ${liste(["• 1, 2 ou 3 jours par semaine : 3 mois", "• 4 jours et plus : 2 mois", "• autre enfant de la même famille, essai déjà concluant : 30 jours"], "#D6E1E7", 34)}
  <div style="font-size:30px;font-weight:600;line-height:1.45;margin-top:30px;color:#F7C7B3">Facultative : elle n'existe que si le contrat la prévoit.</div>
  <div style="font-size:23px;font-weight:600;margin-top:30px;color:#AFC0CA">Sources : ${SRC_BFC} · convention collective IDCC 3239, art. 95</div>
`, NAVY);

// 37. L'ENFANT ABSENT POUR MALADIE
pub("37-publication-18-absence-enfant-malade.png", `
  <div style="font-size:32px;font-weight:700;color:${TERRA};">L'enfant accueilli est malade</div>
  <div style="font-size:68px;font-weight:700;line-height:1.1;margin-top:26px;max-width:880px">Une retenue sur salaire est possible, dans deux limites.</div>
  <div style="font-size:34px;font-weight:600;line-height:1.4;margin-top:28px;color:#3C5463;max-width:880px">Avec un certificat médical ou un bulletin d'hospitalisation, sur 12 mois à partir de l'embauche :</div>
  ${liste(["• 5 jours au plus pour de courtes absences, consécutives ou non", "• 14 jours calendaires consécutifs au plus"], NAVY, 36)}
  <div style="margin-top:34px;padding:28px 36px;border-radius:28px;background:${SABLE}">
    <div style="font-size:32px;font-weight:700;line-height:1.4">Au-delà, le salaire est dû.</div>
  </div>
  <div style="font-size:23px;font-weight:600;margin-top:30px" class="src">Sources : ${SRC_BFC} · convention collective IDCC 3239, art. 105</div>
`);

// 38. LA DEMISSION
pub("38-publication-19-demission.png", `
  <div style="font-size:32px;font-weight:700;color:#F7C7B3;">Vous démissionnez</div>
  <div style="font-size:66px;font-weight:700;line-height:1.12;margin-top:28px;color:#fff;max-width:880px">Une lettre recommandée avec accusé de réception, puis le préavis.</div>
  ${liste(["• De 3 mois à moins d'un an d'ancienneté : 15 jours calendaires", "• Un an et plus : 1 mois", "• Moins de 3 mois : pas de préavis", "• Pas d'indemnité de rupture ; l'indemnité de congés payés reste due"], "#D6E1E7", 34)}
  <div style="font-size:23px;font-weight:600;margin-top:36px;color:#AFC0CA">Sources : ${SRC_BFC} · convention collective IDCC 3239, art. 119.2.1 · CASF, art. L. 423-26</div>
`, NAVY);

// 39. LES TRAJETS DANS TIMAT
pub("39-publication-20-trajets-timat.png", `
  <div class="rond" style="width:300px;height:300px;background:${PECHE};right:-200px;top:-150px;opacity:.9"></div>
  <div style="font-size:32px;font-weight:700;color:${TERRA}">Dans TiMat</div>
  <div style="font-size:84px;font-weight:700;line-height:1.08;margin-top:22px;max-width:820px">Vos trajets, au bon taux.</div>
  <div style="font-size:36px;font-weight:600;line-height:1.5;margin-top:44px;color:#3C5463;max-width:860px">
    <div>1. Vous notez chaque trajet : la date, l'enfant, les kilomètres.</div>
    <div style="margin-top:10px">2. TiMat vous prévient si le taux est sous le minimum de la convention.</div>
    <div style="margin-top:10px">3. Le total du mois et la feuille de route sont prêts pour le parent.</div>
  </div>
  <div style="font-size:33px;font-weight:700;margin-top:48px;color:${TERRA}">2 mois offerts, sans carte bancaire.</div>
`);

// 40-42. STORIES DU 31 OCTOBRE AU 6 NOVEMBRE 2026.
quiz("40-story-quiz-conges-1080x1920.png", Q_CONGES, "Jours ouvrables, dans la limite de 30 par an.", "Source : DREETS Auvergne-Rhône-Alpes, fiches année complète et incomplète");
story("41-story-pajemploi-5-novembre-1080x1920.png", "Rappel Pajemploi", "Octobre se déclare jusqu'au 5 novembre.", "Une déclaration par enfant, depuis janvier 2026. La période va du 25 du mois au 5 du mois suivant.", "Sources : caf.fr, dépliant Pajemploi · urssaf.fr");
quiz("42-story-quiz-preavis-1080x1920.png", Q_PREAVIS, "Contrat en CDI, retrait de l'enfant par le parent.", "Source : DREETS Bourgogne-Franche-Comté, guide assistants maternels (juin 2026)");

// 43-54. UNE STORY PAR PUBLICATION, DU 28 OCTOBRE AU 27 NOVEMBRE 2026.
// Sophie programme ces stories elle-meme dans Meta Business Suite (le plan
// gratuit de Metricool est plein en novembre). Elle voulait « juste
// repartager la publication du jour » : la story montre donc la publication
// elle-meme, en grand, au milieu. Une premiere version laissait un espace
// vide, prevu pour un autocollant dont ces stories n'ont pas besoin.
// Les images sont celles que Metricool publie (identiques octet pour octet a
// www.timat.app/reseaux/, verifie le 27/10). Le haut et le bas restent
// degages : Instagram y pose le nom du compte et la barre de reponse.
const storyPub = (nom, sujet, publication) => {
  const img = "data:image/png;base64," + b64(new URL(`./visuels/${publication}`, import.meta.url));
  visuels.push([nom, 1080, 1920, base(1080, 1920, `
  <div class="rond" style="width:520px;height:520px;background:${PECHE};right:-200px;top:-220px;opacity:.9"></div>
  <div style="position:absolute;left:90px;right:90px;top:235px">
    <div style="font-size:32px;font-weight:700;color:${TERRA}">Nouvelle publication</div>
    <div style="font-size:54px;font-weight:700;line-height:1.1;margin-top:10px">${sujet}</div>
  </div>
  <img src="${img}" style="position:absolute;left:90px;top:420px;width:900px;height:1125px;border-radius:28px;box-shadow:0 18px 50px rgba(46,74,90,.18)">
  <div style="position:absolute;left:90px;right:90px;top:1580px;font-size:34px;font-weight:700;text-align:center;color:${TERRA}">À lire en entier sur notre page</div>
  <img src="${LOGO}" style="position:absolute;left:50%;transform:translateX(-50%);top:1650px;height:62px">
`, CREME)]);
};
storyPub("43-story-28-octobre-credit-impot-1080x1920.png", "Le crédit d'impôt des parents", "18-publication-7-credit-impot.png");
storyPub("44-story-30-octobre-heures-majorees-1080x1920.png", "Les heures majorées", "19-publication-8-heures-majorees.png");
storyPub("45-story-2-novembre-indemnite-rupture-1080x1920.png", "L'indemnité de rupture", "20-publication-9-indemnite-rupture.png");
storyPub("46-story-4-novembre-pointage-1080x1920.png", "Le pointage dans TiMat", "21-publication-10-pointage-signe.png");
storyPub("47-story-6-novembre-preavis-1080x1920.png", "Le préavis", "30-publication-11-preavis.png");
storyPub("48-story-9-novembre-conge-enfant-malade-1080x1920.png", "Le congé pour enfant malade", "31-publication-12-conge-enfant-malade.png");
storyPub("49-story-13-novembre-documents-fin-contrat-1080x1920.png", "Les documents de fin de contrat", "32-publication-13-documents-fin-contrat.png");
storyPub("50-story-16-novembre-indemnites-kilometriques-1080x1920.png", "Les indemnités kilométriques", "33-publication-14-indemnites-kilometriques.png");
storyPub("51-story-18-novembre-fin-de-contrat-timat-1080x1920.png", "La fin de contrat dans TiMat", "34-publication-15-fin-de-contrat-timat.png");
storyPub("52-story-20-novembre-repas-1080x1920.png", "Les repas", "35-publication-16-repas.png");
storyPub("53-story-23-novembre-periode-essai-1080x1920.png", "La période d'essai", "36-publication-17-periode-essai.png");
storyPub("54-story-27-novembre-absence-enfant-malade-1080x1920.png", "L'enfant accueilli malade", "37-publication-18-absence-enfant-malade.png");

// 55-58. L'EXPLICATION DES QUIZ, publiee juste apres le quiz (pas le soir) :
// la question, les reponses dans l'ordre de l'autocollant, la bonne en vert
// avec une coche, les autres estompees, puis la source. Aucun autocollant.
quizReponse("55-story-reponse-minimum-1080x1920.png", Q_MINIMUM, O_MINIMUM, 2,
  "C'est le minimum conventionnel sans le titre professionnel (4,37 € avec). 3,46 € est le plancher légal : 0,281 × SMIC.",
  "Source : DREETS Pays de la Loire, fiche du 12 juin 2026");
quizReponse("56-story-reponse-pajemploi-1080x1920.png", Q_PAJEMPLOI, O_PAJEMPLOI, 1,
  "Depuis janvier 2026, une déclaration Pajemploi par enfant, même pour deux enfants de la même famille.",
  "Source : urssaf.fr, « Pajemploi : une déclaration par enfant à partir de janvier 2026 »");
quizReponse("57-story-reponse-conges-1080x1920.png", Q_CONGES, O_CONGES, 1,
  "2,5 jours ouvrables par mois de travail, dans la limite de 30 jours par an.",
  "Source : DREETS Auvergne-Rhône-Alpes, fiches année complète et incomplète");
quizReponse("58-story-reponse-preavis-1080x1920.png", Q_PREAVIS, O_PREAVIS, 1,
  "De 3 mois à moins d'un an d'ancienneté : 15 jours calendaires (8 jours avant 3 mois, 1 mois à partir d'un an).",
  "Source : DREETS Bourgogne-Franche-Comté, guide assistants maternels (juin 2026), art. 119.1");

const nav = await chromium.launch({ executablePath: CHROMIUM() });
for (const [nom, w, h, html] of visuels) {
  const p = await nav.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.setContent(html, { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  const deborde = await p.evaluate(() => [...document.querySelectorAll("div")].filter((d) => d.scrollWidth > d.clientWidth + 2 && getComputedStyle(d).overflow === "visible" && d.clientWidth > 0).length);
  await p.screenshot({ path: `${SORTIE}/${nom}`, type: "png" });
  console.log(nom, w + "x" + h, deborde ? `(${deborde} débordement(s) ?)` : "");
  await p.close();
}
await nav.close();
