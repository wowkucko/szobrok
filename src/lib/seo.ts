import type { Product } from "@/types/product";

/** A nyilvános oldal abszolút címe (a feed és a meta tag-ek is ezt használják). */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://festettszobrok.com";

export const SITE_NAME = "Festett Szobrok";

export const SITE_DESCRIPTION =
  "Kézzel festett, 3D nyomtatott szobrok és gyűjtői figurák — egyedi megrendelés, prémium műgyanta nyomtatás és kézi akril festés.";

/** Relatív útvonalból (vagy meglévő abszolút URL-ből) abszolút URL. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return new URL(path, SITE_URL).toString();
}

/**
 * A megosztáshoz (OG / Twitter kártya) használható RASTER kép URL.
 * A böngészők és a crawler-ek az SVG-t nem mindenhol fogadják el OG képként,
 * ezért az SVG bélyegképek mellé generált PNG változatot adjuk vissza.
 */
export function ogImageFor(
  product: Pick<Product, "thumbnail" | "images">
): string {
  const thumb = product.thumbnail ?? product.images[0];
  if (!thumb) return absoluteUrl("/images/og-default.png");

  // Feltöltött kép (/api/files/…): a feltöltéskor automatikusan generált
  // OG-PNG verzió. A név determinisztikus (og-<base>.png), így mindig létezik.
  if (thumb.startsWith("/api/files/")) {
    const base = thumb
      .replace(/^\/api\/files\//, "")
      .replace(/\.(jpe?g|png|webp|gif|svg)$/i, "");
    return absoluteUrl(`/api/files/og-${base}.png`);
  }

  // Az SVG bélyegképek mellé generált PNG változat (a crawler-ek nem
  // fogadják el az SVG-t OG képként).
  if (thumb.endsWith(".svg")) {
    if (thumb.startsWith("/images/portfolio/")) {
      const name = thumb.replace("/images/portfolio/", "").replace(/\.svg$/, "");
      return absoluteUrl(`/images/og/${name}.png`);
    }
    return absoluteUrl(thumb.replace(/\.svg$/, ".png"));
  }
  return absoluteUrl(thumb);
}

/**
 * A termék Kollázs-OG-képének URL-je (a közösségi megosztás előnézete):
 * az első 4 fotó 2×2-es összeállítása a jobb alsó sarokban az árral.
 * Csak feltöltött képeknél létezik (determinisztikus név az első képből);
 * a hiányzó kollázst a /api/files route menet közben előállítja. Ha nincs
 * feltöltött kép, null — ilyenkor a sima egyképes ogImageFor a tartalék.
 */
export function ogCollageFor(
  product: Pick<Product, "images">
): string | null {
  const first = product.images[0];
  if (!first || !first.startsWith("/api/files/")) return null;
  const base = first
    .replace(/^\/api\/files\//, "")
    .replace(/\.(jpe?g|png|webp|gif|svg)$/i, "");
  return absoluteUrl(`/api/files/og-collage-${base}.png`);
}
