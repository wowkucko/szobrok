// MailerLite Connect API — szerveroldali segédfüggvény a hírlevél-feliratkozáshoz.
// A fiókbeállításokban kapcsolható kettős opt-in esetén a MailerLite maga
// küldi a megerősítő emailt, és a feliratkozó "unconfirmed" státuszba kerül,
// amíg nem kattint a benne lévő linkre — ez biztosítja a GDPR-konform
// hozzájárolást (a hozzájárulás igazolható, a visszavonás a hírlevél alján
// lévő leiratkozási linkkel egy kattintás).

const MAILERLITE_API_BASE = "https://connect.mailerlite.com/api";

export interface NewsletterResult {
  /** A feliratkozó státusza a MailerLite-ban (active / unconfirmed / ...). */
  status: string;
  /** Új feliratkozó lett (201) vagy már létezett (200). */
  created: boolean;
}

export class MailerLiteError extends Error {
  constructor(
    message: string,
    /** A MailerLite HTTP válaszkódja (0 = nincs token beállítva). */
    public statusCode = 0
  ) {
    super(message);
    this.name = "MailerLiteError";
  }
}

/** Be van-e állítva a MailerLite API-kulcs a környezetben. */
export function isNewsletterConfigured(): boolean {
  return Boolean(process.env.MAILERLITE_API_TOKEN?.trim());
}

/**
 * Feliratkozó létrehozása/frissítése a MailerLite Connect API-n.
 * A kettős opt-in megerősítő emailt a MailerLite küldi automatikusan.
 * Hibák esetén MailerLiteError-t dob (a route mapeli a felhasználónak
 * értelmes üzenetekre).
 */
export async function subscribeToNewsletter(input: {
  email: string;
  name?: string;
}): Promise<NewsletterResult> {
  const token = process.env.MAILERLITE_API_TOKEN?.trim();
  if (!token) {
    throw new MailerLiteError(
      "A hírlevél-szolgáltatás nincs beállítva (hiányzó MAILERLITE_API_TOKEN).",
      0
    );
  }

  const groupId = process.env.MAILERLITE_GROUP_ID?.trim();
  const body: Record<string, unknown> = { email: input.email };
  // A név opcionális, üresen nem küldjük (minimalizálás elve).
  const name = input.name?.trim();
  if (name) body.fields = { name };
  // Ha nincs csoport megadva, a feliratkozó a fiók alapértelmezett listájára kerül.
  if (groupId) body.groups = [groupId];

  let res: Response;
  try {
    res = await fetch(`${MAILERLITE_API_BASE}/subscribers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      // A MailerLite hívás ne lógjon örökké (a feliratkozó ne várjon).
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new MailerLiteError(
      "Nem sikerült elérni a hírlevél-szolgáltatást. Próbáld újra később.",
      0
    );
  }

  if (res.status === 401 || res.status === 403) {
    throw new MailerLiteError("Hibás MailerLite API-kulcs.", res.status);
  }

  let data: { data?: { status?: string } } | null = null;
  try {
    data = (await res.json()) as { data?: { status?: string } };
  } catch {
    // nem JSON válasz — az alábbi kód kezeli
  }

  if (!res.ok) {
    // 422: érvénytelen email (a form már szűri, de biztos ami biztos)
    const msg =
      res.status === 422
        ? "Érvénytelen e-mail cím."
        : "A hírlevél-feliratkozás jelenleg nem működik. Próbáld újra később.";
    throw new MailerLiteError(msg, res.status);
  }

  return {
    status: data?.data?.status ?? "active",
    created: res.status === 201,
  };
}
