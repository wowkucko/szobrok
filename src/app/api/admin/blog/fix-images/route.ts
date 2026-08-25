import { NextResponse } from "next/server";
import { fixBlogImages } from "@/lib/blogSync";

/** Meglévő bejegyzések hiányzó képeinek pótlása (háttérben). */
export async function POST() {
  void fixBlogImages().catch((err) => console.error("[blog] képjavítás hiba:", err));
  return NextResponse.json({ ok: true, started: true });
}
