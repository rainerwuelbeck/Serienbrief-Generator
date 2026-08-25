"use client";

import { useState } from "react";
import { compressImageFile } from "@/lib/clientImage";
import { BERATUNGSLINK_DOMAINS, buildBeratungslinkUrl } from "@/lib/beratungslink";
import { STOCK_PHOTOS, stockPhotoPublicPath } from "@/lib/stockPhotos";
import FileUploadButton from "./FileUploadButton";
import type { StepProps } from "./wizardTypes";

export default function StepPhoto({ state, update }: StepProps) {
  const [preview, setPreview] = useState<string | null>(null);

  async function handlePhotoFile(file: File | null) {
    if (!file) {
      update({ photoFile: null });
      return;
    }
    const processed = await compressImageFile(file);
    update({ photoFile: processed });
    setPreview(URL.createObjectURL(processed));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold">Headerbild für Seite 2</h2>
        <p className="text-sm text-slate-500">
          Lade ein eigenes Foto/Illustration hoch, oder wähle eines der 6 Standardmotive.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => update({ photoMode: "upload" })}
          className={`flex-1 rounded-lg border p-3 text-left text-sm ${
            state.photoMode === "upload" ? "border-sky-600 bg-sky-50" : "border-slate-300"
          }`}
        >
          <div className="font-medium">Eigenes Foto hochladen</div>
        </button>
        <button
          type="button"
          onClick={() => update({ photoMode: "stock" })}
          className={`flex-1 rounded-lg border p-3 text-left text-sm ${
            state.photoMode === "stock" ? "border-sky-600 bg-sky-50" : "border-slate-300"
          }`}
        >
          <div className="font-medium">Standardmotiv wählen</div>
        </button>
      </div>

      {state.photoMode === "upload" && (
        <div className="space-y-2">
          <FileUploadButton
            accept="image/png,image/jpeg,image/webp"
            onChange={handlePhotoFile}
            label="Foto auswählen"
          />
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Empfohlene Auflösung: mindestens <strong>1200 px breit</strong> (Seitenverhältnis ca.
            2,7 : 1, z.B. 1600 × 600 px) für einen scharfen Druck über die volle Seitenbreite.
          </p>
          {state.photoFile && (
            <p className="text-sm text-slate-700">
              Ausgewählt: <span className="font-medium">{state.photoFile.name}</span>
            </p>
          )}
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Vorschau Headerfoto" className="max-h-40 w-full rounded border border-slate-200 object-cover" />
          )}
        </div>
      )}

      {state.photoMode === "stock" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {STOCK_PHOTOS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => update({ stockPhotoId: p.id })}
              className={`overflow-hidden rounded-lg border-2 text-left ${
                state.stockPhotoId === p.id ? "border-sky-600" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stockPhotoPublicPath(p.id)}
                alt={p.label}
                className="aspect-[21/10] w-full object-cover"
              />
              <div className="bg-slate-50 px-2 py-1 text-xs text-slate-600">{p.label}</div>
            </button>
          ))}
        </div>
      )}

      <div className="border-t-2 border-[#F67E15] pt-6">
        <label className="mb-1 block text-sm font-medium">Beratungslink-URL</label>
        <p className="mb-2 text-xs text-slate-500">
          Wird auf Seite 2 als Link angezeigt und als QR-Code eingebettet. Nur die Subdomain
          eingeben, die Endung wird automatisch ergänzt.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">https://</span>
          <input
            type="text"
            value={state.beratungslinkSubdomain}
            onChange={(e) => update({ beratungslinkSubdomain: e.target.value })}
            placeholder="mustermann"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm sm:max-w-[220px]"
          />
          <span className="text-sm text-slate-500">.</span>
          <select
            value={state.beratungslinkDomain}
            onChange={(e) => update({ beratungslinkDomain: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {BERATUNGSLINK_DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        {state.beratungslinkSubdomain.trim() ? (
          <p className="mt-2 text-xs text-slate-500">
            Vorschau:{" "}
            <span className="font-medium text-slate-700">
              {buildBeratungslinkUrl(state.beratungslinkSubdomain, state.beratungslinkDomain)}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-amber-600">Bitte eine Subdomain eingeben, z.B. „mustermann“.</p>
        )}
      </div>
    </div>
  );
}
