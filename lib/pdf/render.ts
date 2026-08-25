import type { Browser } from "puppeteer-core";

/**
 * Startet Chromium – auf Vercel/Serverless über @sparticuz/chromium (schlanke,
 * für Lambda/Vercel-Functions gebaute Binary), lokal über das normale
 * `puppeteer`-Paket mit gebündeltem Chromium (siehe scripts/fetch-fonts.mjs
 * Kommentar oben für den Hintergrund, warum wir Fonts lokal bündeln).
 */
async function getBrowser(): Promise<Browser> {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = await import("puppeteer-core");
    const executablePath = await chromium.executablePath();
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });
  }

  const puppeteer = (await import("puppeteer")).default;
  return puppeteer.launch({ headless: true }) as unknown as Browser;
}

/**
 * Rendert ein HTML-Dokument als PNG-Screenshot (statt PDF). Wird für die
 * Font-Vorschau-Grafik genutzt (scripts/make-font-specimen.mjs) - da der
 * Browser des jeweiligen Nutzers @font-face teils nicht zuverlässig
 * rendert (z.B. durch Sicherheitsrichtlinien wie "Block untrusted fonts"),
 * wird die Vorschau stattdessen einmalig serverseitig mit derselben
 * Puppeteer-Pipeline wie die eigentliche PDF-Erzeugung als Bild erzeugt.
 */
export async function renderHtmlToPng(
  html: string,
  viewport: { width: number; height: number }
): Promise<Buffer> {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    await page.setContent(html, { waitUntil: "load" });
    const png = await page.screenshot({ type: "png" });
    return Buffer.from(png);
  } finally {
    await browser.close();
  }
}

/** Rendert ein komplettes HTML-Dokument (alle Empfänger, alle Seiten) zu einer einzigen PDF. */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    // Alle Ressourcen (Schriften, Bilder) sind als data:-URIs inline eingebettet,
    // daher genügt "load" - kein externer Netzwerk-Traffic zu erwarten.
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
