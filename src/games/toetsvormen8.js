// Toetsvormen groep 8 (Pluspunt), plus groep 7 blok 10.
//
// Zelfde idee als toetsvormen6.js en toetsvormen7.js: elk doel wordt gevraagd
// zoals de Pluspunt-toets het doet, met eigen verhaaltjes en getallen. Waar de
// toets een kale som geeft, staat er een verhaaltje met zo'n som erin.
//
// Toets blok N toetst de doelen van blok N − 1; toets blok 1 van groep 8 gaat
// dus over groep 7 blok 10. Groep 8 heeft een F-toets (route FS) en een
// S-toets (route S+). Elke koppeling hieronder krijgt `s` = S-toets mee; waar
// F en S verschillen, maakt de S-versie de som zoals de S-toets hem vraagt.
//
// Doelen waar "je oriënteert je" bij staat, worden niet getoetst en krijgen
// dus geen toetsvorm (cirkel, roosters, nieuwsgrafieken, enquêtes, negatieve
// getallen, kwadraten, staartdelen en priemgetallen).

import { rnd, pick, naam, getal, komma, euro, euroRond, rond2, breuk, gemengd, keuze, ggd } from './toetsHulp.js'

const PAD = (n) => String(n).padStart(2, '0')
const tijd = (min) => `${Math.floor(min / 60)}:${PAD(min % 60)}`
// Bedrag in hele centen? (geen 0,375 euro)
const heleCenten = (x) => Math.abs(x * 100 - Math.round(x * 100)) < 1e-6

// ── groep 7 blok 10 en groep 8 blok 3 (toets blok 1 en 4): schatten ───────

const SPULLEN = [['een ticket', 39.9], ['een sporttas', 11.5], ['een sjaal', 9.99], ['een shirt', 24.95], ['een bal', 18.99],
  ['een vogelkooi', 21.25], ['een hamsterkooi', 52.5], ['een aquarium', 39.85], ['een krabpaal', 8.95]]

// Hoeveel is het ongeveer? Met geld (houd je over / moet je betalen) of met
// bezoekersaantallen. Antwoord kiezen uit afgeronde bedragen.
export const schattenContext = (s) => () => {
  const soort = rnd(1, 3), nm = naam()
  if (soort === 1) {
    const [a, pa] = pick(SPULLEN), [b, pb] = pick(SPULLEN.filter(x => x[0] !== a))
    const nb = s ? rnd(1, 3) : 1, budget = pick([100, 150, 200, 250])
    const rond = Math.round(pa / 5) * 5 + nb * Math.round(pb / 5) * 5
    if (budget - rond < 20) return schattenContext(s)()
    const over = budget - rond
    return { vraag: `${nm} koopt ${a} van ${euro(pa)} en ${nb === 1 ? b : `${nb} keer ${b}`} van ${euro(pb)}. ${nm} had ${euroRond(budget)}. Hoeveel houdt ${nm} ongeveer over?`,
      kaal: `€ ${budget} − ${euro(pa)} − ${nb} × ${euro(pb)} ≈`, opties: keuze(euroRond(over), [over - 20, over + 20, over + 40].filter(x => x > 0).map(euroRond)),
      antwoord: euroRond(over), uitleg: `Rond af: ${euro(pa)} ≈ € ${Math.round(pa / 5) * 5} en ${euro(pb)} ≈ € ${Math.round(pb / 5) * 5}. ${budget} − ${rond} ≈ € ${over}.` }
  }
  if (soort === 2) {
    const [a, pa] = pick(SPULLEN), n = rnd(3, s ? 12 : 8), r = Math.round(pa / 5) * 5 || 5
    return { vraag: `${nm} koopt ${n} keer ${a} van ${euro(pa)}. Hoeveel moet ${nm} ongeveer betalen?`,
      kaal: `${n} × ${euro(pa)} ≈`, opties: keuze(euroRond(n * r), [n * r - 10, n * r + 10, n * r + 50].map(euroRond)),
      antwoord: euroRond(n * r), uitleg: `${euro(pa)} is ongeveer € ${r}. ${n} × € ${r} = € ${n * r}.` }
  }
  const dagen = s ? ['maandag', 'dinsdag', 'woensdag', 'donderdag'] : ['vrijdag', 'zaterdag', 'zondag']
  const aantallen = dagen.map(() => rnd(9, 32) * 100 + rnd(-40, 40))
  const r = aantallen.reduce((t, x) => t + Math.round(x / 100) * 100, 0)
  return { vraag: `Het aantal toeschouwers in het stadion: ${dagen.map((d, i) => `${d} ${getal(aantallen[i])}`).join(', ')}. Hoeveel toeschouwers zijn dat ongeveer samen?`,
    kaal: `${aantallen.map(getal).join(' + ')} ≈`, opties: keuze(getal(r), [r - 1000, r + 1000, r + 500].map(getal)),
    antwoord: getal(r), uitleg: `Rond af op honderdtallen: ${aantallen.map(x => getal(Math.round(x / 100) * 100)).join(' + ')} = ${getal(r)}.` }
}

// ── groep 7 blok 10 (toets groep 8 blok 1) ───────────────────────────────

// Oppervlakte met kommagetallen: schat, reken zonder komma, zet de komma.
export const oppervlakteKomma = () => () => {
  const l = rnd(31, 79) / 10, b = rnd(21, Math.min(59, l * 10 - 1)) / 10, opp = rond2(l * b)
  const kamer = pick(['de woonkamer', 'de slaapkamer', 'het klaslokaal', 'de keuken'])
  return { vraag: `${kamer[0].toUpperCase() + kamer.slice(1)} is ${komma(l)} m lang en ${komma(b)} m breed. Wat is de oppervlakte? Schat eerst en reken dan uit.`,
    kaal: `${komma(l)} × ${komma(b)} =`, antwoord: komma(opp), eenheid: 'm²',
    uitleg: `Schatting: ${Math.round(l)} × ${Math.round(b)} = ${Math.round(l) * Math.round(b)}. Zonder komma: ${Math.round(l * 10)} × ${Math.round(b * 10)} = ${Math.round(l * b * 100)}. Met komma: ${komma(opp)} m².` }
}

// Breuken, kommagetallen, percentages en verhoudingen omzetten en vergelijken.
const OMZET = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [4, 5], [1, 10], [3, 10], [7, 10], [1, 8], [3, 8], [1, 20], [3, 20], [17, 50]]
export const breukKommaPct = (s) => () => {
  const soort = rnd(1, 4)
  const [t, n] = pick(s ? OMZET : OMZET.slice(0, 10))
  const dec = t / n
  if (soort === 1) {
    return { vraag: `Bij de bakker wordt ${t}/${n} kilo kaas gewogen. Hoeveel kilo is dat als kommagetal?`, kaal: `${t}/${n} = … (kommagetal)`,
      antwoord: komma(dec), eenheid: 'kg', uitleg: `${t}/${n} = ${t} : ${n} = ${komma(dec)}.` }
  }
  if (soort === 2) {
    return { vraag: `Een fles is voor ${komma(dec)} deel vol. Schrijf dat als breuk, zo klein mogelijk.`, kaal: `${komma(dec)} = … (breuk)`,
      antwoord: breuk(t, n), uitleg: `${komma(dec)} = ${Math.round(dec * 1000)}/1000 = ${breuk(t, n)}.` }
  }
  if (soort === 3) {
    const pct = dec * 100
    if (!Number.isInteger(pct)) return breukKommaPct(s)()
    return Math.random() < 0.5
      ? { vraag: `${t} op de ${n} kinderen gaat met de fiets naar school. Hoeveel procent is dat?`, kaal: `${t} op de ${n} = … %`, antwoord: pct, eenheid: '%', uitleg: `${t}/${n} = ${pct}/100 = ${pct}%.` }
      : { vraag: `${pct}% van de klas speelt een instrument. Welk deel is dat, als breuk zo klein mogelijk?`, kaal: `${pct}% = … (breuk)`, antwoord: breuk(t, n), uitleg: `${pct}% = ${pct}/100 = ${breuk(t, n)}.` }
  }
  const set = new Set([dec, ...[0.25, 0.4, 0.6, 0.68, 0.02, 0.06, 0.3, 0.66, 0.5].filter(() => Math.random() < 0.4)])
  while (set.size < 3) set.add(rnd(1, 99) / 100)
  const getallen = [...set].slice(0, 4)
  const max = Math.max(...getallen)
  return { vraag: `${naam()} meet de lengte van een paar rupsen in meter: ${getallen.map(g => komma(g)).join(', ')}. Welke rups is het langst?`,
    kaal: `Welk getal is het grootst: ${getallen.map(g => komma(g)).join(', ')}?`, opties: getallen.map(g => komma(g)), antwoord: komma(max),
    uitleg: `Vergelijk de tienden, dan de honderdsten: ${komma(max)} is het grootst.` }
}

// Lijndiagram met tijd en afstand: hoe ver, hoelang, wanneer stilgestaan.
export const tijdAfstand = (s) => () => {
  const stappen = s ? 7 : 6, per = 5, snelheid = pick([1, 2]), stop = rnd(2, stappen - 2)
  const items = []
  let km = 0
  for (let i = 0; i <= stappen; i++) { if (i > 0 && i !== stop) km += snelheid * pick([1, 1, 2]); items.push({ label: String(i * per), waarde: km }) }
  const nm = naam(), soort = rnd(1, 3)
  const fig = { type: 'lijn', items, step: Math.max(1, Math.ceil(km / 6)), titel: 'afstand (km)' }
  if (soort === 1) return { vraag: `Het diagram laat de fietstocht van ${nm} zien (onder: tijd in minuten, links: afstand in km). Hoeveel km was de fietstocht?`, kaal: 'Hoeveel km in totaal?', antwoord: km, eenheid: 'km', figuur: fig, uitleg: `Aan het eind staat de lijn op ${km} km.` }
  if (soort === 2) return { vraag: `Het diagram laat de fietstocht van ${nm} zien (onder: tijd in minuten). Na hoeveel minuten stond ${nm} even stil?`, kaal: 'Na hoeveel minuten liep de lijn vlak?', antwoord: (stop - 1) * per, eenheid: 'min', figuur: fig, uitleg: `Tussen ${(stop - 1) * per} en ${stop * per} minuten loopt de lijn vlak: ${nm} stond stil na ${(stop - 1) * per} minuten.` }
  const i = rnd(1, stappen - 1)
  return { vraag: `Het diagram laat de fietstocht van ${nm} zien (onder: tijd in minuten). Hoeveel km had ${nm} gefietst na ${i * per} minuten?`, kaal: `Hoeveel km na ${i * per} minuten?`, antwoord: items[i].waarde, eenheid: 'km', figuur: fig, uitleg: `Bij ${i * per} minuten staat de lijn op ${items[i].waarde} km.` }
}

// ── groep 8 blok 1 en 9 (toets blok 2 en 10): volgorde van bewerkingen ────

export const volgorde = () => () => {
  const soort = rnd(1, 6)
  if (soort === 1) { const b = rnd(3, 8), c = rnd(2, 5), a = b * c + rnd(3, 20); return { vraag: `Er liggen ${a} appels in de kist. ${b} kinderen pakken er elk ${c}. Hoeveel appels liggen er nog?`, kaal: `${a} − ${b} × ${c} =`, antwoord: a - b * c, uitleg: `Eerst keer: ${b} × ${c} = ${b * c}. Dan ${a} − ${b * c} = ${a - b * c}.` } }
  if (soort === 2) { const a = rnd(20, 45), b = rnd(2, 9), c = rnd(3, 6); return { vraag: `Een kaartje kost € ${a},-. Met de ledenpas krijg je € ${b},- korting. ${naam()} koopt ${c} kaartjes met korting. Hoeveel moet er betaald worden?`, kaal: `(${a} − ${b}) × ${c} =`, antwoord: (a - b) * c, eenheid: '€', uitleg: `Eerst tussen de haakjes: ${a} − ${b} = ${a - b}. Dan × ${c} = ${(a - b) * c}.` } }
  if (soort === 3) { const c = rnd(3, 6), q = rnd(3, 8), a = rnd(2, 9), nm = naam(); return { vraag: `${nm} heeft ${a} stickers. Een vel van ${c * q} stickers wordt eerlijk verdeeld over ${c} kinderen, ook ${nm} krijgt een deel. Hoeveel stickers heeft ${nm} nu?`, kaal: `${a} + ${c * q} : ${c} =`, antwoord: a + q, uitleg: `Eerst delen: ${c * q} : ${c} = ${q}. Dan ${a} + ${q} = ${a + q}.` } }
  if (soort === 4) { const c = rnd(3, 6), q = rnd(4, 9), a = rnd(2, c * q - 2), b = c * q - a; return { vraag: `${a} jongens en ${b} meisjes gaan in groepjes van ${c}. Hoeveel groepjes zijn dat?`, kaal: `(${a} + ${b}) : ${c} =`, antwoord: q, uitleg: `Eerst tussen de haakjes: ${a} + ${b} = ${a + b}. Dan : ${c} = ${q}.` } }
  if (soort === 5) { const b = rnd(2, 6), c = rnd(2, 5), q = rnd(2, 6), a = b * c * q; return { vraag: `${a} snoepjes worden verdeeld over ${b} tafels. Aan elke tafel zitten ${c} kinderen. Hoeveel snoepjes krijgt elk kind?`, kaal: `${a} : (${b} × ${c}) =`, antwoord: q, uitleg: `Eerst tussen de haakjes: ${b} × ${c} = ${b * c}. Dan ${a} : ${b * c} = ${q}.` } }
  const a = rnd(2, 4), b = rnd(3, 9) * 5, c = rnd(2, 5), d = c * rnd(5, 20)
  const nm = naam()
  return { vraag: `${nm} koopt ${a} boeken van € ${b},-. Een cadeau van € ${d},- wordt gedeeld door ${c} kinderen, ook door ${nm}. Hoeveel betaalt ${nm} in totaal?`,
    kaal: `${a} × ${b} + ${d} : ${c} =`, antwoord: a * b + d / c, eenheid: '€', uitleg: `Eerst keer en delen: ${a} × ${b} = ${a * b} en ${d} : ${c} = ${d / c}. Dan ${a * b} + ${d / c} = ${a * b + d / c}.` }
}

// ── groep 8 blok 1 (toets blok 2) ────────────────────────────────────────

// Delen met kommagetallen: hoeveel kost 1 kg? Schat, reken, zet de komma.
export const prijsPerKilo = () => () => {
  const p = rnd(15, 99) / 10, kg = rnd(11, 69) / 10, tot = rond2(p * kg)
  const wat = pick(['kaas', 'gehakt', 'druiven', 'noten', 'kersen'])
  return { vraag: `${komma(kg)} kg ${wat} kost ${euro(tot)}. Hoeveel kost 1 kg ${wat}? Schat eerst.`, kaal: `${euro(tot)} : ${komma(kg)} =`,
    antwoord: p, eenheid: '€', uitleg: `Schatting: ${Math.round(tot)} : ${Math.round(kg)} ≈ ${komma(Math.round(tot) / Math.round(kg), 1)}. Precies: ${euro(tot)} : ${komma(kg)} = ${euro(p)}.` }
}

// Korting en totaal uit een percentage. F: nieuwe prijs. S: oude prijs.
export const kortingTotaal = (s) => () => {
  if (Math.random() < 0.5) {
    const pct = pick(s ? [10, 15, 20, 25, 50, 75] : [10, 20, 25, 50]), stap = 100 / ggd(100, pct), oud = rnd(2, 30) * stap * (s ? 2 : 10)
    const nieuw = oud * (100 - pct) / 100
    const reis = pick(['Parijs', 'Berlijn', 'Rome', 'Londen', 'Venetië'])
    return s
      ? { vraag: `Een reis naar ${reis} kost na ${pct}% korting nog ${euroRond(nieuw)}. Wat was de oude prijs?`, kaal: `${100 - pct}% = ${euroRond(nieuw)}. 100% = …`, antwoord: oud, eenheid: '€', uitleg: `${100 - pct}% = ${nieuw}, dus 1% = ${komma(rond2(nieuw / (100 - pct)))} en 100% = ${oud}.` }
      : { vraag: `Een reis naar ${reis} kost ${euroRond(oud)}. Je krijgt ${pct}% korting. Wat wordt de nieuwe prijs?`, kaal: `${euroRond(oud)} − ${pct}% =`, antwoord: nieuw, eenheid: '€', uitleg: `${pct}% van ${oud} = ${oud * pct / 100}. ${oud} − ${oud * pct / 100} = ${nieuw}.` }
  }
  const pct = pick(s ? [15, 20, 40, 60] : [10, 20, 25, 50]), totaal = rnd(2, 20) * (100 / ggd(100, pct)), deel = totaal * pct / 100
  const [wat, e] = pick([['de reisafstand', 'km'], ['de film', 'minuten'], ['het spaargeld', 'euro'], ['de container', 'liter']])
  return { vraag: `${pct}% van ${wat} is ${getal(deel)} ${e}. Hoeveel ${e} is het totaal?`, kaal: `${pct}% = ${getal(deel)}. 100% = …`,
    antwoord: totaal, uitleg: `${pct}% = ${deel}, dus 1% = ${komma(rond2(deel / pct))} en 100% = ${totaal}.` }
}

// Tijdzones en reistijd.
const ZONES = [['Londen', -1], ['Lissabon', -1], ['Moskou', 2], ['Dubai', 3], ['Tokio', 8], ['New York', -6], ['Bangkok', 6]]
export const tijdzone = (s) => () => {
  if (Math.random() < 0.5) {
    const [stad, dt] = pick(s ? ZONES : ZONES.slice(0, 5)), h = rnd(8, 15), m = s ? pick([0, 30]) : 0
    const H = (h + dt + 24) % 24
    return { vraag: `In Amsterdam is het ${h}:${PAD(m)} uur. In ${stad} is het ${Math.abs(dt)} uur ${dt > 0 ? 'later' : 'vroeger'}. Hoe laat is het in ${stad}?`,
      kaal: `${h}:${PAD(m)} ${dt > 0 ? '+' : '−'} ${Math.abs(dt)} uur =`, antwoordType: 'tijd', tijdH: H, tijdM: m, antwoord: `${H}:${PAD(m)}`,
      uitleg: `${h}:${PAD(m)} ${dt > 0 ? '+' : '−'} ${Math.abs(dt)} uur = ${H}:${PAD(m)}.` }
  }
  const v = rnd(5, 14) * 60 + pick([5, 15, 25, 45, 55]), duur = rnd(1, s ? 7 : 4) * 60 + pick([10, 20, 30, 40, 50]), a = v + duur
  return { vraag: `De trein vertrekt om ${tijd(v)} uur en komt aan om ${tijd(a)} uur. Hoelang duurt de reis?`, kaal: `Van ${tijd(v)} tot ${tijd(a)} = … uur en … minuten`,
    antwoord: Math.floor(duur / 60), rest: duur % 60, antwLabel: 'uur', restLabel: 'minuten', toon: `${Math.floor(duur / 60)} uur en ${duur % 60} minuten`,
    uitleg: `Van ${tijd(v)} tot ${tijd(v + Math.floor(duur / 60) * 60)} is ${Math.floor(duur / 60)} uur, dan nog ${duur % 60} minuten.` }
}

// ── groep 8 blok 2 (toets blok 3) ────────────────────────────────────────

// Grote getallen op 2 manieren schrijven en afronden.
export const groteGetallen = (s) => () => {
  const soort = rnd(1, 3)
  if (soort === 1) {
    const [woord, f] = pick([['miljard', 1e9], ['miljoen', 1e6], ['duizend', 1e3]]), x = rnd(11, 99) / 10
    return { vraag: `Er wonen ongeveer ${komma(x)} ${woord} ${pick(['mensen', 'vogels', 'insecten'])} in het gebied. Schrijf dat getal helemaal in cijfers.`,
      kaal: `${komma(x)} ${woord} = … (in cijfers)`, antwoord: Math.round(x * f), uitleg: `${komma(x)} × ${getal(f)} = ${getal(Math.round(x * f))}.` }
  }
  if (soort === 2) {
    const [woord, f] = pick([['miljard', 1e9], ['miljoen', 1e6]]), x = rnd(11, 99) / 10
    return { vraag: `Een land gaf ${getal(Math.round(x * f))} euro uit aan wegen. Schrijf dat als kommagetal in ${woord}en.`,
      kaal: `${getal(Math.round(x * f))} = … ${woord}`, antwoord: komma(x), uitleg: `${getal(Math.round(x * f))} = ${komma(x)} ${woord}.` }
  }
  if (s && Math.random() < 0.5) {
    const n = rnd(100000, 999999) / 1000, [op, d] = pick([['een tiende', 1], ['een honderdste', 2], ['een eenheid', 0]])
    return { vraag: `Een hardloper loopt ${komma(n, 3)} km. Rond af op ${op}.`, kaal: `Rond ${komma(n, 3)} af op ${op}.`, antwoord: komma(+n.toFixed(d), d), uitleg: `${komma(n, 3)} afgerond op ${op} = ${komma(+n.toFixed(d), d)}.` }
  }
  const n = rnd(10000, 999999), [op, f] = pick([['tientallen', 10], ['honderdtallen', 100], ['een duizendtal', 1000]])
  return { vraag: `Bij het festival waren ${getal(n)} bezoekers. Rond dat af op ${op}.`, kaal: `Rond ${getal(n)} af op ${op}.`, antwoord: Math.round(n / f) * f,
    uitleg: `${getal(n)} afgerond op ${op} = ${getal(Math.round(n / f) * f)}.` }
}

// Percentages, breuken en verhoudingen koppelen en een deel uitrekenen.
export const pctVerhouding = (s) => () => {
  const [t, n] = pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [2, 3], [5, 6]])
  if (Math.random() < 0.5 && 100 % n === 0) {
    return { vraag: `${t} op de ${n} toeristen logeert in een hotel. Hoeveel procent is dat?`, kaal: `${t} op de ${n} = … %`, antwoord: t * 100 / n, eenheid: '%', uitleg: `${t}/${n} = ${t * 100 / n}/100 = ${t * 100 / n}%.` }
  }
  if (s) {
    const pct = pick([40, 60, 75, 80]), plekken = rnd(2, 9) * 100, geboekt = plekken * pct / 100
    if (geboekt % n !== 0) return pctVerhouding(s)()
    return { vraag: `${pct}% van de ${plekken} plaatsen op de camping is geboekt. ${t} op de ${n} boekingen is van gezinnen met kinderen. Hoeveel boekingen zijn dat?`,
      kaal: `${t}/${n} van ${pct}% van ${plekken} =`, antwoord: geboekt / n * t, uitleg: `${pct}% van ${plekken} = ${geboekt}. ${t}/${n} van ${geboekt} = ${geboekt / n * t}.` }
  }
  const leden = n * rnd(20, 120)
  return { vraag: `Een muziekschool heeft ${leden} leden. ${t} van de ${n} leden heeft 1 keer per week les. Hoeveel leden zijn dat?`, kaal: `${t}/${n} van ${leden} =`,
    antwoord: leden / n * t, uitleg: `1/${n} van ${leden} = ${leden / n}. ${t}/${n} = ${t} × ${leden / n} = ${leden / n * t}.` }
}

// Schaal: met een schaallijntje (F) of met 1 : … (S).
export const schaal = (s) => () => {
  if (!s) {
    const per = pick([200, 250, 500]), cm = rnd(2, 12), echt = cm * per
    const lijntje = (kaart, inEcht) => ({ type: 'schaal', N: per * 100, tabel: [['op de kaart (cm)', 1, kaart], ['in het echt (m)', per, inEcht]] })
    if (Math.random() < 0.5) return { figuur: lijntje(cm, '?'), vraag: `Op de kaart staat een schaallijntje: 1 cm is ${per} m. De route is op de kaart ${cm} cm. Hoeveel km is de route in het echt?`, kaal: `${cm} × ${per} m = … km`, antwoord: komma(echt / 1000), eenheid: 'km', uitleg: `${cm} × ${per} = ${getal(echt)} m = ${komma(echt / 1000)} km.` }
    const km = pick([1, 2, 3]), lijn = km * 1000 / per
    if (!Number.isInteger(lijn * 2)) return schaal(s)()
    return { figuur: lijntje('?', getal(km * 1000)), vraag: `Op de kaart is 1 cm in het echt ${per} m. Een weg is in het echt ${km} km. Hoe lang teken je de weg op de kaart?`, kaal: `${km} km : ${per} m = … cm`, antwoord: komma(lijn), eenheid: 'cm', uitleg: `${km} km = ${km * 1000} m. ${km * 1000} : ${per} = ${komma(lijn)} cm.` }
  }
  const sch = pick([50000, 100000, 200000, 250000, 500000, 750000]), cm = rnd(2, 24), km = cm * sch / 100000
  if (Math.random() < 0.5) return { figuur: { type: 'schaal', N: sch, tabel: [['op de kaart (cm)', 1, cm], ['in het echt (km)', komma(sch / 100000), '?']] }, vraag: `Een kaart heeft schaal 1 : ${getal(sch)}. De route is op de kaart ${cm} cm. Hoeveel km is de route in het echt?`, kaal: `${cm} cm × ${getal(sch)} = … km`, antwoord: komma(km), eenheid: 'km', uitleg: `1 cm = ${getal(sch)} cm = ${komma(sch / 100000)} km. ${cm} × ${komma(sch / 100000)} = ${komma(km)} km.` }
  return { figuur: { type: 'schaal', N: null, tabel: [['op de kaart (cm)', cm, 1], ['in het echt (cm)', getal(km * 100000), '?']] }, vraag: `Een route is op de kaart ${cm} cm. In het echt is de route ${komma(km)} km. Wat is de schaal? Schrijf alleen het getal na 1 : …`, kaal: `${cm} cm = ${komma(km)} km. Schaal 1 : …`,
    antwoord: sch, uitleg: `${komma(km)} km = ${getal(km * 100000)} cm. ${getal(km * 100000)} : ${cm} = ${getal(sch)}, dus 1 : ${getal(sch)}.` }
}

// ── groep 8 blok 3 (toets blok 4) ────────────────────────────────────────

// F: deel van een hoeveelheid en heel getal × breuk. S: breuk × breuk.
export const breukKeer = (s) => () => {
  if (s && Math.random() < 0.6) {
    const [a, b] = pick([[1, 2], [2, 3], [3, 4], [1, 3], [3, 5], [1, 4]]), [c, d] = pick([[3, 4], [2, 5], [5, 6], [3, 8], [4, 5], [1, 2]])
    return { vraag: `Van een taart is nog ${c}/${d} deel over. ${naam()} eet ${a}/${b} van wat er over is. Welk deel van de hele taart is dat?`, kaal: `${a}/${b} × ${c}/${d} =`,
      antwoord: breuk(a * c, b * d), uitleg: `${a}/${b} × ${c}/${d} = ${a * c}/${b * d} = ${breuk(a * c, b * d)}.` }
  }
  if (Math.random() < 0.5) {
    const n = pick([3, 4, 5, 6]), k = rnd(1, n - 1), vat = n * rnd(2, 6) * 100
    return { vraag: `Een vat van ${getal(vat)} liter is voor ${k}/${n} deel gevuld. Hoeveel liter zit erin?`, kaal: `${k}/${n} van ${getal(vat)} =`, antwoord: vat / n * k, eenheid: 'l', uitleg: `1/${n} van ${vat} = ${vat / n}. ${k}/${n} = ${vat / n * k} liter.` }
  }
  const [t, n] = pick([[3, 4], [1, 2], [2, 3], [1, 4], [3, 8]]), pannen = rnd(2, 5)
  return { vraag: `Voor 1 pan tomatensoep heb je ${t}/${n} liter room nodig. Hoeveel liter room heb je nodig voor ${pannen} pannen?`, kaal: `${pannen} × ${t}/${n} =`,
    antwoord: breuk(pannen * t, n), eenheid: 'liter', uitleg: `${pannen} × ${t}/${n} = ${pannen * t}/${n} = ${gemengd(pannen * t, n)} liter.` }
}

// F: rekenen via 1%. S: percentages boven de 100 en extra.
export const procentRekenen = (s) => () => {
  if (s && Math.random() < 0.6) {
    if (Math.random() < 0.5) {
      const pct = pick([10, 15, 20, 25]), basis = rnd(4, 24) * 20, extra = basis * pct / 100
      if (!Number.isInteger(extra)) return procentRekenen(s)()
      return { vraag: `Een zak chips van ${basis} gram heeft nu ${pct}% extra. Hoeveel gram zit er nu in de zak?`, kaal: `${basis} + ${pct}% =`, antwoord: basis + extra, eenheid: 'g', uitleg: `${pct}% van ${basis} = ${extra}. ${basis} + ${extra} = ${basis + extra} gram.` }
    }
    const pct = pick([120, 150, 200, 250]), oud = rnd(2, 30) * 20
    return { vraag: `Een fiets kostte ${euroRond(oud)}. De nieuwe prijs is ${pct}% van de oude prijs. Wat is de nieuwe prijs?`, kaal: `${pct}% van ${euroRond(oud)} =`, antwoord: oud * pct / 100, eenheid: '€', uitleg: `100% = ${oud}, 1% = ${komma(oud / 100)}. ${pct}% = ${oud * pct / 100}.` }
  }
  const pct = pick([3, 5, 8, 12, 17, 22, 25, 40]), tot = rnd(2, 12) * 100
  const [wat, e] = pick([['In een pak soep van … gram zit … zout.', 'gram'], ['Van de … bezoekers kwam … met de trein.', 'bezoekers']])
  const zin = wat.replace('…', getal(tot)).replace('…', `${pct}%`)
  return { vraag: `${zin} Hoeveel ${e} is dat?`, kaal: `${pct}% van ${getal(tot)} =`, antwoord: tot * pct / 100, eenheid: e === 'gram' ? 'g' : undefined,
    uitleg: `1% van ${tot} = ${tot / 100}. ${pct}% = ${pct} × ${tot / 100} = ${tot * pct / 100}.` }
}

// Rekenen met gewicht en prijzen per kilo.
export const gewichtPrijs = (s) => () => {
  if (Math.random() < 0.5) {
    if (s) {
      const [van, naar, f, max] = pick([['g', 'kg', 1000, 9999], ['kg', 'ton', 1000, 9999], ['mg', 'g', 1000, 9999], ['hg', 'g', 100, 9]])
      const n = rnd(van === 'hg' ? 1 : 101, max)
      return { vraag: `Iets weegt ${getal(n)} ${van}. Hoeveel ${naar} is dat?`, kaal: `${getal(n)} ${van} = … ${naar}`, antwoord: van === 'hg' ? n * f : komma(n / f), eenheid: naar, uitleg: van === 'hg' ? `1 hg = 100 g. ${n} × 100 = ${n * 100} g.` : `${f} ${van} = 1 ${naar}. ${getal(n)} : ${f} = ${komma(n / f)}.` }
    }
    const kg = rnd(2, 9), eruit = rnd(1, 9) * 100
    return { vraag: `Een zak potgrond weegt ${kg} kg. Er wordt ${eruit} g uit gehaald. Hoeveel kilo weegt de zak nog?`, kaal: `${kg} kg − ${eruit} g = … kg`, antwoord: komma(kg - eruit / 1000), eenheid: 'kg', uitleg: `${eruit} g = ${komma(eruit / 1000)} kg. ${kg} − ${komma(eruit / 1000)} = ${komma(kg - eruit / 1000)} kg.` }
  }
  const prijs = rnd(s ? 11 : 12, s ? 129 : 80) / 10, gram = pick(s ? [450, 900, 1200, 350] : [250, 500, 750, 1500])
  if (!heleCenten(prijs * gram / 1000)) return gewichtPrijs(s)()
  const p = rond2(prijs * gram / 1000)
  const wat = pick(['appels', 'kaas', 'kipfilet', 'tomaten'])
  return { vraag: `De prijs van ${wat} is ${euro(prijs)} per kg. Hoeveel kost ${gram >= 1000 ? komma(gram / 1000) + ' kg' : gram + ' g'} ${wat}?`, kaal: `${gram} g bij ${euro(prijs)} per kg =`,
    antwoord: p, eenheid: '€', uitleg: `${gram} g = ${komma(gram / 1000)} kg. ${komma(gram / 1000)} × ${euro(prijs)} = ${euro(p)}.` }
}

// ── groep 8 blok 4 (toets blok 5) ────────────────────────────────────────

// Cijferen: vermenigvuldigen en kolomsgewijs delen in maximaal 3 stappen.
export const cijferenKeerDeel = (s) => () => {
  const soort = rnd(1, 3)
  if (soort === 1) { const a = rnd(21, 89), b = rnd(21, 89); return { vraag: `Een zaal heeft ${a} rijen met elk ${b} stoelen. Hoeveel stoelen zijn er?`, kaal: `${a} × ${b} =`, antwoord: a * b, uitleg: `${a} × ${b} = ${a} × ${b - (b % 10)} + ${a} × ${b % 10} = ${a * (b - (b % 10))} + ${a * (b % 10)} = ${getal(a * b)}.` } }
  if (soort === 2) { const a = rnd(3, 9), b = rnd(212, 989); return { vraag: `Een vrachtwagen rijdt ${a} keer ${b} km. Hoeveel km is dat?`, kaal: `${a} × ${b} =`, antwoord: a * b, eenheid: 'km', uitleg: `${a} × ${b} = ${getal(a * b)}.` } }
  const d = s ? rnd(31, 59) : rnd(12, 29), q = rnd(102, s ? 320 : 330), r = s && Math.random() < 0.5 ? 0 : rnd(0, d - 1), t = d * q + r
  return { vraag: `${getal(t)} flessen water worden verdeeld over dozen van ${d} flessen. Hoeveel volle dozen zijn dat, en hoeveel flessen blijven er over?`,
    kaal: `${getal(t)} : ${d} = … rest …`, antwoord: q, rest: r, uitleg: `Kolomsgewijs: ${d} × ${q} = ${getal(d * q)}. ${getal(t)} − ${getal(d * q)} = ${r}. Dus ${q} rest ${r}.` }
}

// Problemen met breuken: hoeveel glazen van 1/3 liter?
export const glazenBreuk = (s) => () => {
  const k = pick(s ? [3, 4, 5, 6, 8] : [2, 3, 4, 5]), heel = rnd(1, 4), half = s && Math.random() < 0.5 && k % 2 === 0
  const liter = heel + (half ? 0.5 : 0), aantal = liter * k
  return { vraag: `Een fles bevat ${half ? `${heel} 1/2` : heel} liter limonade. Hoeveel glazen van 1/${k} liter kun je ermee vullen? Je mag de getallenlijn gebruiken.`, kaal: `${half ? `${heel} 1/2` : heel} : 1/${k} =`,
    antwoord: aantal, figuur: { type: 'getallenlijn', start: 0, eind: Math.ceil(liter), waarde: liter, segs: Math.ceil(liter) * k }, uitleg: `In 1 liter passen ${k} glazen van 1/${k} liter. ${komma(liter)} × ${k} = ${aantal} glazen.` }
}

// Aanbiedingen: hoeveel procent korting, en wat is de beste koop?
export const aanbieding = (s) => () => {
  if (Math.random() < 0.6) {
    const [tekst, pct] = pick(s ? [['4 halen, 3 betalen', 25], ['4 + 1 gratis', 20], ['2e halve prijs', 25], ['2 halen, 1 betalen', 50], ['3 + 1 gratis', 25]] : [['2 halen, 1 betalen', 50], ['4 + 1 gratis', 20], ['2e halve prijs', 25], ['1 + 1 gratis', 50]])
    return { vraag: `In de winkel staat: "${tekst}". Hoeveel procent korting krijg je dan?`, kaal: `${tekst}: … % korting`, antwoord: pct, eenheid: '%', uitleg: `${tekst}: je betaalt voor ${100 - pct}% van wat je krijgt, dus ${pct}% korting.` }
  }
  const l1 = pick([1, 1.5]), l2 = 2, p1 = rnd(9, 18) / 10 * l1, p2 = rnd(9, 18) / 10 * l2
  const per1 = p1 / l1, per2 = p2 / l2
  if (Math.abs(per1 - per2) < 0.05) return aanbieding(s)()
  const a = `fles van ${komma(l1)} liter voor ${euro(rond2(p1))}`, b = `fles van ${l2} liter voor ${euro(rond2(p2))}`
  return { vraag: `Welke fles sap is naar verhouding het goedkoopst: een ${a} of een ${b}?`, kaal: `Goedkoopst per liter: ${a} of ${b}?`,
    opties: [`${komma(l1)} liter`, `${l2} liter`], antwoord: per1 < per2 ? `${komma(l1)} liter` : `${l2} liter`,
    uitleg: `Per liter: ${euro(rond2(per1))} tegen ${euro(rond2(per2))}. De fles van ${per1 < per2 ? komma(l1) : l2} liter is het goedkoopst.` }
}

// Prijs per gewicht: hoeveel kost 400 g, of wat kost 1 kg?
export const prijsGewicht = (s) => () => {
  if (s && Math.random() < 0.5) {
    const kg = pick([1.5, 2.5, 0.5, 1.2]), perKg = rnd(12, 48) / 10, tot = rond2(perKg * kg)
    return { vraag: `Op het etiket van een zak appels staat: ${komma(kg)} kg, prijs ${euro(tot)}. Hoeveel kost 1 kg appels?`, kaal: `${euro(tot)} : ${komma(kg)} =`, antwoord: perKg, eenheid: '€', uitleg: `${euro(tot)} : ${komma(kg)} = ${euro(perKg)} per kg.` }
  }
  const perKg = pick([1.5, 2, 4, 6, 8, 12, 15]), gram = pick([200, 250, 400, 500, 1500])
  if (!heleCenten(perKg * gram / 1000)) return prijsGewicht(s)()
  const p = rond2(perKg * gram / 1000)
  const wat = pick(['kaas', 'appels', 'kipfilet', 'druiven'])
  return { vraag: `De prijs van ${wat} is ${euro(perKg)} per kg. Hoeveel kost ${gram >= 1000 ? komma(gram / 1000) + ' kg' : gram + ' g'}?`, kaal: `${gram} g bij ${euro(perKg)}/kg =`,
    antwoord: p, eenheid: '€', uitleg: `${gram} g = ${komma(gram / 1000)} kg. ${komma(gram / 1000)} × ${euro(perKg)} = ${euro(p)}.` }
}

// ── groep 8 blok 5 (toets blok 6) ────────────────────────────────────────

const DEELBAAR = {
  2: [(n) => n % 2 === 0, 'het laatste cijfer even is'], 10: [(n) => n % 10 === 0, 'het eindigt op 0'],
  5: [(n) => n % 5 === 0, 'het eindigt op 0 of 5'], 4: [(n) => n % 4 === 0, 'de laatste twee cijfers deelbaar zijn door 4'],
  3: [(n) => n % 3 === 0, 'de som van de cijfers deelbaar is door 3'], 9: [(n) => n % 9 === 0, 'de som van de cijfers deelbaar is door 9'],
  8: [(n) => n % 8 === 0, 'de laatste drie cijfers deelbaar zijn door 8'],
}
export const deelbaar = (s) => () => {
  const d = pick(s ? [2, 4, 5, 10, 3, 9, 8] : [2, 4, 5, 10]), ja = Math.random() < 0.5
  let n
  do { n = ja ? d * rnd(Math.ceil(1000 / d), Math.floor(9999 / d)) : rnd(1000, 9999) } while (DEELBAAR[d][0](n) !== ja)
  return { vraag: `Er zijn ${getal(n)} knikkers. Kun je die eerlijk verdelen in groepjes van ${d}, zonder dat er iets overblijft? (Is ${n} deelbaar door ${d}?)`,
    kaal: `Is ${n} deelbaar door ${d}?`, opties: ['ja', 'nee'], antwoord: ja ? 'ja' : 'nee',
    uitleg: `Een getal is deelbaar door ${d} als ${DEELBAAR[d][1]}. ${n} is ${ja ? '' : 'niet '}deelbaar door ${d}.` }
}

// Delen met kommagetallen: € 42,70 : 7 (splitsen); S ook 3,5 : 0,5.
export const delenKommaSplits = (s) => () => {
  if (s && Math.random() < 0.4) {
    const deler = pick([0.5, 0.3, 0.25, 1.25, 3.5, 0.9]), q = rnd(2, 16), t = +(deler * q).toFixed(2)
    return { vraag: `${naam()} heeft ${komma(t)} meter lint en knipt dat in stukken van ${komma(deler)} meter. Hoeveel stukken worden het?`, kaal: `${komma(t)} : ${komma(deler)} =`,
      antwoord: q, uitleg: `Met verhoudingen: maak de deler een heel getal. ${komma(t)} : ${komma(deler)} = ${q}.` }
  }
  const d = rnd(3, 9), q = rnd(110, 999) / 100, t = +(d * q).toFixed(2)
  const kg = Math.random() < 0.5
  return { vraag: kg ? `${komma(t)} kg zand wordt eerlijk verdeeld over ${d} emmers. Hoeveel kg komt er in elke emmer?` : `${d} vrienden betalen samen ${euro(t)} voor de bioscoop. Hoeveel betaalt ieder?`,
    kaal: kg ? `${komma(t)} kg : ${d} =` : `${euro(t)} : ${d} =`, antwoord: kg ? komma(q) : q, eenheid: kg ? 'kg' : '€',
    uitleg: `Splits ${komma(t)} in ${komma(Math.floor(q) * d)} en ${komma(+(t - Math.floor(q) * d).toFixed(2))}. : ${d} geeft ${Math.floor(q)} en ${komma(+(q - Math.floor(q)).toFixed(2))}. Samen ${komma(q)}.` }
}

// Contextproblemen met procenten, breuken en verhoudingen.
export const contextProcent = (s) => () => {
  const soort = rnd(1, 3)
  if (soort === 1) {
    const tot = pick([20, 40, 60, 80, 100]), puur = tot / 2, melk = tot / 4
    return { vraag: `In een zak zitten ${tot} paaseitjes. De helft is puur, een kwart is melk en de rest is wit. Hoeveel procent van de eitjes is wit?`, kaal: `100% − 50% − 25% =`,
      antwoord: 25, eenheid: '%', uitleg: `Wit: ${tot} − ${puur} − ${melk} = ${tot - puur - melk} van de ${tot} = 25%.` }
  }
  if (soort === 2) {
    if (s) {
      const pct = pick([10, 20, 25, 40]), oud = rnd(4, 40) * 20, nieuw = oud * (100 - pct) / 100
      return Math.random() < 0.5
        ? { vraag: `Een weekend weg kost van ${euroRond(oud)} voor … met ${pct}% korting. Wat staat er op de plaats van de puntjes?`, kaal: `${euroRond(oud)} − ${pct}% =`, antwoord: nieuw, eenheid: '€', uitleg: `${pct}% van ${oud} = ${oud - nieuw}. ${oud} − ${oud - nieuw} = ${nieuw}.` }
        : { vraag: `Een vakantie kost van ${euroRond(oud)} voor ${euroRond(nieuw)}. Hoeveel procent korting is dat?`, kaal: `Van ${oud} voor ${nieuw}: … % korting`, antwoord: pct, eenheid: '%', uitleg: `Korting ${oud - nieuw} van ${oud} = ${pct}%.` }
    }
    const n = pick([4, 5, 8, 10]), k = rnd(1, n - 1), tot = n * rnd(5, 30)
    return { vraag: `Bij een optocht zijn ${tot} plaatsen. ${k}/${n} deel van de plaatsen is al geboekt. Hoeveel plaatsen zijn er nog over?`, kaal: `${tot} − ${k}/${n} van ${tot} =`,
      antwoord: tot - tot / n * k, uitleg: `${k}/${n} van ${tot} = ${tot / n * k}. ${tot} − ${tot / n * k} = ${tot - tot / n * k}.` }
  }
  const a = [rnd(20, 30), 0], b = [rnd(20, 30), 0]
  a[1] = rnd(5, a[0] - 5); b[1] = rnd(5, b[0] - 5)
  if (Math.abs(a[1] / a[0] - b[1] / b[0]) < 0.03) return contextProcent(s)()
  return { vraag: `In groep 8a zitten ${a[0]} kinderen, waarvan ${a[1]} op een sportclub. In groep 8b zitten ${b[0]} kinderen, waarvan ${b[1]} op een sportclub. In welke groep zitten naar verhouding de meeste kinderen op een sportclub?`,
    kaal: `${a[1]} van de ${a[0]} of ${b[1]} van de ${b[0]}?`, opties: ['8a', '8b'], antwoord: a[1] / a[0] > b[1] / b[0] ? '8a' : '8b',
    uitleg: `8a: ${a[1]}/${a[0]} ≈ ${Math.round(a[1] / a[0] * 100)}%. 8b: ${b[1]}/${b[0]} ≈ ${Math.round(b[1] / b[0] * 100)}%.` }
}

// Diagrammen: aflezen, trend en rekenen (staafdiagram per kwartaal of maand).
export const diagramTrend = (s) => () => {
  const labels = s ? ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun'] : ['kw 1', 'kw 2', 'kw 3', 'kw 4']
  const x = s ? 1000 : 100, items = labels.map(l => ({ label: l, waarde: rnd(2, 9) }))
  const wat = pick(['frisdrank', 'soep', 'ijsjes', 'koffie'])
  const fig = { type: 'staaf', items, step: 1, titel: `${wat} (× ${getal(x)})` }
  const soort = rnd(1, 3)
  if (soort === 1) {
    const min = items.reduce((m, i) => (i.waarde < m.waarde ? i : m))
    if (items.filter(i => i.waarde === min.waarde).length > 1) return diagramTrend(s)()
    return { vraag: `In het diagram zie je hoeveel ${wat} er werd verkocht. In welke ${s ? 'maand' : 'kwartaal'} werd de minste ${wat} verkocht?`, kaal: 'Waar is de staaf het laagst?', opties: labels, antwoord: min.label, figuur: fig, uitleg: `De laagste staaf hoort bij ${min.label}.` }
  }
  if (soort === 2) {
    const i = pick(items)
    return { vraag: `In het diagram zie je hoeveel ${wat} er werd verkocht (de getallen zijn × ${getal(x)}). Hoeveel keer werd er ${wat} verkocht in ${i.label}?`, kaal: `${i.label}: … × ${getal(x)}`, antwoord: i.waarde * x, figuur: fig, uitleg: `De staaf bij ${i.label} staat op ${i.waarde}. ${i.waarde} × ${getal(x)} = ${getal(i.waarde * x)}.` }
  }
  const tot = items.reduce((t, i) => t + i.waarde, 0)
  return { vraag: `In het diagram zie je hoeveel ${wat} er werd verkocht (× ${getal(x)}). Hoeveel was dat in totaal?`, kaal: 'Tel alle staven op.', antwoord: tot * x, figuur: fig, uitleg: `${items.map(i => i.waarde).join(' + ')} = ${tot}. ${tot} × ${getal(x)} = ${getal(tot * x)}.` }
}

// ── groep 8 blok 6 (toets blok 7) ────────────────────────────────────────

// Schaal, en omtrek en oppervlakte.
export const schaalOmtrek = (s) => () => {
  if (Math.random() < 0.6) return schaal(s)()
  const l = rnd(3, 12), b = rnd(2, l)
  return { vraag: `Een moestuin is ${l} m lang en ${b} m breed. Wat is de oppervlakte en wat is de omtrek?`, kaal: `${l} m bij ${b} m: oppervlakte en omtrek?`,
    antwoord: l * b, rest: 2 * (l + b), antwLabel: 'Oppervlakte (m²)', restLabel: 'm omtrek', toon: `${l * b} m² en omtrek ${2 * (l + b)} m`,
    figuur: { type: 'rechthoek', l, b, eenheid: 'm' }, uitleg: `Oppervlakte ${l} × ${b} = ${l * b} m². Omtrek ${l} + ${b} + ${l} + ${b} = ${2 * (l + b)} m.` }
}

// Inhoud van een balk en hoeveel blokken erin passen.
export const inhoudBlokken = (s) => () => {
  const bl = s ? pick([[2, 2, 1], [3, 1, 1], [2, 1, 1]]) : [1, 1, 1]
  const l = bl[0] * rnd(1, 4), b = bl[1] * rnd(1, 4), h = bl[2] * rnd(1, 4)
  if (Math.random() < 0.5 || !s) {
    return { vraag: `Een doos is ${l} dm lang, ${b} dm breed en ${h} dm hoog. Hoeveel blokken van 1 dm³ passen erin?`, kaal: `${l} × ${b} × ${h} =`,
      antwoord: l * b * h, eenheid: 'dm³', figuur: { type: 'balk', l, b, h, eenheid: 'dm' }, uitleg: `${l} × ${b} × ${h} = ${l * b * h} dm³, dus ${l * b * h} blokken.` }
  }
  const n = (l / bl[0]) * (b / bl[1]) * (h / bl[2])
  return { vraag: `Een doos is ${l} dm lang, ${b} dm breed en ${h} dm hoog. Hoeveel blokken van ${bl[0]} bij ${bl[1]} bij ${bl[2]} dm passen erin?`, kaal: `(${l} × ${b} × ${h}) : (${bl.join(' × ')}) =`,
    antwoord: n, figuur: { type: 'balk', l, b, h, eenheid: 'dm' }, uitleg: `Inhoud doos ${l * b * h} dm³, een blok ${bl[0] * bl[1] * bl[2]} dm³. ${l * b * h} : ${bl[0] * bl[1] * bl[2]} = ${n} blokken.` }
}

// ── groep 8 blok 7 (toets blok 8) ────────────────────────────────────────

// Percentages, breuken en verhoudingen; korting (F) en wat staat onder de vlek (S).
export const procentKorting = (s) => () => {
  if (Math.random() < 0.4) return pctVerhouding(false)()
  const pct = pick([10, 20, 25, 50]), oud = rnd(3, 40) * 20, nieuw = oud * (100 - pct) / 100
  const ding = pick(['fiets', 'telefoon', 'grasmaaier', 'tent'])
  if (s && Math.random() < 0.5) return { vraag: `Een ${ding} kostte ${euroRond(oud)} en kost nu ${euroRond(nieuw)}. Hoeveel procent korting krijg je?`, kaal: `Van ${oud} voor ${nieuw}: … %`, antwoord: pct, eenheid: '%', uitleg: `Korting ${oud - nieuw} van ${oud} = ${pct}%.` }
  return { vraag: `Een ${ding} kost ${euroRond(oud)}. Je krijgt ${pct}% korting. Hoeveel kost de ${ding} nu?`, kaal: `${euroRond(oud)} − ${pct}% =`, antwoord: nieuw, eenheid: '€', uitleg: `${pct}% van ${oud} = ${oud - nieuw}. ${oud} − ${oud - nieuw} = ${nieuw}.` }
}

// Breuken optellen en aftrekken (S ongelijknamig) en een deel van een afstand.
export const breukenOptellen = (s) => () => {
  if (Math.random() < 0.35) {
    const n = pick([3, 4, 5, 6]), k = rnd(1, n - 1), tot = n * rnd(4, 15)
    const nm = naam()
    return { vraag: `${nm} fietst in totaal ${tot} km. ${nm} heeft al ${k}/${n} deel gefietst. Hoeveel km is dat?`, kaal: `${k}/${n} van ${tot} =`, antwoord: tot / n * k, eenheid: 'km', uitleg: `1/${n} van ${tot} = ${tot / n}. ${k}/${n} = ${tot / n * k} km.` }
  }
  const paren = s ? [[2, 3], [3, 4], [4, 6], [6, 8], [5, 10], [3, 5], [4, 5], [3, 8], [6, 4]] : [[2, 4], [4, 8], [5, 10], [3, 6], [2, 8], [8, 4], [10, 5]]
  const [n1, n2] = pick(paren), t1 = rnd(1, n1 - 1), t2 = rnd(1, n2 - 1)
  const plus = Math.random() < 0.5 || t1 / n1 <= t2 / n2
  const kgv = n1 * n2 / ggd(n1, n2), uitT = plus ? t1 * kgv / n1 + t2 * kgv / n2 : t1 * kgv / n1 - t2 * kgv / n2
  const nm = naam()
  return plus
    ? { vraag: `${nm} drinkt 's ochtends ${t1}/${n1} liter water en 's middags ${t2}/${n2} liter. Hoeveel liter is dat samen?`, kaal: `${t1}/${n1} + ${t2}/${n2} =`, antwoord: breuk(uitT, kgv), eenheid: 'liter', uitleg: `Gelijknamig maken: ${t1 * kgv / n1}/${kgv} + ${t2 * kgv / n2}/${kgv} = ${uitT}/${kgv} = ${breuk(uitT, kgv)}.` }
    : { vraag: `In een kan zit ${t1}/${n1} liter water. ${nm} giet er ${t2}/${n2} liter uit. Hoeveel liter zit er nog in de kan?`, kaal: `${t1}/${n1} − ${t2}/${n2} =`, antwoord: breuk(uitT, kgv), eenheid: 'liter', uitleg: `Gelijknamig maken: ${t1 * kgv / n1}/${kgv} − ${t2 * kgv / n2}/${kgv} = ${uitT}/${kgv} = ${breuk(uitT, kgv)}.` }
}

// ── groep 8 blok 8 (toets blok 9) ────────────────────────────────────────

// Getallen tot in de miljarden: schrijven en op de getallenlijn.
export const miljarden = (s) => () => {
  const soort = rnd(1, 3)
  if (soort === 1) {
    const [tekst, waarde] = pick(s
      ? [['een half miljard', 5e8], ['driekwart miljoen', 75e4], ['anderhalf duizend', 1500], ['een kwart miljard', 25e7], [`${komma(7.75)} miljard`, 775e7]]
      : [[`${komma(42.5)} miljard`, 425e8], [`${komma(24.8)} miljard`, 248e8], [`${komma(90.4)} miljoen`, 904e5], [`${komma(13.8)} duizend`, 13800], [`${komma(207.9)} miljoen`, 2079e5]])
    return { vraag: `In een krant staat: "${tekst} mensen keken naar de finale." Schrijf dat getal in cijfers.`, kaal: `${tekst} = … (in cijfers)`, antwoord: waarde, uitleg: `${tekst} = ${getal(waarde)}.` }
  }
  if (soort === 2) {
    const x = rnd(101, 9999) / 100
    return { vraag: `Een bedrijf verdiende ${getal(Math.round(x * 1e9))} euro. Schrijf dat als kommagetal in miljarden.`, kaal: `${getal(Math.round(x * 1e9))} = … miljard`, antwoord: komma(x), uitleg: `${getal(Math.round(x * 1e9))} = ${komma(x)} miljard.` }
  }
  const start = rnd(2, 6) * 1e6, i = rnd(1, 9), waarde = start + i * 1e5
  return { vraag: `Op de getallenlijn van ${getal(start)} tot ${getal(start + 1e6)} staat een pijl. Welk getal hoort bij de pijl?`, kaal: 'Welk getal hoort bij de pijl?', antwoord: waarde,
    figuur: { type: 'getallenlijn', start, eind: start + 1e6, waarde, segs: 10 }, uitleg: `10 stappen van 100.000. De pijl staat op ${getal(waarde)}.` }
}

// Het gemiddelde berekenen (in een verhaal).
export const gemiddelde = (s) => () => {
  const n = s ? rnd(4, 6) : rnd(3, 4), gem = rnd(s ? 12 : 3, s ? 45 : 30)
  const getallen = Array.from({ length: n }, () => gem)
  for (let i = 0; i < n - 1; i++) { const d = rnd(1, Math.max(2, Math.floor(gem / 3))); getallen[i] += d; getallen[i + 1] -= d }
  if (getallen.some(g => g <= 0)) return gemiddelde(s)()
  const [wat, e] = pick([['fietst', 'km'], ['loopt', 'km'], ['leest', 'bladzijden'], ['verkoopt', 'armbandjes']])
  const nm = naam()
  return { vraag: `${nm} ${wat} ${n} dagen achter elkaar: ${getallen.join(', ')} ${e}. Hoeveel ${e} is dat gemiddeld per dag?`, kaal: `(${getallen.join(' + ')}) : ${n} =`,
    antwoord: gem, eenheid: e === 'km' ? 'km' : undefined, uitleg: `Optelsom: ${getallen.join(' + ')} = ${gem * n}. Deelsom: ${gem * n} : ${n} = ${gem}.` }
}

// ── groep 8 blok 9 (toets blok 10) ───────────────────────────────────────

// Hoofdrekenen met benoemde (S ook onbenoemde) kommagetallen.
export const kommaHoofdrekenen = (s) => () => {
  const soort = rnd(1, 4)
  if (soort === 1 || soort === 2) {
    const d = s ? pick([1, 2, 3]) : 1, f = 10 ** d
    const a = rnd(1 * f, 18 * f) / f, b = rnd(1, 9 * f) / f, plus = soort === 1 || a <= b
    const uit = +(plus ? a + b : a - b).toFixed(d)
    return { vraag: plus ? `${naam()} koopt ${komma(a, d)} kg appels en ${komma(b, d)} kg peren. Hoeveel kg fruit is dat samen?` : `Een zak weegt ${komma(a, d)} kg. Er gaat ${komma(b, d)} kg uit. Hoeveel kg zit er nog in?`,
      kaal: `${komma(a, d)} ${plus ? '+' : '−'} ${komma(b, d)} =`, antwoord: komma(uit, d), eenheid: 'kg', uitleg: `${komma(a, d)} ${plus ? '+' : '−'} ${komma(b, d)} = ${komma(uit, d)}.` }
  }
  if (soort === 3) {
    const n = rnd(2, 9), p = rnd(110, 990) / 100, rondp = Math.round(p * 4) / 4
    return { vraag: `Een kaartje voor het zwembad kost ${euro(rondp)}. ${naam()} koopt er ${n}. Hoeveel moet er betaald worden?`, kaal: `${n} × ${euro(rondp)} =`, antwoord: rond2(n * rondp), eenheid: '€', uitleg: `${n} × ${euro(rondp)} = ${euro(rond2(n * rondp))}.` }
  }
  const d = rnd(3, 9), q = rnd(401, 999) / 100, t = rond2(d * q)
  return { vraag: `${d} vriendinnen betalen samen ${euro(t)} voor een cadeau. Hoeveel betaalt ieder?`, kaal: `${euro(t)} : ${d} =`, antwoord: q, eenheid: '€', uitleg: `${euro(t)} : ${d} = ${euro(q)}.` }
}

// ── Koppeling aan de doelen ──────────────────────────────────────────────
// Per blok de toetsvorm per doel (volgorde = volgorde van de doelen in
// redactiesommen.js); null = dat doel wordt niet zo getoetst.

export const toetsGroep7 = (s) => ({
  10: [schattenContext(s), oppervlakteKomma(s), breukKommaPct(s), tijdAfstand(s)],
})

export const toetsGroep8 = (s) => ({
  1: [volgorde(s), prijsPerKilo(s), kortingTotaal(s), tijdzone(s)],
  // Doel 2 (kommagetallen optellen en aftrekken) wordt in toets 3 als breuken
  // optellen gevraagd; dat past niet bij het doel, dus geen toetsvorm.
  2: [groteGetallen(s), null, pctVerhouding(s), schaal(s)],
  3: [schattenContext(s), breukKeer(s), procentRekenen(s), gewichtPrijs(s)],
  4: [cijferenKeerDeel(s), glazenBreuk(s), aanbieding(s), prijsGewicht(s)],
  5: [deelbaar(s), delenKommaSplits(s), contextProcent(s), diagramTrend(s)],
  6: [schaalOmtrek(s), inhoudBlokken(s), null, null],
  7: [procentKorting(s), breukenOptellen(s), null, null],
  8: [miljarden(s), gemiddelde(s), null, null],
  9: [kommaHoofdrekenen(s), volgorde(s), null, null],
})
