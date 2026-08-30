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

function titre(doc, texte, sousTitre) {
  doc.fillColor(C.marine).font("Helvetica-Bold").fontSize(19).text(texte, { align: "left" });
  if (sousTitre) {
    doc.moveDown(0.25);
    doc.fillColor(C.gris).font("Helvetica").fontSize(10).text(sousTitre);
  }
  doc.moveDown(0.8);
}

function section(doc, texte) {
  if (doc.y > 700) doc.addPage();
  doc.moveDown(0.5);
  doc.fillColor(C.terra).font("Helvetica-Bold").fontSize(11).text(texte.toUpperCase(), { characterSpacing: 0.6 });
  doc.moveTo(MARGE, doc.y + 3).lineTo(MARGE + LARGEUR, doc.y + 3).strokeColor(C.ligne).lineWidth(0.8).stroke();
  doc.moveDown(0.7);
}

function para(doc, texte, options = {}) {
  doc
    .fillColor(options.couleur || "#3A4A52")
    .font(options.gras ? "Helvetica-Bold" : "Helvetica")
    .fontSize(options.taille || 9.5)
    .text(texte, { width: LARGEUR, align: "left", lineGap: 1.5 });
  doc.moveDown(0.45);
}

function encadre(doc, texte, couleur = C.terra, fond = C.terraPale) {
  const h = doc.heightOfString(texte, { width: LARGEUR - 24, lineGap: 1.5 }) + 18;
  if (doc.y + h > 780) doc.addPage();
  const y = doc.y;
  doc.roundedRect(MARGE, y, LARGEUR, h, 6).fillAndStroke(fond, couleur);
  doc
    .fillColor("#3A4A52")
    .font("Helvetica")
    .fontSize(9)
    .text(texte, MARGE + 12, y + 9, { width: LARGEUR - 24, lineGap: 1.5 });
  doc.y = y + h + 10;
}

/** Ligne a remplir : libelle puis filet de saisie. */
function champ(doc, libelle, largeur = LARGEUR, x = MARGE) {
  const y = doc.y;
  doc.fillColor(C.gris).font("Helvetica").fontSize(8).text(libelle, x, y, { width: largeur });
  const yl = doc.y + 11;
  doc.moveTo(x, yl).lineTo(x + largeur, yl).strokeColor(C.ligne).lineWidth(0.7).stroke();
  doc.y = yl + 7;
}

/** Deux champs cote a cote. */
function champs2(doc, g, d) {
  const l = (LARGEUR - 16) / 2;
  const y = doc.y;
  champ(doc, g, l, MARGE);
  const yg = doc.y;
  doc.y = y;
  champ(doc, d, l, MARGE + l + 16);
  doc.y = Math.max(yg, doc.y);
}

/** Tableau a en-tetes, avec n lignes vierges a remplir. */
function tableau(doc, colonnes, lignes, hauteurLigne = 26) {
  const total = colonnes.reduce((s, c) => s + c.l, 0);
  const ech = LARGEUR / total;
  let y = doc.y;

  // en-tete
  doc.rect(MARGE, y, LARGEUR, 20).fill(C.marine);
  let x = MARGE;
  for (const c of colonnes) {
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .text(c.t, x + 5, y + 6.5, { width: c.l * ech - 10 });
    x += c.l * ech;
  }
  y += 20;

  // lignes vierges
  for (let i = 0; i < lignes; i++) {
    if (y + hauteurLigne > 790) {
      doc.addPage();
      y = MARGE;
      doc.rect(MARGE, y, LARGEUR, 20).fill(C.marine);
      let xx = MARGE;
      for (const c of colonnes) {
        doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(7.5).text(c.t, xx + 5, y + 6.5, { width: c.l * ech - 10 });
        xx += c.l * ech;
      }
      y += 20;
    }
    doc.rect(MARGE, y, LARGEUR, hauteurLigne).fillAndStroke(i % 2 ? "#FBF8F4" : "#FFFFFF", C.ligne);
    let xx = MARGE;
    for (const c of colonnes) {
      xx += c.l * ech;
      if (xx < MARGE + LARGEUR - 1) {
        doc.moveTo(xx, y).lineTo(xx, y + hauteurLigne).strokeColor(C.ligne).lineWidth(0.5).stroke();
      }
    }
    y += hauteurLigne;
  }
  doc.y = y + 12;
}

// Le pied s'ecrit sous la zone de texte : sans lineBreak:false, PDFKit croit
// que le contenu deborde et insere une page vierge a chaque appel.
function pied(doc, mention) {
  const bas = doc.page.height - 28;
  doc
    .fillColor(C.gris)
    .font("Helvetica")
    .fontSize(7)
    .text(mention, MARGE, bas, { width: LARGEUR, align: "center", lineBreak: false });
}

function nouveauDoc(titreMeta) {
  const doc = new PDFDocument({ size: "A4", margin: MARGE, bufferPages: true, info: { Title: titreMeta, Author: "TiMat" } });
  return doc;
}

function finaliser(doc, mention) {
  const plage = doc.bufferedPageRange();
  for (let i = 0; i < plage.count; i++) {
    doc.switchToPage(i);
    // Ecrire sous la zone de texte ferait naitre une page vierge a chaque pied :
    // on annule la marge basse le temps de l'ecrire, puis on la retablit.
    const bas = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    pied(doc, `${mention}   ·   page ${i + 1} sur ${plage.count}   ·   timat.app`);
    doc.page.margins.bottom = bas;
  }
  doc.flushPages();
  doc.end();
}

// --- 1. Registre des medicaments administres --------------------------------

function registreMedicaments() {
  const doc = nouveauDoc("Registre des médicaments administrés");
  doc.pipe(createWriteStream(path.join(OUT, "registre-medicaments-administres.pdf")));

  titre(
    doc,
    "Registre des médicaments administrés",
    "Document obligatoire — article R2111-1 du code de la santé publique"
  );

  encadre(
    doc,
    "Ce registre est imposé par la loi. Depuis le décret du 30 août 2021, chaque administration de " +
      "médicament à un enfant accueilli doit être consignée immédiatement, en précisant le nom de l'enfant, " +
      "la date et l'heure, le nom de la personne qui a administré le médicament, ainsi que le médicament et " +
      "sa posologie. Conservez ce registre à portée de main, et présentez-le à la PMI si elle vous le demande.",
    C.rouge,
    "#FBF1EF"
  );

  section(doc, "Avant de donner un médicament : les quatre vérifications");
  para(doc, "1.  Le médecin n'a pas prescrit l'intervention d'un auxiliaire médical (infirmier, kinésithérapeute).");
  para(doc, "2.  Les titulaires de l'autorité parentale ont expressément autorisé ces soins par écrit.");
  para(doc, "3.  Vous disposez de l'ordonnance au nom de l'enfant, en cours de validité.");
  para(doc, "4.  Le médicament et le matériel nécessaire ont été fournis par les parents.");
  para(
    doc,
    "Si l'une de ces quatre conditions manque, n'administrez pas le médicament : appelez les parents, " +
      "et en cas d'urgence le 15.",
    { gras: true, couleur: C.rouge }
  );

  section(doc, "Identification");
  champs2(doc, "Assistante maternelle — nom et prénom", "Numéro d'agrément");
  champs2(doc, "Adresse du lieu d'accueil", "Registre ouvert le");

  // Les pages de consignation commencent sur une page neuve : une grille pleine
  // et previsible vaut mieux qu'un tableau qui deborde sous le texte.
  const COLONNES = [
    { t: "Date", l: 11 },
    { t: "Heure", l: 8 },
    { t: "Nom de l'enfant", l: 22 },
    { t: "Médicament administré", l: 24 },
    { t: "Dose / posologie", l: 17 },
    { t: "Administré par", l: 18 },
  ];
  for (let p = 0; p < 2; p++) {
    doc.addPage();
    section(doc, "Consignation des administrations");
    para(
      doc,
      "Une ligne par administration, remplie au moment où vous donnez le médicament — pas le soir, pas le lendemain.",
      { couleur: C.gris }
    );
    tableau(doc, COLONNES, 21);
  }

  // Autorisation parentale type
  doc.addPage();
  titre(doc, "Autorisation parentale d'administration de médicaments", "À faire remplir et signer par les parents, à conserver avec l'ordonnance");

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
      "conditions prévues à l'article R2111-1 du code de la santé publique."
  );
  para(doc, "Nous nous engageons à fournir l'ordonnance en cours de validité ainsi que les médicaments correspondants.");

  champ(doc, "Médicament(s) concerné(s) et posologie prescrite");
  champ(doc, "Nom du médecin prescripteur et date de l'ordonnance");
  champs2(doc, "Fait à", "Le");
  doc.moveDown(1.2);
  champs2(doc, "Signature du premier parent", "Signature du second parent");

  encadre(
    doc,
    "À renouveler à chaque nouvelle ordonnance. Une autorisation générale et permanente ne suffit pas : " +
      "l'autorisation porte sur un traitement précis, prescrit, et daté.",
    C.sage,
    "#F3F8F7"
  );

  finaliser(doc, "Registre des médicaments administrés — TiMat");
}

// --- 2. Fiche de renseignements et d'urgence --------------------------------

function ficheUrgence() {
  const doc = nouveauDoc("Fiche de renseignements et d'urgence");
  doc.pipe(createWriteStream(path.join(OUT, "fiche-renseignements-urgence.pdf")));

  titre(doc, "Fiche de renseignements et d'urgence", "Une fiche par enfant — à afficher et à garder accessible en permanence");

  encadre(
    doc,
    "Cette fiche n'est pas imposée par un texte : ce sont les mentions elles-mêmes qui sont obligatoires " +
      "dans le contrat de travail. Mais chercher un contrat de huit pages pendant qu'un enfant convulse n'est " +
      "pas une option. Affichez-la, et remettez-en une copie à toute personne qui vous remplace."
  );

  section(doc, "Numéros d'urgence — à afficher bien en vue");
  const urgences = [
    ["15", "SAMU — urgence médicale, 24 h/24"],
    ["18", "Pompiers — secours, incendie, accident"],
    ["17", "Police et gendarmerie"],
    ["112", "Numéro d'urgence européen — depuis tout téléphone"],
    ["114", "Urgence par SMS — personnes sourdes ou malentendantes"],
    ["119", "Enfance en danger — 24 h/24, gratuit"],
    ["3919", "Violences faites aux femmes — écoute, anonyme et gratuit"],
  ];
  const l1 = 46;
  for (const [num, quoi] of urgences) {
    const y = doc.y;
    doc.roundedRect(MARGE, y, l1, 17, 4).fill(C.rouge);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11).text(num, MARGE, y + 3.5, { width: l1, align: "center" });
    doc.fillColor("#3A4A52").font("Helvetica").fontSize(9).text(quoi, MARGE + l1 + 10, y + 4.5, { width: LARGEUR - l1 - 10 });
    doc.y = y + 21;
  }
  doc.moveDown(0.3);
  champs2(doc, "Centre antipoison de votre région — numéro", "Médecin de garde / maison médicale");
  champ(doc, "Adresse et téléphone de l'hôpital le plus proche");

  section(doc, "L'enfant accueilli");
  champs2(doc, "Nom et prénom", "Date de naissance");
  champ(doc, "Adresse du domicile de l'enfant");

  section(doc, "Les parents");
  champs2(doc, "Parent 1 — nom et prénom", "Téléphone portable");
  champs2(doc, "Employeur et téléphone professionnel", "Adresse électronique");
  champs2(doc, "Parent 2 — nom et prénom", "Téléphone portable");
  champs2(doc, "Employeur et téléphone professionnel", "Adresse électronique");

  section(doc, "Personnes à prévenir si les parents ne répondent pas");
  champs2(doc, "Nom, prénom et lien avec l'enfant", "Téléphone");
  champs2(doc, "Nom, prénom et lien avec l'enfant", "Téléphone");

  section(doc, "Personnes autorisées à venir chercher l'enfant");
  para(doc, "Une pièce d'identité sera demandée. Toute personne non inscrite ici ne pourra pas repartir avec l'enfant.", { couleur: C.gris });
  champs2(doc, "Nom, prénom et lien avec l'enfant", "Téléphone");
  champs2(doc, "Nom, prénom et lien avec l'enfant", "Téléphone");
  champs2(doc, "Nom, prénom et lien avec l'enfant", "Téléphone");

  doc.addPage();
  titre(doc, "Santé et autorisations", "Suite de la fiche de renseignements et d'urgence");

  section(doc, "Santé de l'enfant");
  champs2(doc, "Médecin traitant — nom", "Téléphone du cabinet");
  champ(doc, "Allergies connues (alimentaires, médicamenteuses, autres) et conduite à tenir");
  champ(doc, " ");
  champ(doc, "Traitement en cours, protocole d'accueil individualisé (PAI) éventuel");
  champ(doc, " ");
  champs2(doc, "Vaccinations à jour — date du dernier rappel", "Numéro de sécurité sociale de rattachement");
  champ(doc, "Antécédents utiles à connaître en urgence (convulsions, asthme, diabète, port de lunettes ou d'appareillage)");

  section(doc, "Autorisations parentales");
  const autorisations = [
    "Appeler les secours et faire hospitaliser l'enfant en cas d'urgence, en prévenant les parents dès que possible.",
    "Administrer les médicaments prescrits par ordonnance, dans les conditions de l'article R2111-1 du code de la santé publique.",
    "Sortir avec l'enfant (promenades, parc, courses, relais petite enfance, activités d'éveil).",
    "Transporter l'enfant en voiture, dans un siège homologué adapté à son âge et à son poids.",
    "Photographier l'enfant dans le cadre de l'accueil, sans diffusion publique.",
  ];
  for (const a of autorisations) {
    const y = doc.y;
    doc.rect(MARGE, y + 1.5, 9, 9).lineWidth(0.9).strokeColor(C.marine).stroke();
    doc.rect(MARGE + 26, y + 1.5, 9, 9).lineWidth(0.9).strokeColor(C.marine).stroke();
    doc.fillColor(C.gris).font("Helvetica").fontSize(6.5).text("OUI", MARGE - 1, y + 12).text("NON", MARGE + 24, y + 12);
    doc.fillColor("#3A4A52").font("Helvetica").fontSize(9).text(a, MARGE + 46, y, { width: LARGEUR - 46, lineGap: 1.5 });
    doc.y = Math.max(doc.y, y + 22);
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
  doc.moveDown(1);
  champs2(doc, "Signature du premier parent", "Signature du second parent");
  doc.moveDown(0.6);
  champ(doc, "Signature de l'assistante maternelle", (LARGEUR - 16) / 2);

  encadre(
    doc,
    "À mettre à jour à chaque changement : numéro de téléphone, employeur, traitement, personne autorisée. " +
      "Une fiche périmée est plus dangereuse qu'une fiche absente, parce qu'on lui fait confiance.",
    C.sage,
    "#F3F8F7"
  );

  finaliser(doc, "Fiche de renseignements et d'urgence — TiMat");
}

// --- 3. Projet d'accueil ----------------------------------------------------

function projetAccueil() {
  const doc = nouveauDoc("Projet d'accueil");
  doc.pipe(createWriteStream(path.join(OUT, "projet-accueil.pdf")));

  titre(doc, "Mon projet d'accueil", "Modèle à personnaliser — accueil individuel à domicile ou en MAM");

  encadre(
    doc,
    "Aucun texte n'impose un projet d'accueil à une assistante maternelle. Mais la charte nationale pour " +
      "l'accueil du jeune enfant prévoit que le professionnel explicite la manière dont il met ses principes " +
      "en œuvre, et beaucoup de PMI le demandent à l'agrément comme au renouvellement. C'est aussi, face aux " +
      "parents, ce qui distingue une professionnelle d'une simple solution de garde."
  );

  para(
    doc,
    "Ce modèle suit les thèmes du référentiel national de la qualité d'accueil du jeune enfant (avril 2025). " +
      "Répondez avec vos mots : un projet copié se repère immédiatement, et n'a aucune valeur en entretien.",
    { couleur: C.gris }
  );

  const sections = [
    {
      t: "Qui je suis",
      aide: "Votre parcours, ce qui vous a menée à ce métier, votre formation, votre expérience, votre agrément.",
      lignes: 5,
    },
    {
      t: "Mon lieu d'accueil",
      aide: "Les pièces où les enfants vivent, l'espace de jeu, le coin sommeil, l'extérieur, les animaux éventuels, les aménagements de sécurité.",
      lignes: 5,
    },
    {
      t: "La familiarisation, les premiers jours",
      aide: "Comment vous organisez l'arrivée d'un nouvel enfant : durée, étapes, place du parent, doudou et tétine.",
      lignes: 5,
    },
    {
      t: "Une journée type",
      aide: "Les repères de la journée, sans horaires rigides : accueil, jeu, repas, sieste, sorties, retrouvailles.",
      lignes: 6,
    },
    {
      t: "Le sommeil",
      aide: "Le couchage, le respect du rythme de chaque enfant, l'endormissement, le réveil, le couchage sur le dos et la sécurité.",
      lignes: 4,
    },
    {
      t: "Les repas",
      aide: "Qui fournit les repas, la diversification, le respect de l'appétit, l'autonomie à table, les allergies.",
      lignes: 4,
    },
    {
      t: "Le change et l'acquisition de la propreté",
      aide: "Votre façon de faire, le respect de l'intimité et de la pudeur, l'accompagnement sans forcer.",
      lignes: 4,
    },
    {
      t: "Le jeu, l'éveil et les sorties",
      aide: "Le jeu libre, le matériel, les activités proposées, les sorties quotidiennes en extérieur, votre position sur les écrans.",
      lignes: 5,
    },
    {
      t: "Les émotions, les pleurs, les conflits entre enfants",
      aide: "Comment vous accueillez une colère, un chagrin, une morsure ; les repères et les interdits que vous posez.",
      lignes: 5,
    },
    {
      t: "Ma relation avec les parents",
      aide: "Les transmissions du matin et du soir, ce que vous partagez, la place des parents, le non-jugement, la confidentialité.",
      lignes: 5,
    },
    {
      t: "L'inclusion de tous les enfants",
      aide: "Votre disponibilité pour accueillir un enfant en situation de handicap ou avec un PAI, et ce que cela suppose.",
      lignes: 4,
    },
    {
      t: "La sécurité et les situations d'urgence",
      aide: "Vos gestes de premiers secours, la fiche d'urgence, le registre des médicaments, votre conduite en cas d'accident.",
      lignes: 4,
    },
    {
      t: "Ma formation continue",
      aide: "Les formations suivies ou envisagées, l'analyse de vos pratiques, le relais petite enfance que vous fréquentez.",
      lignes: 4,
    },
  ];

  for (const s of sections) {
    if (doc.y > 620) doc.addPage();
    section(doc, s.t);
    para(doc, s.aide, { couleur: C.gris, taille: 8.5 });
    for (let i = 0; i < s.lignes; i++) champ(doc, " ");
    doc.moveDown(0.3);
  }

  if (doc.y > 620) doc.addPage();
  section(doc, "Date et signature");
  champs2(doc, "Fait à", "Le");
  doc.moveDown(1);
  champ(doc, "Signature", (LARGEUR - 16) / 2);

  encadre(
    doc,
    "Relisez votre projet une fois par an, et après chaque formation. Un projet daté de cinq ans dit à la " +
      "PMI que rien n'a bougé depuis.",
    C.sage,
    "#F3F8F7"
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
