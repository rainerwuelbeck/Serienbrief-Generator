/**
 * Erlaubte Domainendungen für den Beratungslink. Nutzer geben nur die
 * Subdomain ein, die Endung wird per Auswahlliste ergänzt.
 */
export const BERATUNGSLINK_DOMAINS = ["unserebav.de", "unserebkv.de"] as const;
export type BeratungslinkDomain = (typeof BERATUNGSLINK_DOMAINS)[number];

export const DEFAULT_BERATUNGSLINK_DOMAIN: BeratungslinkDomain = "unserebav.de";

/** "mustermann" + "unserebav.de" -> "https://mustermann.unserebav.de" */
export function buildBeratungslinkUrl(subdomain: string, domain: string): string {
  const clean = subdomain.trim().replace(/^\.+|\.+$/g, "");
  if (!clean) return "";
  return `https://${clean}.${domain}`;
}
