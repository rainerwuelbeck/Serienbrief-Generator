"use client";

import { useState } from "react";
import { compressImageFile } from "@/lib/clientImage";
import FileUploadButton from "./FileUploadButton";
import type { LogoPosition, StepProps } from "./wizardTypes";

const POSITIONS: { id: LogoPosition; label: string }[] = [
  { id: "left", label: "Oben links" },
  { id: "center", label: "Oben mittig" },
  { id: "right", label: "Oben rechts" },
];

export default function StepLetterhead({ state, update }: StepProps) {
  const [preview, setPreview] = useState<string | null>(null);

  async function handleLetterheadFile(file: File | null) {
    if (!file) {
      update({ letterheadFile: null });
      return;
    }
    const processed = file.type === "application/pdf" ? file : await compressImageFile(file);
    update({ letterheadFile: processed });
    if (processed.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(processed));
    } else {
      setPreview(null);
    }
  }

  async function handleLogoFile(file: File | null) {
    if (!file) {
      update({ logoFile: null });
      return;
    }
    const processed = await compressImageFile(file);
    update({ logoFile: processed });
    setPreview(URL.createObjectURL(processed));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold">Firmen-Briefbogen</h2>
        <p className="text-sm text-slate-500">
          Lade den Briefbogen deines Kunden hoch, oder nutze stattdessen nur ein Logo, falls kein
          fertiger Briefbogen vorliegt.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => update({ letterheadMode: "image" })}
          className={`flex-1 rounded-lg border p-3 text-left text-sm ${
            state.letterheadMode === "image" ? "border-slate-900 bg-slate-900/5" : "border-slate-300"
          }`}
        >
          <div className="font-medium">Briefbogen hochladen</div>
          <div className="text-slate-500">PDF, PNG, JPEG oder WebP</div>
        </button>
        <button
          type="button"
          onClick={() => update({ letterheadMode: "logo" })}
          className={`flex-1 rounded-lg border p-3 text-left text-sm ${
            state.letterheadMode === "logo" ? "border-slate-900 bg-slate-900/5" : "border-slate-300"
          }`}
        >
          <div className="font-medium">Kein Briefbogen — nur Logo</div>
          <div className="text-slate-500">Logo hochladen und Position wählen</div>
        </button>
      </div>

      {state.letterheadMode === "image" && (
        <div className="space-y-2">
          <FileUploadButton
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={handleLetterheadFile}
            label="Briefbogen auswählen"
          />
          <p className="text-xs text-slate-500">
            Word-Datei (.docx)? Bitte in Word einmal über „Datei &gt; Speichern unter &gt; PDF“
            exportieren und die PDF hier hochladen.
          </p>
          <p className="text-xs text-slate-500">
            Der Briefbogen sollte <strong>keine eigene Absenderzeile</strong> über dem Adressfeld
            enthalten — die App setzt die Absenderzeile (siehe unten) selbst darüber, sonst
            überlagern sich beide.
          </p>
          {state.letterheadFile && (
            <p className="text-sm text-slate-700">
              Ausgewählt: <span className="font-medium">{state.letterheadFile.name}</span>
            </p>
          )}
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vorschau Briefbogen" className="max-h-64 rounded border border-slate-200" />
          )}
        </div>
      )}

      {state.letterheadMode === "logo" && (
        <div className="space-y-4">
          <div>
            <FileUploadButton
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoFile}
              label="Logo auswählen"
            />
            {state.logoFile && (
              <p className="mt-1 text-sm text-slate-700">
                Ausgewählt: <span className="font-medium">{state.logoFile.name}</span>
              </p>
            )}
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Vorschau Logo" className="mt-2 max-h-32 rounded border border-slate-200 bg-white p-2" />
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Position auf Seite 1</label>
            <div className="flex gap-2">
              {POSITIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => update({ logoPosition: p.id })}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    state.logoPosition === p.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white hover:bg-slate-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-slate-200 pt-6">
        <h3 className="mb-1 text-sm font-semibold">Absenderzeile</h3>
        <p className="mb-2 text-xs text-slate-500">
          Kleine Zeile über dem Adressfeld, z.B. für die Fensterlasche des Umschlags. Optional.
        </p>
        <input
          type="text"
          value={state.absenderzeile}
          onChange={(e) => update({ absenderzeile: e.target.value })}
          placeholder="Firma GmbH · Ansprechpartner · Straße 1 · 12345 Ort"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="mb-1 text-sm font-semibold">Design-Farbe</h3>
        <p className="mb-2 text-xs text-slate-500">
          Wird für die Überschrift auf Seite 1 sowie Nummerierungen, Striche und Linien auf Seite 2
          verwendet.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(state.designColor) ? state.designColor : "#000000"}
            onChange={(e) => update({ designColor: e.target.value.toUpperCase() })}
            className="h-9 w-14 cursor-pointer rounded border border-slate-300"
          />
          <input
            type="text"
            value={state.designColor}
            onChange={(e) => update({ designColor: e.target.value })}
            placeholder="#000000"
            maxLength={7}
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
          />
          {!/^#[0-9a-fA-F]{6}$/.test(state.designColor) && (
            <span className="text-xs text-red-600">Bitte gültigen Hex-Wert angeben, z.B. #1E6FA6</span>
          )}
        </div>
      </div>
    </div>
  );
}
