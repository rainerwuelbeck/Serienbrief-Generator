import { loadImage, createCanvas } from "@napi-rs/canvas";

/**
 * Holt Logo + CI-Hauptfarbe automatisch von einer Kunden-Webseite ("Logo von
 * Webseite holen" in StepLetterhead). Serverseitig (app/api/fetch-logo/route.ts),
 * damit kein CORS-Problem entsteht und die Fetch-Ziele grob abgesichert werden
 * können (kein Zugriff auf interne/private Adressen).
 *
 * Es wird nicht einfach der erste gefundene Kandidat genommen, sondern mehrere
 * Kandidaten geladen und bewertet (Transparenz/heller Hintergrund, Größe,
 * Seitenverhältnis) - ein Logo mit weißer Schrift auf farbiger Fläche (z.B.
 * ein Social-Media-Bannerbild) sieht auf einem weißen Briefbogen schlecht aus
 * und soll daher gegenüber einem freigestellten Logo mit Transparenz/hellem
 * Hintergrund niedriger bewertet werden.
 */

const FETCH_TIMEOUT_MS = 10_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_CANDIDATES_TO_TRY = 8;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Serienbrief-Generator-LogoFetch/1.0";

// Häufige Zahlungs-/Versanddienstleister, deren Badge-Bilder im alt-Text/Dateinamen
// oft "Logo" enthalten (Barrierefreiheit) und sonst leicht mit dem echten
// Marken-Logo der Seite verwechselt werden.
const THIRD_PARTY_BADGE_RE =
  /paypal|klarna|sofort|giropay|mastercard|visa[-_ ]?card|american[-_ ]?express|amex|dhl|dpd|hermes|ups\b|fedex|gls\b|kreditkarte|payment|trusted[-_ ]?shops|ssl[-_ ]?secure/i;

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

/**
 * Viele moderne Webseiten binden ihr Logo als Inline-<svg> statt als <img src="...">
 * ein (z.B. für CSS-Farbtheming via currentColor) - dafür gibt es gar keine ladbare
 * URL, das Markup steht direkt im HTML. Wird hier per Textfenster um jedes <svg>
 * (eigene Attribute + kurzer Kontext davor, meist ein umschließendes <a>/<div> mit
 * "logo"-Klasse) gesucht.
 */
function findInlineSvgLogos(html: string): string[] {
  const results: string[] = [];
  const svgRe = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi;
  let match: RegExpExecArray | null;
  while ((match = svgRe.exec(html))) {
    const svgTag = match[0];
    if (svgTag.length > 20_000) continue; // vermutlich eine komplexe Illustration, kein Logo
    const windowStart = Math.max(0, match.index - 400);
    const context = html.slice(windowStart, match.index) + svgTag.slice(0, 200);
    if (/logo/i.test(context)) {
      const withNamespace = /xmlns\s*=/.test(svgTag.slice(0, 200))
        ? svgTag
        : svgTag.replace(/^<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
      results.push(withNamespace);
    }
  }
  return results;
}

/** Sucht in der Seiten-HTML nach möglichen Logo-URLs, in sinnvoller Prioritätsreihenfolge. */
function findLogoCandidates(html: string, baseUrl: URL): string[] {
  const candidates: string[] = [];

  // Priorität: ein erkennbares Kopfzeilen-Logo ist fürs Briefpapier fast immer
  // besser geeignet als das og:image (das ist oft ein Marketing-Banner/Foto
  // fürs Social-Media-Vorschaubild, kein sauberes Logo). Trotzdem werden am
  // Ende ALLE Kandidaten geladen und bewertet, nicht nur der erste Treffer.

  // <img>-Tags, deren class/id/alt/src "logo" enthält - typischerweise das Kopfzeilen-Logo.
  // (funktioniert auch bei inline data:-URIs als src.) Zahlungs-/Versanddienstleister-
  // Badges (PayPal, DHL, Visa, Klarna, ...) tragen im alt-Text oft ebenfalls "Logo" und
  // werden daher ausdrücklich ausgeschlossen - sonst gewinnen sie auf Shop-Seiten leicht
  // gegen das eigentliche (oft gar nicht als "logo" ausgezeichnete) Marken-Logo.
  for (const tagMatch of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = tagMatch[0];
    if (!/logo/i.test(tag)) continue;
    if (THIRD_PARTY_BADGE_RE.test(tag)) continue;
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

  return [...new Set(candidates)].slice(0, MAX_CANDIDATES_TO_TRY);
}

/**
 * Häufigste fill-Farbe in einem SVG (Regex-Heuristik, kein echtes Parsing - reicht
 * für einfache Logo-SVGs). Deckt beide üblichen Schreibweisen ab: das Präsentations-
 * Attribut `fill="#hex"` direkt am Element, und `fill:#hex` als CSS-Deklaration
 * (typischerweise in einem eingebetteten <style>-Block mit Klassen wie .cls-1).
 */
function dominantColorFromSvg(svgText: string): string | null {
  const counts = new Map<string, number>();
  const patterns = [/fill=["']\s*(#[0-9a-fA-F]{3,6})\s*["']/gi, /fill\s*:\s*(#[0-9a-fA-F]{3,6})/gi];
  for (const pattern of patterns) {
    for (const m of svgText.matchAll(pattern)) {
      const hex = normalizeHexColor(m[1]);
      if (!hex || hex === "#FFFFFF" || hex === "#000000") continue;
      counts.set(hex, (counts.get(hex) ?? 0) + 1);
    }
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

type RasterAnalysis = {
  width: number;
  height: number;
  /** Anteil deutlich transparenter Pixel (0-1). */
  transparentRatio: number;
  /** Rand/Ecken sind (fast) weiß oder transparent - passt gut auf einen weißen Briefbogen. */
  backgroundLooksLight: boolean;
  dominantColor: string | null;
};

/** Lädt ein Rasterbild einmal und liefert Maße, Transparenz-/Hintergrund-Einschätzung und dominante Farbe. */
async function analyzeRaster(buf: Buffer): Promise<RasterAnalysis | null> {
  try {
    const img = await loadImage(buf);
    const w = Math.max(1, Math.min(img.width, 160));
    const h = Math.max(1, Math.round((img.height / img.width) * w) || 1);
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    // Rand (äußere ~12% jeder Kante) als Stellvertreter für den "Hintergrund" des
    // Bildes nehmen - bei einem freigestellten Logo ist das transparent/weiß, bei
    // einem Bannerbild (z.B. Schriftzug auf farbiger Fläche) eine kräftige Farbe.
    const borderPx = Math.max(1, Math.round(Math.min(w, h) * 0.12));
    let borderCount = 0;
    let borderTransparent = 0;
    let borderLight = 0;

    let transparentTotal = 0;
    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        const isBorder = x < borderPx || x >= w - borderPx || y < borderPx || y >= h - borderPx;

        if (a < 40) {
          transparentTotal++;
          if (isBorder) {
            borderCount++;
            borderTransparent++;
          }
          continue;
        }

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const lightness = (max + min) / 2;

        if (isBorder) {
          borderCount++;
          if (lightness > 225) borderLight++;
        }

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
    }

    let best: { count: number; r: number; g: number; b: number } | null = null;
    for (const bucket of buckets.values()) {
      if (!best || bucket.count > best.count) best = bucket;
    }
    const dominantColor = best
      ? `#${[best.r, best.g, best.b]
          .map((v) => Math.round(v / best!.count).toString(16).padStart(2, "0"))
          .join("")}`.toUpperCase()
      : null;

    const borderLightOrTransparentRatio = borderCount > 0 ? (borderTransparent + borderLight) / borderCount : 0;

    return {
      width: img.width,
      height: img.height,
      transparentRatio: transparentTotal / (w * h),
      backgroundLooksLight: borderLightOrTransparentRatio > 0.7,
      dominantColor,
    };
  } catch {
    return null;
  }
}

type ScoredCandidate = {
  url: string;
  mime: string;
  buf: Buffer;
  suggestedColor: string | null;
  colorSource: LogoFetchResult["colorSource"];
  score: number;
};

function scoreRaster(analysis: RasterAnalysis, mime: string): number {
  let score = 0;
  if (analysis.transparentRatio > 0.15) score += 50;
  else if (analysis.backgroundLooksLight) score += 25;
  else score -= 45; // deckende, kräftig gefärbte Fläche -> auf weißem Brief unpassend

  if (analysis.width < 24 || analysis.height < 24) score -= 30; // vermutlich nur Favicon/Tracking-Pixel
  if (analysis.width > 2400 || analysis.height > 2400) score -= 15; // vermutlich Foto statt Logo-Asset

  const ratio = analysis.width / Math.max(1, analysis.height);
  if (ratio > 4.5 || ratio < 0.2) score -= 20; // extrem breites Banner oder schmaler Streifen

  if (analysis.width >= 64 && analysis.width <= 900) score += 10; // typische Logo-Asset-Größe
  if (analysis.width < 100) score -= 8; // sehr kleine Variante - oft nur ein Icon-Kürzel ohne Schriftzug

  if (mime === "image/png" || mime === "image/webp") score += 5; // eher Grafik/Logo als Foto
  if (analysis.dominantColor) score += 8; // erkennbare Farbe -> eher ein "echtes" Marken-Logo als ein reines Mono-Icon

  return score;
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

async function fetchPageHtml(pageUrl: URL): Promise<{ html: string; finalUrl: URL }> {
  try {
    const res = await fetchWithTimeout(pageUrl.href, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
    });
    if (res.ok) return { html: await res.text(), finalUrl: new URL(res.url || pageUrl.href) };
    if (pageUrl.hostname.startsWith("www.")) {
      throw new Error(`Webseite konnte nicht geladen werden (Status ${res.status}).`);
    }
  } catch (e) {
    if (pageUrl.hostname.startsWith("www.")) throw e;
    // manche Domains antworten nur unter "www." (DNS/Zertifikat nur dafür
    // eingerichtet) - einmal automatisch mit "www." erneut versuchen.
  }
  const wwwUrl = new URL(pageUrl.href);
  wwwUrl.hostname = `www.${wwwUrl.hostname}`;
  assertPublicHost(wwwUrl);
  const res = await fetchWithTimeout(wwwUrl.href, {
    headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
  });
  if (!res.ok) {
    throw new Error(`Webseite konnte nicht geladen werden (Status ${res.status}).`);
  }
  return { html: await res.text(), finalUrl: new URL(res.url || wwwUrl.href) };
}

export async function fetchLogoAndColor(inputUrl: string): Promise<LogoFetchResult> {
  let pageUrl = normalizeUrl(inputUrl);
  assertPublicHost(pageUrl);

  const { html, finalUrl } = await fetchPageHtml(pageUrl);
  pageUrl = finalUrl; // relative Logo-Pfade gegen die tatsächlich geladene URL auflösen (Redirects, www-Fallback)

  const themeColor = extractThemeColor(html);
  const candidateUrls = findLogoCandidates(html, pageUrl);
  const inlineSvgLogos = findInlineSvgLogos(html);
  if (candidateUrls.length === 0 && inlineSvgLogos.length === 0) {
    throw new Error("Auf dieser Seite konnte kein Logo gefunden werden.");
  }

  const scored: ScoredCandidate[] = [];

  // Inline-<svg>-Logos zuerst bewerten: kein zusätzlicher Request nötig, und ein
  // per Klasse eindeutig als "Logo" erkanntes Vektorbild ist normalerweise die
  // zuverlässigste Quelle (garantiert ohne deckenden Hintergrund).
  for (const [index, svgMarkup] of inlineSvgLogos.entries()) {
    const buf = Buffer.from(svgMarkup, "utf-8");
    const svgColor = dominantColorFromSvg(svgMarkup);
    scored.push({
      url: pageUrl.href + "#inline-svg-logo",
      mime: "image/svg+xml",
      buf,
      suggestedColor: themeColor ?? svgColor,
      colorSource: themeColor ? "theme-color" : svgColor ? "logo-svg" : null,
      score: 60 + Math.max(0, 10 - index * 2),
    });
  }

  for (const [index, candidateUrl] of candidateUrls.entries()) {
    // Frühe Fund-Position bonieren: das echte Kopfzeilen-Logo steht so gut wie
    // immer als erstes "logo"-<img> im HTML, während später im Dokument
    // gefundene "logo"-Treffer oft Partner-/Zertifikats-Badges sind, die rein
    // bildlich (klein, transparent) sonst leicht höher bewertet würden.
    const positionBonus = Math.max(0, 24 - index * 10);
    try {
      const candidateParsed = new URL(candidateUrl);
      assertPublicHost(candidateParsed);
      const imgRes = await fetchWithTimeout(candidateUrl, { headers: { "user-agent": USER_AGENT } });
      if (!imgRes.ok) continue;

      const contentType = imgRes.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
      const mime = contentType?.startsWith("image/") ? contentType : guessMimeFromUrl(candidateUrl);
      if (!mime) continue;
      // .ico-Dateien enthalten oft mehrere Größen und werden von @napi-rs/canvas
      // nicht zuverlässig dekodiert - als reines Fallback-Icon meist ohnehin nicht
      // ideal fürs Logo, daher überspringen.
      if (mime === "image/x-icon" || mime === "image/vnd.microsoft.icon") continue;

      const buf = Buffer.from(await imgRes.arrayBuffer());
      if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) continue;

      if (mime === "image/svg+xml") {
        const svgColor = dominantColorFromSvg(buf.toString("utf-8"));
        scored.push({
          url: candidateUrl,
          mime,
          buf,
          suggestedColor: themeColor ?? svgColor,
          colorSource: themeColor ? "theme-color" : svgColor ? "logo-svg" : null,
          score: 45 + positionBonus, // SVG ist Vektor, i.d.R. frei von deckendem Hintergrund - guter Startwert
        });
        continue;
      }

      const analysis = await analyzeRaster(buf);
      if (!analysis) continue;
      scored.push({
        url: candidateUrl,
        mime,
        buf,
        suggestedColor: themeColor ?? analysis.dominantColor,
        colorSource: themeColor ? "theme-color" : analysis.dominantColor ? "logo-pixel" : null,
        score: scoreRaster(analysis, mime) + positionBonus,
      });
    } catch {
      continue; // nächsten Kandidaten versuchen
    }
  }

  if (scored.length === 0) {
    throw new Error("Es konnte kein verwendbares Logo von dieser Seite geladen werden.");
  }

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];

  return {
    logoDataUrl: `data:${winner.mime};base64,${winner.buf.toString("base64")}`,
    logoMime: winner.mime,
    suggestedColor: winner.suggestedColor,
    colorSource: winner.colorSource,
    logoSourceUrl: winner.url,
  };
}
