"use client";

/**
 * Verkleinert/komprimiert ein Bild clientseitig vor dem Upload, damit die
 * gesamte Anfrage unter dem Payload-Limit der Hosting-Plattform bleibt
 * (siehe Plan: Vercel-Serverless-Functions haben ein hartes Limit von ca. 4,5 MB
 * pro Request). PDFs werden nicht angefasst (nur Bilddateien).
 */
export async function compressImageFile(
  file: File,
  maxDimension = 2000,
  quality = 0.85
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, outType, quality)
    );
    if (!blob || blob.size >= file.size) return file; // keine Verbesserung -> Original behalten

    const newName = file.name.replace(/\.\w+$/, outType === "image/png" ? ".png" : ".jpg");
    return new File([blob], newName, { type: outType });
  } catch {
    return file; // Kompression fehlgeschlagen -> Original weiterverwenden
  }
}

/** Wandelt eine data:-URI (z.B. Ergebnis von /api/fetch-logo) in ein File-Objekt um. */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",", 2);
  const mime = header.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}
