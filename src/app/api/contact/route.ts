import { NextResponse } from "next/server";
import { getSmtpConfig, isSmtpConfigured, sendMail } from "@/lib/mail";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

interface ContactPayload {
  name: string;
  email: string;
  message: string;
  attachment?: { name: string; type: string; data: string };
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

  const file = form.get("attachment");
  let attachment: ContactPayload["attachment"];
  if (file && typeof file !== "string" && file.size > 0) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json(
        { error: "A melléklet túl nagy (maximum 10 MB)." },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    attachment = {
      name: file.name || "melleklet",
      type: file.type || "application/octet-stream",
      data: buffer.toString("base64"),
    };
  }

  const payload: ContactPayload = {
    name,
    email,
    message,
    ...(attachment ? { attachment } : {}),
  };

  if (!isSmtpConfigured(getSmtpConfig())) {
    return NextResponse.json(
      {
        error:
          "Az e-mail küldés nincs beállítva. Kérlek, add meg az SMTP adatokat (.env.local: SMTP_HOST, SMTP_USER, SMTP_PASS).",
      },
      { status: 500 }
    );
  }

  const escaped = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #b45309; margin-bottom: 16px;">Új egyedi ajánlatkérés</h2>
      <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #666; width: 120px;">Név</td>
          <td style="padding: 8px 0;"><strong>${escaped(payload.name)}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Válasz cím</td>
          <td style="padding: 8px 0;">
            <a href="mailto:${escaped(payload.email)}">${escaped(payload.email)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666;">Melléklet</td>
          <td style="padding: 8px 0;">${
            payload.attachment ? escaped(payload.attachment.name) : "—"
          }</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; vertical-align: top;">Üzenet</td>
          <td style="padding: 8px 0; white-space: pre-wrap;">${escaped(
            payload.message
          )}</td>
        </tr>
      </table>
      <p style="margin-top: 24px; font-size: 12px; color: #999;">
        Ezt az e-mailt a weboldal kapcsolat űrlapjáról küldtük.
      </p>
    </div>`;

  const text = [
    "Új egyedi ajánlatkérés",
    "",
    `Név: ${payload.name}`,
    `Válasz cím: ${payload.email}`,
    `Melléklet: ${payload.attachment ? payload.attachment.name : "nincs"}`,
    "",
    payload.message,
  ].join("\n");

  try {
    await sendMail({
      replyTo: payload.email,
      subject: `Új egyedi ajánlatkérés — ${payload.name}`,
      text,
      html,
      ...(payload.attachment
        ? {
            attachments: [
              {
                filename: payload.attachment.name,
                contentType: payload.attachment.type,
                content: payload.attachment.data,
                encoding: "base64",
              },
            ],
          }
        : {}),
    });

    return NextResponse.json(
      { ok: true, message: "Ajánlatkérés elküldve." },
      { status: 200 }
    );
  } catch (err) {
    console.error("[contact] email küldési hiba:", err);
    return NextResponse.json(
      { error: "Az e-mail küldése közben hiba történt. Próbáld újra később." },
      { status: 500 }
    );
  }
}
