import { NextRequest, NextResponse } from "next/server";

/**
 * IndexNow kulcs-fájl (tulajdon-igazolás).
 *
 * A keresők az első URL-jelzés után letöltik ezt a címet, és ellenőrzik, hogy
 * a válasz pontosan a bejelentett kulcsot tartalmazza-e. Ezért a válasz
 * „text/plain” tartalom, és csak akkor szolgáljuk ki, ha a kért kulcs
 * megegyezik a beállított `INDEXNOW_KEY` értékkel.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const expected = (process.env.INDEXNOW_KEY ?? "").trim();
  if (!expected || key !== expected) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(expected, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
