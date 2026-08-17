import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { reorderProducts } from "@/lib/db";

/** A nyilvános oldalak (főoldal kiemeltjei + portfólió) cache-ének újragenerálása. */
function invalidatePublicCache() {
  revalidatePath("/");
  revalidatePath("/portfolio");
  revalidatePath("/feed/products.xml");
}

/** Drag&drop átrendezés: { ids: string[] } — a látható sorok ÚJ sorrendje. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    ids?: unknown;
  } | null;
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((x): x is string => typeof x === "string")
    : [];
  if (ids.length < 2) {
    return NextResponse.json(
      { error: "A sorrendhez legalább két termék id szükséges." },
      { status: 400 }
    );
  }
  try {
    reorderProducts(ids);
  } catch {
    return NextResponse.json(
      { error: "Hiba történt a sorrend mentése közben." },
      { status: 500 }
    );
  }
  invalidatePublicCache();
  return NextResponse.json({ ok: true });
}
