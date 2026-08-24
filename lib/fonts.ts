// Kuratierte Schriftarten-Liste für die Anschreiben.
// Dateien liegen lokal unter public/fonts/<id>/{regular,bold,italic,bolditalic}.woff2
// (siehe scripts/fetch-fonts.mjs) — dadurch braucht Puppeteer beim PDF-Rendern
// keinen Internetzugriff, was auf Vercel-Serverless zuverlässiger und schneller ist.

export type FontDef = {
  id: string;
  label: string;
  /** Womit der Nutzer die Schrift intuitiv verbindet */
  hint: string;
  cssFamily: string;
};

export const FONTS: FontDef[] = [
  { id: "arimo", label: "Arimo", hint: "wie Arial", cssFamily: "Arimo" },
  { id: "carlito", label: "Carlito", hint: "wie Calibri", cssFamily: "Carlito" },
  { id: "tinos", label: "Tinos", hint: "wie Times New Roman", cssFamily: "Tinos" },
  { id: "roboto", label: "Roboto", hint: "modern, klar", cssFamily: "Roboto" },
  { id: "open-sans", label: "Open Sans", hint: "freundlich, gut lesbar", cssFamily: "Open Sans" },
  { id: "lato", label: "Lato", hint: "zurückhaltend, seriös", cssFamily: "Lato" },
  { id: "montserrat", label: "Montserrat", hint: "markant, für Überschriften", cssFamily: "Montserrat" },
  { id: "merriweather", label: "Merriweather", hint: "Serifenschrift, klassisch", cssFamily: "Merriweather" },
];

export const DEFAULT_FONT_ID = "carlito";

export function getFont(id: string): FontDef {
  return FONTS.find((f) => f.id === id) ?? FONTS.find((f) => f.id === DEFAULT_FONT_ID)!;
}

/**
 * Baut die @font-face-Deklarationen für alle kuratierten Schriften als CSS-String.
 * `baseDir` ist der absolute Pfad zum public/fonts-Ordner auf dem Server, die
 * Dateien werden als data:-URIs eingebettet, damit Puppeteer sie unabhängig von
 * einem laufenden HTTP-Server rendern kann (wichtig für die Serverless-Function).
 */
export function buildFontFaceCss(readFile: (relPath: string) => Buffer): string {
  const styles: { style: string; weight: number; file: string }[] = [
    { style: "normal", weight: 400, file: "regular.woff2" },
    { style: "normal", weight: 700, file: "bold.woff2" },
    { style: "italic", weight: 400, file: "italic.woff2" },
    { style: "italic", weight: 700, file: "bolditalic.woff2" },
  ];

  let css = "";
  for (const font of FONTS) {
    for (const s of styles) {
      const relPath = `fonts/${font.id}/${s.file}`;
      let base64: string;
      try {
        base64 = readFile(relPath).toString("base64");
      } catch {
        continue; // Datei fehlt (z.B. Schriftschnitt nicht verfügbar) -> überspringen
      }
      css += `
@font-face {
  font-family: "${font.cssFamily}";
  font-style: ${s.style};
  font-weight: ${s.weight};
  src: url(data:font/woff2;base64,${base64}) format("woff2");
  font-display: block;
}`;
    }
  }
  return css;
}
