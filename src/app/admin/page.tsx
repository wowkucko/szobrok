import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Database, ImageOff, Plus, Rss } from "lucide-react";
import {
  getCategoryOptions,
  getFeedProductIds,
  getPriceRange,
  getProducts,
  parseProductQuery,
  queryProducts,
  type ProductQuery,
} from "@/lib/db";
import { brokenFeedImages } from "@/lib/feedImages";
import AdminProductTable from "@/components/admin/AdminProductTable";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Mindig a jelenlegi adatbázis-állapotot mutassa (a szűrők is URL-paraméterek)
export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // A szűrés/rendezés a URL-ből jön — megosztható, visszaállítható link
  const filters: ProductQuery = parseProductQuery(await searchParams);

  // A feed-kép ellenőrzés és a számláló az ÖSSZES termékre vonatkozik,
  // függetlenül az aktív szűrőktől
  const allProducts = getProducts();
  const feedProductIds = getFeedProductIds();
  const feedIdSet = new Set(feedProductIds);
  const priceRange = getPriceRange();
  const categoryOptions = getCategoryOptions();

  const { products, total, filtered, page, pageCount } = queryProducts(filters);

  // A feedben szereplő termékek képeinek ellenőrzése (a feedben megjelenő
  // URL-ek létező fájlra mutatnak-e).
  const feedImageErrors: Record<string, string[]> = {};
  let brokenImageCount = 0;
  for (const product of allProducts) {
    if (!feedIdSet.has(product.id)) continue;
    const errors = brokenFeedImages(product);
    if (errors.length > 0) {
      feedImageErrors[product.id] = errors;
      brokenImageCount += errors.length;
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/60 bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.08),transparent_60%)]">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-amber-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Vissza a főoldalra
          </Link>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <Database className="h-7 w-7 text-amber-500" />
              Termék adatbázis
            </h1>
            <Link
              href="/admin/products/new"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-amber-600 px-5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500"
            >
              <Plus className="h-4 w-4" />
              Új termék
            </Link>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            {total} termék a SQLite adatbázisban (data/artisanprints.db).
            Szerkesztéshez kattints a <span className="text-amber-500">Szerkesztés</span>{" "}
            gombra, új terméket a <span className="text-amber-500">Új termék</span>{" "}
            gombbal adhatsz hozzá — a nyilvános oldalak legfeljebb 1 percen
            belül frissülnek. A szűrés, a rendezés és a lapozás a címsorban
            (URL) tárolódik, így megosztható; a lista oldalanként 25 terméket
            mutat.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href="/feed/products.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-amber-600/60 hover:text-amber-500"
            >
              <Rss className="h-3.5 w-3.5 text-amber-500" />
              XML feed: /feed/products.xml
              <span className="text-zinc-600">
                ({feedIdSet.size} termék a feedben)
              </span>
            </a>
            {brokenImageCount > 0 && (
              <span
                title="A feedben nem létező képre mutató hivatkozások találhatók — a terméknél a piros jelvény mutatja őket."
                className="inline-flex items-center gap-2 rounded-full border border-red-600/50 bg-red-600/10 px-4 py-2 text-xs font-medium text-red-400"
              >
                <ImageOff className="h-3.5 w-3.5" />
                {brokenImageCount} hibás képhivatkozás a feedben
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <AdminProductTable
          products={products}
          total={total}
          filtered={filtered}
          page={page}
          pageCount={pageCount}
          feedIds={feedProductIds}
          feedImageErrors={feedImageErrors}
          filters={filters}
          priceRange={priceRange}
          categoryOptions={categoryOptions}
        />

        <p className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-5 text-zinc-500">
          Figyelem: a <code className="text-zinc-300">npm run seed</code>{" "}
          futtatása felülírja az itt végzett módosításokat a JSON adatfájlokkal.
          A szerkesztéshez használd ezt az oldalt, vagy szerkeszd a JSON
          fájlokat és futtasd újra a seedet.
        </p>
      </main>
    </div>
  );
}
