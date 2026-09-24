// Klokkijken: tijden in woorden, digitaal en het maken van opgaven.
// Tijden zijn minuten sinds middernacht (0..1439).

const GETAL = ['nul', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen',
  'tien', 'elf', 'twaalf', 'dertien', 'veertien']

const DAG = 24 * 60
const norm = t => ((t % DAG) + DAG) % DAG
const uur12 = h => ((h % 12) + 12) % 12 || 12
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const schud = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = rint(0, i); [arr[i], arr[j]] = [arr[j], arr[i]] } return arr }

export function tijdInWoorden(t) {
  t = norm(t)
  const h = Math.floor(t / 60), m = t % 60
  const nu = GETAL[uur12(h)], straks = GETAL[uur12(h + 1)]
  if (m === 0) return `${nu} uur`
  if (m === 15) return `kwart over ${nu}`
  if (m === 30) return `half ${straks}`
  if (m === 45) return `kwart voor ${straks}`
  if (m < 15) return `${GETAL[m]} over ${nu}`
  if (m < 30) return `${GETAL[30 - m]} voor half ${straks}`
  if (m < 45) return `${GETAL[m - 30]} over half ${straks}`
  return `${GETAL[60 - m]} voor ${straks}`
}

export function dagdeel(t) {
  const h = Math.floor(norm(t) / 60)
  return h < 6 ? "'s nachts" : h < 12 ? "'s ochtends" : h < 18 ? "'s middags" : "'s avonds"
}

export const digitaal = t => {
  t = norm(t)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

// Level 1: hele/halve uren en kwartieren · 2: per 5 minuten
// 3: per minuut (digitaal met 24-uursklok) · 4: rekenen met tijd
export const LEVELS = [
  { n: 1, icon: '🟢', naam: 'Level 1 — kwartieren', desc: 'Hele en halve uren, kwart over en kwart voor', vb: 'kwart over drie' },
  { n: 2, icon: '🟡', naam: 'Level 2 — per 5 minuten', desc: 'Over, voor, over half en voor half', vb: 'tien voor half vijf' },
  { n: 3, icon: '🟠', naam: 'Level 3 — per minuut', desc: 'Elke minuut · digitaal met de 24-uursklok', vb: '15:37' },
  { n: 4, icon: '🔴', naam: 'Level 4 — rekenen met tijd', desc: 'Hoe laat is het straks? Hoe lang duurt het?', vb: '14:50 + 35 min' },
]

const stap = lvl => (lvl === 1 ? 15 : lvl === 3 ? 1 : 5)
const opRaster = (t, lvl) => norm(t) % stap(lvl) === 0

// Bij digitaal op level 3 en 4 hoort de 24-uursklok; daarvoor volstaat 12 uur.
const gebruik24 = (modus, lvl) => modus === 'digitaal' && lvl >= 3

function willekeurigeTijd(modus, lvl) {
  const s = stap(lvl)
  const h = gebruik24(modus, lvl) ? rint(0, 23) : rint(1, 12)
  return h * 60 + rint(0, 60 / s - 1) * s
}

// Hoe een tijd als tekst in de antwoorden staat.
export function tijdLabel(t, modus, lvl) {
  if (modus !== 'digitaal') return tijdInWoorden(t)
  if (gebruik24(modus, lvl)) return digitaal(t)
  t = norm(t)
  return `${String(uur12(Math.floor(t / 60))).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

// Denkfouten die kinderen vaak maken, als afleiders.
function afleiders(t, lvl, modus) {
  const h = Math.floor(t / 60), m = t % 60
  const kand = [
    t + 60, t - 60,                          // uur ernaast (half vier ↔ half drie)
    h * 60 + ((60 - m) % 60),                // over en voor omgedraaid
    (Math.round(m / 5) % 12) * 60 + (h % 12) * 5, // wijzers verwisseld
    t + 10, t - 10, t + 5, t - 5,
  ]
  if (gebruik24(modus, lvl)) kand.push(t + 720, t - 720, t + 120, t - 120)
  return kand.map(norm).filter(x => opRaster(x, lvl))
}

function kiesOpties(goed, kandidaten, sleutel, maakWillekeurig) {
  const gezien = new Set([sleutel(goed)])
  const uit = [goed]
  for (const k of schud([...kandidaten])) {
    if (uit.length >= 4) break
    if (gezien.has(sleutel(k))) continue
    gezien.add(sleutel(k)); uit.push(k)
  }
  for (let i = 0; uit.length < 4 && i < 200; i++) {
    const k = maakWillekeurig()
    if (gezien.has(sleutel(k))) continue
    gezien.add(sleutel(k)); uit.push(k)
  }
  return schud(uit)
}

function uitlegLezen(t, modus, lvl) {
  const h = Math.floor(t / 60), m = t % 60
  const nu = GETAL[uur12(h)], straks = GETAL[uur12(h + 1)], w = tijdInWoorden(t)
  let zin
  if (m === 0) zin = `Precies ${nu} uur.`
  else if (m <= 15) zin = `Het is ${m} minuten na ${nu} uur, dus ${w}.`
  else if (m < 30) zin = `Nog ${30 - m} minuten tot half ${straks}, dus ${w}.`
  else if (m === 30) zin = `Half ${straks}: een half uur vóór ${straks} uur.`
  else if (m < 45) zin = `${m - 30} minuten na half ${straks}, dus ${w}.`
  else zin = `Nog ${60 - m} minuten tot ${straks} uur, dus ${w}.`
  if (modus === 'analoog') {
    const wijzer = m === 0 ? 'staat op de 12' : `wijst ${m} minuten voorbij de 12`
    return `De grote wijzer ${wijzer}. ${zin}`
  }
  if (gebruik24(modus, lvl) && h >= 13) {
    return `${digitaal(t)}: ${h} − 12 = ${h - 12}, dus ${h - 12} uur ${dagdeel(t)}. ${zin}`
  }
  return `${digitaal(t)}: ${m} minuten na ${h % 12 || 12} uur. ${zin}`
}

function uitlegLater(t0, delta, terug, modus, lvl) {
  const f = t => tijdLabel(t, modus, lvl)
  const ans = norm(t0 + (terug ? -delta : delta))
  const m0 = t0 % 60
  if (!terug) {
    const totUur = (60 - m0) % 60
    if (totUur === 0 || delta <= totUur) return `${f(t0)} + ${delta} minuten = ${f(ans)}.`
    return `Van ${f(t0)} tot het hele uur is ${totUur} minuten. Dan nog ${delta - totUur} minuten erbij: ${f(ans)}. Let op: een uur heeft 60 minuten, geen 100!`
  }
  if (m0 === 0 || delta <= m0) return `${f(t0)} − ${delta} minuten = ${f(ans)}.`
  return `Van ${f(t0)} terug naar het hele uur is ${m0} minuten. Dan nog ${delta - m0} minuten terug: ${f(ans)}.`
}

function uitlegDuur(t0, t1, modus, lvl) {
  const f = t => tijdLabel(t, modus, lvl)
  const d = norm(t1 - t0)
  const naarUur = (60 - (t0 % 60)) % 60
  if (naarUur === 0 || d <= naarUur) return `Van ${f(t0)} tot ${f(t1)} is ${d} minuten.`
  const heleUren = Math.floor((d - naarUur) / 60), rest = (d - naarUur) % 60
  const delen = [`tot het hele uur ${naarUur} min`]
  if (heleUren) delen.push(`${heleUren} heel uur = ${heleUren * 60} min`)
  if (rest) delen.push(`en nog ${rest} min`)
  return `Van ${f(t0)} tot ${f(t1)}: ${delen.join(', ')}. Samen ${d} minuten.`
}

// Eén opgave. Soorten:
//   lees  — klok zien, de tijd in woorden kiezen
//   zet   — tijd in woorden, de goede klok kiezen
//   later — hoe laat is het over / hoe laat was het … minuten geleden
//   duur  — hoeveel minuten zit er tussen twee klokken
let volgnummer = 0

export function maakOpgave(modus, lvl) {
  return { id: ++volgnummer, ...bouwOpgave(modus, lvl) }
}

function bouwOpgave(modus, lvl) {
  const rnd = () => willekeurigeTijd(modus, lvl)

  if (lvl === 4) {
    if (Math.random() < 0.55) {
      const t0 = rnd()
      const delta = rint(2, 30) * 5
      const terug = Math.random() < 0.3
      const ans = norm(t0 + (terug ? -delta : delta))
      const lbl = t => tijdLabel(t, modus, lvl)
      const kand = [ans + 60, ans - 60, ans + 40, ans - 40, ans + 10, ans - 10].map(norm)
      const opties = kiesOpties(ans, kand, lbl, rnd)
      return {
        soort: 'later', t0, delta, terug,
        vraag: terug ? `Hoe laat was het ${delta} minuten geleden?` : `Hoe laat is het over ${delta} minuten?`,
        opties: opties.map(t => ({ key: lbl(t), t, label: lbl(t) })),
        goed: lbl(ans), juist: lbl(ans),
        uitleg: uitlegLater(t0, delta, terug, modus, lvl),
      }
    }
    const t0 = rnd(), d = rint(3, 36) * 5, t1 = norm(t0 + d)
    const kand = [d + 40, d - 40, d + 60, d - 60, d + 10, d - 10, d + 5, d - 5].filter(x => x > 0)
    const opties = kiesOpties(d, kand, x => x, () => rint(2, 40) * 5)
    return {
      soort: 'duur', t0, t1,
      vraag: 'Hoeveel minuten zit er tussen deze twee tijden?',
      opties: opties.map(x => ({ key: String(x), label: `${x} minuten` })),
      goed: String(d), juist: `${d} minuten`,
      uitleg: uitlegDuur(t0, t1, modus, lvl),
    }
  }

  const t = rnd()
  const kand = afleiders(t, lvl, modus)
  if (Math.random() < 0.5) {
    // lees: de klok staat in beeld, kies de woorden
    const metDagdeel = gebruik24(modus, lvl)
    const lbl = x => metDagdeel ? `${tijdInWoorden(x)} ${dagdeel(x)}` : tijdInWoorden(x)
    const opties = kiesOpties(t, kand, lbl, rnd)
    return {
      soort: 'lees', t, vraag: 'Hoe laat is het?',
      opties: opties.map(x => ({ key: lbl(x), label: lbl(x) })),
      goed: lbl(t), juist: lbl(t),
      uitleg: uitlegLezen(t, modus, lvl),
    }
  }
  // zet: de woorden staan er, kies de klok
  const metDagdeel = gebruik24(modus, lvl)
  const sleutel = modus === 'analoog' ? x => String(norm(x) % 720) : x => tijdLabel(x, modus, lvl)
  const opties = kiesOpties(t, kand, sleutel, rnd)
  const woorden = metDagdeel ? `${tijdInWoorden(t)} ${dagdeel(t)}` : tijdInWoorden(t)
  return {
    soort: 'zet', t,
    vraag: modus === 'analoog' ? `Welke klok wijst ${woorden} aan?` : `Hoe schrijf je ${woorden} digitaal?`,
    opties: opties.map(x => ({ key: sleutel(x), t: x, label: tijdLabel(x, modus, lvl) })),
    goed: sleutel(t), juist: woorden,
    uitleg: uitlegLezen(t, modus, lvl),
  }
}
