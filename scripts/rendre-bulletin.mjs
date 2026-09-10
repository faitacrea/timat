// Rend le bulletin de paie hors du navigateur, pour le relire avant de le
// livrer. Meme raison que pour le contrat : on ne s'apercoit d'une rubrique
// manquante ou d'une ligne qui deborde qu'en regardant le document.
//
//   node scripts/rendre-bulletin.mjs [complete|incomplete]
import { readFileSync, writeFileSync } from "node:fs";
import { jsPDF } from "jspdf";

const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const bout = (re, nom) => { const m = src.match(re); if (!m) { console.error("introuvable :", nom || re); process.exit(1); } return m[0]; };

const incomplete = process.argv[2] === "incomplete";
const prelude = [
  bout(/const CAR_PDF_INTERDITS = .*?;/s),
  bout(/const nettoyerPdf = [\s\S]*?;\n/),
  bout(/const protegerPdf = \(doc\) => \{[\s\S]*?\n\};/),
  bout(/const nbf=[\s\S]*?;\n/),
  bout(/const SEMAINES_ANNEE_COMPLETE=[\s\S]*?const salaireMensualise=[\s\S]*?\n\};/),
  bout(/const fmtDatePdf=\(d\)=>\{[\s\S]*?\n\};/),
  bout(/const TAUX_COTISATIONS=\{[\s\S]*?\n\};/),
  bout(/const cotisation=[\s\S]*?;\n/),
].join("\n");

// Le corps du bulletin, extrait tel quel du source.
let corps = src.slice(src.indexOf("      // 1. Generer le PDF en jsPDF natif"), src.indexOf('      const blob=doc.output("blob");'));
// Le script fournit deja jsPDF, le document et les constantes de mise en page :
// on retire les lignes du source qui les redeclarent ou lisent Supabase.
for (const re of [
  /^\s*const jsPDF=await chargerJsPDF\(\);$/m,
  /^\s*const doc=protegerPdf\(new jsPDF\([^\n]*$/m,
  /^\s*const PW=210,MX=15;let y=15;$/m,
  /^\s*const orange=\[[^\n]*$/m,
  /^\s*let userSig=[^\n]*$/m,
  /^\s*const\{data:fresh\}=await[^\n]*$/m,
  /^\s*if\(fresh\?\.signature_base64\)[^\n]*$/m,
]) corps = corps.replace(re, "");

const contrat = { debut: "2026-01-01", heuresHebdo: 40, tauxHoraire: 4.20, entretien: 3.80,
  anneeComplete: !incomplete, semainesAccueil: incomplete ? 36 : null, jours: ["Lundi","Mardi","Mercredi","Jeudi","Vendredi"] };
const brut = 728, retenue = 33.69;
const ctx = {
  moisSel: "Septembre 2026", contrat,
  enfant: { prenom: "Léo", parent: { prenom: "Camille", nom: "Martin" } },
  user: { prenom: "Marie", nom: "Dupont", id: "u1" },
  fresh: { numero_agrement: "69-2024-0187", signature_base64: null },
  userSig: null,
  heuresNorm: 173, hSupp: 0, tauxH: 4.20, salBase: 726.6, joursTravailles: 21,
  entretien: 79.8, repasJour: 3.5, repasMois: 73.5, retenue, anneeComplete: !incomplete,
  heuresAbsAsmat: 8, joursAbsAsmat: 1, brutApresRetenue: brut - retenue,
  cpAcquis: 2.5, abLabel: "8 h × 4,91 €", abattementMois: 157.12,
};
const noms = Object.keys(ctx);
const fn = new Function("jsPDF", ...noms, `
${prelude}
const doc = protegerPdf(new jsPDF({unit:"mm",format:"a4",orientation:"portrait"}));
const PW=210,MX=15;let y=15;
const orange=[184,98,47];const noir=[40,40,40];const gris=[120,120,120];const vert=[42,157,143];
const totalCotSal=Object.values(TAUX_COTISATIONS).reduce((s,t)=>s+(t.sal>0?cotisation(t,"sal"):0),0);
const totalCotPat=Object.values(TAUX_COTISATIONS).reduce((s,t)=>s+(t.pat>0?cotisation(t,"pat"):0),0);
const netPaye=brutApresRetenue-totalCotSal;
const netImposable=Math.round((netPaye+brutApresRetenue*0.9825*0.029)*100)/100;
const coutEmployeur=brutApresRetenue+totalCotPat;
const netSocial=Math.round((brutApresRetenue-totalCotSal)*100)/100;
const netImpApresAbattement=Math.max(0,Math.round((netImposable+entretien+repasMois-abattementMois)*100)/100);
${corps}
return doc;
`);
const doc = fn(jsPDF, ...noms.map((n) => ctx[n]));
const sortie = "/tmp/bulletin-" + (incomplete ? "incomplete" : "complete") + ".pdf";
writeFileSync(sortie, Buffer.from(doc.output("arraybuffer")));
console.log(sortie, "-", doc.getNumberOfPages(), "pages");
