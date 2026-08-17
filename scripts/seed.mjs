#!/usr/bin/env node
// Termék adatbázis inicializálása (SQLite) a JSON adatfájlokból.
// Futtatás: npm run seed  (Node >= 22.5 szükséges a beépített node:sqlite miatt)

import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = path.join(ROOT, "data", "artisanprints.db");

const PRODUCTS = JSON.parse(
  readFileSync(path.join(ROOT, "src", "lib", "data", "products.json"), "utf8")
);
const DETAILS = JSON.parse(
  readFileSync(path.join(ROOT, "src", "lib", "data", "productDetails.json"), "utf8")
);

// TODO: cseréld le a saját webshopod linkjére
const SHOP_URL = "https://www.etsy.com/";

mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`
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
    description_html TEXT NOT NULL,
    video_url TEXT,
    materials TEXT NOT NULL,
    print_technology TEXT NOT NULL,
    width_cm REAL NOT NULL,
    depth_cm REAL NOT NULL,
    scale_comparison TEXT NOT NULL,
    external_shop_url TEXT NOT NULL,
    gallery_images TEXT NOT NULL,
    thumbnail TEXT NOT NULL DEFAULT ''
  )
`);

// Frissíthetőség: mindig a JSON a mérvadó
db.exec("DELETE FROM products");

const insert = db.prepare(`
  INSERT INTO products (
    id, title, slug, short_description, price, currency, height_cm, scale,
    detail_scale, tags, category, images, thumbnail, created_at,
    is_available, featured, description_html, video_url, materials,
    print_technology, width_cm, depth_cm, scale_comparison,
    external_shop_url, gallery_images
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

let count = 0;
for (const p of PRODUCTS) {
  const d = DETAILS[p.id];
  if (!d) {
    console.warn(`  ! nincs részlet a(z) "${p.id}" termékhez — kihagyva`);
    continue;
  }
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
    d.descriptionHtml,
    d.videoUrl ?? null,
    JSON.stringify(d.materials),
    d.printTechnology,
    d.widthCm,
    d.depthCm,
    d.scaleComparisonObject,
    SHOP_URL,
    "[]"
  );
  count += 1;
}

db.close();
console.log(`Adatbázis kész: ${DB_PATH} (${count} termék)`);
