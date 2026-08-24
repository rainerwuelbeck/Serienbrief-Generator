# Serienbrief-Generator

Web-App zum Erstellen von 2-seitigen PDF-Serienbriefen (Mitarbeiteranschreiben zur
betrieblichen Altersvorsorge) aus einem Firmen-Briefbogen (oder Logo), einem
Anschreibentext, einem Headerbild für Seite 2 und einer CSV-Adressliste.

## Lokal starten

```bash
npm install
cp .env.example .env.local   # APP_PASSWORD setzen
npm run dev
```

Dann `http://localhost:3000` öffnen und mit dem in `.env.local` gesetzten Passwort einloggen.

Eine Test-Adressliste liegt unter `test-data/beispiel-adressen.csv`.

## Wie es funktioniert

1. **Briefbogen/Logo** (Schritt 1) — PDF-Briefbögen werden serverseitig in ein Bild
   umgewandelt (`lib/pdf/letterheadToImage.ts`) und als Hintergrund von Seite 1
   verwendet. Ohne Briefbogen: weiße Seite + positioniertes Logo.
2. **Anschreiben** (Schritt 2) — vier Standardtexte (aus
   `Mitarbeiteranschreiben-Muster-4-Versionen.pdf`) als Ausgangspunkt, frei
   editierbar (Rich-Text, Schriftart/-größe), inkl. Seriendruck-Platzhaltern
   (`{{Vorname}}`, `{{Nachname}}`, `{{Anredezeile}}`, `{{Freischaltcode}}`).
3. **Headerfoto** (Schritt 3) — eigenes Bild oder eines von 5 Standardmotiven
   (aktuell generische Platzhalter-Illustrationen unter `public/stock-photos/`,
   bei Bedarf durch echte Motive ersetzen).
4. **Adressliste** (Schritt 4) — CSV hochladen, Spalten den Pflichtfeldern
   zuordnen (Vorname, Nachname, Briefanredezeile, Straße, PLZ/Ort,
   Freischaltcode).

Beim Klick auf „Serienbriefe erstellen“ baut `app/api/generate/route.ts` ein
einziges großes HTML-Dokument (alle Empfänger × 2 Seiten) und rendert es per
Puppeteer/Chromium in einem Rutsch zu einer kombinierten PDF-Datei, die direkt
heruntergeladen wird.

## Deployment auf Vercel

1. Repo zu GitHub pushen (oder `vercel` CLI direkt im Projektordner nutzen).
2. Auf [vercel.com](https://vercel.com) importieren.
3. Environment Variable `APP_PASSWORD` im Vercel-Projekt setzen.
4. Deployen.

Die Chromium-Instanz für die PDF-Erzeugung läuft dort automatisch über
`@sparticuz/chromium` (siehe `lib/pdf/render.ts`), lokal wird stattdessen das
normale `puppeteer`-Paket mit gebündeltem Chromium verwendet — kein manueller
Umschalter nötig.

## Bekannte Grenzen

- **Requestgröße**: Vercel begrenzt Serverless-Function-Requests auf ca.
  4,5 MB. Bilduploads werden clientseitig automatisch verkleinert
  (`lib/clientImage.ts`), trotzdem gilt: Briefbogen/Logo/Foto möglichst unter
  2 MB halten.
- **Empfängerzahl**: aktuell auf 300 pro Lauf begrenzt (`MAX_RECIPIENTS` in
  `app/api/generate/route.ts`), wegen der Ausführungszeit einer einzelnen
  Serverless-Function. Für größere Listen: in mehreren Läufen aufteilen, oder
  `maxDuration`/Vercel-Plan erhöhen.
- **Word-Briefbögen (.docx)**: werden nicht automatisch konvertiert — bitte in
  Word einmal als PDF exportieren und das hochladen.
- **Turbopack**: `dev`/`build` laufen bewusst mit `--webpack` statt dem
  Turbopack-Standard - pdfjs-dist lädt seinen Worker intern per dynamischem
  Import, was Turbopack innerhalb einer Next.js-Route zur Laufzeit zum Absturz
  bringt ("Setting up fake worker failed"). Mit Webpack funktioniert es
  einwandfrei.
- **Standardmotive** (Schritt 3): aktuell 5 generische Platzhalter-Grafiken,
  keine echten Stockfotos — bei Bedarf `public/stock-photos/1.svg` … `5.svg`
  durch echte Bilder ersetzen (gleicher Dateiname, anderes Format geht auch,
  dann `lib/stockPhotos.ts` anpassen).
- **DIN-5008-Fensterposition**: Die Adressfeld-Position auf Seite 1
  (`lib/pdf/buildHtml.ts`, `.address-block`) wurde nach bestem Wissen aus dem
  Referenzbeispiel übernommen — vor dem produktiven Einsatz einmal mit einem
  echten Fensterumschlag gegenprüfen.
