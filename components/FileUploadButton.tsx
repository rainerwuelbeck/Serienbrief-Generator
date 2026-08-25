"use client";

import { useId, useRef } from "react";

type Props = {
  accept: string;
  onChange: (file: File | null) => void;
  label?: string;
};

/** Deutlich sichtbarer Upload-Button, ersetzt den kaum sichtbaren nativen "Datei auswählen"-Link. */
export default function FileUploadButton({ accept, onChange, label = "Datei auswählen" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="sr-only"
      />
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 3v9m0-9 3.5 3.5M10 3 6.5 6.5M4 13.5V15a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {label}
      </label>
    </>
  );
}
