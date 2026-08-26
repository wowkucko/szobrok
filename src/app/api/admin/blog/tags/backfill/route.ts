import { NextResponse } from "next/server";
import { backfillBlogTags } from "@/lib/db";

/** Összes bejegyzés címkéinek újragenerálása a címekből. */
export async function POST() {
  const r = backfillBlogTags();
  return NextResponse.json(r);
}
