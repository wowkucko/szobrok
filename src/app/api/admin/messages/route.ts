import { NextRequest, NextResponse } from "next/server";
import {
  deleteMessage,
  getMessages,
  getUnreadMessageCount,
  setMessageRead,
  type MessageType,
} from "@/lib/db";

const TYPES: MessageType[] = ["purchase", "offer", "contact"];

/** Üzenetek listázása (legújabb elöl). Szűrhető típusra: ?type=offer. */
export async function GET(request: NextRequest) {
  const rawType = request.nextUrl.searchParams.get("type");
  const type =
    rawType && (TYPES as string[]).includes(rawType)
      ? (rawType as MessageType)
      : undefined;
  const all = getMessages();
  const messages = type ? all.filter((m) => m.type === type) : all;
  return NextResponse.json({
    messages,
    unread: getUnreadMessageCount(),
    total: all.length,
  });
}

/** Olvasott / olvasatlan jelölés: { id, read } */
export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ error: "Hiányzó üzenet id" }, { status: 400 });
  }
  const read = Boolean(body.read);
  const updated = setMessageRead(body.id, read);
  if (!updated) {
    return NextResponse.json({ error: "Nincs ilyen üzenet" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, unread: getUnreadMessageCount() });
}

/** Üzenet törlése: { id } */
export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    id?: unknown;
  } | null;
  if (!body || typeof body.id !== "string" || body.id.length === 0) {
    return NextResponse.json({ error: "Hiányzó üzenet id" }, { status: 400 });
  }
  const deleted = deleteMessage(body.id);
  if (!deleted) {
    return NextResponse.json({ error: "Nincs ilyen üzenet" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, unread: getUnreadMessageCount() });
}
