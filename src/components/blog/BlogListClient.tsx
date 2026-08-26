"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import type { BlogPost } from "@/lib/db";
import { useIsMobile } from "@/lib/useIsMobile";

interface BlogListClientProps {
  initialPosts: BlogPost[];
  total: number;
  perPage: number;
  q: string;
  tag: string;
}

export default function BlogListClient({
  initialPosts,
  total,
  perPage,
  q,
  tag,
}: BlogListClientProps) {
  const isMobile = useIsMobile();
  const [items, setItems] = useState<BlogPost[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Új szűrés/lap (a szerver újrarenderel) → visszaállunk az első oldalra.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(initialPosts);
    setPage(1);
  }, [initialPosts]);

  const hasMore = items.length < total;

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const next = page + 1;
      const sp = new URLSearchParams();
      sp.set("page", String(next));
      sp.set("perPage", String(perPage));
      if (q) sp.set("q", q);
      if (tag) sp.set("tag", tag);
      const res = await fetch(`/api/blog?${sp.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as { posts: BlogPost[] };
      setItems((prev) => [...prev, ...data.posts]);
      setPage(next);
    } finally {
      setLoading(false);
    }
  }, [loading, page, perPage, q, tag]);

  // Mobilon: a láthatár aljára érve automatikusan betöltjük a következő oldalt.
  useEffect(() => {
    if (!isMobile || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isMobile, hasMore, loadMore]);

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((post) => (
          <article
            key={post.id}
            className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 transition-colors hover:border-amber-600/60"
          >
            <Link href={`/blog/${post.slug}`} className="flex flex-1 flex-col">
              <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
                {post.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.images[0]}
                    alt={post.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-700">
                    <FileText className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs text-zinc-500">
                  {post.source} · {new Date(post.createdAt).toLocaleDateString("hu-HU")}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-zinc-100 transition-colors group-hover:text-amber-500">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mt-2 line-clamp-3 text-sm text-zinc-400">
                    {post.excerpt}
                  </p>
                )}
                <span className="mt-auto pt-4 text-sm font-medium text-amber-500">
                  Olvasom →
                </span>
              </div>
            </Link>
          </article>
        ))}
      </div>

      {isMobile && hasMore && (
        <div ref={sentinelRef} className="mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex h-10 items-center rounded-full border border-amber-600/60 bg-amber-600/15 px-6 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-600/25 disabled:opacity-60"
          >
            {loading ? "Betöltés…" : "További bejegyzések"}
          </button>
        </div>
      )}
    </>
  );
}
