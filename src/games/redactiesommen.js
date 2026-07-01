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
    0: [
      { doel: 'Je leert sommen als 1200 + 1300 en 4500 - 1200 vlot uitrekenen met de kleine som, en sommen als 30 × 40 en 1500 : 30 met de kleine som.', gen: () => { const k = rnd(1, 4); if (k === 1) return optelV(rnd(11, 80) * 100, rnd(11, 40) * 100); if (k === 2) { const a = rnd(25, 90) * 100, b = rnd(11, Math.floor(a / 100) - 5) * 100; return aftrekV(a, b) } if (k === 3) return keerV(rnd(2, 9) * 10, rnd(2, 9) * 10); return deelV(rnd(2, 9) * 10, rnd(2, 9)) } },
      { doel: 'Je leert sommen als 487 + 235 cijferend optellen, 432 - 263 cijferend aftrekken en 4 × 231 cijferend uitrekenen.', gen: () => { const k = rnd(1, 3); if (k === 1) return optelV(rnd(150, 690), rnd(150, 490)); if (k === 2) { const a = rnd(400, 920), b = rnd(240, a - 80); return aftrekV(a, b) } return keerV(rnd(3, 9), rnd(110, 590)) } },
      { doel: 'Je leert benoemde kommagetallen plaatsen en aflezen, een deel van een geheel berekenen en berekenen wat het geheel is.', gen: () => Math.random() < 0.5 ? breukKommaV() : deelVanGeheelV() },
      { doel: 'Je leert de omtrek en de oppervlakte berekenen van een figuur met maten in centimeters of meters.', gen: () => Math.random() < 0.5 ? omtrekV(12 + M * 6, 9 + M * 5) : oppRechthoekV(12 + M * 8, 9 + M * 6) },
    ],
    1: [
      { doel: 'Je leert getallen tot en met 1 miljoen in cijfers schrijven, de waarde van de cijfers benoemen, en getallen op volgorde zetten, aflezen en schattend plaatsen op een getallenlijn.', gen: () => getallenlijnV(rnd(0, 5) * 100000, 500000, 50000) },
      { doel: 'Je leert sommen als 35.400 + 3500 en 56.700 - 2400 uitrekenen, en sommen als 50 × 7000 en 24.000 : 600 met de kleine som.', gen: () => {
        const a = rnd(12, 89) * 1000 + rnd(1, 9) * 100
        const b = rnd(15, 49) * 100
        return { vraag: `Op de spaarrekening van ${naam()} staat € ${getal(a)}. Er komt € ${getal(b)} bij. Hoeveel staat er nu op de rekening?`,
                 antwoord: a + b, uitleg: `${getal(a)} + ${getal(b)} = ${getal(a + b)}` }
      }},
      { doel: 'Je leert helen uit de breuk halen en benoemde breuken in een rekenverhaal met elkaar vergelijken en op volgorde zetten.', gen: () => breukHelenV() },
      { doel: 'Je leert de weeknotatie op een kalender gebruiken, de tijdsduur berekenen in dagen, uren en minuten, en een begintijd of eindtijd berekenen.', gen: () => {
        const h1 = rnd(8, 12), m1 = pick([0, 5, 10, 15, 20, 25, 30, 40, 45])
        const dur = rnd(2, 4) * 15 + rnd(0, 2) * 30
        const tot = h1 * 60 + m1 + dur, h2 = Math.floor(tot / 60), m2 = tot % 60
        return { vraag: `De trein vertrekt om ${h1}:${String(m1).padStart(2, '0')} uur en komt om ${h2}:${String(m2).padStart(2, '0')} uur aan. Hoeveel minuten duurt de reis?`,
                 antwoord: dur, eenheid: 'min', uitleg: `Van ${h1}:${String(m1).padStart(2, '0')} tot ${h2}:${String(m2).padStart(2, '0')} = ${dur} minuten` }
      }},
    ],
    2: [
      { doel: 'Je leert sommen als 12 × 64 cijferend uitrekenen of met de strategie splitsen en je begrijpt wat je opschrijft.', gen: () => {
        const a = rnd(12, plus ? 79 : 49), b = rnd(21, 89)
        return { vraag: `In de zaal staan ${a} rijen met ${b} stoelen. Hoeveel stoelen zijn er in totaal?`,
                 antwoord: a * b, uitleg: `${a} × ${b} = ${a * b}` }
      }},
      { doel: plus ? 'Je leert sommen als 22 × 64 en 65 × 36 cijferend uitrekenen.' : 'Je leert sommen als 22 × 64 cijferend uitrekenen of met splitsen, en je herhaalt sommen als 6 × 346.', gen: () => {
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
      { doel: 'Je leert met een schaallijntje een lengte op schaal omrekenen naar een lengte in het echt en je leert hoe je de schaal berekent.', gen: () => schaalV() },
    ],
    3: [
      { doel: 'Je leert betekenis geven aan hele grote getallen tot in de miljarden, deze in cijfers schrijven en op volgorde zetten, aflezen en schattend plaatsen op een getallenlijn.', gen: () => getallenlijnV(rnd(0, 5) * 1000000000, 5000000000, 500000000) },
      { doel: 'Je leert cijferend of kolomsgewijs optellen en aftrekken met benoemde kommagetallen.', gen: () => {
        const prijs = rnd(500, plus ? 9000 : 4000) / 100
        const betaald = Math.ceil(prijs / 5) * 5
        return { vraag: `Iets kost ${euro(prijs)}. ${naam()} betaalt met ${euro(betaald)}. Hoeveel wisselgeld krijgt hij terug?`,
                 antwoord: +(betaald - prijs).toFixed(2), eenheid: '€', uitleg: `${euro(betaald)} − ${euro(prijs)} = ${euro(betaald - prijs)}` }
      }},
      { doel: 'Je leert welke breuken gelijkwaardig zijn en benoemde gelijknamige en ongelijknamige breuken vergelijken.', gen: () => gelijkBreukV() },
      { doel: 'Je leert maten voor lengte vergelijken, ordenen, omrekenen en optellen met hele getallen.', gen: () => maatLengteV() },
    ],
    4: [
      { doel: 'Je leert sommen met een rekenmachine uitrekenen met eerst een passende schatting, en kiezen tussen hoofdrekenen en de rekenmachine.', gen: () => schattenV() },
      { doel: 'Je leert eenvoudige breuken omzetten in kommagetallen en omgekeerd, met en zonder rekenmachine.', gen: () => breukKommaV() },
      { doel: 'Je leert percentages aflezen en inkleuren in een strook of cirkel, en percentages aan breuken koppelen en uitrekenen.', gen: () => {
        const p = pick([10, 25, 50, 75]), per = 100 / p
        const n = Math.round(rnd(2, plus ? 9 : 6)) * per
        return { vraag: `In de klas zitten ${n} kinderen. ${p}% draagt een bril. Hoeveel kinderen dragen een bril?`,
                 antwoord: n * p / 100, uitleg: `${p}% van ${n} = ${n} ÷ ${per} = ${n * p / 100}` }
      }},
      { doel: 'Je leert de gemiddelde snelheid uitrekenen in kilometer per uur en rekenen met de gemiddelde snelheid.', gen: () => {
        const v = pick([60, 70, 80, 90, 100, 120]), t = rnd(2, plus ? 6 : 4)
        return { vraag: `Een auto rijdt ${v * t} km in ${t} uur. Wat is de gemiddelde snelheid in km per uur?`,
                 antwoord: v, eenheid: 'km/u', uitleg: `${v * t} km ÷ ${t} uur = ${v} km/u` }
      }},
    ],
    5: [
      { doel: 'Je leert kolomsgewijs delen bij sommen als 357 : 17 en 360 : 17 (met rest), in maximaal 2 stappen.', gen: () => Math.random() < 0.5 ? deelV(rnd(12, 19), rnd(11, plus ? 39 : 25)) : (() => { const deler = rnd(12, 19), quo = rnd(11, plus ? 39 : 25), rest = rnd(1, deler - 1); return deelRestV(deler, quo, rest) })() },
      { doel: 'Je leert kolomsgewijs delen bij sommen als 3726 : 23 en 3732 : 23 (met rest), in maximaal 3 stappen.', gen: () => {
        const deler = rnd(13, 29), quo = rnd(15, plus ? 99 : 49), rest = rnd(1, deler - 1)
        const totaal = deler * quo + rest, d = ding()
        return { vraag: `Er zijn ${totaal} ${d[1]}. Ze gaan in zakjes van ${deler}. Hoeveel volle zakjes kun je maken en hoeveel blijven er over?`,
                 antwoord: quo, rest, uitleg: `${totaal} ÷ ${deler} = ${quo} (rest ${rest}) → ${quo} volle zakjes, ${rest} over` }
      }},
      { doel: 'Je leert rekenen met verhoudingen met een verhoudingstabel, ook in cirkeldiagrammen en met breuken.', gen: () => {
        const n = rnd(3, 8), stuk = rnd(40, 250) / 100, tot = +(n * stuk).toFixed(2)
        return { vraag: `${n} dezelfde pennen kosten samen ${euro(tot)}. Hoeveel kost 1 pen?`,
                 antwoord: +stuk.toFixed(2), eenheid: '€', uitleg: `${euro(tot)} ÷ ${n} = ${euro(stuk)}` }
      }},
      { doel: 'Je leert de oppervlakte berekenen van rechthoeken en eenvoudige figuren met maten in cm, dm of m.', gen: () => {
        const l = rnd(3, plus ? 25 : 12), b = rnd(2, plus ? 18 : 9)
        return { vraag: `Een tuin is ${l} m lang en ${b} m breed. Wat is de oppervlakte in m²?`,
                 antwoord: l * b, eenheid: 'm²', figuur: { type: 'rechthoek', l, b, eenheid: 'm' },
                 uitleg: `${l} × ${b} = ${l * b} m²` }
      }},
    ],
    6: [
      { doel: 'Je leert betekenis verlenen aan getallen tot in de miljarden, afronden op een honderdduizendtal en getallen op 2 manieren schrijven (5,2 miljoen en 5.200.000).', gen: () => afrondV(plus ? 980000 : 98000, plus ? [100, 1000, 10000] : [10, 100, 1000]) },
      { doel: 'Je leert een heel getal met een benoemde breuk vermenigvuldigen.', gen: () => breukMaalHeelV() },
      { doel: 'Je leert een deel van hoeveelheden omrekenen naar 5%, 10%, 25%, 50%, 75% en 100%, en 5% of 10% koppelen aan breuken, kommagetallen en verhoudingen.', gen: () => {
        const p = pick([5, 10, 25, 50, 75]), per = 100 / p
        const n = Math.round(rnd(2, plus ? 12 : 8)) * per
        return { vraag: `Op het schoolplein staan ${n} kinderen. ${p}% gaat naar binnen. Hoeveel kinderen zijn dat?`,
                 antwoord: n * p / 100, uitleg: `${p}% van ${n} = ${n} ÷ ${per} = ${n * p / 100}` }
      }},
      { doel: 'Je leert staafdiagrammen en cirkeldiagrammen aflezen, maken en gebruiken bij berekeningen.', gen: () => diagramV('staaf', pick([5, 10]), rnd(3, 9)) },
    ],
    7: [
      { doel: 'Je leert het gemiddelde berekenen met hoofdrekenen en met de rekenmachine.', gen: () => gemiddeldeV() },
      { doel: 'Je leert benoemde kommagetallen vermenigvuldigen met 10, 100 en 1000 en delen door 10 en 100.', gen: () => Math.random() < 0.5 ? kommaMaal10V() : kommaDeel10V() },
      { doel: 'Je leert rekenen met verhoudingen in allerlei situaties en rekenen met vreemde valuta.', gen: () => Math.random() < 0.5 ? verhoudingV() : valutaV() },
      { doel: 'Je leert de inhoud van een balk berekenen in dm³ en liter, en uitrekenen hoeveel blokken van 1 dm³ er in een grotere doos passen.', gen: () => balkInhoudV(plus ? 9 : 6) },
    ],
    8: [
      { doel: 'Je leert hoe je eenvoudige opgaven met hele getallen en kommagetallen in een verhaal op de rekenmachine kunt uitrekenen.', gen: () => boodschappenV() },
      { doel: 'Je herhaalt het vermenigvuldigen van een heel getal met een benoemde breuk.', gen: () => breukMaalHeelV() },
      { doel: 'Je leert de nieuwe prijs uitrekenen als je de oude prijs en het kortingspercentage weet, en percentages boven 100% uitrekenen.', gen: () => nieuwePrijsV() },
      { doel: 'Je leert gewichten omrekenen naar een andere maat, een passende maat kiezen en rekenen met prijzen en gewichten.', gen: () => maatGewichtV() },
    ],
    9: [
      { doel: 'Je leert kolomsgewijs delen bij sommen als 5819 : 23 met en zonder rest, in maximaal 3 stappen.', gen: () => {
        const deler = rnd(13, 29), quo = rnd(120, plus ? 399 : 250)
        const totaal = deler * quo
        return { vraag: `${getal(totaal)} euro wordt eerlijk verdeeld over ${deler} mensen. Hoeveel euro krijgt ieder?`,
                 antwoord: quo, eenheid: '€', uitleg: `${getal(totaal)} ÷ ${deler} = ${quo}` }
      }},
      { doel: 'Je leert vermenigvuldigen en delen met benoemde kommagetallen.', gen: () => kommaKeerV() },
      { doel: 'Je leert percentages uitrekenen via 1%, kiezen tussen rekenen met een breuk en via 1%, en percentages uitrekenen met de rekenmachine.', gen: () => procentVia1V() },
      { doel: 'Je leert windrichtingen gebruiken om een standpunt aan te geven, beschrijven wat je vanuit een standpunt ziet en routes beschrijven en volgen.', gen: () => windrichtingV() },
    ],
    10: [
      { doel: 'Je leert bewerkingen schattend uitrekenen, in contexten waarbij het zinvol is om te schatten.', gen: () => schattenV() },
      { doel: 'Je leert vermenigvuldigen met kommagetallen, bij sommen als 2,9 × 8,1 en 24 × 0,67: eerst schatten, dan zonder komma rekenen met de rekenmachine en ten slotte de komma plaatsen.', gen: () => Math.random() < 0.5 ? kommaVermV() : (() => { const a = rnd(110, 220) / 100, liter = rnd(20, plus ? 600 : 250) / 10; return { vraag: `1 liter benzine kost ${euro(a)}. Je tankt ${komma(liter)} liter. Hoeveel betaal je?`, antwoord: +(a * liter).toFixed(2), eenheid: '€', uitleg: `${komma(liter)} × ${euro(a)} = ${euro(a * liter)}` } })() },
      { doel: 'Je leert eenvoudige breuken omzetten in kommagetallen en omgekeerd, ze vergelijken en op volgorde zetten.', gen: () => breukKommaV() },
      { doel: 'Je leert eenvoudige lijndiagrammen en diagrammen met tijd en afstand aflezen, maken en er berekeningen mee maken.', gen: () => diagramV('lijn', pick([5, 10]), rnd(3, 9)) },
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
const gelijkBreukV = () => {   // gelijkwaardige breuken in een verhaal
  const noem = pick([2, 3, 4, 5]), tel = 1, f = pick([2, 3, 4])
  const n = naam(), d = pick(['reep chocola', 'pizza', 'taart', 'cake'])
  return { vraag: `Een ${d} is in ${noem * f} gelijke stukjes verdeeld. ${n} eet ${tel}/${noem} van de ${d}. Hoeveel van die ${noem * f} stukjes is dat?`,
           antwoord: tel * f, eenheid: 'stukjes', uitleg: `${tel}/${noem} = ${tel * f}/${noem * f}, want ${noem} × ${f} = ${noem * f}. Dus ${tel * f} stukjes.` }
}
const schattenV = () => {   // schattend uitrekenen via afronden op tientallen
  const a = rnd(11, 89), b = rnd(11, 89), ra = Math.round(a / 10) * 10, rb = Math.round(b / 10) * 10
  const n = naam()
  return { vraag: `In de bioscoop zijn ${a} rijen met ${b} stoelen. ${n} wil het aantal stoelen schatten: rond ${a} en ${b} af op tientallen en vermenigvuldig. Wat is de schatting?`,
           antwoord: ra * rb, eenheid: 'stoelen', uitleg: `${a} ≈ ${ra} en ${b} ≈ ${rb}. ${ra} × ${rb} = ${ra * rb}.` }
}
const BREUK_KOMMA = [['1/2', 0.5], ['1/4', 0.25], ['3/4', 0.75], ['1/5', 0.2], ['2/5', 0.4], ['3/5', 0.6], ['1/10', 0.1], ['3/10', 0.3]]
const breukKommaV = () => {
  const [b, d] = pick(BREUK_KOMMA)
  const n = naam()
  return { vraag: `${n} loopt ${b} kilometer naar school. Schrijf die afstand als kommagetal (in km).`, antwoord: d, eenheid: 'km', uitleg: `${b} km = ${komma(d)} km` }
}
const breukMaalHeelV = () => {   // heel getal × benoemde breuk
  const n = pick([2, 3, 4, 5]), h = rnd(2, 9) * n
  return { vraag: `Je eet ${h} keer een ${breukNoemTekst(n)} deel van een pizza. Hoeveel héle pizza's is dat?`,
           antwoord: h / n, uitleg: `${h} × 1/${n} = ${h}/${n} = ${h / n}` }
}
const kommaMaal10V = () => {   // benoemd kommagetal × 10/100/1000
  const g = rnd(105, 995) / 100, f = pick([10, 100, 1000]), ant = +(g * f).toFixed(2)
  const n = naam()
  return { vraag: `Eén pakje kost ${euro(g)}. ${n} bestelt er ${f}. Hoeveel euro kosten ze samen?`, antwoord: ant, eenheid: '€', uitleg: `${f} × ${euro(g)} = ${euro(ant)}` }
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
  const [r, deg] = pick(WINDRICHTINGEN), nm = naam()
  return { vraag: `${nm} staat op het schoolplein en kijkt naar het noorden. ${nm} draait met de klok mee tot ${r}. Hoeveel graden draait ${nm}?`,
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
  const n = naam(), d = ding()
  return { vraag: `${n} heeft ${geheel} ${d[1]} en geeft er ${tel}/${noem} deel van weg. Hoeveel ${d[1]} geeft ${n} weg?`, antwoord: geheel * tel / noem, eenheid: d[1],
           uitleg: `${geheel} : ${noem} = ${geheel / noem}, × ${tel} = ${geheel * tel / noem} ${d[1]}` }
}
const breukAanvullenV = () => {   // breuk aanvullen tot een hele
  const noem = pick([3, 4, 5, 6, 8, 10]), tel = rnd(1, noem - 1)
  const n = naam(), d = pick(['taart', 'pizza', 'reep'])
  return { vraag: `Een ${d} is in ${noem} gelijke stukken verdeeld. ${n} heeft er al ${tel} opgegeten. Hoeveel stukken moeten er nog bij om weer een hele ${d} te hebben?`,
           antwoord: noem - tel, eenheid: 'stukken', uitleg: `${tel}/${noem} + ${noem - tel}/${noem} = ${noem}/${noem} = 1 hele. Dus ${noem - tel} stukken.` }
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
const volgordeV = () => {   // volgorde van bewerkingen, in een verhaal
  const a = rnd(2, 9), b = rnd(2, 9), c = rnd(2, 9), n = naam(), d = ding()
  if (pick([0, 1]) === 0) return { vraag: `${n} heeft ${a} losse ${d[1]} en ${b} zakjes met elk ${c} ${d[1]}. Hoeveel ${d[1]} heeft ${n} in totaal?`, antwoord: a + b * c, eenheid: d[1], uitleg: `Eerst ${b} × ${c} = ${b * c}, dan ${a} + ${b * c} = ${a + b * c}.` }
  return { vraag: `${n} koopt ${a} zakjes met elk ${b} ${d[1]} en eet er daarna ${c} op. Hoeveel ${d[1]} blijven er over?`, antwoord: a * b - c, eenheid: d[1], uitleg: `Eerst ${a} × ${b} = ${a * b}, dan ${a * b} − ${c} = ${a * b - c}.` }
}
const restV = () => {   // deelbaarheid: rest bij delen, in een verhaal
  const deler = pick([2, 4, 5, 10]), q = rnd(3, 19), rest = rnd(0, deler - 1), n = deler * q + rest
  const nm = naam(), d = ding()
  return { vraag: `${nm} heeft ${n} ${d[1]} en legt ze in groepjes van ${deler}. Hoeveel ${d[1]} houdt ${nm} over?`, antwoord: rest, eenheid: d[1], uitleg: `${n} : ${deler} = ${q} met rest ${rest}. Er blijven ${rest} ${d[1]} over.` }
}
const priemV = () => {   // ontbinden in priemgetallen, in een verhaal
  const primes = [2, 3, 5, 7], p = pick(primes), q = pick(primes), n = p * q, nm = naam()
  return { vraag: `${nm} legt ${n} tegels in een rechthoek. Dat lukt alleen met ${Math.min(p, q)} rijen van ${Math.max(p, q)} tegels (allebei priemgetallen). Wat is het kleinste priemgetal?`,
           antwoord: Math.min(p, q), uitleg: `${n} = ${Math.min(p, q)} × ${Math.max(p, q)}. Beide zijn priemgetallen.` }
}
const grootGetalV = () => {   // heel grote getallen in cijfers schrijven
  const k = rnd(2, 9), u = pick([['miljoen', 1000000], ['miljard', 1000000000]]), nm = naam()
  return { vraag: `In de krant leest ${nm} dat er ${k} ${u[0]} mensen in een land wonen. Schrijf dat getal in cijfers.`, antwoord: k * u[1], uitleg: `${k} ${u[0]} = ${getal(k * u[1])}` }
}
const verhoudingV = () => {   // verhoudingsproblemen
  const stuks = pick([2, 3, 4, 5]), perStuk = rnd(2, 9), prijs = perStuk * stuks, n = stuks * rnd(2, 5)
  return { vraag: `${stuks} broodjes kosten samen € ${prijs}. Hoeveel kosten ${n} broodjes?`,
           antwoord: perStuk * n, eenheid: '€', uitleg: `1 broodje = € ${perStuk}. ${n} × € ${perStuk} = € ${perStuk * n}.` }
}
const procentVanV = () => {   // percentage van een getal, in een verhaal
  const p = pick([5, 10, 20, 25, 50, 75]), basis = pick([20, 40, 60, 80, 100, 200])
  return { vraag: `In de dierentuin zijn ${basis} dieren. ${p}% daarvan zijn vogels. Hoeveel vogels zijn dat?`, antwoord: basis * p / 100, eenheid: 'vogels', uitleg: `${p}% van ${basis} = ${basis} ÷ 100 × ${p} = ${basis * p / 100}` }
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
const breukOptelGelijkV = () => {   // benoemde gelijknamige breuken optellen, in een verhaal
  const noem = pick([4, 5, 6, 8, 10]), t1 = rnd(1, noem - 2), t2 = rnd(1, noem - 1 - t1)
  const n1 = naam(), n2 = naam(), d = pick(['reep', 'pizza', 'taart'])
  const st = x => `${x} stuk${x > 1 ? 'ken' : ''}`
  return { vraag: `Een ${d} is in ${noem} stukken verdeeld. ${n1} eet ${st(t1)} en ${n2} eet ${st(t2)}. Welk deel eten ze samen? Geef de teller (de noemer blijft ${noem}).`,
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
const tussenHonderdV = () => {   // tussen welke honderdtallen ligt een getal, in een verhaal
  const n = rnd(120, 980), laag = Math.floor(n / 100) * 100, nm = naam()
  return { vraag: `${nm} heeft ${n} euro gespaard. Tussen welke twee honderdtallen ligt dat bedrag? Geef het kleinste honderdtal.`, antwoord: laag, eenheid: '€', uitleg: `${n} ligt tussen ${laag} en ${laag + 100}.` }
}
const standpuntV = () => {   // bedenken wat je vanuit een standpunt ziet
  const r = rnd(2, 5), k = rnd(2, 5)
  return { vraag: `Je kijkt naar ${r} rijen met elk ${k} dozen. Hoeveel dozen zie je in totaal?`, antwoord: r * k, uitleg: `${r} × ${k} = ${r * k}` }
}
const vormHoekenV = () => {   // namen van figuren en vormen, in een verhaal
  const v = pick([['driehoek', 3], ['vierkant', 4], ['rechthoek', 4], ['vijfhoek', 5], ['zeshoek', 6]]), nm = naam()
  return { vraag: `${nm} tekent een ${v[0]} op papier. Hoeveel hoeken heeft die figuur?`, antwoord: v[1], eenheid: 'hoeken', uitleg: `Een ${v[0]} heeft ${v[1]} hoeken.` }
}
const kalenderV = () => {   // jaarkalender aflezen / rekenen met weken, in een verhaal
  const w = rnd(2, 8), nm = naam()
  return { vraag: `De zomervakantie van ${nm} duurt ${w} weken. Hoeveel dagen zijn dat?`, antwoord: w * 7, eenheid: 'dagen', uitleg: `${w} × 7 = ${w * 7} dagen` }
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
  return { vraag: `In het stadion waren ${getal(n)} bezoekers. Rond dat aantal af op ${nm}.`, antwoord: af, eenheid: 'bezoekers', uitleg: `${getal(n)} afgerond op ${nm} = ${getal(af)}` }
}

// ── Extra bouwers afgeleid uit de Pluspunt-doelen (lengte/inhoud/gewicht,
//    meetkunde, procenten, breuken, kommagetallen, snelheid, valuta) ──
const maatLengteV = () => {   // omrekenen naar de kleinste genoemde maat
  const variant = pick([
    () => { const km = rnd(2, 9), m = rnd(50, 950); return { v: `Een route is ${km} km en ${m} m lang. Hoeveel meter is dat in totaal?`, a: km * 1000 + m, e: 'm', u: `${km} km = ${getal(km * 1000)} m. ${getal(km * 1000)} + ${m} = ${getal(km * 1000 + m)} m` } },
    () => { const m = rnd(2, 9), cm = rnd(10, 90); return { v: `Een plank is ${m} m en ${cm} cm lang. Hoeveel centimeter is dat in totaal?`, a: m * 100 + cm, e: 'cm', u: `${m} m = ${m * 100} cm. ${m * 100} + ${cm} = ${m * 100 + cm} cm` } },
    () => { const cm = rnd(3, 20), mm = rnd(1, 9); return { v: `Een potlood is ${cm} cm en ${mm} mm lang. Hoeveel millimeter is dat in totaal?`, a: cm * 10 + mm, e: 'mm', u: `${cm} cm = ${cm * 10} mm. ${cm * 10} + ${mm} = ${cm * 10 + mm} mm` } },
  ])()
  return { vraag: variant.v, antwoord: variant.a, eenheid: variant.e, uitleg: variant.u }
}
const maatInhoudV = () => {
  const variant = pick([
    () => { const l = rnd(1, 9), dl = rnd(1, 9); return { v: `Een fles bevat ${l} liter en ${dl} dl. Hoeveel deciliter is dat in totaal?`, a: l * 10 + dl, e: 'dl', u: `${l} l = ${l * 10} dl. ${l * 10} + ${dl} = ${l * 10 + dl} dl` } },
    () => { const l = rnd(1, 5), ml = rnd(50, 950); return { v: `In een pak zit ${l} liter en ${ml} ml. Hoeveel milliliter is dat in totaal?`, a: l * 1000 + ml, e: 'ml', u: `${l} l = ${l * 1000} ml. ${l * 1000} + ${ml} = ${l * 1000 + ml} ml` } },
  ])()
  return { vraag: variant.v, antwoord: variant.a, eenheid: variant.e, uitleg: variant.u }
}
const maatGewichtV = () => {
  const variant = pick([
    () => { const kg = rnd(1, 9), g = rnd(50, 950); return { v: `Een tas weegt ${kg} kg en ${g} g. Hoeveel gram is dat in totaal?`, a: kg * 1000 + g, e: 'g', u: `${kg} kg = ${getal(kg * 1000)} g. ${getal(kg * 1000)} + ${g} = ${getal(kg * 1000 + g)} g` } },
    () => { const g = pick([250, 500, 750]), n = rnd(3, 8), tot = g * n; return { v: `Je koopt ${n} pakken van ${g} gram. Hoeveel kilogram is dat samen?`, a: tot / 1000, e: 'kg', u: `${n} × ${g} g = ${tot} g = ${komma(tot / 1000)} kg` } },
  ])()
  return { vraag: variant.v, antwoord: variant.a, eenheid: variant.e, uitleg: variant.u }
}
const oppRechthoekV = (mL = 12, mB = 9) => { const l = rnd(3, mL), b = rnd(2, mB); return { vraag: `Een tuin is ${l} m lang en ${b} m breed. Wat is de oppervlakte in m²?`, antwoord: l * b, eenheid: 'm²', figuur: { type: 'rechthoek', l, b, eenheid: 'm' }, uitleg: `${l} × ${b} = ${l * b} m²` } }
const oppDriehoekV = () => { const basis = rnd(2, 12) * 2, h = rnd(3, 10); return { vraag: `Een driehoekig bord heeft een basis van ${basis} cm en een hoogte van ${h} cm. Wat is de oppervlakte in cm²?`, antwoord: basis * h / 2, eenheid: 'cm²', figuur: { type: 'driehoek', l: basis, b: h, eenheid: 'cm' }, uitleg: `(${basis} × ${h}) ÷ 2 = ${basis * h} ÷ 2 = ${basis * h / 2} cm²` } }
const omtrekV = (mL = 16, mB = 11) => { const l = rnd(4, mL), b = rnd(3, mB); return { vraag: `Een veld is ${l} m lang en ${b} m breed. Hoeveel meter is de omtrek?`, antwoord: 2 * (l + b), eenheid: 'm', figuur: { type: 'rechthoek', l, b, eenheid: 'm' }, uitleg: `2 × (${l} + ${b}) = 2 × ${l + b} = ${2 * (l + b)} m` } }
const balkInhoudV = (mL = 8) => { const l = rnd(2, mL), b = rnd(2, 6), h = rnd(2, 6); return { vraag: `Een bak is ${l} dm lang, ${b} dm breed en ${h} dm hoog. Hoeveel liter past erin?`, antwoord: l * b * h, eenheid: 'l', figuur: { type: 'balk', l, b, h, eenheid: 'dm' }, uitleg: `${l} × ${b} × ${h} = ${l * b * h} dm³ = ${l * b * h} liter` } }
const kommaVermV = () => { const a = rnd(11, 49) / 10, b = rnd(11, 49) / 10, ant = +(a * b).toFixed(2); return { vraag: `1 meter stof kost ${euro(a)}. ${naam()} koopt ${komma(b)} meter. Hoeveel betaalt hij? (eerst schatten, dan precies uitrekenen)`, antwoord: ant, eenheid: '€', uitleg: `${komma(a)} × ${komma(b)} = ${euro(ant)}` } }
const breukMaalBreukV = () => { const n1 = pick([2, 3, 4]), n2 = pick([2, 3, 4]); return { vraag: `Van een taart is nog 1/${n1} over. ${naam()} eet 1/${n2} van dat stuk op. Welk deel van de héle taart is dat? Geef de noemer (de teller is 1).`, antwoord: n1 * n2, uitleg: `1/${n1} × 1/${n2} = 1/${n1 * n2}` } }
const nieuwePrijsV = () => { const prijs = rnd(10, 90), p = pick([10, 20, 25, 50]), nieuw = +(prijs * (1 - p / 100)).toFixed(2); return { vraag: `Een jas kost ${euro(prijs)}. Je krijgt ${p}% korting. Wat is de nieuwe prijs?`, antwoord: nieuw, eenheid: '€', uitleg: `Korting: ${p}% van ${euro(prijs)} = ${euro(prijs * p / 100)}. ${euro(prijs)} − ${euro(prijs * p / 100)} = ${euro(nieuw)}` } }
const oudePrijsV = () => { const oud = rnd(20, 80), p = pick([10, 20, 25, 50]), nieuw = +(oud * (1 - p / 100)).toFixed(2); return { vraag: `Na ${p}% korting kost een spel ${euro(nieuw)}. Wat was de oude prijs?`, antwoord: oud, eenheid: '€', uitleg: `${euro(nieuw)} is ${100 - p}% van de oude prijs. Oude prijs = ${euro(nieuw)} ÷ ${100 - p} × 100 = ${euro(oud)}` } }
const kortingPctV = () => { const oud = pick([20, 40, 50, 80, 100]), p = pick([10, 20, 25, 50]), nieuw = +(oud * (1 - p / 100)).toFixed(2); return { vraag: `Iets kostte ${euro(oud)} en kost nu ${euro(nieuw)}. Hoeveel procent korting is dat?`, antwoord: p, eenheid: '%', uitleg: `Korting = ${euro(oud - nieuw)}. ${euro(oud - nieuw)} ÷ ${euro(oud)} × 100 = ${p}%` } }
const totaalViaPctV = () => { const p = pick([10, 20, 25, 50]), totaal = rnd(2, 10) * 20, deel = totaal * p / 100; return { vraag: `${deel} kinderen is ${p}% van alle kinderen. Hoeveel kinderen zijn er in totaal?`, antwoord: totaal, uitleg: `${p}% = ${deel}, dus 100% = ${deel} ÷ ${p} × 100 = ${totaal}` } }
const oudAantalViaPctV = () => { const oud = rnd(2, 10) * 10, p = pick([10, 20, 25, 50]), nieuw = oud + oud * p / 100; return { vraag: `Een aantal is met ${p}% gestegen tot ${nieuw}. Wat was het oude aantal?`, antwoord: oud, uitleg: `${nieuw} is ${100 + p}% van het oude aantal. ${nieuw} ÷ ${100 + p} × 100 = ${oud}` } }
const procentVia1V = () => { const bedrag = rnd(2, 20) * 100, p = rnd(2, 9) * 5; return { vraag: `Van de ${euro(bedrag)} spaar je ${p}%. Hoeveel euro spaar je?`, antwoord: +(bedrag * p / 100).toFixed(2), eenheid: '€', uitleg: `1% van ${getal(bedrag)} = ${euro(bedrag / 100)}. ${p} × ${euro(bedrag / 100)} = ${euro(bedrag * p / 100)}` } }
const snelheidV = () => { const v = pick([60, 70, 80, 90, 100, 120]), t = rnd(2, 5); return { vraag: `Een auto rijdt ${v * t} km in ${t} uur. Wat is de gemiddelde snelheid in km per uur?`, antwoord: v, eenheid: 'km/u', uitleg: `${v * t} km ÷ ${t} uur = ${v} km/u` } }
const valutaV = () => { const koers = rnd(85, 130) / 100, n = rnd(3, 30); return { vraag: `1 dollar is ${euro(koers)}. Hoeveel euro is ${n} dollar?`, antwoord: +(n * koers).toFixed(2), eenheid: '€', uitleg: `${n} × ${euro(koers)} = ${euro(n * koers)}` } }
const kommaDeel10V = () => { const g = rnd(150, 9950) / 100, f = pick([10, 100]), ant = +(g / f).toFixed(3); return { vraag: `${naam()} knipt een touw van ${komma(g)} meter in ${f} even lange stukken. Hoe lang is elk stuk (in meter)?`, antwoord: ant, eenheid: 'm', uitleg: `${komma(g)} : ${f} = ${komma(ant)} m` } }
const cijferOptelGrootV = () => optelV(rnd(1200, 8900), rnd(1200, 8900))
const cijferAftrekGrootV = () => { const a = rnd(3000, 9000), b = rnd(1000, a - 500); return aftrekV(a, b) }
const breukVergelijkV = () => { const noem = pick([4, 5, 6, 8]), t1 = rnd(1, noem - 1); let t2 = rnd(1, noem - 1); if (t2 === t1) t2 = (t2 % (noem - 1)) + 1; const groot = t1 > t2 ? t1 : t2; const n1 = naam(), n2 = naam(); return { vraag: `${n1} eet ${t1}/${noem} van een pizza en ${n2} eet ${t2}/${noem} van een even grote pizza. Wie eet het grootste deel? Geef de teller van dat deel.`, antwoord: groot, uitleg: `Bij dezelfde noemer is de breuk met de grootste teller het grootst: ${groot}/${noem}.` } }
const tijdsduurV = () => { const h1 = rnd(7, 11), m1 = pick([0, 5, 10, 15, 20, 25, 40, 45]), dur = rnd(4, 8) * 15, tot = h1 * 60 + m1 + dur, h2 = Math.floor(tot / 60), m2 = tot % 60; return { vraag: `Een film begint om ${h1}:${PAD(m1)} uur en eindigt om ${h2}:${PAD(m2)} uur. Hoeveel minuten duurt de film?`, antwoord: dur, eenheid: 'min', uitleg: `Van ${h1}:${PAD(m1)} tot ${h2}:${PAD(m2)} = ${dur} minuten` } }
const breukDeelV = () => { const n = pick([2, 3, 4, 5]), m = rnd(2, 6); return { vraag: `Hoeveel glazen van 1/${n} liter kun je vullen uit ${m} liter?`, antwoord: m * n, eenheid: 'glazen', uitleg: `${m} : 1/${n} = ${m} × ${n} = ${m * n}` } }
const cirkelV = () => { const r = pick([2, 3, 4, 5, 10]), nm = naam(); if (Math.random() < 0.5) return { vraag: `${nm} maakt een rond kleedje met een straal van ${r} cm en wil er een lint omheen plakken. Hoeveel cm lint is dat (de omtrek)? (gebruik π ≈ 3,14)`, antwoord: +(2 * 3.14 * r).toFixed(2), eenheid: 'cm', uitleg: `omtrek = 2 × π × r = 2 × 3,14 × ${r} = ${komma(+(2 * 3.14 * r).toFixed(2))} cm` }; return { vraag: `${nm} maakt een ronde tafel met een straal van ${r} cm. Bereken de oppervlakte van het tafelblad. (gebruik π ≈ 3,14)`, antwoord: +(3.14 * r * r).toFixed(2), eenheid: 'cm²', uitleg: `oppervlakte = π × r × r = 3,14 × ${r} × ${r} = ${komma(+(3.14 * r * r).toFixed(2))} cm²` } }
const ROMEINS = [['IV', 4], ['VI', 6], ['IX', 9], ['XI', 11], ['XIII', 13], ['XIV', 14], ['XIX', 19], ['XXII', 22], ['XXV', 25], ['XL', 40], ['L', 50]]
const romeinsV = () => { if (Math.random() < 0.5) { const [r, n] = pick(ROMEINS); return { vraag: `Op een oud gebouw staat het bouwjaar met het Romeinse getal ${r}. Welk gewoon getal is dat?`, antwoord: n, uitleg: `${r} = ${n}` } } const a = rnd(2, 9), b = rnd(1, 9); return { vraag: `Het is ${a} graden buiten. Het wordt ${a + b} graden kouder. Hoeveel graden staat de thermometer dan aan?`, antwoord: -b, eenheid: '°', uitleg: `${a} − ${a + b} = −${b} graden` } }
const kwadraatWortelV = () => { const nm = naam(); if (Math.random() < 0.5) { const n = rnd(2, 12); return { vraag: `${nm} legt een vierkant van ${n} bij ${n} tegels. Hoeveel tegels zijn dat samen?`, antwoord: n * n, eenheid: 'tegels', uitleg: `${n} × ${n} = ${n * n} (dat is ${n}²)` } } const n = pick([4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144]); return { vraag: `${nm} legt ${n} tegels in een perfect vierkant. Hoeveel tegels liggen er op één rij?`, antwoord: Math.sqrt(n), eenheid: 'tegels', uitleg: `√${n} = ${Math.sqrt(n)}, want ${Math.sqrt(n)} × ${Math.sqrt(n)} = ${n}` } }
const patroonRijV = () => { const start = rnd(1, 12), stap = pick([2, 3, 4, 5, 10]), rij = [start, start + stap, start + 2 * stap, start + 3 * stap], nm = naam(); return { vraag: `${nm} maakt stapels blokken. De eerste stapels hebben ${rij.join(', ')} blokken. Steeds komen er evenveel bij. Hoeveel blokken heeft de volgende stapel?`, antwoord: start + 4 * stap, eenheid: 'blokken', uitleg: `Steeds ${stap} erbij: ${rij[3]} + ${stap} = ${start + 4 * stap}.` } }
const combinatiesV = () => { const a = rnd(2, 5), b = rnd(2, 5), dingA = pick(['shirts', 'broeken', 'petjes', 'truien']), dingB = pick(['schoenen', 'sokken', 'jassen']); return { vraag: `Je hebt ${a} ${dingA} en ${b} ${dingB}. Hoeveel verschillende combinaties kun je maken?`, antwoord: a * b, eenheid: 'combinaties', uitleg: `${a} × ${b} = ${a * b} mogelijke combinaties` } }

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
    vraag: `${naam()} zet een pijl op de getallenlijn. Welk getal hoort bij de pijl?`,
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

// ── Groep 5 (Pluspunt). Eén traject (geen FS/S+). Instap + blok 1 t/m 10. ──
function maakGroep5() {
  return {
    0: [
      { doel: 'Je leert verder- en terugtellen tot en met 1000 met sprongen van 1, 10 en 100, en getallen tot en met 1000 op volgorde zetten.', gen: () => getallenlijnV(rnd(0, 5) * 100, 500, 50) },
      { doel: 'Je leert optellen en aftrekken tot en met 100 met de strategieën rijgen, rijgen met te veel en aanvullen.', gen: () => { const a = rnd(20, 89), b = rnd(11, a - 5); return Math.random() < 0.5 ? optelV(a, rnd(11, 99 - a)) : aftrekV(a, b) } },
      { doel: 'Je leert alle keersommen vlot te maken.', gen: () => keerV(rnd(2, 10), rnd(2, 10)) },
      { doel: 'Je leert de tijd van een digitale klok aflezen, bij hele en halve uren en bij kwartieren.', gen: () => klokV([0, 15, 30, 45]) },
    ],
    1: [
      { doel: 'Je leert getallen tot en met 1000 splitsen in en samenstellen met honderdtallen, tientallen en eenheden.', gen: () => getallenlijnV(rnd(0, 5) * 100, 500, 50) },
      { doel: 'Je leert tussen welke honderdtallen een getal ligt en getallen tot en met 1000 op volgorde zetten.', gen: () => tussenHonderdV() },
      { doel: 'Je leert alle tafelsommen vlot maken.', gen: () => keerV(rnd(2, 10), rnd(2, 10)) },
      { doel: 'Je leert de tijd van een digitale klok aflezen, bij hele en halve uren en bij kwartieren.', gen: () => klokV([0, 15, 30, 45]) },
    ],
    2: [
      { doel: 'Je leert getallen tot en met 1000 schattend plaatsen en aflezen op de streepjesgetallenlijn vanaf een willekeurig getal.', gen: () => getallenlijnV(rnd(0, 5) * 100, 500, 50) },
      { doel: 'Je leert keersommen uitrekenen met behulp van de kleine som, ook door de som eerst om te keren.', gen: () => keerV(rnd(2, 9), rnd(2, 9) * 10) },
      { doel: 'Je leert wat delen is en bij een deelverhaal of een plaatje een deelsom bedenken.', gen: () => deelV(rnd(2, 5), rnd(2, 9)) },
      { doel: 'Je leert bedenken wat je vanuit een bepaald standpunt ziet en iets op de goede plek in een bovenaanzicht tekenen.', gen: () => standpuntV() },
    ],
    3: [
      { doel: 'Je leert optellen tot en met 1000 met de strategie rijgen, bij sommen als 380 + 200 en 380 + 160, en via de kleine som 5 + 3.', gen: () => optelV(rnd(11, 80) * 10, rnd(2, 8) * 20) },
      { doel: 'Je leert sommen als 3 × 14 uitrekenen met de basisstrategie splitsen.', gen: () => keerV(rnd(2, 9), rnd(11, 19)) },
      { doel: 'Je leert wat delen is en bij een deelverhaal of plaatje een deelsom bedenken (ook met een rest).', gen: () => { const deler = rnd(3, 8); return deelRestV(deler, rnd(4, 9), rnd(1, deler - 1)) } },
      { doel: 'Je leert van een klok met wijzers en van een digitale klok 5 en 10 minuten voor en over een heel uur aflezen.', gen: () => klokV([5, 10, 50, 55]) },
    ],
    4: [
      { doel: 'Je leert aftrekken tot en met 1000 met de strategie rijgen, bij sommen als 580 - 200 en 540 - 160, en via de kleine som 5 - 3.', gen: () => { const a = rnd(30, 95) * 10, b = rnd(2, 8) * 20; return aftrekV(a, Math.min(b, a - 20)) } },
      { doel: 'Je leert sommen als 4 × 67 uitrekenen met de basisstrategie splitsen.', gen: () => keerV(rnd(3, 9), rnd(41, 89)) },
      { doel: 'Je leert een deelsom met rest bedenken bij een deelverhaal en uitrekenen op de getallenlijn.', gen: () => { const deler = rnd(3, 8); return deelRestV(deler, rnd(4, 12), rnd(1, deler - 1)) } },
      { doel: 'Je leert bedragen tot en met 100 euro maken en schrijven met het euroteken en een komma.', gen: () => geldOptelV() },
    ],
    5: [
      { doel: 'Je leert optellen en aftrekken tot en met 1000 in maximaal 3 sprongen met de strategie rijgen, bij sommen als 246 + 37 en 482 - 46.', gen: () => { const a = rnd(120, 880), b = rnd(20, 90); return Math.random() < 0.5 ? optelV(a, b) : aftrekV(a, b) } },
      { doel: 'Je leert optellen tot en met 1000 in maximaal 2 sprongen met de strategie rijgen, bij sommen als 486 + 50.', gen: () => optelV(rnd(120, 880), rnd(2, 9) * 10) },
      { doel: 'Je leert een deelsom uitrekenen met een keersom en je begrijpt waarom dit mag.', gen: () => deelV(rnd(2, 8), rnd(3, 9)) },
      { doel: 'Je leert van een klok met wijzers en van een digitale klok 5 en 10 minuten voor en over een half uur aflezen.', gen: () => klokV([20, 25, 35, 40]) },
    ],
    6: [
      { doel: 'Je leert aftrekken tot en met 1000 in maximaal 2 sprongen met de strategie rijgen, bij sommen als 434 - 70.', gen: () => { const a = rnd(150, 900), b = rnd(2, 9) * 10; return aftrekV(a, b) } },
      { doel: 'Je leert sommen als 67 × 4 uitrekenen door eerst om te keren en dan te rekenen met de basisstrategie splitsen.', gen: () => keerV(rnd(3, 9), rnd(41, 89)) },
      { doel: 'Je leert een deelsom met rest uitrekenen met een keersom en je begrijpt waarom dit mag.', gen: () => { const deler = rnd(3, 9); return deelRestV(deler, rnd(8, 40), rnd(1, deler - 1)) } },
      { doel: 'Je leert de namen van figuren en vormen en welke uitslag bij een balk hoort.', gen: () => vormHoekenV() },
    ],
    7: [
      { doel: 'Je leert optellen tot en met 1000 met de basisstrategie splitsen, bij sommen als 435 + 220 en 435 + 224.', gen: () => optelV(rnd(120, 560), rnd(110, 430)) },
      { doel: 'Je leert aftrekken tot en met 1000 met de basisstrategie splitsen, bij sommen als 687 - 450 en 687 - 456.', gen: () => { const a = rnd(450, 950), b = rnd(150, a - 100); return aftrekV(a, b) } },
      { doel: 'Je leert deelsommen zonder en met rest vlot uitrekenen met de keersom als hulpsom.', gen: () => { const deler = rnd(2, 9); return Math.random() < 0.5 ? deelV(deler, rnd(3, 12)) : deelRestV(deler, rnd(3, 12), rnd(1, deler - 1)) } },
      { doel: 'Je leert een jaarkalender aflezen en een datum vinden in de maand.', gen: () => kalenderV() },
    ],
    8: [
      { doel: 'Je leert aftrekken tot en met 1000 met de strategie aanvullen.', gen: () => { const a = rnd(400, 900), b = rnd(a - 90, a - 10); return aftrekV(a, b) } },
      { doel: 'Je leert sommen als 4 × 69 uitrekenen met de variastrategie rekenen met te veel.', gen: () => keerV(rnd(3, 9), rnd(2, 9) * 10 - 1) },
      { doel: 'Je leert sommen als 120 : 3 uitrekenen met de kleine som 12 : 3.', gen: () => { const deler = rnd(2, 8), q = rnd(3, 9), totaal = deler * q * 10, d = ding(); return { vraag: `${getal(totaal)} ${d[1]} gaan in ${deler} dozen. Hoeveel ${d[1]} in elke doos?`, antwoord: q * 10, uitleg: `${getal(totaal)} : ${deler} = ${q * 10} (kleine som ${deler * q} : ${deler} = ${q})` } } },
      { doel: 'Je leert uitrekenen hoeveel je terugkrijgt als je met te veel betaalt.', gen: () => wisselV() },
    ],
    9: [
      { doel: 'Je leert optellen tot en met 1000 met de strategie rijgen met te veel.', gen: () => optelV(rnd(120, 800), rnd(2, 9) * 10 - 1) },
      { doel: 'Je leert aftrekken tot en met 1000 met de strategie rijgen met te veel.', gen: () => { const a = rnd(200, 900), b = rnd(2, 9) * 10 - 1; return aftrekV(a, b) } },
      { doel: 'Je leert sommen als 42 : 3 uitrekenen met de basisstrategie splitsen.', gen: () => deelV(rnd(2, 8), rnd(11, 30)) },
      { doel: 'Je leert nauwkeurig meten in millimeters, centimeters en decimeters en deze maten met elkaar vergelijken.', gen: () => { const cm = rnd(3, 20), mm = rnd(1, 9); return { vraag: `Een potlood is ${cm} cm en ${mm} mm lang. Hoeveel millimeter is dat in totaal?`, antwoord: cm * 10 + mm, eenheid: 'mm', uitleg: `${cm} cm = ${cm * 10} mm. ${cm * 10} + ${mm} = ${cm * 10 + mm} mm` } } },
    ],
    10: [
      { doel: 'Je leert handig rekenen bij een lange optelsom en aftreksom.', gen: () => { const a = rnd(20, 90) * 10, b = rnd(15, 60) * 10, c = rnd(10, 40) * 10, d = ding(); return { vraag: `In 3 dozen zitten ${getal(a)}, ${getal(b)} en ${getal(c)} ${d[1]}. Hoeveel ${d[1]} samen?`, antwoord: a + b + c, uitleg: `${getal(a)} + ${getal(b)} + ${getal(c)} = ${getal(a + b + c)}` } } },
      { doel: 'Je leert sommen als 4 × 35 uitrekenen met de variastrategie halveren en verdubbelen.', gen: () => keerV(rnd(2, 8), rnd(3, 9) * 5) },
      { doel: 'Je leert sommen als 72 : 3 uitrekenen met de basisstrategie splitsen.', gen: () => deelV(rnd(2, 6), rnd(11, 40)) },
      { doel: 'Je leert een stapeldiagram en een lijndiagram aflezen en gebruiken.', gen: () => diagramV(pick(['staaf', 'lijn']), pick([2, 5]), rnd(3, 8)) },
    ],
  }
}

// ── Groep 6 (Pluspunt FS + S+). Instap + blok 1 t/m 10, exacte doelen. ──
function maakGroep6(plus) {
  const M = plus ? 1 : 0
  const cijf = plus ? 'cijferend' : 'cijferend of kolomsgewijs'
  return {
    0: [
      { doel: 'Je leert optellen en aftrekken tot en met 1000 met de strategieën rijgen (in max 2 sprongen), splitsen en aanvullen' + (plus ? ', en rijgen met te veel.' : '.'), gen: () => { const a = rnd(140, 880); return Math.random() < 0.5 ? optelV(a, rnd(110, 480)) : aftrekV(a, rnd(110, a - 80)) } },
      { doel: 'Je leert sommen als 4 × 67 en 67 × 4 uitrekenen met de basisstrategie splitsen, al dan niet door eerst om te keren' + (plus ? ', en met de variastrategieën rekenen met te veel en halveren en verdubbelen.' : '.'), gen: () => keerV(rnd(3, 9), rnd(41, 89)) },
      { doel: 'Je leert sommen als 42 : 3 uitrekenen met de basisstrategie splitsen.', gen: () => deelV(rnd(3, 8), rnd(11, 30)) },
      { doel: 'Je leert van een klok met wijzers en van een digitale klok 5, 10 en 15 minuten voor en over een heel uur en een half uur aflezen.', gen: () => klokV([5, 10, 15, 20, 25, 35, 40, 45, 50, 55]) },
    ],
    1: [
      { doel: 'Je leert getallen tot 10.000 splitsen in en samenstellen met duizendtallen, honderdtallen, tientallen en eenheden, en de waardes van de cijfers schrijven in woorden en met cijfers.', gen: () => getallenlijnV(rnd(0, 5) * 1000, 5000, 500) },
      { doel: 'Je leert sommen als 1200 + 1300, 4500 - 1200, 3 × 700 en 4500 : 9 vlot uitrekenen door te rekenen met de kleine som.', gen: () => {
        const k = rnd(1, 4)
        if (k === 1) return optelV(rnd(11, 80) * 100, rnd(11, 40) * 100)
        if (k === 2) { const a = rnd(25, 90) * 100, b = rnd(11, Math.floor(a / 100) - 5) * 100; return aftrekV(a, b) }
        if (k === 3) return keerV(rnd(2, 9), rnd(2, 9) * 100)
        return deelV(rnd(2, 9), rnd(2, 9) * 100)
      } },
      { doel: 'Je leert meten met stroken en de uitkomst opschrijven in breukentaal, en je leert dat breuken ontstaan uit eerlijk verdelen.', gen: () => deelVanGeheelV() },
      { doel: 'Je leert van een klok met wijzers de tijd op de minuut nauwkeurig aflezen en van een digitale klok de minuten aflezen en aangeven.', gen: () => klokV([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]) },
    ],
    2: [
      { doel: 'Je leert tellen tot en met 10.000 met sprongen van 1, 10, 100 en 1000, getallen op volgorde zetten en schattend plaatsen en aflezen op de getallenlijn.', gen: () => getallenlijnV(rnd(0, 5) * 1000, 5000, 500) },
      { doel: 'Je leert sommen als 368 + 257 kolomsgewijs optellen en je begrijpt wat je opschrijft.', gen: () => optelV(rnd(140, 680 + M * 200), rnd(140, 680)) },
      { doel: 'Je leert bij een plaatje aangeven welk deel gekleurd is en welke breuk erbij hoort.', gen: () => deelVanGeheelV() },
      { doel: 'Je leert hoe je een plaats op een kaart kunt vinden en hoe je de lengte van een route kunt berekenen.', gen: () => kaartV() },
    ],
    3: [
      { doel: 'Je leert getallen afronden op tientallen, honderdtallen en duizendtallen, en optellen en aftrekken met de afgeronde getallen.', gen: () => afrondV(9800, [10, 100, 1000]) },
      { doel: 'Je leert sommen als 92 : 4 uitrekenen met de basisstrategie splitsen.', gen: () => deelV(rnd(3, 8), rnd(11, 30)) },
      { doel: 'Je leert een breuk aanvullen tot een hele en bij een deel de hele tekenen.', gen: () => breukAanvullenV() },
      { doel: 'Je leert uitrekenen hoe laat het over een bepaalde tijd is en hoeveel uren en minuten het later is.', gen: () => tijdErbijV(120) },
    ],
    4: [
      { doel: `Je leert sommen als 432 + 257 ${cijf} optellen en je begrijpt wat je opschrijft.`, gen: () => optelV(rnd(140, 680), rnd(140, 560)) },
      { doel: `Je leert sommen als 487 + 235 ${cijf} optellen en je begrijpt wat je opschrijft.`, gen: () => optelV(rnd(150, 690), rnd(150, 490)) },
      { doel: 'Je leert breuken schattend plaatsen en aflezen op de getallenlijn, vanaf 0 en vanaf een willekeurig getal.', gen: () => deelVanGeheelV() },
      { doel: 'Je leert de maten kilogram en gram en de maten liter, deciliter, centiliter en milliliter gebruiken.', gen: () => Math.random() < 0.5 ? maatGewichtV() : maatInhoudV() },
    ],
    5: [
      { doel: 'Je leert sommen als 463 - 248 kolomsgewijs aftrekken en je begrijpt wat je opschrijft.', gen: () => { const a = rnd(360, 980), b = rnd(140, a - 100); return aftrekV(a, b) } },
      { doel: 'Je leert sommen als 423 - 248 kolomsgewijs aftrekken (met meer wisselen) en je begrijpt wat je opschrijft.', gen: () => { const a = rnd(400, 920), b = rnd(240, a - 80); return aftrekV(a, b) } },
      { doel: 'Je leert breuken met elkaar vergelijken met behulp van afbeeldingen en de getallenlijn.', gen: () => breukVergelijkV() },
      { doel: 'Je leert tijden aflezen en aangeven op de seconde nauwkeurig en tijden omrekenen in minuten en seconden.', gen: () => tijdNaarSecV() },
    ],
    6: [
      { doel: 'Je leert tellen tot en met 100.000 met sprongen van 1, 10, 100, 1000 en 10.000, getallen splitsen, samenstellen, schrijven, op volgorde zetten en schattend plaatsen op de getallenlijn.', gen: () => getallenlijnV(rnd(0, 5) * 10000, 50000, 5000) },
      { doel: 'Je leert sommen als 826 : 9 (met rest) uitrekenen met de basisstrategie splitsen.', gen: () => { const deler = rnd(3, 9); return deelRestV(deler, rnd(40, 99), rnd(1, deler - 1)) } },
      { doel: 'Je leert de betekenis van kommagetallen bij diverse maten en geld, en het lezen en schrijven van benoemde en onbenoemde kommagetallen met 1, 2 en 3 cijfers achter de komma.', gen: () => breukKommaV() },
      { doel: 'Je leert de maten kilometer, hectometer, meter, decimeter, centimeter en millimeter omrekenen, maten in meter met een komma opschrijven en de omtrek van een figuur berekenen.', gen: () => Math.random() < 0.5 ? maatLengteV() : omtrekV(12 + M * 6, 9 + M * 5) },
    ],
    7: [
      { doel: `Je leert sommen als 454 - 237 ${cijf} aftrekken en je begrijpt wat je opschrijft.`, gen: () => { const a = rnd(360, 980), b = rnd(140, a - 100); return aftrekV(a, b) } },
      { doel: plus ? 'Je leert sommen als 432 - 263 en 1705 - 346 cijferend aftrekken.' : 'Je leert sommen als 432 - 263 en 402 - 267 cijferend of kolomsgewijs aftrekken.', gen: () => { const a = rnd(400, plus ? 1900 : 920), b = rnd(240, a - 80); return aftrekV(a, b) } },
      { doel: 'Je leert een deel van een geheel berekenen en een deel aflezen van een staafdiagram.', gen: () => deelVanGeheelV() },
      { doel: 'Je leert een datum opschrijven in cijfers (dag-maand-jaar), een datum berekenen met en zonder kalender en een tijdbalk gebruiken bij het rekenen met jaartallen.', gen: () => datumV() },
    ],
    8: [
      { doel: 'Je leert sommen als 30 × 40 en 1500 : 30 uitrekenen met de kleine som.', gen: () => Math.random() < 0.5 ? keerV(rnd(2, 9) * 10, rnd(2, 9) * 10) : deelV(rnd(2, 9) * 10, rnd(2, 9)) },
      { doel: 'Je leert sommen als 6 × 284 kolomsgewijs uit te rekenen en je begrijpt wat je opschrijft.', gen: () => keerV(rnd(3, 9), rnd(110, 450 + M * 240)) },
      { doel: 'Je leert benoemde kommagetallen t/m honderdsten plaatsen en aflezen op de getallenlijn.', gen: () => breukKommaV() },
      { doel: 'Je leert de inhoud aflezen bij maatbekers en de maten liter, deciliter, centiliter en milliliter omrekenen, en maten in liter met een komma opschrijven.', gen: () => maatInhoudV() },
    ],
    9: [
      { doel: plus ? 'Je leert sommen als 138 : 3 met de basisstrategie splitsen en sommen als 147 : 3 met rekenen met te veel uitrekenen.' : 'Je leert sommen als 138 : 3 uitrekenen met de basisstrategie splitsen.', gen: () => deelV(rnd(2, 9), rnd(40, 150)) },
      { doel: plus ? 'Je leert sommen als 3 × 67 met splitsen, 4 × 69 met rekenen met te veel en 4 × 35 met halveren en verdubbelen uitrekenen.' : 'Je leert sommen als 3 × 67 en 4 × 35 uitrekenen met de basisstrategie splitsen.', gen: () => keerV(rnd(3, 9), rnd(41, 89)) },
      { doel: 'Je leert een deel van een geheel berekenen en berekenen wat het geheel is als je een deel weet.', gen: () => deelVanGeheelV() },
      { doel: 'Je leert de omtrek en de oppervlakte berekenen van een figuur met maten in centimeters of meters.', gen: () => Math.random() < 0.5 ? omtrekV(12 + M * 8, 8 + M * 7) : oppRechthoekV(12 + M * 8, 8 + M * 7) },
    ],
    10: [
      { doel: 'Je leert schattend vermenigvuldigen en delen in rekenverhalen met geld en met ronde getallen.', gen: () => schattenV() },
      { doel: plus ? 'Je leert sommen als 4 × 231 en 4 × 36 cijferend uitrekenen, en je begrijpt wat je opschrijft.' : 'Je leert sommen als 4 × 231 en 4 × 536 cijferend of kolomsgewijs uitrekenen, en je begrijpt wat je opschrijft.', gen: () => keerV(rnd(3, 9), rnd(110, 590)) },
      { doel: 'Je leert benoemde en onbenoemde kommagetallen t/m duizendsten vergelijken en ordenen.', gen: () => breukKommaV() },
      { doel: 'Je leert rekenen met lijndiagrammen en een beelddiagram aflezen.', gen: () => diagramV('lijn', pick([5, 10]), rnd(3, 9)) },
    ],
  }
}

// ── Groep 8 (Pluspunt FS + S+). Instap + blok 1 t/m 10. Aantal doelen per
//    blok wisselt (zoals in de methode): latere blokken hebben er minder. ──
function maakGroep8(plus) {
  const opp = () => Math.random() < 0.5 ? oppRechthoekV(plus ? 30 : 16, plus ? 20 : 11) : oppDriehoekV()
  const kommaOptel = () => { const p1 = rnd(150, plus ? 8000 : 3000) / 100, p2 = rnd(150, 3000) / 100, n = naam(); return { vraag: `${n} koopt een tas van ${euro(p1)} en een pet van ${euro(p2)}. Hoeveel betaalt ${n} samen?`, antwoord: +(p1 + p2).toFixed(2), eenheid: '€', uitleg: `${euro(p1)} + ${euro(p2)} = ${euro(p1 + p2)}` } }
  const samengesteld = () => { const perKg = rnd(150, 900) / 100, kg = rnd(2, plus ? 9 : 6); return { vraag: `Vlees kost ${euro(perKg)} per kilogram. Hoeveel kost ${kg} kg?`, antwoord: +(perKg * kg).toFixed(2), eenheid: '€', uitleg: `${kg} × ${euro(perKg)} = ${euro(perKg * kg)}` } }
  return {
    0: [
      { doel: 'Je oefent sommen als 12 × 64, 22 × 64 en 6 × 346 met cijferen of splitsen, en je begrijpt wat je opschrijft.', gen: () => Math.random() < 0.5 ? keerV(rnd(12, plus ? 89 : 49), rnd(21, 89)) : keerV(rnd(3, 9), rnd(110, 590)) },
      { doel: 'Je oefent hoofdrekenend vermenigvuldigen en delen met benoemde kommagetallen en vermenigvuldigen bij sommen als 2,9 × 8,1 en 24 × 0,67.', gen: () => Math.random() < 0.5 ? kommaVermV() : kommaKeerV() },
      { doel: 'Je herhaalt het koppelen van 5% of 10% aan breuken, kommagetallen en verhoudingen, en de nieuwe prijs uitrekenen uit de oude prijs en het kortingspercentage.', gen: () => Math.random() < 0.5 ? procentVanV() : nieuwePrijsV() },
      { doel: 'Je leert de oppervlakte berekenen van rechthoeken en driehoeken en de inhoud van een balk berekenen in dm³ en liter.', gen: () => Math.random() < 0.5 ? opp() : balkInhoudV(plus ? 12 : 8) },
    ],
    1: [
      { doel: 'Je leert in welke volgorde je moet vermenigvuldigen, delen, optellen en aftrekken.', gen: () => volgordeV() },
      { doel: 'Je leert delen met kommagetallen bij sommen als 18,88 : 5,9, door eerst te schatten en dan zonder komma te rekenen met de rekenmachine.', gen: () => { const deler = rnd(15, 95) / 10, q = rnd(2, plus ? 14 : 9), deeltal = +(deler * q).toFixed(2); return { vraag: `${komma(deeltal)} kg appels wordt verdeeld in zakken van ${komma(deler)} kg. Hoeveel zakken kun je vullen?`, antwoord: q, eenheid: 'zakken', uitleg: `${komma(deeltal)} : ${komma(deler)} = ${q}` } } },
      { doel: plus ? 'Je leert de oude prijs uitrekenen uit de nieuwe prijs en het kortingspercentage, en het totaal uitrekenen aan de hand van een percentage.' : 'Je herhaalt de nieuwe prijs uitrekenen uit de oude prijs en het kortingspercentage, en je leert het totaal uitrekenen aan de hand van een percentage.', gen: () => plus ? (Math.random() < 0.5 ? oudePrijsV() : totaalViaPctV()) : (Math.random() < 0.5 ? nieuwePrijsV() : totaalViaPctV()) },
      { doel: 'Je leert de tijd uitrekenen van een plaats in een andere tijdzone en de tijdsduur tussen 2 tijdstippen berekenen.', gen: () => Math.random() < 0.5 ? tijdzoneV() : tijdsduurV() },
    ],
    2: [
      { doel: 'Je leert heel grote getallen op 2 manieren schrijven (1,2 miljard en 1.200.000.000) en getallen afronden volgens de afrondregels.', gen: () => Math.random() < 0.5 ? grootGetalV() : afrondV(plus ? 98000 : 9800, plus ? [10, 100, 1000] : [10, 100, 1000]) },
      { doel: plus ? 'Je leert optellen en aftrekken met benoemde en onbenoemde kommagetallen.' : 'Je herhaalt het optellen en aftrekken van benoemde kommagetallen.', gen: () => kommaOptel() },
      { doel: 'Je herhaalt het koppelen van percentages aan breuken en verhoudingen en leert hoe je handig verhoudingsproblemen oplost.', gen: () => Math.random() < 0.5 ? procentRedeneerV() : verhoudingV() },
      { doel: 'Je leert met een schaallijntje een lengte op schaal omrekenen naar een lengte in het echt en omgekeerd, en de schaal berekenen.', gen: () => schaalV() },
    ],
    3: plus ? [
      { doel: 'Je leert bewerkingen schattend uitrekenen, in contexten waarbij het zinvol is om te schatten.', gen: () => schattenV() },
      { doel: 'Je leert een breuk met een breuk vermenigvuldigen.', gen: () => breukMaalBreukV() },
      { doel: 'Je leert redeneren over uitspraken met percentages, percentages boven 100% uitrekenen en het oude aantal uitrekenen.', gen: () => Math.random() < 0.5 ? procentRedeneerV() : oudAantalViaPctV() },
      { doel: 'Je leert rekenen met alle maten voor gewicht, schattend en precies, met prijzen en gewichten.', gen: () => Math.random() < 0.5 ? maatGewichtV() : samengesteld() },
    ] : [
      { doel: 'Je leert bewerkingen schattend uitrekenen, in contexten waarbij het zinvol is om te schatten.', gen: () => schattenV() },
      { doel: 'Je herhaalt het berekenen van een deel van een hoeveelheid en een heel getal met een benoemde breuk vermenigvuldigen.', gen: () => Math.random() < 0.5 ? deelVanGeheelV() : breukMaalHeelV() },
      { doel: 'Je leert redeneren over uitspraken met percentages, via 1% rekenen en het oude aantal uitrekenen.', gen: () => Math.random() < 0.5 ? procentRedeneerV() : oudAantalViaPctV() },
      { doel: 'Je leert rekenen met alle maten voor gewicht in verhaalsommen, schattend en precies met prijzen en gewichten.', gen: () => Math.random() < 0.5 ? maatGewichtV() : samengesteld() },
    ],
    4: [
      { doel: plus ? 'Je herhaalt cijferend vermenigvuldigen bij sommen als 22 × 65 en 36 × 65, en kolomsgewijs delen bij sommen als 5819 : 23.' : 'Je herhaalt cijferend of kolomsgewijs vermenigvuldigen bij sommen als 6 × 346 en 22 × 64, en kolomsgewijs delen bij 5819 : 23.', gen: () => Math.random() < 0.5 ? keerV(rnd(21, plus ? 89 : 49), rnd(21, 89)) : (() => { const deler = rnd(13, 29), quo = rnd(120, plus ? 399 : 250); return deelV(deler, quo) })() },
      { doel: plus ? 'Je leert sommen als 2/3 : 1/6 uitrekenen op de getallenlijn of met een verhoudingstabel en door te rekenen met verhoudingen.' : 'Je leert problemen (verhalen en/of plaatjes) met breuken oplossen door te tekenen of op de getallenlijn.', gen: () => plus ? breukDeelV() : deelVanGeheelV() },
      { doel: 'Je leert rekenen met breuken, kommagetallen, procenten en verhoudingen bij verschillende aanbiedingen.', gen: () => Math.random() < 0.5 ? nieuwePrijsV() : procentRedeneerV() },
      { doel: 'Je leert berekeningen maken met samengestelde grootheden, zoals de prijs per oppervlakte of gewicht, en verhoudingsgewijs vergelijken.', gen: () => Math.random() < 0.5 ? samengesteld() : verhoudingV() },
    ],
    5: [
      { doel: plus ? 'Je leert herkennen wanneer een getal deelbaar is door 2, 10, 5 of 4 en door 8, 3 en 9.' : 'Je leert herkennen wanneer een getal deelbaar is door 2, 10, 5 of 4.', gen: () => restV() },
      { doel: plus ? 'Je leert sommen als 3,5 : 0,5 met verhoudingen en sommen als 16,2 : 3 met splitsen uitrekenen.' : 'Je herhaalt sommen als 18,6 kg : 3 uitrekenen met de strategie splitsen.', gen: () => kommaDeelV() },
      { doel: 'Je leert contextproblemen over procenten, verhoudingen, breuken en kommagetallen oplossen.', gen: () => procentRedeneerV() },
      { doel: 'Je oriënteert je op het werken met diagrammen: gegevens aflezen, trends herkennen (stijgen, dalen, gelijk blijven), verbanden leggen en rekenen met eenvoudige percentages.', gen: () => diagramV(pick(['staaf', 'lijn']), pick([5, 10]), rnd(3, 9)) },
    ],
    6: [
      { doel: 'Je herhaalt het rekenen met een schaallijntje, het omrekenen van lengtes op schaal en in het echt, het berekenen van een schaal en van de omtrek en oppervlakte.', gen: () => Math.random() < 0.5 ? schaalV() : omtrekV(plus ? 30 : 16, plus ? 20 : 11) },
      { doel: 'Je herhaalt het berekenen van de inhoud van een balk in dm³ en liter en het aantal blokken dat in een grotere doos past.', gen: () => balkInhoudV(plus ? 12 : 8) },
      { doel: 'Je oriënteert je op het berekenen van de oppervlakte van figuren op roosters, die te verdelen zijn in rechthoeken en driehoeken.', gen: () => Math.random() < 0.5 ? oppRechthoekV(plus ? 30 : 16, plus ? 20 : 11) : oppDriehoekV() },
      { doel: 'Je oriënteert je op het berekenen van de omtrek en de oppervlakte van een cirkel.', gen: () => cirkelV() },
    ],
    7: [
      { doel: 'Je herhaalt het koppelen van veelvoorkomende percentages aan breuken, kommagetallen en verhoudingen, en leert contextproblemen oplossen.', gen: () => Math.random() < 0.5 ? procentVanV() : procentRedeneerV() },
      { doel: plus ? 'Je herhaalt ongelijknamige breuken optellen en vermenigvuldigen met breuken.' : 'Je herhaalt benoemde gelijknamige breuken optellen en het berekenen van een deel van een hoeveelheid.', gen: () => Math.random() < 0.5 ? breukOptelGelijkV() : (plus ? breukMaalBreukV() : deelVanGeheelV()) },
      { doel: 'Je oriënteert je op getallen en grafieken uit het nieuws en of die kloppen.', gen: () => diagramV('staaf', pick([5, 10]), rnd(3, 9)) },
      { doel: 'Je oriënteert je op het verwerken van enquêtes: het gemiddelde uitrekenen en rekenen met percentages.', gen: () => Math.random() < 0.5 ? gemiddeldeV() : procentVanV() },
    ],
    8: [
      { doel: 'Je herhaalt betekenis verlenen aan getallen tot in de miljarden, ze op 2 manieren schrijven en op volgorde zetten, aflezen en schattend plaatsen op een getallenlijn.', gen: () => Math.random() < 0.5 ? grootGetalV() : getallenlijnV(rnd(0, 5) * 1000000000, 5000000000, 500000000) },
      { doel: 'Je herhaalt het gemiddelde berekenen met hoofdrekenen en met de rekenmachine.', gen: () => gemiddeldeV() },
      { doel: 'Je oriënteert je op negatieve getallen en op Romeinse cijfers.', gen: () => romeinsV() },
      { doel: 'Je oriënteert je op eenvoudige kwadraten en wortels.', gen: () => kwadraatWortelV() },
    ],
    9: [
      { doel: plus ? 'Je herhaalt hoofdrekenend optellen, aftrekken, vermenigvuldigen en delen met eenvoudige benoemde en onbenoemde kommagetallen.' : 'Je herhaalt hoofdrekenend optellen, aftrekken, vermenigvuldigen en delen met eenvoudige benoemde kommagetallen.', gen: () => Math.random() < 0.5 ? kommaOptel() : kommaKeerV() },
      { doel: 'Je herhaalt in welke volgorde je moet optellen, aftrekken, vermenigvuldigen en delen.', gen: () => volgordeV() },
      { doel: plus ? 'Je leert staartdelen.' : 'Je herhaalt kolomsgewijs delen in maximaal 3 stappen.', gen: () => { const deler = rnd(13, 29); return deelRestV(deler, rnd(15, plus ? 99 : 49), rnd(1, deler - 1)) } },
      { doel: 'Je leert ontbinden in priemgetallen.', gen: () => priemV() },
    ],
    10: [
      { doel: 'Je herhaalt het werken met diagrammen: aflezen, berekenen, trends herkennen (stijgen, dalen, gelijk blijven) en rekenen met percentages.', gen: () => diagramV('staaf', pick([5, 10]), rnd(3, 9)) },
      { doel: 'Je herhaalt het werken met lijndiagrammen en met diagrammen met tijd en afstand: aflezen, maken en er berekeningen mee maken.', gen: () => diagramV('lijn', pick([5, 10]), rnd(3, 9)) },
      { doel: 'Je oriënteert je op het herkennen, uitleggen en voortzetten van patronen met figuren en in getallenrijen.', gen: () => patroonRijV() },
      { doel: 'Je oriënteert je op het handig tellen van alle mogelijke combinaties, waarbij de volgorde wel of niet belangrijk is.', gen: () => combinatiesV() },
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
    maakItem('blok-' + nr, nr === '0' ? '📍 Instap' : 'Blok ' + nr,
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
