"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, GripVertical, ImageOff, Pencil, Rss, Trash2 } from "lucide-react";
import type { Product } from "@/types/product";
import { formatPrice } from "@/lib/products";
import { cardThumbUrlFor } from "@/lib/imageUrls";
import FeedEditorModal from "@/components/admin/FeedEditorModal";

export default function ProductAdminRow({
  product,
  inFeed = false,
  feedImageErrors = [],
  onPriceChange,
  dragEnabled = false,
  onDragStart,
  onDragOver,
  onDropRow,
  onDragEnd,
  isDragging = false,
  isDragOver = false,
}: {
  product: Product;
  inFeed?: boolean;
  /** A feedben nem létező képre mutató URL-ek (ha van ilyen). */
  feedImageErrors?: string[];
  /** Gyors árszerkesztés után (id + új ár) — a lista frissíti a rendezéshez. */
  onPriceChange?: (id: string, price: number) => void;
  /** Drag&drop engedélyezve (csak az alap „táblázat sorrend" nézetben). */
  dragEnabled?: boolean;
  onDragStart?: (id: string) => void;
  onDragOver?: (id: string) => void;
  onDropRow?: (id: string) => void;
  /** A húzás vége (elejtés vagy megszakítás) — a jelölés törlése. */
  onDragEnd?: () => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}) {
  const [featured, setFeatured] = useState(product.featured ?? false);
  const [available, setAvailable] = useState(product.isAvailable);
  const [price, setPrice] = useState(product.price);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState(String(product.price));
  const [priceSaving, setPriceSaving] = useState(false);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [inFeedState, setInFeedState] = useState(inFeed);

  useEffect(() => {
    if (editingPrice) {
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
    }
  }, [editingPrice]);

  const startPriceEdit = () => {
    setPriceDraft(String(price));
    setEditingPrice(true);
  };

  /** "24 000" vagy "24000" vagy "19990,5" → 24000 / 19990.5 */
  const parsePrice = (raw: string): number | null => {
    const cleaned = raw.replace(/\s+/g, "").replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  };

  const savePrice = async () => {
    if (!editingPrice) return;
    setEditingPrice(false);
    const parsed = parsePrice(priceDraft);
    if (parsed === null || parsed === price) return;
    setPriceSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, field: "price", value: parsed }),
      });
      if (!res.ok) throw new Error("Hiba a mentéskor");
      setPrice(parsed);
      onPriceChange?.(product.id, parsed);
    } catch {
      // Sikertelen mentésnél az eredeti ár marad
    } finally {
      setPriceSaving(false);
    }
  };

  const patch = async (field: "featured" | "is_available", value: boolean) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, field, value }),
      });
      if (!res.ok) throw new Error("Hiba a mentéskor");
      if (field === "featured") setFeatured(value);
      else setAvailable(value);
    } catch {
      // Sikertelen mentésnél a kapcsoló visszaugrik az eredeti állapotra
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id }),
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
    } catch {
      // maradunk az oldalon
    }
    setBusy(false);
    setConfirmDelete(false);
  };

  return (
    <>
      <tr
        onDragOver={(e) => {
          if (!dragEnabled) return;
          e.preventDefault();
          onDragOver?.(product.id);
        }}
        onDrop={(e) => {
          if (!dragEnabled) return;
          e.preventDefault();
          onDropRow?.(product.id);
        }}
        className={`border-t border-zinc-800/60 transition-colors hover:bg-zinc-900/40 ${
          isDragging ? "opacity-40" : ""
        } ${
          isDragOver
            ? "shadow-[inset_0_3px_0_0_rgba(217,119,6,0.9)]"
            : ""
        }`}
      >
      {/* Sorrend (drag&drop fogantyú) */}
      <td className="w-10 py-3 pl-4 pr-1">
        <button
          type="button"
          draggable={dragEnabled}
          disabled={!dragEnabled}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", product.id);
            onDragStart?.(product.id);
          }}
          onDragEnd={() => {
            // Húzás vége (elejtés vagy megszakítás) — a jelölések törlése.
            onDragEnd?.();
          }}
          aria-label={`${product.title} átrendezése`}
          title={
            dragEnabled
              ? "Fogd meg és húzd a sorrend módosításához — ez a portfólió és a kiemeltek sorrendje is."
              : "A sorrend húzással az alap nézetben (szűrők nélkül) módosítható."
          }
          className={`rounded-md p-1.5 transition-colors ${
            dragEnabled
              ? "cursor-grab text-zinc-600 hover:bg-zinc-800 hover:text-amber-500 active:cursor-grabbing"
              : "cursor-not-allowed text-zinc-800"
          }`}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      {/* Kép */}
      <td className="py-3 pl-3 pr-3">
        <div className="relative flex h-14 w-11 items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
          {(product.thumbnail ?? product.images[0]) ? (
            /* A kis táblázat-bélyegkép a 4:5 arányú, előre méretezett
               card-változatot használja — nem a teljes eredeti képet. */
            <Image
              src={cardThumbUrlFor(product.thumbnail ?? product.images[0])}
              alt={product.title}
              width={44}
              height={56}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-base">🎨</span>
          )}
          {!available && (
            <div className="absolute inset-0 flex flex-col items-center justify-end bg-zinc-950/55 pb-1">
              <span className="rounded-sm bg-zinc-950/95 px-1 py-px text-[8px] font-bold uppercase tracking-wider text-amber-400">
                Elkelt
              </span>
            </div>
          )}
        </div>
      </td>
      {/* Cím */}
      <td className="py-3 pr-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/portfolio/${product.id}`}
            className="text-sm font-medium text-zinc-200 transition-colors hover:text-amber-500"
          >
            {product.title}
          </Link>
          <Link
            href={`/portfolio/${product.id}`}
            aria-label="Megnyitás az oldalon"
            className="text-zinc-600 transition-colors hover:text-amber-500"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          {inFeedState && (
            <span
              title="Szerepel a /feed/products.xml XML feedben"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-600/50 bg-emerald-600/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400"
            >
              <Rss className="h-3 w-3" />
              XML feedben
            </span>
          )}
          {inFeedState && feedImageErrors.length > 0 && (
            <span
              title={`Nem létező kép(ek) a feedben:\n${feedImageErrors.join("\n")}`}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-600/50 bg-red-600/10 px-2 py-0.5 text-[10px] font-medium text-red-400"
            >
              <ImageOff className="h-3 w-3" />
              Képhiba a feedben ({feedImageErrors.length})
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-500">
          {product.category} · {product.dimensions.scale ?? "Egyedi méret"}
        </span>
      </td>
      {/* Ár — kattintásra gyorsszerkesztés */}
      <td className="whitespace-nowrap py-3 pr-3">
        {editingPrice ? (
          <input
            ref={priceInputRef}
            type="text"
            inputMode="decimal"
            value={priceDraft}
            disabled={priceSaving}
            onChange={(e) => setPriceDraft(e.target.value)}
            onBlur={savePrice}
            onKeyDown={(e) => {
              if (e.key === "Enter") savePrice();
              if (e.key === "Escape") setEditingPrice(false);
            }}
            aria-label={`${product.title} ára`}
            className="w-24 rounded-md border border-amber-600/60 bg-zinc-900 px-2 py-1 text-sm font-semibold text-amber-500 outline-none transition-colors focus:border-amber-500 disabled:opacity-50"
          />
        ) : (
          <button
            type="button"
            onClick={startPriceEdit}
            title="Kattints az ár módosításához"
            className="rounded-md px-1 py-0.5 text-sm font-semibold text-amber-500 transition-colors hover:bg-amber-600/10 hover:text-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
          >
            {priceSaving ? "…" : formatPrice(price, product.currency)}
          </button>
        )}
      </td>
      {/* Kiemelt */}
      <td className="py-3 pr-3">
        <button
          type="button"
          role="switch"
          aria-checked={featured}
          aria-label={`${product.title} kiemelése a főoldalon`}
          disabled={busy}
          onClick={() => patch("featured", !featured)}
          className={`relative h-6 w-11 rounded-full border transition-colors disabled:opacity-50 ${
            featured
              ? "border-amber-600 bg-amber-600"
              : "border-zinc-700 bg-zinc-800"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-zinc-100 shadow transition-all ${
              featured ? "left-[calc(100%-1.25rem)]" : "left-0.5"
            }`}
          />
        </button>
      </td>
      {/* Elérhető */}
      <td className="py-3 pr-3">
        <button
          type="button"
          role="switch"
          aria-checked={available}
          aria-label={`${product.title} elérhető`}
          disabled={busy}
          onClick={() => patch("is_available", !available)}
          className={`relative h-6 w-11 rounded-full border transition-colors disabled:opacity-50 ${
            available
              ? "border-emerald-600 bg-emerald-600"
              : "border-zinc-700 bg-zinc-800"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-zinc-100 shadow transition-all ${
              available ? "left-[calc(100%-1.25rem)]" : "left-0.5"
            }`}
          />
        </button>
      </td>
      {/* Feltöltve */}
      <td className="whitespace-nowrap py-3 pr-3 text-xs text-zinc-500">
        {new Intl.DateTimeFormat("hu-HU", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }).format(new Date(product.createdAt))}
      </td>
      {/* Műveletek */}
      <td className="py-3 pl-3 pr-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFeedOpen(true)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors ${
              inFeedState
                ? "border-emerald-600/50 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20"
                : "border-zinc-800 text-zinc-300 hover:border-amber-600/60 hover:text-amber-500"
            }`}
          >
            <Rss className="h-3.5 w-3.5" />
            {inFeedState ? "Feed szerkesztése" : "XML feed"}
          </button>
          <Link
            href={`/admin/products/${product.id}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-800 px-3 text-xs font-medium text-zinc-300 transition-colors hover:border-amber-600/60 hover:text-amber-500"
          >
            <Pencil className="h-3.5 w-3.5" />
            Szerkesztés
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors disabled:opacity-50 ${
              confirmDelete
                ? "border-red-600 bg-red-600/15 text-red-400"
                : "border-zinc-800 text-zinc-400 hover:border-red-600/60 hover:text-red-400"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmDelete ? "Biztos?" : "Törlés"}
          </button>
        </div>
      </td>
      </tr>
      <FeedEditorModal
        productId={product.id}
        productTitle={product.title}
        open={feedOpen}
        inFeed={inFeedState}
        onClose={() => setFeedOpen(false)}
        onSaved={(saved) => {
          setInFeedState(saved);
          setFeedOpen(false);
        }}
      />
    </>
  );
}
