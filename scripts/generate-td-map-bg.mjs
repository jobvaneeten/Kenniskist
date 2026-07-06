// Genereert Tower Defense map-achtergronden (terrein + pad in één beeld) met
// Gemini's "Nano Banana 2 Lite" (gemini-3.1-flash-lite-image).
// Usage:
//   node --env-file=.env scripts/generate-td-map-bg.mjs <mapId> "<prompt>"
//
// Reads GEMINI_API_KEY from the environment (put it in .env, never in code
// or chat). Saves to public/Towerdefence/Map/bg_map<mapId>.webp (overwrites existing).

const [, , mapId, prompt] = process.argv

if (!mapId || !prompt) {
  console.error('Usage: node --env-file=.env scripts/generate-td-map-bg.mjs <mapId> "<prompt>"')
  process.exit(1)
}

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY ontbreekt. Zet hem in .env en run met --env-file=.env')
  process.exit(1)
}

const MODEL = 'gemini-3.1-flash-lite-image'
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`

async function run(tries = 4) {
  for (let n = 1; n <= tries; n++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { imageConfig: { aspectRatio: '3:2' } },
      }),
    })
    if (res.ok) return res.json()
    const txt = await res.text()
    if (![429, 500, 503].includes(res.status) || n === tries) {
      console.error(`Gemini API fout ${res.status}:`, txt)
      process.exit(1)
    }
    const wait = 3000 * 2 ** (n - 1)
    console.error(`HTTP ${res.status}, retry ${n}/${tries} over ${wait}ms`)
    await new Promise(r => setTimeout(r, wait))
  }
}

const data = await run()
const parts = data.candidates?.[0]?.content?.parts || []
const imagePart = parts.find(p => p.inlineData)

if (!imagePart) {
  console.error('Geen afbeelding in de response:', JSON.stringify(data, null, 2))
  process.exit(1)
}

const { data: base64 } = imagePart.inlineData
const fileName = `bg_map${mapId}.webp`
const outPath = new URL(`../public/Towerdefence/Map/${fileName}`, import.meta.url)

await import('node:fs/promises').then(fs => fs.mkdir(new URL('../public/Towerdefence/Map/', import.meta.url), { recursive: true }))
await import('node:fs/promises').then(fs => fs.writeFile(outPath, Buffer.from(base64, 'base64')))
console.log(`Opgeslagen: public/Towerdefence/Map/${fileName}`)
