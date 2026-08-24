import Papa from "papaparse";

export type RequiredField =
  | "vorname"
  | "nachname"
  | "anredezeile"
  | "strasse"
  | "plzOrt"
  | "freischaltcode";

export const REQUIRED_FIELDS: { key: RequiredField; label: string; hint: string }[] = [
  { key: "vorname", label: "Vorname", hint: "z.B. Max" },
  { key: "nachname", label: "Nachname", hint: "z.B. Mustermann" },
  {
    key: "anredezeile",
    label: "Briefanredezeile",
    hint: "die fertige Anrede-Zeile, z.B. „Lieber Max,“ oder „Sehr geehrter Herr Mustermann,“",
  },
  { key: "strasse", label: "Straße + Hausnummer", hint: "für das Adressfeld" },
  { key: "plzOrt", label: "PLZ + Ort", hint: "für das Adressfeld" },
  { key: "freischaltcode", label: "Freischaltcode", hint: "persönlicher Zugangscode" },
];

export type ColumnMapping = Partial<Record<RequiredField, string>>;

export type Recipient = Record<RequiredField, string> & {
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

/** Versucht Spaltennamen automatisch den Pflichtfeldern zuzuordnen (Best-Effort, editierbar in der UI). */
export function guessMapping(headers: string[]): ColumnMapping {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const table: Record<RequiredField, string[]> = {
    vorname: ["vorname", "firstname", "givenname"],
    nachname: ["nachname", "name", "lastname", "surname", "familyname"],
    anredezeile: ["anredezeile", "briefanrede", "anrede", "salutation", "anredetext"],
    strasse: ["strasse", "straße", "street", "adresse1"],
    plzOrt: ["plzort", "plzundort", "ort", "city", "postleitzahlort"],
    freischaltcode: ["freischaltcode", "code", "zugangscode", "aktivierungscode"],
  };
  const mapping: ColumnMapping = {};
  for (const header of headers) {
    const n = normalize(header);
    for (const [field, candidates] of Object.entries(table) as [RequiredField, string[]][]) {
      if (mapping[field]) continue;
      if (candidates.includes(n)) mapping[field] = header;
    }
  }
  return mapping;
}

export function applyMapping(rows: Record<string, string>[], mapping: ColumnMapping): Recipient[] {
  const missing = REQUIRED_FIELDS.filter((f) => !mapping[f.key]);
  if (missing.length) {
    throw new Error(
      `Bitte alle Felder zuordnen. Es fehlt: ${missing.map((m) => m.label).join(", ")}`
    );
  }
  return rows.map((row) => {
    const rec: Partial<Recipient> = { raw: row };
    for (const field of REQUIRED_FIELDS) {
      const header = mapping[field.key]!;
      rec[field.key] = (row[header] ?? "").trim();
    }
    return rec as Recipient;
  });
}
