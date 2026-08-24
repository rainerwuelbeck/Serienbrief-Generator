"use client";

import { useState } from "react";
import { compressImageFile } from "@/lib/clientImage";
import { STOCK_PHOTOS, stockPhotoPublicPath } from "@/lib/stockPhotos";
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
          Lade ein eigenes Foto/Illustration hoch, oder wähle eines der 5 Standardmotive.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => update({ photoMode: "upload" })}
          className={`flex-1 rounded-lg border p-3 text-left text-sm ${
            state.photoMode === "upload" ? "border-slate-900 bg-slate-900/5" : "border-slate-300"
          }`}
        >
          <div className="font-medium">Eigenes Foto hochladen</div>
        </button>
        <button
          type="button"
          onClick={() => update({ photoMode: "stock" })}
          className={`flex-1 rounded-lg border p-3 text-left text-sm ${
            state.photoMode === "stock" ? "border-slate-900 bg-slate-900/5" : "border-slate-300"
          }`}
        >
          <div className="font-medium">Standardmotiv wählen</div>
        </button>
      </div>

      {state.photoMode === "upload" && (
        <div className="space-y-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => handlePhotoFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
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
                state.stockPhotoId === p.id ? "border-slate-900" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stockPhotoPublicPath(p.id)} alt={p.label} className="h-24 w-full object-cover" />
              <div className="bg-slate-50 px-2 py-1 text-xs text-slate-600">{p.label}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
