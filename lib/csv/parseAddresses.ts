import Papa from "papaparse";

/**
 * Dekodiert eine CSV-Datei robust zu Text - unabhängig davon, ob sie als
 * UTF-8 (mit/ohne BOM) oder als Windows-1252/ANSI gespeichert wurde (typisch
 * für "CSV (Trennzeichen-getrennt)"-Exporte aus Excel auf einem deutschen
 * Windows-System). Ohne das würden Umlaute (ö, ä, ü, ß) falsch dargestellt.
 */
export function decodeCsvBytes(bytes: Uint8Array): string {
  const hasUtf8Bom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const body = hasUtf8Bom ? bytes.subarray(3) : bytes;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    try {
      return new TextDecoder("windows-1252").decode(body);
    } catch {
      return new TextDecoder("utf-8").decode(body); // letzter Ausweg, ohne fatal
    }
  }
}

// "Einfache" Felder: werden 1:1 aus je einer CSV-Spalte übernommen.
export type SimpleField = "vorname" | "nachname" | "strasse" | "plz" | "ort" | "freischaltcode";

export const SIMPLE_FIELDS: { key: SimpleField; label: string; hint: string }[] = [
  { key: "vorname", label: "Vorname", hint: "z.B. Max" },
  { key: "nachname", label: "Nachname", hint: "z.B. Mustermann" },
  { key: "strasse", label: "Straße + Hausnummer", hint: "für das Adressfeld" },
  { key: "plz", label: "PLZ", hint: "Postleitzahl, für das Adressfeld" },
  { key: "ort", label: "Ort", hint: "für das Adressfeld" },
  { key: "freischaltcode", label: "Freischaltcode", hint: "persönlicher Zugangscode" },
];

export type ColumnMapping = Partial<Record<SimpleField, string>>;

// Briefanredezeile: entweder aus einer eigenen CSV-Spalte, oder automatisch aus
// Vorname/Nachname nach einer der 4 festen Vorlagen erzeugt.
export type AnredeTemplateId =
  | "liebe-vorname"
  | "liebe-vorname-nachname"
  | "hallo-vorname"
  | "hallo-vorname-nachname";

export const ANREDE_TEMPLATES: { id: AnredeTemplateId; label: string; build: (vorname: string, nachname: string) => string }[] = [
  { id: "liebe-vorname", label: "Liebe:r [Vorname],", build: (v) => `Liebe:r ${v},` },
  { id: "liebe-vorname-nachname", label: "Liebe:r [Vorname] [Nachname],", build: (v, n) => `Liebe:r ${v} ${n},` },
  { id: "hallo-vorname", label: "Hallo [Vorname],", build: (v) => `Hallo ${v},` },
  { id: "hallo-vorname-nachname", label: "Hallo [Vorname] [Nachname],", build: (v, n) => `Hallo ${v} ${n},` },
];

export function buildAnredezeile(templateId: AnredeTemplateId, vorname: string, nachname: string): string {
  const template = ANREDE_TEMPLATES.find((t) => t.id === templateId) ?? ANREDE_TEMPLATES[0];
  return template.build(vorname, nachname);
}

export type AnredezeileConfig =
  | { mode: "column"; column: string }
  | { mode: "auto"; template: AnredeTemplateId };

export type Recipient = Record<SimpleField, string> & {
  anredezeile: string;
  /** komplette Rohzeile, falls weitere Spalten für spätere Erweiterungen gebraucht werden */
  raw: Record<string, string>;
};

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (result.errors?.length) {
    const critical = result.errors.filter((e) => e.type !== "FieldMismatch");
    if (critical.length) {
      throw new Error(
        `CSV konnte nicht gelesen werden: ${critical[0].message} (Zeile ${critical[0].row ?? "?"})`
      );
    }
  }
  const headers = result.meta.fields ?? [];
  const rows = (result.data ?? []).filter((r) => Object.values(r).some((v) => (v ?? "").trim() !== ""));
  return { headers, rows };
}

/** Normalisiert einen Spaltennamen für den Best-Effort-Abgleich (Umlaute/ß einrechnen, Rest verwerfen). */
function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/[^a-z0-9]/g, "");
}

/** Versucht Spaltennamen automatisch den einfachen Feldern zuzuordnen (Best-Effort, editierbar in der UI). */
export function guessMapping(headers: string[]): ColumnMapping {
  const table: Record<SimpleField, string[]> = {
    vorname: ["vorname", "firstname", "givenname"],
    nachname: ["nachname", "name", "lastname", "surname", "familyname"],
    strasse: ["strasse", "strassehausnummer", "street", "adresse1"],
    plz: ["plz", "postleitzahl", "zip", "zipcode", "postcode"],
    ort: ["ort", "stadt", "city", "town"],
    freischaltcode: ["freischaltcode", "code", "zugangscode", "aktivierungscode"],
  };
  // Spaltennamen, die exakt den eigenen Feld-Labels entsprechen (z.B. "Straße + Hausnummer"),
  // sollen immer automatisch erkannt werden - unabhängig von der festen Kandidatenliste oben.
  const labelByField = Object.fromEntries(
    SIMPLE_FIELDS.map((f) => [f.key, normalizeHeader(f.label)])
  ) as Record<SimpleField, string>;

  const mapping: ColumnMapping = {};
  for (const header of headers) {
    const n = normalizeHeader(header);
    for (const [field, candidates] of Object.entries(table) as [SimpleField, string[]][]) {
      if (mapping[field]) continue;
      if (candidates.includes(n) || n === labelByField[field]) mapping[field] = header;
    }
  }
  return mapping;
}

/** Rät eine passende Spalte für eine (optionale) fertige Anredezeile, falls vorhanden. */
export function guessAnredezeileColumn(headers: string[]): string | undefined {
  const candidates = ["anredezeile", "briefanrede", "anredetext", "salutation"];
  return headers.find((h) => candidates.includes(normalizeHeader(h)));
}

export function applyMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  anredezeileConfig: AnredezeileConfig
): Recipient[] {
  const missing = SIMPLE_FIELDS.filter((f) => !mapping[f.key]);
  if (missing.length) {
    throw new Error(
      `Bitte alle Felder zuordnen. Es fehlt: ${missing.map((m) => m.label).join(", ")}`
    );
  }
  if (anredezeileConfig.mode === "column" && !anredezeileConfig.column) {
    throw new Error("Bitte eine Spalte für die Briefanredezeile wählen (oder auf „Automatisch generieren“ umstellen).");
  }

  return rows.map((row) => {
    const rec: Partial<Recipient> = { raw: row };
    for (const field of SIMPLE_FIELDS) {
      const header = mapping[field.key]!;
      rec[field.key] = (row[header] ?? "").trim();
    }
    rec.anredezeile =
      anredezeileConfig.mode === "auto"
        ? buildAnredezeile(anredezeileConfig.template, rec.vorname ?? "", rec.nachname ?? "")
        : (row[anredezeileConfig.column] ?? "").trim();
    return rec as Recipient;
  });
}
