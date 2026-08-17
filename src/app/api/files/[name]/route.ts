import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import {
  collageFileName,
  generateCardThumbForImage,
  generateGalleryThumbForImage,
  generateProductCollage,
} from "@/lib/ogCollage";
import { generateOgImage } from "@/lib/ogImage";
import { getProducts } from "@/lib/db";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  // Útvonal-traversal elleni védelem: csak a fájlnév vehető át
  const safe = path.basename(name);
  const filePath = path.join(UPLOAD_DIR, safe);

  if (!existsSync(filePath)) {
    // Hiányzó kollázs (pl. a meta már rámutat, de a fájl még nincs kész):
    // megkeressük a terméket az első kép alapján és menet közben előállítjuk.
    // Így a már feltöltött termékeknél is automatikusan elkészül, akár a
    // közösségi crawler első kérésére is — utána a lemezre kerülve gyors.
    if (safe.startsWith("og-collage-")) {
      const product = getProducts().find(
        (p) => collageFileName(p.images) === safe
      );
      if (product) await generateProductCollage(product);
    }
    // Hiányzó EGYKÉPES OG (og-v2-<base>.png): az eredeti feltöltésből
    // (<base>.<ext>) állítjuk elő figyelem-alapú vágással, hogy a már meglévő
    // termékeknél is automatikusan elkészüljön a frissített változat.
    if (safe.startsWith("og-v2-") && !existsSync(filePath)) {
      const base = safe.replace(/^og-v2-/, "").replace(/\.png$/, "");
      const original = readdirSync(UPLOAD_DIR).find(
        (f) =>
          f.startsWith(`${base}.`) &&
          /\.(jpe?g|png|webp|gif|svg)$/i.test(f)
      );
      if (original) {
        const ogData = await generateOgImage(
          readFileSync(path.join(UPLOAD_DIR, original))
        );
        if (ogData) writeFileSync(filePath, ogData);
      }
    }
    // Hiányzó KÁRTYA-BÉLYEGKÉP (card-<base>.jpg): 4:5 arányú, figyelem-alapú
    // vágású JPEG a portfólió-kártyákhoz — a már meglévő képeknél is
    // automatikusan elkészül, így a kártyán az alak feje/vállai látszódnak.
    if (safe.startsWith("card-") && !existsSync(filePath)) {
      const base = safe.replace(/^card-/, "").replace(/\.jpg$/, "");
      const original = readdirSync(UPLOAD_DIR).find(
        (f) =>
          f.startsWith(`${base}.`) &&
          /\.(jpe?g|png|webp|gif|svg)$/i.test(f)
      );
      if (original) await generateCardThumbForImage(`/api/files/${original}`);
    }
    // Hiányzó GALÉRIA-FŐKÉP (gallery-<base>.jpg): nagyobb (1200×1500)
    // figyelem-alapú vágású JPEG a részletek-oldali galériához.
    if (safe.startsWith("gallery-") && !existsSync(filePath)) {
      const base = safe.replace(/^gallery-/, "").replace(/\.jpg$/, "");
      const original = readdirSync(UPLOAD_DIR).find(
        (f) =>
          f.startsWith(`${base}.`) &&
          /\.(jpe?g|png|webp|gif|svg)$/i.test(f)
      );
      if (original) await generateGalleryThumbForImage(`/api/files/${original}`);
    }
    if (!existsSync(filePath)) {
      return new NextResponse("Nincs ilyen fájl.", { status: 404 });
    }
  }

  const ext = path.extname(safe).toLowerCase();
  const buffer = readFileSync(filePath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
