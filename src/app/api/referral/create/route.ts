import { NextResponse } from "next/server";
import { createReferral } from "@/lib/db";

/** Új referral kód generálása (a látogató saját megosztó linkjéhez). */
export async function POST() {
  const { code } = createReferral();
  return NextResponse.json({ code });
}
