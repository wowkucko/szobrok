// Gemini diagnosztika: melyik kéréstípus váltja ki a 503-at?
// Variantok: modelllista → szöveg → 1 kép → 2 kép (24k) → 2 kép (36k)
// Futtatás: node scripts/diag-gemini.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
}

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const KEY = process.env.GEMINI_API_KEY;
const BASE = "https://generativelanguage.googleapis.com/v1beta";

console.log(`Modell: ${MODEL} | Kulcs: ${KEY.slice(0, 6)}***\n`);

// 0) Modelllista — működik-e egyáltalán az API és a kulcs?
const listRes = await fetch(`${BASE}/models?key=${encodeURIComponent(KEY)}&pageSize=100`);
console.log(`[0] Modelllista: HTTP ${listRes.status}`);
if (listRes.ok) {
  const body = await listRes.json();
  const names = (body.models ?? []).map((m) => String(m.name || "").replace("models/", ""));
  const similar = names.filter((n) => n.includes("flash") || n.includes("pro")).slice(0, 25);
  console.log(`    ${names.length} modell. Flash/Pro változatok: ${similar.join(", ")}`);
  console.log(`    A "${MODEL}" szerepel a listában: ${names.includes(MODEL) ? "IGEN ✓" : "NEM ✗"}`);
} else {
  console.log("    " + (await listRes.text()).slice(0, 300));
}
console.log("");

async function genContent(label, parts, maxOutputTokens, timeoutMs = 120000) {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(
      `${BASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens,
            temperature: 0.85,
          },
        }),
        signal: ctrl.signal,
      }
    );
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.log(`[${label}] HTTP ${res.status} (${secs}s) — ${(body.match(/"message":\s*"([^"]{0,80})/) || [])[1] ?? ""}`);
      return { ok: false, status: res.status };
    }
    const json = await res.json();
    const cand = json.candidates?.[0];
    const text = cand?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const words = text.split(/\s+/).filter(Boolean).length;
    console.log(`[${label}] OK (${secs}s) — finishReason: ${cand?.finishReason}, válasz: ${text.length} kar / ${words} szó`);
    return { ok: true, status: 200 };
  } catch (e) {
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`[${label}] KIVÉTEL (${secs}s): ${String(e).slice(0, 120)}`);
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

const TEXT_PART =
  "Írj egy 700 szavas magyar SEO-blogcikket egy kézzel festett Space Marine mellszoborról. " +
  "Válaszolj JSON-ben: {\"title\": \"...\", \"excerpt\": \"...\", \"description\": \"...\"}.";

const uploads = new URL("../data/uploads/", import.meta.url);
const files = readdirSync(uploads)
  .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
  .map((f) => path.join(uploads.pathname.replace(/^\/([A-Za-z]:)/, "$1"), f))
  .filter((p) => statSync(p).size < 900_000) // kisebb képek a gyors teszthez
  .sort((a, b) => statSync(a).size - statSync(b).size)
  .slice(0, 2);

const img = (i) => ({
  inlineData: {
    mimeType: files[i].toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
    data: readFileSync(files[i]).toString("base64"),
  },
});

console.log(`Tesztképek: ${files.map((f) => `${path.basename(f)} (${Math.round(statSync(f).size / 1024)} kB)`).join(", ")}\n`);

// 1) Csak szöveg
const r1 = await genContent("1 szoveg", [{ text: TEXT_PART }], 24000);

// 2) Egy kép + szöveg
const r2 = await genContent("1 kep", [{ text: "Írj egy 700 szavas magyar SEO-blogcikket erről a figuráról (JSON: title/excerpt/description)." }, img(0)], 24000);

// 3) Két kép, kisebb tokenlimit
const r3 = await genContent("2 kep 24k", [{ text: "Írj minden képhez egy rövid (100 szavas) magyar cikket (JSON tömb)." }, img(0), img(1)], 24000);

// 4) Két kép, nagy tokenlimit
const r4 = await genContent("2 kep 36k", [{ text: "Írj minden képhez egy 700 szavas magyar SEO-blogcikket (JSON tömb)." }, img(0), img(1)], 36000);

console.log(`\nÖSSZEGZÉS: szoveg=${r1.status} 1kep=${r2.status} 2kep24k=${r3.status} 2kep36k=${r4.status}`);
