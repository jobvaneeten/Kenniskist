// De vijf werelden: volgorde, palet, muziek, achtergrond en de geplande
// muntaantallen. Die laatste zijn nodig omdat tools/economy.js de prijzen ook
// moet kunnen controleren zolang wereld 2 t/m 5 nog niet gebouwd zijn; zodra de
// levels bestaan rekent het script met de gemeten aantallen.

export const BONUS_REGULIER = 25
export const BONUS_BAAS = 100
export const LEVELS_PER_WERELD = 16 // 15 regulier + 1 baas

export const WERELDEN = [
  {
    nummer: 1,
    id: 'kristalwoud',
    naam: 'Kristalwoud',
    ondertitel: 'Groene planeet',
    palet: 'kristalwoud',
    muziek: 'w1',
    achtergrond: 'kristalwoud',
    mechanic: 'Springen, stampen, veren en bewegende platforms',
    baas: 'Slijmkoningin',
    geplandeMuntenPerLevel: 30,
  },
  {
    nummer: 2,
    id: 'ijsmaan',
    naam: 'IJsmaan',
    ondertitel: 'Bevroren maan',
    palet: 'ijsmaan',
    muziek: 'w2',
    achtergrond: 'ijsmaan',
    mechanic: 'Glad ijs, breekbare platforms en windvlagen',
    baas: 'IJsworm',
    geplandeMuntenPerLevel: 34,
  },
  {
    nummer: 3,
    id: 'vulkaan',
    naam: 'Vulkaanplaneet',
    ondertitel: 'Gloeiende wereld',
    palet: 'vulkaan',
    muziek: 'w3',
    achtergrond: 'vulkaan',
    mechanic: 'Stijgende lava, zinkende platforms en geisers',
    baas: 'Magmatitaan',
    geplandeMuntenPerLevel: 38,
  },
  {
    nummer: 4,
    id: 'station',
    naam: 'Verlaten ruimtestation',
    ondertitel: 'Staal en neon',
    palet: 'station',
    muziek: 'w4',
    achtergrond: 'station',
    mechanic: 'Lopende banden, lasers, zero-g en sleutelkaarten',
    baas: 'Kern-AI',
    geplandeMuntenPerLevel: 42,
  },
  {
    nummer: 5,
    id: 'nevel',
    naam: 'Nevelrijk',
    ondertitel: 'Bij het zwarte gat',
    palet: 'nevel',
    muziek: 'w5',
    achtergrond: 'nevel',
    mechanic: 'Zwaartekracht omkeren, portalen en verdwijnende platforms',
    baas: 'De Verslinder',
    geplandeMuntenPerLevel: 46,
  },
]

export const TOTAAL_LEVELS = WERELDEN.length * LEVELS_PER_WERELD
export const TOTAAL_STERREN = TOTAAL_LEVELS * 3

export const wereldVan = (nummer) => WERELDEN.find((w) => w.nummer === nummer)

export function levelId(wereld, index) {
  return `w${wereld}-l${String(index).padStart(2, '0')}`
}

export function ontleedLevelId(id) {
  const m = /^w(\d)-l(\d\d)$/.exec(id)
  if (!m) return null
  return { wereld: Number(m[1]), index: Number(m[2]) }
}

export const isBaasLevel = (index) => index === LEVELS_PER_WERELD

export const bonusVoor = (index) => (isBaasLevel(index) ? BONUS_BAAS : BONUS_REGULIER)

// Wat een speler in totaal kan verdienen, met de geplande aantallen voor
// werelden die nog niet gebouwd zijn. `gemeten` is een map wereldnummer ->
// werkelijk aantal munten in die wereld.
export function totaalVerdienbaar(gemeten = {}) {
  let munten = 0
  let bonus = 0
  const per = []
  for (const w of WERELDEN) {
    const regulier = LEVELS_PER_WERELD - 1
    const gepland = w.geplandeMuntenPerLevel * regulier + 20
    const m = gemeten[w.nummer] ?? gepland
    const b = regulier * BONUS_REGULIER + BONUS_BAAS
    munten += m
    bonus += b
    per.push({ wereld: w.nummer, munten: m, bonus: b, gemeten: gemeten[w.nummer] != null })
  }
  return { munten, bonus, totaal: munten + bonus, per }
}
