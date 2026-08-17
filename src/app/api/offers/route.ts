import { NextResponse } from "next/server";
import { getSmtpConfig, isSmtpConfigured, sendMail } from "@/lib/mail";
import { SITE_URL } from "@/lib/feed";

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

function formatPrice(offer: string): string {
  const num = Number(offer);
  if (!Number.isFinite(num)) return offer;
  return `${num.toLocaleString("hu-HU")} Ft`;
}

export async function POST(request: Request) {
  const smtp = getSmtpConfig();
  if (!isSmtpConfigured(smtp)) {
    return NextResponse.json(
      {
        error:
          "Az e-mail küldés nincs beállítva. Kérlek, add meg az SMTP adatokat (.env.local: SMTP_HOST, SMTP_USER, SMTP_PASS).",
      },
      { status: 500 }
    );
  }

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

  const productLink = `${SITE_URL}/portfolio/${encodeURIComponent(
    offer.productId
  )}`;
  const productTitle = offer.productTitle || offer.productId || "Ismeretlen termék";

  const escaped = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #b45309; margin-bottom: 16px;">Ajánlat érkezett</h2>
      <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #666; width: 140px;">Termék</td>
          <td style="padding: 8px 0;">
            <a href="${escaped(productLink)}">${escaped(productTitle)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Termék link</td>
          <td style="padding: 8px 0;">
            <a href="${escaped(productLink)}">${escaped(productLink)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Név</td>
          <td style="padding: 8px 0;"><strong>${escaped(offer.name)}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Válasz cím</td>
          <td style="padding: 8px 0;">
            <a href="mailto:${escaped(offer.email)}">${escaped(offer.email)}</a>
          </td>
        </tr>
        ${
          offer.phone
            ? `<tr>
          <td style="padding: 8px 0; color: #666;">Telefonszám</td>
          <td style="padding: 8px 0;">${escaped(offer.phone)}</td>
        </tr>`
            : ""
        }
        <tr>
          <td style="padding: 8px 0; color: #666;">Ajánlott ár</td>
          <td style="padding: 8px 0;"><strong>${escaped(formatPrice(offer.offer))}</strong></td>
        </tr>
        ${
          offer.message
            ? `<tr>
          <td style="padding: 8px 0; color: #666; vertical-align: top;">Megjegyzés</td>
          <td style="padding: 8px 0; white-space: pre-wrap;">${escaped(offer.message)}</td>
        </tr>`
            : ""
        }
      </table>
      <p style="margin-top: 24px; font-size: 12px; color: #999;">
        Ezt az e-mailt a weboldal termékoldali ajánlatkérő űrlapjáról küldtük.
      </p>
    </div>`;

  const text = [
    "Ajánlat érkezett",
    "",
    `Termék: ${productTitle}`,
    `Termék link: ${productLink}`,
    `Név: ${offer.name}`,
    `Válasz cím: ${offer.email}`,
    offer.phone ? `Telefonszám: ${offer.phone}` : "",
    `Ajánlott ár: ${formatPrice(offer.offer)}`,
    offer.message ? `Megjegyzés: ${offer.message}` : "",
    "",
    "Ezt az e-mailt a weboldal termékoldali ajánlatkérő űrlapjáról küldtük.",
  ]
    .filter((line) => line !== "")
    .join("\n");

  try {
    await sendMail({
      replyTo: offer.email,
      subject: `Ajánlat érkezett - ${productTitle}`,
      text,
      html,
    });
    return NextResponse.json(
      { ok: true, message: "Ajánlat elküldve." },
      { status: 200 }
    );
  } catch (err) {
    console.error("[offers] email küldési hiba:", err);
    return NextResponse.json(
      { error: "Az e-mail küldése közben hiba történt. Próbáld újra később." },
      { status: 500 }
    );
  }
}
