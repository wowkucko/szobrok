"use client";

import { ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import type { SortOption } from "@/lib/products";
import { SORT_OPTIONS } from "@/lib/products";

export interface SizeFilterOption {
  value: string;
  label: string;
  hint: string;
}

interface ProductFiltersProps {
  tagOptions: string[];
  query: string;
  onQueryChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  /** Csak az elérhető termékek mutatása (alap: Összes termék). */
  availableOnly: boolean;
  onAvailableOnlyChange: (value: boolean) => void;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  priceMin: string;
  priceMax: string;
  onPriceChange: (min: string, max: string) => void;
  sizeOptions: SizeFilterOption[];
  selectedSizes: string[];
  onToggleSize: (value: string) => void;
  scaleOptions: string[];
  selectedScales: string[];
  onToggleScale: (value: string) => void;
  activeCount: number;
  onReset: () => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
}

export default function ProductFilters({
  tagOptions,
  query,
  onQueryChange,
  sort,
  onSortChange,
  availableOnly,
  onAvailableOnlyChange,
  selectedTags,
  onToggleTag,
  priceMin,
  priceMax,
  onPriceChange,
  sizeOptions,
  selectedSizes,
  onToggleSize,
  scaleOptions,
  selectedScales,
  onToggleScale,
  activeCount,
  onReset,
  filtersOpen,
  onToggleFilters,
}: ProductFiltersProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
      {/* Vezérlősor: keresés + rendezés + szűrő ki/becsukás */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Kereső */}
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Keresés név, leírás vagy címke alapján…"
            aria-label="Keresés a termékek között"
            className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-950/60 pl-10 pr-10 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Keresés törlése"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 transition-colors hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Összes termék / Csak aktív termékek — az elkelt darabok az
            „Összes" nézetben a lista végére sorolódnak. */}
        <div
          role="group"
          aria-label="Szűrés elérhetőség szerint"
          className="inline-flex h-11 items-center gap-0.5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-0.5"
        >
          <button
            type="button"
            onClick={() => onAvailableOnlyChange(false)}
            aria-pressed={!availableOnly}
            className={`h-9 rounded-lg px-3.5 text-sm font-medium transition-colors ${
              !availableOnly
                ? "bg-amber-600 text-zinc-950"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Összes termék
          </button>
          <button
            type="button"
            onClick={() => onAvailableOnlyChange(true)}
            aria-pressed={availableOnly}
            className={`h-9 rounded-lg px-3.5 text-sm font-medium transition-colors ${
              availableOnly
                ? "bg-amber-600 text-zinc-950"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Csak aktív termékek
          </button>
        </div>

        {/* Rendezés */}
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            aria-label="Rendezés"
            className="h-11 appearance-none rounded-xl border border-zinc-800 bg-zinc-950/60 pl-4 pr-10 text-sm text-zinc-200 focus:border-amber-600/60 focus:outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        </div>

        {/* Mobil szűrő nyitó gomb */}
        <button
          type="button"
          onClick={onToggleFilters}
          aria-expanded={filtersOpen}
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm text-zinc-200 transition-colors hover:border-amber-600/60 lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Szűrők
          {activeCount > 0 && (
            <span className="rounded-full bg-amber-600 px-1.5 text-xs font-semibold text-zinc-950">
              {activeCount}
            </span>
          )}
        </button>

        {/* Szűrők törlése */}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 text-sm text-zinc-400 transition-colors hover:border-amber-600/60 hover:text-amber-500"
          >
            <RotateCcw className="h-4 w-4" />
            Szűrők törlése
          </button>
        )}
      </div>

      {/* Bővített szűrőpanel: mobilon összecsukható, desktopon látható */}
      {/* figyelem: a lg:grid tartja meg a 3 oszlopot desktopon — a lg:block felülírná */}
      <div
        className={`mt-5 gap-6 border-t border-zinc-800/60 pt-5 md:grid-cols-3 ${
          filtersOpen ? "grid" : "hidden"
        } lg:grid`}
      >
        {/* Ár */}
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Ár (Ft)
          </legend>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={priceMin}
              onChange={(e) => onPriceChange(e.target.value, priceMax)}
              placeholder="Min"
              aria-label="Minimális ár"
              className="h-10 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-zinc-600">–</span>
            <input
              type="number"
              min={0}
              value={priceMax}
              onChange={(e) => onPriceChange(priceMin, e.target.value)}
              placeholder="Max"
              aria-label="Maximális ár"
              className="h-10 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </fieldset>

        {/* Méret */}
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Méret
          </legend>
          <div className="flex flex-wrap gap-2">
            {sizeOptions.map((opt) => {
              const active = selectedSizes.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onToggleSize(opt.value)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    active
                      ? "border-amber-600 bg-amber-600/15 text-amber-500"
                      : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {opt.label}
                  <span className="mx-1.5 opacity-40" aria-hidden="true">
                    ·
                  </span>
                  <span className="opacity-60">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Méretarány */}
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Méretarány
          </legend>
          <div className="flex flex-wrap gap-2">
            {scaleOptions.map((scale) => {
              const active = selectedScales.includes(scale);
              return (
                <button
                  key={scale}
                  type="button"
                  onClick={() => onToggleScale(scale)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    active
                      ? "border-amber-600 bg-amber-600/15 text-amber-500"
                      : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {scale}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {/* Címke chipek — mindig látható */}
      <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-800/60 pt-5">
        <button
          type="button"
          onClick={() => selectedTags.length > 0 && onToggleTag("__all__")}
          aria-pressed={selectedTags.length === 0}
          className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
            selectedTags.length === 0
              ? "border-amber-600 bg-amber-600/15 text-amber-500"
              : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
          }`}
        >
          Összes
        </button>
        {tagOptions.map((tag) => {
          const active = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              aria-pressed={active}
              className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                active
                  ? "border-amber-600 bg-amber-600/15 text-amber-500"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
