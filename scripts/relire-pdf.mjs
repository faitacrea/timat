import { readFileSync } from "node:fs";
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(process.argv[2])) }).promise;
for (let p = 1; p <= doc.numPages; p++) {
  const c = await (await doc.getPage(p)).getTextContent();
  let y = null, ligne = [];
  console.log(`\n───────── PAGE ${p} ─────────`);
  for (const it of c.items) {
    const ny = Math.round(it.transform[5]);
    if (y !== null && Math.abs(ny - y) > 1) { console.log(ligne.join("")); ligne = []; }
    y = ny; ligne.push(it.str);
  }
  if (ligne.length) console.log(ligne.join(""));
}
