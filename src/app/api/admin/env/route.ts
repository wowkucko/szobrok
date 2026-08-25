import { NextRequest, NextResponse } from "next/server";
import { getEnvEntries, saveEnvVars, deleteEnvKeys } from "@/lib/envFile";

export const dynamic = "force-dynamic";

/** Aktuális környezeti változók (a .env.local-ból). */
export async function GET() {
  return NextResponse.json({ entries: getEnvEntries() });
}

/** Változók mentése: { entries: [{ key, value }] }. A meglévőket frissíti,
 *  az újakat hozzáadja. A middleware már védte az útvonalat. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { entries?: { key: string; value: string }[]; delete?: string[] }
    | null;

  if (!body || !Array.isArray(body.entries)) {
    return NextResponse.json({ error: "Hibás kérés." }, { status: 400 });
  }

  // Kulcsok ellenőrzése: csak érvényes ENV nevek
  for (const e of body.entries) {
    if (typeof e.key !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(e.key)) {
      return NextResponse.json(
        { error: `Érvénytelen kulcs: ${e.key ?? "(üres)"}` },
        { status: 400 }
      );
    }
  }

  const vars: Record<string, string> = {};
  for (const e of body.entries) {
    vars[e.key] = typeof e.value === "string" ? e.value : "";
  }

  const { changed, added } = saveEnvVars(vars);
  let removed = 0;
  if (Array.isArray(body.delete) && body.delete.length > 0) {
    removed = deleteEnvKeys(body.delete.filter((k) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(k)));
  }
  return NextResponse.json({ ok: true, changed, added, removed });
}
