import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  deleteFeedEntry,
  getFeedEntry,
  getProductById,
  upsertFeedEntry,
} from "@/lib/db";
import {
  buildDefaultFeedEntry,
  resolveProductFields,
  type FeedEntryFields,
} from "@/lib/feed";
import { checkProductFeedImages } from "@/lib/feedImages";

const REQUIRED: Array<keyof FeedEntryFields> = [
  "feedId",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "imageLink",
  "brand",
];

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** A bejövő törzsből biztonságos FeedEntryFields. */
function parseFields(body: unknown): FeedEntryFields | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const pick = (key: keyof FeedEntryFields) => str(b[key]);

  const fields: FeedEntryFields = {
    feedId: pick("feedId"),
    title: pick("title"),
    description: pick("description"),
    availability: pick("availability"),
    condition: pick("condition"),
    price: pick("price"),
    link: pick("link"),
    imageLink: pick("imageLink"),
    brand: pick("brand"),
    googleProductCategory: pick("googleProductCategory"),
    gtin: pick("gtin"),
    mpn: pick("mpn"),
    itemGroupId: pick("itemGroupId"),
    color: pick("color"),
    size: pick("size"),
    material: pick("material"),
    pattern: pick("pattern"),
    gender: pick("gender"),
    ageGroup: pick("ageGroup"),
    additionalImageLink: pick("additionalImageLink"),
    salePrice: pick("salePrice"),
    customLabel0: pick("customLabel0"),
    customLabel1: pick("customLabel1"),
    customLabel2: pick("customLabel2"),
    customLabel3: pick("customLabel3"),
    customLabel4: pick("customLabel4"),
    videoLink: pick("videoLink"),
    shipping: pick("shipping"),
    weight: pick("weight"),
    unitPricingMeasure: pick("unitPricingMeasure"),
    quantityToSellOnFacebook: pick("quantityToSellOnFacebook"),
  };

  const missing = REQUIRED.filter(
    (key) => fields[key].trim() === ""
  );
  if (missing.length > 0) {
    return null;
  }
  return fields;
}

/** A feed módosításai a nyilvános feednél azonnal jelenjenek meg. */
function invalidateFeed() {
  revalidatePath("/feed/products.xml");
  revalidatePath("/");
  revalidatePath("/portfolio");
}

/**
 * GET /api/admin/feed?productId=X
 * A tárolt feed-bejegyzés, vagy ha nincs, a termékből felépített default draft.
 */
export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId") ?? "";
  if (!productId) {
    return NextResponse.json(
      { error: "Hiányzó productId paraméter" },
      { status: 400 }
    );
  }
  const product = getProductById(productId);
  if (!product) {
    return NextResponse.json({ error: "Nincs ilyen termék" }, { status: 404 });
  }

  const entry = getFeedEntry(productId);
  // A termékből származó mezőket (cím, ár, elérhetőség, képek, anyagok…)
  // mindig a termék aktuális adataiból oldjuk fel, így a modál sosem mutat
  // elavult értékeket.
  const fields = entry
    ? resolveProductFields(entry, product)
    : buildDefaultFeedEntry(product);
  // A feedben megjelenő kép URL-ek ellenőrzése (létező fájlra mutatnak-e).
  const imageCheck = checkProductFeedImages(product);
  return NextResponse.json({
    inFeed: entry !== undefined,
    fields,
    imageCheck,
  });
}

/** POST /api/admin/feed — { productId, fields } a feedbe töltése/frissítése. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const productId = typeof body?.productId === "string" ? body.productId : "";
  if (!productId) {
    return NextResponse.json({ error: "Hiányzó termék id" }, { status: 400 });
  }
  const product = getProductById(productId);
  if (!product) {
    return NextResponse.json({ error: "Nincs ilyen termék" }, { status: 404 });
  }

  const fields = parseFields(body?.fields);
  if (!fields) {
    return NextResponse.json(
      {
        error:
          "A kötelező mezők (id, title, description, availability, condition, price, link, image_link, brand) nem lehetnek üresek.",
      },
      { status: 400 }
    );
  }

  upsertFeedEntry(productId, fields);
  invalidateFeed();
  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/feed — { productId } eltávolítás a feedből. */
export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    productId?: unknown;
  } | null;
  const productId =
    typeof body?.productId === "string" ? body.productId : "";
  if (!productId) {
    return NextResponse.json({ error: "Hiányzó termék id" }, { status: 400 });
  }
  deleteFeedEntry(productId);
  invalidateFeed();
  return NextResponse.json({ ok: true });
}
