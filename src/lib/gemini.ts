// Gemini (Google) fordító + SEO szövegíró a blog bejegyzésekhez.

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface TranslatedPost {
  title: string;
  excerpt: string;
  description: string;
}

export interface TranslateInput {
  title: string;
  description: string;
  keywords: string[];
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

export async function translateBlogPost(
  input: TranslateInput,
  apiKey: string
): Promise<TranslatedPost> {
  const keywordList =
    input.keywords && input.keywords.length
      ? input.keywords.join(", ")
      : "(nincs megadva kulcsszó)";

  const prompt = `Te egy magyar nyelvű, 3D nyomtatott festett szobrokat árusító webáruház (festettszobrok.com) blog szerkesztője vagy.
A feladatod: a megadott 3D nyomtatott modell (Cults3D) angol címét és leírását fordítsd le természetes, olvasmányos magyar nyelvre, és írj belőle egy vonzó blogbejegyzést.
A szövegben természetes módon, erőltetés nélkül építs be néhányat a megadott SEO kulcsszavak közül (ha releváns).
A bejegyzés legyen 2-4 rövid bekezdés, barátságos hangvételű, mintha egy kézműves műhely mutatná be a modellt.
Ne említsd a "Cults3D" szót kötelezően, de ha a forrás fontos, egy természetes utalás megengedett.
FONTOS: A címben és a szövegben előforduló sajátneveket — személyek, karakterek, márkák, termék‑/modellnevek, figurák nevei — NE fordítsd le és NE torzítsd el (ne magyarosítsd, ne átírd); tartsd meg őket pontosan az eredeti (angol) alakjukban. Csak a környező leíró szöveget fordítsd magyarra. Ha a cím gyakorlatilag csak a figura nevéből áll, hagyd a címet az eredeti névvel (esetleg rövid magyar körülírással kiegészítve, de a név változatlan marad).

Kulcsszavak: ${keywordList}

Eredeti cím (EN): ${input.title}
Eredeti leírás (EN): ${input.description || "(üres)"}

Válaszolj KIZÁRÓLAG egy strict JSON objektummal, semmi mással:
{
  "title": "magyar cím, maximum 80 karakter",
  "excerpt": "egyetlen frázis, ami összefoglalja a bejegyzést (max 160 karakter)",
  "description": "a teljes magyar blogszöveg bekezdésekkel, \\n\\n választja el a bekezdéseket"
}`;

  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini válasz ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini üres választ adott.");

  const parsed = extractJson(text) as {
    title?: string;
    excerpt?: string;
    description?: string;
  };

  return {
    title: (parsed.title || input.title).slice(0, 120),
    excerpt: (parsed.excerpt || "").slice(0, 200),
    description: parsed.description || input.description || input.title,
  };
}

/**
 * Több bejegyzés egyetlen Gemini-hívásban (batch) — drasztikusan csökkenti a
 * kérések számát, így a napi ingyenes kvóta sokkal kevesebb modellt érint.
 * Ugyanannyi elemet ad vissza, mint az input (sorrendben); ha valamelyiknél
 * üres a válasz, az eredeti EN szöveggel tér vissza.
 */
export async function translateBlogPosts(
  inputs: TranslateInput[],
  apiKey: string
): Promise<TranslatedPost[]> {
  if (!apiKey || inputs.length === 0) {
    return inputs.map((i) => ({ title: i.title, excerpt: "", description: i.description }));
  }

  const keywordList =
    inputs[0].keywords && inputs[0].keywords.length
      ? inputs[0].keywords.join(", ")
      : "(nincs megadva kulcsszó)";

  const listText = inputs
    .map(
      (it, idx) =>
        `${idx + 1}. Eredeti cím (EN): ${it.title}\n   Eredeti leírás (EN): ${
          it.description || "(üres)"
        }`
    )
    .join("\n\n");

  const prompt = `Te egy magyar nyelvű, 3D nyomtatott festett szobrokat árusító webáruház (festettszobrok.com) blog szerkesztője vagy.
A feladatod: az alábbi 3D nyomtatott modellek (Cults3D) angol címét és leírását fordítsd le természetes, olvasmányos magyar nyelvre, és írj belőlük vonzó blogbejegyzéseket.
A szövegben természetes módon, erőltetés nélkül építs be néhányat a megadott SEO kulcsszavak közül (ha releváns).
Minden bejegyzés legyen 2-4 rövid bekezdés, barátságos hangvételű. Ne emlékeztess kötelezően a "Cults3D" szóra.
FONTOS: A címben és a szövegben előforduló sajátneveket — személyek, karakterek, márkák, termék‑/modellnevek, figurák nevei — NE fordítsd le és NE torzítsd el (ne magyarosítsd, ne átírd); tartsd meg őket pontosan az eredeti (angol) alakjukban. Csak a környező leíró szöveget fordítsd magyarra. Ha egy cím csak a figura nevéből áll, hagyd azt az eredeti névvel (esetleg rövid magyar körülírással, de a név változatlan marad).

Kulcsszavak: ${keywordList}

Lista:
${listText}

Válaszolj KIZÁRÓLAG egy strict JSON tömbbel, pontosan ${inputs.length} elemmel, az eredeti sorrendben:
[
  { "title": "magyar cím, max 80 karakter", "excerpt": "egy frázis, max 160 karakter", "description": "teljes magyar blogszöveg, \\n\\n választja el a bekezdéseket" }
]`;

  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini válasz ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini üres választ adott.");

  const parsed = extractJson(text);
  const arr = Array.isArray(parsed) ? parsed : [parsed];

  return inputs.map((it, idx) => {
    const p = (arr[idx] ?? {}) as {
      title?: string;
      excerpt?: string;
      description?: string;
    };
    return {
      title: (p.title || it.title).slice(0, 120),
      excerpt: (p.excerpt || "").slice(0, 200),
      description: p.description || it.description || it.title,
    };
  });
}
