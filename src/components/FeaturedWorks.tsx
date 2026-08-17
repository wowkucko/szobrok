import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionHeading from "./SectionHeading";
import FeaturedCarousel from "./FeaturedCarousel";
import { getFeaturedProducts } from "@/lib/db";

export default async function FeaturedWorks() {
  // Minden kiemelt termék — a carousel dönti el, hány látszik egyszerre
  // (nagy képernyőn 4), a többit a nyilakkal/automata görgetéssel éred el.
  const products = getFeaturedProducts(50);
  if (products.length === 0) return null;

  return (
    <section id="galeria" className="scroll-mt-20 border-b border-zinc-800/60">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading
          index="01"
          title="Kiemelt alkotások"
          subtitle="Egy ízelítő a galériából — minden darab egyedi, kézzel készült."
        />
        <div className="mt-12">
          <FeaturedCarousel products={products} />
        </div>

        <div className="mt-10 flex justify-end">
          <Link
            href="/portfolio"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-zinc-700 px-6 text-sm font-medium text-zinc-200 transition-colors hover:border-amber-600 hover:text-amber-500"
          >
            Összes megvásárolható termék megtekintése
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
