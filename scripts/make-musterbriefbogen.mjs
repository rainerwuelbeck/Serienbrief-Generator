// Erzeugt einen generischen deutschen Muster-Firmenbriefbogen (DIN 5008 Form A)
// als PDF-Download für den Nutzer - mit Logo-Platzhalter oben und
// Adress-/Kontakt-/Bankdaten im Fußbereich. Nutzt dieselbe Puppeteer-Pipeline
// wie die App selbst (lib/pdf/render.ts).
import fs from "node:fs";
import { renderHtmlToPdf } from "../lib/pdf/render.ts";

const ACCENT = "#1E6FA6";

const logoSvg = `
<svg width="185" height="46" viewBox="0 0 185 46" xmlns="http://www.w3.org/2000/svg">
  <circle cx="23" cy="23" r="21" fill="${ACCENT}"/>
  <path d="M13 29 L13 15 L23 24 L33 15 L33 29" fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="52" y="21" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#2A2A2E">MUSTERFIRMA</text>
  <text x="52" y="35" font-family="Arial, Helvetica, sans-serif" font-size="9" fill="#6b7280" letter-spacing="1.5">G M B H</text>
</svg>`.trim();

const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #2A2A2E;
  }
  @page { size: A4; margin: 0; }
  .page {
    position: relative;
    width: 210mm;
    height: 297mm;
  }
  .logo {
    position: absolute;
    top: 15mm;
    right: 20mm;
  }
  .footer {
    position: absolute;
    left: 20mm;
    right: 20mm;
    bottom: 14mm;
    border-top: 0.5pt solid #d1d5db;
    padding-top: 4mm;
  }
  .footer-cols {
    display: flex;
    gap: 10mm;
    font-size: 8pt;
    line-height: 1.55;
    color: #4b5563;
  }
  .footer-cols > div { flex: 1; }
  .footer-cols strong { color: #2A2A2E; }
  .footer-legal {
    margin-top: 3mm;
    font-size: 7.5pt;
    color: #9ca3af;
    text-align: center;
  }
</style>
</head>
<body>
  <section class="page">
    <div class="logo">${logoSvg}</div>

    <div class="footer">
      <div class="footer-cols">
        <div>
          <strong>Musterfirma GmbH</strong><br/>
          Musterstraße 1<br/>
          12345 Musterstadt
        </div>
        <div>
          <strong>Kontakt</strong><br/>
          Telefon: +49 (0)30 123456-0<br/>
          Telefax: +49 (0)30 123456-99<br/>
          E-Mail: info@musterfirma.de<br/>
          Web: www.musterfirma.de
        </div>
        <div>
          <strong>Bankverbindung</strong><br/>
          Musterbank AG<br/>
          IBAN: DE00 0000 0000 0000 0000 00<br/>
          BIC: MUSTDEXXXXX
        </div>
      </div>
      <div class="footer-legal">
        Musterfirma GmbH &middot; Sitz der Gesellschaft: Musterstadt &middot; Amtsgericht Musterstadt, HRB 000000 &middot;
        Geschäftsführung: Max Mustermann &middot; USt-IdNr.: DE000000000
      </div>
    </div>
  </section>
</body>
</html>`;

const pdf = await renderHtmlToPdf(html);
fs.writeFileSync("test-data/Musterbriefbogen.pdf", pdf);
console.log("geschrieben: test-data/Musterbriefbogen.pdf", pdf.length, "bytes");
