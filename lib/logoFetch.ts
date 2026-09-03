import { loadImage, createCanvas } from "@napi-rs/canvas";

/**
 * Holt Logo + CI-Hauptfarbe automatisch von einer Kunden-Webseite ("Logo von
 * Webseite holen" in StepLetterhead). Serverseitig (app/api/fetch-logo/route.ts),
 * damit kein CORS-Problem entsteht und die Fetch-Ziele grob abgesichert werden
 * können (kein Zugriff auf interne/private Adressen).
 */

const FETCH_TIMEOUT_MS = 10_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Serienbrief-Generator-LogoFetch/1.0";

export type LogoFetchResult = {
  logoDataUrl: string;
  logoMime: string;
  suggestedColor: string | null;
  colorSource: "theme-color" | "logo-pixel" | "logo-svg" | null;
  logoSourceUrl: string;
};

function normalizeUrl(input: string): URL {
  const trimmed = input.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withScheme);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Nur http/https-Adressen werden unterstützt.");
  }
  return url;
}

/** Grobe Absicherung gegen interne/private Ziele (kein vollständiger SSRF-Schutz, reicht für dieses interne Tool). */
function assertPublicHost(url: URL) {
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host.endsWith(".local")
  ) {
    throw new Error("Diese Adresse kann nicht geladen werden.");
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timeout);
  }
}

function extractThemeColor(html: string): string | null {
  const patterns = [
    /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const hex = normalizeHexColor(m[1].trim());
      if (hex) return hex;
    }
  }
  return null;
}

function normalizeHexColor(value: string): string | null {
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const [r, g, b] = value.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}

function absolutize(candidate: string | undefined, baseUrl: URL): string | null {
  if (!candidate) return null;
  try {
    return new URL(candidate, baseUrl).href;
  } catch {
    return null;
  }
}

/** Sucht in der Seiten-HTML nach möglichen Logo-URLs, in sinnvoller Prioritätsreihenfolge. */
function findLogoCandidates(html: string, baseUrl: URL): string[] {
  const candidates: string[] = [];

  // Priorität: ein erkennbares Kopfzeilen-Logo ist fürs Briefpapier fast immer
  // besser geeignet als das og:image (das ist oft ein Marketing-Banner/Foto
  // fürs Social-Media-Vorschaubild, kein sauberes Logo).

  // <img>-Tags, deren class/id/alt/src "logo" enthält - typischerweise das Kopfzeilen-Logo.
  // (funktioniert auch bei inline data:-URIs als src.)
  for (const tagMatch of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = tagMatch[0];
    if (!/logo/i.test(tag)) continue;
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    const abs = absolutize(src, baseUrl);
    if (abs) candidates.push(abs);
  }

  for (const tagMatch of html.matchAll(
    /<link[^>]+rel=["'](?:apple-touch-icon|apple-touch-icon-precomposed)["'][^>]*>/gi
  )) {
    const href = tagMatch[0].match(/href=["']([^"']+)["']/i)?.[1];
    const abs = absolutize(href, baseUrl);
    if (abs) candidates.push(abs);
  }

  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const abs1 = absolutize(ogImage?.[1], baseUrl);
  if (abs1) candidates.push(abs1);

  for (const tagMatch of html.matchAll(/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]*>/gi)) {
    const href = tagMatch[0].match(/href=["']([^"']+)["']/i)?.[1];
    const abs = absolutize(href, baseUrl);
    if (abs) candidates.push(abs);
  }

  const favicon = absolutize("/favicon.ico", baseUrl);
  if (favicon) candidates.push(favicon);

  return [...new Set(candidates)];
}

/** Häufigste fill-Farbe in einem SVG (Regex-Heuristik, kein echtes Parsing - reicht für einfache Logo-SVGs). */
function dominantColorFromSvg(svgText: string): string | null {
  const counts = new Map<string, number>();
  for (const m of svgText.matchAll(/fill=["']\s*(#[0-9a-fA-F]{3,6})\s*["']/gi)) {
    const hex = normalizeHexColor(m[1]);
    if (!hex || hex === "#FFFFFF" || hex === "#000000") continue;
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [hex, count] of counts) {
    if (count > bestCount) {
      best = hex;
      bestCount = count;
    }
  }
  return best;
}

/** Häufigste (gesättigte, nicht zu helle/dunkle) Pixelfarbe eines Rasterbilds. */
async function dominantColorFromRaster(buf: Buffer): Promise<string | null> {
  try {
    const img = await loadImage(buf);
    const w = Math.max(1, Math.min(img.width, 120));
    const h = Math.max(1, Math.round((img.height / img.width) * w) || 1);
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 128) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lightness = (max + min) / 2;
      if (lightness > 235 || lightness < 20) continue; // fast weiß/schwarz -> meist Hintergrund/Text
      const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(2 * lightness - 255));
      if (saturation < 0.2) continue; // zu grau

      const key = `${Math.round(r / 20)}_${Math.round(g / 20)}_${Math.round(b / 20)}`;
      const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
      bucket.count++;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      buckets.set(key, bucket);
    }

    let best: { count: number; r: number; g: number; b: number } | null = null;
    for (const bucket of buckets.values()) {
      if (!best || bucket.count > best.count) best = bucket;
    }
    if (!best) return null;
    const r = Math.round(best.r / best.count);
    const g = Math.round(best.g / best.count);
    const b = Math.round(best.b / best.count);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  } catch {
    return null;
  }
}

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function guessMimeFromUrl(url: string): string | null {
  const ext = Object.keys(IMAGE_MIME_BY_EXTENSION).find((e) => url.toLowerCase().split("?")[0].endsWith(e));
  return ext ? IMAGE_MIME_BY_EXTENSION[ext] : null;
}

export async function fetchLogoAndColor(inputUrl: string): Promise<LogoFetchResult> {
  const pageUrl = normalizeUrl(inputUrl);
  assertPublicHost(pageUrl);

  const pageRes = await fetchWithTimeout(pageUrl.href, {
    headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
  });
  if (!pageRes.ok) {
    throw new Error(`Webseite konnte nicht geladen werden (Status ${pageRes.status}).`);
  }
  const html = await pageRes.text();

  const themeColor = extractThemeColor(html);
  const candidates = findLogoCandidates(html, pageUrl);
  if (candidates.length === 0) {
    throw new Error("Auf dieser Seite konnte kein Logo gefunden werden.");
  }

  for (const candidateUrl of candidates) {
    try {
      const candidateParsed = new URL(candidateUrl);
      assertPublicHost(candidateParsed);
      const imgRes = await fetchWithTimeout(candidateUrl, { headers: { "user-agent": USER_AGENT } });
      if (!imgRes.ok) continue;

      const contentType = imgRes.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
      const mime = contentType?.startsWith("image/") ? contentType : guessMimeFromUrl(candidateUrl);
      if (!mime) continue;

      const buf = Buffer.from(await imgRes.arrayBuffer());
      if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) continue;
      // .ico-Dateien enthalten oft mehrere Größen und werden von @napi-rs/canvas
      // nicht zuverlässig dekodiert - als reines Fallback-Icon meist ohnehin nicht
      // ideal fürs Logo, daher überspringen und zum nächsten Kandidaten weiter.
      if (mime === "image/x-icon" || mime === "image/vnd.microsoft.icon") continue;

      let suggestedColor = themeColor;
      let colorSource: LogoFetchResult["colorSource"] = themeColor ? "theme-color" : null;
      if (!suggestedColor) {
        if (mime === "image/svg+xml") {
          suggestedColor = dominantColorFromSvg(buf.toString("utf-8"));
          if (suggestedColor) colorSource = "logo-svg";
        } else {
          suggestedColor = await dominantColorFromRaster(buf);
          if (suggestedColor) colorSource = "logo-pixel";
        }
      }

      return {
        logoDataUrl: `data:${mime};base64,${buf.toString("base64")}`,
        logoMime: mime,
        suggestedColor,
        colorSource,
        logoSourceUrl: candidateUrl,
      };
    } catch {
      continue; // nächsten Kandidaten versuchen
    }
  }

  throw new Error("Es konnte kein verwendbares Logo von dieser Seite geladen werden.");
}
