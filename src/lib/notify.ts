// Telegram értesítés új admin üzenetekről (SMTP nélkül).
// Beállítás: TELEGRAM_BOT_TOKEN és TELEGRAM_CHAT_ID a .env.local-ben.
// Ha nincs beállítva, a függvény csendben kihagyja a küldést.

const TELEGRAM_API = "https://api.telegram.org/bot";

function getConfig(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return null;
  return { token, chatId };
}

const TYPE_LABELS: Record<string, string> = {
  purchase: "Vásárlási link kérés",
  offer: "Ajánlat",
  contact: "Kapcsolatfelvétel",
};

export interface NewMessageNotification {
  type: string;
  productTitle?: string;
  name: string;
  email: string;
  phone?: string;
  offer?: number | null;
  message?: string;
}

/** Új üzenet szövegének összeállítása a Telegram számára. */
function formatMessage(msg: NewMessageNotification): string {
  const lines: string[] = [];
  lines.push(`Új üzenet érkezett: ${TYPE_LABELS[msg.type] ?? msg.type}`);
  if (msg.productTitle) lines.push(`Termék: ${msg.productTitle}`);
  lines.push(`Név: ${msg.name}`);
  lines.push(`Email: ${msg.email}`);
  if (msg.phone) lines.push(`Telefon: ${msg.phone}`);
  if (typeof msg.offer === "number" && msg.offer > 0) {
    lines.push(`Ajánlat: ${msg.offer.toLocaleString("hu-HU")} Ft`);
  }
  if (msg.message) {
    const snippet =
      msg.message.length > 500 ? msg.message.slice(0, 500) + "…" : msg.message;
    lines.push(`Üzenet: ${snippet}`);
  }
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ?? "";
  if (siteUrl) {
    lines.push(`--`);
    lines.push(`Megnyitás: ${siteUrl}/admin?tab=messages`);
  }
  return lines.join("\n");
}

/**
 * Telegram üzenet küldése. Nem dob hibát — ha a küldés bármiért nem sikerül,
 * csendben kihagyjuk, hogy az üzenetmentést ne akadályozza.
 */
export async function sendTelegramNotification(
  msg: NewMessageNotification
): Promise<void> {
  const config = getConfig();
  if (!config) return;

  const url = `${TELEGRAM_API}${config.token}/sendMessage`;
  const body = {
    chat_id: config.chatId,
    text: formatMessage(msg),
    disable_web_page_preview: false,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(
        `[telegram] értesítés sikertelen: ${res.status} ${await res.text().catch(() => "")}`
      );
    }
  } catch (err) {
    console.warn("[telegram] értesítés hiba:", err);
  }
}
