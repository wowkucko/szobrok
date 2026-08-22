import { NextRequest, NextResponse } from "next/server";
import { getReferral, incrementReferralClick } from "@/lib/db";

/**
 * Kattintás rögzítése egy referral linken. Sütialapú deduplikáció:
 * ugyanaz a böngésző 1 éven belül csak egyszer számít.
 * A saját kódjára kattintást a kliens (ReferralTracker) nem hívja meg.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ error: "Hiányzó kód." }, { status: 400 });
  }
  const existing = getReferral(code);
  if (!existing) {
    return NextResponse.json({ error: "Érvénytelen kód." }, { status: 404 });
  }

  const cookieName = `ref_click_${code}`;
  const already = request.cookies.get(cookieName);
  const result = already ? existing : incrementReferralClick(code) ?? existing;

  const res = NextResponse.json({
    code,
    clicks: result.clicks,
    unlocked: result.unlocked,
    coupon: result.coupon,
  });

  if (!already) {
    res.cookies.set(cookieName, "1", {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }
  return res;
}
