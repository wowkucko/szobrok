import { NextRequest, NextResponse } from "next/server";
import { syncAllSources } from "@/lib/blogSync";

// Napi automatikus blog szinkron. A droplet crontab-jából hívható, pl.:
// 17 3 * * * curl -s "https://festettszobrok.com/api/cron/blog-sync?secret=XXXX"
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.nextUrl.searchParams.get("secret") ??
    request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Háttérben fut: a cron hívás azonnal visszatér, a szinkron a szerveren folytatódik.
    void syncAllSources().catch((err) => console.error("[blog] cron szinkron hiba:", err));
    return NextResponse.json({ ok: true, started: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const POST = GET;
