import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { applyMapping, parseCsv, type AnredezeileConfig, type ColumnMapping } from "@/lib/csv/parseAddresses";
import { buildFontFaceCss } from "@/lib/fonts";
import { buildFullHtml, type LetterheadConfig } from "@/lib/pdf/buildHtml";
import { renderFirstPdfPageToPng } from "@/lib/pdf/letterheadToImage";
import { renderHtmlToPdf } from "@/lib/pdf/render";
import { DEFAULT_PAGE2_TEXT } from "@/lib/templates/standardTexts";
import { STOCK_PHOTOS } from "@/lib/stockPhotos";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_RECIPIENTS = 300;
const SUPPORTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function fileToDataUrl(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buf.toString("base64")}`;
}

async function resolveLetterhead(form: FormData): Promise<LetterheadConfig | { error: string }> {
  const mode = form.get("letterheadMode");

  if (mode === "logo") {
    const logo = form.get("logoFile");
    const position = form.get("logoPosition");
    if (!(logo instanceof File) || logo.size === 0) {
      return { error: "Bitte ein Logo hochladen." };
    }
    if (!SUPPORTED_IMAGE_TYPES.has(logo.type)) {
      return { error: "Logo muss PNG, JPEG oder WebP sein." };
    }
    const pos = position === "left" || position === "center" || position === "right" ? position : "center";
    return { mode: "logo", dataUrl: await fileToDataUrl(logo), position: pos };
  }

  if (mode === "image") {
    const letterhead = form.get("letterheadFile");
    if (!(letterhead instanceof File) || letterhead.size === 0) {
      return { error: "Bitte einen Firmen-Briefbogen hochladen." };
    }
    if (letterhead.type === "application/pdf") {
      try {
        const pdfBuf = Buffer.from(await letterhead.arrayBuffer());
        const png = await renderFirstPdfPageToPng(pdfBuf);
        return { mode: "image", dataUrl: `data:image/png;base64,${png.toString("base64")}` };
      } catch (e) {
        console.error("PDF-Briefbogen-Konvertierung fehlgeschlagen:", e);
        return {
          error:
            "Der PDF-Briefbogen konnte nicht gelesen werden. Bitte als Bild (PNG/JPEG) hochladen oder eine andere PDF versuchen.",
        };
      }
    }
    if (SUPPORTED_IMAGE_TYPES.has(letterhead.type)) {
      return { mode: "image", dataUrl: await fileToDataUrl(letterhead) };
    }
    return {
      error:
        "Nicht unterstütztes Format für den Briefbogen. Bitte PDF, PNG, JPEG oder WebP hochladen (Word-Dateien bitte vorher als PDF exportieren).",
    };
  }

  return { error: "Ungültiger Briefbogen-Modus." };
}

async function resolvePage2Photo(form: FormData): Promise<string | { error: string }> {
  const mode = form.get("photoMode");
  if (mode === "upload") {
    const photo = form.get("photoFile");
    if (!(photo instanceof File) || photo.size === 0) {
      return { error: "Bitte ein Headerfoto hochladen." };
    }
    if (!SUPPORTED_IMAGE_TYPES.has(photo.type)) {
      return { error: "Headerfoto muss PNG, JPEG oder WebP sein." };
    }
    return fileToDataUrl(photo);
  }
  if (mode === "stock") {
    const id = String(form.get("stockPhotoId") ?? "");
    const found = STOCK_PHOTOS.find((p) => p.id === id);
    if (!found) return { error: "Ungültiges Standardmotiv." };
    const filePath = path.join(process.cwd(), "public", "stock-photos", `${id}.svg`);
    const svg = fs.readFileSync(filePath, "utf-8");
    const base64 = Buffer.from(svg, "utf-8").toString("base64");
    return `data:image/svg+xml;base64,${base64}`;
  }
  return { error: "Ungültiger Foto-Modus." };
}

function readPublicFile(relPath: string): Buffer {
  return fs.readFileSync(path.join(process.cwd(), "public", relPath));
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return err(
      "Die Anfrage war zu groß oder ungültig. Bitte kleinere Dateien verwenden (Briefbogen/Fotos möglichst < 2 MB)."
    );
  }

  const letterhead = await resolveLetterhead(form);
  if ("error" in letterhead) return err(letterhead.error);

  const page2PhotoDataUrl = await resolvePage2Photo(form);
  if (typeof page2PhotoDataUrl !== "string") return err(page2PhotoDataUrl.error);

  const bodyHtmlRaw = form.get("bodyHtml");
  if (typeof bodyHtmlRaw !== "string" || bodyHtmlRaw.trim() === "") {
    return err("Bitte einen Anschreibentext eingeben oder eine Vorlage wählen.");
  }
  const bodyHtml = bodyHtmlRaw;

  const page2HtmlRaw = form.get("page2Html");
  const page2Html = typeof page2HtmlRaw === "string" && page2HtmlRaw.trim() !== "" ? page2HtmlRaw : DEFAULT_PAGE2_TEXT;

  const fontId = String(form.get("fontId") ?? "carlito");
  const fontSizePt = Number(form.get("fontSizePt") ?? 11) || 11;

  const csvFile = form.get("csvFile");
  const mappingRaw = form.get("mapping");
  const anredezeileConfigRaw = form.get("anredezeileConfig");
  if (!(csvFile instanceof File) || csvFile.size === 0) {
    return err("Bitte eine CSV-Adressliste hochladen.");
  }
  if (typeof mappingRaw !== "string") {
    return err("Spalten-Zuordnung fehlt.");
  }
  if (typeof anredezeileConfigRaw !== "string") {
    return err("Einstellung für die Briefanredezeile fehlt.");
  }

  let mapping: ColumnMapping;
  let anredezeileConfig: AnredezeileConfig;
  try {
    mapping = JSON.parse(mappingRaw);
    anredezeileConfig = JSON.parse(anredezeileConfigRaw);
  } catch {
    return err("Spalten-Zuordnung ist ungültig.");
  }

  let recipients;
  try {
    const csvText = Buffer.from(await csvFile.arrayBuffer()).toString("utf-8");
    const { rows } = parseCsv(csvText);
    recipients = applyMapping(rows, mapping, anredezeileConfig);
  } catch (e) {
    return err(e instanceof Error ? e.message : "CSV konnte nicht verarbeitet werden.");
  }

  if (recipients.length === 0) {
    return err("Die Adressliste enthält keine gültigen Zeilen.");
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return err(
      `Die Adressliste enthält ${recipients.length} Empfänger. Aktuell sind maximal ${MAX_RECIPIENTS} pro Lauf unterstützt (Zeitlimit der Plattform) - bitte in mehreren Läufen aufteilen.`
    );
  }

  const fontFaceCss = buildFontFaceCss((relPath) => readPublicFile(relPath));

  const html = buildFullHtml(
    {
      fontId,
      fontSizePt,
      bodyHtml,
      page2Html,
      letterhead,
      page2PhotoDataUrl,
    },
    recipients,
    fontFaceCss
  );

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderHtmlToPdf(html);
  } catch (e) {
    console.error("PDF-Rendering fehlgeschlagen:", e);
    return err("Die PDF-Erzeugung ist fehlgeschlagen. Bitte erneut versuchen.", 500);
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Serienbriefe.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
