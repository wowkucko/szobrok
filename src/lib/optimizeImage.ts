import sharp from "sharp";

export interface OptimizedImage {
  data: Buffer;
  /** A tömörített fájl kanonikus kiterjesztése. */
  ext: ".jpg" | ".png" | ".webp";
}

// JPEG: mozjpeg-kódolóval észrevehetetlen minőségromlás mellett a legjobb tömörítés.
const JPEG_QUALITY = 88;
// WebP átlátszóság nélkül: magas minőségű veszteséges kódolás.
const WEBP_QUALITY = 90;

/**
 * Minőségtartó kép-tömörítés feltöltéskor.
 *
 * - JPEG → mozjpeg (azonos minőségnél jobban tömörít), EXIF metaadatok eltávolítva,
 *   az orientáció a képbe égetve (.rotate()).
 * - PNG  → maximális veszteségmentes tömörítés, az alfa-csatorna érintetlen.
 * - WebP → átlátszóság esetén veszteségmentes, egyébként magas minőségű.
 * - SVG / GIF / videók → nincs feldolgozás (null).
 *
 * A felbontás (részletgazdagság) SOHA nem csökken: csak újrakódolás és
 * metaadat-tisztítás történik. Ha a tömörítés meghiúsul vagy nem jár kisebb
 * fájllal, null-t ad vissza — a hívó ilyenkor az eredeti fájlt menti el.
 */
export async function optimizeImage(
  buffer: Uint8Array,
  mime: string
): Promise<OptimizedImage | null> {
  try {
    if (mime === "image/jpeg") {
      const data = await sharp(buffer, { failOn: "none" })
        .rotate()
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
      if (data.length >= buffer.length) return null;
      return { data, ext: ".jpg" };
    }

    if (mime === "image/png") {
      const data = await sharp(buffer, { failOn: "none" })
        .rotate()
        .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
        .toBuffer();
      if (data.length >= buffer.length) return null;
      return { data, ext: ".png" };
    }

    if (mime === "image/webp") {
      const meta = await sharp(buffer, { failOn: "none" }).metadata();
      const data = meta.hasAlpha
        ? await sharp(buffer, { failOn: "none" })
            .rotate()
            .webp({ lossless: true, effort: 6 })
            .toBuffer()
        : await sharp(buffer, { failOn: "none" })
            .rotate()
            .webp({ quality: WEBP_QUALITY })
            .toBuffer();
      if (data.length >= buffer.length) return null;
      return { data, ext: ".webp" };
    }

    return null; // svg, gif, videó
  } catch {
    // Feldolgozási hiba esetén az eredeti fájl kerül mentésre — soha ne bukjon el a feltöltés.
    return null;
  }
}
