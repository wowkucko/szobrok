import sharp from "sharp";
import type { OverlayOptions } from "sharp";

/** A Meta / Facebook által ajánlott OG-kép méret. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
/** Ez alatt a képarány alatt „álló" (portré) képként kezeljük és figyelem-alapú vágást használunk. */
const PORTRAIT_ASPECT = 1.2;

/**
 * OG-kompatibilis (1200×630) PNG generálása bármilyen feltöltött képből,
 * hogy a közösségi megosztás meta mindig készen álljon.
 *
 * - Táj / közel négyzetes (képarány ≥ 1.2): kitölti a teljes kártyát (cover),
 *   nincs sáv — a kép lényege a középpontban marad.
 * - Álló / portré: figyelem-alapú vágás (cover + attention) — az alak feje és
 *   vállai nagyban, felismerhetően látszódnak, nem kicsinyítve a teljes kép.
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

    if (isLandscape) {
      // Táj / közel négyzetes: kitölti a teljes kártyát (cover), középre
      // fókuszálva — a kép lényege a középpontban marad.
      return await sharp(buffer, { failOn: "none" })
        .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "centre" })
        .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 9 })
        .toBuffer();
    }

    // Álló / portré: figyelem-alapú vágás (cover), hogy az alak feje/vállai
    // nagyban, felismerhetően látszódjanak — nem „contain"-ként kicsinyítve
    // a teljes képet. Ha az attention valamilyen formátumnál nem támogatott,
    // fentről vágunk (a fej így is benne marad).
    try {
      return await sharp(buffer, { failOn: "none" })
        .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "attention" })
        .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 9 })
        .toBuffer();
    } catch {
      return await sharp(buffer, { failOn: "none" })
        .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "north" })
        .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 9 })
        .toBuffer();
    }
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Kollázs OG-kép (közösségi megosztás) — a termék első 4 fotója 2×2 rácsban,
// jobb alsó sarokban az ár (vagy „Elkelt") jelvénnyel, a weboldal stílusában.
// ---------------------------------------------------------------------------

const COLLAGE_BG = "#09090b"; // zinc-950 — az oldal alapszíne
const BADGE_FONT = "'DejaVu Sans', 'Arial', sans-serif";

interface CollageOptions {
  /** A termék ára (Ft / EUR); 0 vagy hiányzó esetén nincs árjelvény. */
  price?: number;
  currency?: string;
  /** false → „Elkelt" jelvény az ár helyett (a kártya stílusával egyezően). */
  isAvailable?: boolean;
}

/** 45000 -> "45 000" (hu-HU formátum, az oldal szerint) */
function formatPriceText(price: number, currency?: string): string {
  const formatted = new Intl.NumberFormat("hu-HU").format(price);
  return currency === "EUR" ? `${formatted} EUR` : `${formatted} Ft`;
}

/**
 * Egy kép cellába vágása úgy, hogy a LÉNYEG mindig látszódjon.
 *
 * A sima középre vágás (cover + centre) álló (portré) fotóknál a képnek csak
 * a középső sávját hagyja meg — egy magas szoborfotónál pont a fej és a
 * talapzat vágódik le, így nem lehet felismerni, mi van a képen.
 *
 * Ezért figyelem-alapú (attention) vágást használunk: a sharp a legérdekesebb
 * régiót keresi meg (éles részletek + bőrtónusok), így az alak feje/vállai
 * benne maradnak a cellában. Ha valamilyen formátumnál az attention nem
 * támogatott, portré képnél fentről, egyébként középről vágunk.
 */
async function resizeCellToFit(
  buffer: Uint8Array,
  width: number,
  height: number
): Promise<Buffer> {
  try {
    return await sharp(buffer, { failOn: "none" })
      .resize(width, height, { fit: "cover", position: "attention" })
      .png()
      .toBuffer();
  } catch {
    const meta = await sharp(buffer, { failOn: "none" }).metadata();
    const portrait = (meta.width ?? 1) < (meta.height ?? 1);
    return await sharp(buffer, { failOn: "none" })
      .resize(width, height, {
        fit: "cover",
        position: portrait ? "north" : "centre",
      })
      .png()
      .toBuffer();
  }
}

/**
 * A jobb alsó sarokban lebegő jelvény SVG-je (az oldal árszínével: amber).
 * Ár helyett az elkelt daraboknál „Elkelt" felirat jelenik meg — ugyanúgy,
 * ahogy a kártyákon is a weboldal rejtegeti az elkelt termékek árát.
 */
function buildBadgeOverlay(opts: CollageOptions): Buffer | null {
  const sold = opts.isAvailable === false;
  const hasPrice = typeof opts.price === "number" && opts.price > 0 && !sold;
  if (!sold && !hasPrice) return null;

  const label = sold ? "ÁLLAPOT" : "ÁR";
  const main = sold ? "Elkelt" : formatPriceText(opts.price as number, opts.currency);
  const fontSize = sold ? 30 : 28;
  // A háttér szélessége a szöveg hosszához igazodik (kb. 13 px/karakter 28px-nél)
  const width = Math.max(168, Math.min(400, Math.round(main.length * 14) + 64));
  const height = 72;
  const x = OG_WIDTH - 24 - width;
  const y = OG_HEIGHT - 24 - height;
  const mainColor = sold ? "#fbbf24" : "#f59e0b"; // amber-400 / amber-500

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">
  <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16"
        fill="rgba(9,9,11,0.92)" stroke="rgba(245,158,11,0.45)" stroke-width="1.5"/>
  <text x="${x + width / 2}" y="${y + 27}" text-anchor="middle"
        font-family="${BADGE_FONT}" font-size="12" font-weight="700"
        letter-spacing="3" fill="#a1a1aa">${label}</text>
  <text x="${x + width / 2}" y="${y + 55}" text-anchor="middle"
        font-family="${BADGE_FONT}" font-size="${fontSize}" font-weight="700"
        fill="${mainColor}">${main}</text>
</svg>`;
  return Buffer.from(svg);
}

/**
 * Kollázs-OG-kép (1200×630) a termék első legfeljebb 4 fotójából:
 * - 4 kép: 2×2 rács · 3 kép: 2 fent + 1 lent középen · 2 kép: egymás mellett
 *   középen · 1 kép: az egyképes OG-generálás (cover/keretezett)
 * - A jobb alsó sarokban ár-jelvény (vagy „Elkelt"), a weboldal stílusában
 *
 * Ez a kép CSAK a közösségi megosztás előnézetében jelenik meg (og:image),
 * a termékoldalon soha. Hiba esetén null — a mentés sosem bukik el miatta.
 */
export async function generateCollageOgImage(
  images: Uint8Array[],
  opts: CollageOptions = {}
): Promise<Buffer | null> {
  try {
    const upTo4 = images.slice(0, 4);
    if (upTo4.length === 0) return null;

    let canvas: Buffer;
    const badge = buildBadgeOverlay(opts);
    if (upTo4.length === 1) {
      // Egyetlen kép: a meglévő, kipróbált egyképes generálás + jelvény
      const base = (await generateOgImage(upTo4[0])) ?? Buffer.alloc(0);
      if (base.length === 0) return null;
      canvas = badge
        ? await sharp(base)
            .composite([{ input: badge, left: 0, top: 0 }])
            .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 9 })
            .toBuffer()
        : base;
    } else {
      const margin = 20;
      const gap = 12;
      const cellW = (OG_WIDTH - margin * 2 - gap) / 2; // 574
      const cellH = (OG_HEIGHT - margin * 2 - gap) / 2; // 289
      const top2 = (i: number) => ({
        left: margin + i * (cellW + gap),
        top: margin,
      });
      const bottom2 = (i: number) => ({
        left: margin + i * (cellW + gap),
        top: margin + cellH + gap,
      });
      const positions =
        upTo4.length === 2
          ? [top2(0), top2(1)].map((p) => ({
              ...p,
              top: Math.round((OG_HEIGHT - cellH) / 2),
            }))
          : upTo4.length === 3
            ? [top2(0), top2(1), { left: Math.round((OG_WIDTH - cellW) / 2), top: margin + cellH + gap }]
            : [top2(0), top2(1), bottom2(0), bottom2(1)];

      // Minden kép kitölti a celláját — figyelem-alapú vágással, hogy az
      // alak (fej/váll) mindig benne maradjon, ne csak a törzs.
      const resized = await Promise.all(
        upTo4.map((buf) => resizeCellToFit(buf, cellW, cellH))
      );
      const base = await sharp({
        create: { width: OG_WIDTH, height: OG_HEIGHT, channels: 4, background: COLLAGE_BG },
      })
        .png()
        .toBuffer();
      const layers: OverlayOptions[] = resized.map((buf, i) => ({
        input: buf,
        left: positions[i].left,
        top: positions[i].top,
      }));
      if (badge) layers.push({ input: badge, left: 0, top: 0 });
      canvas = await sharp(base)
        .composite(layers)
        .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 9 })
        .toBuffer();
    }
    return canvas;
  } catch {
    return null;
  }
}
