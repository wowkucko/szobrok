import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getMaintenance, setMaintenance } from "@/lib/db";

/** A nyilvános oldalak gyorsítótárának újragenerálása. */
function invalidatePublicCache() {
  revalidatePath("/");
  revalidatePath("/portfolio");
  revalidatePath("/karbantartas");
}

/** A karbantartás mód aktuális állapota (az admin űrlap feltöltéséhez). */
export async function GET() {
  return NextResponse.json({ maintenance: getMaintenance() });
}

/**
 * Karbantartás mód be-/kikapcsolása és a tájékoztató szöveg mentése.
 * Body: { enabled: boolean, message?: string }
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    enabled?: unknown;
    message?: unknown;
  } | null;

  if (!body || typeof body.enabled !== "boolean") {
    return NextResponse.json(
      { error: "Az enabled mező (true/false) kötelező." },
      { status: 400 }
    );
  }
  const message = typeof body.message === "string" ? body.message : "";

  try {
    setMaintenance(body.enabled, message);
  } catch {
    return NextResponse.json(
      { error: "Hiba történt a beállítás mentése közben." },
      { status: 500 }
    );
  }

  invalidatePublicCache();
  return NextResponse.json({ ok: true, maintenance: getMaintenance() });
}
