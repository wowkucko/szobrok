"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import RelatedProductCard from "./portfolio/RelatedProductCard";
import type { Product } from "@/types/product";

interface FeaturedCarouselProps {
  products: Product[];
}

const SCROLL_INTERVAL = 5000; // ms — automatikus jobbra haladás

/** Kiemelt alkotások: automatikusan jobbra görgő, manuálisan léptethető sáv. */
export default function FeaturedCarousel({ products }: FeaturedCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Van-e egyáltalán mit görgetni (pl. 4 termék desktopon elfér egyszerre —
  // akkor nincs nyíl; mobilon 1 látszik, így 4 termék már 4 oldal).
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

  // iOS Safari: snap-konténer betöltéskor néha pár px-sel balra elcsúszva
  // jelenik meg, így a kártya jobb széle (kép jobb oldala, kedvenc gomb)
  // lecsúszik a képernyőről — csak kézi görgetésre áll helyre. A mount után
  // kényszerített 0 pozíció "kiülésre" készteti a snapet, így elsőre is
  // teljes szélességben látszik a kártya.
  useEffect(() => {
    const el = trackRef.current;
    if (el) el.scrollLeft = 0;
  }, []);

  const scrollByPage = useCallback((dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const page = el.clientWidth;
    const max = el.scrollWidth - el.clientWidth;
    if (dir === 1 && el.scrollLeft >= max - 1) {
      // Vége → körbe vissza az elejére
      el.scrollTo({ left: 0, behavior: "smooth" });
    } else if (dir === -1 && el.scrollLeft <= 1) {
      // Eleje → körbe a végére
      el.scrollTo({ left: max, behavior: "smooth" });
    } else {
      el.scrollBy({ left: dir * page, behavior: "smooth" });
    }
  }, []);

  // Automatikus jobbra haladás (hoverre és érintésre megáll)
  useEffect(() => {
    if (!canScroll || paused) return;
    const id = setInterval(() => scrollByPage(1), SCROLL_INTERVAL);
    return () => clearInterval(id);
  }, [canScroll, paused, scrollByPage]);

  const pauseTouch = () => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  };
  const resumeTouch = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 6000);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={pauseTouch}
      onPointerUp={resumeTouch}
      onPointerLeave={resumeTouch}
    >
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product, index) => (
          <div
            key={product.id}
            className="flex w-full max-w-full shrink-0 snap-start basis-full sm:basis-[calc(50%-0.75rem)] lg:basis-[calc(25%-1.125rem)]"
          >
            <RelatedProductCard product={product} priority={index === 0} />
          </div>
        ))}
      </div>

      {canScroll && (
        <>
          {/* Balra léptető — mobilon elrejtve (ott swipe-ot használunk, ne
              takarja a kártya jobb/bal szélét) */}
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            aria-label="Előző kiemelt alkotások"
            className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-950/70 text-zinc-200 shadow-lg backdrop-blur transition-colors hover:border-amber-600 hover:text-amber-500 sm:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {/* Jobbra léptető */}
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            aria-label="Következő kiemelt alkotások"
            className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-950/70 text-zinc-200 shadow-lg backdrop-blur transition-colors hover:border-amber-600 hover:text-amber-500 sm:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
