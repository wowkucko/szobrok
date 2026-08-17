import { NextResponse } from "next/server";
import { createMessage } from "@/lib/db";

interface OfferPayload {
  productId: string;
  productTitle: string;
  name: string;
  email: string;
  phone?: string;
  offer: string;
  message?: string;
}

function validate(payload: unknown): OfferPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  if (typeof p.name !== "string" || p.name.trim().length === 0) return null;
  if (
    typeof p.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())
  ) {
    return null;
  }
  const offerNum = Number(p.offer);
  if (typeof p.offer !== "string" || Number.isNaN(offerNum) || offerNum <= 0) {
    return null;
  }

  return {
    productId: typeof p.productId === "string" ? p.productId : "",
    productTitle: typeof p.productTitle === "string" ? p.productTitle : "",
    name: p.name.trim(),
    email: p.email.trim(),
    phone: typeof p.phone === "string" ? p.phone.trim() : undefined,
    offer: p.offer.trim(),
    message: typeof p.message === "string" ? p.message.trim() : undefined,
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

  const offer = validate(payload);
  if (!offer) {
    return NextResponse.json(
      { error: "Hiányzó vagy érvénytelen mezők." },
      { status: 400 }
    );
  }

  const offerNum = Number(offer.offer);

  createMessage({
    type: "offer",
    productId: offer.productId,
    productTitle: offer.productTitle,
    name: offer.name,
    email: offer.email,
    phone: offer.phone,
    offer: Number.isFinite(offerNum) ? offerNum : null,
    message: offer.message,
  });

  return NextResponse.json(
    { ok: true, message: "Ajánlat rögzítve." },
    { status: 200 }
  );
}
