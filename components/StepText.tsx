"use client";

import { FONTS } from "@/lib/fonts";
import { STANDARD_TEXTS, getStandardText } from "@/lib/templates/standardTexts";
import RichTextEditor from "./RichTextEditor";
import type { StepProps } from "./wizardTypes";

const MERGE_FIELDS = [
  { token: "{{Anredezeile}}", label: "Anredezeile" },
  { token: "{{Vorname}}", label: "Vorname" },
  { token: "{{Nachname}}", label: "Nachname" },
  { token: "{{Freischaltcode}}", label: "Freischaltcode" },
];

export default function StepText({ state, update }: StepProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 text-lg font-semibold">Anschreibentext</h2>
        <p className="mb-3 text-sm text-slate-500">
          Wähle eine der vier Standardvorlagen als Ausgangspunkt oder schreibe einen eigenen Text.
          Der Text bleibt danach frei bearbeitbar — Formatierung, Platzhalter usw.
        </p>
        <div className="flex flex-wrap gap-2">
          {STANDARD_TEXTS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => update({ bodyHtml: getStandardText(t.id).bodyHtml })}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => update({ bodyHtml: "<p>{{Anredezeile}}</p><p></p>" })}
            className="rounded-lg border border-dashed border-slate-400 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Leer beginnen
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Brieftext (Seite 1)</label>
        <RichTextEditor
          value={state.bodyHtml}
          onChange={(html) => update({ bodyHtml: html })}
          mergeFields={MERGE_FIELDS}
          minHeight="280px"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Hinweistext unter dem Freischaltcode (Seite 2)</label>
        <RichTextEditor
          value={state.page2Html}
          onChange={(html) => update({ page2Html: html })}
          mergeFields={MERGE_FIELDS}
          minHeight="120px"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Schriftart</label>
          <select
            value={state.fontId}
            onChange={(e) => update({ fontId: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label} ({f.hint})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Schriftgröße</label>
          <select
            value={state.fontSizePt}
            onChange={(e) => update({ fontSizePt: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {[9, 10, 10.5, 11, 12, 13].map((pt) => (
              <option key={pt} value={pt}>
                {pt} pt
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
