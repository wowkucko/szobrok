import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { Product } from "@/types/product";
import { generateCollageOgImage } from "./ogImage";
import {
  cardThumbFileName,
  cardThumbUrlFor,
  galleryThumbFileName,
  galleryThumbUrlFor,
} from "./imageUrls";
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

/** A kollázs fájlneve az első kép alapján (vagy null, ha nincs feltöltött kép).
 *  A „v2" verziójú név biztosítja, hogy a korábbi (középre vágott) kollázsok
 *  helyett a frissítés után automatikusan az új, figyelem-alapú vágásúak
 *  készüljenek el — a régi fájlokat a rendszer egyszerűen figyelmen kívül hagyja. */
export function collageFileName(images: string[]): string | null {
  const first = images[0];
  if (!first || !first.startsWith("/api/files/")) return null;
  const base = first.replace(/^\/api\/files\//, "").replace(/\.[a-z0-9]+$/i, "");
  return `og-collage-v2-${base}.png`;
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

// ---------------------------------------------------------------------------
// Kártya-bélyegképek (4:5 arányú, figyelem-alapú vágású változat)
// ---------------------------------------------------------------------------

/** A termékkártyák képaránya és a generált bélyegkép mérete. */
export const CARD_THUMB_WIDTH = 800;
export const CARD_THUMB_HEIGHT = 1000; // 4:5
/** A részletek-oldali galéria fő képének mérete (retina-éles, 4:5). */
export const GALLERY_THUMB_WIDTH = 1200;
export const GALLERY_THUMB_HEIGHT = 1500; // 4:5

export {
  cardThumbFileName,
  cardThumbUrlFor,
  galleryThumbFileName,
  galleryThumbUrlFor,
};

/**
 * 4:5 arányú, figyelem-alapú vágású JPEG generálása a megadott méretben.
 * Portré fotónál az alak feje/vállai maradnak benne, tájoltnál a középpont
 * (ugyanaz, amit a böngésző eddig center-croppal adott).
 *
 * A JPEG (q85 mozjpeg) fotóknál jóval kisebb, mint a PNG — így gyors a
 * betöltés, minőségromlás nélkül. Hiba esetén null.
 */
async function generateCroppedJpeg(
  buffer: Uint8Array,
  width: number,
  height: number
): Promise<Buffer | null> {
  try {
    const meta = await sharp(buffer, { failOn: "none" }).metadata();
    const portrait = (meta.width ?? 1) < (meta.height ?? 1);
    const encode = (p: string) =>
      sharp(buffer, { failOn: "none" })
        .resize(width, height, { fit: "cover", position: p })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
    try {
      return await encode(portrait ? "attention" : "centre");
    } catch {
      // attention nem támogatott → portrénál fentről vágunk
      return await encode(portrait ? "north" : "centre");
    }
  } catch {
    return null;
  }
}

/** Kártya-bélyegkép generálása és mentése egy feltöltött képből. */
export async function generateCardThumbForImage(
  imageUrl: string
): Promise<string | null> {
  try {
    const name = cardThumbFileName(imageUrl);
    if (!name) return null;
    const file = localPathForImage(imageUrl);
    if (!file || !existsSync(file)) return null;
    const jpeg = await generateCroppedJpeg(
      readFileSync(file),
      CARD_THUMB_WIDTH,
      CARD_THUMB_HEIGHT
    );
    if (!jpeg) return null;
    writeFileSync(path.join(UPLOAD_DIR, name), jpeg);
    return `/api/files/${name}`;
  } catch {
    return null;
  }
}

/** Galéria-főkép generálása és mentése egy feltöltött képből. */
export async function generateGalleryThumbForImage(
  imageUrl: string
): Promise<string | null> {
  try {
    const name = galleryThumbFileName(imageUrl);
    if (!name) return null;
    const file = localPathForImage(imageUrl);
    if (!file || !existsSync(file)) return null;
    const jpeg = await generateCroppedJpeg(
      readFileSync(file),
      GALLERY_THUMB_WIDTH,
      GALLERY_THUMB_HEIGHT
    );
    if (!jpeg) return null;
    writeFileSync(path.join(UPLOAD_DIR, name), jpeg);
    return `/api/files/${name}`;
  } catch {
    return null;
  }
}
