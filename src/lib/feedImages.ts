import { existsSync } from "node:fs";
import path from "node:path";
import { SITE_URL } from "./feed";

// ---------------------------------------------------------------------------
// Feed kép-ellenőrzés: a feedben szereplő kép URL-ekről eldönti, hogy
// létező fájlra mutatnak-e. Kizárólag szerver-oldali használatra.
// ---------------------------------------------------------------------------

export interface FeedImageCheck {
  /** A vizsgált URL (a feedben szereplő formában). */
  url: string;
  /** Létezik-e a fájl (külső URL-nél true, mert nem tudjuk ellenőrizni). */
  ok: boolean;
  /** True, ha ténylegesen le tudtuk ellenőrizni a fájlt a lemezen. */
  checked: boolean;
}

/**
 * Egyetlen kép URL ellenőrzése:
 *  - /images/...   → a public könyvtárban keres
 *  - /api/files/…  → a data/uploads könyvtárban keres
 *  - külső http(s) URL → nem ellenőrizhető helyben (checked: false)
 */
export function checkFeedImage(url: string): FeedImageCheck {
  const trimmed = url.trim();
  if (trimmed === "") return { url: trimmed, ok: true, checked: false };

  let rel = trimmed;
  if (/^https?:\/\//i.test(rel)) {
    if (rel.startsWith(SITE_URL)) {
      rel = rel.slice(SITE_URL.length);
    } else {
      // Külső URL — helyben nem tudjuk ellenőrizni.
      return { url: trimmed, ok: true, checked: false };
    }
  }

  let filePath: string | null = null;
  if (rel.startsWith("/images/")) {
    filePath = path.join(process.cwd(), "public", rel.replace(/^\/+/, ""));
  } else if (rel.startsWith("/api/files/")) {
    const name = path.basename(rel);
    filePath = path.join(process.cwd(), "data", "uploads", name);
  }

  if (!filePath) return { url: trimmed, ok: true, checked: false };
  return { url: trimmed, ok: existsSync(filePath), checked: true };
}

export interface ProductImageCheck {
  imageLink: FeedImageCheck;
  additional: FeedImageCheck[];
}

/** A termék bélyegképének és többi képének ellenőrzése (ahogy a feedben megjelennek). */
export function checkProductFeedImages(product: {
  images: string[];
  thumbnail?: string;
}): ProductImageCheck {
  const thumbnail = product.thumbnail ?? product.images[0] ?? "";
  return {
    imageLink: checkFeedImage(thumbnail),
    additional: product.images
      .filter((img) => img !== thumbnail)
      .map(checkFeedImage),
  };
}

/** A hibás (nem létező) kép URL-ek listája. */
export function brokenFeedImages(product: {
  images: string[];
  thumbnail?: string;
}): string[] {
  const { imageLink, additional } = checkProductFeedImages(product);
  return [imageLink, ...additional]
    .filter((c) => c.checked && !c.ok)
    .map((c) => c.url);
}
