"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

/** Kategória-választó kombobox: meglévőből választás vagy új beírása.
 *  A natív datalist helyett saját, az oldal stílusához illő legördülővel:
 *  gépelésre szűr, nyilakkal + Enterrel navigálható, Escape-csel zárható,
 *  és szabadon beírható új érték is (az mentéskor létrejön). */
export default function CategoryCombobox({
  value,
  onChange,
  options,
  placeholder,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Külső változás (pl. termék betöltése) szinkronizálása az input szövegével
  // — a React ajánlott „render közbeni korrekció" mintája.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  // A gépelt szöveg nincs az opciók közt → új kategória, amit mentéskor
  // létrehozunk. Ilyenkor ezt is mutatjuk a listában.
  const isCustom = query.trim().length > 0 && !filtered.includes(query.trim());

  const openList = () => {
    const idx = Math.max(0, filtered.indexOf(value));
    setHighlight(idx);
    setOpen(true);
  };

  const closeList = () => setOpen(false);

  const select = (option: string) => {
    onChange(option);
    setQuery(option);
    setOpen(false);
    // Nincs focus() hívás: a mousedown preventDefault-ja megtartja a fókuszt,
    // így a lista nem nyílik újra közvetlenül a választás után.
  };

  // Kattintás a komponensen kívül → bezárás.
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        closeList();
      }
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setHighlight((h) =>
        Math.min(h + 1, filtered.length - 1 + (isCustom ? 1 : 0))
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (!open) {
        openList();
        e.preventDefault();
        return;
      }
      e.preventDefault();
      const listLen = filtered.length;
      if (highlight < listLen) {
        select(filtered[highlight]);
      } else if (isCustom) {
        select(query.trim()); // az új kategória marad
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        closeList();
      }
    }
  };

  const listLen = filtered.length;
  const showCustomRow = isCustom;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => {
            if (!open) openList();
          }}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            onChange(v);
            if (!open) setOpen(true);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-controls="category-options-list"
          aria-autocomplete="list"
          className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 pl-3 pr-10 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/60 focus:outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => (open ? closeList() : openList())}
          aria-label={open ? "Kategória lista bezárása" : "Kategória lista megnyitása"}
          className={`absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200 ${
            open ? "rotate-180 text-amber-500" : ""
          }`}
        >
          <ChevronDown className="h-4 w-4 transition-transform duration-200" />
        </button>
      </div>

      {open && (
        <div
          id="category-options-list"
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-52 w-full overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-2xl shadow-black/50"
        >
          {listLen === 0 && !showCustomRow && (
            <p className="px-3 py-2.5 text-xs text-zinc-500">
              Nincs ilyen kategória — írd be, és mentéskor létrejön.
            </p>
          )}

          {filtered.map((option, index) => {
            const active = option === value;
            const highlighted = index === highlight;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={active}
                onMouseDown={(e) => {
                  // Fókuszvesztés megelőzése a label-beli input miatt
                  e.preventDefault();
                  select(option);
                }}
                onMouseEnter={() => setHighlight(index)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  highlighted
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-300 hover:bg-zinc-800/60"
                }`}
              >
                <span className="truncate">{option}</span>
                {active && <Check className="h-4 w-4 shrink-0 text-amber-500" />}
              </button>
            );
          })}

          {showCustomRow && (
            <button
              type="button"
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                select(query.trim());
              }}
              onMouseEnter={() => setHighlight(listLen)}
              className={`flex w-full items-center gap-2 rounded-lg border-t border-zinc-800/70 px-3 py-2 text-left text-sm transition-colors ${
                highlight === listLen
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-300 hover:bg-zinc-800/60"
              }`}
            >
              <Plus className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="truncate">
                Új kategória: <span className="font-medium text-amber-500">{query.trim()}</span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
