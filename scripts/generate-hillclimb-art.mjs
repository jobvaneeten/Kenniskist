// Genereert alle Hill Climb-artwork in één run met Gemini image-modellen:
// "Nano Banana 2 Lite" voor opaque achtergronden/grondtexturen/levelkaarten,
// en het gewone "Nano Banana" model voor losse sprites die echte
// alpha-transparantie nodig hebben (voertuigen, wielen, props, UI-iconen).
// Slaat op in public/Hillclimb/.
// Usage: node --env-file=.env scripts/generate-hillclimb-art.mjs [filter]
//   filter = optionele, komma-gescheiden substrings om een subset te genereren.

import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY ontbreekt. Zet hem in .env en run met --env-file=.env')
  process.exit(1)
}

// Geen enkel Gemini image-model levert echte alpha op als je gewoon om een
// "transparante achtergrond" vraagt — het model tekent dan een schaakbord-
// patroon of een egale kleur als "symbool" voor transparantie, zonder een
// echt alpha-kanaal. Voor sprites vragen we daarom een egale magenta
// (chroma-key) achtergrond en knippen die er zelf uit met sharp.
const MODEL_LITE = 'gemini-3.1-flash-lite-image'
const MODEL_SPRITE = 'gemini-2.5-flash-image'
const urlFor = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

const CHROMA_THRESHOLD = 50
const CHROMA_FEATHER = 40

async function chromaKey(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const idx = (x, y) => (y * width + x) * channels
  const corners = [idx(0, 0), idx(width - 1, 0), idx(0, height - 1), idx(width - 1, height - 1), idx(Math.floor(width / 2), 0)]
  let kr = 0, kg = 0, kb = 0
  corners.forEach(i => { kr += data[i]; kg += data[i + 1]; kb += data[i + 2] })
  kr /= corners.length; kg /= corners.length; kb /= corners.length
  for (let i = 0; i < data.length; i += channels) {
    const dr = data[i] - kr, dg = data[i + 1] - kg, db = data[i + 2] - kb
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)
    if (dist < CHROMA_THRESHOLD) data[i + 3] = 0
    else if (dist < CHROMA_THRESHOLD + CHROMA_FEATHER) data[i + 3] = Math.round(255 * (dist - CHROMA_THRESHOLD) / CHROMA_FEATHER)
  }

  // Vlekken die de rand raken (artefacten van het model) wegvegen — het
  // object zelf staat gecentreerd en raakt de rand nooit.
  const A = (x, y) => (y * width + x) * channels + 3
  const stack = []
  for (let x = 0; x < width; x++) { if (data[A(x, 0)] > 0) stack.push([x, 0]); if (data[A(x, height - 1)] > 0) stack.push([x, height - 1]) }
  for (let y = 0; y < height; y++) { if (data[A(0, y)] > 0) stack.push([0, y]); if (data[A(width - 1, y)] > 0) stack.push([width - 1, y]) }
  while (stack.length) {
    const [x, y] = stack.pop()
    if (x < 0 || y < 0 || x >= width || y >= height) continue
    const i = A(x, y)
    if (data[i] === 0) continue
    data[i] = 0
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }

  // Croppen op de alpha-bounding-box zodat de sprite strak om het object past
  let minX = width, minY = height, maxX = 0, maxY = 0
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[A(x, y)] > 8) {
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
    }
  }
  const pad = 4
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad)
  maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad)
  return sharp(data, { raw: { width, height, channels } })
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .png().toBuffer()
}

const STYLE = 'Vrolijke cartoonstijl, dikke zwarte outlines, felle verzadigde kleuren, kindvriendelijk, digital game art, geen tekst, geen watermerk, geen logo.'
const STYLE_SCENE = `${STYLE} Brede game-achtergrond illustratie.`
const STYLE_SPRITE = `${STYLE} Eén los object, strak gecentreerd. De achtergrond is een perfect egale, vlakke magenta kleur (hex FF00FF), verder helemaal niets op de achtergrond, geen schaduw, geen verloop, geen textuur.`
const STYLE_TILE = 'Top-down vlakke textuur, naadloos herhaalbaar patroon (seamless tileable), geen schaduwen van objecten, geen rand, geen vignet, uniforme belichting, vult het hele beeld tot de rand, geen tekst.'

const LEVELS = {
  heuvels: {
    lucht: 'Heldere blauwe hemel met een paar dikke witte wolken en een zachte zon, vrolijke lente-sfeer.',
    ver:   'Verre glooiende groene heuvels als silhouet tegen de horizon, zachte kleuren.',
    dichtbij: 'Groene glooiende heuvels dichterbij met losse bomen en struiken, vrolijk landelijk landschap.',
    grond: 'Grasgroene grond met bloemetjes en kleine steentjes, zomers grasveld.',
  },
  woestijn: {
    lucht: 'Warme oranje woestijnlucht met een felle zon en een paar dunne wolken.',
    ver:   'Verre zandduinen en rotsformaties als silhouet, warme okerkleuren.',
    dichtbij: 'Zandduinen dichterbij met cactussen en verspreide rotsblokken.',
    grond: 'Zanderige woestijngrond met kleine steentjes en scheurtjes, geel-oranje zand.',
  },
  winter: {
    lucht: 'Bleke winterlucht met zachte grijs-blauwe wolken en sneeuwvlokjes.',
    ver:   'Besneeuwde bergtoppen als silhouet in de verte, koude blauwe tinten.',
    dichtbij: 'Besneeuwde heuvels dichterbij met dennenbomen vol sneeuw.',
    grond: 'Gladde besneeuwde grond met ijsplekken en lichte glinstering.',
  },
  grot: {
    lucht: 'Donker grotplafond met hangende stalactieten en een zacht glinsterend kristallicht.',
    ver:   'Diepe donkere grotwand in de verte met vage lichtgevende kristallen.',
    dichtbij: 'Ruige grotwanden dichterbij met stalagmieten en glimmende kristallen.',
    grond: 'Rotsachtige grotvloer met steentjes en een paar kleine glimmende kristallen.',
  },
  maan: {
    lucht: 'Zwarte sterrenhemel met sterren en de aarde klein in de verte, ruimtesfeer.',
    ver:   'Verre maankraters en lage bergen als silhouet tegen de zwarte lucht.',
    dichtbij: 'Maanoppervlak dichterbij met kraters en losse rotsblokken, grijze tinten.',
    grond: 'Grijze maanstof met kleine kratertjes en steentjes, poederachtige textuur.',
  },
}

const LEVEL_CARD = {
  heuvels: 'Zonnig groen heuvellandschap met een kronkelend paadje, vrolijke sfeer, kleine game-illustratie.',
  woestijn: 'Zonnige woestijn met duinen en cactussen, warme kleuren, kleine game-illustratie.',
  winter: 'Besneeuwd berglandschap met dennenbomen, koude blauwe kleuren, kleine game-illustratie.',
  grot: 'Donkere grot met glimmende kristallen en stalagmieten, mysterieuze sfeer, kleine game-illustratie.',
  maan: 'Grijs maanoppervlak met kraters en sterren op de achtergrond, ruimtesfeer, kleine game-illustratie.',
}

// Carrosserieën ZONDER wielen: de wielen zijn aparte sprites die in het spel
// op de physics-posities draaien.
const VEHICLES = {
  jeep: 'Zijaanzicht van de carrosserie van een vrolijke groene safari-jeep, ZONDER wielen: lege donkere halfronde wielkasten linksonder en rechtsonder waar de wielen horen. Met cabine, voorruit en koplamp, voorkant naar rechts.',
  motor: 'Zijaanzicht van het frame van een snelle rode crossmotor, ZONDER wielen: alleen frame, tank, zadel, stuur en voorvork, open ruimtes waar de wielen horen. Voorkant naar rechts.',
  monstertruck: 'Zijaanzicht van de carrosserie van een stoere blauwe monstertruck pick-up, ZONDER wielen: hoog chassis met lege donkere halfronde wielkasten linksonder en rechtsonder. Met cabine en voorruit, voorkant naar rechts.',
}

const WHEELS = {
  jeep: 'Rond autowiel, zwarte band met een groen-witte velg, cartoonstijl, van opzij.',
  motor: 'Rond motorwiel, zwarte band met een rood-zilveren velg, cartoonstijl, van opzij.',
  monstertruck: 'Groot rond monstertruckwiel, dikke geribbelde zwarte band met een blauwe velg, cartoonstijl, van opzij.',
}

const ASSETS = []

for (const [id, layers] of Object.entries(LEVELS)) {
  ASSETS.push({ name: `bg_${id}_lucht`, prompt: `${layers.lucht} ${STYLE_SCENE}`, out: `Levels/${id}/lucht.webp`, ratio: '16:9' })
  ASSETS.push({ name: `bg_${id}_ver`, prompt: `${layers.ver} ${STYLE_SCENE}`, out: `Levels/${id}/ver.webp`, ratio: '16:9' })
  ASSETS.push({ name: `bg_${id}_dichtbij`, prompt: `${layers.dichtbij} ${STYLE_SCENE}`, out: `Levels/${id}/dichtbij.webp`, ratio: '16:9' })
  ASSETS.push({ name: `grond_${id}`, prompt: `${layers.grond} ${STYLE_TILE}`, out: `Levels/${id}/grond.webp`, ratio: '1:1' })
  ASSETS.push({ name: `card_${id}`, prompt: `${LEVEL_CARD[id]} ${STYLE_SCENE}`, out: `UI/level_${id}.webp`, ratio: '4:3' })
}

for (const [id, prompt] of Object.entries(VEHICLES)) {
  ASSETS.push({ name: `voertuig_${id}`, prompt: `${prompt} ${STYLE_SPRITE}`, out: `Voertuigen/${id}.png`, ratio: '16:9', model: MODEL_SPRITE })
}
for (const [id, prompt] of Object.entries(WHEELS)) {
  ASSETS.push({ name: `wiel_${id}`, prompt: `${prompt} ${STYLE_SPRITE}`, out: `Voertuigen/wiel_${id}.png`, ratio: '1:1', model: MODEL_SPRITE })
}

ASSETS.push({ name: 'bestuurder', prompt: `Vrolijk cartoon jongetje van opzij, kijkend naar rechts, met een glimmende rode racehelm met witte streep, blauwe overall, zittende racehouding met armen naar voren alsof hij een stuur vasthoudt, grote vrolijke ogen. ${STYLE_SPRITE}`, out: 'bestuurder.png', ratio: '1:1', model: MODEL_SPRITE })
ASSETS.push({ name: 'jerrycan', prompt: `Rode jerrycan met geel handvat, benzineblik game-icoon. ${STYLE_SPRITE}`, out: 'Props/jerrycan.png', ratio: '1:1', model: MODEL_SPRITE })
ASSETS.push({ name: 'munt', prompt: `Glimmende gouden munt met een sterretje erop, game-icoon. ${STYLE_SPRITE}`, out: 'Props/munt.png', ratio: '1:1', model: MODEL_SPRITE })
ASSETS.push({ name: 'bord', prompt: `Houten wegwijzerbordje op een paaltje, leeg bord (geen tekst), game-prop. ${STYLE_SPRITE}`, out: 'Props/bord.png', ratio: '1:1', model: MODEL_SPRITE })
ASSETS.push({ name: 'gas', prompt: `Groene ronde knop met een naar rechts wijzende pijl/gaspedaal-icoon erop, game-UI-knop. ${STYLE_SPRITE}`, out: 'UI/gas.png', ratio: '1:1', model: MODEL_SPRITE })
ASSETS.push({ name: 'rem', prompt: `Rode ronde knop met een naar links wijzende pijl/rempedaal-icoon erop, game-UI-knop. ${STYLE_SPRITE}`, out: 'UI/rem.png', ratio: '1:1', model: MODEL_SPRITE })
ASSETS.push({ name: 'tankframe', prompt: `Horizontaal metalen meter-frame/paneel, leeg in het midden, game-UI-element. ${STYLE_SPRITE}`, out: 'UI/tankframe.png', ratio: '16:9', model: MODEL_SPRITE })
ASSETS.push({ name: 'garage_bg', prompt: `Interieur van een vrolijke garage/werkplaats met gereedschap aan de muur en een groot leeg vloeroppervlak, warme verlichting. ${STYLE_SCENE}`, out: 'UI/garage_bg.webp', ratio: '16:9' })

const filters = process.argv[2]?.split(',')
const todo = filters ? ASSETS.filter(a => filters.some(f => a.name.includes(f))) : ASSETS

async function generate({ name, prompt, ratio, model }, tries = 4) {
  for (let n = 1; n <= tries; n++) {
    const res = await fetch(urlFor(model || MODEL_LITE), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { imageConfig: { aspectRatio: ratio } },
      }),
    })
    if (res.ok) return res.json()
    const txt = await res.text()
    if (![429, 500, 503].includes(res.status) || n === tries) {
      console.error(`[${name}] HTTP ${res.status}:`, txt)
      return null
    }
    const wait = 3000 * 2 ** (n - 1)
    console.error(`[${name}] HTTP ${res.status}, retry ${n}/${tries} over ${wait}ms`)
    await new Promise(r => setTimeout(r, wait))
  }
  return null
}

let ok = 0, fail = 0
for (const asset of todo) {
  const data = await generate(asset)
  const part = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
  if (!part) {
    console.error(`[${asset.name}] geen afbeelding terug`)
    fail++
    continue
  }
  let bytes = Buffer.from(part.inlineData.data, 'base64')
  if (asset.model === MODEL_SPRITE) bytes = await chromaKey(bytes)

  const outPath = new URL(`../public/Hillclimb/${asset.out}`, import.meta.url)
  const dir = asset.out.split('/').slice(0, -1).join('/')
  if (dir) await mkdir(new URL(`../public/Hillclimb/${dir}/`, import.meta.url), { recursive: true })
  await writeFile(outPath, bytes)
  console.log(`OK -> public/Hillclimb/${asset.out}`)
  ok++
  await new Promise(r => setTimeout(r, 400))
}

console.log(`\nKlaar: ${ok} gelukt, ${fail} mislukt (van ${todo.length}).`)
if (fail > 0) process.exit(1)
