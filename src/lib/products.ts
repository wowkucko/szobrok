import type { Product } from "@/types/product";

// ---------------------------------------------------------------------------
// Rendezési opciók
// ---------------------------------------------------------------------------

export type SortOption =
  | "custom" // Saját (táblázatban drag&droppal állított) sorrend — alapértelmezett
  | "newest" // Legújabb elöl
  | "price-asc"
  | "price-desc"
  | "size-asc"
  | "size-desc";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "custom", label: "Ajánlott sorrend" },
  { value: "newest", label: "Legújabb elöl" },
  { value: "price-asc", label: "Ár: növekvő" },
  { value: "price-desc", label: "Ár: csökkenő" },
  { value: "size-asc", label: "Méret: növekvő" },
  { value: "size-desc", label: "Méret: csökkenő" },
];

// ---------------------------------------------------------------------------
// Méret kategóriák (checkbox szűrőhöz) — DINAMIKUSAN a termékek tényleges
// magasságából számolva, hogy minden szobor mindig valamelyik sávba essen
// (pl. egy 58 cm-es darab se maradjon szűrő nélkül).
// ---------------------------------------------------------------------------

export interface SizeRange {
  value: string;
  label: string;
  hint: string;
  /** Alsó határ (cm, zárt — a sávba esik, ha height >= min). */
  min: number;
  /** Felső határ (cm, nyitott — a sávba esik, ha height < max). */
  max: number;
}

/** A három méret-kategória neve — a value stabil, így a ?size= URL-ek
 *  akkor is érvényesek maradnak, ha a tartományok változnak. */
const SIZE_BUCKETS = [
  { value: "mini", label: "Miniatűr" },
  { value: "medium", label: "Közepes" },
  { value: "large", label: "Nagy" },
] as const;

/** cm érték barátságos megjelenítése (egész, vagy egy tizedes vesszővel). */
function formatCm(v: number): string {
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(".", ",");
}

/** A termékek magasságaiból három, egyenlő méretű, egymást nem fedő sávot
 *  épít. A határok a tényleges min/max értékekre illeszkednek, így minden
 *  termék pontosan egy sávba esik (a felső határ nyitott: height < max). */
export function buildSizeRanges(heights: number[]): SizeRange[] {
  const list = heights.filter((h) => Number.isFinite(h) && h >= 0);
  if (list.length === 0) return [];
  const min = Math.min(...list);
  const max = Math.max(...list);

  // Gyakorlatilag egyetlen magasság van — egyetlen, mindent lefedő sáv.
  if (max - min < 0.1) {
    return [
      {
        value: "mini",
        label: "Egy méret",
        hint: `${formatCm(max)} cm`,
        min: 0,
        max: max + 1,
      },
    ];
  }

  const span = max - min;
  const N = SIZE_BUCKETS.length;
  return SIZE_BUCKETS.map((bucket, i) => {
    const lo = min + (span * i) / N;
    // Az utolsó sáv nyitott felső határa a legnagyobb érték fölé esik, hogy
    // a legmagasabb darab is beleférjen (a felirat a valós max-ot mutatja).
    const hi = i === N - 1 ? max + 1 : min + (span * (i + 1)) / N;
    return {
      value: bucket.value,
      label: bucket.label,
      hint: `${formatCm(lo)}–${formatCm(Math.min(hi, max))} cm`,
      min: lo,
      max: hi,
    };
  });
}

// ---------------------------------------------------------------------------
// Méretarány opciók (checkbox szűrőhöz) — DINAMIKUSAN a termékek tényleges
// méretarány-értékeiből számolva, ugyanúgy, ahogy a méret-sávok a magasságokból.
// A méretarány nélküli termékek külön „Egyedi méret" opciót kapnak, így azok
// sem esnek ki az összes szűrőből.
// ---------------------------------------------------------------------------

/** A méretarány nélküli termékek szűrő-értéke (stabil, URL-ben is használható). */
export const SCALE_NONE = "__none__";

export interface ScaleOption {
  /** A szűrő értéke (a tényleges méretarány, vagy a SCALE_NONE jelző). */
  value: string;
  /** Megjelenített felirat (a tényleges érték, vagy „Egyedi méret"). */
  label: string;
  /** Hány termék tartozik hozzá (a teljes készletből). */
  count: number;
}

/** „1:6" -> 6, „1/10" -> 10 — a kisebb nevező (nagyobb arány) kerül elölre. */
function scaleSortKey(value: string): number {
  const m = value.match(/(\d+)\s*[:\/]\s*(\d+)/);
  if (m) return Number(m[2]);
  return Number.MAX_SAFE_INTEGER;
}

/** A termékek tényleges méretarány-értékeiből épít opciókat. A méretarány
 *  nélküli termékekhez (ha van ilyen) egy „Egyedi méret" opciót ad, így azok
 *  is szűrhetők maradnak. */
export function buildScaleOptions(products: Product[]): ScaleOption[] {
  const counts = new Map<string, number>();
  let noneCount = 0;
  for (const p of products) {
    const scale = p.dimensions.scale?.trim();
    if (scale) counts.set(scale, (counts.get(scale) ?? 0) + 1);
    else noneCount += 1;
  }
  const options: ScaleOption[] = [...counts.entries()].map(
    ([scale, count]) => ({ value: scale, label: scale, count })
  );
  options.sort((a, b) => scaleSortKey(a.value) - scaleSortKey(b.value));
  if (noneCount > 0) {
    options.push({ value: SCALE_NONE, label: "Egyedi méret", count: noneCount });
  }
  return options;
}

// ---------------------------------------------------------------------------
// Segédfüggvények
// ---------------------------------------------------------------------------

/** 45000 -> "45 000" (hu-HU formátum) */
export function formatPrice(price: number, currency: string): string {
  const formatted = new Intl.NumberFormat("hu-HU").format(price);
  return currency === "EUR" ? `${formatted} EUR` : `${formatted} Ft`;
}

/** Ékezetmentes kisbetűs kereséshez */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Az elmúlt N napban feltöltött termék kap "Új" jelzést */
export function isNewProduct(product: Product, days = 60): boolean {
  const ageMs = Date.now() - new Date(product.createdAt).getTime();
  return ageMs >= 0 && ageMs <= days * 24 * 60 * 60 * 1000;
}
