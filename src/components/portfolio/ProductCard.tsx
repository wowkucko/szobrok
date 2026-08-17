"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Heart, Ruler, Truck } from "lucide-react";
import type { Product } from "@/types/product";
import { formatPrice, isNewProduct } from "@/lib/products";
import { cardThumbUrlFor } from "@/lib/imageUrls";

interface ProductCardProps {
  product: Product;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  /** Ha megadod, a címkék gombként viselkednek és ezt hívják (pl. szűrés). */
  onTagClick?: (tag: string) => void;
  /** Az első (LCP) kártyán preload-olja a képet — csak az első elemre add meg. */
  priority?: boolean;
}

export default function ProductCard({
  product,
  isBookmarked,
  onToggleBookmark,
  onTagClick,
  priority = false,
}: ProductCardProps) {
  const [pulse, setPulse] = useState(false);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleBookmark(product.id);
    setPulse(true);
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setPulse(false), 350);
  };

  // Az „Új" jelzés csak elérhető (megvásárolható) termékekre kerül —
  // az elkelt daraboknál nincs értelme, ott a tompítás és az „Elkelt" bélyeg a lényeg.
  const isNew = isNewProduct(product) && product.isAvailable;
  // Elkelt (nem elérhető) termék: tompított kártya, hogy azonnal látszódjon,
  // hogy már nem vásárolható.
  const sold = !product.isAvailable;
  const coverImage = cardThumbUrlFor(product.thumbnail ?? product.images[0]);
  // Hover-kép: az első kép, ami nem a bélyegkép. A kártyán a 4:5 arányú,
  // figyelem-alapú vágású változat jelenik meg (portré fotóknál is látszik
  // az alak feje), ezért mindkét képet azon keresztül kérjük le.
  const hoverImage = product.images.find(
    (img) => img !== (product.thumbnail ?? product.images[0])
  );
  const hoverImageUrl = hoverImage ? cardThumbUrlFor(hoverImage) : undefined;
  const hasSecondImage = hoverImageUrl !== undefined;

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border transition-colors ${
        sold
          ? "border-zinc-800/80 bg-zinc-900/20 hover:border-zinc-800"
          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
      }`}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <Link
          href={`/portfolio/${product.id}`}
          className="block h-full w-full"
          aria-label={product.title}
        >
          {product.images.length > 0 ? (
            <>
              <Image
                src={coverImage}
                alt={product.title}
                fill
                priority={priority}
                unoptimized
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className={`object-cover transition-all duration-500 ${
                  sold ? "saturate-[0.3]" : ""
                } ${
                  hasSecondImage
                    ? "group-hover:scale-105 group-hover:opacity-0"
                    : "group-hover:scale-105"
                }`}
              />
              {hasSecondImage && (
                <Image
                  src={hoverImageUrl as string}
                  alt={`${product.title} — további fotó`}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className={`scale-105 object-cover opacity-0 transition-all duration-500 group-hover:opacity-100 ${
                    sold ? "saturate-[0.3]" : ""
                  }`}
                />
              )}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-900/60 px-4 text-center">
              <span className="text-2xl">🎨</span>
              <span className="text-xs text-zinc-500">Kép hamarosan</span>
            </div>
          )}
        </Link>

        {/* Elkelt: a kép halványítása overlay-réteggel — nem nyúl a képek
            saját opacity-átmenetéhez (nincs ghosting), és a jelvények
            (Kedvenc / Új / Elkelt) felette, élénken maradnak. */}
        {sold && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-zinc-950/40"
          />
        )}

        <button
          type="button"
          onClick={handleBookmark}
          aria-pressed={isBookmarked}
          aria-label={
            isBookmarked
              ? `${product.title} eltávolítása a kedvencekből`
              : `${product.title} mentése a kedvencek közé`
          }
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-sm transition-colors ${
            isBookmarked
              ? "border-amber-500/60 bg-amber-500/20 text-amber-500"
              : "border-zinc-700/80 bg-zinc-950/60 text-zinc-300 hover:border-amber-600/60 hover:text-amber-500"
          }`}
        >
          <Heart
            className={`h-4.5 w-4.5 ${
              pulse ? "animate-[bookmark-pop_0.35s_ease-out]" : ""
            }`}
            fill={isBookmarked ? "currentColor" : "none"}
            strokeWidth={isBookmarked ? 2.5 : 2}
          />
        </button>

        {isNew && (
          <span className="absolute left-3 top-3 rounded-full bg-amber-600 px-2.5 py-1 text-xs font-semibold text-zinc-950">
            Új
          </span>
        )}

        {!product.isAvailable && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-3">
            <span className="rounded-full border border-amber-500/50 bg-zinc-950/85 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-amber-400 backdrop-blur-sm">
              Elkelt
            </span>
          </div>
        )}

        {/* Szállítható plecsni a jobb alsó sarokban (csak elérhető terméknél) */}
        {product.isShippable && product.isAvailable && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-sky-600/50 bg-zinc-950/85 px-3 py-1.5 text-xs font-semibold text-sky-400 backdrop-blur-sm">
            <Truck className="h-3.5 w-3.5" />
            Szállítható
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-1.5">
          {product.tags.slice(0, 3).map((tag) =>
            onTagClick ? (
              <button
                key={tag}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTagClick(tag);
                }}
                aria-label={`Szűrés a(z) ${tag} címkére`}
                className="rounded-full border border-zinc-800 px-2.5 py-0.5 text-[11px] text-zinc-400 transition-colors hover:border-amber-600/70 hover:text-amber-500"
              >
                {tag}
              </button>
            ) : (
              <Link
                key={tag}
                href={`/portfolio?tag=${encodeURIComponent(tag)}`}
                aria-label={`Szűrés a(z) ${tag} címkére`}
                className="rounded-full border border-zinc-800 px-2.5 py-0.5 text-[11px] text-zinc-400 transition-colors hover:border-amber-600/70 hover:text-amber-500"
              >
                {tag}
              </Link>
            )
          )}
        </div>

        <Link href={`/portfolio/${product.id}`} className="mt-3">
          <h3
            className={`text-base font-semibold leading-snug transition-colors ${
              sold ? "text-zinc-400" : "text-zinc-100 group-hover:text-amber-500"
            }`}
          >
            {product.title}
          </h3>
        </Link>

        <p
          className={`mt-2 line-clamp-2 flex-1 text-sm leading-6 ${
            sold ? "text-zinc-500" : "text-zinc-400"
          }`}
        >
          {product.shortDescription}
        </p>

        <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
          <Ruler className="h-3.5 w-3.5" />
          <span>
            {product.dimensions.heightCm} cm magas
            {product.dimensions.scale && (
              <> · {product.dimensions.scale} méretarány</>
            )}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-4">
          {sold ? (
            <span className="text-sm font-medium text-zinc-500">
              Nem elérhető
            </span>
          ) : (
            <span className="text-lg font-semibold tracking-tight text-amber-500">
              {formatPrice(product.price, product.currency)}
            </span>
          )}
          <Link
            href={`/portfolio/${product.id}`}
            className={`text-sm font-medium transition-colors ${
              sold
                ? "text-zinc-500"
                : "text-zinc-400 hover:text-amber-500"
            }`}
          >
            Részletek →
          </Link>
        </div>
      </div>
    </article>
  );
}
