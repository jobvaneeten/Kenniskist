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
      { doel: 'Je leert sommen als 35.400 + 3500 en 56.700 - 2400 uitrekenen.', gen: () => {
        const a = rnd(12, 89) * 1000 + rnd(1, 9) * 100
        const b = rnd(15, 49) * 100
        return { vraag: `Op de spaarrekening van ${naam()} staat € ${getal(a)}. Er komt € ${getal(b)} bij. Hoeveel staat er nu op de rekening?`,
                 antwoord: a + b, uitleg: `${getal(a)} + ${getal(b)} = ${getal(a + b)}` }
      }},
      { doel: 'Je leert sommen als 50 × 7000 en 24.000 : 600 uitrekenen met de kleine som.', gen: () => {
        const t1 = rnd(2, 9) * 10
        const t2 = rnd(2, 9) * (plus ? 1000 : 100)
        return { vraag: `Een magazijn heeft ${t1} pallets. Op elke pallet liggen ${getal(t2)} flessen. Hoeveel flessen zijn er in totaal?`,
                 antwoord: t1 * t2, uitleg: `${t1} × ${getal(t2)} = ${getal(t1 * t2)}` }
      }},
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
      { doel: 'Je leert hoofdrekenend optellen en aftrekken met eenvoudige benoemde kommagetallen.', gen: () => {
        const p1 = rnd(150, plus ? 8000 : 3000) / 100, p2 = rnd(150, 3000) / 100
        const n = naam()
        return { vraag: `${n} koopt een boek van ${euro(p1)} en een pen van ${euro(p2)}. Hoeveel betaalt ${n} samen?`,
                 antwoord: +(p1 + p2).toFixed(2), eenheid: '€', uitleg: `${euro(p1)} + ${euro(p2)} = ${euro(p1 + p2)}` }
      }},
    ],
    3: [
      { doel: 'Je leert cijferend of kolomsgewijs optellen en aftrekken met benoemde kommagetallen.', gen: () => {
        const prijs = rnd(500, plus ? 9000 : 4000) / 100
        const betaald = Math.ceil(prijs / 5) * 5
        return { vraag: `Iets kost ${euro(prijs)}. ${naam()} betaalt met ${euro(betaald)}. Hoeveel wisselgeld krijgt hij terug?`,
                 antwoord: +(betaald - prijs).toFixed(2), eenheid: '€', uitleg: `${euro(betaald)} − ${euro(prijs)} = ${euro(betaald - prijs)}` }
      }},
      { doel: 'Je leert maten voor lengte vergelijken, ordenen, omrekenen en optellen met hele getallen.', gen: () => {
        const km = rnd(2, plus ? 25 : 9), m = rnd(50, 950)
        return { vraag: `Een route is ${km} km en ${m} m lang. Hoeveel meter is de route in totaal?`,
                 antwoord: km * 1000 + m, eenheid: 'm', uitleg: `${km} km = ${getal(km * 1000)} m. ${getal(km * 1000)} + ${m} = ${getal(km * 1000 + m)} m` }
      }},
    ],
    4: [
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
      { doel: 'Je leert een deel van hoeveelheden omrekenen naar 5%, 10%, 25%, 50%, 75% en 100%.', gen: () => {
        const p = pick([5, 10, 25, 50, 75]), per = 100 / p
        const n = Math.round(rnd(2, plus ? 12 : 8)) * per
        return { vraag: `Op het schoolplein staan ${n} kinderen. ${p}% gaat naar binnen. Hoeveel kinderen zijn dat?`,
                 antwoord: n * p / 100, uitleg: `${p}% van ${n} = ${n} ÷ ${per} = ${n * p / 100}` }
      }},
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
      { doel: 'Je leert percentages uitrekenen via 1%.', gen: () => {
        const bedrag = rnd(2, 20) * 100, p = rnd(2, 9) * (plus ? 1 : 5)
        return { vraag: `Van de ${euro(bedrag)} spaar je ${p}%. Hoeveel euro spaar je?`,
                 antwoord: +(bedrag * p / 100).toFixed(2), eenheid: '€', uitleg: `1% van ${getal(bedrag)} = ${euro(bedrag / 100)}. ${p} × ${euro(bedrag / 100)} = ${euro(bedrag * p / 100)}` }
      }},
    ],
    10: [
      { doel: 'Je leert vermenigvuldigen met kommagetallen, bij sommen als 2,9 × 8,1 en 24 × 0,67.', gen: () => {
        const a = rnd(110, 220) / 100, liter = rnd(20, plus ? 600 : 250) / 10
        return { vraag: `1 liter benzine kost ${euro(a)}. Je tankt ${komma(liter)} liter. Hoeveel betaal je?`,
                 antwoord: +(a * liter).toFixed(2), eenheid: '€', uitleg: `${komma(liter)} × ${euro(a)} = ${euro(a * liter)}` }
      }},
    ],
  }
}

// ── Verhaal-bouwers: geven {vraag, antwoord, uitleg} terug ──
const optelV = (a, b) => {
  const n = naam(), d = ding()
  return {
    vraag: pick([
      `${n} heeft ${getal(a)} ${d[1]} en krijgt er ${getal(b)} bij. Hoeveel ${d[1]} heeft ${n} nu?`,
      `In de winkel liggen ${getal(a)} ${d[1]}. Er komen er ${getal(b)} bij. Hoeveel ${d[1]} zijn het samen?`,
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
    ]),
    antwoord: a * b, uitleg: `${a} × ${getal(b)} = ${getal(a * b)}`,
  }
}
const deelV = (deler, q) => {   // exact, antwoord = q
  const totaal = deler * q, d = ding()
  return {
    vraag: pick([
      `${getal(totaal)} ${d[1]} worden eerlijk verdeeld over ${deler} kinderen. Hoeveel krijgt ieder kind?`,
      `Je hebt ${getal(totaal)} ${d[1]} en ${deler} dozen. Hoeveel ${d[1]} gaan er in elke doos?`,
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

// ── Groep 5 (Pluspunt). Eén traject (geen FS/S+). Per blok, exacte doelen. ──
function maakGroep5() {
  return {
    1: [
      { doel: 'Je leert alle tafelsommen vlot maken.', gen: () => keerV(rnd(2, 10), rnd(2, 10)) },
    ],
    2: [
      { doel: 'Je leert keersommen uitrekenen met behulp van de kleine som.', gen: () => keerV(rnd(2, 9), rnd(2, 9) * 10) },
      { doel: 'Je leert bij een deelverhaal of een plaatje een deelsom bedenken.', gen: () => deelV(rnd(2, 5), rnd(2, 9)) },
    ],
    3: [
      { doel: 'Je leert optellen tot en met 1000 met de strategie: rijgen, bij sommen als 380 + 200 en 380 + 160.', gen: () => optelV(rnd(11, 80) * 10, rnd(2, 8) * 20) },
      { doel: 'Je leert sommen als 3 × 14 uitrekenen met de basisstrategie: splitsen.', gen: () => keerV(rnd(2, 9), rnd(11, 19)) },
    ],
    4: [
      { doel: 'Je leert aftrekken tot en met 1000 met de strategie: rijgen, bij sommen als 580 - 200 en 540 - 160.', gen: () => { const a = rnd(30, 95) * 10, b = rnd(2, 8) * 20; return aftrekV(a, Math.min(b, a - 20)) } },
      { doel: 'Je leert sommen als 4 × 67 uitrekenen met de basisstrategie: splitsen.', gen: () => keerV(rnd(3, 9), rnd(41, 89)) },
      { doel: 'Je leert bedragen tot en met 100 euro maken en schrijven met het euroteken en een komma.', gen: () => geldOptelV() },
    ],
    5: [
      { doel: 'Je leert optellen en aftrekken tot en met 1000 in maximaal 3 sprongen met de strategie: rijgen, bij sommen als 246 + 37 en 482 - 46.', gen: () => { const a = rnd(120, 880), b = rnd(20, 90); return Math.random() < 0.5 ? optelV(a, b) : aftrekV(a, b) } },
      { doel: 'Je leert optellen tot en met 1000 in maximaal 2 sprongen met de strategie: rijgen, bij sommen als 486 + 50.', gen: () => optelV(rnd(120, 880), rnd(2, 9) * 10) },
      { doel: 'Je leert een deelsom uitrekenen met een keersom en je begrijpt waarom dit mag.', gen: () => deelV(rnd(2, 8), rnd(3, 9)) },
    ],
    6: [
      { doel: 'Je leert aftrekken tot en met 1000 in maximaal 2 sprongen met de strategie: rijgen, bij sommen als 434 - 70.', gen: () => { const a = rnd(150, 900), b = rnd(2, 9) * 10; return aftrekV(a, b) } },
      { doel: 'Je leert sommen als 67 × 4 uitrekenen door eerst om te keren en dan te rekenen met de basisstrategie: splitsen.', gen: () => keerV(rnd(3, 9), rnd(41, 89)) },
      { doel: 'Je leert een deelsom met rest uitrekenen met een keersom en je begrijpt waarom dit mag.', gen: () => { const deler = rnd(3, 9); return deelRestV(deler, rnd(8, 40), rnd(1, deler - 1)) } },
    ],
    7: [
      { doel: 'Je leert optellen tot en met 1000 met de basisstrategie: splitsen, bij sommen als 435 + 220 en 435 + 224.', gen: () => optelV(rnd(120, 560), rnd(110, 430)) },
      { doel: 'Je leert aftrekken tot en met 1000 met de basisstrategie: splitsen, bij sommen als 687 - 450 en 687 - 456.', gen: () => { const a = rnd(450, 950), b = rnd(150, a - 100); return aftrekV(a, b) } },
      { doel: 'Je leert deelsommen zonder rest vlot uitrekenen met de keersom als hulpsom.', gen: () => deelV(rnd(2, 9), rnd(3, 12)) },
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
      { doel: 'Je leert millimeter (mm), centimeter (cm) en decimeter (dm) met elkaar vergelijken.', gen: () => { const cm = rnd(3, 20), mm = rnd(1, 9); return { vraag: `Een potlood is ${cm} cm en ${mm} mm lang. Hoeveel millimeter is dat in totaal?`, antwoord: cm * 10 + mm, eenheid: 'mm', uitleg: `${cm} cm = ${cm * 10} mm. ${cm * 10} + ${mm} = ${cm * 10 + mm} mm` } } },
    ],
    10: [
      { doel: 'Je leert handig rekenen bij een lange optelsom en aftreksom.', gen: () => { const a = rnd(20, 90) * 10, b = rnd(15, 60) * 10, c = rnd(10, 40) * 10, d = ding(); return { vraag: `In 3 dozen zitten ${getal(a)}, ${getal(b)} en ${getal(c)} ${d[1]}. Hoeveel ${d[1]} samen?`, antwoord: a + b + c, uitleg: `${getal(a)} + ${getal(b)} + ${getal(c)} = ${getal(a + b + c)}` } } },
      { doel: 'Je leert sommen als 4 × 35 uitrekenen met de variastrategie: halveren en verdubbelen.', gen: () => keerV(rnd(2, 8), rnd(3, 9) * 5) },
      { doel: 'Je leert sommen als 72 : 3 uitrekenen met de basisstrategie: splitsen.', gen: () => deelV(rnd(2, 6), rnd(11, 40)) },
    ],
  }
}

// ── Groep 6 (Pluspunt FS). Per blok, exacte doelen. ──
function maakGroep6(plus) {
  const M = plus ? 1 : 0
  return {
    1: [
      { doel: 'Je leert sommen als 1200 + 1300, 4500 - 1200, 3 × 700 en 4500 : 9 vlot uitrekenen door te rekenen met de kleine som.', gen: () => {
        const k = rnd(1, 4)
        if (k === 1) return optelV(rnd(11, 80) * 100, rnd(11, 40) * 100)
        if (k === 2) { const a = rnd(25, 90) * 100, b = rnd(11, Math.floor(a / 100) - 5) * 100; return aftrekV(a, b) }
        if (k === 3) return keerV(rnd(2, 9), rnd(2, 9) * 100)
        return deelV(rnd(2, 9), rnd(2, 9) * 100)
      } },
    ],
    2: [
      { doel: 'Je leert sommen als 368 + 257 kolomsgewijs optellen en je begrijpt wat je opschrijft.', gen: () => optelV(rnd(140, 680 + M * 200), rnd(140, 680)) },
    ],
    3: [
      { doel: 'Je leert getallen afronden op tientallen, honderdtallen en duizendtallen.', gen: () => afrondV(9800, [10, 100, 1000]) },
      { doel: 'Je leert sommen als 92 : 4 uitrekenen met de basisstrategie splitsen.', gen: () => deelV(rnd(3, 8), rnd(11, 30)) },
    ],
    4: [
      { doel: 'Je leert sommen als 432 + 257 cijferend of kolomsgewijs optellen en je begrijpt wat je opschrijft.', gen: () => optelV(rnd(140, 680), rnd(140, 560)) },
      { doel: 'Je leert sommen als 487 + 235 cijferend of kolomsgewijs optellen en je begrijpt wat je opschrijft.', gen: () => optelV(rnd(150, 690), rnd(150, 490)) },
    ],
    5: [
      { doel: 'Je leert sommen als 463 - 248 kolomsgewijs aftrekken en je begrijpt wat je opschrijft.', gen: () => { const a = rnd(360, 980), b = rnd(140, a - 100); return aftrekV(a, b) } },
    ],
    6: [
      { doel: 'Je leert sommen als 826 : 9 (met rest) uitrekenen met de basisstrategie splitsen.', gen: () => { const deler = rnd(3, 9); return deelRestV(deler, rnd(40, 99), rnd(1, deler - 1)) } },
      { doel: 'Je leert de maten kilometer, hectometer, meter, decimeter, centimeter en millimeter omrekenen.', gen: () => { const m = rnd(2, 9), cm = rnd(10, 90); return { vraag: `Een plank is ${m} m en ${cm} cm lang. Hoeveel centimeter is dat in totaal?`, antwoord: m * 100 + cm, eenheid: 'cm', uitleg: `${m} m = ${m * 100} cm. ${m * 100} + ${cm} = ${m * 100 + cm} cm` } } },
      { doel: 'Je leert de omtrek van een figuur berekenen.', gen: () => { const l = rnd(3, 12 + M * 8), b = rnd(2, 8 + M * 7); return { vraag: `Een speelveld is ${l} m lang en ${b} m breed. Hoeveel meter is de omtrek (alle kanten samen)?`, antwoord: 2 * (l + b), eenheid: 'm', figuur: { type: 'rechthoek', l, b, eenheid: 'm' }, uitleg: `2 × (${l} + ${b}) = 2 × ${l + b} = ${2 * (l + b)} m` } } },
    ],
    7: [
      { doel: 'Je leert sommen als 454 - 237 cijferend of kolomsgewijs aftrekken en je begrijpt wat je opschrijft.', gen: () => { const a = rnd(360, 980), b = rnd(140, a - 100); return aftrekV(a, b) } },
      { doel: 'Je leert sommen als 432 - 263 en 402 - 267 cijferend of kolomsgewijs aftrekken.', gen: () => { const a = rnd(400, 920), b = rnd(240, a - 80); return aftrekV(a, b) } },
    ],
    8: [
      { doel: 'Je leert sommen als 30 × 40 uitrekenen met de kleine som.', gen: () => keerV(rnd(2, 9) * 10, rnd(2, 9) * 10) },
      { doel: 'Je leert sommen als 1500 : 30 uitrekenen met de kleine som.', gen: () => deelV(rnd(2, 9) * 10, rnd(2, 9) * 10) },
      { doel: 'Je leert sommen als 6 × 284 kolomsgewijs uit te rekenen en je begrijpt wat je opschrijft.', gen: () => keerV(rnd(3, 9), rnd(110, 450 + M * 240)) },
    ],
    9: [
      { doel: 'Je leert sommen als 138 : 3 uitrekenen met de basisstrategie: splitsen.', gen: () => deelV(rnd(2, 9), rnd(40, 150)) },
      { doel: 'Je leert sommen als 3 × 67 uitrekenen met de basisstrategie: splitsen.', gen: () => keerV(rnd(3, 9), rnd(41, 89)) },
    ],
    10: [
      { doel: 'Je leert sommen als 4 × 231 en 4 × 536 cijferend of kolomsgewijs uitrekenen, en je begrijpt wat je opschrijft.', gen: () => keerV(rnd(3, 9), rnd(110, 590)) },
    ],
  }
}

// ── Groep 8 (Pluspunt FS). Per blok, exacte doelen. ──
function maakGroep8(plus) {
  return {
    1: [
      { doel: 'Je leert delen met kommagetallen bij sommen als 18,88 : 5,9.', gen: () => { const deler = rnd(15, 95) / 10, q = rnd(2, plus ? 14 : 9), deeltal = +(deler * q).toFixed(2); return { vraag: `${komma(deeltal)} kg appels wordt verdeeld in zakken van ${komma(deler)} kg. Hoeveel zakken kun je vullen?`, antwoord: q, uitleg: `${komma(deeltal)} : ${komma(deler)} = ${q}` } } },
      { doel: 'Je leert het totaal uitrekenen aan de hand van een percentage.', gen: () => { const p = pick([10, 20, 25, 50]), totaal = rnd(2, 10) * 20, deel = totaal * p / 100; return { vraag: `${deel} kinderen is ${p}% van alle kinderen op school. Hoeveel kinderen zitten er in totaal op school?`, antwoord: totaal, uitleg: `${p}% = ${deel}, dus 100% = ${deel} ÷ ${p} × 100 = ${totaal}` } } },
      { doel: 'Je leert de tijdsduur tussen 2 tijdstippen berekenen in uren en minuten.', gen: () => { const h1 = rnd(7, 11), m1 = pick([0, 5, 10, 15, 20, 25, 40, 45]), dur = rnd(4, plus ? 12 : 8) * 15, tot = h1 * 60 + m1 + dur, h2 = Math.floor(tot / 60), m2 = tot % 60; return { vraag: `Een wedstrijd begint om ${h1}:${String(m1).padStart(2, '0')} uur en eindigt om ${h2}:${String(m2).padStart(2, '0')} uur. Hoeveel minuten duurt de wedstrijd?`, antwoord: dur, uitleg: `Van ${h1}:${String(m1).padStart(2, '0')} tot ${h2}:${String(m2).padStart(2, '0')} = ${dur} minuten` } } },
    ],
    2: [
      { doel: 'Je leert getallen afronden volgens afrondregels, op tientallen, honderdtallen en duizendtallen.', gen: () => afrondV(plus ? 98000 : 9800, plus ? [10, 100, 1000] : [10, 100]) },
      { doel: 'Je leert hoe je met een schaallijntje een lengte op schaal omrekent naar een lengte in het echt, met kleine schalen.', gen: () => { const N = pick([100, 200, 500, 1000]), cm = rnd(2, 9); return { vraag: `Op een kaart met schaal 1 : ${N} is een weg ${cm} cm lang. Hoeveel meter is de weg in het echt?`, antwoord: cm * N / 100, eenheid: 'm', uitleg: `${cm} cm × ${N} = ${cm * N} cm = ${cm * N / 100} m` } } },
    ],
    3: [
      { doel: 'Je leert het oude aantal uitrekenen als je het percentage en het nieuwe aantal weet.', gen: () => { const oud = rnd(2, plus ? 30 : 16) * 10, p = pick([10, 20, 25, 50]), nieuw = oud * (1 - p / 100); return { vraag: `Na ${p}% korting betaal je ${euro(nieuw)}. Wat was de oude prijs?`, antwoord: oud, eenheid: '€', uitleg: `Je betaalt ${100 - p}% = ${euro(nieuw)}. 100% = ${euro(nieuw)} ÷ ${100 - p} × 100 = ${euro(oud)}` } } },
      { doel: 'Je leert rekenen met alle maten voor gewicht in verhaalsommen.', gen: () => { const g = pick([250, 500, 750]), n = rnd(3, plus ? 12 : 7), totaal = g * n; return { vraag: `Je koopt ${n} pakken kaas van ${g} gram. Hoeveel kilogram kaas is dat samen?`, antwoord: totaal / 1000, eenheid: 'kg', uitleg: `${n} × ${g} g = ${totaal} g = ${komma(totaal / 1000)} kg` } } },
    ],
    4: [
      { doel: 'Je leert de oppervlakte berekenen van rechthoeken en driehoeken met maten in cm, dm of m.', gen: () => {
        if (Math.random() < 0.5) { const l = rnd(4, plus ? 30 : 16), b = rnd(3, plus ? 20 : 11); return { vraag: `Een tuin is ${l} m lang en ${b} m breed. Wat is de oppervlakte in m²?`, antwoord: l * b, eenheid: 'm²', figuur: { type: 'rechthoek', l, b, eenheid: 'm' }, uitleg: `${l} × ${b} = ${l * b} m²` } }
        const basis = rnd(2, plus ? 18 : 12) * 2, hoogte = rnd(3, plus ? 16 : 10)
        return { vraag: `Een driehoekig bord heeft een basis van ${basis} cm en een hoogte van ${hoogte} cm. Wat is de oppervlakte in cm²?`, antwoord: basis * hoogte / 2, eenheid: 'cm²', figuur: { type: 'driehoek', l: basis, b: hoogte, eenheid: 'cm' }, uitleg: `(${basis} × ${hoogte}) ÷ 2 = ${basis * hoogte} ÷ 2 = ${basis * hoogte / 2} cm²` }
      } },
      { doel: 'Je leert de inhoud van een balk berekenen in dm³ en liter.', gen: () => { const l = rnd(2, plus ? 12 : 8), b = rnd(2, 6), h = rnd(2, 6); return { vraag: `Een bak is ${l} dm lang, ${b} dm breed en ${h} dm hoog. Hoeveel liter past erin?`, antwoord: l * b * h, eenheid: 'l', figuur: { type: 'balk', l, b, h, eenheid: 'dm' }, uitleg: `${l} × ${b} × ${h} = ${l * b * h} dm³ = ${l * b * h} liter` } } },
      { doel: 'Je leert de nieuwe prijs uitrekenen als je de oude prijs en het kortingspercentage weet.', gen: () => { const prijs = rnd(10, plus ? 200 : 90), p = pick([10, 20, 25, 50]), nieuw = +(prijs * (1 - p / 100)).toFixed(2); return { vraag: `Een jas kost ${euro(prijs)}. Je krijgt ${p}% korting. Wat is de nieuwe prijs?`, antwoord: nieuw, eenheid: '€', uitleg: `Korting: ${p}% van ${euro(prijs)} = ${euro(prijs * p / 100)}. ${euro(prijs)} − ${euro(prijs * p / 100)} = ${euro(nieuw)}` } } },
      { doel: 'Je leert berekeningen maken met samengestelde grootheden, zoals de prijs per oppervlakte of gewicht.', gen: () => { const perKg = rnd(150, 900) / 100, kg = rnd(2, plus ? 9 : 6); return { vraag: `Vlees kost ${euro(perKg)} per kilogram. Hoeveel kost ${kg} kg?`, antwoord: +(perKg * kg).toFixed(2), eenheid: '€', uitleg: `${kg} × ${euro(perKg)} = ${euro(perKg * kg)}` } } },
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
  const items = Object.keys(blokken).map(nr => ({
    key: 'blok-' + nr,
    label: 'Blok ' + nr,
    doelen: blokken[nr].map(g => g.doel),
    gens: blokken[nr].map(g => ({ groep, blok: +nr, doel: g.doel, gen: g.gen })),
  }))
  if (groep === 7) {
    items.push({ key: 'herh-5', label: '🔁 Herhaling groep 5', herhaling: true, doelen: [], gens: flatGens(CURR[5].single, 5) })
    items.push({ key: 'herh-6', label: '🔁 Herhaling groep 6', herhaling: true, doelen: [], gens: flatGens(blokkenVan(6, route), 6) })
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
