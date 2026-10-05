import { SITE_URL } from "./seo";

/**
 * IndexNow — azonnali jelzés a keresőknek, hogy egy URL új vagy megváltozott.
 * A protokollt a Bing, a Yandex, a Seznam és a Naver használja (a Google nem
 * vesz részt benne — ott a sitemap `lastmod` mezője a csatorna).
 *
 * A kulcs a `INDEXNOW_KEY` környezeti változóban él (8–128 karakter:
 * kis/nagybetű, szám, kötőjel). A tulajdon-igazoláshoz a kulcsot a
 * `/api/indexnow/<kulcs>` útvonal szolgálja ki — ezt a keresők maguktól
 * letöltik az első jelzés után. Ha a kulcs nincs beállítva, a jelzés csendben
 * kikapcsolt (a mentést semmilyen körülmény nem akadályozza).
 */

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** Az érvényes IndexNow kulcs, vagy null ha nincs beállítva. */
export function indexNowKey(): string | null {
  const key = (process.env.INDEXNOW_KEY ?? "").trim();
  return /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : null;
}

/** A kulcs-fájl (tulajdon-igazolás) nyilvános címe. */
export function indexNowKeyLocation(key: string): string {
  return `${SITE_URL}/api/indexnow/${key}`;
}

/**
 * URL-ek beküldése az IndexNow-nak. Sosem dob hibát és sosem blokkolja a
 * választ (a hívó `after()`-ben futtatja, a mentés után).
 */
export async function notifyIndexNow(urls: string[]): Promise<void> {
  const key = indexNowKey();
  if (!key || urls.length === 0) return;

  const urlList = [...new Set(urls)];
  let host: string;
  try {
    host = new URL(SITE_URL).host;
  } catch {
    return;
  }

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: indexNowKeyLocation(key),
        urlList,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn(
        `[indexnow] ${res.status} — a jelzés nem ment át: ${urlList.join(", ")}`
      );
    }
  } catch (e) {
    console.warn(
      "[indexnow] a jelzés nem ment át:",
      e instanceof Error ? e.message : e
    );
  }
}
