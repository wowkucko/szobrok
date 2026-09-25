// Egyszeri Gemini API teszt — az ÚJ, hosszú cikkíró promptot próbálja ki
// (ugyanaz a struktúra, amit a src/lib/gemini.ts translateBlogPost használ).
// Futtatás: node scripts/test-gemini.mjs
import { readFileSync } from "node:fs";

// .env.local beolvasása (a teszt script nem Next.js folyamat)
const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
}

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const KEY = process.env.GEMINI_API_KEY;

if (!KEY) {
  console.error("HIBA: nincs GEMINI_API_KEY a .env.local-ban.");
  process.exit(1);
}
console.log(`Modell: ${MODEL}`);
console.log(`Kulcs: ${KEY.slice(0, 6)}*** (maszkolt)\n`);

const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const KEYWORDS = [
  "festett figurák",
  "kézzel festett figurák",
  "3D nyomtatott figura",
  "gyűjtői figura",
  "figurafestés",
  "festett szobrok",
].join(", ");

// A src/lib/gemini.ts articleRules() szövegének másolata (képes verzió).
const rules = `STÍLUS ÉS TERJEDELEM:
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
- Építsd be természetesen az alábbi kulcsszavakat (mindegyik legalább egyszer, az ELSŐ fő kulcsszó legalább 3-szor, egyes/többes szám és ragok variálásával): ${KEYWORDS}
- Ne legyen kulcsszó-halmozás: a szöveg maradjon gördülékeny, emberi olvasmány.
- Ne említsd kötelezően a "Cults3D" szót; egy természetes utalás megengedett.
- Ne találj ki árat, méretet vagy szállítási részletet.

FONTOS: a sajátneveket (személyek, karakterek, márkák, termék-/modellnevek) NE fordítsd le és NE torzítsd el — maradjanak pontosan az eredeti (angol) alakjukban. Ha a cím lényegében csak a figura neve, a cím maradjon a név, rövid magyar körülírással kiegészítve.

Nincs csatolt kép: a cikket az eredeti cím és leírás alapján írd; a megjelenést igyekezz elképzelni és leírni, de konkrét képrészleteket ne állíts.`;

const prompt = `Te egy tapasztalt magyar nyelvű SEO-szövegíró vagy, aki a festettszobrok.com — kézzel festett figurákat és 3D nyomtatott szobrokat készítő és árusító műhely — blogját írja. Gyűjtőknek, figurafestőknek és geek-rajongóknak írsz.

FELADAT: az alábbi 3D nyomtatott tervezői modellhez írj RÉSZLETES, magyarnyelvű blogcikket, ami jól teljesít a Google-keresőkben és valódi olvasmányélmény.

${rules}

Eredeti cím (EN): Space Marine Bust
Eredeti leírás (EN): Highly detailed bust of a futuristic space marine, perfect for display on any collector's shelf.

Válaszolj KIZÁRÓLAG egy strict JSON objektummal, semmi mással:
{
  "title": "magyar SEO-cím, maximum 80 karakter, lehetőleg a fő kulcsszóval",
  "excerpt": "1-2 mondat, max 160 karakter, kulcsszavakkal",
  "description": "a teljes hosszú magyar cikk: bekezdések üres sorral (\\n\\n) elválasztva, alcímek '## ' előtaggal",
  "tags": ["8-12 db rövid címke (1-3 szó, kisbetűvel): téma, franchise- vagy karakternév, stílus, festési technika"]
}`;

const started = Date.now();
try {
  const res = await fetch(`${url}?key=${encodeURIComponent(KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 24000,
        temperature: 0.85,
      },
    }),
  });
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  if (!res.ok) {
    const body = await res.text();
    console.error(`HIBA: HTTP ${res.status} (${elapsed}s)`);
    console.error(body.slice(0, 800));
    process.exit(2);
  }

  const json = await res.json();
  const candidate = json.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) {
    console.error("HIBA: üres válasz (candidates üres).", JSON.stringify(json).slice(0, 500));
    process.exit(3);
  }

  let parsed;
  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    console.error("HIBA: nem JSON a válasz. finishReason:", candidate?.finishReason);
    console.error(text.slice(0, 500));
    process.exit(5);
  }

  const item = Array.isArray(parsed) ? parsed[0] : parsed;
  const desc = item?.description ?? "";
  const words = desc.split(/\s+/).filter(Boolean).length;
  const headings = (desc.match(/^##\s+/gm) ?? []).length;
  console.log(`Sikeres válasz (${elapsed}s), finishReason: ${candidate?.finishReason}\n`);
  console.log(`Cím:      ${item.title}`);
  console.log(`Kivonat:  ${item.excerpt ?? "(nincs)"}`);
  console.log(`Címkék:   ${(item.tags ?? []).join(", ")}`);
  console.log(`Terjedelem: ${words} szó / ${desc.length} karakter / ${headings} alcím / ${desc.split(/\n{2,}/).length} bekezdés`);

  const kw = `${item.title} ${item.excerpt} ${desc}`.toLowerCase();
  const checks = [
    ["festett figura", /festett figur/i.test(kw)],
    ["kézzel festett", /kézzel festett/i.test(kw)],
    ["3D nyomtatott", /3d nyomtatott/i.test(kw)],
    ["figurafestés", /figurafest/i.test(kw)],
  ];
  console.log("");
  for (const [name, ok] of checks) {
    console.log(`${ok ? "✓" : "✗"} kulcsszó benne: ${name}`);
  }
  console.log(
    `\n${words >= 700 ? "✓ TERJEDELEM OK (700+ szó)" : `✗ TÚL RÖVID: ${words} szó (cél: 700+)`}`
  );
} catch (e) {
  console.error("Kérés sikertelen:", String(e).slice(0, 400));
  process.exit(4);
}
