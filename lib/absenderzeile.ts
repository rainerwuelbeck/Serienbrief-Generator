/**
 * Baut die Absenderzeile (kleine Zeile über dem Adressfeld auf Seite 1) aus den
 * vier Einzelfeldern zusammen. Geteilt zwischen Client (Live-Vorschau in
 * StepLetterhead) und Server (app/api/generate/route.ts), damit beide exakt
 * dasselbe Ergebnis liefern.
 */
export function buildAbsenderzeile(
  unternehmensname: string,
  strasse: string,
  plz: string,
  ort: string
): string {
  const plzOrt = [plz.trim(), ort.trim()].filter(Boolean).join(" ");
  const parts = [unternehmensname.trim(), strasse.trim(), plzOrt].filter(Boolean);
  return parts.join(" · ");
}
