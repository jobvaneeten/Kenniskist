// Generates crate artwork with Gemini's image model ("Nano Banana").
// Usage:
//   node --env-file=.env scripts/generate-crate-art.mjs <key> "<prompt>" [outFile]
//
// Reads GEMINI_API_KEY from the environment (put it in .env, never in code
// or chat). Saves the first inline image the model returns to
// public/crates/<outFile> (defaults to crate_<key>.webp — this will
// overwrite the existing file for that key).

const [, , key, prompt, outFile] = process.argv

if (!key || !prompt) {
  console.error('Usage: node --env-file=.env scripts/generate-crate-art.mjs <key> "<prompt>" [outFile]')
  process.exit(1)
}

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY ontbreekt. Zet hem in .env en run met --env-file=.env')
  process.exit(1)
}

const MODEL = 'gemini-2.5-flash-image'
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
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

const { mimeType, data: base64 } = imagePart.inlineData
const ext = mimeType.split('/')[1] || 'png'
const fileName = outFile || `crate_${key}.${ext}`
const outPath = new URL(`../public/crates/${fileName}`, import.meta.url)

await import('node:fs/promises').then(fs => fs.writeFile(outPath, Buffer.from(base64, 'base64')))
console.log(`Opgeslagen: public/crates/${fileName}`)
