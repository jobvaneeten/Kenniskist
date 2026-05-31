// ── Verhaaltjessommen generator ──────────────────────────────────────
// Procedurally builds story sums WITH a known answer + explanation, so the
// app can auto-check and give direct feedback. Three levels = difficulty.

let _qid = 1

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick(a)       { return a[Math.floor(Math.random() * a.length)] }

const NAMES  = ['Lisa','Sem','Noa','Daan','Mila','Finn','Tess','Luuk','Sara','Bram','Eva','Jesse','Lotte','Ravi']
const ITEMS  = ['appels','peren','knikkers','stickers','snoepjes','koekjes','kralen','kaarten']

const euro = (cents) => '€' + (cents / 100).toFixed(2).replace('.', ',')

function mk(doel, contextText, questionText, answer, explanation) {
  return { doel, contextText, questionText, type: 'open', options: null,
           answer: String(answer), explanation, contextImage: null }
}

// ── Per-skill generators (L = level 1..3 scales the numbers) ──────────
function gOptellen(L) {
  const a = rnd(L * 8, L * 40), b = rnd(L * 8, L * 40)
  const n = pick(NAMES), it = pick(ITEMS)
  return mk('optellen',
    `${n} heeft ${a} ${it}. ${n} krijgt er ${b} bij.`,
    `Hoeveel ${it} heeft ${n} nu in totaal?`,
    a + b,
    `Je telt de aantallen op: ${a} + ${b} = ${a + b}.`)
}

function gAftrekken(L) {
  const a = rnd(L * 15, L * 50), b = rnd(L * 5, a - 1)
  const n = pick(NAMES), it = pick(ITEMS)
  return mk('aftrekken',
    `${n} heeft ${a} ${it}. ${n} geeft er ${b} weg.`,
    `Hoeveel ${it} houdt ${n} over?`,
    a - b,
    `Je trekt af: ${a} − ${b} = ${a - b}.`)
}

function gKeer(L) {
  const a = rnd(2, L * 3 + 3), b = rnd(2, L * 2 + 4)
  return mk('vermenigvuldigen',
    `Er zijn ${a} dozen. In elke doos zitten ${b} koekjes.`,
    `Hoeveel koekjes zijn er in totaal?`,
    a * b,
    `Je doet keer: ${a} × ${b} = ${a * b}.`)
}

function gDelen(L) {
  const groups = rnd(2, L + 4), per = rnd(2, L * 3 + 3)
  const a = groups * per
  return mk('delen',
    `${a} snoepjes worden eerlijk verdeeld over ${groups} kinderen.`,
    `Hoeveel snoepjes krijgt elk kind?`,
    per,
    `Je deelt: ${a} ÷ ${groups} = ${per}.`)
}

function gGeld(L) {
  const priceC = rnd(50, L * 300 + 100)
  const n = rnd(2, L + 3)
  const totalC = priceC * n
  return mk('geld',
    `Een ijsje kost ${euro(priceC)}.`,
    `Hoeveel kosten ${n} ijsjes samen?`,
    (totalC / 100).toFixed(2).replace('.', ','),
    `Je doet keer: ${n} × ${euro(priceC)} = ${euro(totalC)}.`)
}

function gGeldWissel(L) {
  const priceC = rnd(120, L * 250 + 150)
  const paid = Math.ceil(priceC / 100) * 100 + (L > 1 ? pick([0, 500]) : 0)
  const back = paid - priceC
  return mk('geld',
    `Je koopt iets van ${euro(priceC)} en betaalt met ${euro(paid)}.`,
    `Hoeveel geld krijg je terug?`,
    (back / 100).toFixed(2).replace('.', ','),
    `Je trekt af: ${euro(paid)} − ${euro(priceC)} = ${euro(back)}.`)
}

function gProcent(L) {
  const pct  = pick(L === 1 ? [50, 25, 10] : L === 2 ? [50, 25, 10, 20, 75] : [10, 20, 15, 30, 40, 5, 75])
  const base = rnd(1, L * 5 + 2) * 20           // multiple of 20 → integer answer
  const ans  = base * pct / 100
  return mk('procenten',
    `In een klas zitten ${base} kinderen.`,
    `Hoeveel kinderen is ${pct}% van ${base}?`,
    ans,
    `${pct}% betekent ${pct} van elke 100. ${pct}% van ${base} = ${base} × ${pct} ÷ 100 = ${ans}.`)
}

function gBreuk(L) {
  const opts = L === 1
    ? [['de helft', 1, 2], ['een kwart', 1, 4]]
    : [['de helft', 1, 2], ['een kwart', 1, 4], ['een derde', 1, 3], ['twee derde', 2, 3], ['drie kwart', 3, 4]]
  const [label, num, den] = pick(opts)
  const X = rnd(2, L * 6 + 4) * den
  const ans = X * num / den
  const it = pick(ITEMS)
  return mk('breuken',
    `Er liggen ${X} ${it} op tafel.`,
    `Hoeveel is ${label} van ${X}?`,
    ans,
    `${label} van ${X}: ${X} ÷ ${den}${num > 1 ? ` × ${num}` : ''} = ${ans}.`)
}

function gMeten(L) {
  const v = pick(['m_cm', 'km_m', 'kg_g', 'knip'])
  if (v === 'm_cm') { const m = rnd(1, L * 3 + 1)
    return mk('meten', `Een touw is ${m} meter lang.`, `Hoeveel centimeter is dat? (1 m = 100 cm)`,
      m * 100, `1 meter = 100 cm, dus ${m} × 100 = ${m * 100} cm.`) }
  if (v === 'km_m') { const km = rnd(1, L * 2 + 1)
    return mk('meten', `Sara fietst ${km} kilometer.`, `Hoeveel meter is dat? (1 km = 1000 m)`,
      km * 1000, `1 km = 1000 m, dus ${km} × 1000 = ${km * 1000} m.`) }
  if (v === 'kg_g') { const kg = rnd(1, L * 2 + 1)
    return mk('meten', `Een zak appels weegt ${kg} kilo.`, `Hoeveel gram is dat? (1 kg = 1000 g)`,
      kg * 1000, `1 kilo = 1000 gram, dus ${kg} × 1000 = ${kg * 1000} g.`) }
  const a = rnd(L * 2 + 2, L * 5 + 5), b = rnd(1, a - 1)
  return mk('meten', `Een lint is ${a} meter lang. Er wordt ${b} meter afgeknipt.`,
    `Hoeveel meter blijft over?`, a - b, `Je trekt af: ${a} − ${b} = ${a - b} meter.`)
}

const POOLS = {
  1: [gOptellen, gAftrekken, gKeer, gDelen, gBreuk, gMeten, gGeld],
  2: [gOptellen, gAftrekken, gKeer, gDelen, gBreuk, gMeten, gGeld, gGeldWissel, gProcent, gKeer, gDelen],
  3: [gAftrekken, gKeer, gDelen, gBreuk, gMeten, gGeld, gGeldWissel, gProcent, gProcent, gKeer],
}

export function generateBatch(levelNum, count = 20) {
  const pool = POOLS[levelNum] || POOLS[1]
  const out = []
  for (let i = 0; i < count; i++) {
    const q = pick(pool)(levelNum)
    q.id = _qid++
    out.push(q)
  }
  return out
}

// ── Answer checking (tolerant: handles €, comma/point, units) ─────────
export function normalizeAnswer(s) {
  return String(s).toLowerCase().trim()
    .replace(/€/g, '')
    .replace(/\s+/g, '')
    .replace(',', '.')
    .replace(/(euro|cent|centimeter|cm|kilometer|km|kilo|kg|gram|gr|g|meter|m|liter|l|ml|%|stuks?|keer|kinderen|koekjes)$/i, '')
}

export function answersMatch(user, correct) {
  const u = normalizeAnswer(user), c = normalizeAnswer(correct)
  if (u === c && u !== '') return true
  const un = parseFloat(u), cn = parseFloat(c)
  if (!isNaN(un) && !isNaN(cn)) return Math.abs(un - cn) < 1e-6
  return false
}
