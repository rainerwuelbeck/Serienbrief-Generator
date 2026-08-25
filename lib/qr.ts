import QRCode from "qrcode";

/** Erzeugt einen QR-Code für die Beratungslink-URL als PNG-data:-URI. */
export async function generateQrDataUrl(url: string, color: string): Promise<string> {
  return QRCode.toDataURL(url, {
    margin: 1,
    width: 400,
    color: {
      dark: color,
      light: "#FFFFFF",
    },
  });
}
