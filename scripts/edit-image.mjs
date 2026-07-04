// Bewerk een bestaande afbeelding via Gemini nano-banana (image-to-image).
// Gebruik: node scripts/edit-image.mjs <invoer.png> <uitvoer.png> "instructie" [--ratio 1:1]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const MODEL = "gemini-2.5-flash-image";

function loadKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const m = env.match(/^GEMINI_API_KEY=(.+)$/m);
  if (!m) throw new Error("GEMINI_API_KEY ontbreekt.");
  return m[1].trim();
}

const [inPath, outPath, instruction] = process.argv.slice(2);
const ratioFlag = process.argv.indexOf("--ratio");
const ratio = ratioFlag !== -1 ? process.argv[ratioFlag + 1] : "1:1";
if (!inPath || !outPath || !instruction)
  throw new Error('Gebruik: node scripts/edit-image.mjs <in.png> <uit.png> "instructie"');

const key = loadKey();
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
const body = JSON.stringify({
  contents: [{ parts: [
    { text: instruction },
    { inlineData: { mimeType: "image/png", data: readFileSync(inPath).toString("base64") } },
  ]}],
  generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: ratio } },
});

async function run(tries = 4) {
  for (let n = 1; n <= tries; n++) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    if (res.ok) return res.json();
    const txt = await res.text();
    if (![429, 500, 503].includes(res.status) || n === tries) { console.error("HTTP", res.status, txt); process.exit(1); }
    const wait = 3000 * 2 ** (n - 1);
    console.error(`HTTP ${res.status}, retry ${n}/${tries} over ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
  }
}

const data = await run();
const img = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
if (!img) { console.error("Geen afbeelding terug:", JSON.stringify(data).slice(0, 500)); process.exit(1); }
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.from(img, "base64"));
console.log("OK ->", outPath);
