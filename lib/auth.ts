// Web-Crypto-basiert (statt node:crypto), damit dieselbe Logik sowohl in der
// Node.js- als auch in der Edge-Runtime von Next.js (Middleware!) funktioniert.

export const AUTH_COOKIE = "serienbrief_auth";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Der Cookie-Wert, den ein erfolgreich eingeloggter Client tragen muss. */
export async function expectedCookieValue(): Promise<string> {
  return sha256Hex(process.env.APP_PASSWORD ?? "");
}

export async function isValidPassword(input: string): Promise<boolean> {
  if (!process.env.APP_PASSWORD) return false;
  const [a, b] = await Promise.all([sha256Hex(input), expectedCookieValue()]);
  return a === b;
}

export async function isValidCookie(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue || !process.env.APP_PASSWORD) return false;
  const expected = await expectedCookieValue();
  return cookieValue === expected;
}
