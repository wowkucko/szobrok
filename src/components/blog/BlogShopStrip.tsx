"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import type { Product } from "@/types/product";
import { formatPrice } from "@/lib/products";
import { cardThumbUrlFor } from "@/lib/imageUrls";

interface BlogShopStripProps {
  products: Product[];
}

/** Blogbejegyzések alatti, vízszintesen görgethető sáv a megvásárolható
 *  saját alkotásokkal — a portfólió kártyák kompakt változata. */
export default function BlogShopStrip({ products }: BlogShopStripProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const measure = () => {
      const el = trackRef.current;
      if (!el) return;
      setCanScroll(el.scrollWidth > el.clientWidth + 1);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [products.length]);

  const scrollByPage = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const page = Math.min(el.clientWidth * 0.9, 600);
    const max = el.scrollWidth - el.clientWidth;
    if (dir === 1 && el.scrollLeft >= max - 1) {
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (dir === -1 && el.scrollLeft <= 1) {
      el.scrollTo({ left: max, behavior: "smooth" });
    } else {
      el.scrollBy({ left: dir * page, behavior: "smooth" });
    }
  }, []);

  if (products.length === 0) return null;

  return (
    <section
      aria-label="Megvásárolható alkotásaim"
      className="mt-10 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-500">
            <ShoppingBag className="h-3.5 w-3.5" />
            Megvásárolható alkotásaim
          </p>
          <h2 className="mt-2 text-lg font-semibold leading-snug text-zinc-100">
            Kézzel festett szobraim a portfólióból
          </h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Ha megtetszett ez a világ, ezek a darabok azonnal vihetők.
          </p>
        </div>
        <Link
          href="/portfolio"
          className="hidden shrink-0 text-sm font-medium text-amber-500 transition-colors hover:text-amber-400 sm:inline-flex"
        >
          Összes →
        </Link>
      </div>

      <div className="relative mt-5">
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {products.map((product) => {
            const cover = cardThumbUrlFor(
              product.thumbnail ?? product.images[0]
            );
            return (
              <Link
                key={product.id}
                href={`/portfolio/${product.id}`}
                className="group w-[180px] shrink-0 snap-start overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60 transition-colors hover:border-amber-600/50 sm:w-[200px]"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                  {product.images.length > 0 ? (
                    <Image
                      src={cover}
                      alt={product.title}
                      fill
                      unoptimized
                      sizes="200px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">
                      🎨
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 min-h-[2.5rem] text-[13px] font-medium leading-5 text-zinc-200 transition-colors group-hover:text-amber-500">
                    {product.title}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-amber-500">
                    {formatPrice(product.price, product.currency)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {canScroll && (
          <>
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              aria-label="Előző alkotások"
              className="absolute left-1 top-[38%] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-950/80 text-zinc-200 shadow-lg backdrop-blur transition-colors hover:border-amber-600 hover:text-amber-500"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              aria-label="Következő alkotások"
              className="absolute right-1 top-[38%] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-950/80 text-zinc-200 shadow-lg backdrop-blur transition-colors hover:border-amber-600 hover:text-amber-500"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <Link
        href="/portfolio"
        className="mt-4 inline-flex text-sm font-medium text-amber-500 transition-colors hover:text-amber-400 sm:hidden"
      >
        Összes alkotás →
      </Link>
    </section>
  );
}
