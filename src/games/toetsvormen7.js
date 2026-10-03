// Toetsvormen groep 7 (Pluspunt, route S+).
//
// Elke generator hier vraagt een doel op dezelfde manier als de Pluspunt-
// toets waarin dat doel getoetst wordt: dezelfde soort vraag, dezelfde
// antwoordvorm (één getal, twee vakjes, een keuze) en getallen van dezelfde
// grootte. Let op: de toets van blok N toetst de doelen van blok N − 1, dus de
// vorm van "toets blok 5" hoort bij de doelen van blok 4.
//
// Er staat bewust geen enkele opgave uit het toetsboekje in: verhaaltjes,
// namen, voorwerpen en getallen zijn eigen en worden elke keer nieuw gemaakt.
// Ze worden in redactiesommen.js als extra variant aan een bestaande soort
// gehangen (niet als nieuwe soort, anders wordt de lescheck langer).

const NAMEN = ['Sem', 'Noor', 'Liam', 'Saar', 'Daan', 'Mila', 'Finn', 'Lina', 'Bram', 'Tess', 'Luuk', 'Evi', 'Jesse', 'Fleur', 'Yara', 'Mees', 'Roos', 'Ayoub', 'Zara', 'Timo']
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const naam = () => pick(NAMEN)
const NF = new Intl.NumberFormat('nl-NL')
const getal = (n) => NF.format(n)
const komma = (n, d) => (d == null ? String(+n.toFixed(6)) : n.toFixed(d)).replace('.', ',')
const euro = (n) => '€ ' + n.toFixed(2).replace('.', ',')
const euroRond = (n) => (Number.isInteger(n) ? `€ ${getal(n)},-` : euro(n))
const ggd = (a, b) => (b ? ggd(b, a % b) : a)
const breuk = (t, n) => { const g = ggd(t, n); return n / g === 1 ? t / g : `${t / g}/${n / g}` }

// ── toets blok 1 (doelen eind groep 6) ────────────────────────────────────

const WINKEL = [
  ['pak melk', 'pakken melk', 1.15], ['zak chips', 'zakken chips', 1.89], ['pot pindakaas', 'potten pindakaas', 2.45],
  ['brood', 'broden', 2.79], ['doos eieren', 'dozen eieren', 2.99], ['fles appelsap', 'flessen appelsap', 1.69],
  ['bak druiven', 'bakken druiven', 2.25], ['kiwi', "kiwi's", 0.45], ['komkommer', 'komkommers', 0.89],
  ['zak nootjes', 'zakken nootjes', 3.15], ['pak rijst', 'pakken rijst', 1.95], ['bloemkool', 'bloemkolen', 1.49],
]

// Heb je genoeg geld? Schattend vermenigvuldigen, antwoord ja of nee.
export function genoegGeld() {
  const [enk, mv, prijs] = pick(WINKEL)
  const n = rnd(3, 12)
  const totaal = Math.round(n * prijs * 100) / 100
  const genoeg = Math.random() < 0.5
  const kandidaten = [5, 10, 15, 20, 25, 30, 40, 50].filter(b => (genoeg ? b >= totaal * 1.06 : b <= totaal * 0.94))
  if (!kandidaten.length) return genoegGeld()
  const budget = genoeg ? Math.min(...kandidaten) : Math.max(...kandidaten)
  const rond = Math.max(1, Math.round(prijs))
  return {
    vraag: `Je wilt ${n} ${mv} kopen. Een ${enk} kost ${euro(prijs)}. Je hebt € ${budget},-. Heb je genoeg geld?`,
    kaal: `${n} × ${euro(prijs)}. Je hebt € ${budget},-. Genoeg?`,
    opties: ['ja', 'nee'], antwoord: totaal <= budget ? 'ja' : 'nee',
    uitleg: `Schat: ${euro(prijs)} is ongeveer € ${rond},-. ${n} × € ${rond},- ≈ € ${n * rond},-. Precies is het ${euro(totaal)}, dus ${totaal <= budget ? 'ja, genoeg' : 'nee, te weinig'}.`,
  }
}

// ── toets blok 2 (doelen blok 1) ──────────────────────────────────────────

// Twee bedragen: samen én verschil, in één opgave (twee vakjes).
export function samenVerschil(plus) {
  const a = rnd(plus ? 50 : 20, plus ? 400 : 200) * 1000 + pick([0, 0, 500])
  const b = pick([rnd(2, 40) * 1000 + pick([0, 500]), rnd(11, 99) * 100])
  if (b >= a) return samenVerschil(plus)
  const nm = naam()
  return {
    vraag: `${nm} vergelijkt twee bedragen: ${euroRond(a)} en ${euroRond(b)}. Hoeveel is het samen, en hoeveel is het verschil?`,
    kaal: `${getal(a)} + ${getal(b)} = … en ${getal(a)} − ${getal(b)} = …`,
    antwoord: a + b, rest: a - b, antwLabel: 'Samen (€)', restLabel: 'verschil', eenheid: '€',
    toon: `samen ${euroRond(a + b)}, verschil ${euroRond(a - b)}`,
    uitleg: `Samen: ${getal(a)} + ${getal(b)} = ${getal(a + b)}. Verschil: ${getal(a)} − ${getal(b)} = ${getal(a - b)}.`,
  }
}

// ── toets blok 4 (doelen blok 3) ──────────────────────────────────────────

// Welk woord is weg: duizend, miljoen of miljard?
export function duizendMiljoenMiljard() {
  const woorden = [['duizend', 1e3], ['miljoen', 1e6], ['miljard', 1e9]]
  if (Math.random() < 0.35) {
    const zinnen = [
      ['1 meter is 1 … millimeter.', 'duizend'], ['1 kilometer is 1 … millimeter.', 'miljoen'],
      ['Op aarde wonen ruim 8 … mensen.', 'miljard'], ['In Nederland wonen ruim 18 … mensen.', 'miljoen'],
      ['1 kilogram is 1 … gram.', 'duizend'], ['1 kilogram is 1 … milligram.', 'miljoen'],
      ['Een miljonair heeft meer dan 1 … euro.', 'miljoen'], ['Een miljardair heeft meer dan 1 … euro.', 'miljard'],
    ]
    const [zin, juist] = pick(zinnen)
    return {
      vraag: `Welk woord is weg? Kies uit duizend, miljoen of miljard. ${zin}`, kaal: zin,
      opties: woorden.map(w => w[0]), antwoord: juist, uitleg: `Het woord is ${juist}.`,
    }
  }
  const [woord, u] = pick(woorden), k = rnd(1, 9)
  const soort = pick(['precies', 'meer', 'bijna'])
  const n = soort === 'precies' ? k * u : soort === 'meer' ? k * u + rnd(1, 9) * u / 100 : k * u - rnd(1, 9) * u / 100
  const rel = soort === 'precies' ? 'is precies' : soort === 'meer' ? 'is meer dan' : 'is bijna'
  return {
    vraag: `Welk woord is weg? Kies uit duizend, miljoen of miljard. ${getal(n)} ${rel} ${k} … .`,
    kaal: `${getal(n)} ${rel} ${k} …`,
    opties: woorden.map(w => w[0]), antwoord: woord,
    uitleg: `${k} ${woord} = ${getal(k * u)}. ${getal(n)} ${rel} dat.`,
  }
}

// Onder elkaar zetten met ongelijke decimalen: 6,53 + 2,9 en 2,2 − 0,38.
export function kommaOnderElkaar(soort) {
  const d1 = rnd(1, 2), d2 = d1 === 1 ? 2 : 1
  const a = rnd(1, 9) + rnd(1, 10 ** d1 - 1) / 10 ** d1
  const b = rnd(0, 3) + rnd(1, 10 ** d2 - 1) / 10 ** d2
  const plus = soort === 'plus'
  const [x, y] = plus ? [a, b] : (a > b ? [a, b] : [b, a])
  if (!plus && x - y < 0.01) return kommaOnderElkaar(soort)
  const uit = +(plus ? x + y : x - y).toFixed(2)
  const dx = plus ? d1 : (x === a ? d1 : d2), dy = plus ? d2 : (y === b ? d2 : d1)
  const som = `${komma(x, dx)} ${plus ? '+' : '−'} ${komma(y, dy)}`
  return {
    vraag: `Zet de getallen onder elkaar en reken uit: ${som} =`, kaal: `${som} =`,
    antwoord: uit, toon: komma(uit),
    uitleg: `Zet de komma's precies onder elkaar en vul aan met nullen: ${komma(x, 2)} ${plus ? '+' : '−'} ${komma(y, 2)} = ${komma(uit, 2)}.`,
  }
}

// Breuken optellen en aftrekken, zo klein mogelijk.
export function breukPlusMin(gelijknamig) {
  let n1, n2
  if (gelijknamig) n1 = n2 = pick([4, 5, 6, 8, 10, 12])
  else { [n1, n2] = pick([[2, 4], [3, 6], [4, 8], [5, 10], [2, 6], [3, 9], [4, 12], [2, 10]]); if (Math.random() < 0.5) [n1, n2] = [n2, n1] }
  const N = Math.max(n1, n2), plus = Math.random() < 0.5
  for (let p = 0; p < 60; p++) {
    const t1 = rnd(1, n1 - 1), t2 = rnd(1, n2 - 1)
    const a = t1 * (N / n1), b = t2 * (N / n2), uit = plus ? a + b : a - b
    if (uit <= 0 || uit >= N) continue
    const som = `${t1}/${n1} ${plus ? '+' : '−'} ${t2}/${n2}`, ant = breuk(uit, N)
    const kort = typeof ant === 'string' && ant !== `${uit}/${N}` ? ` = ${ant}` : ''
    return {
      vraag: `Reken uit. Schrijf de breuk zo klein mogelijk: ${som} =`, kaal: `${som} =`, antwoord: ant,
      uitleg: n1 === n2 ? `Gelijke noemers: tel de tellers ${plus ? 'op' : 'van elkaar af'}: ${uit}/${N}${kort}.`
        : `Maak de noemers gelijk: ${a}/${N} ${plus ? '+' : '−'} ${b}/${N} = ${uit}/${N}${kort}.`,
    }
  }
  return breukPlusMin(gelijknamig)
}

// Lengtematen omrekenen met kommagetallen: 9,4 km = … m, 1575 m = … km.
export function lengteOmrekenen() {
  const v = pick([
    () => { const x = rnd(11, 99) / 10; return [`${komma(x)} km = … m`, x * 1000, 'm', `1 km = 1000 m, dus ${komma(x)} × 1000 = ${getal(x * 1000)} m.`] },
    () => { const x = rnd(101, 399) / 100; return [`${komma(x)} m = … mm`, Math.round(x * 1000), 'mm', `1 m = 1000 mm, dus ${komma(x)} × 1000 = ${getal(Math.round(x * 1000))} mm.`] },
    () => { const x = rnd(11, 59) / 10; return [`${komma(x)} hm = … m`, Math.round(x * 100), 'm', `1 hm = 100 m, dus ${komma(x)} × 100 = ${Math.round(x * 100)} m.`] },
    () => { const x = rnd(1050, 9950); return [`${getal(x)} m = … km`, x / 1000, 'km', `1000 m = 1 km, dus ${getal(x)} : 1000 = ${komma(x / 1000)} km.`] },
    () => { const x = rnd(5, 95); return [`${x} cm = … m`, x / 100, 'm', `100 cm = 1 m, dus ${x} : 100 = ${komma(x / 100)} m.`] },
  ])()
  return { vraag: `${naam()} oefent voor de toets en rekent de maat om: ${v[0]}`, kaal: v[0], antwoord: v[1], omrekenen: true, eenheid: v[2], uitleg: v[3] }
}

// Lengtes met verschillende maten optellen: 3,4 km + 4150 m = … m.
export function lengteOptellen() {
  const v = pick([
    () => { const a = rnd(11, 89) / 10, b = rnd(105, 495) * 10; return [`${komma(a)} km + ${getal(b)} m = … m`, a * 1000 + b, 'm', `${komma(a)} km = ${getal(a * 1000)} m. ${getal(a * 1000)} + ${getal(b)} = ${getal(a * 1000 + b)} m.`] },
    () => { const a = rnd(11, 29) / 10, b = rnd(2, 9); return [`${komma(a)} m + ${b} dm = … cm`, Math.round(a * 100) + b * 10, 'cm', `${komma(a)} m = ${Math.round(a * 100)} cm en ${b} dm = ${b * 10} cm. Samen ${Math.round(a * 100) + b * 10} cm.`] },
    () => { const a = rnd(15, 65) / 10, b = rnd(11, 49); return [`${komma(a)} dm + ${b} cm = … cm`, Math.round(a * 10) + b, 'cm', `${komma(a)} dm = ${Math.round(a * 10)} cm. ${Math.round(a * 10)} + ${b} = ${Math.round(a * 10) + b} cm.`] },
    () => { const a = rnd(15, 85) / 10, b = rnd(2, 9) * 10; return [`${komma(a)} hm + ${b} m = … m`, Math.round(a * 100) + b, 'm', `${komma(a)} hm = ${Math.round(a * 100)} m. ${Math.round(a * 100)} + ${b} = ${Math.round(a * 100) + b} m.`] },
  ])()
  return { vraag: `Reken de lengte uit: ${v[0]}`, kaal: v[0], antwoord: v[1], eenheid: v[2], uitleg: v[3] }
}

// ── toets blok 5 (doelen blok 4) ──────────────────────────────────────────

// Bonnetje: schat eerst, reken dan uit met de rekenmachine.
export function bonnetje() {
  const n = rnd(3, 4)
  const bedragen = Array.from({ length: n }, (_, i) => (i === 0 ? rnd(1000, 3500) : rnd(50, 990)) / 100)
  const som = +bedragen.reduce((t, b) => t + b, 0).toFixed(2)
  const schat = bedragen.reduce((t, b) => t + Math.round(b), 0)
  return {
    vraag: `${naam()} krijgt een bonnetje met ${bedragen.map(euro).join(', ')}. Schat eerst, reken dan uit met de rekenmachine. Hoeveel is het samen?`,
    kaal: `${bedragen.map(euro).join(' + ')} =`, antwoord: som, eenheid: '€',
    uitleg: `Schat: ${bedragen.map(b => Math.round(b)).join(' + ')} ≈ € ${schat},-. Met de rekenmachine: ${euro(som)}.`,
  }
}

// Kale rekenmachinesom met grote getallen (+, −, ×, :).
export function rekenmachineSom() {
  const nm = naam(), b = rnd(21, 89), op = pick(['+', '−', '×', ':'])
  const RM = 'Reken uit met de rekenmachine.'
  if (op === ':') {
    const q = rnd(30, 250)
    return { vraag: `${nm} verdeelt ${getal(q * b)} stickers eerlijk over ${b} klassen. Hoeveel stickers krijgt elke klas? ${RM}`,
             kaal: `${getal(q * b)} : ${b} =`, antwoord: q, uitleg: `${getal(q * b)} : ${b} = ${q}.` }
  }
  const a = rnd(1200, 9800)
  const uit = op === '+' ? a + b : op === '−' ? a - b : a * b
  const vraag = op === '+' ? `In de bibliotheek staan ${getal(a)} boeken. Er komen ${b} nieuwe boeken bij. Hoeveel boeken zijn het nu? ${RM}`
              : op === '−' ? `${nm} spaart ${getal(a)} punten en wisselt er ${b} in voor een cadeautje. Hoeveel punten houdt ${nm} over? ${RM}`
              : `Een fabriek maakt elke dag ${getal(a)} flesjes sap. Hoeveel flesjes zijn dat in ${b} dagen? ${RM}`
  return { vraag, kaal: `${getal(a)} ${op} ${b} =`, antwoord: uit, uitleg: `${getal(a)} ${op} ${b} = ${getal(uit)}.` }
}

// Breuk ↔ kommagetal, de breuk zo klein mogelijk.
export function breukOfKomma() {
  if (Math.random() < 0.5) {
    const [t, n] = pick([[2, 5], [3, 5], [4, 5], [6, 100], [54, 100], [89, 100], [8, 10], [3, 4], [1, 4], [7, 20], [3, 25], [9, 100]])
    const w = t / n
    return { vraag: `Op het bord staat een breuk. ${naam()} schrijft die breuk als kommagetal: ${t}/${n} =`, kaal: `${t}/${n} = (als kommagetal)`, antwoord: w, toon: komma(w),
             uitleg: `${t}/${n} = ${komma(w)}.` }
  }
  const [w, d] = pick([[0.9, 1], [0.4, 1], [0.002, 3], [0.13, 2], [0.7, 1], [0.25, 2], [0.06, 2], [0.75, 2], [0.045, 3], [0.6, 1]])
  const n = 10 ** d, t = Math.round(w * n)
  return { vraag: `Op het bord staat een kommagetal. ${naam()} schrijft het als breuk, zo klein mogelijk: ${komma(w, d)} =`, kaal: `${komma(w, d)} = (als breuk)`, antwoord: breuk(t, n),
           uitleg: `${komma(w, d)} = ${t}/${n}${breuk(t, n) !== `${t}/${n}` ? ` = ${breuk(t, n)}` : ''}.` }
}

const PCT_DEEL = { 10: [1, 10], 20: [1, 5], 25: [1, 4], 50: [1, 2], 75: [3, 4] }
const PCT_DINGEN = [['ijsjes', 'is rood', 'rode ijsjes'], ['kinderen', 'draagt een bril', 'kinderen'], ['appels', 'is geel', 'gele appels'],
  ['kinderen', 'zit op voetbal', 'kinderen'], ['ballonnen', 'is blauw', 'blauwe ballonnen'], ['knikkers', 'is groen', 'groene knikkers']]

// "25% van 40 ijsjes is rood. Dat is … deel. Dat zijn … rode ijsjes." en andersom.
export function procentDeelAantal() {
  const p = pick([10, 20, 25, 50, 75]), [t, n] = PCT_DEEL[p], [wat, ww, welke] = pick(PCT_DINGEN)
  const totaal = n * rnd(4, 20), aantal = totaal * t / n
  if (Math.random() < 0.6) {
    return {
      vraag: `${p}% van ${totaal} ${wat} ${ww}. Welk deel is dat? En hoeveel ${welke} zijn dat?`,
      kaal: `${p}% van ${totaal} = … deel = … ${welke}`,
      antwoord: `${t}/${n}`, rest: aantal, antwLabel: 'Welk deel?', restLabel: welke,
      toon: `${t}/${n} deel, ${aantal} ${welke}`,
      uitleg: `${p}% = ${t}/${n} deel. ${t}/${n} van ${totaal} = ${aantal}.`,
    }
  }
  return {
    vraag: `${t}/${n} deel van ${totaal} ${wat} ${ww}. Hoeveel procent is dat? En hoeveel ${welke} zijn dat?`,
    kaal: `${t}/${n} deel van ${totaal} = … % = … ${welke}`,
    antwoord: p, rest: aantal, antwLabel: 'Hoeveel procent?', restLabel: welke, eenheid: '%',
    toon: `${p}%, ${aantal} ${welke}`,
    uitleg: `${t}/${n} deel = ${p}%. ${t}/${n} van ${totaal} = ${aantal}.`,
  }
}

// Snelheid in m/s, km per dag, en reistijd in uren en minuten.
export function snelheidToets() {
  const k = rnd(1, 4)
  if (k === 1) {
    const v = pick([2, 3, 4, 5, 6, 8, 10]), min = pick([5, 10, 15, 20, 25, 30])
    const m = v * min * 60
    return { vraag: `${naam()} schaatst ${komma(m / 1000)} km in ${min} minuten. Wat is de gemiddelde snelheid in meter per seconde?`,
             kaal: `${komma(m / 1000)} km in ${min} minuten = … m/s`, antwoord: v, eenheid: 'm/s',
             uitleg: `${komma(m / 1000)} km = ${getal(m)} m. ${min} minuten = ${min * 60} seconden. ${getal(m)} : ${min * 60} = ${v} m/s.` }
  }
  if (k === 2) {
    const per = rnd(35, 75), dagen = rnd(3, 9)
    return { vraag: `${naam()} fietst in de vakantie ${per * dagen} km in ${dagen} dagen. Hoeveel kilometer is dat gemiddeld per dag?`,
             kaal: `${per * dagen} km in ${dagen} dagen = … km per dag`, antwoord: per, eenheid: 'km',
             uitleg: `${per * dagen} : ${dagen} = ${per} km per dag.` }
  }
  if (k === 3) {
    const v = pick([12, 16, 18, 20, 24]), [h, m] = pick([[1, 30], [1, 15], [2, 30], [1, 45], [2, 15], [0, 45]])
    const d = v * (h + m / 60)
    if (!Number.isInteger(d)) return snelheidToets()
    return { vraag: `${naam()} fietst gemiddeld ${v} km per uur. De rit is ${d} km. Hoelang duurt de rit?`,
             kaal: `${d} km met ${v} km/u = … uur en … minuten`, antwoord: h, rest: m, antwLabel: 'Uur', restLabel: 'minuten',
             toon: `${h} uur en ${m} minuten`,
             uitleg: `In 1 uur ${v} km, in ${m} minuten ${v * m / 60} km. ${h} × ${v} + ${v * m / 60} = ${d} km, dus ${h} uur en ${m} minuten.` }
  }
  const v = pick([4, 5, 6]), min = pick([15, 20, 30, 45]), d = v * min / 60, nm = naam()
  if (!Number.isInteger(d * 10)) return snelheidToets()
  return { vraag: `${nm} loopt met een snelheid van ${v} km per uur. Hoelang doet ${nm} over ${komma(d)} km?`,
           kaal: `${komma(d)} km met ${v} km/u = … minuten`, antwoord: min, eenheid: 'minuten',
           uitleg: `In 60 minuten ${v} km, dus 1 km in ${60 / v} minuten. ${komma(d)} km duurt ${min} minuten.` }
}

// ── toets blok 6 (doelen blok 5) ──────────────────────────────────────────

// "3 van de 8 gasten komen uit Nederland" bij een groot totaal.
export function vanDeTotaal() {
  const [t, n] = pick([[3, 8], [5, 6], [2, 5], [3, 4], [1, 5], [3, 20], [7, 10], [2, 3]])
  const totaal = n * rnd(8, 60), deel = totaal / n * t
  const [plek, wie, wat] = pick([['op de camping', 'gasten', 'komen uit Nederland'], ['op het festival', 'bezoekers', 'komen met de fiets'],
    ['op school', 'kinderen', 'hebben een huisdier'], ['in de bioscoop', 'bezoekers', 'kopen popcorn']])
  return { vraag: `Er zijn ${totaal} ${wie} ${plek}. ${t} van de ${n} ${wie} ${wat}. Hoeveel ${wie} zijn dat? Je mag een verhoudingstabel gebruiken.`,
           kaal: `${t} van de ${n} van ${totaal} = …`, antwoord: deel, eenheid: wie,
           uitleg: `${totaal} : ${n} = ${totaal / n}. ${t} × ${totaal / n} = ${deel}.` }
}

// Rechthoek met een kommagetal, en hectare.
export function oppervlakteToets() {
  if (Math.random() < 0.6) {
    const l = rnd(4, 12), b = rnd(3, 9) + 0.5
    return { vraag: `Een rechthoekige kamer is ${l} meter lang en ${komma(b)} meter breed. Hoe groot is de oppervlakte?`,
             kaal: `Rechthoek ${l} m bij ${komma(b)} m = … m²`, antwoord: l * b, eenheid: 'm²',
             uitleg: `${l} × ${komma(b)} = ${komma(l * b)} m².` }
  }
  const ha = pick([0.5, 0.25, 1.5, 2, 0.75, 3])
  return { vraag: `Een weiland is ${komma(ha)} hectare. Hoeveel m² is dat? (1 hectare = 10.000 m²)`,
           kaal: `${komma(ha)} ha = … m²`, antwoord: ha * 10000, eenheid: 'm²',
           uitleg: `1 ha = 10.000 m², dus ${komma(ha)} ha = ${getal(ha * 10000)} m².` }
}

// ── toets blok 7 (doelen blok 6) ──────────────────────────────────────────

// Op een andere manier schrijven: 2.560.000 = … miljoen; afronden en als kommagetal.
export function miljoenKomma() {
  if (Math.random() < 0.5) {
    const miljard = Math.random() < 0.35, u = miljard ? 1e9 : 1e6
    const x = miljard ? rnd(11, 99) / 10 + pick([0, rnd(1, 9) / 100]) : rnd(3, 99) / 100 + rnd(0, 9)
    const n = Math.round(x * u)
    return { vraag: `In de krant staat een groot getal. Schrijf het als kommagetal: ${getal(n)} = … ${miljard ? 'miljard' : 'miljoen'}`, kaal: `${getal(n)} = … ${miljard ? 'miljard' : 'miljoen'}`,
             antwoord: +x.toFixed(2), toon: komma(+x.toFixed(2)),
             uitleg: `${getal(n)} = ${komma(+x.toFixed(2))} ${miljard ? 'miljard' : 'miljoen'}.` }
  }
  const n = rnd(300, 6999) * 1000 + rnd(0, 999)
  const af = Math.round(n / 100000) / 10
  return { vraag: `Rond ${getal(n)} af op een honderdduizendtal en schrijf het als kommagetal: … miljoen`,
           kaal: `${getal(n)} ≈ … miljoen (op honderdduizendtallen)`, antwoord: af, toon: komma(af),
           uitleg: `Afgerond op honderdduizendtallen: ${getal(af * 1e6)}. Dat is ${komma(af)} miljoen.` }
}

// Hoeveel procent raak? En: welk percentage hoort bij dit aantal in de tabel?
export function procentRaak() {
  if (Math.random() < 0.5) {
    const n = pick([10, 20, 25, 50]), r = rnd(1, n - 1), pct = r * 100 / n
    return { vraag: `${naam()} gooit ${n} ballen op de basket en scoort er ${r}. Hoeveel procent raak is dat?`,
             kaal: `${r} van de ${n} raak = … %`, antwoord: pct, eenheid: '%',
             uitleg: `${r}/${n} = ${r * (100 / n)}/100 = ${pct}%.` }
  }
  const totaal = pick([200, 240, 300, 400, 500]), pct = pick([5, 10, 15, 20, 25, 30, 40]), aantal = totaal * pct / 100
  const fruit = pick(['appel', 'peer', 'banaan', 'mandarijn', 'kiwi'])
  return { vraag: `${totaal} kinderen kiezen hun lievelingsfruit. ${aantal} kinderen kiezen ${fruit === 'appel' ? 'een appel' : fruit === 'kiwi' ? 'een kiwi' : 'een ' + fruit}. Welk percentage komt in de tabel?`,
           kaal: `${aantal} van de ${totaal} = … %`, antwoord: pct, eenheid: '%',
           uitleg: `${aantal}/${totaal} = ${pct}/100 = ${pct}%.` }
}

// ── toets blok 8 (doelen blok 7) ──────────────────────────────────────────

// Brandstof: "1 op 15", hoeveel liter voor een afstand?
export function brandstof() {
  const [wat, k] = pick([['vrachtauto', 3], ['bus', 5], ['auto', 15], ['auto', 12], ['scooter', 30], ['camper', 8]])
  const d = k * rnd(8, 60)
  return { vraag: `Een ${wat} rijdt 1 op ${k}: op 1 liter brandstof ${k} kilometer. Hoeveel liter brandstof is nodig voor ${d} kilometer?`,
           kaal: `1 op ${k}, ${d} km = … liter`, antwoord: d / k, eenheid: 'liter',
           uitleg: `${d} : ${k} = ${d / k} liter.` }
}

const VALUTA = [['Noorse kroon', 'Noorse kronen', 'NOK', 9.67], ['Zweedse kroon', 'Zweedse kronen', 'SEK', 11.2], ['Zwitserse frank', 'Zwitserse franken', 'CHF', 0.95],
  ['Britse pond', 'Britse ponden', 'GBP', 0.85], ['Amerikaanse dollar', 'Amerikaanse dollars', 'USD', 1.08], ['Deense kroon', 'Deense kronen', 'DKK', 7.45]]

// Wisselen met een dagkoers, beide kanten op.
export function valutaKoers() {
  const [, mv, code, perEuro] = pick(VALUTA), nm = naam()
  if (Math.random() < 0.5) {
    const e = pick([50, 100, 150, 200, 250, 300])
    return { vraag: `De dagkoers is 1 euro = ${komma(perEuro)} ${code}. ${nm} wisselt ${e} euro voor ${mv}. Hoeveel ${code} krijgt ${nm}?`,
             kaal: `1 euro = ${komma(perEuro)} ${code}. ${e} euro = … ${code}`, antwoord: +(e * perEuro).toFixed(2), eenheid: code,
             uitleg: `${e} × ${komma(perEuro)} = ${komma(+(e * perEuro).toFixed(2))} ${code}.` }
  }
  const perVreemd = +(1 / perEuro).toFixed(2), x = pick([100, 200, 300, 500, 1000])
  return { vraag: `De dagkoers is 1 ${code} = ${komma(perVreemd)} euro. ${nm} wisselt ${x} ${mv} voor euro's. Hoeveel euro krijgt ${nm}?`,
           kaal: `1 ${code} = ${euro(perVreemd)}. ${x} ${code} = € …`, antwoord: +(x * perVreemd).toFixed(2), eenheid: '€',
           uitleg: `${x} × ${komma(perVreemd)} = ${komma(+(x * perVreemd).toFixed(2))} euro.` }
}

// Inhoud van een vrachtauto of container in m³.
export function inhoudM3() {
  const l = rnd(4, 12), b = rnd(2, 3), h = rnd(2, 4)
  return { vraag: `De laadbak van een vrachtauto is ${l} m lang, ${b} m breed en ${h} m hoog. Wat is de inhoud?`,
           kaal: `${l} m × ${b} m × ${h} m = … m³`, antwoord: l * b * h, eenheid: 'm³',
           figuur: { type: 'balk', l, b, h, eenheid: 'm' },
           uitleg: `${l} × ${b} × ${h} = ${l * b * h} m³.` }
}

// ── toets blok 9 (doelen blok 8) ──────────────────────────────────────────

// Welke som hoort erbij? Verhaaltjes voor de rekenmachine.
export function welkeSom() {
  const k = rnd(1, 4)
  if (k === 1) {
    const per = pick([24, 32, 36, 48, 56, 64]), wacht = rnd(per * 2 + 1, per * 6)
    const nodig = Math.ceil(wacht / per)
    return { vraag: `In een treintje passen ${per} kinderen. Er staan ${wacht} kinderen te wachten. Hoeveel treintjes zijn er nodig?`,
             kaal: `${wacht} kinderen, ${per} per treintje: … treintjes`, antwoord: nodig, eenheid: 'treintjes',
             uitleg: `${wacht} : ${per} = ${(wacht / per).toFixed(2).replace('.', ',')}. Er moet nog een treintje bij voor de rest, dus ${nodig}.` }
  }
  if (k === 2) {
    const n = rnd(12, 38), p = rnd(30, 99) / 4
    return { vraag: `${n} bezoekers betalen samen ${euro(n * p)}. Hoeveel is dat gemiddeld per bezoeker?`,
             kaal: `${euro(n * p)} : ${n} =`, antwoord: +p.toFixed(2), eenheid: '€',
             uitleg: `${euro(n * p)} : ${n} = ${euro(p)}.` }
  }
  if (k === 3) {
    const a = rnd(400000, 900000), d = rnd(20000, 90000)
    return { vraag: `In het ene jaar gingen ${getal(a)} mensen met de pont. Het jaar daarvoor waren het er ${getal(d)} meer. Hoeveel mensen gingen dat jaar met de pont?`,
             kaal: `${getal(a)} + ${getal(d)} =`, antwoord: a + d, eenheid: 'mensen',
             uitleg: `${getal(a)} + ${getal(d)} = ${getal(a + d)}.` }
  }
  const prijs = rnd(17, 59) / 2, n = rnd(20, 80)
  return { vraag: `Een kaartje voor het museum kost ${euro(prijs)}. Hoeveel volwassenen kunnen naar binnen voor ${euroRond(n * prijs)}?`,
           kaal: `${euroRond(n * prijs)} : ${euro(prijs)} =`, antwoord: n, eenheid: 'volwassenen',
           uitleg: `${euro(n * prijs)} : ${euro(prijs)} = ${n}.` }
}

// Heel getal × gemengd getal: 3 × 2 1/4 = 6 3/4 (helen + breuk in twee vakjes).
export function heelMaalGemengd() {
  const d = pick([3, 4, 5, 6, 8, 10]), h = rnd(1, 4), t = rnd(1, d - 1), n = rnd(2, 8)
  const totaalT = n * (h * d + t), heel = Math.floor(totaalT / d), r = totaalT % d
  const g = r ? ggd(r, d) : 1
  return {
    vraag: `Reken uit. Schrijf de breuk zo klein mogelijk: ${n} × ${h} ${t}/${d} =`,
    kaal: `${n} × ${h} ${t}/${d} =`, antwoord: heel, rest: r ? r / g : null,
    antwLabel: 'Hele', restLabel: r ? `…/${d / g}` : undefined, toon: r ? `${heel} ${r / g}/${d / g}` : `${heel}`,
    uitleg: `${n} × ${h} = ${n * h} en ${n} × ${t}/${d} = ${n * t}/${d}${n * t >= d ? ` = ${Math.floor(n * t / d)}${(n * t) % d ? ` ${breuk((n * t) % d, d)}` : ''}` : ''}. Samen ${heel}${r ? ` ${r / g}/${d / g}` : ''}.`,
  }
}

// Korting van 12½%, en "nu 15% extra" bij een inhoud.
export function kortingExtra() {
  if (Math.random() < 0.5) {
    const prijs = pick([80, 120, 160, 200, 240, 320, 400])
    return { vraag: `Een fiets kost ${euroRond(prijs)}. Je krijgt 12½% korting. Wat is de nieuwe prijs?`,
             kaal: `${euroRond(prijs)} met 12½% korting = €`, antwoord: prijs * 7 / 8, eenheid: '€',
             uitleg: `12½% = 1/8. ${prijs} : 8 = ${prijs / 8} korting. ${prijs} − ${prijs / 8} = ${prijs * 7 / 8}.` }
  }
  const inhoud = pick([200, 250, 300, 400, 500]), pct = pick([10, 15, 20, 25, 30, 50])
  const extra = inhoud * pct / 100
  if (!Number.isInteger(extra)) return kortingExtra()
  return { vraag: `Een pot pindakaas had ${inhoud} gram. Nu zit er ${pct}% extra in. Hoeveel gram zit er nu in de pot?`,
           kaal: `${inhoud} g + ${pct}% extra = … g`, antwoord: inhoud + extra, eenheid: 'g',
           uitleg: `${pct}% van ${inhoud} = ${extra} gram extra. ${inhoud} + ${extra} = ${inhoud + extra} gram.` }
}

// Gewichten omrekenen, ook met milligram.
export function gewichtOmrekenen() {
  const v = pick([
    () => { const x = rnd(1001, 29999) / 1000; return [`${komma(x, 3)} kg = … g`, Math.round(x * 1000), 'g', `1 kg = 1000 g, dus ${komma(x, 3)} × 1000 = ${getal(Math.round(x * 1000))} g.`] },
    () => { const x = rnd(105, 995); return [`${x} g = … kg`, x / 1000, 'kg', `1000 g = 1 kg, dus ${x} : 1000 = ${komma(x / 1000)} kg.`] },
    () => { const x = rnd(1, 9); return [`${x} g = … kg`, x / 1000, 'kg', `1000 g = 1 kg, dus ${x} g = ${komma(x / 1000, 3)} kg.`] },
    () => { const x = rnd(1, 9); return [`${x} mg = … g`, x / 1000, 'g', `1000 mg = 1 g, dus ${x} mg = ${komma(x / 1000, 3)} g.`] },
    () => { const x = rnd(1050, 4950); return [`${getal(x)} g = … kg`, x / 1000, 'kg', `${getal(x)} : 1000 = ${komma(x / 1000)} kg.`] },
  ])()
  return { vraag: `${naam()} oefent voor de toets en rekent de maat om: ${v[0]}`, kaal: v[0], antwoord: v[1], omrekenen: true, eenheid: v[2], uitleg: v[3] }
}

// Wat kost 1 kg, als je de prijs van een ander gewicht weet?
export function prijsPerKilo() {
  const [wat, g] = pick([['kip', 600], ['gehakt', 500], ['kaas', 400], ['druiven', 750], ['kersen', 250], ['vis', 800]])
  const perKg = rnd(8, 30) * 0.5
  const prijs = +(perKg * g / 1000).toFixed(2)
  if (Math.abs(prijs * 1000 / g - perKg) > 0.001) return prijsPerKilo()
  return { vraag: `${g} gram ${wat} kost ${euro(prijs)}. Wat kost 1 kg ${wat}?`, kaal: `${g} g kost ${euro(prijs)}. 1 kg kost €`,
           antwoord: perKg, eenheid: '€', uitleg: `${g} g kost ${euro(prijs)}, dus 100 g kost ${euro(prijs / (g / 100))}. 1 kg = 10 × 100 g = ${euro(perKg)}.` }
}
