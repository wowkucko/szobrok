import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Product } from "@/types/product";
import { generateCollageOgImage } from "./ogImage";
import { getProductById, getProducts } from "./db";

/**
 * Kollázs OG-kép (a közösségi megosztás előnézete) a termék első 4 fotójából.
 *
 * A generált fájl a feltöltött képek mellett tárolódik (data/uploads), a neve
 * az ELSŐ kép nevéből determinisztikusan képződik (og-collage-<base>.png),
 * így a meta mindig le tudja képezni rá. Ha a termék képei változnak, a
 * kollázs automatikusan újragenerálódik mentéskor.
 */

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const PUBLIC_DIR = path.join(process.cwd(), "public");

/** Lokális lemezútvonal egy webes kép URL-ből (csak a saját fájljaink). */
export function localPathForImage(url: string): string | null {
  if (url.startsWith("/api/files/")) {
    const name = url.replace(/^\/api\/files\//, "");
    // Útvonal-traversal elleni védelem: csak egyszerű fájlnév
    if (!/^[A-Za-z0-9._-]+$/.test(name)) return null;
    return path.join(UPLOAD_DIR, name);
  }
  if (url.startsWith("/images/")) {
    return path.join(PUBLIC_DIR, url.replace(/^\//, ""));
  }
  // Külső (https://…) képet nem tudunk lemezről olvasni — nincs kollázs.
  return null;
}

/** A kollázs fájlneve az első kép alapján (vagy null, ha nincs feltöltött kép). */
export function collageFileName(images: string[]): string | null {
  const first = images[0];
  if (!first || !first.startsWith("/api/files/")) return null;
  const base = first.replace(/^\/api\/files\//, "").replace(/\.[a-z0-9]+$/i, "");
  return `og-collage-${base}.png`;
}

/** A kollázs webes URL-je a termék képei alapján (vagy null). */
export function collageUrlFor(images: string[]): string | null {
  const name = collageFileName(images);
  return name ? `/api/files/${name}` : null;
}

/** A termék első (legfeljebb) 4 képének bináris tartalma — hiányzókat kihagyja. */
export function readProductImages(images: string[], limit = 4): Uint8Array[] {
  const out: Uint8Array[] = [];
  for (const url of images.slice(0, limit)) {
    const file = localPathForImage(url);
    if (!file || !existsSync(file)) continue;
    out.push(readFileSync(file));
  }
  return out;
}

/**
 * Kollázs generálása és mentése egy termékhez. Visszaadja a URL-t, vagy
 * null-t, ha nincs feltöltött kép / nem generálható (sosem dob hibát).
 */
export async function generateProductCollage(
  product: Pick<Product, "images" | "price" | "currency" | "isAvailable">
): Promise<string | null> {
  try {
    const name = collageFileName(product.images);
    if (!name) return null;
    const buffers = readProductImages(product.images, 4);
    if (buffers.length === 0) return null;
    const png = await generateCollageOgImage(buffers, {
      price: product.price,
      currency: product.currency,
      isAvailable: product.isAvailable,
    });
    if (!png) return null;
    writeFileSync(path.join(UPLOAD_DIR, name), png);
    return `/api/files/${name}`;
  } catch {
    return null;
  }
}

/**
 * Hiányzó kollázsok pótlása MINDEN termékhez (a már meglévőket érintetlenül
 * hagyja). A migrációhoz és a „csak egyszer fusson le" helyzetekhez.
 */
export async function ensureAllCollages(): Promise<{
  ok: number;
  skipped: number;
  failed: number;
}> {
  let ok = 0;
  let skipped = 0;
  let failed = 0;
  for (const product of getProducts()) {
    const name = collageFileName(product.images);
    if (!name || existsSync(path.join(UPLOAD_DIR, name))) {
      skipped += 1;
      continue;
    }
    const url = await generateProductCollage(product);
    if (url) ok += 1;
    else failed += 1;
  }
  return { ok, skipped, failed };
}

/** Egy termék kollázsának frissítése id alapján (mentés után). */
export async function refreshCollageForProduct(id: string): Promise<string | null> {
  const product = getProductById(id);
  if (!product) return null;
  return generateProductCollage(product);
}
