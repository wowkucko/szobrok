import { NextRequest, NextResponse } from "next/server";
import {
  listBlogSources,
  addBlogSource,
  deleteBlogSource,
  listBlogPosts,
} from "@/lib/db";
import { syncSource, cancelSync } from "@/lib/blogSync";

/** Források + statisztika. */
export async function GET() {
  const sources = listBlogSources();
  const posts = listBlogPosts(1, 0);
  return NextResponse.json({ sources, postCount: posts.total });
}

/** Új forrás felvétele + a szinkron háttérben elindul (nem várakoztatja a kérést). */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { username?: unknown }
    | null;

  if (!body || typeof body.username !== "string" || !body.username.trim()) {
    return NextResponse.json({ error: "Add meg a Cults3D felhasználónevet." }, { status: 400 });
  }

  const username = body.username.trim();
  addBlogSource(username);

  // Háttérfolyamat: a kérés azonnal visszatér, a letöltés a szerveren folytatódik.
  void syncSource(username).catch((err) =>
    console.error(`[blog] ${username} háttérszinkron hiba:`, err)
  );

  return NextResponse.json({ ok: true, username, started: true });
}

/** Forrás eltávolítása (a futó szinkron leáll, a bejegyzések kaszkád törlődnek). */
export async function DELETE(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "Hiányzó felhasználónév." }, { status: 400 });
  }
  cancelSync(username);
  deleteBlogSource(username);
  return NextResponse.json({ ok: true });
}
