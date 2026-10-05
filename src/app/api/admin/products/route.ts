import { NextRequest, NextResponse, after } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createProduct,
  deleteProduct,
  isSlugAvailable,
  listRedirectSources,
  parseProductQuery,
  queryProducts,
  renameProductSlug,
  updateProduct,
  updateProductFlag,
  updateProductPrice,
  type ProductInput,
} from "@/lib/db";
import { notifyIndexNow } from "@/lib/indexing";
import { refreshCollageForProduct } from "@/lib/ogCollage";
import { SITE_URL } from "@/lib/seo";
import { slugValidationError } from "@/lib/slug";
import type { PrintTechnology } from "@/types/product";

const TECHNOLOGIES: PrintTechnology[] = ["MSLA Resin (12K)", "FDM (0.08 mm)"];

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}
function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}
function bool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function maybeStr(v: unknown): string | null {
  const s = str(v).trim();
  return s === "" ? null : s;
}

/** A bejövő törzs normalizálása biztonságos, teljes ProductInput-tá. */
function parseInput(body: unknown): ProductInput {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    title: str(b.title),
    shortDescription: str(b.shortDescription),
    price: Math.max(0, num(b.price)),
    currency: str(b.currency) === "EUR" ? "EUR" : "HUF",
    heightCm: num(b.heightCm),
    scale: maybeStr(b.scale),
    tags: strList(b.tags),
    // A kategória szabadon bővíthető: az adminból új kategória is megadható,
    // nem whitelistelünk — üres érték esetén az alapértelmezett „Other".
    category: str(b.category).trim() || "Other",
    images: strList(b.images),
    thumbnail: str(b.thumbnail) || strList(b.images)[0] || "",
    createdAt: str(b.createdAt, new Date().toISOString()),
    isAvailable: bool(b.isAvailable, true),
    featured: bool(b.featured),
    isShippable: bool(b.isShippable),
    descriptionHtml: str(b.descriptionHtml),
    videoUrl: maybeStr(b.videoUrl),
    materials: strList(b.materials),
    printTechnology: TECHNOLOGIES.includes(b.printTechnology as PrintTechnology)
      ? (b.printTechnology as PrintTechnology)
      : "MSLA Resin (12K)",
    widthCm: num(b.widthCm),
    depthCm: num(b.depthCm),
    scaleComparisonObject: str(b.scaleComparisonObject, "fél literes üdítős PET palack"),
    externalShopUrl: str(b.externalShopUrl),
  };
}

function titleError(input: ProductInput): string | null {
  if (!input.title.trim()) return "A cím kötelező.";
  return null;
}

/** A termék nyilvános URL-je a webcíméből (a webcím az id-vel azonos). */
function productUrl(slug: string): string {
  return `${SITE_URL}/portfolio/${slug}`;
}

/**
 * A módosítások azonnal megjelenjenek a nyilvános oldalakon (cache
 * újragenerálás). Átnevezésnél a régi és az új cím is újragenerálódik: a régi
 * útvonalon ugyanis a 308-as átirányítást kell kiszolgálni.
 */
function invalidatePublicCache(...productIds: string[]) {
  revalidatePath("/");
  revalidatePath("/portfolio");
  revalidatePath("/feed/products.xml");
  // A sitemap lastmod mezője a termék updated_at-jából jön — ez a Google
  // felé menő jelzés, ezért azt is frissíteni kell.
  revalidatePath("/sitemap.xml");
  for (const id of productIds) {
    if (id) revalidatePath(`/portfolio/${id}`);
  }
}

/**
 * A megosztási kollázs újragenerálása termék-mentés után — a kollázson az ár
 * (és az „Elkelt" jelvény) is szerepel, ezért árváltozásnál és elérhetőség-
 * váltásnál is frissülnie kell. Hiba esetén csendben kihagyjuk: a /api/files
 * route a hiányzót menet közben úgyis előállítja.
 */
async function refreshCollage(id: string): Promise<void> {
  try {
    await refreshCollageForProduct(id);
  } catch {
    // nem blokkoljuk a mentést a kollázs miatt
  }
}

/** Termékek listázása a szerveroldali szűrőkkel (URL paraméterek). */
export async function GET(request: NextRequest) {
  const filters = parseProductQuery(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );
  const { products, total, filtered, page, pageCount } = queryProducts(filters);
  return NextResponse.json({ products, total, filtered, page, pageCount, filters });
}

/** Új termék létrehozása. A `slug` megadható; ha üres, a címből képződik. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const input = parseInput(body);
  const err = titleError(input);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const slugRaw = str(body?.slug).trim();
  if (slugRaw) {
    const slugErr = slugValidationError(slugRaw);
    if (slugErr) return NextResponse.json({ error: slugErr }, { status: 400 });
    if (!isSlugAvailable(slugRaw)) {
      return NextResponse.json(
        { error: `Ez a webcím már használatban van: /portfolio/${slugRaw}` },
        { status: 400 }
      );
    }
  }

  const { id } = createProduct(input, slugRaw || undefined);
  invalidatePublicCache(id);
  await refreshCollage(id);
  // Új oldal: azonnali jelzés a keresőknek (IndexNow).
  after(() => notifyIndexNow([productUrl(id)]));
  return NextResponse.json({ ok: true, id, slug: id });
}

/** Termék frissítése: { id, ...mezők } vagy a régi flag-toggle formátum ({ id, field, value }). */
export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ error: "Hiányzó termék id" }, { status: 400 });
  }

  // Flag-toggle (a listaoldal kapcsolóihoz) — az elérhetőség-váltás az
  // „Elkelt" jelvényt is érinti a kollázson, ezért ott is újragenerálunk.
  if (body.field === "featured" || body.field === "is_available") {
    const updated = updateProductFlag(body.id, body.field, Boolean(body.value));
    if (!updated) {
      return NextResponse.json({ error: "Nincs ilyen termék" }, { status: 404 });
    }
    invalidatePublicCache(body.id);
    await refreshCollage(body.id);
    return NextResponse.json({ ok: true });
  }

  // Gyors árszerkesztés (a listaoldali árra kattintva) — az ár a kollázson
  // is megjelenik, ezért itt is újragenerálunk.
  if (body.field === "price") {
    const price = Math.max(0, num(body.value));
    const updated = updateProductPrice(body.id, price);
    if (!updated) {
      return NextResponse.json({ error: "Nincs ilyen termék" }, { status: 404 });
    }
    invalidatePublicCache(body.id);
    await refreshCollage(body.id);
    return NextResponse.json({ ok: true, price });
  }

  // Teljes mező-frissítés
  const input = parseInput(body);
  const err = titleError(input);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  // Webcím (slug) átnevezés: a régi cím 308-cal az újra irányít, és a
  // keresők is azonnal jelzést kapnak (sitemap lastmod + IndexNow).
  const oldId = body.id;
  const slugRaw = str(body.slug).trim();
  const renaming = slugRaw !== "" && slugRaw !== oldId;
  if (renaming) {
    const result = renameProductSlug(oldId, slugRaw);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "A webcím átnevezése nem sikerült." },
        { status: 400 }
      );
    }
  }
  const productId = renaming ? slugRaw : oldId;

  const updated = updateProduct(productId, input);
  if (!updated) {
    return NextResponse.json({ error: "Nincs ilyen termék" }, { status: 404 });
  }

  if (renaming) {
    // A régi cím MELLETT minden korábbi generáció is újragenerálódik, hogy
    // azonnal (és egyetlen lépésben) az új címre irányítsanak — így nem
    // láncolódnak a 308-asok a gyorsítótárban.
    const oldSlugs = listRedirectSources(productId);
    invalidatePublicCache(oldId, productId, ...oldSlugs);
    // A jelzésbe az összes érintett cím bekerül: a régiről a Google is át
    // tudja venni az átirányítást, az új pedig azonnal indexelhető.
    after(() =>
      notifyIndexNow(
        [...new Set([productId, oldId, ...oldSlugs])].map(productUrl)
      )
    );
  } else {
    invalidatePublicCache(productId);
    after(() => notifyIndexNow([productUrl(productId)]));
  }
  await refreshCollage(productId);
  return NextResponse.json({ ok: true, id: productId, slug: productId });
}

/** Termék törlése: { id } */
export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (!body || typeof body.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ error: "Hiányzó termék id" }, { status: 400 });
  }
  const deleted = deleteProduct(body.id);
  if (!deleted) {
    return NextResponse.json({ error: "Nincs ilyen termék" }, { status: 404 });
  }
  invalidatePublicCache(body.id);
  return NextResponse.json({ ok: true });
}
