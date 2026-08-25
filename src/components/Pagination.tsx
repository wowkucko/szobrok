import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Oldalszám-gombok ablakos megjelenítéssel (első/utolsó + a környezet).
 *  A portfólió oldalon használt logika újrahasznosítása. */
function pageWindow(current: number, count: number): Array<number | "…"> {
  if (count <= 7) {
    return Array.from({ length: count }, (_, i) => i + 1);
  }
  const nums = [...new Set([1, count, current - 1, current, current + 1])]
    .filter((n) => n >= 1 && n <= count)
    .sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  let prev = 0;
  for (const n of nums) {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

export default function Pagination({
  page,
  pageCount,
  buildHref,
  total,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
  total?: number;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-zinc-500">
        {total !== undefined ? `${total} bejegyzés · ` : ""}
        {page}. / {pageCount}. oldal
      </p>
      <nav className="flex items-center gap-1.5" aria-label="Lapozás">
        <Link
          href={buildHref(page - 1)}
          aria-label="Előző oldal"
          aria-disabled={page <= 1}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-amber-600/60 hover:text-amber-500 ${
            page <= 1 ? "pointer-events-none opacity-30" : ""
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        {pageWindow(page, pageCount).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-zinc-600">
              …
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(p)}
              aria-current={p === page ? "page" : undefined}
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium transition-colors ${
                p === page
                  ? "border-amber-600 bg-amber-600 text-zinc-950"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-amber-600/60 hover:text-amber-500"
              }`}
            >
              {p}
            </Link>
          )
        )}
        <Link
          href={buildHref(page + 1)}
          aria-label="Következő oldal"
          aria-disabled={page >= pageCount}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-amber-600/60 hover:text-amber-500 ${
            page >= pageCount ? "pointer-events-none opacity-30" : ""
          }`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </nav>
    </div>
  );
}
