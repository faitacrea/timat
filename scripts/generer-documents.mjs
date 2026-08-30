#!/usr/bin/env node
/**
 * TiMat — Generation des documents imprimables vendus en boutique.
 *
 *   npm run documents
 *
 * Produit des PDF A4 prets a imprimer dans documents/. Ces fichiers ne sont pas
 * servis par le site : ils sont livres a l'acheteur apres paiement. Le dossier
 * public/ n'est jamais touche ici.
 *
 * Le rendu passe par PDFKit plutot que par un navigateur : la chaine reste
 * utilisable partout, sans Chromium ni dependance systeme.
 */

import { mkdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "documents");

// Palette alignee sur les pages du site.
const C = {
  marine: "#2E4859",
  terra: "#C76754",
  terraPale: "#FDF6F4",
  sage: "#5DA9A1",
  gris: "#7C8A90",
  ligne: "#DFD6CC",
  creme: "#FDFBF8",
  rouge: "#C84B31",
};

const MARGE = 42;
const LARGEUR = 595.28 - MARGE * 2; // A4 portrait

// --- briques de mise en page -----------------------------------------------

/**
 * Bandeau de tete : un aplat marine sur toute la largeur de page, le titre en
 * blanc, et une pastille de statut a droite. Il pose l'identite du document des
 * la premiere seconde, y compris sur une photocopie en noir et blanc.
 */
function bandeau(doc, texte, sousTitre, pastille) {
  const H = 78;
  doc.rect(0, 0, 595.28, H).fill(C.marine);
  doc.rect(0, H, 595.28, 3).fill(C.terra);

  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(17).text(texte, MARGE, 22, { width: LARGEUR - 96 });
  if (sousTitre) {
    doc.fillColor("#B9CBD4").font("Helvetica").fontSize(8.5).text(sousTitre, MARGE, doc.y + 3, { width: LARGEUR - 96 });
  }
  if (pastille) {
    const l = doc.widthOfString(pastille, { font: "Helvetica-Bold", size: 7.5 }) + 16;
    doc.roundedRect(595.28 - MARGE - l, 24, l, 16, 8).fill(pastille === "OBLIGATOIRE" ? C.rouge : C.sage);
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .text(pastille, 595.28 - MARGE - l, 29, { width: l, align: "center", characterSpacing: 0.4 });
  }
  doc.y = H + 20;
  doc.x = MARGE;
}

/** Titre de section : pave colore a gauche, intitule en marine, filet dessous. */
function section(doc, texte) {
  if (doc.y > 715) doc.addPage();
  doc.moveDown(0.35);
  const y = doc.y;
  doc.rect(MARGE, y + 1, 3, 11).fill(C.terra);
  doc
    .fillColor(C.marine)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(texte.toUpperCase(), MARGE + 10, y, { characterSpacing: 0.5, width: LARGEUR - 10 });
  const yl = doc.y + 4;
  doc.moveTo(MARGE, yl).lineTo(MARGE + LARGEUR, yl).strokeColor(C.ligne).lineWidth(0.6).stroke();
  doc.y = yl + 8;
  doc.x = MARGE;
}

function para(doc, texte, options = {}) {
  doc.x = MARGE;
  doc
    .fillColor(options.couleur || "#3A4A52")
    .font(options.gras ? "Helvetica-Bold" : "Helvetica")
    .fontSize(options.taille || 9)
    .text(texte, { width: LARGEUR, align: "left", lineGap: 1.4 });
  doc.moveDown(0.4);
}

/** Encadre : liseré epais a gauche plutot qu'un cadre complet, plus sobre. */
function encadre(doc, texte, couleur = C.terra, fond = C.terraPale) {
  const h = doc.heightOfString(texte, { width: LARGEUR - 30, lineGap: 1.4 }) + 16;
  if (doc.y + h > 770) doc.addPage();
  const y = doc.y;
  doc.rect(MARGE, y, LARGEUR, h).fill(fond);
  doc.rect(MARGE, y, 3.5, h).fill(couleur);
  doc
    .fillColor("#3A4A52")
    .font("Helvetica")
    .fontSize(8.5)
    .text(texte, MARGE + 16, y + 8, { width: LARGEUR - 30, lineGap: 1.4 });
  doc.y = y + h + 9;
  doc.x = MARGE;
}

/**
 * Champ a remplir : un pave clair borde, libelle en petites capitales au-dessus.
 * Une zone fermee se remplit mieux a la main qu'un simple filet, et se repere
 * plus vite quand on cherche une information dans l'urgence.
 */
function champ(doc, libelle, largeur = LARGEUR, x = MARGE, hauteur = 19) {
  // Un rectangle ne declenche pas de saut de page automatique, contrairement au
  // texte : sans ce garde-fou, un champ peut se dessiner sous le pied de page.
  if (doc.y + hauteur + 16 > 772) doc.addPage();
  const y = doc.y;
  if (libelle && libelle.trim()) {
    doc
      .fillColor(C.gris)
      .font("Helvetica-Bold")
      .fontSize(6.5)
      .text(libelle.toUpperCase(), x, y, { width: largeur, characterSpacing: 0.3 });
  }
  const yb = libelle && libelle.trim() ? doc.y + 2 : y;
  doc.roundedRect(x, yb, largeur, hauteur, 3).fillAndStroke("#FCFAF7", C.ligne);
  doc.y = yb + hauteur + 7;
  doc.x = MARGE;
}

/** Deux champs cote a cote. */
function champs2(doc, g, d, hauteur = 19) {
  // Le saut doit avoir lieu avant le premier des deux champs, sinon la paire se
  // retrouve a cheval sur deux pages.
  if (doc.y + hauteur + 16 > 772) doc.addPage();
  const l = (LARGEUR - 14) / 2;
  const y = doc.y;
  champ(doc, g, l, MARGE, hauteur);
  const yg = doc.y;
  doc.y = y;
  champ(doc, d, l, MARGE + l + 14, hauteur);
  doc.y = Math.max(yg, doc.y);
  doc.x = MARGE;
}

/** Tableau a en-tetes, avec n lignes vierges a remplir. */
function tableau(doc, colonnes, lignes, hauteurLigne = 26) {
  const total = colonnes.reduce((s, c) => s + c.l, 0);
  const ech = LARGEUR / total;
  let y = doc.y;

  const enTete = () => {
    doc.rect(MARGE, y, LARGEUR, 19).fill(C.marine);
    let x = MARGE;
    for (const c of colonnes) {
      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(7)
        .text(c.t.toUpperCase(), x + 5, y + 6.5, { width: c.l * ech - 10, characterSpacing: 0.3 });
      x += c.l * ech;
    }
    y += 19;
  };

  enTete();
  for (let i = 0; i < lignes; i++) {
    if (y + hauteurLigne > 780) {
      doc.addPage();
      y = MARGE;
      enTete();
    }
    doc.rect(MARGE, y, LARGEUR, hauteurLigne).fillAndStroke(i % 2 ? "#FBF8F4" : "#FFFFFF", C.ligne);
    let xx = MARGE;
    for (const c of colonnes) {
      xx += c.l * ech;
      if (xx < MARGE + LARGEUR - 1) {
        doc.moveTo(xx, y).lineTo(xx, y + hauteurLigne).strokeColor(C.ligne).lineWidth(0.4).stroke();
      }
    }
    y += hauteurLigne;
  }
  doc.y = y + 10;
  doc.x = MARGE;
}

// Le pied s'ecrit sous la zone de texte : sans neutraliser la marge basse,
// PDFKit croit que le contenu deborde et insere une page vierge a chaque appel.
function pied(doc, mention) {
  const y = doc.page.height - 30;
  doc.moveTo(MARGE, y - 6).lineTo(MARGE + LARGEUR, y - 6).strokeColor(C.ligne).lineWidth(0.5).stroke();
  doc
    .fillColor(C.gris)
    .font("Helvetica")
    .fontSize(6.5)
    .text(mention, MARGE, y, { width: LARGEUR, align: "center", lineBreak: false });
}

function nouveauDoc(titreMeta) {
  return new PDFDocument({
    size: "A4",
    margin: MARGE,
    bufferPages: true,
    info: { Title: titreMeta, Author: "TiMat", Creator: "TiMat — timat.app" },
  });
}

function finaliser(doc, mention) {
  const plage = doc.bufferedPageRange();
  for (let i = 0; i < plage.count; i++) {
    doc.switchToPage(i);
    const bas = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    pied(doc, `${mention}   ·   page ${i + 1} sur ${plage.count}   ·   timat.app`);
    doc.page.margins.bottom = bas;
  }
  doc.flushPages();
  doc.end();
}

// --- 1. Registre des medicaments administres --------------------------------

const COLONNES_REGISTRE = [
  { t: "Date", l: 11 },
  { t: "Heure", l: 8 },
  { t: "Nom de l'enfant", l: 22 },
  { t: "Médicament administré", l: 24 },
  { t: "Dose / posologie", l: 17 },
  { t: "Administré par", l: 18 },
];

function registreMedicaments() {
  const doc = nouveauDoc("Registre des médicaments administrés");
  doc.pipe(createWriteStream(path.join(OUT, "registre-medicaments-administres.pdf")));

  bandeau(
    doc,
    "Registre des médicaments administrés",
    "Article R2111-1 du code de la santé publique",
    "OBLIGATOIRE"
  );

  encadre(
    doc,
    "Chaque administration de médicament doit être consignée immédiatement : nom de l'enfant, date et " +
      "heure, nom de la personne qui l'a administré, médicament et posologie. Gardez ce registre à portée " +
      "de main, et présentez-le à la PMI si elle vous le demande.",
    C.rouge,
    "#FBF1EF"
  );

  section(doc, "Avant de donner un médicament : quatre vérifications");
  const verifs = [
    "Le médecin n'a pas prescrit l'intervention d'un auxiliaire médical (infirmier, kinésithérapeute).",
    "Les titulaires de l'autorité parentale ont expressément autorisé ces soins par écrit.",
    "Vous disposez de l'ordonnance au nom de l'enfant, en cours de validité.",
    "Le médicament et le matériel nécessaire ont été fournis par les parents.",
  ];
  verifs.forEach((v, i) => {
    const y = doc.y;
    doc.circle(MARGE + 7, y + 5, 7).fill(C.marine);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7.5).text(String(i + 1), MARGE + 3, y + 2, { width: 8, align: "center" });
    doc.fillColor("#3A4A52").font("Helvetica").fontSize(9).text(v, MARGE + 22, y + 1, { width: LARGEUR - 22, lineGap: 1.3 });
    doc.y = Math.max(doc.y, y + 17);
    doc.x = MARGE;
  });
  doc.moveDown(0.2);
  encadre(
    doc,
    "Si l'une de ces quatre conditions manque, n'administrez pas le médicament : appelez les parents, et en " +
      "cas d'urgence le 15.",
    C.rouge,
    "#FBF1EF"
  );

  section(doc, "Identification");
  champs2(doc, "Assistante maternelle — nom et prénom", "Numéro d'agrément");
  champs2(doc, "Adresse du lieu d'accueil", "Registre ouvert le");

  // Les grilles de consignation demarrent sur une page neuve : une page pleine
  // et previsible vaut mieux qu'un tableau coince sous du texte.
  for (let p = 0; p < 2; p++) {
    doc.addPage();
    section(doc, "Consignation des administrations");
    para(doc, "Une ligne par administration, remplie au moment où vous donnez le médicament — pas le soir, pas le lendemain.", {
      couleur: C.gris,
      taille: 8.5,
    });
    tableau(doc, COLONNES_REGISTRE, 21);
  }

  doc.addPage();
  bandeau(
    doc,
    "Autorisation parentale d'administration",
    "À faire signer par les parents, à conserver avec l'ordonnance",
    "À SIGNER"
  );

  section(doc, "L'enfant");
  champs2(doc, "Nom et prénom de l'enfant", "Date de naissance");

  section(doc, "Les titulaires de l'autorité parentale");
  champs2(doc, "Nom et prénom", "Téléphone");
  champs2(doc, "Nom et prénom", "Téléphone");

  section(doc, "Autorisation");
  para(
    doc,
    "Nous soussignés, titulaires de l'autorité parentale sur l'enfant désigné ci-dessus, autorisons " +
      "l'assistante maternelle à lui administrer les médicaments prescrits par ordonnance médicale, dans les " +
      "conditions prévues à l'article R2111-1 du code de la santé publique. Nous nous engageons à fournir " +
      "l'ordonnance en cours de validité ainsi que les médicaments correspondants."
  );
  champ(doc, "Médicament(s) concerné(s) et posologie prescrite");
  champ(doc, "Nom du médecin prescripteur et date de l'ordonnance");
  champs2(doc, "Fait à", "Le");
  champs2(doc, "Signature du premier parent", "Signature du second parent", 46);

  encadre(
    doc,
    "À renouveler à chaque nouvelle ordonnance. Une autorisation générale et permanente ne suffit pas : " +
      "elle porte sur un traitement précis, prescrit, et daté.",
    C.sage,
    "#F2F8F7"
  );

  finaliser(doc, "Registre des médicaments administrés — TiMat");
}

// --- 2. Fiche de renseignements et d'urgence --------------------------------

function ficheUrgence() {
  const doc = nouveauDoc("Fiche de renseignements et d'urgence");
  doc.pipe(createWriteStream(path.join(OUT, "fiche-renseignements-urgence.pdf")));

  bandeau(doc, "Fiche de renseignements et d'urgence", "Une fiche par enfant — à afficher et à garder accessible", "À AFFICHER");

  // Les numeros d'urgence en grille deux colonnes : sept lignes empilees
  // mangeaient une demi-page, et c'est la partie qu'on doit lire d'un coup d'oeil.
  section(doc, "Numéros d'urgence");
  const urgences = [
    ["15", "SAMU — urgence médicale"],
    ["18", "Pompiers — secours, accident"],
    ["17", "Police, gendarmerie"],
    ["112", "Urgence européen"],
    ["114", "Urgence par SMS — surdité"],
    ["119", "Enfance en danger"],
    ["3919", "Violences faites aux femmes"],
  ];
  const colL = (LARGEUR - 12) / 2;
  let yBase = doc.y;
  urgences.forEach(([num, quoi], i) => {
    const col = i % 2;
    const rang = Math.floor(i / 2);
    const x = MARGE + col * (colL + 12);
    const y = yBase + rang * 21;
    doc.roundedRect(x, y, 40, 16, 3).fill(C.rouge);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10).text(num, x, y + 3.5, { width: 40, align: "center" });
    doc.fillColor("#3A4A52").font("Helvetica").fontSize(8.5).text(quoi, x + 46, y + 4, { width: colL - 46 });
  });
  doc.y = yBase + Math.ceil(urgences.length / 2) * 21 + 4;
  doc.x = MARGE;
  champs2(doc, "Centre antipoison de votre région", "Médecin de garde / maison médicale");

  section(doc, "L'enfant accueilli");
  champs2(doc, "Nom et prénom", "Date de naissance");
  champ(doc, "Adresse du domicile de l'enfant");

  section(doc, "Les parents");
  champs2(doc, "Parent 1 — nom et prénom", "Téléphone portable");
  champs2(doc, "Employeur et téléphone professionnel", "Adresse électronique");
  champs2(doc, "Parent 2 — nom et prénom", "Téléphone portable");
  champs2(doc, "Employeur et téléphone professionnel", "Adresse électronique");

  section(doc, "À prévenir si les parents ne répondent pas");
  champs2(doc, "Nom, prénom et lien avec l'enfant", "Téléphone");
  champs2(doc, "Nom, prénom et lien avec l'enfant", "Téléphone");

  section(doc, "Autorisées à venir chercher l'enfant");
  para(doc, "Une pièce d'identité sera demandée. Toute personne non inscrite ici ne pourra pas repartir avec l'enfant.", {
    couleur: C.gris,
    taille: 8,
  });
  champs2(doc, "Nom, prénom et lien", "Téléphone");
  champs2(doc, "Nom, prénom et lien", "Téléphone");

  // Page 2 : sante, autorisations, signatures.
  doc.addPage();
  bandeau(doc, "Santé et autorisations", "Suite de la fiche — nom de l'enfant : ...........................................", "À AFFICHER");

  section(doc, "Santé de l'enfant");
  champs2(doc, "Médecin traitant — nom", "Téléphone du cabinet");
  champ(doc, "Allergies connues et conduite à tenir", LARGEUR, MARGE, 32);
  champ(doc, "Traitement en cours, protocole d'accueil individualisé (PAI) éventuel", LARGEUR, MARGE, 32);
  champs2(doc, "Vaccinations — date du dernier rappel", "Numéro de sécurité sociale de rattachement");
  champ(doc, "Antécédents utiles en urgence (convulsions, asthme, diabète, appareillage)", LARGEUR, MARGE, 26);

  section(doc, "Autorisations parentales");
  const autorisations = [
    "Appeler les secours et faire hospitaliser l'enfant en cas d'urgence, en prévenant les parents dès que possible.",
    "Administrer les médicaments prescrits par ordonnance (article R2111-1 du code de la santé publique).",
    "Sortir avec l'enfant : promenades, parc, courses, relais petite enfance, activités d'éveil.",
    "Transporter l'enfant en voiture, dans un siège homologué adapté à son âge et à son poids.",
    "Photographier l'enfant dans le cadre de l'accueil, sans diffusion publique.",
  ];
  for (const a of autorisations) {
    const y = doc.y;
    doc.roundedRect(MARGE, y, 13, 11, 2).fillAndStroke("#FFFFFF", C.marine);
    doc.roundedRect(MARGE + 20, y, 13, 11, 2).fillAndStroke("#FFFFFF", C.marine);
    doc.fillColor(C.gris).font("Helvetica-Bold").fontSize(5.5).text("OUI", MARGE, y + 12.5, { width: 13, align: "center" });
    doc.fillColor(C.gris).font("Helvetica-Bold").fontSize(5.5).text("NON", MARGE + 20, y + 12.5, { width: 13, align: "center" });
    doc.fillColor("#3A4A52").font("Helvetica").fontSize(8.5).text(a, MARGE + 42, y + 1, { width: LARGEUR - 42, lineGap: 1.2 });
    doc.y = Math.max(doc.y, y + 21);
    doc.x = MARGE;
  }

  encadre(
    doc,
    "En cas d'urgence vitale, appelez le 15 avant toute chose. L'autorisation parentale n'est jamais un " +
      "préalable au secours : elle sert à agir vite, pas à hésiter.",
    C.rouge,
    "#FBF1EF"
  );

  section(doc, "Signatures");
  champs2(doc, "Fait à", "Le");
  champs2(doc, "Signature du premier parent", "Signature du second parent", 42);
  champ(doc, "Signature de l'assistante maternelle", (LARGEUR - 14) / 2, MARGE, 42);

  encadre(
    doc,
    "À mettre à jour à chaque changement : téléphone, employeur, traitement, personne autorisée. Une fiche " +
      "périmée est plus dangereuse qu'une fiche absente, parce qu'on lui fait confiance.",
    C.sage,
    "#F2F8F7"
  );

  finaliser(doc, "Fiche de renseignements et d'urgence — TiMat");
}

// --- 3. Projet d'accueil ----------------------------------------------------

function projetAccueil() {
  const doc = nouveauDoc("Projet d'accueil");
  doc.pipe(createWriteStream(path.join(OUT, "projet-accueil.pdf")));

  bandeau(doc, "Mon projet d'accueil", "Modèle à personnaliser — accueil à domicile ou en MAM", "À COMPLÉTER");

  encadre(
    doc,
    "Aucun texte n'impose un projet d'accueil à une assistante maternelle. Mais la charte nationale pour " +
      "l'accueil du jeune enfant prévoit que le professionnel explicite la manière dont il met ses principes " +
      "en œuvre, et beaucoup de PMI le demandent à l'agrément comme au renouvellement. C'est aussi, face aux " +
      "parents, ce qui distingue une professionnelle d'une simple solution de garde."
  );
  para(
    doc,
    "Ce modèle suit les thèmes du référentiel national de la qualité d'accueil du jeune enfant (2025). " +
      "Répondez avec vos mots : un projet copié se repère immédiatement, et n'a aucune valeur en entretien.",
    { couleur: C.gris, taille: 8.5 }
  );

  const sections = [
    ["Qui je suis", "Votre parcours, ce qui vous a menée à ce métier, votre formation, votre agrément.", 3],
    ["Mon lieu d'accueil", "Les pièces où les enfants vivent, l'espace de jeu, le coin sommeil, l'extérieur, les animaux, les aménagements de sécurité.", 3],
    ["La familiarisation, les premiers jours", "Comment vous organisez l'arrivée d'un enfant : durée, étapes, place du parent, doudou et tétine.", 3],
    ["Une journée type", "Les repères de la journée, sans horaires rigides : accueil, jeu, repas, sieste, sorties, retrouvailles.", 4],
    ["Le sommeil", "Le couchage, le rythme de chaque enfant, l'endormissement, le réveil, le couchage sur le dos.", 3],
    ["Les repas", "Qui fournit les repas, la diversification, le respect de l'appétit, l'autonomie à table, les allergies.", 3],
    ["Le change et la continence", "Votre façon de faire, le respect de l'intimité et de la pudeur, l'accompagnement sans forcer.", 3],
    ["Le jeu, l'éveil et les sorties", "Le jeu libre, le matériel, les activités, les sorties quotidiennes, votre position sur les écrans.", 4],
    ["Les émotions, les pleurs, les conflits", "Comment vous accueillez une colère, un chagrin, une morsure ; les repères et les interdits que vous posez.", 4],
    ["Ma relation avec les parents", "Les transmissions du matin et du soir, la place des parents, le non-jugement, la confidentialité.", 4],
    ["L'inclusion de tous les enfants", "Votre disponibilité pour accueillir un enfant en situation de handicap ou avec un PAI.", 3],
    ["La sécurité et les urgences", "Vos gestes de premiers secours, la fiche d'urgence, le registre des médicaments, votre conduite en cas d'accident.", 3],
    ["Ma formation continue", "Les formations suivies ou envisagées, l'analyse de vos pratiques, le relais petite enfance que vous fréquentez.", 3],
  ];

  for (const [t, aide, lignes] of sections) {
    if (doc.y > 640) doc.addPage();
    section(doc, t);
    para(doc, aide, { couleur: C.gris, taille: 8 });
    champ(doc, "", LARGEUR, MARGE, lignes * 16);
    doc.moveDown(0.1);
  }

  if (doc.y > 660) doc.addPage();
  section(doc, "Date et signature");
  champs2(doc, "Fait à", "Le");
  champ(doc, "Signature", (LARGEUR - 14) / 2, MARGE, 42);

  encadre(
    doc,
    "Relisez votre projet une fois par an, et après chaque formation. Un projet daté de cinq ans dit à la " +
      "PMI que rien n'a bougé depuis.",
    C.sage,
    "#F2F8F7"
  );

  finaliser(doc, "Mon projet d'accueil — TiMat");
}

// --- main -------------------------------------------------------------------

async function main() {
  await mkdir(OUT, { recursive: true });
  registreMedicaments();
  ficheUrgence();
  projetAccueil();
  console.log("[documents] registre des médicaments + fiche d'urgence + projet d'accueil générés dans documents/");
}

main().catch((e) => {
  console.error("[documents] Échec :", e);
  process.exit(1);
});
