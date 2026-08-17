"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Heart, SearchX } from "lucide-react";
import ProductCard from "./ProductCard";
import ProductFilters from "./ProductFilters";
import type { SizeFilterOption } from "./ProductFilters";
import { useBookmarks } from "@/lib/useBookmarks";
import type { Product } from "@/types/product";
import { SIZE_RANGES, normalizeText, type SortOption } from "@/lib/products";
import {
  DEFAULT_PORTFOLIO_FILTERS,
  serializePortfolioFilters,
  type PortfolioFilters,
} from "@/lib/portfolioFilters";

interface ProductGalleryProps {
  products: Product[];
  tagOptions: string[];
  scaleOptions: string[];
  /** Az URL-ből (searchParams) értelmezett szűrőállapot — a szűrők az URL-ben élnek. */
  initialFilters: PortfolioFilters;
}

const SIZE_OPTIONS: SizeFilterOption[] = SIZE_RANGES.map((r) => ({
  value: r.value,
  label: r.label,
  hint: r.hint,
}));

/** Hány termék jelenik meg egy portfólió-oldalon. */
const PAGE_SIZE = 12;

/** Oldalszám-gombok ablakos megjelenítéssel (első/utolsó + a környezet). */
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

export default function ProductGallery({
  products,
  tagOptions,
  scaleOptions,
  initialFilters,
}: ProductGalleryProps) {
  const router = useRouter();
  const { bookmarks, toggleBookmark, isBookmarked } = useBookmarks();
  const listRef = useRef<HTMLDivElement>(null);

  // Helyi, nem-URL-beli állapotok
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Az azonnal érvényesülő szűrők (címkék, méret, méretarány, rendezés,
  // elérhetőség) közvetlenül az URL-ből (props) jönnek.

  // Szöveges mezők (keresés, ár): helyi piszkozatok — gépelés közben a lista
  // élőben szűr, az URL csak rövid késleltetéssel (debounce) frissül, hogy a
  // gépelés ne szakadjon meg újrarenderelésekkel.
  const [drafts, setDrafts] = useState({
    query: initialFilters.query,
    min: initialFilters.priceMin,
    max: initialFilters.priceMax,
  });
  const [applied, setApplied] = useState({
    query: initialFilters.query,
    min: initialFilters.priceMin,
    max: initialFilters.priceMax,
  });
  // Ha az URL kívülről változott (vissza-gomb, megosztott link), kövessük a
  // piszkozatokat is — ugyanaz a „derived state" minta, mint az admin táblánál.
  const currentFromUrl = {
    query: initialFilters.query,
    min: initialFilters.priceMin,
    max: initialFilters.priceMax,
  };
  if (
    applied.query !== currentFromUrl.query ||
    applied.min !== currentFromUrl.min ||
    applied.max !== currentFromUrl.max
  ) {
    setApplied(currentFromUrl);
    setDrafts(currentFromUrl);
  }

  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writeUrl = (f: PortfolioFilters) => {
    const qs = serializePortfolioFilters(f);
    router.replace(
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
      { scroll: false }
    );
  };
  const scheduleUrlWrite = (f: PortfolioFilters) => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => writeUrl(f), 350);
  };
  useEffect(() => {
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, []);

  /** A teljes szűrőállapot a piszkozatokkal együtt (URL-be íráshoz). */
  const currentFilters = (): PortfolioFilters => ({
    query: drafts.query,
    selectedTags: initialFilters.selectedTags,
    priceMin: drafts.min,
    priceMax: drafts.max,
    selectedSizes: initialFilters.selectedSizes,
    selectedScales: initialFilters.selectedScales,
    sort: initialFilters.sort,
    availableOnly: initialFilters.availableOnly,
    page: initialFilters.page,
  });

  // Az URL-ből jövő, azonnal érvényesülő szűrők
  const { selectedTags, selectedSizes, selectedScales, sort, availableOnly } =
    initialFilters;

  // --- Szűrő-műveletek: azonnali változtatásnál rögtön az URL-be írunk, és
  // mindig visszaugrunk az 1. oldalra (a lapozás önmagában nem). ---

  const writeFilters = (patch: Partial<PortfolioFilters>) => {
    writeUrl({ ...currentFilters(), ...patch, page: 1 });
  };

  const toggleTag = (tag: string) => {
    const nextTags =
      tag === "__all__"
        ? []
        : selectedTags.includes(tag)
          ? selectedTags.filter((t) => t !== tag)
          : [...selectedTags, tag];
    writeFilters({ selectedTags: nextTags });
  };

  const toggleInList = (
    value: string,
    list: string[],
    field: "selectedSizes" | "selectedScales"
  ) => {
    const next = list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
    writeFilters({ [field]: next });
  };

  const changeSort = (value: SortOption) => writeFilters({ sort: value });

  const changeAvailable = (v: boolean) => writeFilters({ availableOnly: v });

  /** Lapozás — megtartja a szűrőket, csak a page paramétert írja, és a lista
   *  tetejére görget. */
  const changePage = (p: number) => {
    writeUrl({ ...currentFilters(), page: p });
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetFilters = () => {
    setDrafts({ query: "", min: "", max: "" });
    writeUrl({ ...DEFAULT_PORTFOLIO_FILTERS });
    setFavoritesOnly(false);
  };

  // Szöveges piszkozatok URL-írása is 1. oldalra ugrik
  const scheduleFilterWrite = (patch: Partial<PortfolioFilters>) => {
    scheduleUrlWrite({ ...currentFilters(), ...patch, page: 1 });
  };

  const activeCount =
    (drafts.query.trim() ? 1 : 0) +
    selectedTags.length +
    (drafts.min || drafts.max ? 1 : 0) +
    selectedSizes.length +
    selectedScales.length +
    (favoritesOnly ? 1 : 0) +
    (availableOnly ? 1 : 0) +
    (sort !== "custom" ? 1 : 0);

  const filtered = useMemo(() => {
    const q = normalizeText(drafts.query.trim());
    const min = drafts.min ? Number(drafts.min) : null;
    const max = drafts.max ? Number(drafts.max) : null;

    let list = products.filter((p) => {
      // „Csak aktív termékek" nézetben az elkelt darabok kimaradnak;
      // „Összes termék" nézetben a végére sorolódnak (lásd a rendezést).
      if (availableOnly && !p.isAvailable) return false;

      // Keresés: név, leírás, címkék, kategória
      if (q) {
        const haystack = normalizeText(
          `${p.title} ${p.shortDescription} ${p.category} ${p.tags.join(" ")}`
        );
        if (!haystack.includes(q)) return false;
      }

      // Címkék — a kiválasztottak MINDEGYIKÉNEK szerepelnie kell.
      // A kategória is egyezésnek számít (a ?tag=Fantasy URL így kategória-
      // szűrőként is működik, akkor is, ha a kategória nincs a címkék között).
      if (
        selectedTags.length > 0 &&
        !selectedTags.every(
          (tag) => p.tags.includes(tag) || p.category === tag
        )
      ) {
        return false;
      }

      // Ár
      if (min !== null && p.price < min) return false;
      if (max !== null && p.price > max) return false;

      // Méret kategória
      if (selectedSizes.length > 0) {
        const sizeOk = selectedSizes.some((value) => {
          const range = SIZE_RANGES.find((r) => r.value === value);
          if (!range) return false;
          return p.dimensions.heightCm >= range.min && p.dimensions.heightCm <= range.max;
        });
        if (!sizeOk) return false;
      }

      // Méretarány
      if (
        selectedScales.length > 0 &&
        (!p.dimensions.scale || !selectedScales.includes(p.dimensions.scale))
      ) {
        return false;
      }

      // Csak kedvencek
      if (favoritesOnly && !bookmarks.includes(p.id)) return false;

      return true;
    });

    // Rendezés — az „Összes termék" nézetben az elkelt darabok MINDIG a
    // lista végére kerülnek, a választott rendezés csak a csoportokon belül érvényes.
    list = [...list].sort((a, b) => {
      if (!availableOnly && a.isAvailable !== b.isAvailable) {
        return a.isAvailable ? -1 : 1;
      }
      switch (sort) {
        case "custom":
          // Az „Ajánlott sorrend": a termékek a táblázatban drag&droppal
          // állított sorrendben jelennek meg (a propok már abban a sorrendben
          // érkeznek). A stabil sort 0-val megtartja az eredeti sorrendet.
          return 0;
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "size-asc":
          return a.dimensions.heightCm - b.dimensions.heightCm;
        case "size-desc":
          return b.dimensions.heightCm - a.dimensions.heightCm;
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return list;
  }, [
    products,
    drafts.query,
    drafts.min,
    drafts.max,
    selectedTags,
    selectedSizes,
    selectedScales,
    sort,
    availableOnly,
    favoritesOnly,
    bookmarks,
  ]);

  const hasActiveFilters = activeCount > 0;

  // Lapozás: a szűrt/rendezett listát oldalakra vágjuk. A túl nagy oldalszám
  // (pl. szűrés szűkítése közben) az utolsó oldalra van vágva a megjelenítéshez.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, initialFilters.page), pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm text-zinc-400">
          <span className="font-semibold text-zinc-100">{filtered.length}</span>{" "}
          / {products.length} alkotás
        </p>

        <button
          type="button"
          onClick={() => setFavoritesOnly((v) => !v)}
          aria-pressed={favoritesOnly}
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
            favoritesOnly
              ? "border-amber-600 bg-amber-600/15 text-amber-500"
              : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
          }`}
        >
          <Heart
            className="h-3.5 w-3.5"
            fill={favoritesOnly ? "currentColor" : "none"}
          />
          Kedvencek ({bookmarks.length})
        </button>
      </div>

      <div className="mt-4">
        <ProductFilters
          tagOptions={tagOptions}
          query={drafts.query}
          onQueryChange={(v) => {
            setDrafts((d) => ({ ...d, query: v }));
            scheduleFilterWrite({ query: v });
          }}
          sort={sort}
          onSortChange={changeSort}
          availableOnly={availableOnly}
          onAvailableOnlyChange={changeAvailable}
          selectedTags={selectedTags}
          onToggleTag={toggleTag}
          priceMin={drafts.min}
          priceMax={drafts.max}
          onPriceChange={(min, max) => {
            setDrafts((d) => ({ ...d, min, max }));
            scheduleFilterWrite({ priceMin: min, priceMax: max });
          }}
          sizeOptions={SIZE_OPTIONS}
          selectedSizes={selectedSizes}
          onToggleSize={(v) => toggleInList(v, selectedSizes, "selectedSizes")}
          scaleOptions={scaleOptions}
          selectedScales={selectedScales}
          onToggleScale={(v) => toggleInList(v, selectedScales, "selectedScales")}
          activeCount={activeCount}
          onReset={resetFilters}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((v) => !v)}
        />
      </div>

      {filtered.length > 0 ? (
        <>
          <div
            ref={listRef}
            className="mt-8 grid scroll-mt-24 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {visible.map((product: Product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                isBookmarked={isBookmarked(product.id)}
                onToggleBookmark={toggleBookmark}
                onTagClick={toggleTag}
                // Az első kártya az LCP-elem: a képe preload-olódik
                priority={index === 0}
              />
            ))}
          </div>

          {/* Lapozás — a page= paraméter az URL-ben, a szűrőket megtartja */}
          {pageCount > 1 && (
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-zinc-500">
                {filtered.length} termék · {safePage}. / {pageCount}. oldal
              </p>
              <nav className="flex items-center gap-1.5" aria-label="Lapozás">
                <button
                  type="button"
                  onClick={() => changePage(safePage - 1)}
                  disabled={safePage <= 1}
                  aria-label="Előző oldal"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-amber-600/60 hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-zinc-800 disabled:hover:text-zinc-400"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {pageWindow(safePage, pageCount).map((p, i) =>
                  p === "…" ? (
                    <span key={`gap-${i}`} className="px-1 text-sm text-zinc-600">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => changePage(p)}
                      aria-current={p === safePage ? "page" : undefined}
                      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium transition-colors ${
                        p === safePage
                          ? "border-amber-600 bg-amber-600 text-zinc-950"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-amber-600/60 hover:text-amber-500"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => changePage(safePage + 1)}
                  disabled={safePage >= pageCount}
                  aria-label="Következő oldal"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-amber-600/60 hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-zinc-800 disabled:hover:text-zinc-400"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </nav>
            </div>
          )}
        </>
      ) : (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 px-6 py-20 text-center">
          <SearchX className="h-10 w-10 text-zinc-600" />
          <h3 className="mt-4 text-lg font-semibold text-zinc-200">
            Nem található a szűrésnek megfelelő szobor
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
            Próbáld meg törölni a szűrőket, vagy módosítsd a keresőszót!
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-6 inline-flex h-10 items-center rounded-full bg-amber-600 px-5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500"
            >
              Szűrők törlése
            </button>
          )}
        </div>
      )}
    </div>
  );
}
