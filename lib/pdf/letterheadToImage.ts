import { createCanvas } from "@napi-rs/canvas";
import path from "node:path";
import { pathToFileURL } from "node:url";

// pdfjs-dist v6 erkennt Node.js automatisch und nutzt intern bereits
// @napi-rs/canvas (siehe node_modules/pdfjs-dist .../NodeCanvasFactory) -
// wir müssen also keine eigene Canvas-Factory mehr bereitstellen, nur noch
// die Ziel-Canvas für den eigentlichen Seiten-Render selbst erzeugen.

let pdfjsModule: typeof import("pdfjs-dist/legacy/build/pdf.mjs") | null = null;

async function getPdfjs() {
  if (!pdfjsModule) {
    const mod = await import("pdfjs-dist/legacy/build/pdf.mjs");
    // Statischer Dateipfad statt require.resolve("pdfjs-dist/...") - Turbopack
    // schreibt Letzteres innerhalb einer Route sonst um, was den Worker zur
    // Laufzeit mit "Setting up fake worker failed" abstürzen lässt.
    // Datei wird per `npm run postinstall` (scripts/copy-pdf-worker.mjs) hierhin kopiert.
    const workerPath = path.join(process.cwd(), "public", "pdf.worker.mjs");
    mod.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
    pdfjsModule = mod;
  }
  return pdfjsModule;
}

/**
 * Rendert die erste Seite eines PDF-Briefbogens als PNG (für die Verwendung als
 * CSS-Hintergrundbild auf Seite 1 des Serienbriefs).
 * @param targetWidthPx gewünschte Zielbreite in Pixeln (Höhe wird proportional berechnet)
 */
export async function renderFirstPdfPageToPng(
  pdfBuffer: Buffer,
  targetWidthPx = 1240 // ~150dpi bei A4-Breite (210mm)
): Promise<Buffer> {
  const pdfjsLib = await getPdfjs();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableFontFace: true,
    useWorkerFetch: false,
  });
  try {
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = targetWidthPx / baseViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");

    await page.render({
      canvasContext: context as never,
      viewport,
      canvas: canvas as never,
    }).promise;

    return canvas.toBuffer("image/png");
  } finally {
    await loadingTask.destroy();
  }
}
