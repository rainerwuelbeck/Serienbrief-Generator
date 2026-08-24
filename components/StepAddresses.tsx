"use client";

import { useState } from "react";
import {
  REQUIRED_FIELDS,
  applyMapping,
  guessMapping,
  parseCsv,
  type Recipient,
} from "@/lib/csv/parseAddresses";
import type { StepProps } from "./wizardTypes";

export default function StepAddresses({ state, update }: StepProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    setError(null);
    if (!file) {
      update({ csvFile: null, csvHeaders: [], csvRows: [], mapping: {} });
      return;
    }
    try {
      const text = await file.text();
      const { headers, rows } = parseCsv(text);
      if (headers.length === 0) throw new Error("Konnte keine Spaltenüberschriften finden.");
      update({ csvFile: file, csvHeaders: headers, csvRows: rows, mapping: guessMapping(headers) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV konnte nicht gelesen werden.");
      update({ csvFile: null, csvHeaders: [], csvRows: [], mapping: {} });
    }
  }

  let preview: Recipient[] = [];
  let mappingError: string | null = null;
  if (state.csvRows.length > 0) {
    try {
      preview = applyMapping(state.csvRows.slice(0, 5), state.mapping);
    } catch (e) {
      mappingError = e instanceof Error ? e.message : "Zuordnung unvollständig.";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold">Adressliste (CSV)</h2>
        <p className="text-sm text-slate-500">
          Lade die CSV-Datei mit den Empfängerdaten hoch und ordne die Spalten den benötigten
          Feldern zu.
        </p>
      </div>

      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}

      {state.csvHeaders.length > 0 && (
        <>
          <p className="text-sm text-slate-600">
            {state.csvRows.length} Zeile{state.csvRows.length === 1 ? "" : "n"} gefunden.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {REQUIRED_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-sm font-medium">{field.label}</label>
                <select
                  value={state.mapping[field.key] ?? ""}
                  onChange={(e) =>
                    update({ mapping: { ...state.mapping, [field.key]: e.target.value || undefined } })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">— Spalte wählen —</option>
                  {state.csvHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <p className="mt-0.5 text-xs text-slate-400">{field.hint}</p>
              </div>
            ))}
          </div>

          {mappingError && <p className="text-sm text-amber-600">{mappingError}</p>}

          {preview.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    {REQUIRED_FIELDS.map((f) => (
                      <th key={f.key} className="px-3 py-2 font-medium">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2">{r.vorname}</td>
                      <td className="px-3 py-2">{r.nachname}</td>
                      <td className="px-3 py-2">{r.anredezeile}</td>
                      <td className="px-3 py-2">{r.strasse}</td>
                      <td className="px-3 py-2">{r.plzOrt}</td>
                      <td className="px-3 py-2">{r.freischaltcode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-slate-100 px-3 py-1.5 text-xs text-slate-400">
                Vorschau der ersten {preview.length} Zeilen
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
