// Gemini (Google) SEO blogíró a blog bejegyzésekhez.
// A cél: HOSSZÚ, keresőbarát cikkek — képelemzéssel (Gemini vision), a
// karakter és a világa (lore) bemutatásával, kulcsszódús szöveggel és
// címkékkel. A képet a hívó (blogSync) base64 inlineData-ként csatolja.
//
// Két hívási mód (mindkettő kvóta-takarékos KÖTEGELT hívás):
//  - Van kép → egyetlen vision-hívás: a bemutatófotók inlineData-ként,
//    elemenként beágyazva mennek be (i. elem → i. fotó). Ha a kötegelt
//    válasz értelmezhetetlen, automatikusan post-onkénti hívásra vált.
//  - Nincs kép → szöveges kötegelt hívás.

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

/**
 * Modell-tartalék lánc: minden modellnek külön (napi/havi) kvóta van, ezért
 * ha az aktuális modell kvótája kimerül (429 / RESOURCE_EXHAUSTED), a következő
 * próbálkozás már a lánc következő modelljével fut. Az átmeneti túlterhelés
 * (503 UNAVAILABLE) NEM vált modellt — az magától helyreáll.
 */
const MODEL_FALLBACKS = [
  GEMINI_MODEL,
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
].filter((m, i, arr) => m && arr.indexOf(m) === i);

let modelIdx = 0;
function currentModel(): string {
  return MODEL_FALLBACKS[modelIdx];
}

/** A Gemininek átadott kép (base64-kódolású fájl tartalma). */
export interface GeminiImagePart {
  data: string; // base64
  mimeType: string;
}

export interface TranslateInput {
  title: string;
  description: string;
  keywords: string[];
  /** A modell bemutatófotója — ha megvan, a Gemini kiértékeli a képet is. */
  image?: GeminiImagePart;
}

export interface TranslatedPost {
  title: string;
  excerpt: string;
  description: string;
  /** A Gemini által javasolt címkék (kisbetűs, tisztított; a db még egészíti). */
  tags: string[];
  /** false: a Gemini-hívás sikertelen volt, a bejegyzés angolul maradt. */
  ok?: boolean;
}

/**
 * Alap SEO-kulcsszavak, ha az admin nem adott meg semmit. Az első a fő
 * célkulcsszó: a generált bejegyzésekben is ez szerepeljen a leggyakrabban.
 */
export const BASE_BLOG_KEYWORDS = [
  "festett figurák",
  "kézzel festett figurák",
  "3D nyomtatott figura",
  "gyűjtői figura",
  "figurafestés",
  "festett szobrok",
];

/** A cél cikkhossz (karakter, ~700 szó). Ennél rövidebb választ újrapróbálunk. */
const MIN_DESCRIPTION_CHARS = 2500;
/** Védelmi felső határ a DB-be kerülő szövegre. */
const MAX_DESCRIPTION_CHARS = 60000;
/** Két vision-hívás közötti szünet (rate limit kímélése). */
const ITEM_DELAY_MS = 300;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

/** JSON parse; csonka (MAX_TOKENS) válasznál újrapróbálható hibát dob. */
function parseJsonOrThrow(text: string, finishReason?: string): unknown {
  try {
    return extractJson(text);
  } catch (e) {
    if (finishReason === "MAX_TOKENS") {
      // A \b5\d\d\b regex miatt a retry-logika újrapróbálja.
      throw new Error(
        "Gemini válasz 599: csonka/érvénytelen JSON válasz (finishReason: MAX_TOKENS)."
      );
    }
    throw new Error(`Gemini érvénytelen JSON válasz: ${String(e).slice(0, 200)}`);
  }
}

/** A Gemini által javasolt címkék tisztítása (kisbetű, csak betű/szám/kötőjel). */
function sanitizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    if (typeof r !== "string") continue;
    const t = r
      .trim()
      .toLowerCase()
      .replace(/[^a-záéíóöőúüű0-9\s-]/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 32);
    if (!t || t.length < 2 || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 12) break;
  }
  return out;
}

/**
 * Egy Gemini-hívás lefuttatása; a szöveges választ és a finishReason-t adja.
 * A maxOutputTokens a thinking tokeneket is tartalmazza — kötegelt, hosszú
 * cikkeknél bővebb keretre van szükség.
 */
async function callGemini(
  parts: Array<Record<string, unknown>>,
  apiKey: string,
  maxOutputTokens = 24000
): Promise<{ text: string; finishReason?: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel()}:generateContent`;
  const res = await fetch(`${url}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        // A thinking tokenek is ebbe számolnak bele — hosszú cikkhez bőven
        // kell a hely (a model 64k-ig támogatja a kimenetet).
        maxOutputTokens,
        temperature: 0.85,
      },
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    // Kvóta kimerülés: átváltunk a következő tartalék modellre (a hívó
    // retry-logikája úgyis újrapróbálja — már az új modellel).
    if (res.status === 429 && /RESOURCE_EXHAUSTED|quota/i.test(bodyText)) {
      const prev = currentModel();
      if (modelIdx < MODEL_FALLBACKS.length - 1) {
        modelIdx++;
        throw new Error(
          `Gemini válasz 429: ${prev} kvóta kimerült — a következő próbálkozás a ${currentModel()} modellel fut. ${bodyText.slice(0, 200)}`
        );
      }
    }
    throw new Error(`Gemini válasz ${res.status}: ${bodyText}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  };
  const candidate = json.candidates?.[0];
  const text =
    candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) {
    throw new Error(
      `Gemini válasz 599: üres válasz (finishReason: ${candidate?.finishReason ?? "ismeretlen"}).`
    );
  }
  return { text, finishReason: candidate?.finishReason };
}

/**
 * A képelemzésre vonatkozó utasítás a promptban.
 *  - single: egyetlen bejegyzés, egy fotóval.
 *  - batch: kötegelt hívás — minden elem saját fotójával, sorrendben.
 *  - none: nincs kép.
 */
function imageRuleFor(mode: "none" | "single" | "batch"): string {
  if (mode === "single") {
    return "A CSATOLT KÉP a modell bemutatófotója. Elemezd ki részletesen, és erre építsd a cikket: mit látsz (karakter/figura, póz, felszerelés, fegyverek, ruházat, textúrák, bázis), milyen a hangulata, milyen színek és anyaghatások dominálnak (fém, bőr, ruha, fa, kő, világító OSL-effekt), milyen festési technikákat igényel, és hogyan mutatna jól polcon vagy vitrinben.";
  }
  if (mode === "batch") {
    return "MINDEN ELEMHEZ beágyaztuk a modell bemutatófotóját (közvetlenül az elem szövege után). Minden cikket a saját fotójára építs: elemezd ki részletesen, mit látsz rajta (karakter/figura, póz, felszerelés, fegyverek, ruházat, textúrák, bázis), milyen a hangulata, milyen színek és anyaghatások dominálnak (fém, bőr, ruha, fa, kő, világító OSL-effekt), milyen festési technikákat igényel, és hogyan mutatna jól polcon vagy vitrinben. A fotókat szigorúan a saját elemükhöz rendelve kezeld — soha ne keverd őket!";
  }
  return "Nincs csatolt kép: a cikket az eredeti cím és leírás alapján írd; a megjelenést igyekezz elképzelni és leírni, de konkrét képrészleteket ne állíts.";
}

/** A cikkírási szabályok (közös az egyedi és a kötegelt promptban). */
function articleRules(
  keywordList: string,
  imageMode: "none" | "single" | "batch"
): string {
  return `STÍLUS ÉS TERJEDELEM:
- A cikk LEGALÁBB 700-1100 SZÓ legyen (kb. 6-10 bekezdés), változatos mondatszerkezettel, élő, szakértő, mégis barátságos hangnemben — egy szenvedélyes műhelyvezető tollából.
- Használj 3-4 ALCÍMET: bekezdés elején "## " előtaggal (pl. "## A karakter és a világa").
- A bekezdéseket üres sor válassza el.

TARTALMI VÁZ (minden elem szerepeljen, természetes elrendezésben):
1. Bevezetés: mi ez a darab, mi teszi különlegessé gyűjtői szemmel.
2. A modell részletes bemutatása: téma, karakter, póz, felszerelés, részletesség, kompozíció, festhetőség.
3. A karakter TÖRTÉNETE ÉS VILÁGA (lore): ha a név/kinézet alapján ismert franchise (videójáték, film, sorozat, képregény) valószínűsíthető, mutasd be azt a világot és a karakter szerepét benne; ha nem, adj hihető, a designra épülő háttértörténetet ("a megjelenése alapján…") — sosem állítva, hogy hivatalos licenctermék.
4. Kiknek ajánlott: gyűjtőknek, figurafestőknek, asztali szerepjátékosoknak, ajándéknak.
5. A kézzel festett kivitelezés: hogyan készülnek nálunk a festett figurák, milyen technikák kellenek ide (árnyékolás, kiemelések, fém- és anyaghatások, OSL), miért éri meg készre festve vásárolni.
6. Zárás: természetes cselekvésre ösztönzés (böngészés a portfólióban, egyedi kérés).

SEO-SZABÁLYOK:
- Építsd be természetesen az alábbi kulcsszavakat (mindegyik legalább egyszer, az ELSŐ fő kulcsszó legalább 3-szor, egyes/többes szám és ragok variálásával): ${keywordList}
- Ne legyen kulcsszó-halmozás: a szöveg maradjon gördülékeny, emberi olvasmány.
- Ne említsd kötelezően a "Cults3D" szót; egy természetes utalás megengedett.
- Ne találj ki árat, méretet vagy szállítási részletet.

FONTOS: a sajátneveket (személyek, karakterek, márkák, termék-/modellnevek) NE fordítsd le és NE torzítsd el — maradjanak pontosan az eredeti (angol) alakjukban. Ha a cím lényegében csak a figura neve, a cím maradjon a név, rövid magyar körülírással kiegészítve.

${imageRuleFor(imageMode)}`;
}

const JSON_SHAPE_SINGLE = `Válaszolj KIZÁRÓLAG egy strict JSON objektummal, semmi mással:
{
  "title": "magyar SEO-cím, maximum 80 karakter, lehetőleg a fő kulcsszóval",
  "excerpt": "1-2 mondat, max 160 karakter, kulcsszavakkal",
  "description": "a teljes hosszú magyar cikk: bekezdések üres sorral (\\n\\n) elválasztva, alcímek '## ' előtaggal",
  "tags": ["8-12 db rövid címke (1-3 szó, kisbetűvel): téma, franchise- vagy karakternév, stílus, festési technika"]
}`;

const JSON_SHAPE_BATCH = (n: number) => `Válaszolj KIZÁRÓLAG egy strict JSON tömbbel, pontosan ${n} elemmel, az eredeti sorrendben:
[
  { "title": "magyar SEO-cím, max 80 karakter", "excerpt": "max 160 karakter", "description": "a teljes hosszú magyar cikk, \\n\\n elválasztott bekezdésekkel és '## ' alcímekkel", "tags": ["8-12 db rövid címke"] }
]`;

/**
 * Egyetlen bejegyzés cikkré írása (opcionális képelemzéssel).
 * Túl rövid válasz esetén egyszer belső újrapróbálást végez.
 */
export async function translateBlogPost(
  input: TranslateInput,
  apiKey: string
): Promise<TranslatedPost> {
  const keywordList =
    input.keywords && input.keywords.length
      ? input.keywords.join(", ")
      : BASE_BLOG_KEYWORDS.join(", ");

  const withImage = !!input.image;
  const prompt = `Te egy tapasztalt magyar nyelvű SEO-szövegíró vagy, aki a festettszobrok.com — kézzel festett figurákat és 3D nyomtatott szobrokat készítő és árusító műhely — blogját írja. Gyűjtőknek, figurafestőknek és geek-rajongóknak írsz.

FELADAT: az alábbi 3D nyomtatott tervezői modellhez írj RÉSZLETES, magyarnyelvű blogcikket, ami jól teljesít a Google-keresőkben és valódi olvasmányélmény.

${articleRules(keywordList, withImage ? "single" : "none")}

Eredeti cím (EN): ${input.title}
Eredeti leírás (EN): ${input.description || "(üres)"}

${JSON_SHAPE_SINGLE}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { text, finishReason } = await callGemini(
      [
        {
          text:
            attempt === 0
              ? prompt
              : `${prompt}\n\nFIGYELEM: az előző válasz túl rövid volt. Ezúttal mindenképp tartsd be a TERJEDELEM előírást (legalább 700 szó, 6-10 bekezdés)!`,
        },
        ...(input.image
          ? [{ inlineData: { mimeType: input.image.mimeType, data: input.image.data } }]
          : []),
      ],
      apiKey
    );

    const parsed = parseJsonOrThrow(text, finishReason) as {
      title?: string;
      excerpt?: string;
      description?: string;
      tags?: unknown;
    };

    const description =
      typeof parsed.description === "string" ? parsed.description.trim() : "";

    if (description.length >= MIN_DESCRIPTION_CHARS || attempt === 1) {
      return {
        title: (typeof parsed.title === "string" && parsed.title.trim() ? parsed.title : input.title).slice(0, 120),
        excerpt: (typeof parsed.excerpt === "string" ? parsed.excerpt : "").trim().slice(0, 200),
        description: (description || input.description || input.title).slice(0, MAX_DESCRIPTION_CHARS),
        tags: sanitizeTags(parsed.tags),
        ok: true,
      };
    }
  }
  // Nem elérhető (a ciklus mindig return-öl vagy dob).
  throw new Error("Gemini válasz 599: nem várt válaszállapot.");
}

/**
 * Több bejegyzés fordítása/cikkré írása — mindig KÖTEGELTEN (kvóta-takarékos):
 *  - Ha bármelyik inputnak van képe: egyetlen vision-hívás, az elemek fotóival
 *    beágyazva (i. elem → i. fotó). Ha a kötegelt válasz értelmezhetetlen
 *    (értelmezési/elemszám/minőségi hiba), automatikusan post-onkénti
 *    hívásra vált; HTTP-szintű hibát (kvóta, túlterhelés) továbbdobja a
 *    hívó kvóta-retry logikájának.
 *  - Ha egyiknek sincs képe: egyetlen szöveges kötegelt hívás.
 */
export async function translateBlogPosts(
  inputs: TranslateInput[],
  apiKey: string
): Promise<TranslatedPost[]> {
  if (!apiKey || inputs.length === 0) {
    return inputs.map((i) => ({
      title: i.title,
      excerpt: "",
      description: i.description,
      tags: [],
      ok: false,
    }));
  }

  const anyImage = inputs.some((i) => i.image);
  if (!anyImage) {
    return translateBatchText(inputs, apiKey);
  }

  // Kötegelt vision hívás: egy hívásban megy az összes elem a saját fotójával.
  try {
    return await translateBatchVision(inputs, apiKey);
  } catch (e) {
    // HTTP-szintű hiba (kvóta/túlterhelés/hálózat) → a hívó retry-logikája
    // kezelje; értelmezési hiba → post-onkénti tartalék alább.
    if (String(e).startsWith("Gemini válasz ")) throw e;
  }

  // Post-onkénti tartalék: csak akkor fut, ha a kötegelt válasz rossz volt.
  const results: TranslatedPost[] = [];
  let lastError: unknown = null;
  let failed = 0;
  for (let idx = 0; idx < inputs.length; idx++) {
    const it = inputs[idx];
    try {
      results.push(await translateBlogPost(it, apiKey));
    } catch (e) {
      lastError = e;
      failed++;
      results.push({
        title: it.title,
        excerpt: "",
        description: it.description || it.title,
        tags: [],
        ok: false,
      });
    }
    if (idx < inputs.length - 1) await sleep(ITEM_DELAY_MS);
  }
  if (failed === inputs.length && lastError) throw lastError;
  return results;
}

/**
 * Kötegelt vision hívás: az összes elem és a hozzájuk tartozó bemutatófotók
 * EGYETLEN Gemini-hívásban. A részek sorrendje: szabályok → elemenként
 * (elem szövege + közvetlenül utána a saját fotója) → JSON-formátum.
 */
async function translateBatchVision(
  inputs: TranslateInput[],
  apiKey: string
): Promise<TranslatedPost[]> {
  const keywordList =
    inputs[0].keywords && inputs[0].keywords.length
      ? inputs[0].keywords.join(", ")
      : BASE_BLOG_KEYWORDS.join(", ");

  const parts: Array<Record<string, unknown>> = [
    {
      text: `Te egy tapasztalt magyar nyelvű SEO-szövegíró vagy, aki a festettszobrok.com — kézzel festett figurákat és 3D nyomtatott szobrokat készítő és árusító műhely — blogját írja. Gyűjtőknek, figurafestőknek és geek-rajongóknak írsz.

FELADAT: az alábbi ${inputs.length} darab 3D nyomtatott tervezői modell MINDIKÉPZÉHEZ írj külön-külön RÉSZLETES, magyarnyelvű blogcikket — mindegyik ugyanazokkal a követelményekkel.

${articleRules(keywordList, "batch")}

Az elemeket az alábbiakban adom meg: az i. elem szövegé után közvetlenül az i. modell fotója következik.`,
    },
  ];

  for (let i = 0; i < inputs.length; i++) {
    const it = inputs[i];
    parts.push({
      text: `\n——— ${i + 1}. ELEM ———\nEredeti cím (EN): ${it.title}\nEredeti leírás (EN): ${
        it.description || "(üres)"
      }\n${it.image ? "Az ehhez az elemhez tartozó bemutatófotó:" : "(ehhez az elemhez nincs csatolt kép)"}`,
    });
    if (it.image) {
      parts.push({
        inlineData: { mimeType: it.image.mimeType, data: it.image.data },
      });
    }
  }

  parts.push({
    text: `\n${JSON_SHAPE_BATCH(inputs.length)}\n\nFONTOS: az i. elem cikkét kizárólag az i. elem szövege és az ahhoz beágyazott fotó alapján írd — a fotókat és az elemeket soha ne keverd össze!`,
  });

  // 8 hosszú cikk + thinking — bővebb kimeneti keret kell (a limit 64k).
  const { text, finishReason } = await callGemini(parts, apiKey, 36000);
  const parsed = parseJsonOrThrow(text, finishReason);
  const arr = Array.isArray(parsed) ? parsed : [parsed];

  if (arr.length !== inputs.length) {
    throw new Error(
      `Gemini értelmezési hiba: ${arr.length} elem érkezett ${inputs.length} helyett.`
    );
  }

  const mapped = inputs.map((it, idx) => {
    const p = (arr[idx] ?? {}) as {
      title?: string;
      excerpt?: string;
      description?: string;
      tags?: unknown;
    };
    return { it, p };
  });

  // Minőség-őr: ha bármelyik cikk hiányzik vagy kétesértelműen rövid, a
  // kötegelt választ elvetjük (a hívó post-onkénti tartalékra vált).
  for (let i = 0; i < mapped.length; i++) {
    const d = mapped[i].p.description;
    if (typeof d !== "string" || d.trim().length < 400) {
      throw new Error(
        `Gemini értelmezési hiba: a(z) ${i + 1}. elem cikke hiányzik vagy túl rövid.`
      );
    }
  }

  return mapped.map(({ it, p }) => ({
    title: (typeof p.title === "string" && p.title.trim() ? p.title : it.title).slice(0, 120),
    excerpt: (typeof p.excerpt === "string" ? p.excerpt : "").trim().slice(0, 200),
    description: (p.description || it.description || it.title).slice(0, MAX_DESCRIPTION_CHARS),
    tags: sanitizeTags(p.tags),
    ok: true,
  }));
}

/** Szöveges köteg: az összes bejegyzés egyetlen Gemini-hívásban. */
async function translateBatchText(
  inputs: TranslateInput[],
  apiKey: string
): Promise<TranslatedPost[]> {
  const keywordList =
    inputs[0].keywords && inputs[0].keywords.length
      ? inputs[0].keywords.join(", ")
      : BASE_BLOG_KEYWORDS.join(", ");

  const listText = inputs
    .map(
      (it, idx) =>
        `${idx + 1}. Eredeti cím (EN): ${it.title}\n   Eredeti leírás (EN): ${
          it.description || "(üres)"
        }`
    )
    .join("\n\n");

  const prompt = `Te egy tapasztalt magyar nyelvű SEO-szövegíró vagy, aki a festettszobrok.com — kézzel festett figurákat és 3D nyomtatott szobrokat készítő és árusító műhely — blogját írja. Gyűjtőknek, figurafestőknek és geek-rajongóknak írsz.

FELADAT: az alábbi 3D nyomtatott tervezői modellek MINDIKÉPZÉHEZ írj külön-külön RÉSZLETES, magyarnyelvű blogcikket — mindegyik ugyanazokkal a követelményekkel.

${articleRules(keywordList, "none")}

Mindegyik bejegyzésre érvényes a terjedelem (legalább 700 szó) és a tartalmi váz.

Lista:
${listText}

${JSON_SHAPE_BATCH(inputs.length)}`;

  const { text, finishReason } = await callGemini([{ text: prompt }], apiKey);
  const parsed = parseJsonOrThrow(text, finishReason);
  const arr = Array.isArray(parsed) ? parsed : [parsed];

  return inputs.map((it, idx) => {
    const p = (arr[idx] ?? {}) as {
      title?: string;
      excerpt?: string;
      description?: string;
      tags?: unknown;
    };
    return {
      title: (typeof p.title === "string" && p.title.trim() ? p.title : it.title).slice(0, 120),
      excerpt: (typeof p.excerpt === "string" ? p.excerpt : "").trim().slice(0, 200),
      description: (p.description || it.description || it.title).slice(0, MAX_DESCRIPTION_CHARS),
      tags: sanitizeTags(p.tags),
      ok: true,
    };
  });
}
