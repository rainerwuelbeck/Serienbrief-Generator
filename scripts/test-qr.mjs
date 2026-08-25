import { generateQrDataUrl } from "../lib/qr.ts";
const url = await generateQrDataUrl("https://schwarz.unserebav.de", "#1E6FA6");
console.log(url.slice(0, 60), "... length:", url.length);
