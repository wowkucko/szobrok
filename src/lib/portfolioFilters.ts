// A portfólió szűrői az URL-paraméterekben élnek (megosztható, visszaállítható),
// ugyanúgy, ahogy az admin táblázatnál. Ez a modul felel a két irányú
// átalakításért: URL (searchParams) <-> szűrőobjektum.

import type { SortOption } from "./products";

export interface PortfolioFilters {
  /** Keresőszöveg (cím, leírás, címkék, kategória). */
  query: string;
  /** Kiválasztott címkék (AND-szűrés). */
  selectedTags: string[];
  /** Ártartomány alsó határa, szövegként (üres = nincs korlát). */
  priceMin: string;
  /** Ártartomány felső határa, szövegként (üres = nincs korlát). */
  priceMax: string;
  /** Méret-kategóriák (mini / medium / large). */
  selectedSizes: string[];
  /** Méretarányok (pl. "1:6"). */
  selectedScales: string[];
  sort: SortOption;
  /** Csak az elérhető (megvásárolható) termékek mutatása. */
  availableOnly: boolean;
  /** 1-alapú oldalszám (lapozás). */
  page: number;
}

export const DEFAULT_PORTFOLIO_FILTERS: PortfolioFilters = {
  query: "",
  selectedTags: [],
  priceMin: "",
  priceMax: "",
  selectedSizes: [],
  selectedScales: [],
  sort: "custom",
  availableOnly: false,
  page: 1,
};

const SORTS: SortOption[] = [
  "custom",
  "newest",
  "price-asc",
  "price-desc",
  "size-asc",
  "size-desc",
];

/** Egyetlen searchParams érték stringgé (tömb esetén az első elem). */
function single(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : Array.isArray(v) ? v[0] ?? "" : "";
}

/** Vesszővel elválasztott lista (pl. ?tag=Fantasy,Horror). */
function list(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** URL (searchParams) -> szűrőobjektum. A paraméterek whitelistelt módon
 *  értelmeződnek: érvénytelen értékek a biztonságos alapértelmezésre esnek. */
export function parsePortfolioFilters(
  params: Record<string, string | string[] | undefined>
): PortfolioFilters {
  const q = single(params.q);
  const sortRaw = single(params.sort);
  const sort: SortOption = (SORTS as string[]).includes(sortRaw)
    ? (sortRaw as SortOption)
    : "custom";
  const rawPage = single(params.page);
  const pageNum = Number(rawPage);
  return {
    query: q,
    selectedTags: list(single(params.tag)),
    priceMin: single(params.min),
    priceMax: single(params.max),
    selectedSizes: list(single(params.size)),
    selectedScales: list(single(params.scale)),
    sort,
    availableOnly: single(params.availability) === "active",
    // 1-alapú pozitív egész — érvénytelen érték esetén 1
    page: Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1,
  };
}

/** Szűrőobjektum -> URL query string (üres, ha minden alapértelmezett). */
export function serializePortfolioFilters(f: PortfolioFilters): string {
  const sp = new URLSearchParams();
  const q = f.query.trim();
  if (q) sp.set("q", q);
  if (f.selectedTags.length) sp.set("tag", f.selectedTags.join(","));
  if (f.priceMin) sp.set("min", f.priceMin);
  if (f.priceMax) sp.set("max", f.priceMax);
  if (f.selectedSizes.length) sp.set("size", f.selectedSizes.join(","));
  if (f.selectedScales.length) sp.set("scale", f.selectedScales.join(","));
  if (f.sort !== "custom") sp.set("sort", f.sort);
  if (f.availableOnly) sp.set("availability", "active");
  if (f.page > 1) sp.set("page", String(f.page));
  return sp.toString();
}
