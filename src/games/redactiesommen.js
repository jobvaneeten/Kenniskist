// Redactie-/verhaaltjessommen generator — Groep 7 (Pluspunt FS + S+)
// Doelen afgeleid uit de Pluspunt doelenoverzichten groep 7 (blok 1 t/m 10).
// In plaats van losse sommen uittypen: per blok sjablonen die getallen,
// namen en voorwerpen invullen. Antwoord en uitleg worden berekend.

const NAMEN = ['Sem', 'Noor', 'Liam', 'Saar', 'Daan', 'Mila', 'Finn', 'Lina',
  'Bram', 'Tess', 'Luuk', 'Evi', 'Jesse', 'Fleur', 'Sam', 'Yara', 'Mees', 'Roos']
const DINGEN = [['knikker', 'knikkers'], ['sticker', 'stickers'], ['kaart', 'kaarten'],
  ['snoepje', 'snoepjes'], ['munt', 'munten'], ['kraal', 'kralen'], ['postzegel', 'postzegels']]

const rnd  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = a => a[Math.floor(Math.random() * a.length)]
const naam = () => pick(NAMEN)
const ding = () => pick(DINGEN)
const euro = n => '€ ' + n.toFixed(2).replace('.', ',')
const getal = n => n.toLocaleString('nl-NL')   // 35.400
const komma = n => String(n).replace('.', ',')

// ── Generatoren per blok. Factory zodat S+ grotere getallen krijgt. ──
function maakBlokken(plus) {
  const M = plus ? 1 : 0   // S+ = iets grotere/lastigere getallen

  return {
    1: [
      { doel: 'Je leert getallen tot en met 1 miljoen op volgorde zetten, aflezen, en schattend plaatsen en aflezen op een getallenlijn.', gen: () => getallenlijnV(rnd(0, 5) * 100000, 500000, 50000) },
      { doel: 'Je leert sommen als 35.400 + 3500 en 56.700 - 2400 uitrekenen.', gen: () => {
        const a = rnd(12, 89) * 1000 + rnd(1, 9) * 100
        const b = rnd(15, 49) * 100
        return { vraag: `Op de spaarrekening van ${naam()} staat € ${getal(a)}. Er komt € ${getal(b)} bij. Hoeveel staat er nu op de rekening?`,
                 antwoord: a + b, uitleg: `${getal(a)} + ${getal(b)} = ${getal(a + b)}` }
      }},
      { doel: 'Je leert helen uit de breuk halen.', gen: () => breukHelenV() },
      { doel: 'Je leert de tijdsduur berekenen in dagen, uren en minuten.', gen: () => {
        const h1 = rnd(8, 12), m1 = pick([0, 5, 10, 15, 20, 25, 30, 40, 45])
        const dur = rnd(2, 4) * 15 + rnd(0, 2) * 30
        const tot = h1 * 60 + m1 + dur, h2 = Math.floor(tot / 60), m2 = tot % 60
        return { vraag: `De trein vertrekt om ${h1}:${String(m1).padStart(2, '0')} uur en komt om ${h2}:${String(m2).padStart(2, '0')} uur aan. Hoeveel minuten duurt de reis?`,
                 antwoord: dur, uitleg: `Van ${h1}:${String(m1).padStart(2, '0')} tot ${h2}:${String(m2).padStart(2, '0')} = ${dur} minuten` }
      }},
    ],
    2: [
      { doel: 'Je leert sommen als 12 × 64 cijferend uitrekenen of met de strategie splitsen en je begrijpt wat je opschrijft.', gen: () => {
        const a = rnd(12, plus ? 79 : 49), b = rnd(21, 89)
        return { vraag: `In de zaal staan ${a} rijen met ${b} stoelen. Hoeveel stoelen zijn er in totaal?`,
                 antwoord: a * b, uitleg: `${a} × ${b} = ${a * b}` }
      }},
      { doel: 'Je leert sommen als 22 × 64 cijferend uitrekenen of met splitsen.', gen: () => {
        const a = rnd(21, plus ? 89 : 49), b = rnd(21, 89)
        return { vraag: `Een magazijn heeft ${a} dozen met elk ${b} flessen. Hoeveel flessen zijn er in totaal?`,
                 antwoord: a * b, uitleg: `${a} × ${b} = ${a * b}` }
      }},
      { doel: 'Je leert hoofdrekenend optellen en aftrekken met eenvoudige benoemde kommagetallen.', gen: () => {
        const p1 = rnd(150, plus ? 8000 : 3000) / 100, p2 = rnd(150, 3000) / 100
        const n = naam()
        return { vraag: `${n} koopt een boek van ${euro(p1)} en een pen van ${euro(p2)}. Hoeveel betaalt ${n} samen?`,
                 antwoord: +(p1 + p2).toFixed(2), eenheid: '€', uitleg: `${euro(p1)} + ${euro(p2)} = ${euro(p1 + p2)}` }
      }},
      { doel: 'Je leert hoe je met een schaallijntje een lengte op schaal omrekent naar een lengte in het echt.', gen: () => schaalV() },
    ],
    3: [
      { doel: 'Je leert betekenis geven aan hele grote getallen tot in de miljarden en deze in cijfers schrijven.', gen: () => getallenlijnV(rnd(0, 5) * 1000000000, 5000000000, 500000000) },
      { doel: 'Je leert cijferend of kolomsgewijs optellen en aftrekken met benoemde kommagetallen.', gen: () => {
        const prijs = rnd(500, plus ? 9000 : 4000) / 100
        const betaald = Math.ceil(prijs / 5) * 5
        return { vraag: `Iets kost ${euro(prijs)}. ${naam()} betaalt met ${euro(betaald)}. Hoeveel wisselgeld krijgt hij terug?`,
                 antwoord: +(betaald - prijs).toFixed(2), eenheid: '€', uitleg: `${euro(betaald)} − ${euro(prijs)} = ${euro(betaald - prijs)}` }
      }},
      { doel: 'Je leert welke breuken gelijkwaardig zijn.', gen: () => gelijkBreukV() },
      { doel: 'Je leert maten voor lengte vergelijken, ordenen, omrekenen en optellen met hele getallen.', gen: () => {
        const km = rnd(2, plus ? 25 : 9), m = rnd(50, 950)
        return { vraag: `Een route is ${km} km en ${m} m lang. Hoeveel meter is de route in totaal?`,
                 antwoord: km * 1000 + m, eenheid: 'm', uitleg: `${km} km = ${getal(km * 1000)} m. ${getal(km * 1000)} + ${m} = ${getal(km * 1000 + m)} m` }
      }},
    ],
    4: [
      { doel: 'Je leert hoe je sommen met een rekenmachine kunt uitrekenen, waarbij je eerst een passende schatting maakt.', gen: () => schattenV() },
      { doel: 'Je leert eenvoudige breuken omzetten in kommagetallen en omgekeerd.', gen: () => breukKommaV() },
      { doel: 'Je leert percentages aan breuken koppelen en uitrekenen (met behulp van breuken).', gen: () => {
        const p = pick([10, 25, 50, 75]), per = 100 / p
        const n = Math.round(rnd(2, plus ? 9 : 6)) * per
        return { vraag: `In de klas zitten ${n} kinderen. ${p}% draagt een bril. Hoeveel kinderen dragen een bril?`,
                 antwoord: n * p / 100, uitleg: `${p}% van ${n} = ${n} ÷ ${per} = ${n * p / 100}` }
      }},
      { doel: 'Je leert de gemiddelde snelheid uitrekenen in kilometer per uur.', gen: () => {
        const v = pick([60, 70, 80, 90, 100, 120]), t = rnd(2, plus ? 6 : 4)
        return { vraag: `Een auto rijdt ${v * t} km in ${t} uur. Wat is de gemiddelde snelheid in km per uur?`,
                 antwoord: v, eenheid: 'km/u', uitleg: `${v * t} km ÷ ${t} uur = ${v} km/u` }
      }},
    ],
    5: [
      { doel: 'Je leert kolomsgewijs delen bij sommen als 357 : 17, in maximaal 2 stappen.', gen: () => deelV(rnd(12, 19), rnd(11, plus ? 39 : 25)) },
      { doel: 'Je leert kolomsgewijs delen bij sommen als 3732 : 23 (met rest) in maximaal 3 stappen.', gen: () => {
        const deler = rnd(13, 29), quo = rnd(15, plus ? 99 : 49), rest = rnd(1, deler - 1)
        const totaal = deler * quo + rest, d = ding()
        return { vraag: `Er zijn ${totaal} ${d[1]}. Ze gaan in zakjes van ${deler}. Hoeveel volle zakjes kun je maken en hoeveel blijven er over?`,
                 antwoord: quo, rest, uitleg: `${totaal} ÷ ${deler} = ${quo} (rest ${rest}) → ${quo} volle zakjes, ${rest} over` }
      }},
      { doel: 'Je leert rekenen met verhoudingen met een verhoudingstabel.', gen: () => {
        const n = rnd(3, 8), stuk = rnd(40, 250) / 100, tot = +(n * stuk).toFixed(2)
        return { vraag: `${n} dezelfde pennen kosten samen ${euro(tot)}. Hoeveel kost 1 pen?`,
                 antwoord: +stuk.toFixed(2), eenheid: '€', uitleg: `${euro(tot)} ÷ ${n} = ${euro(stuk)}` }
      }},
      { doel: 'Je leert de oppervlakte berekenen van rechthoeken met maten in cm, dm of m.', gen: () => {
        const l = rnd(3, plus ? 25 : 12), b = rnd(2, plus ? 18 : 9)
        return { vraag: `Een tuin is ${l} m lang en ${b} m breed. Wat is de oppervlakte in m²?`,
                 antwoord: l * b, eenheid: 'm²', figuur: { type: 'rechthoek', l, b, eenheid: 'm' },
                 uitleg: `${l} × ${b} = ${l * b} m²` }
      }},
    ],
    6: [
      { doel: 'Je leert betekenis verlenen aan getallen tot in de miljarden en getallen afronden.', gen: () => afrondV(plus ? 980000 : 98000, plus ? [100, 1000, 10000] : [10, 100, 1000]) },
      { doel: 'Je leert een heel getal met een benoemde breuk vermenigvuldigen.', gen: () => breukMaalHeelV() },
      { doel: 'Je leert een deel van hoeveelheden omrekenen naar 5%, 10%, 25%, 50%, 75% en 100%.', gen: () => {
        const p = pick([5, 10, 25, 50, 75]), per = 100 / p
        const n = Math.round(rnd(2, plus ? 12 : 8)) * per
        return { vraag: `Op het schoolplein staan ${n} kinderen. ${p}% gaat naar binnen. Hoeveel kinderen zijn dat?`,
                 antwoord: n * p / 100, uitleg: `${p}% van ${n} = ${n} ÷ ${per} = ${n * p / 100}` }
      }},
      { doel: 'Je leert staafdiagrammen aflezen, maken en gebruiken bij berekeningen.', gen: () => diagramV('staaf', pick([5, 10]), rnd(3, 9)) },
    ],
    7: [
      { doel: 'Je leert het gemiddelde berekenen met hoofdrekenen.', gen: () => {
        const k = plus ? 5 : 4, cijfers = []
        const gem = rnd(4, 9)
        for (let i = 0; i < k - 1; i++) cijfers.push(rnd(3, 10))
        const laatste = gem * k - cijfers.reduce((s, x) => s + x, 0)
        if (laatste < 1 || laatste > 10) return maakBlokken(plus)[7][0].gen()
        cijfers.push(laatste)
        return { vraag: `${naam()} haalt de cijfers ${cijfers.join(', ')}. Wat is het gemiddelde?`,
                 antwoord: gem, uitleg: `(${cijfers.join(' + ')}) ÷ ${k} = ${gem * k} ÷ ${k} = ${gem}` }
      }},
      { doel: 'Je leert benoemde kommagetallen vermenigvuldigen met 10, 100 en 1000.', gen: () => kommaMaal10V() },
      { doel: 'Je leert de inhoud van een balk berekenen in dm³ en liter.', gen: () => {
        const l = rnd(2, plus ? 9 : 6), b = rnd(2, 5), h = rnd(2, 5)
        return { vraag: `Een aquarium is ${l} dm lang, ${b} dm breed en ${h} dm hoog. Hoeveel liter water past erin?`,
                 antwoord: l * b * h, eenheid: 'l', figuur: { type: 'balk', l, b, h, eenheid: 'dm' },
                 uitleg: `${l} × ${b} × ${h} = ${l * b * h} dm³ = ${l * b * h} liter` }
      }},
      { doel: 'Je leert rekenen met vreemde valuta.', gen: () => {
        const koers = rnd(85, 115) / 100, n = rnd(3, plus ? 40 : 20)
        return { vraag: `1 dollar is ${euro(koers)}. Hoeveel euro is ${n} dollar?`,
                 antwoord: +(n * koers).toFixed(2), eenheid: '€', uitleg: `${n} × ${euro(koers)} = ${euro(n * koers)}` }
      }},
    ],
    8: [
      { doel: 'Je leert hoe je eenvoudige opgaven met hele getallen en kommagetallen in een verhaal op de rekenmachine kunt uitrekenen.', gen: () => boodschappenV() },
      { doel: 'Je herhaalt het vermenigvuldigen van een heel getal met een benoemde breuk.', gen: () => breukMaalHeelV() },
      { doel: 'Je leert de nieuwe prijs uitrekenen als je de oude prijs en het kortingspercentage weet.', gen: () => {
        const prijs = rnd(2, plus ? 120 : 60) * (plus ? 1 : 1), p = pick([10, 20, 25, 50])
        const nieuw = +(prijs * (1 - p / 100)).toFixed(2)
        return { vraag: `Een spel kost ${euro(prijs)}. Je krijgt ${p}% korting. Wat is de nieuwe prijs?`,
                 antwoord: nieuw, eenheid: '€', uitleg: `Korting: ${p}% van ${euro(prijs)} = ${euro(prijs * p / 100)}. ${euro(prijs)} − ${euro(prijs * p / 100)} = ${euro(nieuw)}` }
      }},
      { doel: 'Je leert gewichten omrekenen naar een andere maat.', gen: () => {
        const kg = rnd(1, plus ? 12 : 5), g = rnd(50, 950)
        return { vraag: `Een zak meel weegt ${kg} kg en ${g} g. Hoeveel gram is dat in totaal?`,
                 antwoord: kg * 1000 + g, eenheid: 'g', uitleg: `${kg} kg = ${getal(kg * 1000)} g. ${getal(kg * 1000)} + ${g} = ${getal(kg * 1000 + g)} g` }
      }},
    ],
    9: [
      { doel: 'Je leert kolomsgewijs delen bij sommen als 5819 : 23 met en zonder rest, in maximaal 3 stappen.', gen: () => {
        const deler = rnd(13, 29), quo = rnd(120, plus ? 399 : 250)
        const totaal = deler * quo
        return { vraag: `${getal(totaal)} euro wordt eerlijk verdeeld over ${deler} mensen. Hoeveel euro krijgt ieder?`,
                 antwoord: quo, eenheid: '€', uitleg: `${getal(totaal)} ÷ ${deler} = ${quo}` }
      }},
      { doel: 'Je leert vermenigvuldigen en delen met benoemde kommagetallen.', gen: () => kommaKeerV() },
      { doel: 'Je leert percentages uitrekenen via 1%.', gen: () => {
        const bedrag = rnd(2, 20) * 100, p = rnd(2, 9) * (plus ? 1 : 5)
        return { vraag: `Van de ${euro(bedrag)} spaar je ${p}%. Hoeveel euro spaar je?`,
                 antwoord: +(bedrag * p / 100).toFixed(2), eenheid: '€', uitleg: `1% van ${getal(bedrag)} = ${euro(bedrag / 100)}. ${p} × ${euro(bedrag / 100)} = ${euro(bedrag * p / 100)}` }
      }},
      { doel: 'Je leert windrichtingen gebruiken om een standpunt of richting aan te geven.', gen: () => windrichtingV() },
    ],
    10: [
      { doel: 'Je leert bewerkingen schattend uitrekenen, in situaties waarbij het zinvol is om te schatten.', gen: () => schattenV() },
      { doel: 'Je leert vermenigvuldigen met kommagetallen, bij sommen als 2,9 × 8,1 en 24 × 0,67.', gen: () => {
        const a = rnd(110, 220) / 100, liter = rnd(20, plus ? 600 : 250) / 10
        return { vraag: `1 liter benzine kost ${euro(a)}. Je tankt ${komma(liter)} liter. Hoeveel betaal je?`,
                 antwoord: +(a * liter).toFixed(2), eenheid: '€', uitleg: `${komma(liter)} × ${euro(a)} = ${euro(a * liter)}` }
      }},
      { doel: 'Je leert eenvoudige breuken omzetten in kommagetallen en omgekeerd.', gen: () => breukKommaV() },
      { doel: 'Je leert eenvoudige lijndiagrammen aflezen, maken en er berekeningen mee maken.', gen: () => diagramV('lijn', pick([5, 10]), rnd(3, 9)) },
    ],
  }
}

// ── Verhaal-bouwers: geven {vraag, antwoord, uitleg} terug ──
const optelV = (a, b) => {
  const n = naam(), m = naam(), d = ding()
  return {
    vraag: pick([
      `${n} heeft ${getal(a)} ${d[1]} en krijgt er ${getal(b)} bij. Hoeveel ${d[1]} heeft ${n} nu?`,
      `In de winkel liggen ${getal(a)} ${d[1]}. Er komen er ${getal(b)} bij. Hoeveel ${d[1]} zijn het samen?`,
      `${n} heeft ${getal(a)} ${d[1]} en ${m} heeft er ${getal(b)}. Hoeveel ${d[1]} hebben ze samen?`,
      `In de eerste week werden ${getal(a)} ${d[1]} verkocht en in de tweede week ${getal(b)}. Hoeveel ${d[1]} samen?`,
    ]),
    antwoord: a + b, uitleg: `${getal(a)} + ${getal(b)} = ${getal(a + b)}`,
  }
}
const aftrekV = (a, b) => {   // a >= b
  const n = naam(), d = ding()
  return {
    vraag: pick([
      `Er zijn ${getal(a)} ${d[1]}. Er gaan er ${getal(b)} weg. Hoeveel ${d[1]} blijven er over?`,
      `${n} had ${getal(a)} ${d[1]} en geeft er ${getal(b)} weg. Hoeveel ${d[1]} houdt ${n} over?`,
      `In de doos zaten ${getal(a)} ${d[1]}. ${n} pakt er ${getal(b)} uit. Hoeveel ${d[1]} liggen er nog in de doos?`,
      `${n} spaarde ${getal(a)} ${d[1]} en gaf er ${getal(b)} aan een vriend. Hoeveel ${d[1]} heeft ${n} nog?`,
    ]),
    antwoord: a - b, uitleg: `${getal(a)} − ${getal(b)} = ${getal(a - b)}`,
  }
}
const keerV = (a, b) => {   // a groepjes van b
  const n = naam(), d = ding()
  return {
    vraag: pick([
      `${n} heeft ${a} doosjes met elk ${getal(b)} ${d[1]}. Hoeveel ${d[1]} zijn dat samen?`,
      `Er staan ${a} rijen met ${getal(b)} ${d[1]}. Hoeveel ${d[1]} in totaal?`,
      `${n} koopt ${a} zakjes ${d[1]}. In elk zakje zitten er ${getal(b)}. Hoeveel ${d[1]} heeft ${n} dan?`,
      `Op een plank staan ${a} potjes met elk ${getal(b)} ${d[1]}. Hoeveel ${d[1]} staan er op de plank?`,
      `Een klas van ${a} kinderen krijgt ieder ${getal(b)} ${d[1]}. Hoeveel ${d[1]} zijn er nodig?`,
    ]),
    antwoord: a * b, uitleg: `${a} × ${getal(b)} = ${getal(a * b)}`,
  }
}
const deelV = (deler, q) => {   // exact, antwoord = q
  const totaal = deler * q, n = naam(), d = ding()
  return {
    vraag: pick([
      `${getal(totaal)} ${d[1]} worden eerlijk verdeeld over ${deler} kinderen. Hoeveel krijgt ieder kind?`,
      `Je hebt ${getal(totaal)} ${d[1]} en ${deler} dozen. Hoeveel ${d[1]} gaan er in elke doos?`,
      `${n} legt ${getal(totaal)} ${d[1]} in ${deler} even grote rijen. Hoeveel ${d[1]} liggen er in elke rij?`,
      `${getal(totaal)} ${d[1]} passen precies in ${deler} zakjes. Hoeveel ${d[1]} zitten er in één zakje?`,
    ]),
    antwoord: q, uitleg: `${getal(totaal)} : ${deler} = ${q}`,
  }
}
const deelRestV = (deler, q, rest) => {
  const totaal = deler * q + rest, d = ding()
  return {
    vraag: `Er zijn ${getal(totaal)} ${d[1]}. Ze gaan in zakjes van ${deler}. Hoeveel volle zakjes kun je maken en hoeveel blijven er over?`,
    antwoord: q, rest, uitleg: `${getal(totaal)} : ${deler} = ${q} (rest ${rest})`,
  }
}
// ── Extra verhaal-bouwers voor de ontbrekende groep-7-doelen ──
const breukNoemTekst = (n) => ({ 2: 'half', 3: 'derde', 4: 'kwart', 5: 'vijfde', 6: 'zesde' }[n] || `1/${n}`)
const breukHelenV = () => {   // helen uit de breuk halen
  const n = rnd(2, 6), h = rnd(1, 4), r = rnd(1, n - 1), t = h * n + r
  return { vraag: `Je hebt ${t}/${n} pizza's. Hoeveel héle pizza's is dat? (de rest telt niet mee)`,
           antwoord: h, uitleg: `${t} : ${n} = ${h} (rest ${r}). Dus ${h} hele pizza's en ${r}/${n} over.` }
}
const gelijkBreukV = () => {   // gelijkwaardige breuken
  const noem = pick([2, 3, 4, 5]), tel = 1, f = pick([2, 3, 4])
  return { vraag: `Welke teller hoort hier? ${tel}/${noem} = ?/${noem * f}`,
           antwoord: tel * f, uitleg: `${noem} × ${f} = ${noem * f}, dus ${tel} × ${f} = ${tel * f}. ${tel}/${noem} = ${tel * f}/${noem * f}.` }
}
const schattenV = () => {   // schattend uitrekenen via afronden op tientallen
  const a = rnd(11, 89), b = rnd(11, 89), ra = Math.round(a / 10) * 10, rb = Math.round(b / 10) * 10
  return { vraag: `Schat het antwoord van ${a} × ${b}. Rond allebei af op tientallen en reken dan uit.`,
           antwoord: ra * rb, uitleg: `${a} ≈ ${ra} en ${b} ≈ ${rb}. ${ra} × ${rb} = ${ra * rb}.` }
}
const BREUK_KOMMA = [['1/2', 0.5], ['1/4', 0.25], ['3/4', 0.75], ['1/5', 0.2], ['2/5', 0.4], ['3/5', 0.6], ['1/10', 0.1], ['3/10', 0.3]]
const breukKommaV = () => {
  const [b, d] = pick(BREUK_KOMMA)
  return { vraag: `Schrijf de breuk ${b} als kommagetal.`, antwoord: d, uitleg: `${b} = ${komma(d)}` }
}
const breukMaalHeelV = () => {   // heel getal × benoemde breuk
  const n = pick([2, 3, 4, 5]), h = rnd(2, 9) * n
  return { vraag: `Je eet ${h} keer een ${breukNoemTekst(n)} deel van een pizza. Hoeveel héle pizza's is dat?`,
           antwoord: h / n, uitleg: `${h} × 1/${n} = ${h}/${n} = ${h / n}` }
}
const kommaMaal10V = () => {   // benoemd kommagetal × 10/100/1000
  const g = rnd(105, 995) / 100, f = pick([10, 100, 1000]), ant = +(g * f).toFixed(2)
  return { vraag: `Reken uit: ${komma(g)} × ${f}.`, antwoord: ant, uitleg: `${komma(g)} × ${f} = ${komma(ant)}` }
}
const boodschappenV = () => {   // rekenmachine-verhaal met totaal
  const n1 = rnd(2, 6), p1 = rnd(120, 350) / 100, n2 = rnd(2, 5), p2 = rnd(90, 250) / 100
  const tot = +(n1 * p1 + n2 * p2).toFixed(2)
  return { vraag: `Je koopt ${n1} broden van ${euro(p1)} en ${n2} pakken melk van ${euro(p2)}. Hoeveel betaal je samen?`,
           antwoord: tot, eenheid: '€', uitleg: `${n1} × ${euro(p1)} = ${euro(n1 * p1)}, ${n2} × ${euro(p2)} = ${euro(n2 * p2)}. Samen ${euro(tot)}.` }
}
const kommaKeerV = () => {   // vermenigvuldigen met benoemd kommagetal
  const n = rnd(2, 8), g = rnd(120, 450) / 100, tot = +(n * g).toFixed(2)
  return { vraag: `Je koopt ${n} pakken suiker van ${komma(g)} kg. Hoeveel kilogram is dat samen?`,
           antwoord: tot, eenheid: 'kg', uitleg: `${n} × ${komma(g)} = ${komma(tot)} kg` }
}
const WINDRICHTINGEN = [['het oosten', 90], ['het zuiden', 180], ['het westen', 270], ['het zuidoosten', 135], ['het zuidwesten', 225], ['het noordoosten', 45]]
const windrichtingV = () => {
  const [r, deg] = pick(WINDRICHTINGEN)
  return { vraag: `Je kijkt naar het noorden en draait met de klok mee naar ${r}. Hoeveel graden draai je?`,
           antwoord: deg, eenheid: '°', uitleg: `Noord = 0°, oost = 90°, zuid = 180°, west = 270°. Naar ${r} is ${deg}°.` }
}
const schaalV = () => {   // schaallijntje: lengte op kaart → echt
  const N = pick([100, 500, 1000, 2500]), cm = rnd(2, 9)
  return { vraag: `Op een kaart met schaal 1 : ${N} is een weg ${cm} cm lang. Hoeveel meter is de weg in het echt?`,
           antwoord: cm * N / 100, eenheid: 'm', uitleg: `${cm} cm × ${N} = ${getal(cm * N)} cm = ${getal(cm * N / 100)} m` }
}
// ── Extra bouwers voor groep 6 en 8 (elk doel krijgt een echte som) ──
const deelVanGeheelV = () => {   // deel van een geheel: a/b van een getal
  const noem = pick([2, 3, 4, 5, 6, 10]), tel = rnd(1, noem - 1), geheel = noem * rnd(2, 9)
  return { vraag: `Hoeveel is ${tel}/${noem} van ${geheel}?`, antwoord: geheel * tel / noem,
           uitleg: `${geheel} : ${noem} = ${geheel / noem}, × ${tel} = ${geheel * tel / noem}` }
}
const breukAanvullenV = () => {   // breuk aanvullen tot een hele
  const noem = pick([3, 4, 5, 6, 8, 10]), tel = rnd(1, noem - 1)
  return { vraag: `Hoeveel moet je bij ${tel}/${noem} optellen om 1 hele te maken? Geef de teller (de noemer blijft ${noem}).`,
           antwoord: noem - tel, uitleg: `${tel}/${noem} + ${noem - tel}/${noem} = ${noem}/${noem} = 1` }
}
const tijdErbijV = (maxMin = 180) => {   // hoe laat is het over een bepaalde tijd
  const h1 = rnd(6, 20), m1 = pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])
  const dur = rnd(1, Math.floor(maxMin / 5)) * 5
  const tot = h1 * 60 + m1 + dur, h2 = Math.floor(tot / 60) % 24, m2 = tot % 60
  return { vraag: `Het is ${h1}:${PAD(m1)} uur. Hoe laat is het over ${dur} minuten?`,
           antwoordType: 'tijd', tijdH: h2, tijdM: m2, antwoord: `${h2}:${PAD(m2)}`,
           uitleg: `${h1}:${PAD(m1)} + ${dur} min = ${h2}:${PAD(m2)} uur.` }
}
const tijdNaarSecV = () => {   // tijden omrekenen naar seconden
  const m = rnd(1, 9), s = pick([5, 10, 15, 20, 30, 45])
  return { vraag: `Een liedje duurt ${m} minuten en ${s} seconden. Hoeveel seconden is dat in totaal?`,
           antwoord: m * 60 + s, eenheid: 's', uitleg: `${m} × 60 + ${s} = ${m * 60} + ${s} = ${m * 60 + s} s` }
}
const kaartV = () => {   // plaats/route op een kaart
  const a = rnd(2, 6), b = rnd(2, 6), m = pick([100, 200, 500])
  return { vraag: `Een route op de kaart gaat ${a} vakjes naar rechts en ${b} vakjes omhoog. Elk vakje is ${m} m. Hoeveel meter is de route in totaal?`,
           antwoord: (a + b) * m, eenheid: 'm', uitleg: `(${a} + ${b}) × ${m} = ${a + b} × ${m} = ${(a + b) * m} m` }
}
const datumV = () => {   // datum: dagen verder rekenen binnen een maand
  const dag = rnd(1, 10), erbij = rnd(5, 18)
  return { vraag: `Het is de ${dag}e van de maand. Welke datum is het over ${erbij} dagen? Geef de dag van de maand.`,
           antwoord: dag + erbij, uitleg: `${dag} + ${erbij} = ${dag + erbij}` }
}
const volgordeV = () => {   // volgorde van bewerkingen
  const a = rnd(2, 9), b = rnd(2, 9), c = rnd(2, 9)
  if (pick([0, 1]) === 0) return { vraag: `Reken uit, let op de volgorde: ${a} + ${b} × ${c}`, antwoord: a + b * c, uitleg: `Eerst ${b} × ${c} = ${b * c}, dan ${a} + ${b * c} = ${a + b * c}.` }
  return { vraag: `Reken uit, let op de volgorde: ${a} × ${b} - ${c}`, antwoord: a * b - c, uitleg: `Eerst ${a} × ${b} = ${a * b}, dan ${a * b} - ${c} = ${a * b - c}.` }
}
const restV = () => {   // deelbaarheid: rest bij delen
  const deler = pick([2, 4, 5, 10]), q = rnd(3, 19), rest = rnd(0, deler - 1), n = deler * q + rest
  return { vraag: `Wat is de rest als je ${n} deelt door ${deler}?`, antwoord: rest, uitleg: `${n} : ${deler} = ${q} rest ${rest}.` }
}
const priemV = () => {   // ontbinden in priemgetallen
  const primes = [2, 3, 5, 7], p = pick(primes), q = pick(primes), n = p * q
  return { vraag: `${n} is het product van twee priemgetallen. Geef het kleinste priemgetal.`,
           antwoord: Math.min(p, q), uitleg: `${n} = ${Math.min(p, q)} × ${Math.max(p, q)}. Beide zijn priemgetallen.` }
}
const grootGetalV = () => {   // heel grote getallen in cijfers schrijven
  const k = rnd(2, 9), u = pick([['miljoen', 1000000], ['miljard', 1000000000]])
  return { vraag: `Schrijf als getal in cijfers: ${k} ${u[0]}.`, antwoord: k * u[1], uitleg: `${k} ${u[0]} = ${getal(k * u[1])}` }
}
const verhoudingV = () => {   // verhoudingsproblemen
  const stuks = pick([2, 3, 4, 5]), perStuk = rnd(2, 9), prijs = perStuk * stuks, n = stuks * rnd(2, 5)
  return { vraag: `${stuks} broodjes kosten samen € ${prijs}. Hoeveel kosten ${n} broodjes?`,
           antwoord: perStuk * n, eenheid: '€', uitleg: `1 broodje = € ${perStuk}. ${n} × € ${perStuk} = € ${perStuk * n}.` }
}
const procentVanV = () => {   // percentage van een getal
  const p = pick([5, 10, 20, 25, 50, 75]), basis = pick([20, 40, 60, 80, 100, 200])
  return { vraag: `Hoeveel is ${p}% van ${basis}?`, antwoord: basis * p / 100, uitleg: `${p}% van ${basis} = ${basis} ÷ 100 × ${p} = ${basis * p / 100}` }
}
const procentRedeneerV = () => {   // redeneren met percentages in een verhaal
  const totaal = pick([200, 400, 500, 800, 1000]), p = pick([10, 20, 25, 50])
  return { vraag: `In een dorp wonen ${getal(totaal)} mensen. ${p}% heeft een hond. Hoeveel mensen hebben een hond?`,
           antwoord: totaal * p / 100, uitleg: `${p}% van ${getal(totaal)} = ${getal(totaal * p / 100)}` }
}
const tijdzoneV = () => {   // tijd in een andere tijdzone
  const h = rnd(6, 20), m = pick([0, 15, 30, 45]), diff = pick([1, 2, 6, 8]), richting = pick(['later', 'vroeger'])
  const delta = richting === 'later' ? diff : -diff
  const tot = ((h * 60 + m + delta * 60) % 1440 + 1440) % 1440, h2 = Math.floor(tot / 60), m2 = tot % 60
  return { vraag: `In Amsterdam is het ${h}:${PAD(m)} uur. In een andere stad is het ${diff} uur ${richting}. Hoe laat is het daar?`,
           antwoordType: 'tijd', tijdH: h2, tijdM: m2, antwoord: `${h2}:${PAD(m2)}`,
           uitleg: `${h}:${PAD(m)} ${delta > 0 ? '+' : '−'} ${diff} uur = ${h2}:${PAD(m2)} uur.` }
}
const kommaDeelV = () => {   // delen met benoemde kommagetallen
  const deler = rnd(2, 6), per = rnd(15, 60) / 10, totaal = +(per * deler).toFixed(1)
  return { vraag: `${komma(totaal)} kg wordt eerlijk verdeeld over ${deler} bakjes. Hoeveel kg komt er in elk bakje?`,
           antwoord: +per.toFixed(2), eenheid: 'kg', uitleg: `${komma(totaal)} : ${deler} = ${komma(+per.toFixed(2))} kg` }
}
const breukOptelGelijkV = () => {   // benoemde gelijknamige breuken optellen
  const noem = pick([4, 5, 6, 8, 10]), t1 = rnd(1, noem - 2), t2 = rnd(1, noem - 1 - t1)
  return { vraag: `Reken uit: ${t1}/${noem} + ${t2}/${noem}. Geef de teller (de noemer blijft ${noem}).`,
           antwoord: t1 + t2, uitleg: `${t1}/${noem} + ${t2}/${noem} = ${t1 + t2}/${noem}` }
}
const gemiddeldeV = () => {   // gemiddelde berekenen
  for (let t = 0; t < 50; t++) {
    const k = pick([3, 4]), gem = rnd(4, 9), cijfers = []; let som = 0
    for (let i = 0; i < k - 1; i++) { const c = rnd(3, 10); cijfers.push(c); som += c }
    const last = gem * k - som
    if (last >= 1 && last <= 10) { cijfers.push(last); return { vraag: `${naam()} haalt de cijfers ${cijfers.join(', ')}. Wat is het gemiddelde?`, antwoord: gem, uitleg: `(${cijfers.join(' + ')}) ÷ ${k} = ${gem * k} ÷ ${k} = ${gem}` } }
  }
  return { vraag: 'Wat is het gemiddelde van 6 en 8?', antwoord: 7, uitleg: '(6 + 8) ÷ 2 = 7' }
}
const tussenHonderdV = () => {   // tussen welke honderdtallen ligt een getal
  const n = rnd(120, 980), laag = Math.floor(n / 100) * 100
  return { vraag: `Tussen welke honderdtallen ligt ${n}? Geef het kleinste honderdtal.`, antwoord: laag, uitleg: `${n} ligt tussen ${laag} en ${laag + 100}.` }
}
const standpuntV = () => {   // bedenken wat je vanuit een standpunt ziet
  const r = rnd(2, 5), k = rnd(2, 5)
  return { vraag: `Je kijkt naar ${r} rijen met elk ${k} dozen. Hoeveel dozen zie je in totaal?`, antwoord: r * k, uitleg: `${r} × ${k} = ${r * k}` }
}
const vormHoekenV = () => {   // namen van figuren en vormen
  const v = pick([['driehoek', 3], ['vierkant', 4], ['rechthoek', 4], ['vijfhoek', 5], ['zeshoek', 6]])
  return { vraag: `Hoeveel hoeken heeft een ${v[0]}?`, antwoord: v[1], uitleg: `Een ${v[0]} heeft ${v[1]} hoeken.` }
}
const kalenderV = () => {   // jaarkalender aflezen / rekenen met weken
  const w = rnd(2, 8)
  return { vraag: `Hoeveel dagen zijn ${w} weken?`, antwoord: w * 7, eenheid: 'dagen', uitleg: `${w} × 7 = ${w * 7} dagen` }
}
const geldOptelV = () => {   // bedragen samen ≤ € 100
  const a = rnd(150, 5000), b = rnd(100, 10000 - a), p1 = a / 100, p2 = b / 100, n = naam()
  return { vraag: `${n} koopt iets van ${euro(p1)} en iets van ${euro(p2)}. Hoeveel betaalt ${n} samen?`, antwoord: +(p1 + p2).toFixed(2), eenheid: '€', uitleg: `${euro(p1)} + ${euro(p2)} = ${euro(p1 + p2)}` }
}
const wisselV = () => {
  const prijs = rnd(150, 4500) / 100, betaald = Math.ceil(prijs / 5) * 5, n = naam()
  return { vraag: `Iets kost ${euro(prijs)}. ${n} betaalt met ${euro(betaald)}. Hoeveel geld krijgt ${n} terug?`, antwoord: +(betaald - prijs).toFixed(2), eenheid: '€', uitleg: `${euro(betaald)} − ${euro(prijs)} = ${euro(betaald - prijs)}` }
}
const afrondV = (max, opties) => {
  const n = rnd(1200, max), op = pick(opties)
  const nm = op === 10 ? 'tientallen' : op === 100 ? 'honderdtallen' : 'duizendtallen'
  const af = Math.round(n / op) * op
  return { vraag: `Rond het getal ${getal(n)} af op ${nm}.`, antwoord: af, uitleg: `${getal(n)} afgerond op ${nm} = ${getal(af)}` }
}

// ── Klok aflezen (analoge klok) ──
const PAD = (n) => String(n).padStart(2, '0')
const DAGDELEN = [
  { naam: "'s nachts",   icon: '🌙', minU: 0,  maxU: 5  },
  { naam: "'s ochtends", icon: '🌅', minU: 6,  maxU: 11 },
  { naam: "'s middags",  icon: '☀️', minU: 12, maxU: 17 },
  { naam: "'s avonds",   icon: '🌆', minU: 18, maxU: 23 },
]
const klokV = (mins) => {   // mins = toegestane minuut-waarden
  const dd = pick(DAGDELEN)
  const h24 = rnd(dd.minU, dd.maxU), m = pick(mins)
  const h = h24 % 12 === 0 ? 12 : h24 % 12   // uur op de wijzerklok (1..12)
  const wijzer = m === 0 ? 'de 12' : `de ${m / 5}`
  return {
    vraag: `Hoe laat is het ${dd.naam} op de klok? Schrijf het zo: ${h}:${PAD(m === 0 ? 25 : m)}`,
    antwoordType: 'tijd', tijdH: h, tijdM: m, antwoord: `${h}:${PAD(m)}`,
    figuur: { type: 'klok', h, m, dagdeel: dd.naam, icon: dd.icon },
    uitleg: `De grote wijzer wijst naar ${wijzer} en de kleine wijzer naar de ${h}. Het is ${h}:${PAD(m)} uur ${dd.naam} (= ${h24}:${PAD(m)} uur).`,
  }
}

// ── Getallenlijn aflezen ──
const getallenlijnV = (start, lengte, stap) => {
  const segs = 10, eind = start + lengte
  const i = rnd(1, segs - 1), waarde = start + i * (lengte / segs)
  return {
    vraag: 'Welk getal hoort bij de pijl op de getallenlijn?',
    antwoord: waarde, figuur: { type: 'getallenlijn', start, eind, waarde, segs },
    uitleg: `De getallenlijn loopt van ${getal(start)} tot ${getal(eind)} in ${segs} stappen van ${getal(lengte / segs)}. De pijl staat op ${getal(waarde)}.`,
  }
}

// ── Diagram aflezen (staaf of lijn) ──
const DIAGRAM_SETS = [
  { titel: 'bezoekers', labels: ['ma', 'di', 'wo', 'do', 'vr'] },
  { titel: 'verkochte ijsjes', labels: ['ma', 'di', 'wo', 'do', 'vr'] },
  { titel: 'punten', labels: ['Sem', 'Noor', 'Daan', 'Mila'] },
  { titel: 'boeken', labels: ['jan', 'feb', 'mrt', 'apr'] },
]
const diagramV = (type, step, maxUnits) => {
  const set = pick(DIAGRAM_SETS)
  const items = set.labels.map(l => ({ label: l, waarde: rnd(1, maxUnits) * step }))
  const soort = pick(['lees', 'diff', 'totaal'])
  const fig = { type, items, step, titel: set.titel }
  if (soort === 'totaal') {
    const som = items.reduce((s, x) => s + x.waarde, 0)
    return { vraag: `Hoeveel ${set.titel} in totaal volgens het diagram?`, antwoord: som, figuur: fig, uitleg: `${items.map(x => x.waarde).join(' + ')} = ${som}` }
  }
  if (soort === 'diff') {
    const sorted = [...items].sort((a, b) => b.waarde - a.waarde)
    const a = sorted[0], b = sorted[sorted.length - 1]
    return { vraag: `Hoeveel meer ${set.titel} bij ${a.label} dan bij ${b.label}?`, antwoord: a.waarde - b.waarde, figuur: fig, uitleg: `${a.waarde} − ${b.waarde} = ${a.waarde - b.waarde}` }
  }
  const k = pick(items)
  return { vraag: `Hoeveel ${set.titel} bij ${k.label} volgens het diagram?`, antwoord: k.waarde, figuur: fig, uitleg: `Lees de hoogte bij ${k.label} af: ${k.waarde}.` }
}

// ── Groep 5 (Pluspunt). Eén traject (geen FS/S+). Per blok, exacte doelen. ──
function maakGroep5() {
  return {
    1: [
      { doel: 'Je leert getallen tot en met 1000 splitsen in en samenstellen met honderdtallen, tientallen en eenheden.', gen: () => getallenlijnV(rnd(0, 5) * 100, 500, 50) },
      { doel: 'Je leert tussen welke honderdtallen een getal ligt.', gen: () => tussenHonderdV() },
      { doel: 'Je leert alle tafelsommen vlot maken.', gen: () => keerV(rnd(2, 10), rnd(2, 10)) },
      { doel: 'Je leert de tijd van een digitale klok aflezen, bij hele en halve uren en bij kwartieren.', gen: () => klokV([0, 15, 30, 45]) },
    ],
    2: [
      { doel: 'Je leert getallen tot en met 1000 schattend plaatsen en aflezen op de streepjesgetallenlijn vanaf een willekeurig getal.', gen: () => getallenlijnV(rnd(0, 5) * 100, 500, 50) },
      { doel: 'Je leert keersommen uitrekenen met behulp van de kleine som.', gen: () => keerV(rnd(2, 9), rnd(2, 9) * 10) },
      { doel: 'Je leert wat delen is, en bij een deelverhaal een deelsom bedenken.', gen: () => deelV(rnd(2, 5), rnd(2, 9)) },
      { doel: 'Je leert bedenken wat je vanuit een bepaald standpunt ziet.', gen: () => standpuntV() },
    ],
    3: [
      { doel: 'Je leert optellen tot en met 1000 met de strategie: rijgen, bij sommen als 380 + 200 en 380 + 160.', gen: () => optelV(rnd(11, 80) * 10, rnd(2, 8) * 20) },
      { doel: 'Je leert sommen als 3 × 14 uitrekenen met de basisstrategie: splitsen.', gen: () => keerV(rnd(2, 9), rnd(11, 19)) },
      { doel: 'Je leert van een digitale klok 5 en 10 minuten voor en over een heel uur aflezen.', gen: () => klokV([5, 10, 50, 55]) },
      { doel: 'Je leert van een klok met wijzers 5 en 10 minuten voor en over een heel uur aflezen.', gen: () => klokV([5, 10, 50, 55]) },
    ],
    4: [
      { doel: 'Je leert aftrekken tot en met 1000 met de strategie: rijgen, bij sommen als 580 - 200 en 540 - 160.', gen: () => { const a = rnd(30, 95) * 10, b = rnd(2, 8) * 20; return aftrekV(a, Math.min(b, a - 20)) } },
      { doel: 'Je leert sommen als 4 × 67 uitrekenen met de basisstrategie: splitsen.', gen: () => keerV(rnd(3, 9), rnd(41, 89)) },
      { doel: 'Je leert sommen als 56 : 4 uitrekenen met de basisstrategie: splitsen.', gen: () => deelV(rnd(3, 8), rnd(11, 24)) },
      { doel: 'Je leert bedragen tot en met 100 euro maken en schrijven met het euroteken en een komma.', gen: () => geldOptelV() },
    ],
    5: [
      { doel: 'Je leert optellen en aftrekken tot en met 1000 in maximaal 3 sprongen met de strategie: rijgen, bij sommen als 246 + 37 en 482 - 46.', gen: () => { const a = rnd(120, 880), b = rnd(20, 90); return Math.random() < 0.5 ? optelV(a, b) : aftrekV(a, b) } },
      { doel: 'Je leert optellen tot en met 1000 in maximaal 2 sprongen met de strategie: rijgen, bij sommen als 486 + 50.', gen: () => optelV(rnd(120, 880), rnd(2, 9) * 10) },
      { doel: 'Je leert een deelsom uitrekenen met een keersom en je begrijpt waarom dit mag.', gen: () => deelV(rnd(2, 8), rnd(3, 9)) },
      { doel: 'Je leert van een klok met wijzers 5 en 10 minuten voor en over een half uur aflezen.', gen: () => klokV([20, 25, 35, 40]) },
    ],
    6: [
      { doel: 'Je leert aftrekken tot en met 1000 in maximaal 2 sprongen met de strategie: rijgen, bij sommen als 434 - 70.', gen: () => { const a = rnd(150, 900), b = rnd(2, 9) * 10; return aftrekV(a, b) } },
      { doel: 'Je leert sommen als 67 × 4 uitrekenen door eerst om te keren en dan te rekenen met de basisstrategie: splitsen.', gen: () => keerV(rnd(3, 9), rnd(41, 89)) },
      { doel: 'Je leert een deelsom met rest uitrekenen met een keersom en je begrijpt waarom dit mag.', gen: () => { const deler = rnd(3, 9); return deelRestV(deler, rnd(8, 40), rnd(1, deler - 1)) } },
      { doel: 'Je leert de namen van figuren en vormen.', gen: () => vormHoekenV() },
    ],
    7: [
      { doel: 'Je leert optellen tot en met 1000 met de basisstrategie: splitsen, bij sommen als 435 + 220 en 435 + 224.', gen: () => optelV(rnd(120, 560), rnd(110, 430)) },
      { doel: 'Je leert aftrekken tot en met 1000 met de basisstrategie: splitsen, bij sommen als 687 - 450 en 687 - 456.', gen: () => { const a = rnd(450, 950), b = rnd(150, a - 100); return aftrekV(a, b) } },
      { doel: 'Je leert deelsommen zonder rest vlot uitrekenen met de keersom als hulpsom.', gen: () => deelV(rnd(2, 9), rnd(3, 12)) },
      { doel: 'Je leert een jaarkalender aflezen.', gen: () => kalenderV() },
    ],
    8: [
      { doel: 'Je leert aftrekken tot en met 1000 met de strategie: aanvullen.', gen: () => { const a = rnd(400, 900), b = rnd(a - 90, a - 10); return aftrekV(a, b) } },
      { doel: 'Je leert sommen als 4 × 69 uitrekenen met de variastrategie: rekenen met te veel.', gen: () => keerV(rnd(3, 9), rnd(2, 9) * 10 - 1) },
      { doel: 'Je leert sommen als 120 : 3 uitrekenen met de kleine som 12 : 3.', gen: () => { const deler = rnd(2, 8), q = rnd(3, 9), totaal = deler * q * 10, d = ding(); return { vraag: `${getal(totaal)} ${d[1]} gaan in ${deler} dozen. Hoeveel ${d[1]} in elke doos?`, antwoord: q * 10, uitleg: `${getal(totaal)} : ${deler} = ${q * 10} (kleine som ${deler * q} : ${deler} = ${q})` } } },
      { doel: 'Je leert uitrekenen hoeveel je terugkrijgt als je met te veel betaalt.', gen: () => wisselV() },
    ],
    9: [
      { doel: 'Je leert optellen tot en met 1000 met de strategie: rijgen met te veel.', gen: () => optelV(rnd(120, 800), rnd(2, 9) * 10 - 1) },
      { doel: 'Je leert aftrekken tot en met 1000 met de strategie: rijgen met te veel.', gen: () => { const a = rnd(200, 900), b = rnd(2, 9) * 10 - 1; return aftrekV(a, b) } },
      { doel: 'Je leert sommen als 42 : 3 uitrekenen met de basisstrategie: splitsen.', gen: () => deelV(rnd(2, 8), rnd(11, 30)) },
      { doel: 'Je leert nauwkeurig meten in millimeters, centimeters en decimeters.', gen: () => { const cm = rnd(3, 20), mm = rnd(1, 9); return { vraag: `Een potlood is ${cm} cm en ${mm} mm lang. Hoeveel millimeter is dat in totaal?`, antwoord: cm * 10 + mm, eenheid: 'mm', uitleg: `${cm} cm = ${cm * 10} mm. ${cm * 10} + ${mm} = ${cm * 10 + mm} mm` } } },
    ],
    10: [
      { doel: 'Je leert handig rekenen bij een lange optelsom en aftreksom.', gen: () => { const a = rnd(20, 90) * 10, b = rnd(15, 60) * 10, c = rnd(10, 40) * 10, d = ding(); return { vraag: `In 3 dozen zitten ${getal(a)}, ${getal(b)} en ${getal(c)} ${d[1]}. Hoeveel ${d[1]} samen?`, antwoord: a + b + c, uitleg: `${getal(a)} + ${getal(b)} + ${getal(c)} = ${getal(a + b + c)}` } } },
      { doel: 'Je leert sommen als 4 × 35 uitrekenen met de variastrategie: halveren en verdubbelen.', gen: () => keerV(rnd(2, 8), rnd(3, 9) * 5) },
      { doel: 'Je leert sommen als 72 : 3 uitrekenen met de basisstrategie: splitsen.', gen: () => deelV(rnd(2, 6), rnd(11, 40)) },
      { doel: 'Je leert een stapeldiagram aflezen en gebruiken.', gen: () => diagramV('staaf', pick([2, 5]), rnd(3, 8)) },
    ],
  }
}

// ── Groep 6 (Pluspunt FS). Per blok, exacte doelen. ──
function maakGroep6(plus) {
  const M = plus ? 1 : 0
  return {
    1: [
      { doel: 'Je leert getallen tot 10.000 splitsen in en samenstellen met duizendtallen, honderdtallen, tientallen en eenheden.', gen: () => getallenlijnV(rnd(0, 5) * 1000, 5000, 500) },
      { doel: 'Je leert sommen als 1200 + 1300, 4500 - 1200, 3 × 700 en 4500 : 9 vlot uitrekenen door te rekenen met de kleine som.', gen: () => {
        const k = rnd(1, 4)
        if (k === 1) return optelV(rnd(11, 80) * 100, rnd(11, 40) * 100)
        if (k === 2) { const a = rnd(25, 90) * 100, b = rnd(11, Math.floor(a / 100) - 5) * 100; return aftrekV(a, b) }
        if (k === 3) return keerV(rnd(2, 9), rnd(2, 9) * 100)
        return deelV(rnd(2, 9), rnd(2, 9) * 100)
      } },
      { doel: 'Je leert meten met stroken. De uitkomst schrijf je op in breukentaal.', gen: () => deelVanGeheelV() },
      { doel: 'Je leert van een klok met wijzers de tijd op de minuut nauwkeurig aflezen en aangeven.', gen: () => klokV([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]) },
    ],
    2: [
      { doel: 'Je leert tellen tot en met 10.000 met sprongen van 1, 10, 100 en 1000, en schattend plaatsen op de getallenlijn.', gen: () => getallenlijnV(rnd(0, 5) * 1000, 5000, 500) },
      { doel: 'Je leert sommen als 368 + 257 kolomsgewijs optellen en je begrijpt wat je opschrijft.', gen: () => optelV(rnd(140, 680 + M * 200), rnd(140, 680)) },
      { doel: 'Je leert bij een plaatje aangeven welk deel gekleurd is en welke breuk erbij hoort.', gen: () => deelVanGeheelV() },
      { doel: 'Je leert hoe je een plaats op een kaart kunt vinden en de lengte van een route berekenen.', gen: () => kaartV() },
    ],
    3: [
      { doel: 'Je leert getallen afronden op tientallen, honderdtallen en duizendtallen.', gen: () => afrondV(9800, [10, 100, 1000]) },
      { doel: 'Je leert sommen als 92 : 4 uitrekenen met de basisstrategie splitsen.', gen: () => deelV(rnd(3, 8), rnd(11, 30)) },
      { doel: 'Je leert een breuk aanvullen tot een hele.', gen: () => breukAanvullenV() },
      { doel: 'Je leert uitrekenen hoe laat het over een bepaalde tijd is.', gen: () => tijdErbijV(120) },
    ],
    4: [
      { doel: 'Je leert sommen als 432 + 257 cijferend of kolomsgewijs optellen en je begrijpt wat je opschrijft.', gen: () => optelV(rnd(140, 680), rnd(140, 560)) },
      { doel: 'Je leert sommen als 487 + 235 cijferend of kolomsgewijs optellen en je begrijpt wat je opschrijft.', gen: () => optelV(rnd(150, 690), rnd(150, 490)) },
      { doel: 'Je leert breuken schattend plaatsen en aflezen op de getallenlijn vanaf 0.', gen: () => deelVanGeheelV() },
      { doel: 'Je leert de maten kilogram en gram gebruiken.', gen: () => { const kg = rnd(1, 9), g = rnd(50, 950); return { vraag: `Een tas weegt ${kg} kg en ${g} g. Hoeveel gram is dat in totaal?`, antwoord: kg * 1000 + g, eenheid: 'g', uitleg: `${kg} kg = ${getal(kg * 1000)} g. ${getal(kg * 1000)} + ${g} = ${getal(kg * 1000 + g)} g` } } },
    ],
    5: [
      { doel: 'Je leert sommen als 463 - 248 kolomsgewijs aftrekken en je begrijpt wat je opschrijft.', gen: () => { const a = rnd(360, 980), b = rnd(140, a - 100); return aftrekV(a, b) } },
      { doel: 'Je leert sommen als 423 - 248 kolomsgewijs aftrekken en je begrijpt wat je opschrijft.', gen: () => { const a = rnd(400, 920), b = rnd(240, a - 80); return aftrekV(a, b) } },
      { doel: 'Je leert breuken met elkaar vergelijken met behulp van afbeeldingen en de getallenlijn.', gen: () => gelijkBreukV() },
      { doel: 'Je leert tijden aflezen, aangeven en omrekenen op de seconde nauwkeurig.', gen: () => tijdNaarSecV() },
    ],
    6: [
      { doel: 'Je leert tellen tot en met 100.000 met sprongen van 1, 10, 100, 1000 en 10.000.', gen: () => getallenlijnV(rnd(0, 5) * 10000, 50000, 5000) },
      { doel: 'Je leert sommen als 826 : 9 (met rest) uitrekenen met de basisstrategie splitsen.', gen: () => { const deler = rnd(3, 9); return deelRestV(deler, rnd(40, 99), rnd(1, deler - 1)) } },
      { doel: 'Je leert de betekenis van kommagetallen bij diverse maten en geld.', gen: () => breukKommaV() },
      { doel: 'Je leert de maten kilometer, hectometer, meter, decimeter, centimeter en millimeter omrekenen.', gen: () => { const m = rnd(2, 9), cm = rnd(10, 90); return { vraag: `Een plank is ${m} m en ${cm} cm lang. Hoeveel centimeter is dat in totaal?`, antwoord: m * 100 + cm, eenheid: 'cm', uitleg: `${m} m = ${m * 100} cm. ${m * 100} + ${cm} = ${m * 100 + cm} cm` } } },
    ],
    7: [
      { doel: 'Je leert sommen als 454 - 237 cijferend of kolomsgewijs aftrekken en je begrijpt wat je opschrijft.', gen: () => { const a = rnd(360, 980), b = rnd(140, a - 100); return aftrekV(a, b) } },
      { doel: 'Je leert sommen als 432 - 263 en 402 - 267 cijferend of kolomsgewijs aftrekken.', gen: () => { const a = rnd(400, 920), b = rnd(240, a - 80); return aftrekV(a, b) } },
      { doel: 'Je leert een deel van een geheel berekenen (zoals 1/4 van 20).', gen: () => deelVanGeheelV() },
      { doel: 'Je leert een datum opschrijven en ermee rekenen (dag-maand-jaar).', gen: () => datumV() },
    ],
    8: [
      { doel: 'Je leert sommen als 30 × 40 uitrekenen met de kleine som.', gen: () => keerV(rnd(2, 9) * 10, rnd(2, 9) * 10) },
      { doel: 'Je leert sommen als 6 × 284 kolomsgewijs uit te rekenen en je begrijpt wat je opschrijft.', gen: () => keerV(rnd(3, 9), rnd(110, 450 + M * 240)) },
      { doel: 'Je leert benoemde kommagetallen t/m honderdsten plaatsen en aflezen op de getallenlijn.', gen: () => breukKommaV() },
      { doel: 'Je leert de inhoud aflezen en de maten liter, deciliter, centiliter en milliliter omrekenen.', gen: () => { const l = rnd(1, 9), dl = rnd(1, 9); return { vraag: `Een fles bevat ${l} liter en ${dl} dl. Hoeveel deciliter is dat in totaal?`, antwoord: l * 10 + dl, eenheid: 'dl', uitleg: `${l} l = ${l * 10} dl. ${l * 10} + ${dl} = ${l * 10 + dl} dl` } } },
    ],
    9: [
      { doel: 'Je leert sommen als 138 : 3 uitrekenen met de basisstrategie: splitsen.', gen: () => deelV(rnd(2, 9), rnd(40, 150)) },
      { doel: 'Je leert sommen als 3 × 67 uitrekenen met de basisstrategie: splitsen.', gen: () => keerV(rnd(3, 9), rnd(41, 89)) },
      { doel: 'Je leert een deel van een geheel berekenen (zoals 3/4 van 100).', gen: () => deelVanGeheelV() },
      { doel: 'Je leert de omtrek en de oppervlakte berekenen van een figuur met maten in centimeters of meters.', gen: () => { const l = rnd(3, 12 + M * 8), b = rnd(2, 8 + M * 7); return { vraag: `Een speelveld is ${l} m lang en ${b} m breed. Hoeveel meter is de omtrek (alle kanten samen)?`, antwoord: 2 * (l + b), eenheid: 'm', figuur: { type: 'rechthoek', l, b, eenheid: 'm' }, uitleg: `2 × (${l} + ${b}) = 2 × ${l + b} = ${2 * (l + b)} m` } } },
    ],
    10: [
      { doel: 'Je leert schattend vermenigvuldigen en delen in rekenverhalen met geld.', gen: () => schattenV() },
      { doel: 'Je leert sommen als 4 × 231 en 4 × 536 cijferend of kolomsgewijs uitrekenen, en je begrijpt wat je opschrijft.', gen: () => keerV(rnd(3, 9), rnd(110, 590)) },
      { doel: 'Je leert benoemde en onbenoemde kommagetallen t/m duizendsten vergelijken en ordenen.', gen: () => breukKommaV() },
      { doel: 'Je leert rekenen met lijndiagrammen.', gen: () => diagramV('lijn', pick([5, 10]), rnd(3, 9)) },
    ],
  }
}

// ── Groep 8 (Pluspunt FS). Per blok, exacte doelen. ──
function maakGroep8(plus) {
  const opp = () => {
    if (Math.random() < 0.5) { const l = rnd(4, plus ? 30 : 16), b = rnd(3, plus ? 20 : 11); return { vraag: `Een tuin is ${l} m lang en ${b} m breed. Wat is de oppervlakte in m²?`, antwoord: l * b, eenheid: 'm²', figuur: { type: 'rechthoek', l, b, eenheid: 'm' }, uitleg: `${l} × ${b} = ${l * b} m²` } }
    const basis = rnd(2, plus ? 18 : 12) * 2, hoogte = rnd(3, plus ? 16 : 10)
    return { vraag: `Een driehoekig bord heeft een basis van ${basis} cm en een hoogte van ${hoogte} cm. Wat is de oppervlakte in cm²?`, antwoord: basis * hoogte / 2, eenheid: 'cm²', figuur: { type: 'driehoek', l: basis, b: hoogte, eenheid: 'cm' }, uitleg: `(${basis} × ${hoogte}) ÷ 2 = ${basis * hoogte} ÷ 2 = ${basis * hoogte / 2} cm²` }
  }
  const balk = () => { const l = rnd(2, plus ? 12 : 8), b = rnd(2, 6), h = rnd(2, 6); return { vraag: `Een bak is ${l} dm lang, ${b} dm breed en ${h} dm hoog. Hoeveel liter past erin?`, antwoord: l * b * h, eenheid: 'l', figuur: { type: 'balk', l, b, h, eenheid: 'dm' }, uitleg: `${l} × ${b} × ${h} = ${l * b * h} dm³ = ${l * b * h} liter` } }
  const omtrek = () => { const l = rnd(4, plus ? 30 : 16), b = rnd(3, plus ? 20 : 11); return { vraag: `Een veld is ${l} m lang en ${b} m breed. Hoeveel meter is de omtrek?`, antwoord: 2 * (l + b), eenheid: 'm', figuur: { type: 'rechthoek', l, b, eenheid: 'm' }, uitleg: `2 × (${l} + ${b}) = ${2 * (l + b)} m` } }
  const korting = () => { const prijs = rnd(10, plus ? 200 : 90), p = pick([10, 20, 25, 50]), nieuw = +(prijs * (1 - p / 100)).toFixed(2); return { vraag: `Een jas kost ${euro(prijs)}. Je krijgt ${p}% korting. Wat is de nieuwe prijs?`, antwoord: nieuw, eenheid: '€', uitleg: `Korting: ${p}% van ${euro(prijs)} = ${euro(prijs * p / 100)}. ${euro(prijs)} − ${euro(prijs * p / 100)} = ${euro(nieuw)}` } }
  const gewicht = () => { const g = pick([250, 500, 750]), n = rnd(3, plus ? 12 : 7), totaal = g * n; return { vraag: `Je koopt ${n} pakken kaas van ${g} gram. Hoeveel kilogram kaas is dat samen?`, antwoord: totaal / 1000, eenheid: 'kg', uitleg: `${n} × ${g} g = ${totaal} g = ${komma(totaal / 1000)} kg` } }
  const samengesteld = () => { const perKg = rnd(150, 900) / 100, kg = rnd(2, plus ? 9 : 6); return { vraag: `Vlees kost ${euro(perKg)} per kilogram. Hoeveel kost ${kg} kg?`, antwoord: +(perKg * kg).toFixed(2), eenheid: '€', uitleg: `${kg} × ${euro(perKg)} = ${euro(perKg * kg)}` } }
  const totaalViaPct = () => { const p = pick([10, 20, 25, 50]), totaal = rnd(2, 10) * 20, deel = totaal * p / 100; return { vraag: `${deel} kinderen is ${p}% van alle kinderen op school. Hoeveel kinderen zitten er in totaal op school?`, antwoord: totaal, uitleg: `${p}% = ${deel}, dus 100% = ${deel} ÷ ${p} × 100 = ${totaal}` } }
  const kommaAppelDeel = () => { const deler = rnd(15, 95) / 10, q = rnd(2, plus ? 14 : 9), deeltal = +(deler * q).toFixed(2); return { vraag: `${komma(deeltal)} kg appels wordt verdeeld in zakken van ${komma(deler)} kg. Hoeveel zakken kun je vullen?`, antwoord: q, uitleg: `${komma(deeltal)} : ${komma(deler)} = ${q}` } }
  const tijdsduur = () => { const h1 = rnd(7, 11), m1 = pick([0, 5, 10, 15, 20, 25, 40, 45]), dur = rnd(4, plus ? 12 : 8) * 15, tot = h1 * 60 + m1 + dur, h2 = Math.floor(tot / 60), m2 = tot % 60; return { vraag: `Een wedstrijd begint om ${h1}:${PAD(m1)} uur en eindigt om ${h2}:${PAD(m2)} uur. Hoeveel minuten duurt de wedstrijd?`, antwoord: dur, uitleg: `Van ${h1}:${PAD(m1)} tot ${h2}:${PAD(m2)} = ${dur} minuten` } }
  const kommaOptel = () => { const p1 = rnd(150, plus ? 8000 : 3000) / 100, p2 = rnd(150, 3000) / 100, n = naam(); return { vraag: `${n} koopt een tas van ${euro(p1)} en een pet van ${euro(p2)}. Hoeveel betaalt ${n} samen?`, antwoord: +(p1 + p2).toFixed(2), eenheid: '€', uitleg: `${euro(p1)} + ${euro(p2)} = ${euro(p1 + p2)}` } }
  return {
    1: [
      { doel: 'Je leert in welke volgorde je moet vermenigvuldigen, delen, optellen en aftrekken.', gen: () => volgordeV() },
      { doel: 'Je leert delen met kommagetallen bij sommen als 18,88 : 5,9.', gen: () => kommaAppelDeel() },
      { doel: 'Je leert het totaal uitrekenen aan de hand van een percentage.', gen: () => totaalViaPct() },
      { doel: 'Je leert de tijd uitrekenen van een plaats in een andere tijdzone.', gen: () => tijdzoneV() },
    ],
    2: [
      { doel: 'Je leert heel grote getallen op 2 manieren schrijven: 1,2 miljard en 1.200.000.000.', gen: () => grootGetalV() },
      { doel: 'Je herhaalt het optellen en aftrekken van benoemde kommagetallen.', gen: () => kommaOptel() },
      { doel: 'Je leert hoe je handig verhoudingsproblemen op kunt lossen.', gen: () => verhoudingV() },
      { doel: 'Je leert hoe je met een schaallijntje een lengte op schaal omrekent naar een lengte in het echt.', gen: () => schaalV() },
    ],
    3: [
      { doel: 'Je leert bewerkingen schattend uitrekenen, in contexten waarbij het zinvol is om te schatten.', gen: () => schattenV() },
      { doel: 'Je herhaalt het berekenen van een deel van een hoeveelheid.', gen: () => deelVanGeheelV() },
      { doel: 'Je leert redeneren over uitspraken met percentages.', gen: () => procentRedeneerV() },
      { doel: 'Je leert rekenen met alle maten voor gewicht in verhaalsommen.', gen: () => gewicht() },
    ],
    4: [
      { doel: 'Je herhaalt cijferend of kolomsgewijs optellen en aftrekken.', gen: () => optelV(rnd(1000, 9000), rnd(1000, 9000)) },
      { doel: 'Je leert problemen oplossen met breuken door te tekenen of op de getallenlijn.', gen: () => deelVanGeheelV() },
      { doel: 'Je leert rekenen met breuken, kommagetallen, procenten en verhoudingen bij aanbiedingen.', gen: () => korting() },
      { doel: 'Je leert berekeningen maken met samengestelde grootheden, zoals de prijs per gewicht.', gen: () => samengesteld() },
    ],
    5: [
      { doel: 'Je leert herkennen wanneer een getal deelbaar is door 2, 10, 5 of 4.', gen: () => restV() },
      { doel: 'Je herhaalt sommen als 18,6 kg : 3 uitrekenen.', gen: () => kommaDeelV() },
      { doel: 'Je leert contextproblemen over procenten, verhoudingen, breuken en kommagetallen oplossen.', gen: () => procentRedeneerV() },
      { doel: 'Je herhaalt de oppervlakte berekenen van rechthoeken en driehoeken.', gen: () => opp() },
    ],
    6: [
      { doel: 'Je herhaalt het rekenen met een schaallijntje.', gen: () => schaalV() },
      { doel: 'Je herhaalt het berekenen van de inhoud van een balk in dm³ en liter.', gen: () => balk() },
      { doel: 'Je herhaalt getallen tot in de miljarden op de getallenlijn plaatsen.', gen: () => getallenlijnV(rnd(0, 5) * 1000000000, 5000000000, 500000000) },
      { doel: 'Je herhaalt het berekenen van de omtrek van een figuur.', gen: () => omtrek() },
    ],
    7: [
      { doel: 'Je herhaalt het koppelen van 5% of 10% (en veelvouden) aan een getal.', gen: () => procentVanV() },
      { doel: 'Je herhaalt benoemde gelijknamige breuken optellen.', gen: () => breukOptelGelijkV() },
      { doel: 'Je leert contextproblemen over procenten, verhoudingen, breuken en kommagetallen oplossen.', gen: () => procentRedeneerV() },
      { doel: 'Je leert verhoudingsgewijs vergelijken met een verhoudingstabel.', gen: () => verhoudingV() },
    ],
    8: [
      { doel: 'Je herhaalt betekenis verlenen aan getallen tot in de miljarden.', gen: () => grootGetalV() },
      { doel: 'Je herhaalt het gemiddelde berekenen met hoofdrekenen.', gen: () => gemiddeldeV() },
      { doel: 'Je leert getallen afronden volgens de afrondregels.', gen: () => afrondV(plus ? 98000 : 9800, plus ? [10, 100, 1000] : [10, 100]) },
      { doel: 'Je herhaalt een heel getal met een benoemde breuk vermenigvuldigen.', gen: () => breukMaalHeelV() },
    ],
    9: [
      { doel: 'Je herhaalt hoofdrekenend optellen en aftrekken.', gen: () => optelV(rnd(1000, 9000), rnd(1000, 9000)) },
      { doel: 'Je herhaalt in welke volgorde je moet optellen, aftrekken, vermenigvuldigen en delen.', gen: () => volgordeV() },
      { doel: 'Je herhaalt kolomsgewijs delen in maximaal 3 stappen (met rest).', gen: () => { const deler = rnd(13, 29); return deelRestV(deler, rnd(15, plus ? 99 : 49), rnd(1, deler - 1)) } },
      { doel: 'Je leert ontbinden in priemgetallen.', gen: () => priemV() },
    ],
    10: [
      { doel: 'Je herhaalt het werken met staafdiagrammen.', gen: () => diagramV('staaf', pick([5, 10]), rnd(3, 9)) },
      { doel: 'Je herhaalt het werken met eenvoudige lijndiagrammen.', gen: () => diagramV('lijn', pick([5, 10]), rnd(3, 9)) },
      { doel: 'Je leert de tijdsduur tussen 2 tijdstippen berekenen in uren en minuten.', gen: () => tijdsduur() },
      { doel: 'Je herhaalt het uitrekenen van percentages van een getal.', gen: () => procentVanV() },
    ],
  }
}

// ── Curriculum per groep en route ──
const CURR = {
  5: { single: maakGroep5() },
  6: { 'FS': maakGroep6(false), 'S+': maakGroep6(true) },
  7: { 'FS': maakBlokken(false), 'S+': maakBlokken(true) },
  8: { 'FS': maakGroep8(false), 'S+': maakGroep8(true) },
}
const blokkenVan = (groep, route) => groep === 5 ? CURR[5].single : (CURR[groep][route] || CURR[groep]['FS'])
const flatGens = (blokken, groep) => {
  const a = []
  for (const nr of Object.keys(blokken)) for (const g of blokken[nr]) a.push({ groep, doel: g.doel, gen: g.gen })
  return a
}

export const GROEPEN = [5, 6, 7, 8]
export const HEEFT_ROUTE = (groep) => groep !== 5   // groep 5 heeft geen FS/S+

// Aanvinkbare onderdelen van een groep (per blok). Groep 7 krijgt extra
// herhaal-onderdelen voor groep 5 en 6, zodat je alles door elkaar kunt oefenen.
export function onderdelenVan(groep, route) {
  const blokken = blokkenVan(groep, route)
  const maakItem = (key, label, gens, herhaling) => ({
    key, label, herhaling,
    // elk doel krijgt een eigen, stabiele sleutel zodat je losse doelen kunt aanvinken
    gens: gens.map((g, i) => ({ key: `${key}#${i}`, ...g })),
  })
  const items = Object.keys(blokken).map(nr =>
    maakItem('blok-' + nr, 'Blok ' + nr,
      blokken[nr].map(g => ({ groep, blok: +nr, doel: g.doel, gen: g.gen })), false))
  const vorige = { 6: [5], 7: [5, 6], 8: [5, 6, 7] }[groep] || []
  for (const v of vorige) {
    const bl = v === 5 ? CURR[5].single : blokkenVan(v, route)
    items.push(maakItem('herh-' + v, '🔁 Herhaling groep ' + v, flatGens(bl, v), true))
  }
  return items
}

// Eén verse opgave uit de gekozen onderdelen (alles door elkaar)
export function maakOpgaveUit(onderdelen) {
  const kandidaten = []
  for (const o of onderdelen) for (const g of o.gens) kandidaten.push(g)
  if (!kandidaten.length) return null
  const c = pick(kandidaten)
  return { groep: c.groep, blok: c.blok, ...c.gen(), doel: c.doel }
}

// Toets: voor elk gekozen jaar één verse som per doel (FS-traject), op volgorde.
export function maakToets(jaren) {
  const out = []
  for (const groep of [...jaren].sort((a, b) => a - b)) {
    const blokken = blokkenVan(groep, 'FS'), seen = new Set()
    for (const nr of Object.keys(blokken)) for (const g of blokken[nr]) {
      if (seen.has(g.doel)) continue
      seen.add(g.doel)
      out.push({ groep, blok: +nr, doel: g.doel, ...g.gen() })
    }
  }
  return out
}

// Volledige doelen-catalogus per groep (voor het overzicht; ook niet-gemaakte).
function bouwCatalogus() {
  const uniq = (arr) => [...new Set(arr)]
  return GROEPEN.map(groep => {
    const blokken = blokkenVan(groep, 'FS')
    const doelen = []
    for (const nr of Object.keys(blokken)) for (const g of blokken[nr]) doelen.push(g.doel)
    return { groep, doelen: uniq(doelen) }
  })
}
export const GROEP_DOELEN = bouwCatalogus()
export const doelKey = (groep, doel) => `g${groep}::${doel}`

// Evalueer de ingevulde som (bijv. "5000 + 923" of "12 × 8 = 96").
// Geeft true als de som rekenkundig op het juiste antwoord uitkomt.
// Telt NIET mee voor goed/fout (dat doet alleen het antwoord), enkel feedback.
export function checkSom(input, antwoord) {
  if (!input || !String(input).trim()) return null   // niets ingevuld
  let s = String(input).toLowerCase()
  if (s.includes('=')) s = s.split('=').filter(p => p.trim()).pop() || s   // neem deel na laatste =
  s = s.replace(/€|euro|km\/u|km|m²|m2|cm|dm|mm|kg|liter|min|uur/g, '')
       .replace(/\bm\b/g, '').replace(/\bg\b/g, '').replace(/\bl\b/g, '')
       .replace(/×/g, '*').replace(/[x·]/g, '*').replace(/[÷:]/g, '/')
       .replace(/\.(?=\d{3}\b)/g, '').replace(/,/g, '.').replace(/\s/g, '')
  if (!/^[0-9+\-*/().]+$/.test(s)) return false
  try {
    // eslint-disable-next-line no-new-func
    const v = Function(`"use strict";return (${s})`)()
    if (typeof v !== 'number' || Number.isNaN(v)) return false
    return Math.abs(v - antwoord) < 0.005
  } catch { return false }
}

// Antwoord normaliseren en vergelijken (tolerantie voor afronding)
export function checkAntwoord(input, antwoord) {
  if (input == null) return false
  const s = String(input).toLowerCase()
    .replace(/€|euro|km\/u|km|m²|m2|cm|kg|liter|min|uur|%/g, '')
    .replace(/\bm\b/g, '').replace(/\bg\b/g, '')
    .replace(/\./g, '').replace(/\s/g, '').replace(',', '.')
  const v = parseFloat(s)
  if (Number.isNaN(v)) return false
  return Math.abs(v - antwoord) < 0.005
}

// Tijd-antwoord vergelijken (klok). Accepteert 3:25, 3.25, 15:25, "3 uur 25".
export function checkTijd(input, h, m) {
  if (!input) return false
  const s = String(input).toLowerCase().replace(/uur|u\b/g, ' ')
  const mm = s.match(/(\d{1,2})\s*[:.\s]\s*(\d{1,2})/)
  if (mm) return (+mm[1]) % 12 === h % 12 && (+mm[2]) === m
  const one = s.match(/\d{1,2}/)
  if (one && m === 0) return (+one[0]) % 12 === h % 12
  return false
}
