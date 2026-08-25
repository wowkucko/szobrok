// Cults3D GraphQL kliens — egy adott felhasználó 3D modelljeinek lekérése.
// Dokumentáció: https://cults3d.com/api  (GraphQL végpont + Basic auth).

const CULTS_GQL = "https://cults3d.com/graphql";

export interface CultsCreation {
  slug: string;
  title: string;
  description: string;
  image: string;
  url: string;
  publishedAt: string;
  creator: string;
}

interface RawCreation {
  slug: string;
  name?: { en?: string } | string;
  description?: { en?: string } | string;
  illustrationImageUrl?: string;
  shortUrl?: string;
  publishedAt?: string;
  creator?: { nick?: string };
}

function localeField(value: { en?: string } | string | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.en ?? "";
}

const PAGE = 50;

export interface FetchOptions {
  apiUser: string;
  apiKey: string;
  maxPages?: number;
}

/**
 * Lekéri a megadott Cults3D felhasználó (nick) összes publikus modelljét.
 * Lapozás: limit + offset (Cults3D ajánlása). A maxPages korlátozza a
 * lehívott oldalak számát (ősfeltöltésnél hasznos, hogy ne fusson túl soká).
 */
export async function getCultsUserCreations(
  username: string,
  opts: FetchOptions
): Promise<CultsCreation[]> {
  const auth = "Basic " + Buffer.from(`${opts.apiUser}:${opts.apiKey}`).toString("base64");
  const results: CultsCreation[] = [];
  const maxPages = opts.maxPages && opts.maxPages > 0 ? opts.maxPages : 1000;

  for (let page = 0; page < maxPages; page++) {
    const offset = page * PAGE;
    const query = `
      query UserCreations($nick: String!, $limit: Int!, $offset: Int!) {
        user(nick: $nick) {
          creations(limit: $limit, offset: $offset, sort: BY_LIKES) {
            slug
            name(locale: EN)
            description(locale: EN)
            illustrationImageUrl
            shortUrl
            publishedAt
            creator { nick }
          }
        }
      }
    `;
    const res = await fetch(CULTS_GQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify({ query, variables: { nick: username, limit: PAGE, offset } }),
    });

    if (!res.ok) {
      throw new Error(`Cults3D válasz ${res.status}: ${await res.text().catch(() => "")}`);
    }

    const json = (await res.json()) as {
      data?: { user?: { creations?: RawCreation[] } | null };
      errors?: { message: string }[];
    };

    if (json.errors?.length) {
      throw new Error(`Cults3D hiba: ${json.errors.map((e) => e.message).join("; ")}`);
    }

    const creations = json.data?.user?.creations ?? [];
    for (const c of creations) {
      const title = localeField(c.name) || c.slug;
      const description = localeField(c.description);
      const image = c.illustrationImageUrl ?? "";
      const url = `https://cults3d.com/en/design/${c.slug}`;
      results.push({
        slug: c.slug,
        title,
        description,
        image,
        url,
        publishedAt: c.publishedAt ?? new Date().toISOString(),
        creator: c.creator?.nick ?? username,
      });
    }

    if (creations.length < PAGE) break;
    // Throttling védelem: a Cults3D szigorúan korlátozza a kéréseket.
    await new Promise((r) => setTimeout(r, 600));
  }

  return results;
}
