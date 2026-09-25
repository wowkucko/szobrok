// Egyszeri Gemini API teszt — a KÖTEGELT, képes (vision) hívást próbálja ki,
// ugyanazzal a felépítéssel, amit a src/lib/gemini.ts translateBatchVision használ.
// Futtatás: node scripts/test-gemini-batch.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

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

// Két valódi bemutatófotó a data/uploads-ból (csak igazi, nagy képek).
const uploadDir = new URL("../data/uploads/", import.meta.url);
const files = readdirSync(uploadDir)
  .filter((f) => /\.(jpg|jpeg|webp)$/i.test(f))
  .filter((f) => statSync(new URL(`../data/uploads/${f}`, import.meta.url)).size > 50_000)
  .slice(0, 2);
if (files.length < 2) {
  console.error("HIBA: nincs elég kép a data/uploads mappában.");
  process.exit(1);
}
const images = files.map((f) => ({
  data: readFileSync(path.join(uploadDir.pathname.replace(/^\/([A-Za-z]:)/, "$1"), f)).toString("base64"),
  mimeType: f.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
  file: f,
}));
console.log(`Képek: ${files.join(", ")}`);

const KEYWORDS = [
  "festett figurák",
  "kézzel festett figurák",
  "3D nyomtatott figura",
  "gyűjtői figura",
  "figurafestés",
  "festett szobrok",
].join(", ");

// A src/lib/gemini.ts articleRules() másolata (batch képes mód).
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

MINDEN ELEMHEZ beágyaztuk a modell bemutatófotóját (közvetlenül az elem szövege után). Minden cikket a saját fotójára építs: elemezd ki részletesen, mit látsz rajta (karakter/figura, póz, felszerelés, fegyverek, ruházat, textúrák, bázis), milyen a hangulata, milyen színek és anyaghatások dominálnak (fém, bőr, ruha, fa, kő, világító OSL-effekt), milyen festési technikákat igényel, és hogyan mutatna jól polcon vagy vitrinben. A fotókat szigorúan a saját elemükhöz rendelve kezeld — soha ne keverd őket!`;

// Teszt-elemek (a kép után dőlnek el a cikkek — a model elemezze a fotót).
const items = [
  { title: "Test Item One – Collectible Figure", description: "A highly detailed collectible figure with dynamic pose and ornate base." },
  { title: "Test Item Two – Display Bust", description: "An expressive display bust with fine surface details, ideal for shelf display." },
];

const parts = [
  {
    text: `Te egy tapasztalt magyar nyelvű SEO-szövegíró vagy, aki a festettszobrok.com — kézzel festett figurákat és 3D nyomtatott szobrokat készítő és árusító műhely — blogját írja. Gyűjtőknek, figurafestőknek és geek-rajongóknak írsz.

FELADAT: az alábbi ${items.length} darab 3D nyomtatott tervezői modell MINDIKÉPZÉHEZ írj külön-külön RÉSZLETES, magyarnyelvű blogcikket — mindegyik ugyanazokkal a követelményekkel.

${rules}

Az elemeket az alábbiakban adom meg: az i. elem szövege után közvetlenül az i. modell fotója következik.`,
  },
];

for (let i = 0; i < items.length; i++) {
  parts.push({
    text: `\n——— ${i + 1}. ELEM ———\nEredeti cím (EN): ${items[i].title}\nEredeti leírás (EN): ${items[i].description}\nAz ehhez az elemhez tartozó bemutatófotó:`,
  });
  parts.push({ inlineData: { mimeType: images[i].mimeType, data: images[i].data } });
}

parts.push({
  text: `\nVálaszolj KIZÁRÓLAG egy strict JSON tömbbel, pontosan ${items.length} elemmel, az eredeti sorrendben:
[
  { "title": "magyar SEO-cím, max 80 karakter", "excerpt": "max 160 karakter", "description": "a teljes hosszú magyar cikk, \\n\\n elválasztott bekezdésekkel és '## ' alcímekkel", "tags": ["8-12 db rövid címke"] }
]

FONTOS: az i. elem cikkét kizárólag az i. elem szövege és az ahhoz beágyazott fotó alapján írd — a fotókat és az elemeket soha ne keverd össze!`,
});

const started = Date.now();
try {
  const res = await fetch(`${url}?key=${encodeURIComponent(KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 36000,
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
    console.error("HIBA: üres válasz.", JSON.stringify(json).slice(0, 500));
    process.exit(3);
  }

  let arr;
  try {
    arr = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    console.error("HIBA: nem JSON a válasz. finishReason:", candidate?.finishReason);
    console.error(text.slice(0, 400));
    process.exit(5);
  }
  if (!Array.isArray(arr)) arr = [arr];

  console.log(`Sikeres válasz (${elapsed}s), finishReason: ${candidate?.finishReason}, elemek: ${arr.length}/${items.length}\n`);

  for (let i = 0; i < arr.length; i++) {
    const it = arr[i];
    const desc = it?.description ?? "";
    const words = desc.split(/\s+/).filter(Boolean).length;
    const headings = (desc.match(/^##\s+/gm) ?? []).length;
    console.log(`— ${i + 1}. elem —`);
    console.log(`  Cím:     ${it.title}`);
    console.log(`  Címkék:  ${(it.tags ?? []).slice(0, 12).join(", ")}`);
    console.log(`  Terjedelem: ${words} szó / ${headings} alcím`);
    console.log(`  Kezdet:  ${desc.slice(0, 180)}…\n`);
  }

  const ok = arr.every((it) => (it?.description ?? "").split(/\s+/).filter(Boolean).length >= 400);
  console.log(ok ? "✓ KÖTEGELT KÉPES HÍVÁS OK — mindkét cikk hosszú és képre épül" : "✗ valamelyik cikk túl rövid");
} catch (e) {
  console.error("Kérés sikertelen:", String(e).slice(0, 400));
  process.exit(4);
}
