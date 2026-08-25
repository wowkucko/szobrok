import { NextRequest, NextResponse } from "next/server";
import { listBlogSources } from "@/lib/db";
import { syncSource, syncAllSources, cancelSync } from "@/lib/blogSync";

/**
 * Szinkronizálás most (háttérben). ?source=<nick> egy forrást, egyébként az
 * összeset indítja el. A válasz azonnal jön; az állás a /sources végponton
 * (sync_status / sync_progress) követhető.
 * ?cancel=1 esetén a megadott (vagy az összes) forrás futó szinkronja leáll.
 * ?batch=<N> egy futásban felvett új bejegyzések száma (alapértelmezett: korlátlan).
 */
export async function POST(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("source");
  const batch = Number(request.nextUrl.searchParams.get("batch") ?? 0);
  const cancel = request.nextUrl.searchParams.get("cancel") === "1";

  if (cancel) {
    if (source) cancelSync(source);
    else listBlogSources().forEach((s) => cancelSync(s.username));
    return NextResponse.json({ ok: true, cancelled: true });
  }

  if (source) {
    void syncSource(source, { maxNew: batch || undefined }).catch((err) =>
      console.error(`[blog] ${source} szinkron hiba:`, err)
    );
  } else {
    void syncAllSources({ maxNew: batch || undefined }).catch((err) =>
      console.error("[blog] szinkron hiba:", err)
    );
  }
  return NextResponse.json({ ok: true, started: true });
}
