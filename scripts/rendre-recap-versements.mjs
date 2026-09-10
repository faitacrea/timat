// Rend le recapitulatif des versements hors du navigateur, pour le relire.
// C'est un PDF : un parcours navigateur ne peut pas en lire le texte, il faut
// donc le fabriquer ici comme pour le contrat et le bulletin.
//
//   node scripts/rendre-recap-versements.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { jsPDF } from "jspdf";
const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const bout = (re) => { const m = src.match(re); if (!m) { console.error("introuvable :", re); process.exit(1); } return m[0]; };
const prelude = [
  bout(/const CAR_PDF_INTERDITS = .*?;/s),
  bout(/const nettoyerPdf = [\s\S]*?;\n/),
  bout(/const protegerPdf = \(doc\) => \{[\s\S]*?\n\};/),
  bout(/const nbf=[\s\S]*?;\n/),
  bout(/const fmtDatePdf=\(d\)=>\{[\s\S]*?\n\};/),
  bout(/const CI_PLAFOND_DEPENSES = \d+;/),
  bout(/const CI_TAUX = [\d.]+;/),
].join("\n");

let corps = src.slice(src.indexOf("const telechargerPDF=async()=>{", src.indexOf("function AttestationFiscale")),
                      src.indexOf("setToast(", src.indexOf("function AttestationFiscale")));
for (const re of [
  /^\s*const jsPDF=await chargerJsPDF\(\);$/m,
  /^\s*const doc=protegerPdf\(new jsPDF\([^\n]*$/m,
  /^\s*let userSig=[^\n]*$/m,
  /^\s*let userAgrement=[^\n]*$/m,
  /^\s*if\(user\?\.id\)\{[\s\S]*?\n\s*\}$/m,
  /^\s*const telechargerPDF=async\(\)=>\{$/m,
  /^\s*setGen\(true\);$/m,
  /^\s*try\{$/m,
  /^\s*const PW=210,MX=18;let y=20;$/m,
  /^\s*const vert=\[42,157,143\];[^\n]*$/m,
]) corps = corps.replace(re, "");
corps = corps.slice(0, corps.lastIndexOf("doc.save") > 0 ? corps.lastIndexOf("doc.save") : corps.length);

const ctx = {
  annee: 2025,
  user: { prenom: "Marie", nom: "Test", email: "marie@test.fr", id: "u1" },
  userAgrement: "69-2024-0187",
  enfant: { prenom: "Léo", naissance: "2024-03-01", prenomParent: "Camille", nomParent: "Martin" },
  contrat: { heuresHebdo: 40, tauxHoraire: 4.2, entretien: 3.8, anneeComplete: true },
  hasReal: true,
  realStats: { heures: 1800, jours: 210, paiements: 8736, nbPaiements: 12, nbAbsences: 3,
    versements: [{ date: "2025-01-05", mode: "virement", periode: "Janvier 2025", montant: 728 },
                 { date: "2025-02-05", mode: "virement", periode: "Février 2025", montant: 728 }] },
  hMens: 173, tauxH: 4.2, entretienJour: 3.8, moisTravailles: 12,
  estSalNet: 6800, estEntretien: 985, totalReel: 8736, totalEstime: 7785, totalAffiche: 8736,
  heuresAnnuelles: 1800, joursAnnuels: 210, sourceLabel: "(données réelles)", salMensBrut: 726.6,
  versementsList: [{ date: "2025-01-05", mode: "virement", periode: "Janvier 2025", montant: 728 },
                   { date: "2025-02-05", mode: "virement", periode: "Février 2025", montant: 728 }],
  MODE_LBL: { virement: "Virement", cheque: "Chèque", especes: "Espèces", cesu: "CESU", autre: "Autre" },
  fmtD: (d) => { try { return new Date(d).toLocaleDateString("fr-FR"); } catch { return d || ""; } },
  fmtE: (n) => (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €",
  netDepuisBrut: (b) => Math.round(b * 0.781 * 100) / 100,
  userSig: null,
};
const noms = Object.keys(ctx);
const fn = new Function("jsPDF", ...noms, `
${prelude}
const doc = protegerPdf(new jsPDF({unit:"mm",format:"a4",orientation:"portrait"}));
const PW=210,MX=18;let y=20;
const vert=[42,157,143];const noir=[40,40,40];const gris=[120,120,120];const bleuFonce=[38,70,83];
${corps}
return doc;
`);
const doc = fn(jsPDF, ...noms.map((n) => ctx[n]));
writeFileSync("/tmp/recap-versements.pdf", Buffer.from(doc.output("arraybuffer")));
console.log("/tmp/recap-versements.pdf -", doc.getNumberOfPages(), "pages");
