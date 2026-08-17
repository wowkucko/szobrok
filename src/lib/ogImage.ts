import sharp from "sharp";

/** A Meta / Facebook által ajánlott OG-kép méret. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
/** A weboldal sötét alapszíne (zinc-950) — a portré képek kerete. */
const OG_BACKGROUND = "#09090b";
/** Ez alatt a képarány alatt „álló" képként kezeljük: nem vágunk, hanem keretezünk. */
const PORTRAIT_ASPECT = 1.2;

/**
 * OG-kompatibilis (1200×630) PNG generálása bármilyen feltöltött képből,
 * hogy a közösségi megosztás meta mindig készen álljon.
 *
 * - Táj / közel négyzetes (képarány ≥ 1.2): kitölti a teljes kártyát (cover),
 *   nincs sáv — a kép lényege a középpontban marad.
 * - Álló / portré: a sötét márkaháttéren (zinc-950) középen jelenik meg
 *   (contain) — a szobor sosem vágódik le, a kártya illeszkedik az oldal
 *   stílusához.
 *
 * A JPEG/PNG/WebP mellett a GIF (első képkocka) és az SVG (kirajzolva) is
 * támogatott. Hiba esetén null-t ad vissza — a feltöltés sosem bukik el emiatt.
 */
export async function generateOgImage(
  buffer: Uint8Array
): Promise<Buffer | null> {
  try {
    const meta = await sharp(buffer, { failOn: "none" }).metadata();
    const width = meta.width ?? OG_WIDTH;
    const height = meta.height ?? OG_HEIGHT;
    const isLandscape = width / height >= PORTRAIT_ASPECT;

    const pipeline = isLandscape
      ? sharp(buffer, { failOn: "none" }).resize(OG_WIDTH, OG_HEIGHT, {
          fit: "cover",
          position: "centre",
        })
      : sharp(buffer, { failOn: "none" }).resize(OG_WIDTH, OG_HEIGHT, {
          fit: "contain",
          background: OG_BACKGROUND,
        });

    return await pipeline
      .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 9 })
      .toBuffer();
  } catch {
    return null;
  }
}
