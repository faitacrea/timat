// Rend le contrat PDF hors du navigateur, pour le relire avant de le livrer.
import { readFileSync, writeFileSync } from "node:fs";
import { jsPDF } from "jspdf";
const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const bout = (re, nom) => { const m = src.match(re); if (!m) { console.error("introuvable :", nom); process.exit(1); } return m[0]; };

const ctx = {};
const code = [
  bout(/const CAR_PDF_INTERDITS = .*?;/s),
  bout(/const nettoyerPdf = [\s\S]*?;\n/),
  bout(/const protegerPdf = \(doc\) => \{[\s\S]*?\n\};/),
  bout(/const nbf=[\s\S]*?;\n/),
  bout(/const SEMAINES_ANNEE_COMPLETE=[\s\S]*?const salaireMensualise=[\s\S]*?\n\};/),
  bout(/const MARGE=20[\s\S]*?\nfunction redacteurPdf\(doc,\{titre,sousTitre\}\)\{[\s\S]*?\n\}\n/),
  bout(/const URL_CONVENTION="[^"]*";/),
  bout(/const fmtDatePdf=\(d\)=>\{[\s\S]*?\n\};/),
].join("\n");
const corps = src.slice(src.indexOf("    // 3. Le contrat"), src.indexOf("    // 4. Convertir en blob et uploader"));

const enfant = { prenom: "Léo", nom: "Martin", naissance: "2024-03-01" };
const ct = {
  debut: "2026-09-01", fin: "", heures_hebdo: 40, taux_horaire: 4.20, entretien: 3.80, repas: 3.50,
  jours: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"], horaires: "07h30-17h30",
  annee_complete: process.argv[2] !== "incomplete", semaines_accueil: process.argv[2] === "incomplete" ? 36 : null,
  // Qui fournit les repas : "assmat", "employeur", "mixte", ou rien du tout —
  // ce dernier cas doit imprimer une ligne a completer, pas une affirmation.
  repas_fourni_par: process.argv[3] === "sans-repas" ? null : (process.argv[3] || "assmat"),
  date_signature_asmat: "2026-08-20T10:00:00Z", signature_asmat_data: null,
  date_signature_parent: null, signature_parent_data: null,
};
const parentProfile = { prenom: "Camille", nom: "Martin", adresse: "12 rue des Lilas\n69003 Lyon", telephone: "06 12 34 56 78", email: "camille.martin@mail.fr", numero_pajemploi: "123456789" };
const asmatProfile = { prenom: "Marie", nom: "Dupont", adresse: "4 impasse du Clos\n69100 Villeurbanne", telephone: "06 98 76 54 32", email: "marie.dupont@mail.fr", numero_agrement: "69-2024-0187" };

const fn = new Function("jsPDF", "enfant", "ct", "parentProfile", "asmatProfile", `
${code}
const doc = protegerPdf(new jsPDF({unit:"mm",format:"a4",orientation:"portrait"}));
${corps}
return doc;
`);
const doc = fn(jsPDF, enfant, ct, parentProfile, asmatProfile);
const sortie = "/tmp/contrat-" + (process.argv[2] || "complete") + (process.argv[3] ? "-" + process.argv[3] : "") + ".pdf";
writeFileSync(sortie, Buffer.from(doc.output("arraybuffer")));
console.log(sortie, "-", doc.getNumberOfPages(), "pages");
