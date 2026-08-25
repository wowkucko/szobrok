import { NextResponse } from "next/server";
import { translateUntranslated } from "@/lib/blogSync";

/** A még angolul maradt bejegyzések újrafordítása (háttérben). */
export async function POST(request: Request) {
  const all = new URL(request.url).searchParams.get("all") === "1";
  void translateUntranslated({ force: all }).catch((err) =>
    console.error("[blog] újrafordítás hiba:", err)
  );
  return NextResponse.json({ ok: true, started: true, force: all });
}
