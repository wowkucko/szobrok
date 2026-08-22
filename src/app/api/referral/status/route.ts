import { NextRequest, NextResponse } from "next/server";
import { getCoupon, getReferral } from "@/lib/db";

/** Referral állapot lekérése (kattintás nélkül) — a haladás megjelenítéséhez. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ error: "Hiányzó kód." }, { status: 400 });
  }
  const existing = getReferral(code);
  if (!existing) {
    return NextResponse.json({ error: "Érvénytelen kód." }, { status: 404 });
  }
  const coupon = existing.coupon ? getCoupon(existing.coupon) : null;
  return NextResponse.json({
    code,
    clicks: existing.clicks,
    unlocked: existing.unlocked,
    coupon: existing.coupon,
    couponDiscount: coupon ? coupon.discount : null,
  });
}
