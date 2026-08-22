import Link from "next/link";
import { ArrowRight, Gift, Share2 } from "lucide-react";
import { getMaxActiveCouponDiscount } from "@/lib/db";

/**
 * Figyelemfelhívó blokk a főoldal alján (a Kapcsolat után): a látogató
 * megtudja, hogy kedvezményt szerezhet, és egy gombbal az akciós oldalra
 * jut, ahol a saját megosztó linkjét generálhatja.
 */
export default function DiscountCta() {
  const maxDiscount = getMaxActiveCouponDiscount();

  return (
    <section
      id="kedvezmeny"
      className="relative overflow-hidden border-b border-zinc-800/60 scroll-mt-20"
    >
      {/* Háttér dekoráció */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.16),transparent_55%)]" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-amber-600/10 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-6 py-24">
        <div className="overflow-hidden rounded-3xl border border-amber-600/25 bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-8 shadow-2xl sm:p-12">
          <div className="flex flex-col items-center gap-8 text-center md:flex-row md:text-left">
            {/* Ikon */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-amber-600/30 bg-amber-600/15">
              <Gift className="h-10 w-10 text-amber-500" />
            </div>

            {/* Szöveg */}
            <div className="flex-1">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-600/30 bg-amber-600/10 px-3 py-1 text-xs font-medium text-amber-500">
                <Share2 className="h-3.5 w-3.5" />
                Ajánló akció
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
                Szerezz akár{" "}
                <span className="text-amber-500">{maxDiscount}% kedvezményt</span>
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">
                Készíts egy saját megosztó linket, posztold Facebookon — ha 5
                ember rákattint, azonnal megkapod a kedvezményes kuponkódot a
                megrendeléshez. Regisztráció nélkül, egyetlen kattintással.
              </p>
            </div>

            {/* Gomb */}
            <div className="shrink-0">
              <Link
                href="/akcio"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-amber-600 px-7 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500"
              >
                Kedvezmény megszerzése
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
