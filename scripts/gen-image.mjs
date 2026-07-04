// Genereer afbeeldingen via Gemini (nano-banana).
// Gebruik: node scripts/gen-image.mjs "prompt" [uitvoerpad.png] [--ratio 1:1]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const MODEL = "gemini-2.5-flash-image";

function loadKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const m = env.match(/^GEMINI_API_KEY=(.+)$/m);
  if (!m) throw new Error("GEMINI_API_KEY ontbreekt (.env of env-var).");
  return m[1].trim();
}

const prompt = process.argv[2];
const out = process.argv[3] || "src/assets/generated/output.png";
const ratioFlag = process.argv.indexOf("--ratio");
const ratio = ratioFlag !== -1 ? process.argv[ratioFlag + 1] : "1:1";
if (!prompt) throw new Error('Geef een prompt: node scripts/gen-image.mjs "..."');

const key = loadKey();
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

async function run(tries = 4) {
  for (let n = 1; n <= tries; n++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: ratio } },
      }),
    });
    if (res.ok) return res.json();
    const txt = await res.text();
    if (![429, 500, 503].includes(res.status) || n === tries) {
      console.error("HTTP", res.status, txt); process.exit(1);
    }
    const wait = 3000 * 2 ** (n - 1);
    console.error(`HTTP ${res.status}, retry ${n}/${tries} over ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
  }
}

const data = await run();
const img = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
if (!img) { console.error("Geen afbeelding terug:", JSON.stringify(data).slice(0, 500)); process.exit(1); }
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(img, "base64"));
console.log("OK ->", out);
