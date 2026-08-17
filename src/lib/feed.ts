import type { ProductDetail } from "@/types/product";

// ---------------------------------------------------------------------------
// Facebook / Meta dinamikus hirdetés XML feed
// ---------------------------------------------------------------------------
// A katalógus-mezők a Meta termékkatalógus specifikációját követik:
//   - kötelező: id, title, description, availability, condition, price, link,
//     image_link, brand
//   - opcionális: google_product_category, gtin, mpn, item_group_id, color,
//     size, material, pattern, gender, age_group, additional_image_link,
//     sale_price, custom_label_0..4, video_link, shipping, weight,
//     unit_pricing_measure, quantity_to_sell_on_facebook

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://festettszobrok.com"
).replace(/\/+$/, "");

export const FEED_BRAND = "Festett Szobrok";

export const AVAILABILITY_OPTIONS = [
  "in stock",
  "out of stock",
  "preorder",
  "available for order",
] as const;

export const CONDITION_OPTIONS = ["new", "refurbished", "used"] as const;

export const GENDER_OPTIONS = ["", "male", "female", "unisex"] as const;

export const AGE_GROUP_OPTIONS = [
  "",
  "newborn",
  "infant",
  "toddler",
  "kids",
  "adult",
] as const;

/** A feedben tárolt, szerkeszthető mezők (camelCase, API-n át is ez jár). */
export interface FeedEntryFields {
  feedId: string;
  title: string;
  description: string;
  availability: string;
  condition: string;
  price: string;
  link: string;
  imageLink: string;
  brand: string;
  googleProductCategory: string;
  gtin: string;
  mpn: string;
  itemGroupId: string;
  color: string;
  size: string;
  material: string;
  pattern: string;
  gender: string;
  ageGroup: string;
  additionalImageLink: string;
  salePrice: string;
  customLabel0: string;
  customLabel1: string;
  customLabel2: string;
  customLabel3: string;
  customLabel4: string;
  videoLink: string;
  shipping: string;
  weight: string;
  unitPricingMeasure: string;
  quantityToSellOnFacebook: string;
}

/** Relatív URL (pl. /images/...) abszolúttá alakítása a feedhez. */
export function toAbsoluteUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed === "") return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return SITE_URL + (trimmed.startsWith("/") ? trimmed : `/${trimmed}`);
}

/** HTML tagek eltávolítása szöveges leíráshoz. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** XML-entitások elkerítése a feed elemekben. */
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * A termékből SZÁRMAZÓ mezők — ezek mindig a termék aktuális adataiból
 * töltődnek (a képmezőkhöz hasonlóan), így sosem lehetnek elavultak.
 */
export const PRODUCT_DERIVED_FIELDS = Object.freeze([
  "feedId",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "imageLink",
  "brand",
  "mpn",
  "itemGroupId",
  "color",
  "size",
  "material",
  "ageGroup",
  "additionalImageLink",
  "customLabel0",
  "customLabel1",
  "customLabel2",
  "customLabel3",
  "customLabel4",
  "videoLink",
] as const satisfies ReadonlyArray<keyof FeedEntryFields>);

/**
 * A feed-elem termékből származó mezőinek feloldása a termék adataiból
 * (cím, ár, elérhetőség, képek, anyagok, címkék…). A tárolt értékeket
 * mindig felülírja, így a feed sosem lehet elavult — a feed-specifikus
 * (kézzel szerkesztett) mezőket érintetlenül hagyja.
 */
export function resolveProductFields<T extends FeedEntryFields>(
  fields: T,
  product: ProductDetail
): T {
  const defaults = buildDefaultFeedEntry(product);
  const resolved = { ...fields };
  for (const key of PRODUCT_DERIVED_FIELDS) {
    resolved[key] = defaults[key];
  }
  return resolved;
}

/** A termék adataiból felépített default feed-mezők. */
export function buildDefaultFeedEntry(
  product: ProductDetail
): FeedEntryFields {
  const dimensions: string[] = [];
  if (product.dimensionsDetail.widthCm > 0)
    dimensions.push(`${product.dimensionsDetail.widthCm} cm széles`);
  if (product.dimensionsDetail.heightCm > 0)
    dimensions.push(`${product.dimensionsDetail.heightCm} cm magas`);
  if (product.dimensionsDetail.depthCm > 0)
    dimensions.push(`${product.dimensionsDetail.depthCm} cm mély`);

  // A bélyegkép az image_link, a többi kép az additional_image_link.
  const thumbnail = product.thumbnail ?? product.images[0] ?? "";
  const additionalImages = product.images
    .filter((img) => img !== thumbnail)
    .map(toAbsoluteUrl)
    .filter(Boolean);

  const customLabels = (product.tags ?? []).join(", ");

  return {
    feedId: product.id,
    title: product.title,
    description:
      stripHtml(product.descriptionHtml) ||
      product.shortDescription ||
      product.title,
    availability: product.isAvailable ? "in stock" : "out of stock",
    condition: "new",
    price: `${product.price} ${product.currency}`,
    link: `${SITE_URL}/portfolio/${encodeURIComponent(product.slug)}`,
    imageLink: toAbsoluteUrl(thumbnail),
    brand: FEED_BRAND,
    googleProductCategory:
      "Toys & Games > Toys > Toy Figures & Playsets > Action Figures",
    gtin: "",
    mpn: product.id,
    itemGroupId: product.id,
    color: product.tags?.includes("Kézzel festett") ? "Multicolor" : "",
    size: product.dimensionsDetail.scale || dimensions.join(", "),
    material: (product.materials ?? []).join(", "),
    pattern: "",
    gender: "",
    ageGroup: "adult",
    additionalImageLink: additionalImages.join(", "),
    salePrice: "",
    customLabel0: product.category,
    customLabel1: customLabels,
    customLabel2: product.printTechnology,
    customLabel3:
      dimensions.length > 0
        ? `${dimensions.join(", ")}${product.dimensionsDetail.scale ? ` · ${product.dimensionsDetail.scale}` : ""}`
        : product.dimensionsDetail.scale,
    customLabel4: product.isAvailable ? "Elérhető" : "Elfogyott",
    videoLink: product.videoUrl ?? "",
    shipping: "",
    weight: "",
    unitPricingMeasure: "",
    quantityToSellOnFacebook: "",
  };
}

/** Egy feed-elem XML-jének előállítása (csak a nem üres mezőket írja ki). */
function itemXml(fields: FeedEntryFields): string {
  const pairs: Array<[string, string]> = [
    ["id", fields.feedId],
    ["title", fields.title],
    ["description", fields.description],
    ["availability", fields.availability],
    ["condition", fields.condition],
    ["price", fields.price],
    ["link", fields.link],
    ["image_link", fields.imageLink],
    ["brand", fields.brand],
    ["google_product_category", fields.googleProductCategory],
    ["gtin", fields.gtin],
    ["mpn", fields.mpn],
    ["item_group_id", fields.itemGroupId],
    ["color", fields.color],
    ["size", fields.size],
    ["material", fields.material],
    ["pattern", fields.pattern],
    ["gender", fields.gender],
    ["age_group", fields.ageGroup],
    ["additional_image_link", fields.additionalImageLink],
    ["sale_price", fields.salePrice],
    ["custom_label_0", fields.customLabel0],
    ["custom_label_1", fields.customLabel1],
    ["custom_label_2", fields.customLabel2],
    ["custom_label_3", fields.customLabel3],
    ["custom_label_4", fields.customLabel4],
    ["video_link", fields.videoLink],
    ["shipping", fields.shipping],
    ["weight", fields.weight],
    ["unit_pricing_measure", fields.unitPricingMeasure],
    ["quantity_to_sell_on_facebook", fields.quantityToSellOnFacebook],
  ];

  const lines = pairs
    .filter(([, value]) => value.trim() !== "")
    .map(
      ([tag, value]) =>
        `    <g:${tag}>${xmlEscape(value.trim())}</g:${tag}>`
    );

  return `  <item>\n${lines.join("\n")}\n  </item>`;
}

/** A teljes feed XML előállítása az összes feed-elemből. */
export function buildFeedXml(
  entries: Array<FeedEntryFields & { updatedAt: string }>
): string {
  const items = entries.map(itemXml).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Festett Szobrok — Megvásárolható alkotások</title>
    <link>${xmlEscape(SITE_URL)}</link>
    <description>Kézzel festett, 3D nyomtatott szobrok és miniatúrák — XML feed a Facebook / Meta dinamikus hirdetésekhez.</description>
${items}
  </channel>
</rss>
`;
}
