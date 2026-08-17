import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { createMessage } from "@/lib/db";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB
const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

/** Biztonságos kiterjesztés a mentett melléklethez. */
function safeExt(name: string): string {
  const ext = path.extname(name).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : "";
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Érvénytelen kérés." },
      { status: 400 }
    );
  }

  const name = (form.get("name") as string | null)?.trim() ?? "";
  const email = (form.get("email") as string | null)?.trim() ?? "";
  const message = (form.get("message") as string | null)?.trim() ?? "";

  if (!name) {
    return NextResponse.json({ error: "Kérlek, add meg a neved." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Érvénytelen e-mail cím." }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Kérlek, írd le az üzeneted." }, { status: 400 });
  }

  // Melléklet mentése a data/uploads mappába (msg- előtaggal), hogy a
  // meglévő /api/files/ route kiszolgálhassa. Az eredeti név az adatbázisban
  // marad, a lemezen biztonságos, egyedi név lesz.
  const file = form.get("attachment");
  let attachmentName = "";
  let attachmentType = "";
  let attachmentPath = "";
  if (file && typeof file !== "string" && file.size > 0) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json(
        { error: "A melléklet túl nagy (maximum 10 MB)." },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = safeExt(file.name || "");
    const stored = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    mkdirSync(UPLOAD_DIR, { recursive: true });
    writeFileSync(path.join(UPLOAD_DIR, stored), buffer);
    attachmentName = file.name || "melleklet";
    attachmentType = file.type || "application/octet-stream";
    attachmentPath = stored;
  }

  createMessage({
    type: "contact",
    name,
    email,
    message,
    attachmentName,
    attachmentType,
    attachmentPath,
  });

  return NextResponse.json(
    { ok: true, message: "Ajánlatkérés rögzítve." },
    { status: 200 }
  );
}
