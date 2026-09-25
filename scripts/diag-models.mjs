// Gyors próba: melyik alternatív Gemini modell működik ezzel a kulccsal.
// Minden modellre egy minimális kérés megy (pár token), hogy a kvótát kíméljük.
// Futtatás: node scripts/diag-models.mjs
import { readFileSync } from "node:fs";

const envText = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
}
const KEY = process.env.GEMINI_API_KEY;
const BASE = "https://generativelanguage.googleapis.com/v1beta";

const MODELS = [
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

console.log("Kulcs:", KEY.slice(0, 6) + "***\n");

for (const model of MODELS) {
  const started = Date.now();
  try {
    const res = await fetch(
      `${BASE}/models/${model}:generateContent?key=${encodeURIComponent(KEY)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Válaszolj pontosan ennyit: OK" }] }],
          generationConfig: { maxOutputTokens: 3000 },
        }),
      }
    );
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    if (res.ok) {
      const j = await res.json();
      const txt = j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      console.log(`${model.padEnd(26)} ✓ HTTP 200 (${secs}s) — válasz: ${txt.trim().slice(0, 40) || "(üres)"}`);
    } else {
      const body = await res.text().catch(() => "");
      const msg = (body.match(/"message":\s*"([^"]{0,90})/) || [])[1] ?? "";
      console.log(`${model.padEnd(26)} ✗ HTTP ${res.status} (${secs}s) — ${msg}`);
    }
  } catch (e) {
    console.log(`${model.padEnd(26)} ✗ KIVÉTEL: ${String(e).slice(0, 80)}`);
  }
}
