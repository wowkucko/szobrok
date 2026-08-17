# Google Search Console — verifikáció és sitemap beküldés

## 1. Verifikáció (tulajdonjog igazolása)

Válassz egyet a három módszer közül. Ha a domain név (pl. `festettszobrok.com`)
**domains property**-ként adod hozzá, csak a **DNS** módszer működik — ez a
legegyszerűbb is, mert nem igényel újraépítést.

### A) DNS TXT rekord (ajánlott, domain property-hez)

1. Google Search Console → **Tulajdonság hozzáadása** → **Domain** → add meg
   `festettszobrok.com`-t.
2. A Google mutat egy TXT rekordot, pl.: `google-site-verification=ABCDE...`.
3. A **tárhelyszolgáltató DNS-kezelőjében** (vagy a domain regisztrátornál)
   add hozzá TXT rekordként.
4. **Ellenőrzés** — a DNS frissülése 5 perc–24 óra is lehet.

### B) Meta tag (ehhez a projekthez előkészítve)

1. Google Search Console → **Tulajdonság hozzáadása** → **URL-előtag** →
   `https://festettszobrok.com` → **Meta tag** módszer → másold ki a tokent.
2. A projekt `.env.local` fájljába írd be:

   ```bash
   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<a-google-token>
   ```

3. **Újra kell építeni** a projektet (a `NEXT_PUBLIC_*` változók build időben
   kerülnek a HTML-be): `npm run build && npm run start`.
4. A kész oldalon minden oldal `<head>`-jében megjelenik:

   ```html
   <meta name="google-site-verification" content="<a-google-token>"/>
   ```

5. GSC-ben kattints az **Ellenőrzés** gombra.

> A `.env.example`-ban is szerepel a változó üresen, hogy ne felejtsd el.

### C) HTML fájl (kód nélkül)

1. GSC **URL-előtag** property → **HTML-fájl** módszer → töltsd le a
   `google...html` fájlt.
2. Másold a projekt **`public/`** mappájába (pl. `public/google1234.html`).
3. A fájl a `https://festettszobrok.com/google1234.html` címen elérhető lesz.
4. GSC-ben kattints az **Ellenőrzés** gombra. A fájlt később nyugodtan
   törölheted a `public/`-ból.

---

## 2. Sitemap beküldése

A sitemap automatikusan generálódik, nem kell karbantartani:

- **URL:** `https://festettszobrok.com/sitemap.xml`
- Tartalma: főoldal, portfólió, **kategória-oldalak** (`/portfolio?tag=Fantasy`
  stb.), minden termék (`lastmod` a feltöltés dátuma, az elkelt termékek
  alacsonyabb prioritással) + **kép-sitemap** (`xmlns:image`): a termékek
  bélyegképei és további képei raszter (PNG/OG) formátumban, a JSON-LD-vel
  összhangban — az SVG-ket a Google nem fogadja el kép-sitemapban, ezért
  helyettük a generált PNG változatok szerepelnek.
- A `robots.txt` (`https://festettszobrok.com/robots.txt`) már tartalmazza a
  sitemap-hivatkozást, így a Google magától is megtalálja.

Beküldés:

1. GSC → **Indexelés → Sitemapok** (a bal oldali menüben).
2. A mezőbe írd be: `sitemap.xml`
3. **Beküldés**. Sikeres beküldésnél „Sikeres" státuszt kapsz; a hibákat
   (pl. „Nem elérhető") a **Hibák** részben láthatod.

Opcionális: a **Bing Webmaster Tools**-ban is beküldheted ugyanezt a címet
(ingyenes, és a Bing a Google sitemapet is elfogadja).

---

## 3. Beküldés utáni ellenőrzések

| Ellenőrzés | Elvárt eredmény |
|---|---|
| `https://festettszobrok.com/sitemap.xml` | 200-as válasz, érvényes XML, `https://festettszobrok.com/...` URL-ek |
| `https://festettszobrok.com/robots.txt` | `Sitemap: https://festettszobrok.com/sitemap.xml` sor |
| `https://festettszobrok.com/` | 200-as válasz + `google-site-verification` meta (ha meta tag módszer) |
| `https://festettszobrok.com/admin` | `noindex` + Basic auth (nem kerül a Google indexébe) |
| URL-ellenőrző (GSC) | Minden termékoldalnál „Indexelhető" státusz, az elkelt daraboknál is |

Tippek:

- GSC **URL-ellenőrző**-vel kérhetsz **azonnali újraindexelést** egy-egy
  frissített termékoldalnál („Indexelés kérése").
- Új termék feltöltése után a `sitemap.xml` azonnal frissül (dinamikus), a
  Google pedig a robots.txt hivatkozás miatt rendszeresen újraolvassa.
- Ha élesben más domain lesz, mint `festettszobrok.com`, a `NEXT_PUBLIC_SITE_URL`
  env változót állítsd be — a sitemap, a robots.txt és a kanonikus linkek
  mind ezt használják.
