import { NextResponse } from "next/server";
import { createMessage } from "@/lib/db";

interface PurchasePayload {
  productId: string;
  productTitle: string;
  name: string;
  email: string;
}

function validate(payload: unknown): PurchasePayload | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  if (typeof p.name !== "string" || p.name.trim().length === 0) return null;
  if (
    typeof p.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())
  ) {
    return null;
  }

  return {
    productId: typeof p.productId === "string" ? p.productId : "",
    productTitle: typeof p.productTitle === "string" ? p.productTitle : "",
    name: p.name.trim(),
    email: p.email.trim(),
  };
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Érvénytelen kérés." },
      { status: 400 }
    );
  }

  const purchase = validate(payload);
  if (!purchase) {
    return NextResponse.json(
      { error: "Hiányzó vagy érvénytelen mezők." },
      { status: 400 }
    );
  }

  createMessage({
    type: "purchase",
    productId: purchase.productId,
    productTitle: purchase.productTitle,
    name: purchase.name,
    email: purchase.email,
    message: "",
  });

  return NextResponse.json(
    { ok: true, message: "Vásárlási link kérés rögzítve." },
    { status: 200 }
  );
}
