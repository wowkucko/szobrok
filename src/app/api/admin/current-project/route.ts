import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentProject,
  upsertCurrentProject,
  deleteCurrentProject,
} from "@/lib/db";

/** A jelenlegi projekt lekérése. */
export async function GET() {
  return NextResponse.json({ project: getCurrentProject() });
}

/** Létrehozás / frissítés (mindig az egyetlen rekord). */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        title?: unknown;
        description?: unknown;
        image?: unknown;
        progress?: unknown;
      }
    | null;

  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json(
      { error: "Add meg a projekt címét." },
      { status: 400 }
    );
  }

  const progress =
    typeof body.progress === "number"
      ? body.progress
      : Number(body.progress);

  const project = upsertCurrentProject({
    title: body.title,
    description: typeof body.description === "string" ? body.description : "",
    image: typeof body.image === "string" ? body.image : "",
    progress: Number.isFinite(progress) ? progress : 0,
  });

  return NextResponse.json({ ok: true, project });
}

/** Eltávolítás (a blokk eltűnik a főoldalról). */
export async function DELETE() {
  deleteCurrentProject();
  return NextResponse.json({ ok: true });
}
