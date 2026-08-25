import { NextResponse } from "next/server";
import { translateUntranslated } from "@/lib/blogSync";

/** A még angolul maradt bejegyzések újrafordítása (háttérben). */
export async function POST() {
  void translateUntranslated().catch((err) =>
    console.error("[blog] újrafordítás hiba:", err)
  );
  return NextResponse.json({ ok: true, started: true });
}
