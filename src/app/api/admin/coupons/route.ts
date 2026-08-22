import { NextRequest, NextResponse } from "next/server";
import {
  createCoupon,
  deleteCoupon,
  listCoupons,
  setCouponActive,
} from "@/lib/db";

/** Kuponok listázása (admin). */
export async function GET() {
  return NextResponse.json({ coupons: listCoupons() });
}

/** Új kupon létrehozása. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { code?: unknown; label?: unknown; discount?: unknown }
    | null;
  if (!body) {
    return NextResponse.json({ error: "Érvénytelen kérés." }, { status: 400 });
  }
  const code = typeof body.code === "string" ? body.code : "";
  const label = typeof body.label === "string" ? body.label : "";
  const discount =
    typeof body.discount === "number" ? body.discount : Number(body.discount);
  const result = createCoupon(code, label, discount);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, coupon: result.coupon });
}

/** Aktív/inaktív átkapcsolás. */
export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { code?: unknown; active?: unknown }
    | null;
  if (!body || typeof body.code !== "string") {
    return NextResponse.json({ error: "Hiányzó kód." }, { status: 400 });
  }
  const active = Boolean(body.active);
  const changed = setCouponActive(body.code, active);
  if (!changed) {
    return NextResponse.json(
      { error: "Nincs ilyen kupon." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, active });
}

/** Kupon törlése. */
export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { code?: unknown }
    | null;
  if (!body || typeof body.code !== "string") {
    return NextResponse.json({ error: "Hiányzó kód." }, { status: 400 });
  }
  const removed = deleteCoupon(body.code);
  if (!removed) {
    return NextResponse.json(
      { error: "Nincs ilyen kupon." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
