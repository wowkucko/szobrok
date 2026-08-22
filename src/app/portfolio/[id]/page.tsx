import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  FlaskConical,
  Gift,
  Lock,
  Mail,
  MapPin,
  MessageCircleQuestion,
  Palette,
  PackageCheck,
  Puzzle,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RelatedProductCard from "@/components/portfolio/RelatedProductCard";
import MediaGallery from "@/components/portfolio/MediaGallery";
import ScaleComparison from "@/components/portfolio/ScaleComparison";
import OfferForm from "@/components/portfolio/OfferForm";
import PurchaseModal from "@/components/portfolio/PurchaseModal";
import ProductVideo from "@/components/portfolio/ProductVideo";
import ShareButtons from "@/components/portfolio/ShareButtons";
import BookmarkButton from "@/components/portfolio/BookmarkButton";
import PrintTechGraphic from "@/components/portfolio/PrintTechGraphic";
import ShippableGraphic from "@/components/portfolio/ShippableGraphic";
import {
  getProductById,
  getProducts,
  getRelatedProducts,
} from "@/lib/db";
import { formatPrice } from "@/lib/products";
import { SITE_NAME, SITE_URL, ogCollageFor, ogImageFor } from "@/lib/seo";

// Az admin felületen végzett módosítások legfeljebb 60 másodpercen belül
// megjelennek a részletező oldalakon is (ISR).
export const revalidate = 60;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) return { title: "Nem található" };
  const title = `${product.title} — Festett Szobrok`;
  // Megosztási előnézet: a kollázs (első 4 fotó + ár), ha van feltöltött kép,
  // különben az egyképes OG-kép. A kollázs CSAK a megosztásban látszik.
  const shareImage = ogCollageFor(product) ?? ogImageFor(product);
  return {
    title: { absolute: title },
    description: product.shortDescription,
    alternates: { canonical: `/portfolio/${product.id}` },
    openGraph: {
      type: "website",
      url: `/portfolio/${product.id}`,
      title,
      description: product.shortDescription,
      images: [{ url: shareImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: product.shortDescription,
      images: [shareImage],
    },
  };
}

export async function generateStaticParams() {
  const products = getProducts();
  return products.map((p) => ({ id: p.id }));
}

const MATERIAL_ICONS = [FlaskConical, Palette, ShieldCheck, Puzzle];

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) notFound();

  const related = getRelatedProducts(product, 4);

  // Strukturált adatok: Product + BreadcrumbList (Google rich results)
  const productUrl = `${SITE_URL}/portfolio/${product.id}`;
  const imageUrls = [
    ogImageFor(product),
    ...product.images
      .filter((img) => img !== (product.thumbnail ?? product.images[0]))
      .map((img) => ogImageFor({ thumbnail: img, images: [img] })),
  ];
  const productJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${productUrl}#product`,
        name: product.title,
        description: product.shortDescription,
        image: imageUrls,
        sku: product.id,
        category: product.category,
        brand: { "@type": "Brand", name: SITE_NAME },
        offers: {
          "@type": "Offer",
          url: productUrl,
          priceCurrency: product.currency,
          price: product.price,
          availability: product.isAvailable
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@id": `${SITE_URL}/#organization` },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Főoldal",
            item: `${SITE_URL}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Eladó Szobrok",
            item: `${SITE_URL}/portfolio`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: product.title,
            item: productUrl,
          },
        ],
      },
    ],
  };


  const isOneOff = product.tags.includes("Limitált");
  // A termékre tett ÖSSZES címke megjelenik. A kategória csak akkor kerül
  // külön a listába, ha már nincs benne a címkék között.
  const tagChips = product.tags.includes(product.category)
    ? product.tags
    : [product.category, ...product.tags];

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-100">
      <Navbar />
      <main className="flex-1">
        {/* Breadcrumb + gyors akciók */}
        <div className="mx-auto max-w-6xl px-6 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <nav aria-label="Morzsamenü" className="flex flex-wrap items-center gap-2 text-sm">
              <Link
                href="/"
                className="text-zinc-500 transition-colors hover:text-amber-500"
              >
                Főoldal
              </Link>
              <span className="text-zinc-700">/</span>
              <Link
                href="/portfolio"
                className="text-zinc-500 transition-colors hover:text-amber-500"
              >
                Eladó Szobrok
              </Link>
              <span className="text-zinc-700">/</span>
              <span className="line-clamp-1 max-w-[220px] text-zinc-300">
                {product.title}
              </span>
            </nav>
            <div className="flex items-center gap-3">
              <BookmarkButton productId={product.id} title={product.title} />
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-amber-600/60 hover:text-amber-500"
              >
                <ArrowLeft className="h-4 w-4" />
                Vissza a portfólióhoz
              </Link>
            </div>
          </div>
        </div>

        {/* Fő tartalom: 2 oszlop */}
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          {/* BAL: média galéria */}
          <div>
            <MediaGallery images={product.images} title={product.title} />

            {/* 360° videó */}
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                <Video className="h-4 w-4 text-amber-500" />
                360°-os videó bemutató
              </div>
              {product.videoUrl ? (
                <div className="mt-4">
                  <ProductVideo
                    videoUrl={product.videoUrl}
                    poster={product.thumbnail ?? product.images[0]}
                    title={product.title}
                  />
                  <p className="mt-3 text-xs leading-5 text-zinc-500">
                    Forgatótányéron körbekamerázott felvétel — így a szobor
                    minden szögből megtekinthető.
                  </p>
                </div>
              ) : (
                <div className="mt-4 flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 text-center">
                  <Video className="h-8 w-8 text-zinc-600" />
                  <p className="mt-3 text-sm text-zinc-500">
                    A 360°-os videó bemutató hamarosan elérhető.
                  </p>
                </div>
              )}
            </div>

            {/* Méret szemléltetés */}
            <div className="mt-6">
              <ScaleComparison
                heightCm={product.dimensionsDetail.heightCm}
                widthCm={product.dimensionsDetail.widthCm}
                depthCm={product.dimensionsDetail.depthCm}
                scale={product.dimensionsDetail.scale}
                comparisonObject={
                  product.dimensionsDetail.scaleComparisonObject
                }
              />
            </div>
          </div>

          {/* JOBB: információs panel (sticky) */}
          <div className="lg:sticky lg:top-24">
            {/* Címkék — minden, amit a termékre tettél */}
            <div className="flex flex-wrap gap-2">
              {tagChips.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400"
                >
                  {tag}
                </span>
              ))}
              {isOneOff && (
                <span className="rounded-full border border-amber-600/40 bg-amber-600/10 px-3 py-1 text-xs text-amber-500">
                  Egyedi (1/1)
                </span>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {product.title}
            </h1>
            <p className="mt-3 text-lg leading-8 text-zinc-400">
              {product.shortDescription}
            </p>

            {/* Ár + CTA */}
            <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex items-baseline justify-between">
                {product.isAvailable ? (
                  <span className="text-4xl font-semibold text-amber-500">
                    {formatPrice(product.price, product.currency)}
                  </span>
                ) : (
                  <span className="text-2xl font-semibold text-zinc-500">
                    Nem elérhető
                  </span>
                )}
                {!product.isAvailable && (
                  <span className="rounded-full border border-zinc-600/60 bg-zinc-800/60 px-3 py-1 text-xs font-medium text-zinc-300">
                    Elkelt
                  </span>
                )}
              </div>

              {product.isAvailable ? (
                <>
                  <div className="mt-5 flex flex-col gap-3">
                    <PurchaseModal product={product} />
                    <a
                      href="#ajanlat"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-zinc-700 px-6 text-sm font-medium text-zinc-200 transition-colors hover:border-amber-600 hover:text-amber-500"
                    >
                      <Mail className="h-4 w-4" />
                      Közvetlen érdeklődés / Ajánlattétel
                    </a>
                  </div>
                  <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
                    <Lock className="h-3.5 w-3.5" />
                    Biztonságos vásárlás a Meska piactéren keresztül
                  </p>
                  {/* Kedvezményre hívó információ — csak elérhető terméknél,
                      a közvetlen érdeklődés gombja alatt. */}
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-600/25 bg-amber-600/5 p-4">
                    <Gift className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-500" />
                    <p className="text-xs leading-5 text-zinc-400">
                      Szeretnéd olcsóbban? Jelentős kedvezményt is szerezhetsz
                      a vásárlásra —{" "}
                      <Link
                        href="/akcio"
                        className="font-medium text-amber-500 hover:text-amber-400"
                      >
                        részletek az akció oldalon
                      </Link>
                      .
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Elkelt darab: a vásárlási gombok helyett tájékoztató —
                      érdeklődés a termékkel kapcsolatban. */}
                  <div className="mt-5 rounded-xl border border-amber-600/25 bg-amber-600/5 p-4">
                    <p className="flex items-start gap-2.5 text-sm leading-6 text-zinc-300">
                      <MessageCircleQuestion className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-500" />
                      <span>
                        Ezt a terméket már{" "}
                        <span className="font-semibold text-zinc-100">
                          megvásárolták
                        </span>
                        . Érdeklődj a termékkel kapcsolatban, tedd fel
                        kérdéseid.
                      </span>
                    </p>
                  </div>
                  <a
                    href="#ajanlat"
                    className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-600 px-6 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-500"
                  >
                    <Mail className="h-4 w-4" />
                    Közvetlen érdeklődés
                  </a>
                </>
              )}
            </div>

            {/* Szállítható blokk — a nyomtatási technológia felett */}
            {product.isShippable && (
              <div className="mt-6 rounded-2xl border border-sky-600/30 bg-sky-600/5 p-5">
                <div className="flex items-start gap-4">
                  <ShippableGraphic />
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      Biztonságosan szállítható
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-zinc-400">
                      A termék felépítéséből adódóan megfelel a biztonságos
                      szállítás feltételeinek. A termék szállítása
                      csomagautomatába lehetséges.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Technikai adatok accordion */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
              <details className="group" open>
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-zinc-200 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Nyomtatási technológia
                  </span>
                  <ChevronIndicator />
                </summary>
                <div className="px-6 pb-5">
                  <div className="flex items-start gap-4 rounded-xl bg-zinc-950/60 p-4">
                    <PrintTechGraphic technology={product.printTechnology} />
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">
                        {product.printTechnology === "MSLA Resin (12K)" ? (
                          <>
                            MSLA Resin{" "}
                            <span className="font-mono text-amber-500">
                              12K felbontás
                            </span>
                          </>
                        ) : (
                          <>
                            FDM nyomtatás{" "}
                            <span className="font-mono text-amber-500">
                              0.08 mm rétegvastagság
                            </span>
                          </>
                        )}
                      </p>
                      <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                        {product.printTechnology === "MSLA Resin (12K)"
                          ? "Ultra-részletes, sima felület — a gyanta rétegvonalai szabad szemmel alig láthatók, így a finom textúrák élesen rajzolódnak ki."
                          : "Tartós, könnyű és asztalkész minőségű — a vékony rétegeknek köszönhetően a felület sima és részletgazdag."}
                      </p>
                    </div>
                  </div>
                </div>
              </details>

              <details className="group border-t border-zinc-800/60">
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-zinc-200 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-amber-500" />
                    Anyaghasználat
                  </span>
                  <ChevronIndicator />
                </summary>
                <ul className="space-y-3 px-6 pb-5">
                  {product.materials.map((material, i) => {
                    const Icon = MATERIAL_ICONS[i % MATERIAL_ICONS.length];
                    return (
                      <li key={material} className="flex items-start gap-3">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                        <span className="text-sm leading-6 text-zinc-300">
                          {material}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </div>

            {/* Közösségi megosztás */}
            <div className="mt-6">
              <ShareButtons />
            </div>
          </div>
        </div>

        {/* Részletes leírás */}
        <section className="border-t border-zinc-800/60">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                A művészi koncepció
              </h2>
              <div
                className="prose-detail mt-6 space-y-5 text-base leading-8 text-zinc-400 [&_strong]:text-zinc-200"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            </div>
          </div>
        </section>

        {/* Ajánlattétel */}
        <section id="ajanlat" className="scroll-mt-24 border-t border-zinc-800/60 bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.06),transparent_60%)]">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
              <div>
                {product.isAvailable ? (
                  <>
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                      Más ajánlatod van?{" "}
                      <span className="bg-gradient-to-r from-amber-500 to-amber-700 bg-clip-text text-transparent">
                        Tegyél egyedi árajánlatot!
                      </span>
                    </h2>
                    <p className="mt-4 text-lg leading-8 text-zinc-400">
                      Ha a kikiáltási ár nem ideális számodra, vagy egyedi
                      megjegyzésed van a darabbal kapcsolatban, írj — minden
                      ajánlatot figyelmesen elolvasok és válaszolok.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                      <span className="bg-gradient-to-r from-amber-500 to-amber-700 bg-clip-text text-transparent">
                        Érdeklődj a termékkel kapcsolatban
                      </span>
                    </h2>
                    <p className="mt-4 text-lg leading-8 text-zinc-400">
                      Ez a darab már elkelt, de ha bármilyen kérdésed van a
                      termékkel kapcsolatban, írj bátran — szívesen
                      válaszolok.
                    </p>
                  </>
                )}
                <div className="mt-6 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
                  <BadgeCheck className="h-5 w-5 shrink-0 text-amber-500" />
                  Az ajánlatod közvetlenül hozzám érkezik — nem kereskedő
                  közvetít.
                </div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8">
                <OfferForm product={product} />
              </div>
            </div>
          </div>
        </section>

        {/* Bizalmi jelvények */}
        <section className="border-t border-zinc-800/60">
          <div className="mx-auto grid max-w-6xl gap-4 px-6 py-12 sm:grid-cols-3">
            <div className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <PackageCheck className="h-6 w-6 shrink-0 text-amber-500" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  Törésbiztos csomagolás
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-zinc-500">
                  Egyedi szivacságyban és duplafalú dobozban szállítva.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <MapPin className="h-6 w-6 shrink-0 text-amber-500" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  Személyes átvétel
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-zinc-500">
                  Budapest és környékén személyes átvételi lehetőség.
                  Részletekről érdeklődj üzenetben.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <Mail className="h-6 w-6 shrink-0 text-amber-500" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  Közvetlen kapcsolat
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-zinc-500">
                  Kérdésed van a festéssel kapcsolatban? Írj bátran!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Kapcsolódó szobrok */}
        <section className="border-t border-zinc-800/60">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Hasonló szobrok
                </h2>
                <p className="mt-3 text-zinc-400">
                  Ezek a darabok is elérhetők — nézd meg őket, ha tetszett ez a
                  stílus.
                </p>
              </div>
              <Link
                href="/portfolio"
                className="hidden shrink-0 text-sm font-medium text-amber-500 transition-colors hover:text-amber-400 sm:inline-flex"
              >
                Összes alkotás →
              </Link>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <RelatedProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
    </div>
  );
}



function ChevronIndicator() {
  return (
    <span className="text-zinc-500 transition-transform group-open:rotate-180">
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 fill-none stroke-current stroke-2"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
