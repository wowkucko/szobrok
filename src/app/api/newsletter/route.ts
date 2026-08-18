import { NextResponse } from "next/server";
import { isNewsletterConfigured, MailerLiteError, subscribeToNewsletter } from "@/lib/mailerlite";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Egyszerű, memóriabeli rate limit feliratkozásonként (IP alapú) — a droplet
// egyetlen példánya esetén elegendő a spam elleni alapvédelemhez.
const RATE_LIMIT_MAX = 5; // feliratkozás / óra / IP
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const attempts = new Map<string, number[]>();

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (attempts.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (list.length >= RATE_LIMIT_MAX) {
    attempts.set(ip, list);
    return true;
  }
  list.push(now);
  attempts.set(ip, list);
  return false;
}

export async function POST(request: Request) {
  if (rateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: "Túl sok próbálkozás. Kérlek, próbáld újra később." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Érvénytelen kérés." }, { status: 400 });
  }

  const email =
    typeof (body as { email?: unknown }).email === "string"
      ? ((body as { email: string }).email as string).trim()
      : "";
  const name =
    typeof (body as { name?: unknown }).name === "string"
      ? ((body as { name: string }).name as string).trim().slice(0, 100)
      : "";
  // GDPR: kifejezett, önkéntes hozzájárulás — a kliens csak bejelölt
  // checkbox mellett küldheti el az űrlapot, de szerveroldalon is kötelező.
  const consent = (body as { consent?: unknown }).consent === true;

  if (!email) {
    return NextResponse.json(
      { error: "Kérlek, add meg az e-mail címed." },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Érvénytelen e-mail cím." },
      { status: 400 }
    );
  }
  if (!consent) {
    return NextResponse.json(
      { error: "A feliratkozáshoz el kell fogadnod az adatvédelmi tájékoztatót." },
      { status: 400 }
    );
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json(
      { error: "A hírlevél-szolgáltatás még nincs beállítva. Próbáld újra később." },
      { status: 503 }
    );
  }

  try {
    const result = await subscribeToNewsletter({ email, name });
    // Kettős opt-in esetén a MailerLite megerősítő emailt küldött.
    const message =
      result.status === "unconfirmed"
        ? "Köszönjük! Küldtünk egy megerősítő emailt — kattints a benne lévő linkre a feliratkozás befejezéséhez."
        : result.created
          ? "Köszönjük a feliratkozást!"
          : "Ez az e-mail cím már fel van iratkozva a hírlevélre.";
    return NextResponse.json({ ok: true, message, status: result.status });
  } catch (e) {
    const err = e instanceof MailerLiteError ? e : null;
    const status =
      err?.statusCode === 401 || err?.statusCode === 403
        ? 500
        : err?.statusCode === 422
          ? 400
          : 502;
    return NextResponse.json(
      { error: err?.message ?? "Ismeretlen hiba történt." },
      { status }
    );
  }
}
