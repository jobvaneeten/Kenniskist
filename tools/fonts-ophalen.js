// Haalt de gebruikte Google Fonts één keer op en zet ze in public/fonts/, zodat
// de site ze zelf serveert: zo krijgt Google geen IP-adressen van leerlingen.
// Alleen de subsets latin + latin-ext (genoeg voor Nederlands, Duits, Frans…).
// Opnieuw draaien na het toevoegen van een lettertype: node tools/fonts-ophalen.js
import { mkdir, writeFile } from 'node:fs/promises'

const FAMILIES = [
  'Nunito:wght@400;600;700;800;900',
  'Baloo+2:wght@500;600;700;800',
  'Russo+One',
  'Outfit:wght@400;600;800',
  'Space+Mono:wght@400;700',
  'Inter:wght@400;500;600;700',
  'Orbitron:wght@500;700;900',
  'Rajdhani:wght@500;600;700',
]
const SUBSETS = ['latin', 'latin-ext']
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const DIR = new URL('../public/fonts/', import.meta.url)

await mkdir(DIR, { recursive: true })
const url = 'https://fonts.googleapis.com/css2?' + FAMILIES.map(f => 'family=' + f).join('&') + '&display=swap'
const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text()

// blokken staan als: /* latin */ @font-face { … }
const blokken = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*{[^}]+})/g)]
const gedaan = new Map()
let uit = '/* Zelf gehoste lettertypen (SIL Open Font License) — gegenereerd door tools/fonts-ophalen.js */\n'
for (const [, subset, blok] of blokken) {
  if (!SUBSETS.includes(subset)) continue
  const familie = blok.match(/font-family:\s*'([^']+)'/)[1]
  const bron = blok.match(/url\((https:[^)]+\.woff2)\)/)[1]
  if (!gedaan.has(bron)) {
    const naam = `${familie.toLowerCase().replace(/\s+/g, '-')}-${subset}-${gedaan.size}.woff2`
    const buf = Buffer.from(await (await fetch(bron)).arrayBuffer())
    await writeFile(new URL(naam, DIR), buf)
    gedaan.set(bron, naam)
  }
  uit += `/* ${subset} */\n` + blok.replace(bron, '/fonts/' + gedaan.get(bron)) + '\n'
}
await writeFile(new URL('fonts.css', DIR), uit)
console.log(`${gedaan.size} lettertypebestanden, ${blokken.filter(b => SUBSETS.includes(b[1])).length} @font-face-regels`)
