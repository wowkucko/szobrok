import { NextResponse } from "next/server";
import { listBlogPosts } from "@/lib/db";

const PER_PAGE_OPTIONS = [9, 12, 18, 24];

/** A blog listázó „továbbiak betöltése" (infinite scroll) végpontja.
 *  Ugyanazokat a szűrőket fogadja, mint az oldal URL-je (?q, ?tag, ?perPage). */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const perPage = PER_PAGE_OPTIONS.includes(Number(sp.get("perPage")))
    ? Number(sp.get("perPage"))
    : 9;
  const q = (sp.get("q") || "").trim();
  const tag = (sp.get("tag") || "").trim();
  const { total, posts } = listBlogPosts(
    perPage,
    (page - 1) * perPage,
    true,
    q || undefined,
    tag || undefined
  );
  return NextResponse.json({ total, posts, page });
}
