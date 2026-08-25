import { NextRequest, NextResponse } from "next/server";
import { listBlogPosts, deleteBlogPost, listUntranslatedPosts } from "@/lib/db";

/** Bejegyzések listázása (lapozható). */
export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? 0);
  const { total, posts } = listBlogPosts(
    Number.isFinite(limit) ? limit : 50,
    Number.isFinite(offset) ? offset : 0
  );
  return NextResponse.json({ total, posts, untranslated: listUntranslatedPosts().length });
}

/** Bejegyzés törlése. */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Hiányzó azonosító." }, { status: 400 });
  }
  deleteBlogPost(id);
  return NextResponse.json({ ok: true });
}
