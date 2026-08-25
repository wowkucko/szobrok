import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Pagination from "@/components/Pagination";
import BlogControls from "@/components/BlogControls";
import { listBlogPosts } from "@/lib/db";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const PER_PAGE_OPTIONS = [9, 12, 18, 24];
const DEFAULT_PER = 9;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const req = Math.max(1, Number(sp.page) || 1);
  return {
    title: `Blog | ${SITE_NAME}`,
    description:
      "3D nyomtatott, kézzel festett szobrok és gyűjtői figurák inspirációi, tervezői bemutatók és kedvezmények a műhely blogján.",
    alternates: { canonical: req <= 1 ? "/blog" : `/blog?page=${req}` },
  };
}

export const dynamic = "force-dynamic";

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requestedPage = Math.max(1, Number(params.page) || 1);
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const pageSize = PER_PAGE_OPTIONS.includes(Number(params.perPage))
    ? Number(params.perPage)
    : DEFAULT_PER;

  const first = listBlogPosts(pageSize, (requestedPage - 1) * pageSize, true, search || undefined);
  const pageCount = Math.max(1, Math.ceil(first.total / pageSize));
  const safePage = Math.min(requestedPage, pageCount);
  const { total, posts } =
    safePage === requestedPage
      ? first
      : listBlogPosts(pageSize, (safePage - 1) * pageSize, true, search || undefined);

  const buildHref = (p: number) => {
    const sp = new URLSearchParams();
    if (p > 1) sp.set("page", String(p));
    if (search) sp.set("q", search);
    if (pageSize !== DEFAULT_PER) sp.set("perPage", String(pageSize));
    const s = sp.toString();
    return s ? `/blog?${s}` : "/blog";
  };
  const prevHref = safePage > 1 ? buildHref(safePage - 1) : null;
  const nextHref = safePage < pageCount ? buildHref(safePage + 1) : null;

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: posts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/blog/${p.slug}`,
      name: p.title,
    })),
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-100">
      {prevHref && <link rel="prev" href={prevHref} />}
      {nextHref && <link rel="next" href={nextHref} />}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Navbar />
      <main className="flex-1">
        <header className="border-b border-zinc-800/60 bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.08),transparent_60%)]">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <p className="text-sm font-medium uppercase tracking-widest text-amber-500">
              Műhely blog
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              Írások, tervezők, inspiráció
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
              A 3D nyomtatott művészet és a kézzel festett szobrok világa — a
              legjobb Cults3D alkotók modelljei, magyarul, gyűjtői szemmel.
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-8">
            <Suspense fallback={null}>
              <BlogControls perPageOptions={PER_PAGE_OPTIONS} />
            </Suspense>
            {search && total > 0 && (
              <p className="mt-3 text-sm text-zinc-500">
                {total} találat a „{search}” kifejezésre.
              </p>
            )}
          </div>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 py-20 text-center">
              <FileText className="h-10 w-10 text-zinc-700" />
              <p className="mt-4 text-sm text-zinc-500">
                {search
                  ? `Nincs találat a „${search}” keresésre.`
                  : "Még nincsenek bejegyzések. Hamarosan érkeznek az első írások."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
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
                          {post.source} ·{" "}
                          {new Date(post.createdAt).toLocaleDateString("hu-HU")}
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

              <Pagination
                page={safePage}
                pageCount={pageCount}
                total={total}
                buildHref={buildHref}
              />
            </>
          )}
        </div>
      </main>
      <Footer showNewsletter={false} />
    </div>
  );
}
