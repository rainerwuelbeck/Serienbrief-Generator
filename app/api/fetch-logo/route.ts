import { NextResponse } from "next/server";
import { fetchLogoAndColor } from "@/lib/logoFetch";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Bitte eine Webseiten-Adresse angeben." }, { status: 400 });
  }

  try {
    const result = await fetchLogoAndColor(url);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Logo konnte nicht geladen werden.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
