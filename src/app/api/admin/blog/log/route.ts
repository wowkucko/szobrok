import { NextResponse } from "next/server";
import { getBlogLog } from "@/lib/blogLog";

/** Blog-modul naplója (élő): a háttérben futó szinkron/fordítás állapota és
 *  hibái (pl. Gemini 429/kvóta) az admin számára. */
export async function GET() {
  return NextResponse.json({ log: getBlogLog() });
}
