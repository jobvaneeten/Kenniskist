// Genereert een naadloos herhaalbare grondtextuur (pad of water) voor Tower
// Defense met Gemini's "Nano Banana 2 Lite" (gemini-3.1-flash-lite-image).
// Usage:
//   node --env-file=.env scripts/generate-td-tile.mjs <naam> "<prompt>"
//
// Slaat op in public/Towerdefence/Map/tiles/<naam>.webp (overwrites existing).

const [, , naam, prompt] = process.argv

if (!naam || !prompt) {
  console.error('Usage: node --env-file=.env scripts/generate-td-tile.mjs <naam> "<prompt>"')
  process.exit(1)
}

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY ontbreekt. Zet hem in .env en run met --env-file=.env')
  process.exit(1)
}

const MODEL = 'gemini-3.1-flash-lite-image'
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`

const fullPrompt = `${prompt}. Top-down flat texture, seamless tileable pattern, no shadows from objects, no border, no vignette, uniform lighting, fills the entire frame edge to edge.`

async function run(tries = 4) {
  for (let n = 1; n <= tries; n++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { imageConfig: { aspectRatio: '1:1' } },
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
const fileName = `${naam}.webp`
const outPath = new URL(`../public/Towerdefence/Map/tiles/${fileName}`, import.meta.url)

await import('node:fs/promises').then(fs => fs.mkdir(new URL('../public/Towerdefence/Map/tiles/', import.meta.url), { recursive: true }))
await import('node:fs/promises').then(fs => fs.writeFile(outPath, Buffer.from(base64, 'base64')))
console.log(`Opgeslagen: public/Towerdefence/Map/tiles/${fileName}`)
