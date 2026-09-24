// Egyszeri Gemini API teszt — a produkciós kód translateBlogPosts() függvényét
// hívja ugyanazzal a kulccsal és prompttal, amit a blogszinkron használ.
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

// Ugyanaz a prompt-sablon, mint a src/lib/gemini.ts translateBlogPosts-jában
// (rövidítve egyetlen mintabejegyzésre).
const prompt = `Te egy magyar nyelvű, 3D nyomtatott festett szobrokat árusító webáruház (festettszobrok.com) blog szerkesztője vagy.
A feladatod: az alábbi 3D nyomtatott modell (Cults3D) angol címét és leírását fordítsd le természetes, olvasmányos magyar nyelvre, és írj belőle vonzó blogbejegyzést.
A szövegben természetes módon, erőltetés nélkül építs be néhányat a megadott SEO kulcsszavak közül (ha releváns). Különösen a "festett figurák" és a "kézzel festett figurák" kifejezéseket próbáld meg minden bejegyzésben szerepeltetni, ahol az gördülékenyen megoldható.
Minden bejegyzés legyen 2-4 rövid bekezdés, barátságos hangvételű. Ne emlékeztess kötelezően a "Cults3D" szóra.
FONTOS: A címben és a szövegben előforduló sajátneveket NE fordítsd le és NE torzítsd el; tartsd meg őket pontosan az eredeti (angol) alakjukban.

Kulcsszavak: festett figurák, kézzel festett figurák, 3D nyomtatott figura, gyűjtői figura, figurafestés

Lista:
1. Eredeti cím (EN): Space Marine Bust
   Eredeti leírás (EN): Highly detailed bust of a futuristic space marine, perfect for display on any collector's shelf.

Válaszolj KIZÁRÓLAG egy strict JSON tömbbel, pontosan 1 elemmel:
[
  { "title": "magyar cím, max 80 karakter", "excerpt": "egy frázis, max 160 karakter", "description": "teljes magyar blogszöveg, \\n\\n választja el a bekezdéseket" }
]`;

const started = Date.now();
try {
  const res = await fetch(`${url}?key=${encodeURIComponent(KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
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
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("HIBA: üres válasz (candidates üres).", JSON.stringify(json).slice(0, 500));
    process.exit(3);
  }

  let parsed;
  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    parsed = text;
  }

  console.log(`Sikeres válasz (${elapsed}s)\n`);
  const item = Array.isArray(parsed) ? parsed[0] : parsed;
  if (item?.title) {
    console.log(`Cím:     ${item.title}`);
    console.log(`Kivonat: ${item.excerpt ?? "(nincs)"}`);
    console.log(`Szöveg:  ${(item.description ?? "").slice(0, 300)}…`);
    const kwOk = /festett figur/i.test(`${item.title} ${item.excerpt} ${item.description}`);
    console.log(`\n"festett figurák" kulcsszó benne: ${kwOk ? "IGEN ✓" : "NEM ✗"}`);
  } else {
    console.log("Nyers válasz:", String(parsed).slice(0, 400));
  }
} catch (e) {
  console.error("Kérés sikertelen:", String(e).slice(0, 400));
  process.exit(4);
}
