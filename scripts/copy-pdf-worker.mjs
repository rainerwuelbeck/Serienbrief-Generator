// Kopiert den pdf.js-Worker nach public/, damit lib/pdf/letterheadToImage.ts ihn
// über einen simplen, statischen Dateipfad referenzieren kann. Grund: Ein
// `require.resolve("pdfjs-dist/...")` innerhalb einer Next.js-Route wird von
// Turbopack beim Bundling umgeschrieben/analysiert und bricht dadurch zur
// Laufzeit ("Setting up fake worker failed") - ein reiner public/-Dateipfad
// umgeht das komplett. Läuft automatisch über den "postinstall"-Hook in
// package.json.
import fs from "node:fs";
import path from "node:path";

const src = path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
const destDir = path.join(process.cwd(), "public");
const dest = path.join(destDir, "pdf.worker.mjs");

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`pdf.worker.mjs kopiert nach ${dest}`);
