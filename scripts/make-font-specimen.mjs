// Erzeugt einmalig eine PNG-Grafik mit allen 8 kuratierten Schriftarten
// (siehe lib/fonts.ts) als Beispielsatz-Liste, eine Zeile pro Schrift.
// Wird als statisches Bild in StepText.tsx angezeigt statt einer
// live-gerenderten CSS-@font-face-Vorschau im Browser des Nutzers, da diese
// auf manchen Rechnern (z.B. durch Sicherheitsrichtlinien wie Microsoft
// Defenders "Block untrusted fonts from loading") keine sichtbaren
// Unterschiede zeigt, obwohl die eigentliche PDF-Erzeugung per Puppeteer
// (dieselbe Pipeline wie hier) nachweislich korrekt funktioniert.
//
// Erneut ausführen mit: node scripts/make-font-specimen.mjs
import fs from "node:fs";
import path from "node:path";
import { FONTS, buildFontFaceCss } from "../lib/fonts.ts";
import { renderHtmlToPng } from "../lib/pdf/render.ts";

function readPublicFile(relPath) {
  return fs.readFileSync(path.join(process.cwd(), "public", relPath));
}

const SAMPLE = "Sehr geehrte Frau Musterfrau, mit dieser Schrift wird Ihr Anschreiben gedruckt.";
const WIDTH = 900;
const ROW_HEIGHT = 62;
const HEIGHT = FONTS.length * ROW_HEIGHT + 8;

const fontFaceCss = buildFontFaceCss(readPublicFile);

const rows = FONTS.map(
  (f) => `
  <div class="row">
    <div class="label">${f.label} (${f.hint})</div>
    <div class="sample" style="font-family: '${f.cssFamily}', sans-serif;">${SAMPLE}</div>
  </div>`
).join("\n");

const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
${fontFaceCss}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { background: #ffffff; }
.row {
  width: ${WIDTH}px;
  height: ${ROW_HEIGHT}px;
  padding: 6px 16px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.row:last-child { border-bottom: none; }
.label {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11px;
  color: #64748b;
  margin-bottom: 2px;
}
.sample {
  font-size: 19px;
  color: #1e293b;
}
</style>
</head>
<body>
${rows}
</body>
</html>`;

const png = await renderHtmlToPng(html, { width: WIDTH, height: HEIGHT });
const outPath = path.join(process.cwd(), "public", "font-specimen.png");
fs.writeFileSync(outPath, png);
console.log("geschrieben:", outPath, png.length, "bytes", `(${WIDTH}x${HEIGHT})`);
