// Generates Supervoetbal arena backgrounds with Gemini's "Nano Banana 2 Lite"
// image model (gemini-3.1-flash-lite-image).
// Usage:
//   node --env-file=.env scripts/generate-field-bg.mjs <level> "<prompt>"
//
// Reads GEMINI_API_KEY from the environment (put it in .env, never in code
// or chat). Saves to public/fields/field_<level>.webp (overwrites existing).

const [, , level, prompt] = process.argv

if (!level || !prompt) {
  console.error('Usage: node --env-file=.env scripts/generate-field-bg.mjs <level> "<prompt>"')
  process.exit(1)
}

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY ontbreekt. Zet hem in .env en run met --env-file=.env')
  process.exit(1)
}

const MODEL = 'gemini-3.1-flash-lite-image'
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { imageConfig: { aspectRatio: '16:9' } },
  }),
})

if (!res.ok) {
  console.error(`Gemini API fout ${res.status}:`, await res.text())
  process.exit(1)
}

const data = await res.json()
const parts = data.candidates?.[0]?.content?.parts || []
const imagePart = parts.find(p => p.inlineData)

if (!imagePart) {
  console.error('Geen afbeelding in de response:', JSON.stringify(data, null, 2))
  process.exit(1)
}

const { data: base64 } = imagePart.inlineData
const fileName = `field_${level}.webp`
const outPath = new URL(`../public/fields/${fileName}`, import.meta.url)

await import('node:fs/promises').then(fs => fs.mkdir(new URL('../public/fields/', import.meta.url), { recursive: true }))
await import('node:fs/promises').then(fs => fs.writeFile(outPath, Buffer.from(base64, 'base64')))
console.log(`Opgeslagen: public/fields/${fileName}`)
