// Analyse van een controledictee (tab Dictee in het portaal).
//
// Per woord: letter voor letter vergelijken met het goede woord (kleinste
// aantal wijzigingen), dan kijken welke spellingcategorie op die plek zit.
// Elke categorie van een woord heeft een plek: { id, van, tot } (tekens in het
// goede woord). van = tot is een naad (tussen twee delen van een samenstelling,
// of de verborgen j/w in "rituelen"): die is alleen fout als daar een van de
// tekens uit x tussen is gezet.
// Een fout die op geen enkele categorie valt, heet "overig" (slordig, of een
// regel die niet bij dit woord getoetst werd).

import categorieen from '../data/dicteeCategorieen.json'

export const CATEGORIEEN = Object.fromEntries(categorieen.map(c => [c.id, c]))
export const categorieNaam = (id) => CATEGORIEEN[id]?.naam ?? id
export const categorieRegel = (id) => CATEGORIEEN[id]?.regel ?? ''

const LIDWOORD = /^(de|het|een|'t)\s+/

// Hoe het kind het bedoelde: spaties en aanhalingstekens gelijk trekken, een
// lidwoord ervoor mag (de lidwoorden tellen niet mee), hoofdletters tellen
// alleen als het goede woord er een heeft.
export function normaal(tekst, goed = '') {
  let s = (tekst ?? '').normalize('NFC')
    .replace(/[‘’‚‛`´]/g, "'")
    .replace(/\s+/g, ' ').trim()
  if (goed === goed.toLowerCase()) s = s.toLowerCase()
  if (!LIDWOORD.test(goed)) s = s.replace(LIDWOORD, '')
  return s
}

// Wijzigingen om van het goede woord naar het gegeven woord te komen, als
// stukken: { van, tot, goed, gegeven } met van/tot in het goede woord.
// Een invoeging heeft van = tot.
export function verschil(goed, gegeven) {
  const a = [...goed], b = [...gegeven]
  const n = a.length, m = b.length
  const d = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const k = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j - 1] + k, d[i - 1][j] + 1, d[i][j - 1] + 1)
      // twee letters omgedraaid ("ij" → "ji") telt als één fout
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] && a[i - 1] !== a[i - 2]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
      }
    }
  }
  // terug door de tabel; per positie in het goede woord bijhouden wat er mis is
  const ops = []
  let i = n, j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && d[i][j] === d[i - 1][j - 1]) { i--; j--; continue }
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] && d[i][j] === d[i - 2][j - 2] + 1) {
      ops.push({ van: i - 2, tot: i, gegeven: b[j - 2] + b[j - 1] }); i -= 2; j -= 2; continue
    }
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) { ops.push({ van: i - 1, tot: i, gegeven: b[j - 1] }); i--; j--; continue }
    if (i > 0 && d[i][j] === d[i - 1][j] + 1) { ops.push({ van: i - 1, tot: i, gegeven: '' }); i--; continue }
    ops.push({ van: i, tot: i, gegeven: b[j - 1] }); j--
  }
  ops.reverse()
  // aaneengesloten wijzigingen samenvoegen tot één stuk
  const stukken = []
  for (const o of ops) {
    const vorige = stukken[stukken.length - 1]
    if (vorige && o.van <= vorige.tot) { vorige.tot = Math.max(vorige.tot, o.tot); vorige.gegeven += o.gegeven }
    else stukken.push({ ...o })
  }
  for (const s of stukken) s.goed = a.slice(s.van, s.tot).join('')
  return stukken
}

// Raakt een stuk de plek van een categorie?
function raakt(stuk, plek, tekens) {
  if (plek.van === plek.tot) {
    // naad: alleen als er op die plek iets uit x is tussengezet (of een stuk
    // eroverheen ligt waarin dat zit)
    const x = plek.x ?? ' -'
    return stuk.van <= plek.van && plek.van <= stuk.tot && [...stuk.gegeven].some(t => x.includes(t))
  }
  if (stuk.van === stuk.tot) {
    // invoeging: midden in de plek telt altijd; tegen de rand alleen als het
    // dezelfde soort letter is (een klinker tegen een klinker: "smeerige",
    // "tostie's"), anders hoort hij bij de buurman ("eet café", "rituwelen")
    if (plek.van < stuk.van && stuk.van < plek.tot) return true
    const rand = stuk.van === plek.tot ? tekens[plek.tot - 1] : stuk.van === plek.van ? tekens[plek.van] : null
    return rand != null && [...stuk.gegeven].every(t => soort(t) === soort(rand))
  }
  return stuk.van < plek.tot && plek.van < stuk.tot
}

const KLINKERS = 'aeiouyáéíóúàèëïöüâêîôû'
const soort = (t) => KLINKERS.includes(t.toLowerCase()) ? 'k' : /[a-z]/i.test(t) ? 'm' : t

// Eén woord nakijken. correctie: true/false als de leerkracht het zelf
// goed of fout heeft gerekend.
export function kijkWoordNa(woord, gegeven, correctie) {
  const ingevuld = normaal(gegeven, woord.w)
  const precies = ingevuld === woord.w
  const goed = correctie === true || correctie === false ? correctie : precies
  const cats = [...new Set(woord.c.map(p => p.id))]
  if (goed) return { goed: true, ingevuld, stukken: [], fout: [], overig: false, cats, handmatig: correctie != null && correctie !== precies }
  if (precies) return { goed: false, ingevuld, stukken: [], fout: [], overig: true, cats, handmatig: true }
  if (!ingevuld) return { goed: false, ingevuld, leeg: true, stukken: [], fout: [], overig: true, cats, handmatig: false }
  const stukken = verschil(woord.w, ingevuld)
  // Een heel ander woord zegt niets over de regels: alleen "overig".
  // Minder dan de helft klopt en minstens drie letters anders ("bei" voor
  // "bij" blijft dus gewoon een ei/ij-fout).
  const n = [...woord.w].length, m = [...ingevuld].length
  const behouden = n - stukken.reduce((t, s) => t + (s.tot - s.van), 0)
  const langste = Math.max(n, m)
  if (behouden / langste < 0.5 && langste - behouden >= 3) {
    return { goed: false, ingevuld, anders: true, stukken: [{ van: 0, tot: n, goed: woord.w, gegeven: ingevuld, cats: [] }], fout: [], overig: true, cats, handmatig: correctie != null }
  }
  const fout = new Set()
  let overig = false
  for (const s of stukken) {
    const geraakt = woord.c.filter(p => raakt(s, p, [...woord.w]))
    geraakt.forEach(p => fout.add(p.id))
    s.cats = [...new Set(geraakt.map(p => p.id))]
    if (!geraakt.length) overig = true
  }
  return { goed: false, ingevuld, stukken, fout: cats.filter(c => fout.has(c)), overig, cats, handmatig: correctie != null }
}

// Het goede woord in stukjes, met de foute plekken gemarkeerd (voor de weergave).
export function markeer(goedWoord, stukken) {
  const delen = []
  let pos = 0
  const tekens = [...goedWoord]
  for (const s of stukken) {
    if (s.van > pos) delen.push({ tekst: tekens.slice(pos, s.van).join('') })
    delen.push({ tekst: tekens.slice(s.van, s.tot).join(''), fout: true, gegeven: s.gegeven, invoeging: s.van === s.tot })
    pos = Math.max(pos, s.tot)
  }
  if (pos < tekens.length) delen.push({ tekst: tekens.slice(pos).join('') })
  return delen
}

// Normering voor de kleur van de score (aandeel goed).
export const NORM = { goed: 0.85, matig: 0.7 }
export const oordeel = (aandeel) => aandeel >= NORM.goed ? 'goed' : aandeel >= NORM.matig ? 'matig' : 'onvoldoende'

// De hele klas: rijen = [{ leerling_id, antwoorden, correcties, ingeleverd_op }].
export function analyseer(woorden, rijen) {
  const catIds = [...new Set(woorden.flatMap(w => w.c.map(p => p.id)))]
  const kansen = Object.fromEntries(catIds.map(id => [id, woorden.filter(w => w.c.some(p => p.id === id)).length]))
  const perLeerling = {}
  const perWoord = woorden.map(() => ({ fout: 0, varianten: {} }))
  const groepCat = Object.fromEntries(catIds.map(id => [id, { fout: 0, kansen: 0, leerlingen: [] }]))
  let overig = 0
  for (const r of rijen) {
    const per = woorden.map((w, i) => kijkWoordNa(w, r.antwoorden?.[i] ?? '', r.correcties?.[String(i)]))
    const cat = Object.fromEntries(catIds.map(id => [id, 0]))
    per.forEach((p, i) => {
      if (p.goed) return
      perWoord[i].fout++
      const v = p.ingevuld || '(leeg)'
      perWoord[i].varianten[v] = (perWoord[i].varianten[v] || 0) + 1
      p.fout.forEach(id => { cat[id]++ })
      if (p.overig) overig++
    })
    const score = per.filter(p => p.goed).length
    perLeerling[r.leerling_id] = { per, score, aantal: woorden.length, cat, oordeel: oordeel(score / woorden.length) }
    for (const id of catIds) {
      groepCat[id].kansen += kansen[id]
      groepCat[id].fout += cat[id]
      if (cat[id]) groepCat[id].leerlingen.push({ id: r.leerling_id, fout: cat[id] })
    }
  }
  return { catIds, kansen, perLeerling, perWoord, groepCat, overig }
}
