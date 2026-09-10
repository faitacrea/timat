// Rend chaque page d'un PDF en PNG, pour la relire.
import { readFileSync, writeFileSync } from "node:fs";
import { createCanvas } from "canvas";
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const fichier = process.argv[2];
const prefixe = process.argv[3] || "/tmp/apercu";
const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(fichier)), useSystemFonts: false, standardFontDataUrl: new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url).href }).promise;
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 2 });
  const cv = createCanvas(vp.width, vp.height);
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, vp.width, vp.height);
  await page.render({ canvasContext: ctx, viewport: vp, canvas: cv }).promise;
  writeFileSync(`${prefixe}-p${p}.png`, cv.toBuffer("image/png"));
}
console.log(doc.numPages, "page(s) →", prefixe + "-p*.png");
