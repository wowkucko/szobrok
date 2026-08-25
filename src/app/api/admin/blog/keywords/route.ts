import { NextRequest, NextResponse } from "next/server";
import {
  listBlogKeywords,
  addBlogKeyword,
  deleteBlogKeyword,
} from "@/lib/db";

/** Kulcsszavak listázása. */
export async function GET() {
  return NextResponse.json({ keywords: listBlogKeywords() });
}

/** Új kulcsszó. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { keyword?: unknown }
    | null;

  if (!body || typeof body.keyword !== "string" || !body.keyword.trim()) {
    return NextResponse.json({ error: "Add meg a kulcsszót." }, { status: 400 });
  }

  const keyword = addBlogKeyword(body.keyword.trim());
  return NextResponse.json({ ok: true, keyword });
}

/** Kulcsszó törlése. */
export async function DELETE(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("keyword");
  if (!keyword) {
    return NextResponse.json({ error: "Hiányzó kulcsszó." }, { status: 400 });
  }
  deleteBlogKeyword(keyword);
  return NextResponse.json({ ok: true });
}
