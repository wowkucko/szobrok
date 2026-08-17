import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { optimizeImage } from "@/lib/optimizeImage";
import { generateOgImage } from "@/lib/ogImage";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const IMAGE_MAX = 8 * 1024 * 1024; // 8 MB
const VIDEO_MAX = 200 * 1024 * 1024; // 200 MB

function safeExt(name: string, fallback: string): string {
  const ext = path.extname(name).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : fallback;
}

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Hiányzó fájl" }, { status: 400 });
  }

  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: "Csak kép (jpg, png, webp, gif, svg) vagy videó (mp4, webm, mov) tölthető fel." },
      { status: 400 }
    );
  }

  const max = isVideo ? VIDEO_MAX : IMAGE_MAX;
  if (file.size > max) {
    return NextResponse.json(
      { error: isVideo ? "A videó túl nagy (max. 200 MB)." : "A kép túl nagy (max. 8 MB)." },
      { status: 400 }
    );
  }

  // Automatikus, minőségtartó tömörítés (a felbontás érintetlen marad).
  // Hiba esetén az optimizáló null-t ad — ilyenkor az eredeti fájl kerül mentésre.
  let data: Uint8Array = new Uint8Array(await file.arrayBuffer());
  let ext = safeExt(file.name, isVideo ? ".mp4" : ".png");
  let optimized = false;
  if (isImage) {
    const result = await optimizeImage(data, file.type);
    if (result) {
      data = result.data;
      ext = result.ext;
      optimized = true;
    }
  }

  const base = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const name = `${base}${ext}`;

  mkdirSync(UPLOAD_DIR, { recursive: true });
  writeFileSync(path.join(UPLOAD_DIR, name), data);

  // OG-kompatibilis (1200×630) PNG automatikus generálása minden képből,
  // hogy a megosztási meta mindig készen álljon. A név determinisztikus
  // (og-v2-<base>.png — a v2 a figyelem-alapú vágást jelöli), így az oldal
  // oldalról leképezhető rá.
  let ogUrl: string | null = null;
  if (isImage) {
    const ogData = await generateOgImage(data);
    if (ogData) {
      const ogName = `og-v2-${base}.png`;
      writeFileSync(path.join(UPLOAD_DIR, ogName), ogData);
      ogUrl = `/api/files/${ogName}`;
    }
  }

  return NextResponse.json({
    ok: true,
    url: `/api/files/${name}`,
    ogUrl,
    optimized,
    sizeBytes: data.length,
  });
}
