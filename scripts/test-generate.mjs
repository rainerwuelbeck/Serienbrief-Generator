// End-to-End-Test gegen den laufenden Dev-Server: simuliert genau den Request,
// den der Wizard beim Klick auf "Serienbriefe erstellen" absetzt.
import fs from "node:fs";

const BASE = "http://localhost:3000";

async function login() {
  const res = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "changeme" }),
  });
  if (!res.ok) throw new Error("Login fehlgeschlagen: " + res.status);
  const setCookie = res.headers.get("set-cookie");
  const cookie = setCookie?.split(";")[0];
  if (!cookie) throw new Error("Kein Cookie erhalten");
  return cookie;
}

async function run(mode) {
  const cookie = await login();

  const fd = new FormData();
  if (mode === "letterhead") {
    fd.set("letterheadMode", "image");
    fd.set(
      "letterheadFile",
      new Blob([fs.readFileSync("test-data/briefbogen.pdf")], { type: "application/pdf" }),
      "briefbogen.pdf"
    );
  } else {
    fd.set("letterheadMode", "logo");
    fd.set("logoFile", new Blob([fs.readFileSync("test-data/logo.png")], { type: "image/png" }), "logo.png");
    fd.set("logoPosition", "left");
  }

  fd.set(
    "bodyHtml",
    "<h2>Warum Geld verschenken?</h2><p>{{Anredezeile}}</p><p>Das ist ein Testtext für {{Vorname}} {{Nachname}}.</p><p>Ihre Geschäftsführung</p>"
  );
  fd.set("page2Html", "<p>Ihr Freischaltcode: {{Freischaltcode}}</p>");
  fd.set("fontId", "carlito");
  fd.set("fontSizePt", "11");

  fd.set("photoMode", "stock");
  fd.set("stockPhotoId", "3");

  fd.set(
    "csvFile",
    new Blob([fs.readFileSync("test-data/beispiel-adressen.csv")], { type: "text/csv" }),
    "beispiel-adressen.csv"
  );
  fd.set(
    "mapping",
    JSON.stringify({
      vorname: "Vorname",
      nachname: "Nachname",
      strasse: "Strasse",
      plz: "PLZ",
      ort: "Ort",
      freischaltcode: "Freischaltcode",
    })
  );
  // Testet beide Anredezeile-Modi: "logo"-Lauf nutzt die CSV-Spalte, der
  // "letterhead"-Lauf die automatische Generierung aus Vorname/Nachname.
  fd.set(
    "anredezeileConfig",
    mode === "letterhead"
      ? JSON.stringify({ mode: "auto", template: "hallo-vorname-nachname" })
      : JSON.stringify({ mode: "column", column: "Anredezeile" })
  );

  const res = await fetch(`${BASE}/api/generate`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: fd,
  });

  console.log(mode, "-> status", res.status, res.headers.get("content-type"));
  if (!res.ok) {
    console.log(await res.text());
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = `test-data/output-${mode}.pdf`;
  fs.writeFileSync(outPath, buf);
  console.log("wrote", outPath, buf.length, "bytes");
}

await run("logo");
await run("letterhead");
