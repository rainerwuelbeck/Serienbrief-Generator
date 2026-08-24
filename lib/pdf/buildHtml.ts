import type { Recipient } from "@/lib/csv/parseAddresses";
import { getFont } from "@/lib/fonts";

export type LogoPosition = "left" | "center" | "right";

export type LetterheadConfig =
  | { mode: "image"; dataUrl: string } // voller Seite-1-Hintergrund (hochgeladener Briefbogen, ggf. aus PDF konvertiert)
  | { mode: "logo"; dataUrl: string; position: LogoPosition }; // kein Briefbogen -> weiße Seite + Logo

export type LetterConfig = {
  fontId: string;
  fontSizePt: number;
  bodyHtml: string; // Seite-1-Brieftext mit Merge-Platzhaltern
  page2Html: string; // Hinweistext unter der Freischaltcode-Box auf Seite 2
  letterhead: LetterheadConfig;
  page2PhotoDataUrl: string; // aufgelöstes Headerbild (Upload oder Standardmotiv) für Seite 2
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Ersetzt {{Feld}}-Platzhalter im HTML durch die (escaped) Werte des Empfängers. */
export function applyMergeFields(html: string, recipient: Recipient): string {
  return html
    .replace(/\{\{\s*Vorname\s*\}\}/g, escapeHtml(recipient.vorname))
    .replace(/\{\{\s*Nachname\s*\}\}/g, escapeHtml(recipient.nachname))
    .replace(/\{\{\s*Anredezeile\s*\}\}/g, escapeHtml(recipient.anredezeile))
    .replace(/\{\{\s*Freischaltcode\s*\}\}/g, escapeHtml(recipient.freischaltcode));
}

function letterheadStyleAndMarkup(letterhead: LetterheadConfig): string {
  if (letterhead.mode === "image") {
    return `<div class="letterhead-bg" style="background-image:url('${letterhead.dataUrl}')"></div>`;
  }
  const justify =
    letterhead.position === "left"
      ? "flex-start"
      : letterhead.position === "right"
        ? "flex-end"
        : "center";
  return `<div class="logo-header" style="justify-content:${justify}"><img src="${letterhead.dataUrl}" alt="Logo" /></div>`;
}

function renderPage1(config: LetterConfig, recipient: Recipient): string {
  const body = applyMergeFields(config.bodyHtml, recipient);
  return `
<section class="page page1">
  ${letterheadStyleAndMarkup(config.letterhead)}
  <div class="address-block">
    <div>${escapeHtml(recipient.vorname)} ${escapeHtml(recipient.nachname)}</div>
    <div>${escapeHtml(recipient.strasse)}</div>
    <div>${escapeHtml(recipient.plzOrt)}</div>
  </div>
  <div class="letter-body">${body}</div>
</section>`;
}

function renderPage2(config: LetterConfig, recipient: Recipient): string {
  const page2Text = applyMergeFields(config.page2Html, recipient);
  return `
<section class="page page2">
  <div class="page2-header">
    <img src="${config.page2PhotoDataUrl}" alt="" />
  </div>
  <div class="page2-content">
    <div class="code-box">
      <div class="code-label">Ihr persönlicher Freischaltcode</div>
      <div class="code-value">${escapeHtml(recipient.freischaltcode)}</div>
    </div>
    <div class="page2-text">${page2Text}</div>
  </div>
</section>`;
}

export function buildFullHtml(
  config: LetterConfig,
  recipients: Recipient[],
  fontFaceCss: string
): string {
  const font = getFont(config.fontId);
  const pages = recipients
    .map((r) => renderPage1(config, r) + renderPage2(config, r))
    .join("\n");

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<style>
  ${fontFaceCss}

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "${font.cssFamily}", sans-serif;
    font-size: ${config.fontSizePt}pt;
    line-height: 1.45;
    color: #111;
  }
  @page { size: A4; margin: 0; }

  .page {
    position: relative;
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }

  /* --- Seite 1 --- */
  .letterhead-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: top center;
    background-repeat: no-repeat;
  }
  .logo-header {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 40mm;
    display: flex;
    align-items: center;
    padding: 10mm 20mm 0 20mm;
  }
  .logo-header img { max-height: 22mm; max-width: 60mm; object-fit: contain; }

  .address-block {
    position: absolute;
    top: 50mm;
    left: 20mm;
    width: 80mm;
    font-size: 10pt;
    line-height: 1.35;
  }

  .letter-body {
    position: absolute;
    top: 98mm;
    left: 25mm;
    right: 20mm;
    bottom: 20mm;
    overflow: hidden;
  }
  .letter-body h2 { font-size: 1.25em; margin: 0 0 2mm 0; }
  .letter-body h3 { font-size: 1.05em; margin: 0 0 6mm 0; font-weight: 600; }
  .letter-body p { margin: 0 0 3.2mm 0; }

  /* --- Seite 2 --- */
  .page2-header {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 90mm;
    overflow: hidden;
    background: #f2f2f2;
  }
  .page2-header img { width: 100%; height: 100%; object-fit: cover; display: block; }

  .page2-content {
    position: absolute;
    top: 100mm;
    left: 25mm;
    right: 25mm;
  }
  .code-box {
    border: 1.5pt solid #333;
    border-radius: 3mm;
    padding: 8mm 10mm;
    text-align: center;
    margin-bottom: 12mm;
  }
  .code-label { font-size: 10pt; letter-spacing: 0.5pt; text-transform: uppercase; color: #444; margin-bottom: 3mm; }
  .code-value { font-size: 20pt; font-weight: 700; letter-spacing: 1.5pt; }
  .page2-text p { margin: 0 0 3.2mm 0; }
</style>
</head>
<body>
${pages}
</body>
</html>`;
}
