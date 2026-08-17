"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { cardThumbUrlFor, galleryThumbUrlFor } from "@/lib/imageUrls";

interface MediaGalleryProps {
  images: string[];
  title: string;
}

export default function MediaGallery({ images, title }: MediaGalleryProps) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const go = useCallback(
    (delta: number) => {
      setActive((prev) => (prev + delta + images.length) % images.length);
    },
    [images.length]
  );

  // ESC billentyű és nyilak a lightboxban
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, go]);

  const activeImage = images[active] ?? images[0];

  // Nincs még kép — helykitöltő, hogy az oldal ne törjön el
  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/40">
        <span className="text-4xl">🎨</span>
        <span className="text-sm text-zinc-500">Kép hamarosan</span>
      </div>
    );
  }

  return (
    <div>
      {/* Fő kép — a 4:5 arányú, előre méretezett (gallery-<base>.jpg) változat:
          gyors betöltés, nincs szerver-oldali átméretezés, a hiányzó fájlt a
          /api/files route menet közben előállítja. */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40">
        <Image
          src={galleryThumbUrlFor(activeImage)}
          alt={`${title} — ${active + 1}. kép`}
          fill
          priority
          unoptimized
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="Nagyítás teljes képernyőre"
          className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-950/70 text-zinc-200 backdrop-blur-sm transition-colors hover:border-amber-600/60 hover:text-amber-500"
        >
          <Maximize2 className="h-5 w-5" />
        </button>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Előző kép"
              className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-950/70 text-zinc-200 backdrop-blur-sm transition-colors hover:border-amber-600/60 hover:text-amber-500"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Következő kép"
              className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-950/70 text-zinc-200 backdrop-blur-sm transition-colors hover:border-amber-600/60 hover:text-amber-500"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Bélyegképek */}
      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3">
          {images.map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === active}
              aria-label={`${i + 1}. kép megjelenítése`}
              className={`relative aspect-square overflow-hidden rounded-xl border transition-colors ${
                i === active
                  ? "border-amber-600"
                  : "border-zinc-800 opacity-60 hover:opacity-100"
              }`}
            >
              {/* A kis bélyegkép a 4:5 arányú, előre méretezett card-változatot
                  használja — nem a teljes eredeti képet tölti le. */}
              <Image
                src={cardThumbUrlFor(img)}
                alt=""
                fill
                sizes="96px"
                unoptimized
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Kép nagyítva"
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 p-4 backdrop-blur-sm sm:p-10"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Bezárás"
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition-colors hover:border-amber-600 hover:text-amber-500"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Előző kép"
            className="absolute left-3 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition-colors hover:border-amber-600 hover:text-amber-500 sm:left-8"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div
            className="relative h-full max-h-[85vh] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activeImage}
              alt={`${title} — nagyított kép`}
              fill
              sizes="(min-width: 1024px) 60vw, 90vw"
              className="object-contain"
            />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Következő kép"
            className="absolute right-3 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition-colors hover:border-amber-600 hover:text-amber-500 sm:right-8"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900/90 px-4 py-1.5 text-sm text-zinc-400">
            {active + 1} / {images.length}
          </span>
        </div>
      )}
    </div>
  );
}
