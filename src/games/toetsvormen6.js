// Toetsvormen groep 6 (Pluspunt), plus de laatste doelen van groep 5.
//
// Elke generator vraagt een doel zoals de Pluspunt-toets het doet: dezelfde
// soort som, dezelfde antwoordvorm en getallen van dezelfde grootte. Waar de
// toets een kale som geeft ("Reken handig", "Splits en reken uit") staat hier
// een verhaaltje met precies zo'n som erin; `kaal` is de som zelf.
//
// Let op de verschuiving: toets blok N toetst de doelen van blok N − 1. Toets
// blok 1 van groep 6 gaat dus over groep 5 blok 10 (en de kalender uit groep 5
// blok 7, want daar hoort die vraag bij). Groep 6 heeft één toets voor FS en
// S+, behalve in blok 1; daar verschillen F en S alleen in vraag 2.
//
// Geen enkele opgave uit het toetsboekje: verhaaltjes, namen en getallen zijn
// eigen en worden elke keer nieuw gemaakt.

import { rnd, pick, naam, getal, komma, euroRond, breuk, keuze } from './toetsHulp.js'

const PAD = (n) => String(n).padStart(2, '0')
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
const DAGEN = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
const datumTekst = (d) => `${d.getDate()} ${MAANDEN[d.getMonth()]}`
const plusDagen = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

// ── groep 5 blok 10 (toets groep 6 blok 1) ───────────────────────────────

// Reken handig: zet een boogje om de twee getallen die samen rond zijn.
export function handigLang() {
  const nm = naam()
  const soort = rnd(1, 4)
  if (soort === 1) { // 225 + 134 + 175: eerste en laatste samen een rond honderdtal
    const a = rnd(11, 39) * 5, c = rnd(3, 5) * 100 - a, b = rnd(101, 199)
    return { vraag: `In de bieb staan ${a} leesboeken, ${b} prentenboeken en ${c} strips. Hoeveel boeken zijn dat samen?`,
      kaal: `${a} + ${b} + ${c} =`, antwoord: a + b + c,
      uitleg: `Zet een boogje: ${a} + ${c} = ${a + c}. Dan ${a + c} + ${b} = ${a + b + c}.` }
  }
  if (soort === 2) { // 763 − 145 − 55: de twee aftrekgetallen samen rond
    const b = rnd(105, 195), c = 200 - b, a = rnd(55, 95) * 10 + rnd(1, 9)
    return { vraag: `${nm} spaart ${a} punten. Hij ruilt er ${b} in voor een bal en ${c} voor een pet. Hoeveel punten heeft hij nog?`,
      kaal: `${a} − ${b} − ${c} =`, antwoord: a - b - c,
      uitleg: `Zet een boogje: ${b} + ${c} = 200. ${a} − 200 = ${a - 200}.` }
  }
  if (soort === 3) { // 472 + 199 − 99: erbij en eraf scheelt een rond honderdtal
    const k = rnd(1, 3), c = pick([99, 98, 95]), b = c + k * 100, a = rnd(150, 600 - k * 100)
    return { vraag: `Er zitten ${a} knikkers in een pot. ${nm} doet er ${b} bij en haalt er daarna ${c} uit. Hoeveel knikkers zitten er nu in de pot?`,
      kaal: `${a} + ${b} − ${c} =`, antwoord: a + b - c,
      uitleg: `Zet een boogje: + ${b} − ${c} is samen + ${k * 100}. ${a} + ${k * 100} = ${a + k * 100}.` }
  }
  // 350 − 80 − 50: eerst het getal dat rond maakt
  const a = rnd(25, 85) * 10 + 50, c = 50, b = rnd(2, 9) * 10
  return { vraag: `Bij de film zijn ${a} stoelen. ${b} stoelen zijn kapot en ${c} stoelen zijn gereserveerd. Hoeveel stoelen zijn er nog vrij?`,
    kaal: `${a} − ${b} − ${c} =`, antwoord: a - b - c,
    uitleg: `Zet een boogje: ${a} − ${c} = ${a - c}. Dan ${a - c} − ${b} = ${a - b - c}.` }
}

// Halveren en verdubbelen: 8 × 15 = 4 × 30.
export function halverenVerdubbelen() {
  const a = pick([4, 6, 8, 12, 14, 16]), b = pick([15, 25, 35, 45])
  const ding = pick([['doosjes', 'stiften'], ['zakjes', 'snoepjes'], ['rijen', 'stoelen'], ['vellen', 'stickers']])
  return { vraag: `Er zijn ${a} ${ding[0]} met elk ${b} ${ding[1]}. Hoeveel ${ding[1]} zijn dat samen?`,
    kaal: `${a} × ${b} =`, antwoord: a * b,
    uitleg: `Halveren en verdubbelen: ${a} × ${b} = ${a / 2} × ${b * 2} = ${a * b}.` }
}

// Splits en reken uit: 87 : 3, 184 : 8 (splitsdakje).
export function deelSplitsen2() {
  const d = rnd(3, 9), q = rnd(12, Math.min(29, Math.floor(200 / d))), t = d * q
  const tien = Math.floor(q / 10) * 10
  const nm = naam()
  return { vraag: `${nm} verdeelt ${t} kaartjes eerlijk over ${d} stapeltjes. Hoeveel kaartjes komen er op elk stapeltje?`,
    kaal: `${t} : ${d} =`, antwoord: q,
    uitleg: `Splits ${t} in ${d * tien} en ${t - d * tien}. ${d * tien} : ${d} = ${tien} en ${t - d * tien} : ${d} = ${q - tien}. Samen ${q}.` }
}

// ── groep 5 blok 7 (kalendervraag uit toets groep 6 blok 1) ──────────────

export function kalenderDatum() {
  const jaar = 2026
  const soort = rnd(1, 4)
  const nm = naam()
  let start, doel, tekst, uitleg, kaal
  if (soort === 1) {
    start = new Date(jaar, rnd(3, 8), rnd(20, 28)); doel = plusDagen(start, 7)
    tekst = `Het is ${datumTekst(start)}. ${nm} is over precies 1 week jarig. Op welke datum is ${nm} jarig?`
    uitleg = `1 week = 7 dagen. ${datumTekst(start)} + 7 dagen = ${datumTekst(doel)}.`; kaal = `${datumTekst(start)} + 1 week =`
  } else if (soort === 2) {
    start = new Date(jaar, rnd(3, 8), rnd(3, 13)); doel = plusDagen(start, -14)
    tekst = `Het is ${datumTekst(start)}. Precies 2 weken geleden was ${nm} jarig. Op welke datum was dat?`
    uitleg = `2 weken = 14 dagen. ${datumTekst(start)} − 14 dagen = ${datumTekst(doel)}.`; kaal = `${datumTekst(start)} − 2 weken =`
  } else if (soort === 3) {
    const m = rnd(0, 10)
    start = new Date(jaar, m + 1, 0); doel = plusDagen(start, 2)
    tekst = `Het is ${datumTekst(start)}, de laatste dag van de maand. Welke datum is het overmorgen?`
    uitleg = `${MAANDEN[m]} heeft ${start.getDate()} dagen. Morgen is het 1 ${MAANDEN[m + 1]}, overmorgen ${datumTekst(doel)}.`; kaal = `${datumTekst(start)} + 2 dagen =`
  } else {
    start = new Date(jaar, rnd(0, 8), rnd(2, 27)); doel = new Date(jaar, start.getMonth() + 3, start.getDate())
    tekst = `Het is ${datumTekst(start)}. Welke datum is het over precies 3 maanden?`
    uitleg = `3 maanden verder: ${MAANDEN[start.getMonth()]} → ${MAANDEN[doel.getMonth()]}. Het wordt ${datumTekst(doel)}.`; kaal = `${datumTekst(start)} + 3 maanden =`
  }
  const goed = datumTekst(doel)
  const fout = [plusDagen(doel, 1), plusDagen(doel, -1), plusDagen(doel, 7), plusDagen(doel, -7)].map(datumTekst)
  return { vraag: tekst, kaal, opties: keuze(goed, fout),
    antwoord: goed, uitleg: `${uitleg} Dat is een ${DAGEN[doel.getDay()]}.` }
}

// ── groep 6 blok 1 (toets blok 2) ────────────────────────────────────────

// Hoeveel is het cijfer waard, en getallen samenstellen (600 + 5000 + 50 + 3).
export function waardeCijfer() {
  if (Math.random() < 0.5) {
    const n = rnd(1000, 9999), s = String(n), plek = rnd(0, 3)
    if (s[plek] === '0') return waardeCijfer()
    const waarde = Number(s[plek]) * 10 ** (3 - plek)
    return { vraag: `Op het scorebord van de flipperkast staat ${s} punten. Hoeveel is de ${s[plek]} op de ${['eerste', 'tweede', 'derde', 'vierde'][plek]} plek waard?`,
      kaal: `Hoeveel is de ${s[plek]} in ${s} waard?`, antwoord: waarde,
      uitleg: `De ${s[plek]} staat op de plek van de ${['duizendtallen', 'honderdtallen', 'tientallen', 'eenheden'][plek]}, dus ${waarde}.` }
  }
  const D = rnd(1, 9), H = rnd(0, 9), T = rnd(0, 9), E = rnd(1, 9)
  const delen = [[D * 1000, `${D} dozen van 1000`], [H * 100, `${H} dozen van 100`], [T * 10, `${T} zakjes van 10`], [E, `${E} losse`]].filter(([w]) => w > 0)
  const geschud = delen.sort(() => Math.random() - 0.5)
  return { vraag: `In het magazijn liggen knopen: ${geschud.map(([, t]) => t).join(', ')}. Hoeveel knopen zijn dat samen?`,
    kaal: `${geschud.map(([w]) => w).join(' + ')} =`, antwoord: D * 1000 + H * 100 + T * 10 + E,
    uitleg: `Zet ze op volgorde: ${delen.sort((a, b) => b[0] - a[0]).map(([w]) => w).join(' + ')} = ${getal(D * 1000 + H * 100 + T * 10 + E)}.` }
}

// Reken met de kleine som: 7300 + 1600, 5400 − 800, 3 × 900, 4500 : 5.
export function kleineSom() {
  const soort = rnd(1, 4)
  if (soort === 1) {
    const a = rnd(21, 69), b = rnd(11, 89 - a)
    return { vraag: `Op zaterdag kwamen er ${getal(a * 100)} mensen naar de kermis, op zondag ${getal(b * 100)}. Hoeveel mensen waren dat samen?`,
      kaal: `${getal(a * 100)} + ${getal(b * 100)} =`, antwoord: (a + b) * 100, uitleg: `Kleine som: ${a} + ${b} = ${a + b}, dus ${getal((a + b) * 100)}.` }
  }
  if (soort === 2) {
    const a = rnd(31, 89), b = rnd(5, a - 10)
    return { vraag: `Er werden ${getal(a * 100)} loten gedrukt. Er zijn er al ${getal(b * 100)} verkocht. Hoeveel loten zijn er nog over?`,
      kaal: `${getal(a * 100)} − ${getal(b * 100)} =`, antwoord: (a - b) * 100, uitleg: `Kleine som: ${a} − ${b} = ${a - b}, dus ${getal((a - b) * 100)}.` }
  }
  const x = rnd(3, 9), y = rnd(3, 9)
  if (soort === 3) {
    return { vraag: `Een vrachtwagen brengt ${x} pallets met elk ${y * 100} flessen. Hoeveel flessen zijn dat?`,
      kaal: `${x} × ${y * 100} =`, antwoord: x * y * 100, uitleg: `Kleine som: ${x} × ${y} = ${x * y}, dus ${getal(x * y * 100)}.` }
  }
  return { vraag: `${getal(x * y * 100)} flyers worden eerlijk verdeeld over ${x} wijken. Hoeveel flyers krijgt elke wijk?`,
    kaal: `${getal(x * y * 100)} : ${x} =`, antwoord: y * 100, uitleg: `Kleine som: ${x * y} : ${x} = ${y}, dus ${y * 100}.` }
}

// Welke breuk hoort erbij? 1 stuk is 1/6 taart.
export function breukStuk() {
  const n = pick([2, 3, 4, 5, 6, 8])
  const ding = pick(['taart', 'pizza', 'reep chocola', 'pannenkoek'])
  return { vraag: `Een ${ding} wordt in ${n} gelijke stukken gesneden. Welk deel van de ${ding} is 1 stuk?`,
    kaal: `1 van de ${n} gelijke stukken is … deel`, antwoord: `1/${n}`,
    uitleg: `${n} gelijke stukken: elk stuk is 1/${n} deel.` }
}

// Klok op de minuut: "3 minuten voor half 11" → 10:27.
export function klokMinuut() {
  const h = rnd(2, 11), m = rnd(1, 13), soort = rnd(1, 4)
  let tekst, H, M
  if (soort === 1) { tekst = `${m} minuten over ${h}`; H = h; M = m }
  else if (soort === 2) { tekst = `${m} minuten voor half ${h}`; H = h - 1; M = 30 - m }
  else if (soort === 3) { tekst = `${m} minuten over half ${h}`; H = h - 1; M = 30 + m }
  else { tekst = `${m} minuten voor ${h}`; H = h - 1; M = 60 - m }
  const wat = pick(['De bus vertrekt', 'De film begint', 'De training start', 'De pauze is'])
  return { vraag: `${wat} om ${tekst}. Hoe laat is dat op een digitale klok? Schrijf het zo: 7:25`,
    kaal: `Het is ${tekst}. Schrijf de tijd zo: 7:25`, antwoordType: 'tijd', tijdH: H, tijdM: M, antwoord: `${H}:${PAD(M)}`,
    uitleg: `${tekst} = ${H}:${PAD(M)}.` }
}

// ── groep 6 blok 2 (toets blok 3) ────────────────────────────────────────

// Tellen met sprongen van 1, 10, 100 en 1000, en getallen op de getallenlijn.
export function tellenTot10000() {
  if (Math.random() < 0.6) {
    const stap = pick([1, 10, 100, 1000]), n = rnd(2, 4), terug = Math.random() < 0.35
    const start = terug ? rnd(1200 + stap * n, 9999) : rnd(100, 9999 - stap * n)
    const eind = terug ? start - stap * n : start + stap * n
    return { vraag: terug
      ? `De teller van een kaartjesautomaat staat op ${start}. ${naam()} telt terug met sprongen van ${stap}. Wat staat er na ${n} sprongen?`
      : `De kilometerteller van de fiets staat op ${start}. Elke dag komt er ${stap} km bij. Wat staat er na ${n} dagen op de teller?`,
      kaal: `${start} ${terug ? '−' : '+'} ${n} × ${stap} =`, antwoord: eind,
      uitleg: `${n} sprongen van ${stap}: ${Array.from({ length: n + 1 }, (_, i) => start + (terug ? -1 : 1) * stap * i).join(' – ')}.` }
  }
  const start = rnd(2, 6) * 1000, segs = 10, i = rnd(1, 9), waarde = start + i * 200
  return { vraag: `Op de getallenlijn van ${getal(start)} tot ${getal(start + 2000)} staat een pijl. Welk getal hoort bij de pijl?`,
    kaal: 'Welk getal hoort bij de pijl?', antwoord: waarde,
    figuur: { type: 'getallenlijn', start, eind: start + 2000, waarde, segs },
    uitleg: `${segs} stappen van 200. De pijl staat op ${getal(waarde)}.` }
}

// Kolomsgewijs optellen: 346 + 135 (honderdtallen, tientallen, eenheden).
export function kolomOptellen() {
  const a = rnd(210, 599), b = rnd(110, 899 - a)
  const ha = Math.floor(a / 100) * 100, hb = Math.floor(b / 100) * 100
  const ta = Math.floor((a % 100) / 10) * 10, tb = Math.floor((b % 100) / 10) * 10
  const nm = naam()
  return { vraag: `${nm} spaart ${a} stickers. Op de verjaardag krijgt ${nm} er ${b} bij. Hoeveel stickers heeft ${nm} nu?`,
    kaal: `${a} + ${b} = (kolomsgewijs)`, antwoord: a + b,
    uitleg: `Kolomsgewijs: ${ha} + ${hb} = ${ha + hb}, ${ta} + ${tb} = ${ta + tb}, ${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}. Samen ${a + b}.` }
}

// Welk deel is gekleurd (of opgegeten)?
export function deelGekleurd() {
  const n = pick([3, 4, 5, 6]), k = rnd(1, n - 1)
  const [ding, stuk] = pick([['chocoladereep', 'stukjes'], ['taart', 'punten'], ['vlag', 'banen'], ['plank', 'gelijke stukken']])
  const wat = ding === 'vlag' ? 'gekleurd' : ding === 'plank' ? 'geverfd' : 'opgegeten'
  return { vraag: `Een ${ding} heeft ${n} ${stuk}. Er ${k === 1 ? 'is' : 'zijn'} er ${k} ${wat}. Welk deel van de ${ding} is ${wat}?`,
    kaal: `${k} van de ${n} stukken = … deel`, antwoord: `${k}/${n}`,
    uitleg: `${k} van de ${n} gelijke stukken is ${k}/${n} deel.` }
}

// Route op de kaart: hokjes tellen keer de afstand per hokje.
export function routeKaart() {
  const per = pick([10, 20, 50, 100]), a = rnd(2, 7), b = rnd(1, 6), nm = naam()
  return { vraag: `Op de plattegrond is elk hokje ${per} meter. ${nm} loopt ${a} hokjes naar rechts en dan ${b} hokjes omhoog. Hoeveel meter loopt ${nm}?`,
    kaal: `(${a} + ${b}) hokjes van ${per} m =`, antwoord: (a + b) * per, eenheid: 'm',
    uitleg: `${a} + ${b} = ${a + b} hokjes. ${a + b} × ${per} m = ${(a + b) * per} m.` }
}

// ── groep 6 blok 3 (toets blok 4) ────────────────────────────────────────

// Afronden en schatten: 578 → 580; 3959 + 2210 is ongeveer 6000.
export function afrondenSchatten() {
  const soort = rnd(1, 3)
  if (soort === 1) {
    const n = rnd(101, 989), op = n % 10 === 0 ? 100 : pick([10, 100])
    const r = Math.round(n / op) * op
    return { vraag: `Bij de sportdag waren ${n} kinderen. Rond dat af op ${op === 10 ? 'tientallen' : 'honderdtallen'}.`,
      kaal: `Rond ${n} af op ${op === 10 ? 'tientallen' : 'honderdtallen'}.`, antwoord: r,
      uitleg: `${n} ligt dichter bij ${r} dan bij ${r + (n < r ? -op : op)}.` }
  }
  if (soort === 2) {
    const n = rnd(1100, 9800), r = Math.round(n / 1000) * 1000
    return { vraag: `Er kwamen ${getal(n)} mensen naar het concert. Rond dat af op duizendtallen.`,
      kaal: `Rond ${getal(n)} af op duizendtallen.`, antwoord: r, uitleg: `${getal(n)} ligt het dichtst bij ${getal(r)}.` }
  }
  const a = rnd(1, 6) * 1000 + rnd(-90, 220), b = rnd(1, 3) * 1000 + rnd(-90, 220)
  const r = Math.round(a / 1000) * 1000 + Math.round(b / 1000) * 1000
  return { vraag: `Op zaterdag gingen ${getal(a)} bezoekers naar de dierentuin en op zondag ${getal(b)}. Hoeveel waren het ongeveer samen?`,
    kaal: `${getal(a)} + ${getal(b)} is ongeveer…`, opties: keuze(getal(r), [r - 1000, r + 1000, r + 2000].filter(x => x > 0).map(getal)),
    antwoord: getal(r), uitleg: `${getal(a)} ≈ ${getal(Math.round(a / 1000) * 1000)} en ${getal(b)} ≈ ${getal(Math.round(b / 1000) * 1000)}. Samen ongeveer ${getal(r)}.` }
}

// Delen met splitsen: 195 : 3, 438 : 6.
export function deelSplitsen3() {
  const d = rnd(3, 8), q = rnd(21, Math.min(89, Math.floor(600 / d))), t = d * q
  const tien = Math.floor(q / 10) * 10
  return { vraag: `Er gaan ${t} leerlingen op schoolreis. Ze worden eerlijk verdeeld over ${d} bussen. Hoeveel leerlingen zitten er in elke bus?`,
    kaal: `${t} : ${d} =`, antwoord: q,
    uitleg: `Splits ${t} in ${d * tien} en ${t - d * tien}. ${d * tien} : ${d} = ${tien}, ${t - d * tien} : ${d} = ${q - tien}. Samen ${q}.` }
}

// Breuk aanvullen tot een hele, en de hele uit een deel.
export function breukAanvullen() {
  const n = pick([3, 4, 5, 6, 8]), k = rnd(1, n - 1)
  if (Math.random() < 0.5) {
    return { vraag: `Van een pizza is ${k}/${n} deel opgegeten. Welk deel van de pizza is er nog?`,
      kaal: `${k}/${n} + … = 1 hele`, antwoord: breuk(n - k, n), uitleg: `1 hele = ${n}/${n}. ${n}/${n} − ${k}/${n} = ${n - k}/${n}.` }
  }
  const stuk = pick([10, 15, 20, 25, 30])
  return { vraag: `Een stuk plank is 1/${n} deel van de hele plank. Dat stuk is ${stuk} cm. Hoe lang is de hele plank?`,
    kaal: `1/${n} deel = ${stuk} cm. Hele plank = … cm`, antwoord: stuk * n, eenheid: 'cm',
    uitleg: `De hele plank is ${n} van die stukken: ${n} × ${stuk} = ${stuk * n} cm.` }
}

// Hoe laat wordt het, en hoeveel later?
export function tijdLater() {
  const h = rnd(7, 15), m = pick([5, 10, 15, 20, 40, 45, 50])
  if (Math.random() < 0.55) {
    const du = rnd(1, 4), dm = pick([5, 20, 25, 30, 35, 40])
    const tot = h * 60 + m + du * 60 + dm, H = Math.floor(tot / 60), M = tot % 60
    return { vraag: `Het is ${h}:${PAD(m)} uur. De voetbalwedstrijd begint over ${du} uur en ${dm} minuten. Hoe laat begint de wedstrijd?`,
      kaal: `${h}:${PAD(m)} + ${du} uur en ${dm} minuten =`, antwoordType: 'tijd', tijdH: H, tijdM: M, antwoord: `${H}:${PAD(M)}`,
      uitleg: `${h}:${PAD(m)} + ${du} uur = ${h + du}:${PAD(m)}. Plus ${dm} minuten = ${H}:${PAD(M)}.` }
  }
  const du = rnd(1, 3), dm = pick([10, 20, 25, 30, 35, 50]), eind = h * 60 + m + du * 60 + dm
  return { vraag: `De bus vertrekt om ${h}:${PAD(m)} uur en komt aan om ${Math.floor(eind / 60)}:${PAD(eind % 60)} uur. Hoelang duurt de busreis?`,
    kaal: `Van ${h}:${PAD(m)} tot ${Math.floor(eind / 60)}:${PAD(eind % 60)} = … uur en … minuten`,
    antwoord: du, rest: dm, antwLabel: 'uur', restLabel: 'minuten', toon: `${du} uur en ${dm} minuten`,
    uitleg: `Van ${h}:${PAD(m)} naar ${h + du}:${PAD(m)} is ${du} uur, dan nog ${dm} minuten.` }
}

// ── groep 6 blok 4 (toets blok 5) ────────────────────────────────────────

const cijferUitleg = (a, b) => `${a} + ${b}: eenheden ${a % 10} + ${b % 10}, tientallen, honderdtallen. Samen ${a + b}.`

// Cijferend of kolomsgewijs optellen, eerst zonder of met één keer onthouden.
export function cijferOptellen() {
  let a, b
  do { a = rnd(110, 680); b = rnd(110, 980 - a) } while ((a % 10) + (b % 10) >= 10 && (a % 100) + (b % 100) >= 100)
  return { vraag: `In de schoolbieb staan ${a} boeken. Er komen er ${b} nieuwe bij. Hoeveel boeken zijn het nu?`,
    kaal: `${a} + ${b} = (cijferend of kolomsgewijs)`, antwoord: a + b, uitleg: cijferUitleg(a, b) }
}

// Optellen met meer keer onthouden: 629 + 252, 355 + 168.
export function cijferOptellenWissel() {
  let a, b
  do { a = rnd(150, 690); b = rnd(110, 980 - a) } while ((a % 10) + (b % 10) < 10 || (a % 100) + (b % 100) < 100)
  const nm = naam()
  return { vraag: `${nm} fietst op maandag ${a} meter naar de sportclub en op dinsdag ${b} meter naar een vriend. Hoeveel meter is dat samen?`,
    kaal: `${a} + ${b} = (cijferend of kolomsgewijs)`, antwoord: a + b, eenheid: 'm', uitleg: cijferUitleg(a, b) }
}

// Welke breuk hoort bij de pijl op de getallenlijn van 0 tot 1?
export function breukGetallenlijn() {
  const n = pick([2, 3, 4, 5, 6, 8, 10]), k = rnd(1, n - 1)
  return { vraag: `Een wandelroute van 1 kilometer is verdeeld in ${n} gelijke stukken. ${naam()} staat bij de pijl. Welk deel van de route is gelopen?`,
    kaal: 'Welke breuk hoort bij de pijl?', antwoord: `${k}/${n}`,
    figuur: { type: 'getallenlijn', start: 0, eind: 1, waarde: k / n, segs: n },
    uitleg: `De lijn van 0 tot 1 heeft ${n} gelijke stukken. De pijl staat na ${k} stukken: ${k}/${n}.` }
}

// Kilogram, gram, liter en milliliter: welke maat past?
const GEWICHTEN = [['een pak zout', '1000 gram', ['10 gram', '100 gram', '10 kilogram']], ['een appel', '200 gram', ['20 gram', '2 kilogram', '2 gram']],
  ['een pak suiker', '1 kilogram', ['1 gram', '100 gram', '10 kilogram']], ['een paperclip', '1 gram', ['100 gram', '1 kilogram', '10 kilogram']],
  ['een fiets', '15 kilogram', ['150 gram', '1 kilogram', '150 kilogram']], ['een zakje chips', '150 gram', ['15 gram', '15 kilogram', '1500 kilogram']]]
const INHOUDEN = [['een glas limonade', '20 centiliter', ['20 milliliter', '20 liter', '2 milliliter']], ['een emmer water', '10 liter', ['10 milliliter', '10 centiliter', '100 liter']],
  ['een theelepel', '5 milliliter', ['5 liter', '5 deciliter', '50 centiliter']], ['een pak melk', '1 liter', ['1 milliliter', '1 centiliter', '10 liter']],
  ['een flesje medicijn', '100 milliliter', ['100 liter', '10 liter', '1 milliliter']], ['een badkuip', '150 liter', ['150 milliliter', '15 deciliter', '1500 centiliter']]]
export function maatKiezen() {
  const [wat, goed, fout] = pick(Math.random() < 0.5 ? GEWICHTEN : INHOUDEN)
  const soort = GEWICHTEN.some(g => g[0] === wat) ? 'Hoeveel weegt' : 'Hoeveel past er in'
  return { vraag: `${soort} ${wat} ongeveer? Kies de maat die het beste past.`, kaal: `${wat[0].toUpperCase() + wat.slice(1)}: ongeveer …`,
    opties: keuze(goed, fout), antwoord: goed, uitleg: `${wat[0].toUpperCase() + wat.slice(1)}: ongeveer ${goed}.` }
}

// ── groep 6 blok 5 (toets blok 6) ────────────────────────────────────────

// Kolomsgewijs aftrekken met geld, zonder of met één keer wisselen.
export function kolomAftrekken() {
  let a, b
  do { a = rnd(300, 899); b = rnd(110, a - 100) } while ((a % 100) < (b % 100))
  const nm = naam()
  return { vraag: `${nm} heeft ${euroRond(a)} gespaard en koopt een tablet van ${euroRond(b)}. Hoeveel geld houdt ${nm} over?`,
    kaal: `${a} − ${b} = (kolomsgewijs)`, antwoord: a - b, eenheid: '€',
    uitleg: `Kolomsgewijs: ${Math.floor(a / 100) * 100} − ${Math.floor(b / 100) * 100} = ${(Math.floor(a / 100) - Math.floor(b / 100)) * 100}, dan de tientallen en eenheden. Samen ${a - b}.` }
}

// Aftrekken met meer wisselen: 443 − 278.
export function kolomAftrekkenWissel() {
  let a, b
  do { a = rnd(400, 899); b = rnd(150, a - 60) } while ((a % 10) >= (b % 10) || (a % 100) >= (b % 100))
  return { vraag: `Bij de sponsorloop is ${euroRond(a)} opgehaald. De klas geeft ${euroRond(b)} uit aan een schoolreis. Hoeveel geld is er nog over?`,
    kaal: `${a} − ${b} = (kolomsgewijs)`, antwoord: a - b, eenheid: '€',
    uitleg: `Hier moet je wisselen. Kolomsgewijs: honderden, tientallen en eenheden apart (ook negatief). ${a} − ${b} = ${a - b}.` }
}

// Breuken vergelijken: wat is meer?
export function breukVergelijken() {
  let a, b
  if (Math.random() < 0.5) { const n = pick([3, 4, 5, 6, 8]), t1 = rnd(1, n - 1); let t2; do { t2 = rnd(1, n - 1) } while (t2 === t1); a = [t1, n]; b = [t2, n] }
  else { const t = rnd(1, 4), n1 = rnd(t + 1, 8); let n2; do { n2 = rnd(t + 1, 8) } while (n2 === n1); a = [t, n1]; b = [t, n2] }
  const ding = pick(['liter limonade', 'pizza', 'meter lint', 'reep'])
  const groot = a[0] / a[1] > b[0] / b[1] ? a : b
  return { vraag: `Wat is meer: ${a[0]}/${a[1]} ${ding} of ${b[0]}/${b[1]} ${ding}?`, kaal: `Wat is meer: ${a[0]}/${a[1]} of ${b[0]}/${b[1]}?`,
    opties: [`${a[0]}/${a[1]}`, `${b[0]}/${b[1]}`], antwoord: `${groot[0]}/${groot[1]}`,
    uitleg: a[1] === b[1] ? `Zelfde noemer: meer stukken is meer, dus ${groot[0]}/${groot[1]}.` : `Zelfde teller: grotere stukken (kleinere noemer) is meer, dus ${groot[0]}/${groot[1]}.` }
}

// Tijd in uren, minuten en seconden.
export function tijdSeconden() {
  const soort = rnd(1, 3)
  if (soort === 1) {
    const min = rnd(61, 179), u = Math.floor(min / 60), m = min % 60
    return { vraag: `Een film duurt ${min} minuten. Hoeveel uur en minuten is dat?`, kaal: `${min} minuten = … uur en … minuten`,
      antwoord: u, rest: m, antwLabel: 'uur', restLabel: 'minuten', toon: `${u} uur en ${m} minuten`, uitleg: `${min} = ${u} × 60 + ${m}, dus ${u} uur en ${m} minuten.` }
  }
  if (soort === 2) {
    const m = rnd(1, 4), s = rnd(1, 59)
    return { vraag: `${naam()} zwemt een baan in ${m} minuten en ${s} seconden. Hoeveel seconden is dat?`, kaal: `${m} min ${s} sec = … seconden`,
      antwoord: m * 60 + s, eenheid: 'seconden', uitleg: `${m} × 60 = ${m * 60}. ${m * 60} + ${s} = ${m * 60 + s} seconden.` }
  }
  const sec = rnd(65, 299), m = Math.floor(sec / 60), s = sec % 60
  return { vraag: `Een liedje duurt ${sec} seconden. Hoeveel minuten en seconden is dat?`, kaal: `${sec} seconden = … minuten en … seconden`,
    antwoord: m, rest: s, antwLabel: 'minuten', restLabel: 'seconden', toon: `${m} minuten en ${s} seconden`, uitleg: `${sec} = ${m} × 60 + ${s}.` }
}

// ── groep 6 blok 6 (toets blok 7) ────────────────────────────────────────

// Tellen tot 100.000 met sprongen van 1000 en 10.000, en de getallenlijn.
export function tellenTot100000() {
  if (Math.random() < 0.55) {
    const stap = pick([1000, 10000, 100]), n = rnd(2, 3), start = rnd(10000, 99999 - stap * n)
    return { vraag: `Een stadion telt de bezoekers. De teller staat op ${getal(start)}. Elke wedstrijd komen er ${getal(stap)} bij. Wat staat er na ${n} wedstrijden?`,
      kaal: `${getal(start)} + ${n} × ${getal(stap)} =`, antwoord: start + n * stap,
      uitleg: `${Array.from({ length: n + 1 }, (_, i) => getal(start + stap * i)).join(' – ')}.` }
  }
  const start = rnd(1, 3) * 10000, i = rnd(1, 11), waarde = start + i * 5000
  return { vraag: `Op de getallenlijn van ${getal(start)} tot ${getal(start + 60000)} staat een pijl. Welk getal hoort bij de pijl?`,
    kaal: 'Welk getal hoort bij de pijl?', antwoord: waarde, figuur: { type: 'getallenlijn', start, eind: start + 60000, waarde, segs: 12 },
    uitleg: `12 stappen van 5000. De pijl staat op ${getal(waarde)}.` }
}

// Delen met rest en splitsen: 257 : 4 = 64 rest 1.
export function deelMetRest() {
  const d = rnd(3, 9), q = rnd(25, Math.floor(400 / d)), r = rnd(1, d - 1), t = d * q + r
  return { vraag: `${t} kaarten worden eerlijk verdeeld over ${d} kinderen. Hoeveel kaarten krijgt elk kind en hoeveel blijven er over?`,
    kaal: `${t} : ${d} = … rest …`, antwoord: q, rest: r,
    uitleg: `${d} × ${q} = ${d * q}. ${t} − ${d * q} = ${r}. Dus ${q} rest ${r}.` }
}

// Kommagetallen: tellen met tienden en schrijven met cijfers.
export function kommaTienden() {
  if (Math.random() < 0.5) {
    const start = rnd(100, 900) / 100, terug = Math.random() < 0.4, n = 3
    const eind = +(start + (terug ? -0.1 : 0.1) * n).toFixed(2)
    return { vraag: `Een teller loopt steeds een tiende ${terug ? 'terug' : 'verder'}: ${komma(start, 2)} – ${komma(+(start + (terug ? -0.1 : 0.1)).toFixed(2), 2)} – … Wat staat er na ${n} stappen?`,
      kaal: `${komma(start, 2)} ${terug ? '−' : '+'} ${n} tienden =`, antwoord: komma(eind, 2), uitleg: `Steeds 0,1 ${terug ? 'minder' : 'meer'}: na ${n} stappen ${komma(eind, 2)}.` }
  }
  const soort = rnd(1, 3), nm = naam()
  if (soort === 1) { const m = rnd(1, 9), h = rnd(11, 99); return { vraag: `${nm} springt ${m} meter en ${h} honderdste meter ver. Schrijf dat als kommagetal.`, kaal: `${m} en ${h} honderdste =`, antwoord: komma(m + h / 100, 2), eenheid: 'm', uitleg: `${h} honderdste is 0,${h}. Samen ${komma(m + h / 100, 2)} m.` } }
  if (soort === 2) { const d = rnd(101, 999); return { vraag: `Een pakje weegt ${d} duizendste kilogram. Schrijf dat als kommagetal.`, kaal: `${d} duizendste =`, antwoord: komma(d / 1000, 3), eenheid: 'kg', uitleg: `${d} duizendste = 0,${d}.` } }
  const m = rnd(1, 9), t = rnd(1, 9)
  return { vraag: `Een plank is ${m} meter en ${t} tiende meter lang. Schrijf dat als kommagetal.`, kaal: `${m} en ${t} tiende =`, antwoord: komma(m + t / 10, 1), eenheid: 'm', uitleg: `${t} tiende = 0,${t}. Samen ${komma(m + t / 10, 1)} m.` }
}

// Maten omrekenen en de omtrek in meters.
export function matenOmtrek() {
  if (Math.random() < 0.5) {
    const [van, naar, f] = pick([['dm', 'cm', 10], ['cm', 'mm', 10], ['km', 'm', 1000], ['m', 'cm', 100], ['dm', 'mm', 100]])
    const n = rnd(2, 45)
    return { vraag: `Een lint is ${n} ${van} lang. Hoeveel ${naar} is dat?`, kaal: `${n} ${van} = … ${naar}`, antwoord: n * f, eenheid: naar,
      uitleg: `1 ${van} = ${f} ${naar}. ${n} × ${f} = ${n * f} ${naar}.` }
  }
  const l = rnd(10, 30) * 5, b = rnd(6, 18) * 5, om = 2 * (l + b)
  return { vraag: `Een tafel is ${l} cm lang en ${b} cm breed. Er komt een rand omheen. Hoeveel meter is de omtrek?`,
    kaal: `Omtrek van ${l} cm bij ${b} cm = … m`, antwoord: komma(om / 100), eenheid: 'm',
    figuur: { type: 'rechthoek', l, b, eenheid: 'cm' },
    uitleg: `${l} + ${b} + ${l} + ${b} = ${om} cm = ${komma(om / 100, 2)} m.` }
}

// ── groep 6 blok 7 (toets blok 8) ────────────────────────────────────────

// Cijferend aftrekken, zonder en met één keer lenen.
export function cijferAftrekken() {
  let a, b
  do { a = rnd(400, 899); b = rnd(110, a - 100) } while ((a % 10) < (b % 10) && ((a % 100) < (b % 100)))
  return { vraag: `Een theater heeft ${a} stoelen. Er zijn ${b} kaartjes verkocht. Hoeveel stoelen zijn er nog vrij?`,
    kaal: `${a} − ${b} = (cijferend of kolomsgewijs)`, antwoord: a - b, uitleg: `${a} − ${b} = ${a - b}. Controle: ${a - b} + ${b} = ${a}.` }
}

// Cijferend aftrekken met meer lenen en met een nul: 542 − 355, 601 − 187.
export function cijferAftrekkenNul() {
  let a, b
  if (Math.random() < 0.5) { a = rnd(4, 9) * 100 + rnd(0, 9); b = rnd(110, a - 110) } // 601-achtig: nul op de tientallen
  else { do { a = rnd(400, 899); b = rnd(150, a - 60) } while ((a % 10) >= (b % 10) || (a % 100) >= (b % 100)) }
  return { vraag: `Een boer heeft ${a} appels geplukt. Hij verkoopt er ${b} op de markt. Hoeveel appels heeft hij nog?`,
    kaal: `${a} − ${b} = (cijferend of kolomsgewijs)`, antwoord: a - b, uitleg: `Hier moet je lenen. ${a} − ${b} = ${a - b}. Controle: ${a - b} + ${b} = ${a}.` }
}

// Een deel van een geheel: 1/4 van € 20, de helft van 24 kinderen.
export function deelVanGeheel() {
  if (Math.random() < 0.5) {
    const n = rnd(2, 5), p = rnd(3, 9), tot = n * p
    return { vraag: `${n} kaartjes voor de film kosten samen € ${tot},-. Hoeveel kost 1 kaartje?`, kaal: `1/${n} van € ${tot},- =`,
      antwoord: p, eenheid: '€', uitleg: `1/${n} van ${tot} = ${tot} : ${n} = ${p}.` }
  }
  const n = pick([2, 3, 4, 6]), k = rnd(1, n - 1), tot = n * rnd(3, 8)
  const hoe = pick(['lopend', 'met de fiets', 'met de bus'])
  return { vraag: `${tot} kinderen gaan naar school. ${k}/${n} deel komt ${hoe}. Hoeveel kinderen zijn dat?`, kaal: `${k}/${n} van ${tot} =`,
    antwoord: tot / n * k, uitleg: `1/${n} van ${tot} = ${tot / n}. ${k}/${n} = ${k} × ${tot / n} = ${tot / n * k}.` }
}

// Tijdbalk en datum: hoe oud, welk jaar, welke datum.
export function tijdbalkDatum() {
  const soort = rnd(1, 3), nm = naam()
  if (soort === 1) {
    const geb = rnd(1945, 1965), toen = rnd(geb + 40, 2025), mnd = rnd(0, 10)
    return { vraag: `De opa van ${nm} is geboren op 1 ${MAANDEN[mnd]} ${geb}. Op 1 ${MAANDEN[mnd + 1]} ${toen} kreeg hij een nieuwe auto. Hoe oud was hij toen?`,
      kaal: `${toen} − ${geb} =`, antwoord: toen - geb, eenheid: 'jaar', uitleg: `${toen} − ${geb} = ${toen - geb}. Hij was al jarig geweest, dus ${toen - geb} jaar.` }
  }
  if (soort === 2) {
    const jaar = rnd(2026, 2040), oud = rnd(15, 120)
    return { vraag: `In ${jaar} viert de school het ${oud}-jarig bestaan. In welk jaar is de school begonnen?`, kaal: `${jaar} − ${oud} =`,
      antwoord: jaar - oud, uitleg: `${jaar} − ${oud} = ${jaar - oud}.` }
  }
  const start = new Date(2028, 9, rnd(1, 12)), w = rnd(2, 3), doel = plusDagen(start, 7 * w)
  const goed = datumTekst(doel)
  return { vraag: `Het is ${DAGEN[start.getDay()]} ${datumTekst(start)}. Over precies ${w} weken gaat ${nm} op kamp. Op welke datum is dat?`,
    kaal: `${datumTekst(start)} + ${w} weken =`, opties: keuze(goed, [plusDagen(doel, 1), plusDagen(doel, -1), plusDagen(doel, -7)].map(datumTekst)),
    antwoord: goed, uitleg: `${w} weken = ${7 * w} dagen. ${datumTekst(start)} + ${7 * w} dagen = ${goed}.` }
}

// ── groep 6 blok 8 (toets blok 9) ────────────────────────────────────────

// Kleine som met nullen: 30 × 80, 700 × 50, 48.000 : 60, 4500 : 50.
export function kleineSomNullen() {
  const x = rnd(2, 9), y = rnd(2, 9)
  if (Math.random() < 0.5) {
    const [fa, fb] = pick([[10, 10], [10, 100], [100, 10]]), a = x * fa, b = y * fb
    return { vraag: `In een parkeergarage zijn ${a} rijen met elk ${b} plaatsen. Hoeveel parkeerplaatsen zijn dat?`, kaal: `${a} × ${b} =`,
      antwoord: a * b, uitleg: `Kleine som ${x} × ${y} = ${x * y}. Er komen ${String(fa * fb).length - 1} nullen bij: ${getal(a * b)}.` }
  }
  const deler = y * pick([10, 10, 100]), q = x * pick([10, 100]), t = deler * q
  return { vraag: `Een fabriek maakt ${getal(t)} flessen. In elke krat passen ${deler} flessen. Hoeveel kratten zijn nodig?`, kaal: `${getal(t)} : ${deler} =`,
    antwoord: q, uitleg: `Kleine som ${x * y} : ${y} = ${x}. Zet er de juiste nullen bij: ${getal(t)} : ${deler} = ${getal(q)}.` }
}

// Kolomsgewijs vermenigvuldigen: 6 × 284, 547 × 3.
export function kolomKeer() {
  const a = rnd(3, 9), b = rnd(124, 989)
  const h = Math.floor(b / 100) * 100, t = Math.floor((b % 100) / 10) * 10, e = b % 10
  return { vraag: `Een schoolbus rijdt ${a} keer per week een rit van ${b} meter. Hoeveel meter is dat per week?`, kaal: `${a} × ${b} = (kolomsgewijs)`,
    antwoord: a * b, eenheid: 'm', uitleg: `${a} × ${h} = ${a * h}, ${a} × ${t} = ${a * t}, ${a} × ${e} = ${a * e}. Samen ${getal(a * b)}.` }
}

// Kommagetallen op de getallenlijn (tienden en honderdsten).
export function kommaGetallenlijn() {
  if (Math.random() < 0.5) {
    const start = rnd(1, 4), i = rnd(1, 9), waarde = start + i / 10
    return { vraag: `Een meetlint loopt van ${start} m tot ${start + 1} m. Waar staat de pijl? Schrijf het als kommagetal.`, kaal: 'Welk kommagetal hoort bij de pijl?',
      antwoord: komma(waarde, 1), eenheid: 'm', figuur: { type: 'getallenlijn', start, eind: start + 1, waarde, segs: 10 }, uitleg: `Elk streepje is 0,1 m. De pijl staat op ${komma(waarde, 1)} m.` }
  }
  const start = rnd(10, 80) + rnd(1, 9) / 10, i = rnd(1, 9), waarde = +(start + i / 100).toFixed(2)
  return { vraag: `Bij verspringen meet de juf tussen ${komma(start, 1)} m en ${komma(+(start + 0.1).toFixed(1), 1)} m. Waar staat de pijl?`, kaal: 'Welk kommagetal hoort bij de pijl?',
    antwoord: komma(waarde, 2), eenheid: 'm', figuur: { type: 'getallenlijn', start, eind: +(start + 0.1).toFixed(1), waarde, segs: 10 }, uitleg: `Elk streepje is 0,01 m. De pijl staat op ${komma(waarde, 2)} m.` }
}

// Liter, deciliter, centiliter en milliliter, en glazen vullen.
export function inhoudOmrekenen() {
  if (Math.random() < 0.5) {
    const [van, naar, f] = pick([['dl', 'cl', 10], ['cl', 'ml', 10], ['l', 'dl', 10], ['l', 'ml', 1000], ['dl', 'ml', 100]])
    const terug = Math.random() < 0.4, n = rnd(2, 9)
    return terug
      ? { vraag: `In de fles zit ${n * f} ${naar}. Hoeveel ${van} is dat?`, kaal: `${n * f} ${naar} = … ${van}`, antwoord: n, eenheid: van, uitleg: `${f} ${naar} = 1 ${van}. ${n * f} : ${f} = ${n}.` }
      : { vraag: `In de kan zit ${n} ${van} limonade. Hoeveel ${naar} is dat?`, kaal: `${n} ${van} = … ${naar}`, antwoord: n * f, eenheid: naar, uitleg: `1 ${van} = ${f} ${naar}. ${n} × ${f} = ${n * f}.` }
  }
  const [glas, ml] = pick([['glazen van 200 ml', 200], ['bekers van 250 ml', 250], ['bekertjes van 100 ml', 100], ['glazen van 125 ml', 125]])
  const liter = pick([1, 1.5, 2]), aantal = liter * 1000 / ml
  if (!Number.isInteger(aantal)) return inhoudOmrekenen()
  return { vraag: `Een fles bevat ${komma(liter)} liter sap. Hoeveel ${glas} kun je ermee vullen?`, kaal: `${komma(liter)} l : ${ml} ml =`,
    antwoord: aantal, uitleg: `${komma(liter)} l = ${liter * 1000} ml. ${liter * 1000} : ${ml} = ${aantal}.` }
}

// ── groep 6 blok 9 (toets blok 10) ───────────────────────────────────────

// Delen met splitsen of met te veel: 116 : 4, 196 : 4 (= 50 − 1).
export function deelSplitsTeveel() {
  const d = rnd(3, 6), q = Math.random() < 0.4 ? rnd(2, 5) * 10 - 1 : rnd(21, 49), t = d * q
  return { vraag: `${t} stoelen worden in ${d} gelijke rijen gezet. Hoeveel stoelen staan er in elke rij?`, kaal: `${t} : ${d} =`, antwoord: q,
    uitleg: q % 10 === 9 ? `Met te veel: ${d} × ${q + 1} = ${d * (q + 1)}, dat is ${d} te veel. Dus ${q + 1} − 1 = ${q}.` : `Splits ${t} in ${d * Math.floor(q / 10) * 10} en ${t - d * Math.floor(q / 10) * 10}. Samen ${q}.` }
}

// Keer met splitsen, te veel of halveren en verdubbelen: 6 × 49, 5 × 96, 8 × 45.
export function keerSplitsTeveel() {
  const soort = rnd(1, 3), a = rnd(3, 9)
  let b, uitleg
  if (soort === 1) { b = rnd(3, 9) * 10 - pick([1, 2]); uitleg = `Met te veel: ${a} × ${Math.ceil(b / 10) * 10} − ${a} × ${Math.ceil(b / 10) * 10 - b} = ${a * Math.ceil(b / 10) * 10} − ${a * (Math.ceil(b / 10) * 10 - b)} = ${a * b}.` }
  else if (soort === 2) { b = rnd(31, 98); uitleg = `Splitsen: ${a} × ${b - (b % 10)} + ${a} × ${b % 10} = ${a * (b - (b % 10))} + ${a * (b % 10)} = ${a * b}.` }
  else { const p = pick([4, 6, 8]); b = pick([15, 25, 35, 45]); uitleg = `Halveren en verdubbelen: ${p} × ${b} = ${p / 2} × ${b * 2} = ${p * b}.`; return { vraag: `Er zijn ${p} tafels met elk ${b} borden. Hoeveel borden zijn dat?`, kaal: `${p} × ${b} =`, antwoord: p * b, uitleg } }
  return { vraag: `${naam()} koopt ${a} zakken met elk ${b} kralen. Hoeveel kralen zijn dat?`, kaal: `${a} × ${b} =`, antwoord: a * b, uitleg }
}

// Deel van een geheel en het geheel uit een deel.
export function deelEnGeheel() {
  if (Math.random() < 0.5) {
    const n = pick([2, 4, 5, 10]), k = rnd(1, n - 1)
    return { vraag: `Een vat kan 1000 liter bevatten. Het vat is voor ${k}/${n} deel vol. Hoeveel liter zit erin?`, kaal: `${k}/${n} van 1000 liter =`,
      antwoord: 1000 / n * k, eenheid: 'l', uitleg: `1/${n} van 1000 = ${1000 / n}. ${k}/${n} = ${k} × ${1000 / n} = ${1000 / n * k} liter.` }
  }
  const n = pick([3, 4, 5, 6]), k = rnd(1, n - 1), stuk = rnd(2, 8), deel = k * stuk
  const [wat, ww] = pick([['koekjes', 'bakken'], ['koeien', 'hebben'], ['bloemen', 'planten']])
  return { vraag: `${naam()} heeft al ${deel} ${wat}. Dat is ${k}/${n} deel van wat het moet worden. Hoeveel ${wat} wil ${pick(['ze', 'hij'])} in totaal ${ww}?`,
    kaal: `${k}/${n} deel = ${deel}. Het geheel = …`, antwoord: stuk * n,
    uitleg: `${k}/${n} deel = ${deel}, dus 1/${n} deel = ${deel} : ${k} = ${stuk}. Het geheel = ${n} × ${stuk} = ${stuk * n}.` }
}

// Omtrek en oppervlakte van een rechthoek (twee vakjes).
export function omtrekOppervlakte() {
  const cm = Math.random() < 0.6, l = rnd(2, cm ? 9 : 12), b = rnd(2, l), e = cm ? 'cm' : 'm'
  return { vraag: `${pick(cm ? ['Een tegeltje', 'Een kaartje', 'Een fotootje'] : ['Een zandbak', 'Een vloerkleed', 'Een schoolplein'])} is ${l} ${e} lang en ${b} ${e} breed. Wat is de oppervlakte en wat is de omtrek?`,
    kaal: `Rechthoek ${l} ${e} bij ${b} ${e}: oppervlakte en omtrek?`, antwoord: l * b, rest: 2 * (l + b),
    antwLabel: `Oppervlakte (${e}²)`, restLabel: `${e} omtrek`, toon: `${l * b} ${e}² en omtrek ${2 * (l + b)} ${e}`,
    figuur: { type: 'rechthoek', l, b, eenheid: e },
    uitleg: `Oppervlakte: ${l} × ${b} = ${l * b} ${e}². Omtrek: ${l} + ${b} + ${l} + ${b} = ${2 * (l + b)} ${e}.` }
}

// ── Koppeling aan de doelen ──────────────────────────────────────────────
// Per blok de toetsvorm per doel (volgorde = volgorde van de doelen in
// redactiesommen.js); null = dat doel wordt niet zo getoetst.

export const TOETS_GROEP5 = {
  7: [null, null, null, kalenderDatum],
  10: [handigLang, halverenVerdubbelen, deelSplitsen2, null],
}

export const TOETS_GROEP6 = {
  1: [waardeCijfer, kleineSom, breukStuk, klokMinuut],
  2: [tellenTot10000, kolomOptellen, deelGekleurd, routeKaart],
  3: [afrondenSchatten, deelSplitsen3, breukAanvullen, tijdLater],
  4: [cijferOptellen, cijferOptellenWissel, breukGetallenlijn, maatKiezen],
  5: [kolomAftrekken, kolomAftrekkenWissel, breukVergelijken, tijdSeconden],
  6: [tellenTot100000, deelMetRest, kommaTienden, matenOmtrek],
  7: [cijferAftrekken, cijferAftrekkenNul, deelVanGeheel, tijdbalkDatum],
  8: [kleineSomNullen, kolomKeer, kommaGetallenlijn, inhoudOmrekenen],
  9: [deelSplitsTeveel, keerSplitsTeveel, deelEnGeheel, omtrekOppervlakte],
}

// Blok 10 van groep 6 wordt getoetst in groep 7 (toetsvormen7.js).
