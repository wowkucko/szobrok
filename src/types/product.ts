/**
 * Egy termék kategóriája. A kategóriák dinamikusan bővíthetők: az admin
 * feltöltőben a meglévőkből lehet választani, vagy újat lehet beírni.
 * Alapértelmezett kategóriák: Fantasy, Sci-Fi, Cyberpunk, Horror, Other.
 */
export type ProductCategory = string;

export interface Product {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  price: number;
  currency: string;
  dimensions: {
    heightCm: number;
    scale?: string; // pl. "1:6"
  };
  tags: string[];
  category: ProductCategory;
  /** Minden kép egyben (kártya + galéria). */
  images: string[];
  /** A bélyegképként megjelölt kép URL-je; ha üres, az images[0] a bélyegkép. */
  thumbnail?: string;
  createdAt: string; // ISO dátum a rendezéshez
  isAvailable: boolean;
  featured?: boolean; // kiemelt a főoldalon
  /** Biztonságosan szállítható (pl. csomagautomatába). */
  isShippable?: boolean;
  /** Saját sorrend (az admin táblázatban drag&droppal állítható).
   *  Ez adja a portfólió és a kiemeltek alapértelmezett sorrendjét. */
  sortOrder: number;
}

export type PrintTechnology = "MSLA Resin (12K)" | "FDM (0.08 mm)";

export interface ProductDetail extends Product {
  descriptionHtml: string;
  videoUrl?: string; // HTML5 mp4 vagy YouTube embed URL
  materials: string[]; // pl. ['ABS-like resin', 'Vallejo Acrylics', 'Matt Varnish']
  printTechnology: PrintTechnology;
  dimensionsDetail: {
    heightCm: number;
    widthCm: number;
    depthCm: number;
    scale: string;
    scaleComparisonObject: string; // pl. "330ml Can"
  };
  externalShopUrl: string; // Etsy/Shopify link
}
