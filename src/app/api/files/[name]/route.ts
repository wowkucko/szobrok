import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { collageFileName, generateProductCollage } from "@/lib/ogCollage";
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
