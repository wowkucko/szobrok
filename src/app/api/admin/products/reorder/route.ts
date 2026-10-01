import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { reorderProducts } from "@/lib/db";

/** A nyilvános oldalak (főoldal kiemeltjei + portfólió) cache-ének újragenerálása. */
function invalidatePublicCache() {
  revalidatePath("/");
  revalidatePath("/portfolio");
  revalidatePath("/feed/products.xml");
}

/**
 * Drag&drop átrendezés.
 *  - { ids: [movedId], beforeId | afterId } — a húzott elem a beforeId elé,
 *    bzw. az afterId után kerül (pontos, oldaltöbb lapozott nézetben is).
 *    Az afterId: "" a lista elejére, a beforeId: "" a végére húzást jelenti.
 *  - { ids } — a látható blokk új sorrendje a helyén (2+ elem).
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    ids?: unknown;
    beforeId?: unknown;
    afterId?: unknown;
  } | null;
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((x): x is string => typeof x === "string")
    : [];
  const beforeId =
    typeof body?.beforeId === "string" ? body.beforeId : undefined;
  const afterId =
    typeof body?.afterId === "string" ? body.afterId : undefined;
  const singleMove = beforeId !== undefined || afterId !== undefined;
  if (ids.length === 0 || (!singleMove && ids.length < 2)) {
    return NextResponse.json(
      { error: "A sorrendhez legalább egy termék id szükséges." },
      { status: 400 }
    );
  }
  try {
    const updated = reorderProducts(ids, { beforeId, afterId });
    if (!updated) {
      return NextResponse.json(
        { error: "Nincs érvényes átrendezés (ismeretlen termék id?)." },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Hiba történt a sorrend mentése közben." },
      { status: 500 }
    );
  }
  invalidatePublicCache();
  return NextResponse.json({ ok: true });
}
