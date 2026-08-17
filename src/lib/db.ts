import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type {
  PrintTechnology,
  Product,
  ProductCategory,
  ProductDetail,
} from "@/types/product";
import type { FeedEntryFields } from "./feed";

// Ezt a modult KIZÁRÓLAG szerver-komponensek importálhatják —
// a kliens komponensek kész, szerializált objektumokat kapnak propokként.

// TODO: cseréld le a saját webshopod linkjére
const SHOP_URL = "https://www.etsy.com/";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "artisanprints.db");

interface ProductRow {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  price: number;
  currency: string;
  height_cm: number;
  scale: string | null;
  detail_scale: string | null;
  tags: string;
  category: ProductCategory;
  images: string;
  thumbnail: string;
  created_at: string;
  is_available: number;
  featured: number;
  is_shippable: number;
  description_html: string;
  video_url: string | null;
  materials: string;
  print_technology: PrintTechnology;
  width_cm: number;
  depth_cm: number;
  scale_comparison: string;
  external_shop_url: string;
  gallery_images: string;
  sort_order: number;
}

/** Minden szerkeszthető mező (a termék űrlapról érkező adat). */
export interface ProductInput {
  title: string;
  shortDescription: string;
  price: number;
  currency: string;
  heightCm: number;
  scale: string | null;
  tags: string[];
  category: ProductCategory;
  images: string[];
  createdAt: string;
  isAvailable: boolean;
  featured: boolean;
  descriptionHtml: string;
  videoUrl: string | null;
  materials: string[];
  printTechnology: PrintTechnology;
  widthCm: number;
  depthCm: number;
  scaleComparisonObject: string;
  externalShopUrl: string;
  /** A bélyegképként megjelölt kép URL-je (ha üres, az images[0] az). */
  thumbnail: string;
  /** Biztonságosan szállítható (csomagautomatába is). */
  isShippable: boolean;
}

const INSERT_SQL = `
  INSERT INTO products (
    id, title, slug, short_description, price, currency, height_cm, scale,
    detail_scale, tags, category, images, thumbnail, created_at,
    is_available, featured, is_shippable, description_html, video_url,
    materials, print_technology, width_cm, depth_cm, scale_comparison,
    external_shop_url, gallery_images, sort_order
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    short_description TEXT NOT NULL,
    price INTEGER NOT NULL,
    currency TEXT NOT NULL,
    height_cm REAL NOT NULL,
    scale TEXT,
    detail_scale TEXT,
    tags TEXT NOT NULL,
    category TEXT NOT NULL,
    images TEXT NOT NULL,
    created_at TEXT NOT NULL,
    is_available INTEGER NOT NULL,
    featured INTEGER NOT NULL DEFAULT 0,
    is_shippable INTEGER NOT NULL DEFAULT 0,
    description_html TEXT NOT NULL,
    video_url TEXT,
    materials TEXT NOT NULL,
    print_technology TEXT NOT NULL,
    width_cm REAL NOT NULL,
    depth_cm REAL NOT NULL,
    scale_comparison TEXT NOT NULL,
    external_shop_url TEXT NOT NULL,
    gallery_images TEXT NOT NULL,
    thumbnail TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
  )
`;

const FEED_SCHEMA = `
  CREATE TABLE IF NOT EXISTS feed_entries (
    product_id TEXT PRIMARY KEY,
    feed_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    availability TEXT NOT NULL,
    condition TEXT NOT NULL,
    price TEXT NOT NULL,
    link TEXT NOT NULL,
    image_link TEXT NOT NULL,
    brand TEXT NOT NULL,
    google_product_category TEXT NOT NULL DEFAULT '',
    gtin TEXT NOT NULL DEFAULT '',
    mpn TEXT NOT NULL DEFAULT '',
    item_group_id TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '',
    size TEXT NOT NULL DEFAULT '',
    material TEXT NOT NULL DEFAULT '',
    pattern TEXT NOT NULL DEFAULT '',
    gender TEXT NOT NULL DEFAULT '',
    age_group TEXT NOT NULL DEFAULT '',
    additional_image_link TEXT NOT NULL DEFAULT '',
    sale_price TEXT NOT NULL DEFAULT '',
    custom_label_0 TEXT NOT NULL DEFAULT '',
    custom_label_1 TEXT NOT NULL DEFAULT '',
    custom_label_2 TEXT NOT NULL DEFAULT '',
    custom_label_3 TEXT NOT NULL DEFAULT '',
    custom_label_4 TEXT NOT NULL DEFAULT '',
    video_link TEXT NOT NULL DEFAULT '',
    shipping TEXT NOT NULL DEFAULT '',
    weight TEXT NOT NULL DEFAULT '',
    unit_pricing_measure TEXT NOT NULL DEFAULT '',
    quantity_to_sell_on_facebook TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  )
`;

const UPSERT_FEED_SQL = `
  INSERT INTO feed_entries (
    product_id, feed_id, title, description, availability, condition, price,
    link, image_link, brand, google_product_category, gtin, mpn, item_group_id,
    color, size, material, pattern, gender, age_group, additional_image_link,
    sale_price, custom_label_0, custom_label_1, custom_label_2, custom_label_3,
    custom_label_4, video_link, shipping, weight, unit_pricing_measure,
    quantity_to_sell_on_facebook, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(product_id) DO UPDATE SET
    feed_id = excluded.feed_id, title = excluded.title,
    description = excluded.description, availability = excluded.availability,
    condition = excluded.condition, price = excluded.price,
    link = excluded.link, image_link = excluded.image_link,
    brand = excluded.brand,
    google_product_category = excluded.google_product_category,
    gtin = excluded.gtin, mpn = excluded.mpn,
    item_group_id = excluded.item_group_id, color = excluded.color,
    size = excluded.size, material = excluded.material,
    pattern = excluded.pattern, gender = excluded.gender,
    age_group = excluded.age_group,
    additional_image_link = excluded.additional_image_link,
    sale_price = excluded.sale_price,
    custom_label_0 = excluded.custom_label_0,
    custom_label_1 = excluded.custom_label_1,
    custom_label_2 = excluded.custom_label_2,
    custom_label_3 = excluded.custom_label_3,
    custom_label_4 = excluded.custom_label_4,
    video_link = excluded.video_link, shipping = excluded.shipping,
    weight = excluded.weight,
    unit_pricing_measure = excluded.unit_pricing_measure,
    quantity_to_sell_on_facebook = excluded.quantity_to_sell_on_facebook,
    updated_at = excluded.updated_at
`;

interface FeedEntryRow {
  product_id: string;
  feed_id: string;
  title: string;
  description: string;
  availability: string;
  condition: string;
  price: string;
  link: string;
  image_link: string;
  brand: string;
  google_product_category: string;
  gtin: string;
  mpn: string;
  item_group_id: string;
  color: string;
  size: string;
  material: string;
  pattern: string;
  gender: string;
  age_group: string;
  additional_image_link: string;
  sale_price: string;
  custom_label_0: string;
  custom_label_1: string;
  custom_label_2: string;
  custom_label_3: string;
  custom_label_4: string;
  video_link: string;
  shipping: string;
  weight: string;
  unit_pricing_measure: string;
  quantity_to_sell_on_facebook: string;
  updated_at: string;
}

export interface StoredFeedEntry extends FeedEntryFields {
  productId: string;
  updatedAt: string;
}

function rowToFeedEntry(r: FeedEntryRow): StoredFeedEntry {
  return {
    productId: r.product_id,
    feedId: r.feed_id,
    title: r.title,
    description: r.description,
    availability: r.availability,
    condition: r.condition,
    price: r.price,
    link: r.link,
    imageLink: r.image_link,
    brand: r.brand,
    googleProductCategory: r.google_product_category,
    gtin: r.gtin,
    mpn: r.mpn,
    itemGroupId: r.item_group_id,
    color: r.color,
    size: r.size,
    material: r.material,
    pattern: r.pattern,
    gender: r.gender,
    ageGroup: r.age_group,
    additionalImageLink: r.additional_image_link,
    salePrice: r.sale_price,
    customLabel0: r.custom_label_0,
    customLabel1: r.custom_label_1,
    customLabel2: r.custom_label_2,
    customLabel3: r.custom_label_3,
    customLabel4: r.custom_label_4,
    videoLink: r.video_link,
    shipping: r.shipping,
    weight: r.weight,
    unitPricingMeasure: r.unit_pricing_measure,
    quantityToSellOnFacebook: r.quantity_to_sell_on_facebook,
    updatedAt: r.updated_at,
  };
}

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(DB_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(SCHEMA);
  db.exec(FEED_SCHEMA);
  // A korábbi verzió custom_fields oszlopát eltávolítjuk, ha még megvan
  // (a termékből származó mezőket már olvasáskor feloldjuk, nincs rá szükség).
  try {
    db.exec("ALTER TABLE feed_entries DROP COLUMN custom_fields");
  } catch {
    // nincs ilyen oszlop → minden rendben
  }
  // Meglévő adatbázisok: thumbnail oszlop + a gallery_images összevonása
  // a közös images listába (egyszeri migráció).
  migrateImages(db);
  // A szállítható jelző oszlopa (régebbi adatbázisoknál hiányozhat).
  try {
    db.exec(
      "ALTER TABLE products ADD COLUMN is_shippable INTEGER NOT NULL DEFAULT 0"
    );
  } catch {
    // már létezik az oszlop — minden rendben
  }
  // A saját (drag&drop) sorrend oszlopa. Ha most került hozzáadásra, a
  // meglévő termékek a korábbi (dátum szerinti) sorrendet kapják, hogy az
  // átrendezés előtt ne változzon a megjelenítés.
  let sortOrderAdded = false;
  try {
    db.exec(
      "ALTER TABLE products ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"
    );
    sortOrderAdded = true;
  } catch {
    // már létezik az oszlop — minden rendben
  }
  if (sortOrderAdded) {
    const rows = db
      .prepare("SELECT id FROM products ORDER BY created_at DESC")
      .all() as unknown as Array<{ id: string }>;
    const setOrder = db.prepare("UPDATE products SET sort_order = ? WHERE id = ?");
    rows.forEach((row, index) => setOrder.run(index, row.id));
  }
  // Első indításkor (ha még üres) automatikusan feltöltjük a JSON adatokból
  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM products")
    .get() as unknown as { count: number };
  if (count === 0) seedFromJson(db);
  return db;
}

/**
 * Kép-migráció: a régi, külön tárolt gallery_images-et az images listába
 * vonja (deduplikálva), a thumbnail oszlopot pedig kitölti, ha még üres.
 */
function migrateImages(target: DatabaseSync): void {
  const cols = target
    .prepare("PRAGMA table_info(products)")
    .all() as unknown as Array<{ name: string }>;
  if (!cols.some((c) => c.name === "thumbnail")) {
    target.exec("ALTER TABLE products ADD COLUMN thumbnail TEXT NOT NULL DEFAULT ''");
  }

  const rows = target
    .prepare("SELECT id, images, gallery_images, thumbnail FROM products")
    .all() as unknown as Array<{
    id: string;
    images: string;
    gallery_images: string;
    thumbnail: string;
  }>;

  const parseList = (raw: string): string[] => {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  };

  const update = target.prepare(
    "UPDATE products SET images = ?, gallery_images = ?, thumbnail = ? WHERE id = ?"
  );

  for (const row of rows) {
    const images = parseList(row.images);
    const gallery = parseList(row.gallery_images);
    const merged = [...images, ...gallery.filter((g) => !images.includes(g))];
    const thumbnail = row.thumbnail || merged[0] || "";
    const needsWrite =
      merged.length !== images.length || row.thumbnail !== thumbnail || row.gallery_images !== "[]";
    if (needsWrite) {
      update.run(JSON.stringify(merged), "[]", thumbnail, row.id);
    }
  }
}

/** Az adatbázis feltöltése a src/lib/data/*.json fájlokból (ha még üres). */
function seedFromJson(target: DatabaseSync): void {
  const read = (rel: string) =>
    JSON.parse(
      readFileSync(path.join(process.cwd(), "src", "lib", "data", rel), "utf8")
    );
  const products = read("products.json") as Array<{
    id: string;
    title: string;
    slug: string;
    shortDescription: string;
    price: number;
    currency: string;
    heightCm: number;
    scale?: string;
    tags: string[];
    category: ProductCategory;
    images: string[];
    createdAt: string;
    isAvailable: boolean;
    featured?: boolean;
  }>;
  const details = read("productDetails.json") as Record<
    string,
    {
      descriptionHtml: string;
      videoUrl?: string;
      materials: string[];
      printTechnology: PrintTechnology;
      widthCm: number;
      depthCm: number;
      scale: string;
      scaleComparisonObject: string;
      gallery: string[];
    }
  >;

  const insert = target.prepare(INSERT_SQL);

  products.forEach((p, index) => {
    const d = details[p.id];
    if (!d) return;
    // Minden kép egy listában; a bélyegkép az első kártyakép.
    const images = [
      ...p.images,
      ...d.gallery.filter((g) => !p.images.includes(g)),
    ];
    insert.run(
      p.id,
      p.title,
      p.slug,
      p.shortDescription,
      p.price,
      p.currency,
      p.heightCm,
      p.scale ?? null,
      d.scale,
      JSON.stringify(p.tags),
      p.category,
      JSON.stringify(images),
      p.images[0] ?? "",
      p.createdAt,
      p.isAvailable ? 1 : 0,
      p.featured ? 1 : 0,
      (p as { isShippable?: boolean }).isShippable ? 1 : 0,
      d.descriptionHtml,
      d.videoUrl ?? null,
      JSON.stringify(d.materials),
      d.printTechnology,
      d.widthCm,
      d.depthCm,
      d.scaleComparisonObject,
      SHOP_URL,
      "[]",
      index
    );
  });
}

/** Címből generált URL-kulcs (pl. "Sárkány Úr" -> "sarkany-ur"). */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Egyedi, ütközésmentes id generálása (termek, termek-2, termek-3 ...). */
function uniqueId(target: DatabaseSync, base: string): string {
  const exists = (id: string) =>
    target.prepare("SELECT 1 FROM products WHERE id = ?").get(id) !== undefined;
  if (!exists(base)) return base;
  let n = 2;
  while (exists(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Új termék felvétele. Visszaadja a generált id-t. */
export function createProduct(input: ProductInput): { id: string } {
  const target = getDb();
  const id = uniqueId(target, slugify(input.title) || "termek");
  // Az új termék a saját sorrend VÉGÉRE kerül (a portfólió/kiemeltek aljára).
  const { max } = target
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS max FROM products")
    .get() as unknown as { max: number };
  target
    .prepare(INSERT_SQL)
    .run(
      id,
      input.title,
      id,
      input.shortDescription,
      input.price,
      input.currency,
      input.heightCm,
      input.scale,
      input.scale,
      JSON.stringify(input.tags),
      input.category,
      JSON.stringify(input.images),
      input.thumbnail,
      input.createdAt,
      input.isAvailable ? 1 : 0,
      input.featured ? 1 : 0,
      input.isShippable ? 1 : 0,
      input.descriptionHtml,
      input.videoUrl,
      JSON.stringify(input.materials),
      input.printTechnology,
      input.widthCm,
      input.depthCm,
      input.scaleComparisonObject,
      input.externalShopUrl,
      "[]",
      max + 1
    );
  return { id };
}

/** Meglévő termék minden mezőjének frissítése. */
export function updateProduct(id: string, input: ProductInput): boolean {
  const result = getDb()
    .prepare(`
      UPDATE products SET
        title = ?, slug = ?, short_description = ?, price = ?, currency = ?,
        height_cm = ?, scale = ?, detail_scale = ?, tags = ?, category = ?,
        images = ?, thumbnail = ?, created_at = ?, is_available = ?,
        featured = ?, is_shippable = ?, description_html = ?, video_url = ?,
        materials = ?, print_technology = ?, width_cm = ?, depth_cm = ?,
        scale_comparison = ?, external_shop_url = ?
      WHERE id = ?
    `)
    .run(
      input.title,
      id,
      input.shortDescription,
      input.price,
      input.currency,
      input.heightCm,
      input.scale,
      input.scale,
      JSON.stringify(input.tags),
      input.category,
      JSON.stringify(input.images),
      input.thumbnail,
      input.createdAt,
      input.isAvailable ? 1 : 0,
      input.featured ? 1 : 0,
      input.isShippable ? 1 : 0,
      input.descriptionHtml,
      input.videoUrl,
      JSON.stringify(input.materials),
      input.printTechnology,
      input.widthCm,
      input.depthCm,
      input.scaleComparisonObject,
      input.externalShopUrl,
      id
    );
  return (result as { changes: number }).changes > 0;
}

/** Termék árának gyors frissítése (admin lista). */
export function updateProductPrice(id: string, price: number): boolean {
  const result = getDb()
    .prepare("UPDATE products SET price = ? WHERE id = ?")
    .run(price, id);
  return (result as { changes: number }).changes > 0;
}

/** Termék törlése (a feed-elemet is eltávolítja). */
export function deleteProduct(id: string): boolean {
  const result = getDb().prepare("DELETE FROM products WHERE id = ?").run(id);
  getDb().prepare("DELETE FROM feed_entries WHERE product_id = ?").run(id);
  return (result as { changes: number }).changes > 0;
}

// ---------------------------------------------------------------------------
// XML feed (Facebook / Meta dinamikus hirdetések)
// ---------------------------------------------------------------------------

/** Egy termék feed-bejegyzése, vagy undefined ha nincs a feedben. */
export function getFeedEntry(productId: string): StoredFeedEntry | undefined {
  const row = getDb()
    .prepare("SELECT * FROM feed_entries WHERE product_id = ?")
    .get(productId) as unknown as FeedEntryRow | undefined;
  return row ? rowToFeedEntry(row) : undefined;
}

/** A feedben szereplő termékek id-i (a jelöléshez az admin listában). */
export function getFeedProductIds(): string[] {
  const rows = getDb()
    .prepare("SELECT product_id FROM feed_entries")
    .all() as unknown as Array<{ product_id: string }>;
  return rows.map((r) => r.product_id);
}

/** Minden feed-bejegyzés (a nyilvános XML generálásához). */
export function getAllFeedEntries(): StoredFeedEntry[] {
  const rows = getDb()
    .prepare("SELECT * FROM feed_entries ORDER BY updated_at DESC")
    .all() as unknown as FeedEntryRow[];
  return rows.map(rowToFeedEntry);
}

/** Feed-bejegyzés létrehozása vagy felülírása. */
export function upsertFeedEntry(
  productId: string,
  fields: FeedEntryFields
): void {
  getDb().prepare(UPSERT_FEED_SQL).run(
    productId,
    fields.feedId,
    fields.title,
    fields.description,
    fields.availability,
    fields.condition,
    fields.price,
    fields.link,
    fields.imageLink,
    fields.brand,
    fields.googleProductCategory,
    fields.gtin,
    fields.mpn,
    fields.itemGroupId,
    fields.color,
    fields.size,
    fields.material,
    fields.pattern,
    fields.gender,
    fields.ageGroup,
    fields.additionalImageLink,
    fields.salePrice,
    fields.customLabel0,
    fields.customLabel1,
    fields.customLabel2,
    fields.customLabel3,
    fields.customLabel4,
    fields.videoLink,
    fields.shipping,
    fields.weight,
    fields.unitPricingMeasure,
    fields.quantityToSellOnFacebook,
    new Date().toISOString()
  );
}

/** Feed-bejegyzés eltávolítása. */
export function deleteFeedEntry(productId: string): boolean {
  const result = getDb()
    .prepare("DELETE FROM feed_entries WHERE product_id = ?")
    .run(productId);
  return (result as { changes: number }).changes > 0;
}

function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    shortDescription: r.short_description,
    price: r.price,
    currency: r.currency,
    dimensions: {
      heightCm: r.height_cm,
      ...(r.scale ? { scale: r.scale } : {}),
    },
    tags: JSON.parse(r.tags) as string[],
    category: r.category,
    images: JSON.parse(r.images) as string[],
    thumbnail: r.thumbnail || (JSON.parse(r.images) as string[])[0] || undefined,
    createdAt: r.created_at,
    isAvailable: r.is_available === 1,
    featured: r.featured === 1,
    isShippable: r.is_shippable === 1,
    sortOrder: r.sort_order,
  };
}

function rowToDetail(r: ProductRow): ProductDetail {
  return {
    ...rowToProduct(r),
    descriptionHtml: r.description_html,
    videoUrl: r.video_url ?? undefined,
    materials: JSON.parse(r.materials) as string[],
    printTechnology: r.print_technology,
    dimensionsDetail: {
      heightCm: r.height_cm,
      widthCm: r.width_cm,
      depthCm: r.depth_cm,
      scale: r.detail_scale ?? r.scale ?? "Egyedi méret",
      scaleComparisonObject: r.scale_comparison,
    },
    externalShopUrl: r.external_shop_url,
  };
}

/** Minden termék a saját (drag&drop) sorrendben — ez a portfólió
 *  alapértelmezett „Ajánlott sorrendje". Ahol nincs megadva, a dátum dönt. */
export function getProducts(): Product[] {
  const rows = getDb()
    .prepare("SELECT * FROM products ORDER BY sort_order ASC, created_at DESC")
    .all() as unknown as ProductRow[];
  return rows.map(rowToProduct);
}

/** A teljes készlet ártartománya (min–max Ft), a szűrőktől függetlenül. */
export function getPriceRange(): { min: number; max: number } | null {
  const row = getDb()
    .prepare("SELECT MIN(price) AS min, MAX(price) AS max FROM products")
    .get() as unknown as { min: number | null; max: number | null };
  if (row.min === null || row.max === null) return null;
  return { min: row.min, max: row.max };
}

// ---------------------------------------------------------------------------
// Szerveroldali szűrés és rendezés (admin lista / admin API)
// ---------------------------------------------------------------------------

export type ProductQuerySort =
  | "sortOrder"
  | "createdAt"
  | "title"
  | "category"
  | "price"
  | "featured"
  | "isAvailable";

export interface ProductQuery {
  /** Cím / kategória / címke szöveg (ékezetmentesen). */
  q?: string;
  category?: ProductCategory | "all";
  available?: "all" | "yes" | "no";
  featured?: "all" | "yes" | "no";
  /** A termék szerepel-e az XML feedben. */
  inFeed?: "all" | "yes" | "no";
  /** Ártartomány-szűrő (Ft, opcionális). */
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductQuerySort;
  dir?: "asc" | "desc";
  /** 1-alapú oldalszám (lapozás, alap: 1). */
  page?: number;
}

/** Hány termék jelenik meg egy admin listaoldalon. */
export const ADMIN_PAGE_SIZE = 25;

const QUERY_SORTS: ProductQuerySort[] = [
  "sortOrder",
  "createdAt",
  "title",
  "category",
  "price",
  "featured",
  "isAvailable",
];

/** URL-keresési paraméterekből biztonságos ProductQuery (whitelist). */
export function parseProductQuery(
  params: Record<string, string | string[] | undefined>
): ProductQuery {
  const get = (key: string): string | undefined =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;
  const oneOf = <T extends string>(v: string | undefined, list: readonly T[]): T | undefined =>
    v !== undefined && (list as readonly string[]).includes(v)
      ? (v as T)
      : undefined;
  const price = (v: string | undefined): number | undefined => {
    if (!v) return undefined;
    const n = Number(v.replace(/\s+/g, "").replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const rawPage = get("page");
  const pageNum = rawPage ? Number(rawPage) : NaN;
  // A kategória szabadon bővíthető (az adminból új is létrehozható), ezért
  // nem whitelistelünk: bármilyen megadott érték érvényes, a WHERE illesztés
  // gondoskodik róla, hogy ismeretlen kategória üres listát adjon.
  const rawCategory = get("category")?.trim() ?? "";
  return {
    q: get("q")?.trim() ?? "",
    category: rawCategory && rawCategory !== "all" ? rawCategory : "all",
    available: oneOf(get("available"), ["yes", "no"] as const) ?? "all",
    featured: oneOf(get("featured"), ["yes", "no"] as const) ?? "all",
    inFeed: oneOf(get("feed") ?? get("inFeed"), ["yes", "no"] as const) ?? "all",
    minPrice: price(get("min")),
    maxPrice: price(get("max")),
    sort: oneOf(get("sort"), QUERY_SORTS) ?? "sortOrder",
    dir: oneOf(get("dir"), ["asc", "desc"] as const) ?? "asc",
    page: Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1,
  };
}

/**
 * Termékek szűrése és rendezése szerveroldalon (admin lista + GET API).
 * A kategória/elérhető/kiemelt/feed feltételek SQL-ben futnak, a szöveges
 * keresés és a rendezés JS-ben (ékezetmentes egyezés, magyar rendezés).
 */
export function queryProducts(query: ProductQuery = {}): {
  products: Product[];
  /** Az összes termék száma (a szűrőktől függetlenül). */
  total: number;
  /** A szűrőknek megfelelő termékek száma (a lapozás előtt). */
  filtered: number;
  /** Aktuális oldal (1-alapú, túl nagy érték esetén az utolsó oldalra vágva). */
  page: number;
  pageCount: number;
} {
  const db = getDb();

  const clauses: string[] = [];
  const args: Array<string | number> = [];
  if (query.category && query.category !== "all") {
    clauses.push("p.category = ?");
    args.push(query.category);
  }
  if (query.available === "yes") clauses.push("p.is_available = 1");
  else if (query.available === "no") clauses.push("p.is_available = 0");
  if (query.featured === "yes") clauses.push("p.featured = 1");
  else if (query.featured === "no") clauses.push("p.featured = 0");
  if (query.inFeed === "yes") {
    clauses.push(
      "EXISTS (SELECT 1 FROM feed_entries f WHERE f.product_id = p.id)"
    );
  } else if (query.inFeed === "no") {
    clauses.push(
      "NOT EXISTS (SELECT 1 FROM feed_entries f WHERE f.product_id = p.id)"
    );
  }
  if (query.minPrice !== undefined) {
    clauses.push("p.price >= ?");
    args.push(query.minPrice);
  }
  if (query.maxPrice !== undefined) {
    clauses.push("p.price <= ?");
    args.push(query.maxPrice);
  }

  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const rows = db
    .prepare(`SELECT * FROM products p${where}`)
    .all(...args) as unknown as ProductRow[];
  let products = rows.map(rowToProduct);

  // Szöveges keresés: cím, kategória és címkék, ékezetmentesen
  const q = (query.q ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (q) {
    products = products.filter((p) => {
      const hay = [p.title, p.category, ...p.tags]
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return hay.includes(q);
    });
  }

  // Rendezés (magyar collation, stabil)
  const dir = query.dir === "asc" ? 1 : -1;
  const sort = query.sort ?? "sortOrder";
  products.sort((a, b) => {
    // Az „Összes termék" nézetben (available=all) a nem elérhető (elkelt)
    // termékek MINDIG a lista végére kerülnek, függetlenül a választott
    // rendezéstől — így az aktív készlet mindig elöl van.
    const allView = query.available === "all" || query.available === undefined;
    if (allView && a.isAvailable !== b.isAvailable) {
      return a.isAvailable ? -1 : 1;
    }
    // Kiemelt / Elérhető: az aktív (bekapcsolt) értékek MINDIG elöl vannak,
    // iránytól függetlenül — a nyíl csak a csoporton belüli másodlagos
    // rendezést (feltöltési dátum) váltja át.
    if (sort === "featured" || sort === "isAvailable") {
      const isActive = (p: Product) =>
        sort === "featured" ? !!p.featured : p.isAvailable;
      const aActive = isActive(a) ? 1 : 0;
      const bActive = isActive(b) ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return (
        new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime()
      ) * dir;
    }
    let cmp = 0;
    switch (sort) {
      case "title":
        cmp = a.title.localeCompare(b.title, "hu");
        break;
      case "category":
        cmp = a.category.localeCompare(b.category, "hu");
        break;
      case "price":
        cmp = a.price - b.price;
        break;
      case "sortOrder":
        cmp = a.sortOrder - b.sortOrder;
        break;
      default:
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return cmp * dir;
  });

  // Lapozás: mindig az aktuális szűrt/rendezett halmazon, a rendezés után.
  const filtered = products.length;
  const pageCount = Math.max(1, Math.ceil(filtered / ADMIN_PAGE_SIZE));
  const page = Math.min(Math.max(1, query.page ?? 1), pageCount);
  const start = (page - 1) * ADMIN_PAGE_SIZE;
  products = products.slice(start, start + ADMIN_PAGE_SIZE);

  const total = (
    db.prepare("SELECT COUNT(*) AS count FROM products").get() as unknown as {
      count: number;
    }
  ).count;

  return { products, total, filtered, page, pageCount };
}

/** Egy termék logikai flagjének frissítése (featured / is_available). */
export function updateProductFlag(
  id: string,
  field: "featured" | "is_available",
  value: boolean
): boolean {
  const column = field; // whitelist: csak a két engedélyezett oszlopnév
  const result = getDb()
    .prepare(`UPDATE products SET ${column} = ? WHERE id = ?`)
    .run(value ? 1 : 0, id);
  return (result as { changes: number }).changes > 0;
}

/** Kiemelt termékek a főoldalra (featured = 1), legfrissebb elöl.
 *  Az elkelt (nem elérhető) kiemeltek is bekerülhetnek — a kártya
 *  „Elkelt" bélyeget kap rajtuk. */
export function getFeaturedProducts(limit = 4): Product[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM products
       WHERE featured = 1
       ORDER BY sort_order ASC, created_at DESC
       LIMIT ?`
    )
    .all(limit) as unknown as ProductRow[];
  return rows.map(rowToProduct);
}

/**
 * A saját sorrend beállítása drag&drop után. A kliens a látható sorok ÚJ
 * sorrendjét küldi ({ ids }); a szerver ezt a blokkot a globális sorrend
 * elejére helyezi, a többi termék relatív sorrendje változatlan marad.
 * Az admin alap nézetében (nincs szűrő/rendezés, 1. oldal) ez a látható
 * blokk eleve az elején van, így a húzás pontosan azt adja, amit látsz.
 */
export function reorderProducts(ids: string[]): boolean {
  const db = getDb();
  const unique = [...new Set(ids.filter((id) => typeof id === "string"))];
  if (unique.length < 2) return false;
  const rows = db
    .prepare("SELECT id FROM products ORDER BY sort_order ASC, created_at DESC")
    .all() as unknown as Array<{ id: string }>;
  const allIds = rows.map((r) => r.id);
  const given = unique.filter((id) => allIds.includes(id));
  if (given.length < 2) return false;
  const givenSet = new Set(given);
  const rest = allIds.filter((id) => !givenSet.has(id));
  const newOrder = [...given, ...rest];
  const update = db.prepare("UPDATE products SET sort_order = ? WHERE id = ?");
  db.exec("BEGIN");
  try {
    newOrder.forEach((id, index) => update.run(index, id));
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return true;
}

/** Elérhető (megvásárolható) termékek száma. */
export function getAvailableCount(): number {
  const { count } = getDb()
    .prepare("SELECT COUNT(*) AS count FROM products WHERE is_available = 1")
    .get() as unknown as { count: number };
  return count;
}

/** Egy termék teljes részlete, vagy undefined ha nem létezik. */
export function getProductById(id: string): ProductDetail | undefined {
  const row = getDb()
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(id) as unknown as ProductRow | undefined;
  return row ? rowToDetail(row) : undefined;
}

/** Kapcsolódó termékek: először azonos kategória, majd a legfrissebbek. */
export function getRelatedProducts(
  product: Product,
  limit = 4
): Product[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM products
       WHERE id != ? AND is_available = 1
       ORDER BY (category = ?) DESC, created_at DESC
       LIMIT ?`
    )
    .all(product.id, product.category, limit) as unknown as ProductRow[];
  return rows.map(rowToProduct);
}

// A címkék megjelenítési sorrendje (stabil, kézzel tartott)
const TAG_ORDER = [
  "Fantasy",
  "Sci-Fi",
  "Cyberpunk",
  "Horror",
  "Other",
  "Bust / Mellszobor",
  "Miniatűr",
  "1:6 Méret",
  "1:8 Méret",
  "1:10 Méret",
  "Display Plinth",
  "Kézzel festett",
  "Limitált",
  "OSL",
  "NMM",
  "Játékminőség",
];

/** Az adatbázisban ténylegesen előforduló címkék, megjelenítési sorrendben.
 *  MINDEN előforduló címkét visszaad — nem csak a TAG_ORDER (ajánlott) listán
 *  szereplőket, így az egyedi címkék is mindig megjelennek a választóban.
 *  Sorrend: a kurált TAG_ORDER elemei előbb, a többi betűrendben. */
export function getTagOptions(): string[] {
  const rows = getDb()
    .prepare("SELECT tags FROM products")
    .all() as unknown as Array<{ tags: string }>;
  const present = new Set(
    rows.flatMap((r) => JSON.parse(r.tags) as string[])
  );
  const ordered = TAG_ORDER.filter((tag) => present.has(tag));
  const rest = [...present]
    .filter((tag) => !TAG_ORDER.includes(tag))
    .sort((a, b) => a.localeCompare(b, "hu"));
  return [...ordered, ...rest];
}

/**
 * A használatban lévő kategóriák (az admin választóhoz és a szűrőhöz),
 * betűrendben. A kategóriák dinamikusan bővülnek, ahogy újakat adsz meg.
 */
export function getCategoryOptions(): string[] {
  const rows = getDb()
    .prepare(
      "SELECT DISTINCT category FROM products WHERE category <> '' ORDER BY category COLLATE NOCASE"
    )
    .all() as unknown as Array<{ category: string }>;
  return rows.map((r) => r.category);
}

/** Elérhető méretarányok (pl. "1:6") a szűrőhöz, növekvő sorrendben. */
export function getScaleOptions(): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT scale FROM products WHERE scale IS NOT NULL")
    .all() as unknown as Array<{ scale: string }>;
  return rows
    .map((r) => r.scale)
    .sort((a, b) => {
      const num = (s: string) => parseFloat(s.split(":")[0]) || 0;
      return num(a) - num(b);
    });
}
