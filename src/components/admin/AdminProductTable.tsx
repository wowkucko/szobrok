"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FilterX,
  GripVertical,
  Search,
} from "lucide-react";
import type { Product, ProductCategory } from "@/types/product";
import type { ProductQuery, ProductQuerySort } from "@/lib/db";
import { formatPrice } from "@/lib/products";
import ProductAdminRow from "@/components/admin/ProductAdminRow";

// Az alapértelmezett kategóriák + a használatban lévő (dinamikusan bővülő)
// kategóriák a szűrő lenyílóhoz. A tényleges listát a szerver adja át.
const DEFAULT_CATEGORIES = ["Fantasy", "Sci-Fi", "Cyberpunk", "Horror", "Other"];

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
}: {
  label: string;
  sortKey: ProductQuerySort;
  active: boolean;
  dir: "asc" | "desc";
  onSort: (key: ProductQuerySort) => void;
}) {
  return (
    <th className="px-5 py-4 font-medium">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`group inline-flex items-center gap-1 uppercase tracking-wider transition-colors ${
          active ? "text-amber-500" : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
        )}
      </button>
    </th>
  );
}

/** Egyedi lenyíló a natív (OS-szintű, a sötét témához nem illő) nyíl helyett. */
function FilterSelect({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="h-9 appearance-none rounded-lg border border-zinc-800 bg-zinc-900 pl-3 pr-8 text-xs font-medium text-zinc-300 outline-none transition-colors focus:border-amber-600/60"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
    </div>
  );
}

// A number mezők natív fel/le nyilacskái (spin gombok) nem illenek a sötét
// témához — elrejtjük őket, az értéket gépelve/Enterrel adjuk meg.
const inputCls =
  "h-9 w-24 appearance-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs font-medium text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-600/60 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** Szöveges bevitel → érvényes nemnegatív szám (Ft), vagy üres.
 *  Fontos: a Number("") értéke 0 — az üres mezőt undefined-ként kell
 *  kezelni, különben pl. üres „Ár max" → max=0, ami mindent kiszűr. */
function parsePriceInput(raw: string): number | undefined {
  const cleaned = raw.trim();
  if (cleaned === "") return undefined;
  const n = Number(cleaned.replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

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

export default function AdminProductTable({
  products,
  total,
  filtered,
  page,
  pageCount,
  feedIds,
  feedImageErrors,
  filters,
  priceRange,
  categoryOptions,
  basePath = "/admin",
}: {
  /** A szerveroldali szűrés/rendezés eredménye (az aktuális oldalra vágva). */
  products: Product[];
  /** Az összes termék száma (a szűrőktől függetlenül). */
  total: number;
  /** A szűrőknek megfelelő termékek száma (a lapozás előtt). */
  filtered: number;
  /** Aktuális oldal (1-alapú). */
  page: number;
  pageCount: number;
  feedIds: string[];
  feedImageErrors: Record<string, string[]>;
  filters: ProductQuery;
  /** A teljes készlet ártartománya (min–max Ft) az árszűrő mezők mellett. */
  priceRange?: { min: number; max: number } | null;
  /** A használatban lévő kategóriák (a szűrő lenyíló javaslatai). */
  categoryOptions: string[];
  /** Hova írja a szűrőket URL-paraméterként (alap: az admin lista). */
  basePath?: string;
}) {
  const router = useRouter();

  // Drag&drop átrendezéshez a látható sorok helyi sorrendje. A szerver
  // (router.refresh) után szinkronizáljuk a propokkal — a húzás közben
  // viszont a helyi állapot adja a sorrendet (a „derived state" minta).
  const [localProducts, setLocalProducts] = useState(products);
  const [prevProducts, setPrevProducts] = useState(products);
  if (products !== prevProducts) {
    setPrevProducts(products);
    setLocalProducts(products);
  }
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // A húzás csak az alap nézetben engedett (nincs szűrő/rendezés, 1. oldal),
  // hogy a húzott blokk mindig a globális sorrend elején legyen.
  const dragEnabled =
    page === 1 &&
    !filters.q?.trim() &&
    (!filters.category || filters.category === "all") &&
    (!filters.available || filters.available === "all") &&
    (!filters.featured || filters.featured === "all") &&
    (!filters.inFeed || filters.inFeed === "all") &&
    filters.minPrice === undefined &&
    filters.maxPrice === undefined &&
    (filters.sort === undefined || filters.sort === "sortOrder");

  const persistOrder = async (ids: string[]) => {
    try {
      const res = await fetch("/api/admin/products/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("reorder failed");
      router.refresh();
    } catch {
      // Hiba esetén a szerveri sorrendhez térünk vissza
      setLocalProducts(products);
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
    setOverId(null);
  };

  const handleDragOver = (id: string) => {
    if (id !== draggedId) setOverId(id);
  };

  const handleDropRow = async (targetId: string) => {
    const fromId = draggedId;
    setDraggedId(null);
    setOverId(null);
    if (!fromId || fromId === targetId) return;
    const ids = localProducts.map((p) => p.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const nextIds = [...ids];
    const [moved] = nextIds.splice(from, 1);
    nextIds.splice(to, 0, moved);
    setLocalProducts(
      nextIds
        .map((id) => localProducts.find((p) => p.id === id))
        .filter((p): p is Product => p !== undefined)
    );
    await persistOrder(nextIds);
  };

  // Helyi piszkozatok a szöveges/érték mezőkhöz — a navigáció (Enter) után
  // kerülnek a URL-be. Ha a URL kívülről változik (vissza-gomb, megosztott
  // link), a következő renderen kövessük a mezőkben is (React ajánlott minta).
  const [drafts, setDrafts] = useState({
    q: filters.q ?? "",
    min: filters.minPrice?.toString() ?? "",
    max: filters.maxPrice?.toString() ?? "",
  });
  const [applied, setApplied] = useState({
    q: filters.q ?? "",
    min: filters.minPrice?.toString() ?? "",
    max: filters.maxPrice?.toString() ?? "",
  });
  const current = {
    q: filters.q ?? "",
    min: filters.minPrice?.toString() ?? "",
    max: filters.maxPrice?.toString() ?? "",
  };
  if (
    applied.q !== current.q ||
    applied.min !== current.min ||
    applied.max !== current.max
  ) {
    setApplied(current);
    setDrafts(current);
  }

  // Szűrő/rendezés változás → vissza az első oldalra (a lapozás önmagában nem)
  const FILTER_KEYS: Array<keyof ProductQuery> = [
    "q",
    "category",
    "available",
    "featured",
    "inFeed",
    "minPrice",
    "maxPrice",
    "sort",
    "dir",
  ];

  /** Az aktív szűrők + a változtatás URL-be írása (szerveroldali újrarenderelés). */
  const navigate = (patch: Partial<ProductQuery>) => {
    const next: ProductQuery = { ...filters, ...patch };
    if (FILTER_KEYS.some((k) => patch[k] !== undefined)) {
      next.page = 1;
    }
    const sp = new URLSearchParams();
    if (next.q?.trim()) sp.set("q", next.q.trim());
    if (next.category && next.category !== "all") sp.set("category", next.category);
    if (next.available && next.available !== "all") sp.set("available", next.available);
    if (next.featured && next.featured !== "all") sp.set("featured", next.featured);
    if (next.inFeed && next.inFeed !== "all") sp.set("feed", next.inFeed);
    if (next.minPrice !== undefined) sp.set("min", String(next.minPrice));
    if (next.maxPrice !== undefined) sp.set("max", String(next.maxPrice));
    if (next.sort && next.sort !== "createdAt") sp.set("sort", next.sort);
    if (next.dir && next.dir !== "desc") sp.set("dir", next.dir);
    if (next.page && next.page > 1) sp.set("page", String(next.page));
    const qs = sp.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };

  const toggleSort = (key: ProductQuerySort) => {
    if (filters.sort === key) {
      navigate({ dir: filters.dir === "asc" ? "desc" : "asc" });
    } else {
      navigate({
        sort: key,
        dir: key === "title" || key === "category" ? "asc" : "desc",
      });
    }
  };

  const hasFilters =
    !!filters.q?.trim() ||
    (filters.category && filters.category !== "all") ||
    (filters.available && filters.available !== "all") ||
    (filters.featured && filters.featured !== "all") ||
    (filters.inFeed && filters.inFeed !== "all") ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined;

  const resetFilters = () => router.replace(basePath, { scroll: false });

  const handlePriceChange = () => {
    // Az ár a rendezésbe is beleszámít — a szerver-oldali adatok újratöltése
    router.refresh();
  };

  return (
    <div>
      {/* Szűrősáv — a változtatások URL-paraméterként tárolódnak */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ q: drafts.q });
          }}
          className="relative"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            type="text"
            value={drafts.q}
            onChange={(e) => setDrafts((d) => ({ ...d, q: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Escape" && drafts.q) {
                setDrafts((d) => ({ ...d, q: "" }));
                navigate({ q: "" });
              }
            }}
            placeholder="Keresés cím, kategória vagy címke…"
            aria-label="Keresés cím, kategória vagy címke"
            className="h-9 w-64 rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-3 text-xs font-medium text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-600/60"
          />
        </form>
        <FilterSelect
          value={filters.category ?? "all"}
          onChange={(v) => navigate({ category: v as "all" | ProductCategory })}
          ariaLabel="Szűrés kategória szerint"
        >
          {["all", ...new Set([...DEFAULT_CATEGORIES, ...categoryOptions])].map(
            (c) => (
              <option key={c} value={c}>
                {c === "all" ? "Minden kategória" : c}
              </option>
            )
          )}
        </FilterSelect>
        {/* Összes termék / Csak aktív — a nem elérhető (elkelt) darabok az
            „Összes" nézetben a lista végére sorolódnak. */}
        <div
          role="group"
          aria-label="Szűrés elérhetőség szerint"
          className="inline-flex h-9 items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900 p-0.5"
        >
          <button
            type="button"
            onClick={() => navigate({ available: "all" })}
            aria-pressed={!filters.available || filters.available === "all"}
            className={`h-7 rounded-md px-3 text-xs font-medium transition-colors ${
              !filters.available || filters.available === "all"
                ? "bg-amber-600 text-zinc-950"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Összes termék
          </button>
          <button
            type="button"
            onClick={() => navigate({ available: "yes" })}
            aria-pressed={filters.available === "yes"}
            className={`h-7 rounded-md px-3 text-xs font-medium transition-colors ${
              filters.available === "yes"
                ? "bg-amber-600 text-zinc-950"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Csak aktív termékek
          </button>
        </div>
        <FilterSelect
          value={filters.featured ?? "all"}
          onChange={(v) => navigate({ featured: v as "all" | "yes" | "no" })}
          ariaLabel="Szűrés kiemeltség szerint"
        >
          <option value="all">Kiemelt: mindegy</option>
          <option value="yes">Kiemelt: igen</option>
          <option value="no">Kiemelt: nem</option>
        </FilterSelect>
        <FilterSelect
          value={filters.inFeed ?? "all"}
          onChange={(v) => navigate({ inFeed: v as "all" | "yes" | "no" })}
          ariaLabel="Szűrés feed szerint"
        >
          <option value="all">XML feed: mindegy</option>
          <option value="yes">XML feed: benne</option>
          <option value="no">XML feed: nincs benne</option>
        </FilterSelect>

        {/* Ártartomány-szűrő — Enterrel vagy az Alkalmaz gombbal érvényesül.
            Fontos: két beviteli mező esetén a böngésző Enterre csak akkor
            küldi el az űrlapot, ha van benne submit gomb. */}
        <div className="flex flex-col gap-1">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({
              minPrice: parsePriceInput(drafts.min),
              maxPrice: parsePriceInput(drafts.max),
            });
          }}
          className="flex items-center gap-1.5"
          aria-label="Szűrés ár szerint"
        >
          <input
            type="number"
            min="0"
            step="100"
            value={drafts.min}
            onChange={(e) => setDrafts((d) => ({ ...d, min: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Escape" && drafts.min) {
                setDrafts((d) => ({ ...d, min: "" }));
                navigate({ minPrice: undefined });
              } else if (e.key === "Enter") {
                // Ne az implicit submissionre hagyatkozzunk — az Enter minden
                // böngészőben, megbízhatóan küldje el az űrlapot.
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ár min"
            aria-label="Ár minimum"
            title="Ár alsó határa (Ft) — Enterrel alkalmazódik"
            className={inputCls}
          />
          <span className="text-xs text-zinc-600">–</span>
          <input
            type="number"
            min="0"
            step="100"
            value={drafts.max}
            onChange={(e) => setDrafts((d) => ({ ...d, max: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Escape" && drafts.max) {
                setDrafts((d) => ({ ...d, max: "" }));
                navigate({ maxPrice: undefined });
              } else if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ár max"
            aria-label="Ár maximum"
            title="Ár felső határa (Ft) — Enterrel alkalmazódik"
            className={inputCls}
          />
          <button
            type="submit"
            aria-label="Ár szűrés alkalmazása"
            title="Ár szűrés alkalmazása (Enter)"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-amber-600/60 hover:text-amber-500"
          >
            <Check className="h-4 w-4" />
          </button>
        </form>
        {priceRange && (
          <span className="pl-1 text-[11px] leading-none text-zinc-600">
            Ártartomány: {formatPrice(priceRange.min, "HUF")} –{" "}
            {formatPrice(priceRange.max, "HUF")}
          </span>
        )}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-800 px-3 text-xs font-medium text-zinc-400 transition-colors hover:border-amber-600/60 hover:text-amber-500"
          >
            <FilterX className="h-3.5 w-3.5" />
            Szűrők törlése
          </button>
        )}
        <span className="ml-auto text-xs text-zinc-600">
          {filtered} / {total} termék
          {pageCount > 1 && (
            <span className="text-zinc-500"> · {page}. / {pageCount}. oldal</span>
          )}
        </span>
      </div>

      {dragEnabled && (
        <p className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
          <GripVertical className="h-4 w-4 text-amber-500" />
          Fogd meg a <span className="font-medium text-zinc-300">⋮⋮ fogantyút</span> és
          húzd a sorokat — ez a sorrend érvényes a portfólióban és a kiemelteknél is.
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40">
        <table className="w-full min-w-[820px] text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-zinc-500">
              <th className="w-10 px-4 py-4 font-medium">
                <span
                  title="A sorok sorrendje húzással módosítható — ez a portfólió és a kiemeltek sorrendje is."
                  className="flex items-center justify-center"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
              </th>
              <th className="px-5 py-4 font-medium">Kép</th>
              <SortHeader
                label="Termék"
                sortKey="title"
                active={filters.sort === "title"}
                dir={filters.dir ?? "desc"}
                onSort={toggleSort}
              />
              <SortHeader
                label="Ár"
                sortKey="price"
                active={filters.sort === "price"}
                dir={filters.dir ?? "desc"}
                onSort={toggleSort}
              />
              <SortHeader
                label="Kiemelt"
                sortKey="featured"
                active={filters.sort === "featured"}
                dir={filters.dir ?? "desc"}
                onSort={toggleSort}
              />
              <SortHeader
                label="Elérhető"
                sortKey="isAvailable"
                active={filters.sort === "isAvailable"}
                dir={filters.dir ?? "desc"}
                onSort={toggleSort}
              />
              <SortHeader
                label="Feltöltve"
                sortKey="createdAt"
                active={filters.sort === "createdAt" || !filters.sort}
                dir={filters.dir ?? "desc"}
                onSort={toggleSort}
              />
              <th className="px-5 py-4 font-medium">Műveletek</th>
            </tr>
          </thead>
          <tbody>
            {localProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-zinc-500">
                  Nincs a szűrőknek megfelelő termék.
                </td>
              </tr>
            ) : (
              localProducts.map((product) => (
                <ProductAdminRow
                  key={product.id}
                  product={product}
                  inFeed={feedIds.includes(product.id)}
                  feedImageErrors={feedImageErrors[product.id]}
                  onPriceChange={handlePriceChange}
                  dragEnabled={dragEnabled}
                  isDragging={draggedId === product.id}
                  isDragOver={overId === product.id && draggedId !== product.id}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDropRow={handleDropRow}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setOverId(null);
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Lapozás — oldalanként 25 termék, a page= paraméter a URL-ben */}
      {pageCount > 1 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-600">
            {filtered} termék összesen, oldalanként 25.
          </p>
          <nav
            className="flex items-center gap-1"
            aria-label="Lapozás"
          >
            <button
              type="button"
              onClick={() => navigate({ page: page - 1 })}
              disabled={page <= 1}
              aria-label="Előző oldal"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-amber-600/60 hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-zinc-800 disabled:hover:text-zinc-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageWindow(page, pageCount).map((p, i) =>
              p === "…" ? (
                <span key={`gap-${i}`} className="px-1 text-xs text-zinc-600">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => navigate({ page: p })}
                  aria-current={p === page ? "page" : undefined}
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors ${
                    p === page
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
              onClick={() => navigate({ page: page + 1 })}
              disabled={page >= pageCount}
              aria-label="Következő oldal"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-amber-600/60 hover:text-amber-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-zinc-800 disabled:hover:text-zinc-400"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
