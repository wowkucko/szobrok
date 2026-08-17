import { NextResponse } from "next/server";
import { getSmtpConfig, isSmtpConfigured, sendMail } from "@/lib/mail";
import { SITE_URL } from "@/lib/feed";

// A vásárlási linkkérések ide érkeznek (a termékoldali Vásárlás modálból).
export const PURCHASE_MAIL_TO = "vasarlas@festettszobrok.com";

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

  const purchase = validate(payload);
  if (!purchase) {
    return NextResponse.json(
      { error: "Hiányzó vagy érvénytelen mezők." },
      { status: 400 }
    );
  }

  const productLink = `${SITE_URL}/portfolio/${encodeURIComponent(
    purchase.productId
  )}`;
  const productTitle =
    purchase.productTitle || purchase.productId || "Ismeretlen termék";

  const escaped = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #b45309; margin-bottom: 16px;">Vásárlási link kérése</h2>
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
          <td style="padding: 8px 0;"><strong>${escaped(purchase.name)}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Vásárló e-mail</td>
          <td style="padding: 8px 0;">
            <a href="mailto:${escaped(purchase.email)}">${escaped(purchase.email)}</a>
          </td>
        </tr>
      </table>
      <p style="margin-top: 24px; font-size: 12px; color: #999;">
        A vásárló 24 órán belül Meska piacteres linket kap ezen a címen.
      </p>
    </div>`;

  const text = [
    "Vásárlási link kérése",
    "",
    `Termék: ${productTitle}`,
    `Termék link: ${productLink}`,
    `Név: ${purchase.name}`,
    `Vásárló e-mail: ${purchase.email}`,
    "",
    "A vásárló 24 órán belül Meska piacteres linket kap ezen a címen.",
  ].join("\n");

  try {
    await sendMail({
      to: PURCHASE_MAIL_TO,
      replyTo: purchase.email,
      subject: `Vásárlási link kérés - ${productTitle}`,
      text,
      html,
    });
    return NextResponse.json(
      { ok: true, message: "Vásárlási link kérés elküldve." },
      { status: 200 }
    );
  } catch (err) {
    console.error("[purchase] email küldési hiba:", err);
    return NextResponse.json(
      { error: "Az e-mail küldése közben hiba történt. Próbáld újra később." },
      { status: 500 }
    );
  }
}
