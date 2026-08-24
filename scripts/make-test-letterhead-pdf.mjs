import fs from "node:fs";
import puppeteer from "puppeteer";

const html = `<!doctype html><html><head><style>
  @page { size: A4; margin: 0; }
  body { margin:0; font-family: Arial, sans-serif; }
  .header { background: linear-gradient(90deg,#0f2f4d,#155e8a); color:#fff; padding: 15mm 20mm; }
  .header h1 { margin:0; font-size: 22pt; }
  .header p { margin:2mm 0 0 0; font-size: 10pt; opacity:.85; }
  .footer { position:absolute; bottom:10mm; left:20mm; right:20mm; font-size:8pt; color:#555; border-top:1px solid #ccc; padding-top:2mm; }
</style></head><body>
  <div class="header"><h1>Testfirma GmbH</h1><p>Musterstraße 1 · 12345 Musterstadt · info@testfirma.de</p></div>
  <div class="footer">Testfirma GmbH · Amtsgericht Musterstadt HRB 12345 · Geschäftsführer: Max Muster</div>
</body></html>`;

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
fs.writeFileSync("test-data/briefbogen.pdf", pdf);
await browser.close();
console.log("written test-data/briefbogen.pdf");
