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
// Méret kategóriák (checkbox szűrőhöz)
// ---------------------------------------------------------------------------

export interface SizeRange {
  value: string;
  label: string;
  hint: string;
  min: number;
  max: number;
}

export const SIZE_RANGES: SizeRange[] = [
  { value: "mini", label: "Miniatűr", hint: "< 10 cm", min: 0, max: 9.99 },
  { value: "medium", label: "Közepes", hint: "10–20 cm", min: 10, max: 20 },
  { value: "large", label: "Nagy", hint: "20–35 cm", min: 20.01, max: 35 },
];

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
