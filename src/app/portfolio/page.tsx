import type { Metadata } from "next";
import { Package } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductGallery from "@/components/portfolio/ProductGallery";
import {
  getAvailableCount,
  getProducts,
  getScaleOptions,
  getTagOptions,
} from "@/lib/db";
import { parsePortfolioFilters } from "@/lib/portfolioFilters";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** A szűrt (pl. ?tag=Fantasy) portfólió-oldalak a saját URL-jükre kanonizálnak,
 *  hogy a sitemap kategória-URL-jei önálló oldalként indexelhetők legyenek.
 *  Szűrő nélkül a kanonikus a tiszta /portfolio marad. */
export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      qs.set(key, Array.isArray(value) ? value[0] : value);
    }
  }
  const query = qs.toString();
  const self = query ? `/portfolio?${query}` : "/portfolio";

  const title = "Megvásárolható Alkotások";
  const description =
    "Egyedileg nyomtatott és kézzel festett gyűjtői figurák. Minden darab egyedi és azonnal megvásárolható.";

  return {
    title,
    description,
    alternates: { canonical: self },
    openGraph: {
      type: "website",
      url: self,
      title: `${title} — Festett Szobrok`,
      description,
      images: [
        {
          url: "/images/og-default.png",
          width: 1200,
          height: 630,
          alt: "Megvásárolható kézzel festett szobrok",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — Festett Szobrok`,
      description,
      images: ["/images/og-default.png"],
    },
  };
}

// A ?tag= paraméter miatt az oldal kérésenként renderelődik — így az admin
// módosítások is azonnal megjelennek.
export default async function PortfolioPage({ searchParams }: PageProps) {
  // Minden szűrő az URL-ben él (q, tag, min, max, size, scale, sort,
  // availability) — megosztható, visszaállítható, és vissza-gombbal is
  // visszahozható. Az oldal ebből kapja a kezdő szűrőállapotot.
  const initialFilters = parsePortfolioFilters(await searchParams);

  const [products, availableCount, tagOptions, scaleOptions] =
    await Promise.all([
      getProducts(),
      getAvailableCount(),
      getTagOptions(),
      getScaleOptions(),
    ]);

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-100">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-zinc-800/60 bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.08),transparent_60%)]">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Eladó szobrok · Kézzel festett
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Megvásárolható{" "}
              <span className="bg-gradient-to-r from-amber-500 to-amber-700 bg-clip-text text-transparent">
                Alkotások
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-400">
              Egyedileg nyomtatott és kézzel festett gyűjtői figurák. Minden
              darab egyedi és azonnal megvásárolható.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-amber-600/30 bg-amber-600/10 px-4 py-2 text-sm font-medium text-amber-500">
              <Package className="h-4 w-4" />
              {availableCount} alkotás elérhető
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <ProductGallery
            products={products}
            tagOptions={tagOptions}
            scaleOptions={scaleOptions}
            initialFilters={initialFilters}
          />
        </section>
      </main>
      <Footer />
    </div>
  );
}
