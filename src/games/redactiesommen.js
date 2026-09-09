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
const euro = n => '€ ' + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const getal = n => n.toLocaleString('nl-NL')   // 35.400
const komma = n => String(n).replace('.', ',')

// ── Generatoren per blok. Factory zodat S+ grotere getallen krijgt. ──
// D(doel, delen) — een lesdoel loopt over twee lessen, en die twee lessen doen
// vaak niet hetzelfde. "Grote getallen plus en min" op dag één, "keer en delen"
// op dag twee, terwijl het in de methode één doel is. `delen` legt dat vast:
// deel 1 hoort bij de eerste les van het doel, deel 2 bij de tweede (zie
// DEEL_VAN_LES in denkvragenData.js). Waar een doel niet uit twee losse stukken
// bestaat, is deel 2 dezelfde soort som een maatje groter.
//
// Voor vrij oefenen en de weektaak blijft het gewoon één doel: `gen` pakt dan
// uit allebei de delen.
const D = (doel, delen) => ({ doel, delen, gen: () => pick(delen).gen() })

function maakBlokken(plus) {
  const M = plus ? 1 : 0   // S+ = iets grotere/lastigere getallen

  return {
    0: [
      D('Je leert sommen als 1200 + 1300 en 4500 - 1200 vlot uitrekenen met de kleine som, en sommen als 30 × 40 en 1500 : 30 met de kleine som.', [
        { label: 'plus en min', gen: () => Math.random() < 0.5
          ? optelV(rnd(11, 80) * 100, rnd(11, 40) * 100)
          : (() => { const a = rnd(25, 90) * 100, b = rnd(11, Math.floor(a / 100) - 5) * 100; return aftrekV(a, b) })() },
        { label: 'keer en delen', gen: () => Math.random() < 0.5
          ? keerV(rnd(2, 9) * 10, rnd(2, 9) * 10)
          : deelV(rnd(2, 9) * 10, rnd(2, 9) * 10) },
      ]),
      D('Je leert sommen als 487 + 235 cijferend optellen, 432 - 263 cijferend aftrekken en 4 × 231 cijferend uitrekenen.', [
        { label: 'cijferend plus en min', gen: () => Math.random() < 0.5
          ? optelV(...metOnthouden(150, 690))
          : aftrekV(...metLenen(240, 920)) },
        { label: 'cijferend keer', gen: () => keerV(rnd(3, 9), rnd(110, 590)) },
      ]),
      D('Je leert benoemde kommagetallen plaatsen en aflezen, een deel van een geheel berekenen en berekenen wat het geheel is.', [
        { label: 'kommagetal op de getallenlijn', gen: () => kommaLijnV() },
        { label: 'deel van een geheel, en terug', gen: () => pick([deelVanGeheelV, geheelTerugV])() },
      ]),
      D('Je leert de omtrek en de oppervlakte berekenen van een figuur met maten in centimeters of meters.', [
        { label: 'omtrek', gen: () => omtrekV(12 + M * 6, 9 + M * 5) },
        { label: 'oppervlakte', gen: () => oppRechthoekV(12 + M * 8, 9 + M * 6) },
      ]),
    ],
    1: [
      D('Je leert getallen tot en met 1 miljoen in cijfers schrijven, de waarde van de cijfers benoemen, en getallen op volgorde zetten, aflezen en schattend plaatsen op een getallenlijn.', [
        { label: 'in cijfers schrijven en cijferwaarde', gen: () => getalSchrijvenV(999) },
        { label: 'plaatsen op de getallenlijn', gen: () => getallenlijnV(rnd(0, 5) * 100000, 500000) },
      ]),
      D('Je leert sommen als 35.400 + 3500 en 56.700 - 2400 uitrekenen, en sommen als 50 × 7000 en 24.000 : 600 met de kleine som.', [
        { label: 'plus en min', gen: () => {
          if (Math.random() < 0.5) {
            const a = rnd(12, 89) * 1000 + rnd(1, 9) * 100, b = rnd(15, 49) * 100
            return { vraag: `Op de spaarrekening van ${naam()} staat € ${getal(a)}. Er komt € ${getal(b)} bij. Hoeveel staat er nu op de rekening?`,
                     kaal: `${getal(a)} + ${getal(b)} =`,
                     antwoord: a + b, uitleg: `${getal(a)} + ${getal(b)} = ${getal(a + b)}` }
          }
          const a = rnd(25, 89) * 1000 + rnd(1, 9) * 100, b = rnd(12, 24) * 100
          return { vraag: `Op de spaarrekening van ${naam()} staat € ${getal(a)}. Er gaat € ${getal(b)} af. Hoeveel staat er nu op de rekening?`,
                   kaal: `${getal(a)} − ${getal(b)} =`,
                   antwoord: a - b, uitleg: `${getal(a)} − ${getal(b)} = ${getal(a - b)}` }
        } },
        // 24.000 : 600 — deler én deeltal met nullen, zodat de kleine som helpt.
        { label: 'keer en delen', gen: () => Math.random() < 0.5
          ? keerV(rnd(2, 9) * 10, rnd(2, 9) * 1000)
          : deelV(rnd(2, 9) * 100, rnd(2, 9) * 10) },
      ]),
      D('Je leert helen uit de breuk halen en benoemde breuken in een rekenverhaal met elkaar vergelijken en op volgorde zetten.', [
        { label: 'helen uit de breuk halen', gen: () => breukHelenV() },
        { label: 'breuken vergelijken', gen: () => breukVergelijkV() },
      ]),
      D('Je leert de weeknotatie op een kalender gebruiken, de tijdsduur berekenen in dagen, uren en minuten, en een begintijd of eindtijd berekenen.', [
        { label: 'kalender en weken', gen: () => kalenderV() },
        { label: 'tijdsduur, begin- en eindtijd', gen: () => {
          const h1 = rnd(8, 12), m1 = pick([0, 5, 10, 15, 20, 25, 30, 40, 45])
          const dur = rnd(2, 4) * 15 + rnd(0, 2) * 30
          const tot = h1 * 60 + m1 + dur, h2 = Math.floor(tot / 60), m2 = tot % 60
          return { vraag: `De trein vertrekt om ${h1}:${PAD(m1)} uur en komt om ${h2}:${PAD(m2)} uur aan. Hoeveel minuten duurt de reis?`,
                   kaal: `Van ${h1}:${PAD(m1)} tot ${h2}:${PAD(m2)} = … minuten`,
                   antwoord: dur, eenheid: 'min', uitleg: `Van ${h1}:${PAD(m1)} tot ${h2}:${PAD(m2)} = ${dur} minuten` }
        } },
      ]),
    ],
    2: [
      D('Je leert sommen als 12 × 64 cijferend uitrekenen of met de strategie splitsen en je begrijpt wat je opschrijft.', [
        { label: 'tiener × tweecijferig', gen: () => keerV(rnd(11, plus ? 19 : 15), rnd(21, 59)) },
        { label: 'grotere getallen', gen: () => keerV(rnd(11, plus ? 29 : 19), rnd(41, 89)) },
      ]),
      D(plus ? 'Je leert sommen als 22 × 64 en 65 × 36 cijferend uitrekenen.' : 'Je leert sommen als 22 × 64 cijferend uitrekenen of met splitsen, en je herhaalt sommen als 6 × 346.', [
        { label: '22 × 64', gen: () => keerV(rnd(21, plus ? 49 : 49), rnd(21, 89)) },
        plus
          ? { label: '65 × 36', gen: () => keerV(rnd(50, 89), rnd(21, 89)) }
          : { label: 'herhaling: 6 × 346', gen: () => keerV(rnd(3, 9), rnd(110, 590)) },
      ]),
      D('Je leert hoofdrekenend optellen en aftrekken met eenvoudige benoemde kommagetallen.', [
        { label: 'optellen', gen: () => kommaHoofdrekenV(plus ? 40 : 24, 'plus') },
        { label: 'aftrekken', gen: () => kommaHoofdrekenV(plus ? 40 : 24, 'min') },
      ]),
      D('Je leert met een schaallijntje een lengte op schaal omrekenen naar een lengte in het echt en je leert hoe je de schaal berekent.', [
        { label: 'kaart ↔ in het echt', gen: () => schaalV('omrekenen') },
        { label: 'de schaal uitrekenen', gen: () => schaalV('schaal') },
      ]),
    ],
    3: [
      D('Je leert betekenis geven aan hele grote getallen tot in de miljarden, deze in cijfers schrijven en op volgorde zetten, aflezen en schattend plaatsen op een getallenlijn.', [
        { label: 'in cijfers schrijven', gen: () => grootGetalV() },
        { label: 'plaatsen op de getallenlijn', gen: () => getallenlijnV(rnd(0, 5) * 1000000000, 5000000000) },
      ]),
      D('Je leert cijferend of kolomsgewijs optellen en aftrekken met benoemde kommagetallen.', [
        { label: 'optellen', gen: () => kommaCijferV(plus ? 9000 : 4000, 'plus') },
        { label: 'aftrekken', gen: () => kommaCijferV(plus ? 9000 : 4000, 'min') },
      ]),
      D('Je leert welke breuken gelijkwaardig zijn en benoemde gelijknamige en ongelijknamige breuken vergelijken.', [
        { label: 'gelijkwaardige breuken', gen: () => pick([gelijkBreukV, gelijkwaardigeBreukV])() },
        { label: 'breuken vergelijken', gen: () => breukVergelijkV() },
      ]),
      D('Je leert maten voor lengte vergelijken, ordenen, omrekenen en optellen met hele getallen.', [
        { label: 'omrekenen', gen: () => maatLengteV() },
        { label: 'optellen met maten', gen: () => maatLengteOptelV() },
      ]),
    ],
    4: [
      D('Je leert sommen met een rekenmachine uitrekenen met eerst een passende schatting, en kiezen tussen hoofdrekenen en de rekenmachine.', [
        { label: 'schatten bij keersommen', gen: () => schattenV('keer') },
        { label: 'schatten bij geld en optellen', gen: () => schattenV('geld') },
      ]),
      D('Je leert eenvoudige breuken omzetten in kommagetallen en omgekeerd, met en zonder rekenmachine.', [
        { label: 'breuk → kommagetal', gen: () => breukKommaV() },
        { label: 'kommagetal → breuk', gen: () => kommaNaarBreukV() },
      ]),
      D('Je leert percentages aflezen en inkleuren in een strook of cirkel, en percentages aan breuken koppelen en uitrekenen.', [
        { label: 'percentage in een strook', gen: () => procentVanAantalV(plus ? [10, 20, 25, 50, 75] : [10, 25, 50], plus ? 9 : 6,
          'In de aula zitten', 'kinderen', 'heeft een boek bij zich') },
        { label: 'percentage in een cirkel', gen: () => cirkelDiagramV(plus ? 10 : 6) },
      ]),
      D('Je leert de gemiddelde snelheid uitrekenen in kilometer per uur en rekenen met de gemiddelde snelheid.', [
        { label: 'de snelheid uitrekenen', gen: () => snelheidV() },
        // Andersom: uit snelheid en tijd de afstand, want "rekenen mét de
        // gemiddelde snelheid" is meer dan hem alleen uitrekenen.
        { label: 'rekenen met de snelheid', gen: () => {
          const v = pick([60, 70, 80, 90, 100]), t = rnd(2, plus ? 6 : 4)
          return { vraag: `Een auto rijdt gemiddeld ${v} km per uur en doet er ${t} uur over. Hoeveel kilometer legt de auto af?`,
                   kaal: `${v} km/u × ${t} uur = … km`,
                   antwoord: v * t, eenheid: 'km', uitleg: `${v} km/u × ${t} uur = ${v * t} km` }
        } },
      ]),
    ],
    5: [
      D('Je leert kolomsgewijs delen bij sommen als 357 : 17 en 360 : 17 (met rest), in maximaal 2 stappen.', [
        { label: 'zonder rest', gen: () => deelV(rnd(12, 19), rnd(11, plus ? 39 : 25)) },
        { label: 'met rest', gen: () => { const deler = rnd(12, 19); return deelRestV(deler, rnd(11, plus ? 39 : 25), rnd(1, deler - 1)) } },
      ]),
      D('Je leert kolomsgewijs delen bij sommen als 3726 : 23 en 3732 : 23 (met rest), in maximaal 3 stappen.', [
        { label: 'zonder rest', gen: () => deelV(rnd(13, 29), rnd(100, plus ? 299 : 199)) },
        { label: 'met rest', gen: () => { const deler = rnd(13, 29); return deelRestV(deler, rnd(100, plus ? 299 : 199), rnd(1, deler - 1)) } },
      ]),
      D('Je leert rekenen met verhoudingen met een verhoudingstabel, ook in cirkeldiagrammen en met breuken.', [
        { label: 'verhoudingstabel', gen: () => verhoudingsTabelV() },
        { label: 'cirkeldiagram', gen: () => cirkelDiagramV(plus ? 10 : 6) },
      ]),
      D('Je leert de oppervlakte berekenen van rechthoeken en eenvoudige figuren met maten in cm, dm of m.', [
        { label: 'rechthoek', gen: () => oppRechthoekV(plus ? 25 : 12, plus ? 18 : 9) },
        // L-vorm: een grote rechthoek met een hoek eruit. Twee manieren om hem
        // te verdelen, precies waar "eenvoudige figuren" over gaat.
        { label: 'driehoek en L-vorm', gen: () => {
          if (Math.random() < 0.5) return oppDriehoekV()
          const l = rnd(6, plus ? 14 : 10), b = rnd(4, plus ? 10 : 7)
          const hl = rnd(2, l - 3), hb = rnd(2, b - 2)
          return { vraag: `Een kamer heeft de vorm van een L. De hele rechthoek zou ${l} m bij ${b} m zijn, maar er is een hoek van ${hl} m bij ${hb} m uit weggelaten. Hoeveel m² is de kamer?`,
                   kaal: `Rechthoek ${l} m bij ${b} m, met een hoek van ${hl} m bij ${hb} m eruit. Hoeveel m²?`,
                   antwoord: l * b - hl * hb, eenheid: 'm²',
                   uitleg: `Hele rechthoek: ${l} × ${b} = ${l * b} m². Hoek eraf: ${hl} × ${hb} = ${hl * hb} m². ${l * b} − ${hl * hb} = ${l * b - hl * hb} m²` }
        } },
      ]),
    ],
    6: [
      D('Je leert betekenis verlenen aan getallen tot in de miljarden, afronden op een honderdduizendtal en getallen op 2 manieren schrijven (5,2 miljoen en 5.200.000).', [
        { label: '5,2 miljoen in cijfers', gen: () => miljoenV('cijfers') },
        { label: 'afronden op honderdduizendtallen', gen: () => miljoenV('afronden') },
      ]),
      D('Je leert een heel getal met een benoemde breuk vermenigvuldigen.', [
        { label: 'basis', gen: () => breukMaalHeelV(false) },
        { label: 'grotere aantallen', gen: () => breukMaalHeelV(true) },
      ]),
      D('Je leert een deel van hoeveelheden omrekenen naar 5%, 10%, 25%, 50%, 75% en 100%, en 5% of 10% koppelen aan breuken, kommagetallen en verhoudingen.', [
        { label: '25%, 50% en 75%', gen: () => procentVanAantalV([25, 50, 75], plus ? 12 : 8,
          'Op het schoolplein staan', 'kinderen', 'gaat naar binnen') },
        { label: '5% en 10%', gen: () => procentVanAantalV([5, 10], plus ? 12 : 8,
          'Op het schoolplein staan', 'kinderen', 'gaat naar binnen') },
      ]),
      D('Je leert staafdiagrammen en cirkeldiagrammen aflezen, maken en gebruiken bij berekeningen.', [
        { label: 'staafdiagram', gen: () => diagramV('staaf', pick([5, 10]), rnd(3, 9)) },
        { label: 'cirkeldiagram', gen: () => cirkelDiagramV(plus ? 12 : 8) },
      ]),
    ],
    7: [
      D('Je leert het gemiddelde berekenen met hoofdrekenen en met de rekenmachine.', [
        { label: 'hoofdrekenen', gen: () => gemiddeldeV(false) },
        { label: 'met de rekenmachine', gen: () => gemiddeldeV(true) },
      ]),
      D('Je leert benoemde kommagetallen vermenigvuldigen met 10, 100 en 1000 en delen door 10 en 100.', [
        { label: '× 10, 100 en 1000', gen: () => kommaMaal10V() },
        { label: ': 10 en 100', gen: () => kommaDeel10V() },
      ]),
      D('Je leert rekenen met verhoudingen in allerlei situaties en rekenen met vreemde valuta.', [
        { label: 'verhoudingen', gen: () => verhoudingV() },
        { label: 'vreemde valuta', gen: () => valutaV() },
      ]),
      D('Je leert de inhoud van een balk berekenen in dm³ en liter, en uitrekenen hoeveel blokken van 1 dm³ er in een grotere doos passen.', [
        { label: 'inhoud in liter', gen: () => balkInhoudV(plus ? 9 : 6, 'liter') },
        { label: 'blokken van 1 dm³', gen: () => balkInhoudV(plus ? 9 : 6, 'blokken') },
      ]),
    ],
    8: [
      D('Je leert hoe je eenvoudige opgaven met hele getallen en kommagetallen in een verhaal op de rekenmachine kunt uitrekenen.', [
        { label: 'basis', gen: () => boodschappenV(false) },
        { label: 'grotere bedragen', gen: () => boodschappenV(true) },
      ]),
      D('Je herhaalt het vermenigvuldigen van een heel getal met een benoemde breuk.', [
        { label: 'basis', gen: () => breukMaalHeelV(false) },
        { label: 'grotere aantallen', gen: () => breukMaalHeelV(true) },
      ]),
      D('Je leert de nieuwe prijs uitrekenen als je de oude prijs en het kortingspercentage weet, en percentages boven 100% uitrekenen.', [
        { label: 'korting en nieuwe prijs', gen: () => pick([nieuwePrijsV, kortingPctV])() },
        { label: 'boven de 100%', gen: () => pctBoven100V() },
      ]),
      D('Je leert gewichten omrekenen naar een andere maat, een passende maat kiezen en rekenen met prijzen en gewichten.', [
        { label: 'gewichten omrekenen', gen: () => maatGewichtV() },
        { label: 'prijs en gewicht', gen: () => maatGewichtV('prijs') },
      ]),
    ],
    9: [
      D('Je leert kolomsgewijs delen bij sommen als 5819 : 23 met en zonder rest, in maximaal 3 stappen.', [
        { label: 'zonder rest', gen: () => deelV(rnd(13, 29), rnd(120, plus ? 399 : 250)) },
        { label: 'met rest', gen: () => { const deler = rnd(13, 29); return deelRestV(deler, rnd(120, plus ? 399 : 250), rnd(1, deler - 1)) } },
      ]),
      D('Je leert vermenigvuldigen en delen met benoemde kommagetallen.', [
        { label: 'vermenigvuldigen', gen: () => kommaKeerV() },
        { label: 'delen', gen: () => kommaDeelV() },
      ]),
      D('Je leert percentages uitrekenen via 1%, kiezen tussen rekenen met een breuk en via 1%, en percentages uitrekenen met de rekenmachine.', [
        { label: 'via 1%', gen: () => procentVia1V(false) },
        { label: 'met de rekenmachine', gen: () => procentVia1V(true) },
      ]),
      D('Je leert windrichtingen gebruiken om een standpunt aan te geven, beschrijven wat je vanuit een standpunt ziet en routes beschrijven en volgen.', [
        { label: 'standpunt en draaien', gen: () => windrichtingV('draaien') },
        { label: 'een route volgen', gen: () => windrichtingV('route') },
      ]),
    ],
    10: [
      D('Je leert bewerkingen schattend uitrekenen, in contexten waarbij het zinvol is om te schatten.', [
        { label: 'schatten bij keersommen', gen: () => schattenV('keer') },
        { label: 'schatten bij geld en optellen', gen: () => schattenV('geld') },
      ]),
      D('Je leert vermenigvuldigen met kommagetallen, bij sommen als 2,9 × 8,1 en 24 × 0,67: eerst schatten, dan zonder komma rekenen met de rekenmachine en ten slotte de komma plaatsen.', [
        { label: 'kommagetal × kommagetal', gen: () => kommaVermV() },
        { label: 'heel getal × kommagetal', gen: () => {
          const a = rnd(110, 220) / 100, liter = rnd(20, plus ? 600 : 250) / 10
          return { vraag: `1 liter benzine kost ${euro(a)}. Je tankt ${komma(liter)} liter. Hoeveel betaal je?`,
                   kaal: `${komma(liter)} × ${euro(a)} =`,
                   antwoord: +(a * liter).toFixed(2), eenheid: '€', uitleg: `${komma(liter)} × ${euro(a)} = ${euro(a * liter)}` }
        } },
      ]),
      D('Je leert eenvoudige breuken omzetten in kommagetallen en omgekeerd, ze vergelijken en op volgorde zetten.', [
        { label: 'omzetten', gen: () => pick([breukKommaV, kommaNaarBreukV])() },
        { label: 'vergelijken en ordenen', gen: () => breukVergelijkV() },
      ]),
      D('Je leert eenvoudige lijndiagrammen en diagrammen met tijd en afstand aflezen, maken en er berekeningen mee maken.', [
        { label: 'aflezen', gen: () => diagramV('lijn', pick([5, 10]), rnd(3, 9), 'lees') },
        { label: 'ermee rekenen', gen: () => diagramV('lijn', pick([5, 10]), rnd(3, 9), 'rekenen') },
      ]),
    ],
  }
}

// ── Verhaal-bouwers: geven {vraag, antwoord, uitleg} terug ──
//
// Een verhaaltjessom is pas een verhaaltjessom als er een situatie in zit die
// een kind zich kan voorstellen, en de bewerking niet in de zin wordt
// voorgezegd. Daarom staan de getallen hier in twee zinnen: eerst wat er aan
// de hand is, dan pas de vraag. Woorden als "erbij", "eraf" en "samen" zijn er
// zoveel mogelijk uit gehouden, zodat het kind zelf moet bedenken wat de som
// is. Namen worden zo gebruikt dat er nooit "hij" of "zij" bij hoeft.
//
// Naast het verhaal geeft elke bouwer een `kaal`: dezelfde som zonder context.
// De lescheck gebruikt die, want daar wil de leerkracht weten of het kind de
// bewerking van de les beheerst — niet of het de som uit een verhaal kan
// vissen. Bij opgaven met een tekening (getallenlijn, diagram, figuur) is de
// kale vorm gewoon de korte vraag bij het plaatje.
//
// Elk scenario past bij de grootte van de getallen: 3400 knikkers in een
// broekzak bestaat niet, en 45 inwoners van een stad ook niet. KLEIN = op
// kindformaat, GROOT = bezoekers, euro's, kilometers en fabrieksaantallen.
const naam2 = (a) => { for (let i = 0; i < 20; i++) { const b = naam(); if (b !== a) return b } return a === 'Sem' ? 'Noor' : 'Sem' }

const OPTEL_KLEIN = [
  (a, b) => { const n = naam(), m = naam2(n), d = ding(); return `${n} en ${m} gaan naar een ruilbeurs. ${n} heeft ${getal(a)} ${d[1]} in een la liggen, ${m} bewaart er ${getal(b)} in een blik. Hoeveel ${d[1]} nemen ze mee naar de beurs?` },
  (a, b) => { const n = naam(), d = ding(); return `${n} ruimt de zolder op en vindt twee oude dozen. In de ene doos zitten ${getal(a)} ${d[1]}, in de andere ${getal(b)}. Hoeveel ${d[1]} heeft ${n} gevonden?` },
  (a, b) => { const d = ding(); return `De klas maakt een muur vol ${d[1]}. Op maandag hangen er ${getal(a)}, op dinsdag komen er ${getal(b)} nieuwe bij. Hoeveel ${d[1]} hangen er dan op de muur?` },
  (a, b) => { const n = naam(); return `${n} speelt een spel op de tablet. In het eerste level scoort ${n} ${getal(a)} punten, in het tweede level ${getal(b)}. Met hoeveel punten eindigt ${n}?` },
]
const OPTEL_GROOT = [
  (a, b) => `Het schoolplein wordt opgeknapt. De gemeente betaalt ${getal(a)} euro en de ouderraad legt ${getal(b)} euro in. Hoeveel euro is er voor het nieuwe plein?`,
  (a, b) => `In het museum wordt geteld hoeveel mensen er langskomen. In het voorjaar waren dat er ${getal(a)}, in de zomer ${getal(b)}. Hoeveel bezoekers zijn dat over die twee seizoenen?`,
  (a, b) => `Een pretpark verkoopt kaartjes via internet en aan de kassa. Online gingen er ${getal(a)} weg, aan de kassa ${getal(b)}. Hoeveel kaartjes zijn er verkocht?`,
  (a, b) => { const n = naam(); return `${n} houdt bij hoeveel kilometer de familie fietst. Vorig jaar stond de teller op ${getal(a)} km, dit jaar kwam daar ${getal(b)} km bij. Hoeveel kilometer staat er nu op de teller?` },
  (a, b) => `Een fabriek maakt fietsbellen. In de eerste helft van het jaar rolden er ${getal(a)} van de band, in de tweede helft ${getal(b)}. Hoeveel fietsbellen zijn er dat jaar gemaakt?`,
]
const optelV = (a, b) => {
  const kies = Math.max(a, b) >= 1000 ? OPTEL_GROOT : OPTEL_KLEIN
  return { vraag: pick(kies)(a, b), kaal: `${getal(a)} + ${getal(b)} =`,
           antwoord: a + b, uitleg: `${getal(a)} + ${getal(b)} = ${getal(a + b)}` }
}

const AFTREK_KLEIN = [
  (a, b) => { const n = naam(), m = naam2(n), d = ding(); return `${n} heeft een verzameling van ${getal(a)} ${d[1]}. Voor de verjaardag van ${m} gaan er ${getal(b)} uit de verzameling. Hoeveel ${d[1]} houdt ${n} over?` },
  (a, b) => { const d = ding(); return `Voor de fancy fair legt de klas ${getal(a)} ${d[1]} op tafel. Aan het eind van de dag zijn er ${getal(b)} verkocht. Hoeveel ${d[1]} gaan er mee terug de klas in?` },
  (a, b) => { const n = naam(), d = ding(); return `In de kast van ${n} staat een pot met ${getal(a)} ${d[1]}. ${n} vult er een zakje mee voor onderweg en doet er ${getal(b)} in. Hoeveel ${d[1]} blijven er in de pot?` },
  (a, b) => { const n = naam(); return `${n} speelt een spel met ${getal(a)} punten op de teller. Door een verkeerde stap verliest ${n} er ${getal(b)}. Hoeveel punten heeft ${n} nog?` },
]
const AFTREK_GROOT = [
  (a, b) => { const n = naam(); return `Op de spaarrekening van de familie van ${n} staat ${getal(a)} euro. Er wordt een tweedehands auto van ${getal(b)} euro van betaald. Hoeveel euro staat er daarna nog op de rekening?` },
  (a, b) => `Een festival mag ${getal(a)} bezoekers binnenlaten. Er zijn al ${getal(b)} kaarten verkocht. Voor hoeveel bezoekers is er nog plek?`,
  (a, b) => `De bibliotheek heeft ${getal(a)} boeken op de plank staan. Bij de opruiming gaan er ${getal(b)} naar een andere school. Hoeveel boeken blijven er staan?`,
  (a, b) => `Een webshop had ${getal(a)} pakketjes in het magazijn. De bezorgdienst haalt er ${getal(b)} op. Hoeveel pakketjes staan er nog in het magazijn?`,
  (a, b) => { const n = naam(); return `${n} leest dat er in een stad ${getal(a)} mensen wonen. In het dorp ernaast wonen er ${getal(b)}. Hoeveel mensen wonen er meer in de stad dan in het dorp?` },
]
const aftrekV = (a, b) => {   // a >= b
  const kies = a >= 1000 ? AFTREK_GROOT : AFTREK_KLEIN
  return { vraag: pick(kies)(a, b), kaal: `${getal(a)} − ${getal(b)} =`,
           antwoord: a - b, uitleg: `${getal(a)} − ${getal(b)} = ${getal(a - b)}` }
}

const KEER_KLEIN = [
  (a, b) => { const n = naam(), d = ding(); return `${n} maakt kadootjes voor de hele klas. Er komen ${a} zakjes op tafel en in elk zakje gaan ${getal(b)} ${d[1]}. Hoeveel ${d[1]} heeft ${n} nodig?` },
  (a, b) => { const d = ding(); return `In de winkel staat een rek met ${a} planken. Op elke plank liggen ${getal(b)} ${d[1]}. Hoeveel ${d[1]} liggen er in het rek?` },
  (a, b) => { const n = naam(), d = ding(); return `${n} legt ${d[1]} in een patroon op de vloer: ${a} rijen met in elke rij ${getal(b)} stuks. Hoeveel ${d[1]} liggen er op de vloer?` },
  (a, b) => `In de aula staan ${a} rijen stoelen. In elke rij staan er ${getal(b)}. Voor hoeveel bezoekers is er plek?`,
  (a, b) => { const n = naam(); return `${n} plakt een fotoboek vol. Er zijn ${a} bladzijden en op elke bladzijde passen ${getal(b)} foto's. Hoeveel foto's passen er in het boek?` },
]
const KEER_GROOT = [
  (a, b) => `Een vrachtwagen rijdt ${a} keer heen en weer naar het magazijn. Elke rit gaan er ${getal(b)} flessen mee. Hoeveel flessen zijn er na alle ritten vervoerd?`,
  (a, b) => `In het stadion zijn ${a} vakken. In elk vak passen ${getal(b)} toeschouwers. Hoeveel mensen kunnen er in het stadion?`,
  (a, b) => `Een drukkerij maakt een tijdschrift. Er worden ${a} pakken gedrukt met in elk pak ${getal(b)} exemplaren. Hoeveel tijdschriften zijn dat?`,
  (a, b) => { const n = naam(); return `${n} rekent uit wat de schoolreisjes kosten. Er gaan ${a} groepen mee en per groep kost het ${getal(b)} euro. Hoeveel euro is dat bij elkaar?` },
]
const keerV = (a, b) => {   // a groepjes van b
  const kies = b >= 1000 ? KEER_GROOT : KEER_KLEIN
  return { vraag: pick(kies)(a, b), kaal: `${a} × ${getal(b)} =`,
           antwoord: a * b, uitleg: `${a} × ${getal(b)} = ${getal(a * b)}` }
}

// Verdelen over een klein aantal (eerlijk delen) of inpakken per groot aantal:
// "verdeeld over 600 kinderen" bestaat niet, "dozen van 600 stuks" wel.
const DEEL_KLEIN = [
  (t, deler, d) => { const n = naam(); return `Op de laatste schooldag deelt meester ${n} ${getal(t)} ${d[1]} uit aan ${deler} kinderen. Iedereen krijgt er evenveel. Hoeveel ${d[1]} krijgt één kind?` },
  (t, deler) => { const n = naam(); return `${n} zet ${getal(t)} stoelen klaar in de aula, in ${deler} even lange rijen. Hoeveel stoelen komen er in één rij?` },
  (t, deler, d) => `De kantine heeft ${getal(t)} ${d[1]} en verdeelt ze precies over ${deler} bakken. Hoeveel ${d[1]} gaan er in één bak?`,
  (t, deler) => `Een team van ${deler} vrienden wint ${getal(t)} euro met een quiz. Ze verdelen het geld eerlijk. Hoeveel euro krijgt ieder van hen?`,
]
const DEEL_GROOT = [
  (t, deler, d) => `Een webshop verstuurt ${getal(t)} ${d[1]}. In één doos passen er ${getal(deler)}. Hoeveel dozen zijn er nodig?`,
  (t, deler) => `Op de kwekerij staan ${getal(t)} plantjes. Ze gaan in kratten van ${getal(deler)} stuks. Hoeveel kratten worden dat?`,
  (t, deler) => `Een festival verkoopt ${getal(t)} kaartjes. In elke tent passen ${getal(deler)} bezoekers. Hoeveel tenten zijn er nodig?`,
]
const deelV = (deler, q) => {   // exact, antwoord = q
  const totaal = deler * q, d = ding()
  const kies = deler <= 30 ? DEEL_KLEIN : DEEL_GROOT
  return { vraag: pick(kies)(totaal, deler, d), kaal: `${getal(totaal)} : ${getal(deler)} =`,
           antwoord: q, uitleg: `${getal(totaal)} : ${getal(deler)} = ${getal(q)}` }
}
const DEELREST = [
  (t, deler, d) => { const n = naam(); return `${n} doet ${getal(t)} ${d[1]} in zakjes van ${deler} stuks. Wat er niet meer in een vol zakje past, houdt ${n} over. Hoeveel volle zakjes worden het, en hoeveel ${d[1]} blijven er over?` },
  (t, deler) => `De bakker legt ${getal(t)} koekjes in doosjes van ${deler}. Alleen volle doosjes gaan naar de winkel. Hoeveel doosjes gaan er naar de winkel, en hoeveel koekjes blijven er in de bakkerij?`,
  (t, deler) => { const n = naam(); return `Voor het toernooi meldt ${n} ${getal(t)} spelers aan. Er worden teams van ${deler} spelers gemaakt. Hoeveel volle teams zijn dat, en hoeveel spelers blijven er over?` },
]
const deelRestV = (deler, q, rest) => {
  const totaal = deler * q + rest, d = ding()
  return {
    vraag: pick(DEELREST)(totaal, deler, d),
    kaal: `${getal(totaal)} : ${deler} = … met rest …`,
    antwoord: q, rest, uitleg: `${getal(totaal)} : ${deler} = ${q} met rest ${rest}`,
  }
}

// ── Extra verhaal-bouwers voor de ontbrekende groep-7-doelen ──
const gelijkBreukV = () => {   // gelijkwaardige breuken in een verhaal
  const noem = pick([2, 3, 4, 5]), tel = 1, f = pick([2, 3, 4])
  const n = naam(), d = pick(['reep chocola', 'pizza', 'taart', 'cake'])
  return { vraag: `Een ${d} is in ${noem * f} gelijke stukjes verdeeld. ${n} eet ${tel}/${noem} van de ${d}. Hoeveel van die ${noem * f} stukjes is dat?`,
           kaal: `${tel}/${noem} = ?/${noem * f}`,
           antwoord: tel * f, eenheid: 'stukjes', uitleg: `${tel}/${noem} = ${tel * f}/${noem * f}, want ${noem} × ${f} = ${noem * f}. Dus ${tel * f} stukjes.` }
}
// Schattend rekenen in drie soorten context, niet alleen "rijen × stoelen":
// het doel gaat over situaties waarin schatten zinvol is, en dat is bij geld
// en bij optellen net zo goed als bij vermenigvuldigen.
const schattenV = (soort) => {
  const n = naam()
  const k = soort === 'keer' ? 1 : soort === 'geld' ? rnd(2, 3) : rnd(1, 3)
  if (k === 1) {
    const a = rnd(11, 89), b = rnd(11, 89), ra = Math.round(a / 10) * 10, rb = Math.round(b / 10) * 10
    return { vraag: `${n} zit in de bioscoop en kijkt rond: er zijn ${a} rijen met ${b} stoelen. Hoeveel stoelen dat ongeveer zijn wil ${n} schatten: rond ${a} en ${b} af op tientallen en vermenigvuldig. Wat is de schatting?`,
             kaal: `Schat: ${a} × ${b} ≈ (rond af op tientallen)`,
             antwoord: ra * rb, eenheid: 'stoelen', uitleg: `${a} ≈ ${ra} en ${b} ≈ ${rb}. ${ra} × ${rb} = ${ra * rb}.` }
  }
  if (k === 2) {
    const prijs = rnd(180, 990) / 100, aantal = rnd(11, 39)
    const rp = Math.round(prijs), ra = Math.round(aantal / 10) * 10
    return { vraag: `De school bestelt ${aantal} leesboeken van ${euro(prijs)} per stuk. ${n} wil snel weten of dat binnen het budget past en schat het bedrag: rond allebei af en vermenigvuldig. Wat is de schatting (in hele euro's)?`,
             kaal: `Schat: ${aantal} × ${euro(prijs)} ≈ (in hele euro's)`,
             antwoord: rp * ra, eenheid: '€', uitleg: `${euro(prijs)} ≈ € ${rp} en ${aantal} ≈ ${ra}. ${rp} × ${ra} = € ${rp * ra}.` }
  }
  const a = rnd(180, 890), b = rnd(180, 890), c = rnd(180, 890)
  const r = (x) => Math.round(x / 100) * 100
  return { vraag: `Het schoolmuseum houdt drie dagen open huis. Er kwamen ${a}, ${b} en ${c} bezoekers. ${n} moet voor de krant snel een aantal noemen: rond elk getal af op honderdtallen en tel op. Wat is de schatting?`,
           kaal: `Schat: ${a} + ${b} + ${c} ≈ (rond af op honderdtallen)`,
           antwoord: r(a) + r(b) + r(c), eenheid: 'bezoekers',
           uitleg: `${a} ≈ ${r(a)}, ${b} ≈ ${r(b)}, ${c} ≈ ${r(c)}. Samen ${r(a) + r(b) + r(c)}.` }
}
const BREUK_KOMMA = [['1/2', 0.5], ['1/4', 0.25], ['3/4', 0.75], ['1/5', 0.2], ['2/5', 0.4], ['3/5', 0.6], ['1/10', 0.1], ['3/10', 0.3]]
const breukKommaV = () => {
  const [b, d] = pick(BREUK_KOMMA)
  const n = naam()
  return { vraag: `${n} loopt ${b} kilometer naar school. Schrijf die afstand als kommagetal (in km).`, kaal: `${b} = … (als kommagetal)`, antwoord: d, eenheid: 'km', uitleg: `${b} km = ${komma(d)} km` }
}
const breukMaalHeelV = (zwaar) => {   // heel getal × benoemde breuk
  const noem = pick(zwaar ? [3, 4, 5, 6] : [2, 3, 4]), keer = zwaar ? rnd(4, 8) : rnd(2, 5)
  const h = keer * noem, nm = naam()
  if (Math.random() < 0.5) {
    return { vraag: `Op het schoolfeest snijdt ${nm} elke pizza in ${noem} even grote punten. Aan het eind van de avond zijn er ${h} punten op. Hoeveel héle pizza's zijn er opgegeten?`,
             kaal: `${h} × 1/${noem} =`,
             antwoord: keer, eenheid: "pizza's", uitleg: `${h} × 1/${noem} = ${h}/${noem} = ${keer} hele pizza's.` }
  }
  const liters = pick([2, 3, 4, 6])
  return { vraag: `${nm} schenkt limonade uit een kan van ${liters} liter. In elk glas gaat 1/${noem} liter. Hoeveel glazen kan ${nm} vullen?`,
           kaal: `${liters} : 1/${noem} =`,
           antwoord: liters * noem, eenheid: 'glazen', uitleg: `${liters} : 1/${noem} = ${liters} × ${noem} = ${liters * noem} glazen.` }
}
const kommaMaal10V = () => {   // benoemd kommagetal × 10/100/1000
  const g = rnd(105, 995) / 100, f = pick([10, 100, 1000]), ant = +(g * f).toFixed(2)
  const n = naam()
  return { vraag: `${n} helpt met de bestelling voor de schoolkantine. Eén pakje drinken kost ${euro(g)} en er gaan er ${getal(f)} in de bestelling. Hoeveel euro kost die bestelling?`, kaal: `${getal(f)} × ${euro(g)} =`, antwoord: ant, eenheid: '€', uitleg: `${getal(f)} × ${euro(g)} = ${euro(ant)}` }
}
const boodschappenV = (zwaar) => {   // rekenmachine-verhaal met totaal
  const n1 = zwaar ? rnd(6, 12) : rnd(2, 6), p1 = rnd(120, zwaar ? 950 : 350) / 100
  const n2 = zwaar ? rnd(5, 11) : rnd(2, 5), p2 = rnd(90, zwaar ? 600 : 250) / 100
  const tot = +(n1 * p1 + n2 * p2).toFixed(2)
  return { vraag: `${naam()} doet de boodschappen voor thuis en legt ${n1} broden van ${euro(p1)} en ${n2} pakken melk van ${euro(p2)} op de band. Welk bedrag komt er straks op het kassascherm te staan?`,
           kaal: `${n1} × ${euro(p1)} + ${n2} × ${euro(p2)} =`,
           antwoord: tot, eenheid: '€', uitleg: `${n1} × ${euro(p1)} = ${euro(n1 * p1)}, ${n2} × ${euro(p2)} = ${euro(n2 * p2)}. Samen ${euro(tot)}.` }
}
const kommaKeerV = () => {   // vermenigvuldigen met benoemd kommagetal
  const n = rnd(2, 8), g = rnd(120, 450) / 100, tot = +(n * g).toFixed(2)
  return { vraag: `${naam()} tilt ${n} zakken potgrond in de kar. Elke zak weegt ${komma(g)} kg. Hoeveel kilogram gaat er in de kar?`,
           kaal: `${n} × ${komma(g)} =`,
           antwoord: tot, eenheid: 'kg', uitleg: `${n} × ${komma(g)} = ${komma(tot)} kg` }
}
const WINDRICHTINGEN = [['het oosten', 90], ['het zuiden', 180], ['het westen', 270], ['het zuidoosten', 135], ['het zuidwesten', 225], ['het noordoosten', 45]]
const windrichtingV = (soort) => {
  const nm = naam()
  const k = soort === 'route' ? rnd(1, 2) : soort === 'draaien' ? 3 : rnd(1, 3)
  if (k === 1) {
    const a = rnd(4, 9) * 100, b = rnd(1, 3) * 100
    return { vraag: `${nm} fietst vanaf huis ${getal(a)} m naar het noorden. Daar blijkt de brug dicht te zijn, dus fietst ${nm} weer ${getal(b)} m terug naar het zuiden. Hoeveel meter is ${nm} dan nog van huis vandaan?`,
             kaal: `${getal(a)} m naar het noorden, dan ${getal(b)} m naar het zuiden. Hoeveel meter van huis?`,
             antwoord: a - b, eenheid: 'm', uitleg: `Noord en zuid zijn tegenover elkaar: ${getal(a)} − ${getal(b)} = ${getal(a - b)} m van huis.` }
  }
  if (k === 2) {
    const a = rnd(2, 9) * 100, b = rnd(2, 9) * 100
    return { vraag: `${nm} loopt een rondje om het park: eerst ${getal(a)} m naar het oosten, dan ${getal(b)} m naar het zuiden, dan ${getal(a)} m naar het westen en tenslotte ${getal(b)} m naar het noorden. Hoeveel meter loopt ${nm} in dat rondje?`,
             kaal: `Rondje: ${getal(a)} m oost, ${getal(b)} m zuid, ${getal(a)} m west, ${getal(b)} m noord. Hoeveel meter?`,
             antwoord: 2 * (a + b), eenheid: 'm', uitleg: `Oost en west zijn even lang, noord en zuid ook: 2 × (${getal(a)} + ${getal(b)}) = ${getal(2 * (a + b))} m.` }
  }
  const [r, deg] = pick(WINDRICHTINGEN)
  return { vraag: `${nm} staat op de uitkijktoren met het gezicht naar het noorden en draait met de klok mee, tot ${nm} recht naar ${r} kijkt. Hoeveel graden heeft ${nm} gedraaid?`,
           kaal: `Van het noorden met de klok mee naar ${r} = … graden`,
           antwoord: deg, eenheid: '°', uitleg: `Noord = 0°, oost = 90°, zuid = 180°, west = 270°. Naar ${r} is ${deg}°.` }
}
// Schaal: van de kaart naar het echt, van het echt naar de kaart, en de schaal
// zelf uitrekenen — het doel noemt die laatste met zoveel woorden.
const schaalV = (soort) => {
  const N = pick([100, 500, 1000, 2500]), cm = rnd(2, 9), nm = naam(), m = cm * N / 100
  const k = soort === 'omrekenen' ? rnd(1, 2) : soort === 'schaal' ? 3 : rnd(1, 3)
  if (k === 1) {
    return { vraag: `${nm} maakt een fietsroute op een kaart met schaallijntje 1 : ${getal(N)}. Op de kaart is het stuk langs het kanaal ${cm} cm lang. Hoeveel meter fietst ${nm} daar in het echt?`,
             kaal: `Schaal 1 : ${getal(N)}. ${cm} cm op de kaart = … m in het echt`,
             antwoord: m, eenheid: 'm', uitleg: `${cm} cm × ${getal(N)} = ${getal(cm * N)} cm = ${getal(m)} m` }
  }
  if (k === 2) {
    return { vraag: `${nm} tekent de speelplaats op schaal 1 : ${getal(N)}. In het echt is het voetbalveldje ${getal(m)} m lang. Hoeveel centimeter wordt dat op de tekening van ${nm}?`,
             kaal: `Schaal 1 : ${getal(N)}. ${getal(m)} m in het echt = … cm op de kaart`,
             antwoord: cm, eenheid: 'cm', uitleg: `${getal(m)} m = ${getal(m * 100)} cm. ${getal(m * 100)} : ${getal(N)} = ${cm} cm` }
  }
  return { vraag: `Op de plattegrond van het park is de vijver ${cm} cm lang. In het echt is diezelfde vijver ${getal(m)} m lang. De plattegrond heeft schaal 1 : ?. Welk getal hoort op de plaats van het vraagteken?`,
           kaal: `${cm} cm op de kaart is ${getal(m)} m in het echt. Schaal 1 : …?`,
           antwoord: N, uitleg: `${getal(m)} m = ${getal(m * 100)} cm. ${getal(m * 100)} : ${cm} = ${getal(N)}, dus schaal 1 : ${getal(N)}.` }
}
// ── Extra bouwers voor groep 6 en 8 (elk doel krijgt een echte som) ──
const deelVanGeheelV = () => {   // deel van een geheel: a/b van een getal
  const noem = pick([2, 3, 4, 5, 6, 10]), tel = rnd(1, noem - 1), geheel = noem * rnd(2, 9)
  const n = naam(), m = naam2(n), d = ding()
  const deel = geheel * tel / noem
  return {
    vraag: `${n} heeft ${geheel} ${d[1]} in de verzameling en spreekt met ${m} af om er ${tel}/${noem} deel van te ruilen. Hoeveel ${d[1]} gaan er naar ${m}?`,
    kaal: `${tel}/${noem} van ${geheel} =`,
    antwoord: deel, eenheid: d[1],
    uitleg: tel === 1
      ? `1/${noem} van ${geheel}: ${geheel} : ${noem} = ${deel} ${d[1]}.`
      : `1/${noem} van ${geheel} is ${geheel} : ${noem} = ${geheel / noem}. Dan ${tel} × ${geheel / noem} = ${deel} ${d[1]}.`,
  }
}
const breukAanvullenV = (zwaar) => {   // breuk aanvullen tot een hele
  const noem = pick(zwaar ? [6, 8, 10, 12] : [3, 4, 5, 6]), tel = rnd(1, noem - 1)
  const n = naam(), d = pick(['taart', 'pizza', 'reep'])
  return { vraag: `Een ${d} is in ${noem} gelijke stukken verdeeld. ${n} heeft er al ${tel} opgegeten. Hoeveel stukken moeten er nog bij om weer een hele ${d} te hebben?`,
           kaal: `${tel}/${noem} + ?/${noem} = 1`,
           antwoord: noem - tel, eenheid: 'stukken', uitleg: `${tel}/${noem} + ${noem - tel}/${noem} = ${noem}/${noem} = 1 hele. Dus ${noem - tel} stukken.` }
}
const tijdErbijV = (maxMin = 180) => {   // hoe laat is het over een bepaalde tijd
  const h1 = rnd(6, 20), m1 = pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])
  const dur = rnd(1, Math.floor(maxMin / 5)) * 5
  const tot = h1 * 60 + m1 + dur, h2 = Math.floor(tot / 60) % 24, m2 = tot % 60
  return { vraag: `Het is ${h1}:${PAD(m1)} uur. Hoe laat is het over ${dur} minuten?`,
           kaal: `${h1}:${PAD(m1)} + ${dur} min = …`,
           antwoordType: 'tijd', tijdH: h2, tijdM: m2, antwoord: `${h2}:${PAD(m2)}`,
           uitleg: `${h1}:${PAD(m1)} + ${dur} min = ${h2}:${PAD(m2)} uur.` }
}
const tijdNaarSecV = (zwaar) => {   // tijden omrekenen naar seconden
  const m = zwaar ? rnd(10, 45) : rnd(1, 9), s = zwaar ? rnd(1, 59) : pick([5, 10, 15, 20, 30, 45])
  return { vraag: `Een liedje duurt ${m} minuten en ${s} seconden. Hoeveel seconden is dat in totaal?`,
           kaal: `${m} min ${s} sec = … seconden`,
           antwoord: m * 60 + s, eenheid: 's', uitleg: `${m} × 60 + ${s} = ${m * 60} + ${s} = ${m * 60 + s} s` }
}
const kaartV = (zwaar) => {   // plaats/route op een kaart
  const a = rnd(2, zwaar ? 12 : 6), b = rnd(2, zwaar ? 12 : 6), m = pick(zwaar ? [250, 500, 1000] : [100, 200, 500])
  return { vraag: `Een route op de kaart gaat ${a} vakjes naar rechts en ${b} vakjes omhoog. Elk vakje is ${m} m. Hoeveel meter is de route in totaal?`,
           kaal: `${a} vakjes + ${b} vakjes van ${m} m = … m`,
           antwoord: (a + b) * m, eenheid: 'm', uitleg: `(${a} + ${b}) × ${m} = ${a + b} × ${m} = ${(a + b) * m} m` }
}
const datumV = () => {   // datum: dagen verder rekenen binnen een maand
  const dag = rnd(1, 10), erbij = rnd(5, 18)
  return { vraag: `Het is de ${dag}e van de maand. Welke datum is het over ${erbij} dagen? Geef de dag van de maand.`,
           kaal: `Dag ${dag} + ${erbij} dagen = dag …`,
           antwoord: dag + erbij, uitleg: `${dag} + ${erbij} = ${dag + erbij}` }
}
const volgordeV = (soort) => {   // volgorde van bewerkingen, in een verhaal
  const a = rnd(2, 9), b = rnd(2, 9), c = rnd(2, 9), n = naam(), d = ding()
  if (soort === 'plus' || (!soort && pick([0, 1]) === 0)) return { vraag: `${n} heeft ${a} losse ${d[1]} en ${b} zakjes met elk ${c} ${d[1]}. Hoeveel ${d[1]} heeft ${n} in totaal?`, kaal: `${a} + ${b} × ${c} =`, antwoord: a + b * c, eenheid: d[1], uitleg: `Eerst ${b} × ${c} = ${b * c}, dan ${a} + ${b * c} = ${a + b * c}.` }
  // Nooit meer opeten dan er zijn: a × b − c werd anders negatief, en dan
  // vraag je een kind hoeveel snoepjes er overblijven als je er meer eet dan
  // je hebt.
  const opgegeten = Math.min(c, a * b - 1)
  return { vraag: `${n} koopt ${a} zakjes met elk ${b} ${d[1]} en eet er daarna ${opgegeten} op. Hoeveel ${d[1]} blijven er over?`, kaal: `${a} × ${b} − ${opgegeten} =`, antwoord: a * b - opgegeten, eenheid: d[1], uitleg: `Eerst ${a} × ${b} = ${a * b}, dan ${a * b} − ${opgegeten} = ${a * b - opgegeten}.` }
}
const restV = (zwaar) => {   // deelbaarheid: rest bij delen, in een verhaal
  const deler = pick(zwaar ? [3, 8, 9] : [2, 4, 5, 10]), q = rnd(3, zwaar ? 39 : 19), rest = rnd(0, deler - 1), n = deler * q + rest
  const nm = naam(), d = ding()
  return { vraag: `${nm} heeft ${n} ${d[1]} en legt ze in groepjes van ${deler}. Hoeveel ${d[1]} houdt ${nm} over?`, kaal: `${n} : ${deler} — hoeveel blijft er over?`, antwoord: rest, eenheid: d[1], uitleg: `${n} : ${deler} = ${q} met rest ${rest}. Er blijven ${rest} ${d[1]} over.` }
}
const priemV = (zwaar) => {   // ontbinden in priemgetallen, in een verhaal
  const primes = zwaar ? [5, 7, 11, 13] : [2, 3, 5, 7], p = pick(primes), q = pick(primes), n = p * q, nm = naam()
  return { vraag: `${nm} legt ${n} tegels in een rechthoek. Dat lukt alleen met ${Math.min(p, q)} rijen van ${Math.max(p, q)} tegels (allebei priemgetallen). Wat is het kleinste priemgetal?`,
           kaal: `${n} = ? × ? (twee priemgetallen). Geef het kleinste.`,
           antwoord: Math.min(p, q), uitleg: `${n} = ${Math.min(p, q)} × ${Math.max(p, q)}. Beide zijn priemgetallen.` }
}
const grootGetalV = () => {   // heel grote getallen in cijfers schrijven
  const k = rnd(2, 9), u = pick([['miljoen', 1000000], ['miljard', 1000000000]]), nm = naam()
  if (Math.random() < 0.5) {
    const t = rnd(1, 9)
    return { vraag: `In de krant leest ${nm} dat er ${komma(k + t / 10)} ${u[0]} mensen in een land wonen. Schrijf dat getal in cijfers.`,
             kaal: `Schrijf in cijfers: ${komma(k + t / 10)} ${u[0]}`,
             antwoord: k * u[1] + t * (u[1] / 10),
             uitleg: `${k} ${u[0]} = ${getal(k * u[1])}. ${komma(t / 10)} ${u[0]} = ${getal(t * (u[1] / 10))}. Samen ${getal(k * u[1] + t * (u[1] / 10))}.` }
  }
  return { vraag: `In de krant leest ${nm} dat er ${k} ${u[0]} mensen in een land wonen. Schrijf dat getal in cijfers.`, kaal: `Schrijf in cijfers: ${k} ${u[0]}`, antwoord: k * u[1], uitleg: `${k} ${u[0]} = ${getal(k * u[1])}` }
}
const verhoudingV = () => {   // verhoudingsproblemen
  const nm = naam()
  if (Math.random() < 0.5) {
    const stuks = pick([3, 4, 5, 6]), perStuk = rnd(3, 9) * 25 / 100, n = stuks * rnd(2, 5)
    return { vraag: `${nm} haalt broodjes voor de hele klas. Bij de bakker kosten ${stuks} broodjes samen ${euro(stuks * perStuk)}. Er zijn er ${n} nodig. Hoeveel euro kost dat?`,
             kaal: `${stuks} stuks kosten ${euro(stuks * perStuk)}. Wat kosten er ${n}?`,
             antwoord: +(perStuk * n).toFixed(2), eenheid: '€', uitleg: `1 broodje: ${euro(stuks * perStuk)} : ${stuks} = ${euro(perStuk)}. ${n} × ${euro(perStuk)} = ${euro(perStuk * n)}.` }
  }
  const perUur = rnd(4, 9) * 100, uren = rnd(3, 8)
  return { vraag: `In de fabriek vult een machine ${getal(perUur * 2)} pakjes in 2 uur. ${nm} wil weten hoeveel dat er in ${uren} uur zijn, als de machine even snel blijft doorwerken. Hoeveel pakjes zijn dat?`,
           kaal: `${getal(perUur * 2)} in 2 uur. Hoeveel in ${uren} uur?`,
           antwoord: perUur * uren, eenheid: 'pakjes', uitleg: `Per uur: ${getal(perUur * 2)} : 2 = ${getal(perUur)}. ${uren} × ${getal(perUur)} = ${getal(perUur * uren)}.` }
}
const procentVanV = (zwaar) => {   // percentage van een getal, in een verhaal
  const p = pick(zwaar ? [15, 30, 40, 60, 80] : [5, 10, 20, 25, 50, 75]), basis = pick(zwaar ? [140, 240, 360, 480] : [20, 40, 60, 80, 100, 200])
  return { vraag: `In de dierentuin zijn ${basis} dieren. ${p}% daarvan zijn vogels. Hoeveel vogels zijn dat?`, kaal: `${p}% van ${basis} =`, antwoord: basis * p / 100, eenheid: 'vogels', uitleg: `${p}% van ${basis} = ${basis} ÷ 100 × ${p} = ${basis * p / 100}` }
}
const procentRedeneerV = (zwaar) => {   // redeneren met percentages in een verhaal
  const totaal = pick(zwaar ? [1200, 2400, 3600, 4800] : [200, 400, 500, 800, 1000]), p = pick(zwaar ? [15, 35, 45, 60] : [10, 20, 25, 50])
  return { vraag: `In een dorp wonen ${getal(totaal)} mensen. ${p}% heeft een hond. Hoeveel mensen hebben een hond?`,
           kaal: `${p}% van ${getal(totaal)} =`,
           antwoord: totaal * p / 100, uitleg: `${p}% van ${getal(totaal)} = ${getal(totaal * p / 100)}` }
}
const tijdzoneV = () => {   // tijd in een andere tijdzone
  const h = rnd(6, 20), m = pick([0, 15, 30, 45]), diff = pick([1, 2, 6, 8]), richting = pick(['later', 'vroeger'])
  const delta = richting === 'later' ? diff : -diff
  const tot = ((h * 60 + m + delta * 60) % 1440 + 1440) % 1440, h2 = Math.floor(tot / 60), m2 = tot % 60
  return { vraag: `In Amsterdam is het ${h}:${PAD(m)} uur. In een andere stad is het ${diff} uur ${richting}. Hoe laat is het daar?`,
           kaal: `${h}:${PAD(m)} ${richting === 'later' ? '+' : '−'} ${diff} uur = …`,
           antwoordType: 'tijd', tijdH: h2, tijdM: m2, antwoord: `${h2}:${PAD(m2)}`,
           uitleg: `${h}:${PAD(m)} ${delta > 0 ? '+' : '−'} ${diff} uur = ${h2}:${PAD(m2)} uur.` }
}
const kommaDeelV = () => {   // delen met benoemde kommagetallen
  const deler = rnd(2, 6), per = rnd(15, 60) / 10, totaal = +(per * deler).toFixed(1)
  return { vraag: `De klas heeft ${komma(totaal)} kg koekjes gebakken voor de fancy fair en verdeelt die eerlijk over ${deler} bakjes. Hoeveel kilogram komt er in één bakje?`,
           kaal: `${komma(totaal)} : ${deler} =`,
           antwoord: +per.toFixed(2), eenheid: 'kg', uitleg: `${komma(totaal)} : ${deler} = ${komma(+per.toFixed(2))} kg` }
}
const breukOptelGelijkV = () => {   // benoemde gelijknamige breuken optellen, in een verhaal
  const noem = pick([4, 5, 6, 8, 10]), t1 = rnd(1, noem - 2), t2 = rnd(1, noem - 1 - t1)
  const n1 = naam(), n2 = naam(), d = pick(['reep', 'pizza', 'taart'])
  const st = x => `${x} stuk${x > 1 ? 'ken' : ''}`
  return { vraag: `Een ${d} is in ${noem} stukken verdeeld. ${n1} eet ${st(t1)} en ${n2} eet ${st(t2)}. Welk deel eten ze samen? Geef de teller (de noemer blijft ${noem}).`,
           kaal: `${t1}/${noem} + ${t2}/${noem} = ?/${noem}`,
           antwoord: t1 + t2, uitleg: `${t1}/${noem} + ${t2}/${noem} = ${t1 + t2}/${noem}` }
}
const gemiddeldeV = (zwaar) => {   // gemiddelde berekenen
  if (zwaar) return gemiddeldeGrootV()
  for (let t = 0; t < 50; t++) {
    const k = pick([3, 4]), gem = rnd(4, 9), cijfers = []; let som = 0
    for (let i = 0; i < k - 1; i++) { const c = rnd(3, 10); cijfers.push(c); som += c }
    const last = gem * k - som
    if (last >= 1 && last <= 10) {
      cijfers.push(last)
      const nm = naam()
      const vragen = [
        `${nm} heeft dit blok ${k} toetsen gemaakt en haalde ${cijfers.join(', ')}. Op het rapport komt het gemiddelde te staan. Welk cijfer is dat?`,
        `De juf schrijft de cijfers van ${nm} op het bord: ${cijfers.join(', ')}. ${nm} wil weten hoe hoog het gemiddelde daarvan is. Wat is het?`,
      ]
      return { vraag: pick(vragen), kaal: `Gemiddelde van ${cijfers.join(', ')} =`, antwoord: gem, uitleg: `(${cijfers.join(' + ')}) : ${k} = ${gem * k} : ${k} = ${gem}` }
    }
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
  return { vraag: `In het stadion waren ${getal(n)} bezoekers. Rond dat aantal af op ${nm}.`, kaal: `Rond af op ${nm}: ${getal(n)}`, antwoord: af, eenheid: 'bezoekers', uitleg: `${getal(n)} afgerond op ${nm} = ${getal(af)}` }
}

// ── Extra bouwers afgeleid uit de Pluspunt-doelen (lengte/inhoud/gewicht,
//    meetkunde, procenten, breuken, kommagetallen, snelheid, valuta) ──
const maatLengteV = () => {   // omrekenen naar de kleinste genoemde maat
  const variant = pick([
    () => { const km = rnd(2, 9), m = rnd(50, 950); return { k: `${km} km en ${m} m = … m`, v: `${naam()} fietst een route van ${km} km en ${m} m naar het bos. Hoeveel meter is die route?`, a: km * 1000 + m, e: 'm', u: `${km} km = ${getal(km * 1000)} m. ${getal(km * 1000)} + ${m} = ${getal(km * 1000 + m)} m` } },
    () => { const m = rnd(2, 9), cm = rnd(10, 90); return { k: `${m} m en ${cm} cm = … cm`, v: `In de klus-hoek ligt een plank van ${m} m en ${cm} cm. ${naam()} wil de lengte in centimeters op de plank schrijven. Welk getal komt daar te staan?`, a: m * 100 + cm, e: 'cm', u: `${m} m = ${m * 100} cm. ${m * 100} + ${cm} = ${m * 100 + cm} cm` } },
    () => { const cm = rnd(9, 20), mm = rnd(1, 9); return { k: `${cm} cm en ${mm} mm = … mm`, v: `${naam()} meet een potlood op met de liniaal: ${cm} cm en ${mm} mm. Hoeveel millimeter is het potlood?`, a: cm * 10 + mm, e: 'mm', u: `${cm} cm = ${cm * 10} mm. ${cm * 10} + ${mm} = ${cm * 10 + mm} mm` } },
  ])()
  return { vraag: variant.v, kaal: variant.k, antwoord: variant.a, eenheid: variant.e, uitleg: variant.u }
}
const maatInhoudV = () => {
  const variant = pick([
    () => { const l = rnd(1, 9), dl = rnd(1, 9); return { k: `${l} l en ${dl} dl = … dl`, v: `In de kan zit ${l} liter en ${dl} dl limonade. ${naam()} schenkt met een maatbeker in deciliters. Hoeveel deciliter limonade is het?`, a: l * 10 + dl, e: 'dl', u: `${l} l = ${l * 10} dl. ${l * 10} + ${dl} = ${l * 10 + dl} dl` } },
    () => { const l = rnd(1, 5), ml = rnd(50, 950); return { k: `${l} l en ${ml} ml = … ml`, v: `Op het pak sap staat: ${l} liter en ${ml} ml. ${naam()} wil weten hoeveel milliliter dat is. Hoeveel is het?`, a: l * 1000 + ml, e: 'ml', u: `${l} l = ${l * 1000} ml. ${l * 1000} + ${ml} = ${l * 1000 + ml} ml` } },
  ])()
  return { vraag: variant.v, kaal: variant.k, antwoord: variant.a, eenheid: variant.e, uitleg: variant.u }
}
const maatGewichtV = (soort) => {
  if (soort === 'prijs') return prijsGewichtV()
  const variant = pick([
    () => { const kg = rnd(1, 9), g = rnd(50, 950); return { k: `${kg} kg en ${g} g = … g`, v: `${naam()} zet de schooltas op de weegschaal: ${kg} kg en ${g} g. Hoeveel gram is dat samen?`, a: kg * 1000 + g, e: 'g', u: `${kg} kg = ${getal(kg * 1000)} g. ${getal(kg * 1000)} + ${g} = ${getal(kg * 1000 + g)} g` } },
    () => { const g = pick([250, 500, 750]), n = rnd(3, 8), tot = g * n; return { k: `${n} × ${g} g = … kg`, v: `Voor het bakproject haalt de klas ${n} pakken meel van ${g} gram. Hoeveel kilogram meel is dat samen?`, a: tot / 1000, e: 'kg', u: `${n} × ${g} g = ${tot} g = ${komma(tot / 1000)} kg` } },
  ])()
  return { vraag: variant.v, kaal: variant.k, antwoord: variant.a, eenheid: variant.e, uitleg: variant.u }
}
const OPP_M = [
  (n, l, b) => `${n} legt nieuwe graszoden in de achtertuin. De tuin is ${l} m lang en ${b} m breed. Hoeveel vierkante meter gras heeft ${n} nodig?`,
  (n, l, b) => `De klas verft een muur in de gymzaal van ${l} m breed en ${b} m hoog. Hoeveel vierkante meter moet er geverfd worden?`,
  (n, l, b) => `Op het schoolplein komt een zandbak van ${l} m bij ${b} m. Hoeveel vierkante meter van het plein gaat daaraan op?`,
]
const OPP_CM = [
  (n, l, b) => `${n} plakt een sticker over de voorkant van een schrift van ${l} cm bij ${b} cm. Hoeveel vierkante centimeter beslaat de sticker?`,
  (n, l, b) => `${n} knipt een rechthoek karton van ${l} cm lang en ${b} cm breed voor een knutselwerk. Hoeveel cm² karton is dat?`,
]
const oppRechthoekV = (mL = 12, mB = 9) => {
  const l = rnd(3, mL), b = rnd(2, mB), n = naam()
  const cm = Math.random() < 0.35
  const e = cm ? 'cm' : 'm'
  return { vraag: pick(cm ? OPP_CM : OPP_M)(n, l, b), kaal: `Oppervlakte van een rechthoek van ${l} ${e} bij ${b} ${e}?`, antwoord: l * b, eenheid: e + '²', figuur: { type: 'rechthoek', l, b, eenheid: e }, uitleg: `${l} × ${b} = ${l * b} ${e}²` }
}
const oppDriehoekV = () => { const basis = rnd(2, 12) * 2, h = rnd(3, 10); return { kaal: `Oppervlakte van een driehoek met basis ${basis} cm en hoogte ${h} cm?`, vraag: `${naam()} maakt een driehoekig verkeersbord voor de verkeersles. De onderkant is ${basis} cm breed en het bord is ${h} cm hoog. Hoeveel cm² karton is daarvoor nodig?`, antwoord: basis * h / 2, eenheid: 'cm²', figuur: { type: 'driehoek', l: basis, b: h, eenheid: 'cm' }, uitleg: `(${basis} × ${h}) ÷ 2 = ${basis * h} ÷ 2 = ${basis * h / 2} cm²` } }
const OMTREK = [
  (n, l, b) => `Om het voetbalveldje van ${l} m bij ${b} m komt een hek. Hoeveel meter hek is daarvoor nodig?`,
  (n, l, b) => `${n} zet een lint om de moestuin van ${l} m bij ${b} m, helemaal rondom. Hoeveel meter lint heeft ${n} nodig?`,
  (n, l, b) => `${n} loopt precies één rondje langs de rand van het schoolplein van ${l} m bij ${b} m. Hoeveel meter loopt ${n}?`,
]
const omtrekV = (mL = 16, mB = 11) => { const l = rnd(4, mL), b = rnd(3, mB); return { kaal: `Omtrek van een rechthoek van ${l} m bij ${b} m?`, vraag: pick(OMTREK)(naam(), l, b), antwoord: 2 * (l + b), eenheid: 'm', figuur: { type: 'rechthoek', l, b, eenheid: 'm' }, uitleg: `2 × (${l} + ${b}) = 2 × ${l + b} = ${2 * (l + b)} m` } }
const balkInhoudV = (mL = 8, soort) => {
  const l = rnd(2, mL), b = rnd(2, 6), h = rnd(2, 6), nm = naam()
  const fig = { type: 'balk', l, b, h, eenheid: 'dm' }
  if (soort === 'liter' || (!soort && Math.random() < 0.5)) {
    return { vraag: `${nm} vult een bak voor de moestuin met regenwater. De bak is ${l} dm lang, ${b} dm breed en ${h} dm hoog. Hoeveel liter water gaat erin?`, kaal: `Inhoud van een balk van ${l} × ${b} × ${h} dm, in liter?`, antwoord: l * b * h, eenheid: 'l', figuur: fig, uitleg: `${l} × ${b} × ${h} = ${l * b * h} dm³, en 1 dm³ is 1 liter: ${l * b * h} liter.` }
  }
  return { vraag: `${nm} stapelt blokken van 1 dm³ in een doos van ${l} dm bij ${b} dm bij ${h} dm. De doos komt precies vol. Hoeveel blokken passen erin?`, kaal: `Hoeveel blokken van 1 dm³ passen er in ${l} × ${b} × ${h} dm?`, antwoord: l * b * h, eenheid: 'blokken', figuur: fig, uitleg: `${l} × ${b} × ${h} = ${l * b * h} blokken van 1 dm³.` }
}
const kommaVermV = () => { const a = rnd(11, 49) / 10, b = rnd(11, 49) / 10, ant = +(a * b).toFixed(2), n = naam(); return { vraag: `${n} laat bij de stoffenwinkel een lap afknippen voor een verkleedpak. De stof kost ${euro(a)} per meter en ${n} heeft ${komma(b)} meter nodig. Hoeveel moet ${n} betalen? (eerst schatten, dan precies uitrekenen)`, kaal: `${komma(b)} × ${komma(a)} =`, antwoord: ant, eenheid: '€', uitleg: `${komma(b)} × ${euro(a)} = ${euro(ant)}` } }
const breukMaalBreukV = (zwaar) => { const n1 = pick(zwaar ? [3, 4, 5, 6] : [2, 3, 4]), n2 = pick(zwaar ? [3, 4, 5, 6] : [2, 3, 4]); return { kaal: `1/${n1} × 1/${n2} = 1/?`, vraag: `Van een taart is nog 1/${n1} over. ${naam()} eet 1/${n2} van dat stuk op. Welk deel van de héle taart is dat? Geef de noemer (de teller is 1).`, antwoord: n1 * n2, uitleg: `1/${n1} × 1/${n2} = 1/${n1 * n2}` } }
const nieuwePrijsV = () => { const prijs = rnd(10, 90), p = pick([10, 20, 25, 50]), nieuw = +(prijs * (1 - p / 100)).toFixed(2); return { kaal: `${euro(prijs)} met ${p}% korting =`, vraag: `${naam()} ziet in de etalage een jas van ${euro(prijs)}. Op de ruit hangt een bord: ${p}% korting op alles. Hoeveel kost de jas nu?`, antwoord: nieuw, eenheid: '€', uitleg: `Korting: ${p}% van ${euro(prijs)} = ${euro(prijs * p / 100)}. ${euro(prijs)} − ${euro(prijs * p / 100)} = ${euro(nieuw)}` } }
const oudePrijsV = () => { const oud = rnd(20, 80), p = pick([10, 20, 25, 50]), nieuw = +(oud * (1 - p / 100)).toFixed(2); return { kaal: `Na ${p}% korting: ${euro(nieuw)}. Wat was de oude prijs?`, vraag: `Na ${p}% korting kost een spel ${euro(nieuw)}. Wat was de oude prijs?`, antwoord: oud, eenheid: '€', uitleg: `${euro(nieuw)} is ${100 - p}% van de oude prijs. Oude prijs = ${euro(nieuw)} ÷ ${100 - p} × 100 = ${euro(oud)}` } }
const kortingPctV = () => { const oud = pick([20, 40, 50, 80, 100]), p = pick([10, 20, 25, 50]), nieuw = +(oud * (1 - p / 100)).toFixed(2); return { kaal: `Van ${euro(oud)} naar ${euro(nieuw)} — hoeveel procent korting?`, vraag: `Op het prijskaartje van een spel staat ${euro(oud)} doorgestreept. Aan de kassa betaalt ${naam()} er ${euro(nieuw)} voor. Hoeveel procent korting is dat?`, antwoord: p, eenheid: '%', uitleg: `Korting = ${euro(oud - nieuw)}. ${euro(oud - nieuw)} ÷ ${euro(oud)} × 100 = ${p}%` } }
const totaalViaPctV = () => { const p = pick([10, 20, 25, 50]), totaal = rnd(2, 10) * 20, deel = totaal * p / 100; return { kaal: `${p}% is ${deel}. Hoeveel is 100%?`, vraag: `${deel} kinderen is ${p}% van alle kinderen. Hoeveel kinderen zijn er in totaal?`, antwoord: totaal, uitleg: `${p}% = ${deel}, dus 100% = ${deel} ÷ ${p} × 100 = ${totaal}` } }
const oudAantalViaPctV = () => { const oud = rnd(2, 10) * 10, p = pick([10, 20, 25, 50]), nieuw = oud + oud * p / 100; return { kaal: `Met ${p}% gestegen tot ${nieuw}. Wat was het oude aantal?`, vraag: `Een aantal is met ${p}% gestegen tot ${nieuw}. Wat was het oude aantal?`, antwoord: oud, uitleg: `${nieuw} is ${100 + p}% van het oude aantal. ${nieuw} ÷ ${100 + p} × 100 = ${oud}` } }
// Percentage van een aantal, met een strook erbij die het percentage laat zien.
//
// Het aantal moet zo gekozen worden dat het percentage een héél aantal
// oplevert: 75% van 5,33 kinderen bestaat niet. Eerder werd daarvoor 100/p als
// stap gebruikt, en die is bij 75% gelijk aan 1,33 — vandaar dat er klassen
// met 5,33 kinderen voorbijkwamen. De stap is de noemer van de breuk die bij
// het percentage hoort: 5% = 1/20, 10% = 1/10, 25% en 75% = kwarten, 50% =
// helften.
const PCT_BREUK = {
  5: { stap: 20, breuk: '1/20' },
  10: { stap: 10, breuk: '1/10' },
  20: { stap: 5, breuk: '1/5' },
  25: { stap: 4, breuk: '1/4' },
  50: { stap: 2, breuk: '1/2' },
  75: { stap: 4, breuk: '3/4' },
}
const procentVanAantalV = (percentages, maxStappen, plaats, wat, werkwoord) => {
  const p = pick(percentages)
  const { stap, breuk } = PCT_BREUK[p]
  const laag = Math.max(2, Math.ceil(20 / stap))
  const n = stap * rnd(laag, Math.max(laag + 2, maxStappen))
  const deel = n * p / 100
  return {
    vraag: `${plaats} ${n} ${wat}. ${p}% ${werkwoord}. Hoeveel ${wat} zijn dat?`,
    kaal: `${p}% van ${n} =`,
    antwoord: deel, eenheid: wat,
    figuur: { type: 'strook', pct: p, totaal: n, deel },
    uitleg: `${p}% is ${breuk}. ${breuk} van ${n} = ${n} : ${stap}${p === 75 ? ` × 3` : ''} = ${deel}.`,
  }
}

// ── Bouwers die ontbraken bij hun doel ──────────────────────────────────────
// Verschillende doelen noemen meer dan één vaardigheid ("plaatsen én aflezen",
// "vergelijken én op volgorde zetten", "met en zonder rest"), terwijl er maar
// één soort som uit kwam. Deze bouwers vullen die gaten.

// Cijferend optellen heeft alleen zin als er écht onthouden moet worden.
const metOnthouden = (min, max) => {
  for (let poging = 0; poging < 60; poging++) {
    const a = rnd(min, max), b = rnd(min, max)
    if ((a % 10) + (b % 10) > 9 || (Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) > 9) return [a, b]
  }
  return [min + 8, min + 7]
}
// Cijferend aftrekken idem: zonder lenen oefen je niets.
const metLenen = (min, max) => {
  for (let poging = 0; poging < 60; poging++) {
    const a = rnd(min + 100, max), b = rnd(min, a - 50)
    if ((a % 10) < (b % 10) || (Math.floor(a / 10) % 10) < (Math.floor(b / 10) % 10)) return [a, b]
  }
  return [max, min + 9]
}

// Terugrekenen naar het geheel: hoort bij "berekenen wat het geheel is".
const geheelTerugV = () => {
  const noem = pick([2, 3, 4, 5]), tel = rnd(1, noem - 1)
  const stuk = rnd(3, 12), geheel = stuk * noem, deel = stuk * tel
  const n = naam(), d = ding()
  return {
    vraag: `${n} heeft al ${deel} ${d[1]} gespaard. Dat is ${tel}/${noem} deel van wat ${n} wil sparen. Hoeveel ${d[1]} wil ${n} in totaal sparen?`,
    kaal: `${tel}/${noem} is ${deel}. Hoeveel is het hele getal?`,
    antwoord: geheel, eenheid: d[1],
    uitleg: tel === 1
      ? `1/${noem} is ${deel}, dus het geheel is ${noem} × ${deel} = ${geheel}.`
      : `${tel}/${noem} is ${deel}, dus 1/${noem} is ${deel} : ${tel} = ${stuk}. Het geheel is ${noem} × ${stuk} = ${geheel}.`,
  }
}

// Getallen schrijven en de waarde van een cijfer benoemen.
const getalSchrijvenV = (maxDuizend, minDuizend = 11) => {
  const n = rnd(minDuizend, maxDuizend) * 1000 + rnd(1, 999)
  if (Math.random() < 0.5) {
    const posities = [[1000, 'duizendtallen'], [100, 'honderdtallen'], [10, 'tientallen']]
    const [waarde, hoe] = pick(posities)
    const cijfer = Math.floor(n / waarde) % 10
    return {
      vraag: `Op de kilometerteller van de schoolbus staat ${getal(n)}. Welk cijfer staat daarin op de plaats van de ${hoe}?`,
      kaal: `${getal(n)} — welk cijfer staat op de plaats van de ${hoe}?`,
      antwoord: cijfer,
      uitleg: `${getal(n)} — op de plaats van de ${hoe} staat een ${cijfer}.`,
    }
  }
  const dz = Math.floor(n / 1000), rest = n % 1000
  return {
    vraag: `${naam()} leest in de krant dat er ${getal(dz)} duizend ${rest === 0 ? '' : getal(rest) + ' '}mensen naar het festival kwamen. Schrijf dat aantal in cijfers.`,
    kaal: `Schrijf in cijfers: ${getal(dz)} duizend ${rest === 0 ? '' : getal(rest)}`.trim(),
    antwoord: n,
    uitleg: `${getal(dz)} duizend is ${getal(dz * 1000)}, plus ${getal(rest)} = ${getal(n)}.`,
  }
}

// Kalender en weeknotatie, plus een begin- of eindtijd terugrekenen.
const MAANDDAGEN = [['januari', 31], ['februari', 28], ['maart', 31], ['april', 30], ['mei', 31], ['juni', 30], ['juli', 31], ['augustus', 31], ['september', 30], ['oktober', 31], ['november', 30], ['december', 31]]
const kalenderV = () => {
  const soort = rnd(1, 4)
  if (soort === 4) {
    const w = rnd(2, 8), nm = naam()
    return { vraag: `De zomervakantie van ${nm} duurt ${w} weken. Hoeveel dagen zijn dat?`, kaal: `${w} weken = … dagen`, antwoord: w * 7, eenheid: 'dagen', uitleg: `${w} × 7 = ${w * 7} dagen` }
  }
  if (soort === 1) {
    const [maand, dagen] = pick(MAANDDAGEN)
    return { vraag: `Hoeveel hele weken passen er in ${maand} (${dagen} dagen), en hoeveel dagen blijven er over? Geef het aantal dagen dat overblijft.`, kaal: `${dagen} dagen : 7 = … weken en … dagen over. Hoeveel dagen blijven over?`, antwoord: dagen % 7, eenheid: 'dagen', uitleg: `${dagen} : 7 = ${Math.floor(dagen / 7)} weken en ${dagen % 7} dagen over.` }
  }
  if (soort === 2) {
    const week = rnd(3, 45), erbij = rnd(2, 8)
    return { vraag: `De schoolreis is in week ${week}. Het schoolfeest is ${erbij} weken later. In welke week is het schoolfeest?`, kaal: `Week ${week} + ${erbij} weken = week …`, antwoord: week + erbij, eenheid: 'week', uitleg: `Week ${week} + ${erbij} weken = week ${week + erbij}.` }
  }
  const h2 = rnd(13, 17), m2 = pick([0, 15, 30, 45]), dur = rnd(3, 7) * 15
  const tot = h2 * 60 + m2 - dur, h1 = Math.floor(tot / 60), m1 = tot % 60
  return { vraag: `Een voorstelling is om ${h2}:${PAD(m2)} uur afgelopen en duurde ${dur} minuten. Hoe laat begon de voorstelling?`, kaal: `${h2}:${PAD(m2)} − ${dur} min = …`, antwoordType: 'tijd', tijdH: h1, tijdM: m1, antwoord: `${h1}:${PAD(m1)}`, uitleg: `${h2}:${PAD(m2)} min ${dur} minuten = ${h1}:${PAD(m1)} uur.` }
}

// Gelijkwaardige breuken herkennen.
const gelijkwaardigeBreukV = () => {
  const noem = pick([2, 3, 4, 5]), tel = rnd(1, noem - 1), f = rnd(2, 5)
  return {
    vraag: `${tel}/${noem} is even veel als ?/${noem * f}. Welk getal moet er op de plaats van het vraagteken staan?`,
    kaal: `${tel}/${noem} = ?/${noem * f}`,
    antwoord: tel * f,
    uitleg: `De noemer gaat ${noem} × ${f} = ${noem * f}, dus de teller ook: ${tel} × ${f} = ${tel * f}. Dus ${tel}/${noem} = ${tel * f}/${noem * f}.`,
  }
}

// Kommagetal terug naar een breuk — de andere kant op dan breukKommaV.
const kommaNaarBreukV = () => {
  const [b, d] = pick(BREUK_KOMMA)
  const noem = Number(b.split('/')[1])
  return {
    vraag: `${naam()} loopt naar school en dat is ${komma(d)} kilometer. Diezelfde afstand kun je ook als breuk schrijven: ?/${noem} kilometer. Welk getal hoort op de plaats van het vraagteken?`,
    kaal: `${komma(d)} = ?/${noem}`,
    antwoord: Number(b.split('/')[0]),
    uitleg: `${komma(d)} km = ${b} km.`,
  }
}

// Miljoenen op twee manieren schrijven, en afronden op honderdduizendtallen.
const miljoenV = (soort) => {
  const heel = rnd(1, 9), tiende = rnd(1, 9)
  if (soort === 'cijfers' || (!soort && Math.random() < 0.5)) {
    return {
      vraag: `In de krant staat: "${komma(heel + tiende / 10)} miljoen mensen". Schrijf dat getal in cijfers.`,
      kaal: `Schrijf in cijfers: ${komma(heel + tiende / 10)} miljoen`,
      antwoord: heel * 1000000 + tiende * 100000,
      uitleg: `${heel} miljoen = ${getal(heel * 1000000)}. ${komma(tiende / 10)} miljoen = ${getal(tiende * 100000)}. Samen ${getal(heel * 1000000 + tiende * 100000)}.`,
    }
  }
  const n = heel * 1000000 + rnd(0, 9) * 100000 + rnd(1, 99999)
  const af = Math.round(n / 100000) * 100000
  return {
    vraag: `In het stadion kwamen dit jaar ${getal(n)} bezoekers. Rond dat aantal af op honderdduizendtallen.`,
    kaal: `Rond af op honderdduizendtallen: ${getal(n)}`,
    antwoord: af, eenheid: 'bezoekers',
    uitleg: `${getal(n)} afgerond op honderdduizendtallen = ${getal(af)}.`,
  }
}

// Percentages boven de 100%.
const pctBoven100V = () => {
  const p = pick([120, 150, 200, 250]), basis = rnd(2, 12) * 10
  return {
    vraag: `De schoolmusical trok vorig jaar ${basis} bezoekers. Dit jaar kwamen er ${p}% van dat aantal kijken. Hoeveel bezoekers waren dat dit jaar?`,
    kaal: `${p}% van ${basis} =`,
    antwoord: basis * p / 100, eenheid: 'bezoekers',
    uitleg: `100% is ${basis}, dus 1% is ${basis / 100}. ${p} × ${basis / 100} = ${basis * p / 100}.`,
  }
}

const procentVia1V = (zwaar) => { const bedrag = zwaar ? rnd(120, 900) * 10 : rnd(2, 20) * 100, p = zwaar ? rnd(11, 89) : rnd(2, 9) * 5, nm = naam(); return { kaal: `${p}% van ${euro(bedrag)} =`, vraag: `${nm} heeft met een vakantiebaantje ${euro(bedrag)} verdiend en zet daarvan ${p}% op de spaarrekening. Hoeveel euro gaat er naar de spaarrekening?`, antwoord: +(bedrag * p / 100).toFixed(2), eenheid: '€', uitleg: `1% van ${getal(bedrag)} = ${euro(bedrag / 100)}. ${p} × ${euro(bedrag / 100)} = ${euro(bedrag * p / 100)}` } }
const snelheidV = () => { const v = pick([60, 70, 80, 90, 100, 120]), t = rnd(2, 5); return { vraag: `Een auto rijdt ${v * t} km in ${t} uur. Wat is de gemiddelde snelheid in km per uur?`, kaal: `${v * t} km in ${t} uur = … km/u`, antwoord: v, eenheid: 'km/u', uitleg: `${v * t} km ÷ ${t} uur = ${v} km/u` } }
const valutaV = () => { const koers = rnd(85, 130) / 100, n = rnd(3, 30), nm = naam(); return { kaal: `1 dollar = ${euro(koers)}. Hoeveel euro is ${n} dollar?`, vraag: `${nm} gaat op vakantie naar Amerika. In een winkel daar hangt een pet van ${n} dollar. Op het bord bij de bank staat: 1 dollar = ${euro(koers)}. Hoeveel euro kost die pet?`, antwoord: +(n * koers).toFixed(2), eenheid: '€', uitleg: `${n} × ${euro(koers)} = ${euro(n * koers)}` } }
// Delen door 10 of 100 moet op twee decimalen uitkomen: een touwstuk van
// 0,128 meter is geen antwoord dat een kind opschrijft. Daarom wordt de lengte
// zo gekozen dat de uitkomst netjes is — bij delen door 100 dus een heel
// aantal meters, bij delen door 10 een lengte met hooguit één decimaal.
const kommaDeel10V = () => {
  const f = pick([10, 100])
  const stukjes = f === 100 ? rnd(2, 40) * 100 : rnd(15, 990) * 10
  const g = stukjes / 100
  const ant = +(g / f).toFixed(2)
  return { vraag: `${naam()} knipt een touw van ${komma(g)} meter in ${f} even lange stukken. Hoe lang is elk stuk (in meter)?`, kaal: `${komma(g)} : ${f} =`, antwoord: ant, eenheid: 'm', uitleg: `${komma(g)} : ${f} = ${komma(ant)} m` }
}
const breukVergelijkV = () => { const noem = pick([4, 5, 6, 8]), t1 = rnd(1, noem - 1); let t2 = rnd(1, noem - 1); if (t2 === t1) t2 = (t2 % (noem - 1)) + 1; const groot = t1 > t2 ? t1 : t2; const n1 = naam(), n2 = naam(); return { vraag: `${n1} eet ${t1}/${noem} van een pizza en ${n2} eet ${t2}/${noem} van een even grote pizza. Wie eet het grootste deel? Geef de teller van dat deel.`, kaal: `Welke breuk is het grootst: ${t1}/${noem} of ${t2}/${noem}? Geef de teller.`, antwoord: groot, uitleg: `Bij dezelfde noemer is de breuk met de grootste teller het grootst: ${groot}/${noem}.` } }
const tijdsduurV = () => { const h1 = rnd(7, 11), m1 = pick([0, 5, 10, 15, 20, 25, 40, 45]), dur = rnd(4, 8) * 15, tot = h1 * 60 + m1 + dur, h2 = Math.floor(tot / 60), m2 = tot % 60; return { kaal: `Van ${h1}:${PAD(m1)} tot ${h2}:${PAD(m2)} = … minuten`, vraag: `Een film begint om ${h1}:${PAD(m1)} uur en eindigt om ${h2}:${PAD(m2)} uur. Hoeveel minuten duurt de film?`, antwoord: dur, eenheid: 'min', uitleg: `Van ${h1}:${PAD(m1)} tot ${h2}:${PAD(m2)} = ${dur} minuten` } }
const breukDeelV = (zwaar) => { const n = pick(zwaar ? [4, 5, 6, 8] : [2, 3, 4, 5]), m = rnd(2, zwaar ? 12 : 6); return { kaal: `${m} : 1/${n} =`, vraag: `Hoeveel glazen van 1/${n} liter kun je vullen uit ${m} liter?`, antwoord: m * n, eenheid: 'glazen', uitleg: `${m} : 1/${n} = ${m} × ${n} = ${m * n}` } }
const cirkelV = (soort) => { const r = pick([2, 3, 4, 5, 10]), nm = naam(); if (soort === 'omtrek' || (!soort && Math.random() < 0.5)) return { kaal: `Omtrek van een cirkel met straal ${r} cm? (π ≈ 3,14)`, vraag: `${nm} maakt een rond kleedje met een straal van ${r} cm en wil er een lint omheen plakken. Hoeveel cm lint is dat (de omtrek)? (gebruik π ≈ 3,14)`, antwoord: +(2 * 3.14 * r).toFixed(2), eenheid: 'cm', uitleg: `omtrek = 2 × π × r = 2 × 3,14 × ${r} = ${komma(+(2 * 3.14 * r).toFixed(2))} cm` }; return { kaal: `Oppervlakte van een cirkel met straal ${r} cm? (π ≈ 3,14)`, vraag: `${nm} maakt een ronde tafel met een straal van ${r} cm. Bereken de oppervlakte van het tafelblad. (gebruik π ≈ 3,14)`, antwoord: +(3.14 * r * r).toFixed(2), eenheid: 'cm²', uitleg: `oppervlakte = π × r × r = 3,14 × ${r} × ${r} = ${komma(+(3.14 * r * r).toFixed(2))} cm²` } }
const ROMEINS = [['IV', 4], ['VI', 6], ['IX', 9], ['XI', 11], ['XIII', 13], ['XIV', 14], ['XIX', 19], ['XXII', 22], ['XXV', 25], ['XL', 40], ['L', 50]]
const romeinsV = (soort) => { if (soort === 'romeins' || (!soort && Math.random() < 0.5)) { const [r, n] = pick(ROMEINS); return { kaal: `${r} = …`, vraag: `Op een oud gebouw staat het bouwjaar met het Romeinse getal ${r}. Welk gewoon getal is dat?`, antwoord: n, uitleg: `${r} = ${n}` } } const a = rnd(2, 9), b = rnd(1, 9); return { kaal: `${a} − ${a + b} =`, vraag: `Het is ${a} graden buiten. Het wordt ${a + b} graden kouder. Hoeveel graden staat de thermometer dan aan?`, antwoord: -b, eenheid: '°', uitleg: `${a} − ${a + b} = −${b} graden` } }
const kwadraatWortelV = (soort) => { const nm = naam(); if (soort === 'kwadraat' || (!soort && Math.random() < 0.5)) { const n = rnd(2, 12); return { kaal: `${n}² =`, vraag: `${nm} legt een vierkant van ${n} bij ${n} tegels. Hoeveel tegels zijn dat samen?`, antwoord: n * n, eenheid: 'tegels', uitleg: `${n} × ${n} = ${n * n} (dat is ${n}²)` } } const n = pick([4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144]); return { kaal: `√${n} =`, vraag: `${nm} legt ${n} tegels in een perfect vierkant. Hoeveel tegels liggen er op één rij?`, antwoord: Math.sqrt(n), eenheid: 'tegels', uitleg: `√${n} = ${Math.sqrt(n)}, want ${Math.sqrt(n)} × ${Math.sqrt(n)} = ${n}` } }
const patroonRijV = (zwaar) => { const start = rnd(1, zwaar ? 40 : 12), stap = pick(zwaar ? [6, 7, 8, 9, 12, 25] : [2, 3, 4, 5, 10]), rij = [start, start + stap, start + 2 * stap, start + 3 * stap], nm = naam(); return { kaal: `${rij.join(', ')}, … — welk getal komt er?`, vraag: `${nm} maakt stapels blokken. De eerste stapels hebben ${rij.join(', ')} blokken. Steeds komen er evenveel bij. Hoeveel blokken heeft de volgende stapel?`, antwoord: start + 4 * stap, eenheid: 'blokken', uitleg: `Steeds ${stap} erbij: ${rij[3]} + ${stap} = ${start + 4 * stap}.` } }
const combinatiesV = (zwaar) => { const a = rnd(2, zwaar ? 9 : 5), b = rnd(2, zwaar ? 9 : 5), dingA = pick(['shirts', 'broeken', 'petjes', 'truien']), dingB = pick(['schoenen', 'sokken', 'jassen']); return { kaal: `${a} × ${b} = … combinaties`, vraag: `Je hebt ${a} ${dingA} en ${b} ${dingB}. Hoeveel verschillende combinaties kun je maken?`, antwoord: a * b, eenheid: 'combinaties', uitleg: `${a} × ${b} = ${a * b} mogelijke combinaties` } }

// ── Bouwers voor de groep-7-doelen die nog niet klopten ─────────────────────

// "Benoemde kommagetallen plaatsen en aflezen" gaat over een getal als 0,242 m
// op een getallenlijn, niet over 2/5 omzetten in een kommagetal — breuken en
// kommagetallen aan elkaar knopen komt pas in blok 4. De lijn zoomt daarom in
// op één stukje, zodat de stapjes tienden, honderdsten of duizendsten zijn.
const KOMMA_LIJN = [
  { e: 'm', min: 1, max: 4, zin: (n) => `${n} springt bij gym zo ver mogelijk. Op de meetlat staat een pijl bij de sprong van ${n}. Hoeveel meter is dat?` },
  { e: 'kg', min: 1, max: 5, zin: (n) => `De groenteboer weegt een zak appels voor ${n}. De wijzer van de weegschaal staat bij de pijl. Hoeveel kilogram wegen de appels?` },
  { e: 'l', min: 0.5, max: 2, zin: (n) => `${n} giet water in een maatbeker. Het water staat precies bij de pijl. Hoeveel liter zit er in de beker?` },
  { e: 'km', min: 1, max: 8, zin: (n) => `${n} kijkt tijdens het hardlopen op de app van het sporthorloge. De pijl laat zien hoe ver ${n} al is. Hoeveel kilometer is dat?` },
]
const kommaLijnV = () => {
  const c = pick(KOMMA_LIJN)
  const diepte = pick([1, 2, 2, 3])          // tienden, honderdsten, duizendsten
  const schaal = Math.pow(10, diepte)
  // Het venster van de lijn moet ook een echt getal opleveren: een sprong van
  // 0,543 m is geen verspringen, en 0,003 kg appels is geen zak appels.
  const startI = rnd(Math.round(c.min * schaal / 10), Math.round(c.max * schaal / 10) - 1) * 10
  const i = rnd(1, 9)
  const start = startI / schaal, eind = (startI + 10) / schaal
  const waarde = +((startI + i) / schaal).toFixed(diepte)
  const stap = +(1 / schaal).toFixed(diepte)
  return {
    vraag: c.zin(naam()), kaal: `Welk getal hoort bij de pijl? (in ${c.e})`, antwoord: waarde, eenheid: c.e,
    figuur: { type: 'getallenlijn', start, eind, waarde, segs: 10 },
    uitleg: `De lijn loopt van ${komma(start)} tot ${komma(eind)} in 10 stapjes van ${komma(stap)}. De pijl staat bij het ${i}e streepje: ${komma(waarde)} ${c.e}.`,
  }
}

// Hoofdrekenen met eenvoudige kommagetallen: optellen én aftrekken, met
// bedragen van hele kwartjes zodat het uit het hoofd kan.
const kommaHoofdrekenV = (max, soort) => {
  const n = naam(), p1 = rnd(6, max) * 25 / 100, p2 = rnd(6, 24) * 25 / 100
  const spullen = pick([['boek', 'pen'], ['bal', 'pet'], ['puzzel', 'sleutelhanger'], ['broodje', 'pakje sap']])
  if (soort === 'plus' || (!soort && Math.random() < 0.5)) {
    return { vraag: `${n} staat bij de kassa met een ${spullen[0]} van ${euro(p1)} en een ${spullen[1]} van ${euro(p2)}. Hoeveel moet ${n} afrekenen?`,
             kaal: `${euro(p1)} + ${euro(p2)} =`,
             antwoord: +(p1 + p2).toFixed(2), eenheid: '€', uitleg: `${euro(p1)} + ${euro(p2)} = ${euro(p1 + p2)}` }
  }
  const groot = Math.max(p1, p2) + 5, klein = Math.min(p1, p2)
  return { vraag: `${n} krijgt ${euro(groot)} zakgeld en koopt daar meteen een tijdschrift van ${euro(klein)} van. Hoeveel zakgeld heeft ${n} dan nog?`,
           kaal: `${euro(groot)} − ${euro(klein)} =`,
           antwoord: +(groot - klein).toFixed(2), eenheid: '€', uitleg: `${euro(groot)} − ${euro(klein)} = ${euro(groot - klein)}` }
}

// Cijferend of kolomsgewijs met benoemde kommagetallen: allebei de bewerkingen,
// en met bedragen waar echt bij onthouden of geleend moet worden.
const kommaCijferV = (max, soort) => {
  const n = naam()
  if (soort === 'plus' || (!soort && Math.random() < 0.5)) {
    const a = rnd(650, max) / 100, b = rnd(650, max) / 100
    return { vraag: `${n} maakt de kassabon van het verjaardagsfeest na. Op de bon staan een taart van ${euro(a)} en een pak slingers van ${euro(b)}. Welk bedrag stond er onderaan de bon?`,
             kaal: `${euro(a)} + ${euro(b)} =`,
             antwoord: +(a + b).toFixed(2), eenheid: '€', uitleg: `${euro(a)} + ${euro(b)} = ${euro(a + b)}` }
  }
  const prijs = rnd(650, max) / 100, betaald = Math.ceil(prijs / 5) * 5
  return { vraag: `${n} rekent bij de kassa een spel van ${euro(prijs)} af met een briefje van ${euro(betaald)}. Hoeveel geld krijgt ${n} terug?`,
           kaal: `${euro(betaald)} − ${euro(prijs)} =`,
           antwoord: +(betaald - prijs).toFixed(2), eenheid: '€', uitleg: `${euro(betaald)} − ${euro(prijs)} = ${euro(betaald - prijs)}` }
}

// Helen uit de breuk halen: hoeveel hele, en wat blijft er over.
const breukHelenV = () => {
  const noem = rnd(3, 8), h = rnd(2, 5), r = rnd(1, noem - 1), t = h * noem + r
  const n = naam()
  return {
    vraag: `In de pizzeria liggen nog ${t} losse punten pizza. Uit één hele pizza snijdt ${n} er ${noem}. Hoeveel héle pizza's kan ${n} daarmee opnieuw maken, en hoeveel punten blijven er over?`,
    kaal: `${t}/${noem} = … hele en … / ${noem}`,
    antwoord: h, rest: r,
    uitleg: `${t}/${noem} = ${t} : ${noem} = ${h} met rest ${r}. Dus ${h} hele pizza's en ${r}/${noem} pizza over.`,
  }
}

// Verhoudingen: van een gegeven verhouding naar een ander aantal, zoals in een
// verhoudingstabel (×2, ×3, of eerst terug naar 1).
const verhoudingsTabelV = () => {
  const nm = naam(), k = rnd(1, 3)
  if (k === 1) {
    const a = pick([3, 4, 5, 6]), per = rnd(2, 9) * 50 / 100, b = a * rnd(2, 5)
    return { vraag: `De schoolkantine haalt bij de groothandel ${a} kratten limonade voor ${euro(a * per)}. Voor het schoolfeest zijn er ${b} kratten nodig. Hoeveel euro kost die bestelling?`,
             kaal: `${a} kratten kosten ${euro(a * per)}. Wat kosten ${b} kratten?`,
             antwoord: +(b * per).toFixed(2), eenheid: '€',
             uitleg: `1 krat: ${euro(a * per)} : ${a} = ${euro(per)}. ${b} kratten: ${b} × ${euro(per)} = ${euro(b * per)}.` }
  }
  if (k === 2) {
    const liter = pick([2, 3, 4, 5]), perLiter = rnd(6, 12), opp = liter * perLiter * rnd(2, 4)
    return { vraag: `Met ${liter} liter verf kan ${nm} ${liter * perLiter} m² muur schilderen. De gymzaal heeft ${opp} m² muur. Hoeveel liter verf heeft ${nm} nodig?`,
             kaal: `${liter} liter is genoeg voor ${liter * perLiter} m². Hoeveel liter voor ${opp} m²?`,
             antwoord: opp / perLiter, eenheid: 'l',
             uitleg: `1 liter is genoeg voor ${liter * perLiter} : ${liter} = ${perLiter} m². ${opp} : ${perLiter} = ${opp / perLiter} liter.` }
  }
  const n = rnd(3, 8), stuk = rnd(40, 250) / 100
  return { vraag: `${nm} koopt ${n} dezelfde schriften en betaalt ${euro(+(n * stuk).toFixed(2))}. Alle schriften kosten evenveel. Wat kost één schrift?`,
           kaal: `${n} stuks kosten ${euro(+(n * stuk).toFixed(2))}. Wat kost er 1?`,
           antwoord: +stuk.toFixed(2), eenheid: '€', uitleg: `${euro(+(n * stuk).toFixed(2))} : ${n} = ${euro(stuk)}` }
}

// Cirkeldiagram: aflezen welk deel bij een categorie hoort en dat omrekenen
// naar een aantal. De percentages zijn altijd samen 100%.
const CIRKEL_SETS = [
  { vraag: 'Welke sport doe je het liefst?', wie: 'kinderen', delen: [['voetbal', 40], ['zwemmen', 25], ['dansen', 20], ['turnen', 15]] },
  { vraag: 'Hoe kom je naar school?', wie: 'kinderen', delen: [['fiets', 50], ['lopend', 30], ['auto', 20]] },
  { vraag: 'Wat eet je het liefst?', wie: 'kinderen', delen: [['pizza', 45], ['pannenkoek', 30], ['friet', 25]] },
  { vraag: 'Welk huisdier heb je?', wie: 'kinderen', delen: [['hond', 35], ['kat', 30], ['konijn', 20], ['geen', 15]] },
]
const cirkelDiagramV = (maxStappen) => {
  const set = pick(CIRKEL_SETS)
  const totaal = 20 * rnd(2, maxStappen)
  const delen = set.delen.map(([label, pct]) => ({ label, pct }))
  const k = pick(delen)
  const fig = { type: 'cirkel', delen, titel: set.vraag }
  if (Math.random() < 0.5) {
    return { vraag: `Op school is gevraagd: "${set.vraag}" Er deden ${totaal} ${set.wie} mee. Hoeveel ${set.wie} kozen ${k.label}?`,
             kaal: `${totaal} ${set.wie} in totaal. Hoeveel kozen ${k.label}?`,
             antwoord: totaal * k.pct / 100, eenheid: set.wie, figuur: fig,
             uitleg: `${k.label} is ${k.pct}% van de taart. ${k.pct}% van ${totaal} = ${totaal} : 100 × ${k.pct} = ${totaal * k.pct / 100}.` }
  }
  const a = delen[0], b = delen[delen.length - 1]
  return { vraag: `Op school is gevraagd: "${set.vraag}" Er deden ${totaal} ${set.wie} mee. Hoeveel ${set.wie} meer kozen ${a.label} dan ${b.label}?`,
           kaal: `${totaal} ${set.wie} in totaal. Hoeveel meer kozen ${a.label} dan ${b.label}?`,
           antwoord: totaal * (a.pct - b.pct) / 100, eenheid: set.wie, figuur: fig,
           uitleg: `${a.label}: ${totaal * a.pct / 100}. ${b.label}: ${totaal * b.pct / 100}. Verschil: ${totaal * (a.pct - b.pct) / 100}.` }
}

// Gemiddelde met de rekenmachine: meer getallen en grotere aantallen dan je
// uit het hoofd doet — de tweede les van dat doel.
const gemiddeldeGrootV = () => {
  const k = rnd(4, 5), gem = rnd(12, 60) * 5
  const waarden = []
  let som = 0
  for (let i = 0; i < k - 1; i++) { const w = gem + rnd(-40, 40) * 5; waarden.push(w); som += w }
  waarden.push(gem * k - som)
  const nm = naam()
  return {
    vraag: `${nm} telt ${k} dagen lang hoeveel bezoekers er in het museum komen: ${waarden.join(', ')}. Wat is het gemiddelde aantal bezoekers per dag?`,
    kaal: `Gemiddelde van ${waarden.join(', ')} =`,
    antwoord: gem, eenheid: 'bezoekers',
    uitleg: `(${waarden.join(' + ')}) : ${k} = ${getal(gem * k)} : ${k} = ${gem}`,
  }
}

// Rekenen met prijs én gewicht: de tweede les bij het gewichtsdoel.
const prijsGewichtV = () => {
  const perKilo = rnd(4, 24) * 25 / 100, gram = pick([250, 500, 750, 1500, 2500])
  const nm = naam()
  return {
    vraag: `Bij de kaasboer kost een kilo ${euro(perKilo)}. ${nm} koopt ${getal(gram)} gram. Hoeveel moet ${nm} betalen?`,
    kaal: `1 kg kost ${euro(perKilo)}. Wat kost ${getal(gram)} g?`,
    antwoord: +(perKilo * gram / 1000).toFixed(2), eenheid: '€',
    uitleg: `${getal(gram)} g = ${komma(gram / 1000)} kg. ${komma(gram / 1000)} × ${euro(perKilo)} = ${euro(perKilo * gram / 1000)}`,
  }
}

// Twee lengtes bij elkaar optellen, elk met een eigen maat: de tweede les bij
// het lengtedoel, waar de eerste les alleen omrekent.
const maatLengteOptelV = () => {
  const m1 = rnd(1, 8), cm1 = rnd(10, 90), m2 = rnd(1, 8), cm2 = rnd(10, 90)
  const totaal = m1 * 100 + cm1 + m2 * 100 + cm2
  const nm = naam()
  return {
    vraag: `${nm} legt twee planken achter elkaar: één van ${m1} m ${cm1} cm en één van ${m2} m ${cm2} cm. Hoeveel centimeter zijn ze samen?`,
    kaal: `${m1} m ${cm1} cm + ${m2} m ${cm2} cm = … cm`,
    antwoord: totaal, eenheid: 'cm',
    uitleg: `${m1} m ${cm1} cm = ${m1 * 100 + cm1} cm en ${m2} m ${cm2} cm = ${m2 * 100 + cm2} cm. Samen ${getal(totaal)} cm.`,
  }
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
    kaal: `Hoe laat is het? Schrijf het zo: ${h}:${PAD(m === 0 ? 25 : m)}`,
    antwoordType: 'tijd', tijdH: h, tijdM: m, antwoord: `${h}:${PAD(m)}`,
    figuur: { type: 'klok', h, m, dagdeel: dd.naam, icon: dd.icon },
    uitleg: `De grote wijzer wijst naar ${wijzer} en de kleine wijzer naar de ${h}. Het is ${h}:${PAD(m)} uur ${dd.naam} (= ${h24}:${PAD(m)} uur).`,
  }
}

// ── Getallenlijn aflezen ──
const getallenlijnV = (start, lengte) => {
  const segs = 10, eind = start + lengte
  const i = rnd(1, segs - 1), waarde = start + i * (lengte / segs)
  return {
    vraag: `${naam()} zet een pijl op de getallenlijn. Welk getal hoort bij de pijl?`,
    kaal: 'Welk getal hoort bij de pijl?',
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
const DIAGRAM_INTRO = [
  (t) => `Groep 7 houdt een onderzoekje en zet het aantal ${t} in een diagram.`,
  (t) => `Voor de schoolkrant maakt de redactie een diagram van het aantal ${t}.`,
  (t) => `In de klas hangt een diagram met het aantal ${t} van de afgelopen tijd.`,
]
const diagramV = (type, step, maxUnits, soort) => {
  const set = pick(DIAGRAM_SETS)
  const intro = pick(DIAGRAM_INTRO)(set.titel)
  const items = set.labels.map(l => ({ label: l, waarde: rnd(1, maxUnits) * step }))
  const vraagSoort = soort === 'lees' ? 'lees'
    : soort === 'rekenen' ? pick(['diff', 'totaal'])
    : pick(['lees', 'diff', 'totaal'])
  const fig = { type, items, step, titel: set.titel }
  if (vraagSoort === 'totaal') {
    const som = items.reduce((s, x) => s + x.waarde, 0)
    return { kaal: `Hoeveel ${set.titel} in totaal volgens het diagram?`, vraag: `${intro} Hoeveel ${set.titel} zijn het er bij elkaar?`, antwoord: som, figuur: fig, uitleg: `${items.map(x => x.waarde).join(' + ')} = ${som}` }
  }
  if (vraagSoort === 'diff') {
    const sorted = [...items].sort((a, b) => b.waarde - a.waarde)
    const a = sorted[0], b = sorted[sorted.length - 1]
    return { kaal: `Hoeveel ${set.titel} scheelt het tussen ${a.label} en ${b.label}?`, vraag: `${intro} Hoeveel ${set.titel} scheelt het tussen ${a.label} en ${b.label}?`, antwoord: a.waarde - b.waarde, figuur: fig, uitleg: `${a.waarde} − ${b.waarde} = ${a.waarde - b.waarde}` }
  }
  const k = pick(items)
  return { kaal: `Hoeveel ${set.titel} bij ${k.label}?`, vraag: `${intro} Hoeveel ${set.titel} horen er bij ${k.label}?`, antwoord: k.waarde, figuur: fig, uitleg: `Lees de hoogte bij ${k.label} af: ${k.waarde}.` }
}

// ── Groep 5 (Pluspunt). Eén traject (geen FS/S+). Instap + blok 1 t/m 10. ──
function maakGroep5() {
  return {
    0: [
      { doel: 'Je leert verder- en terugtellen tot en met 1000 met sprongen van 1, 10 en 100, en getallen tot en met 1000 op volgorde zetten.', gen: () => getallenlijnV(rnd(0, 5) * 100, 500) },
      { doel: 'Je leert optellen en aftrekken tot en met 100 met de strategieën rijgen, rijgen met te veel en aanvullen.', gen: () => { const a = rnd(20, 89), b = rnd(11, a - 5); return Math.random() < 0.5 ? optelV(a, rnd(11, 99 - a)) : aftrekV(a, b) } },
      { doel: 'Je leert alle keersommen vlot te maken.', gen: () => keerV(rnd(2, 10), rnd(2, 10)) },
      { doel: 'Je leert de tijd van een digitale klok aflezen, bij hele en halve uren en bij kwartieren.', gen: () => klokV([0, 15, 30, 45]) },
    ],
    1: [
      { doel: 'Je leert getallen tot en met 1000 splitsen in en samenstellen met honderdtallen, tientallen en eenheden.', gen: () => getallenlijnV(rnd(0, 5) * 100, 500) },
      { doel: 'Je leert tussen welke honderdtallen een getal ligt en getallen tot en met 1000 op volgorde zetten.', gen: () => tussenHonderdV() },
      { doel: 'Je leert alle tafelsommen vlot maken.', gen: () => keerV(rnd(2, 10), rnd(2, 10)) },
      { doel: 'Je leert de tijd van een digitale klok aflezen, bij hele en halve uren en bij kwartieren.', gen: () => klokV([0, 15, 30, 45]) },
    ],
    2: [
      { doel: 'Je leert getallen tot en met 1000 schattend plaatsen en aflezen op de streepjesgetallenlijn vanaf een willekeurig getal.', gen: () => getallenlijnV(rnd(0, 5) * 100, 500) },
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
      D('Je leert optellen en aftrekken tot en met 1000 met de strategieën rijgen (in max 2 sprongen), splitsen en aanvullen' + (plus ? ', en rijgen met te veel.' : '.'), [
        { label: 'optellen', gen: () => optelV(rnd(140, 880), rnd(110, 480)) },
        { label: 'aftrekken', gen: () => { const a = rnd(140, 880); return aftrekV(a, rnd(110, a - 80)) } },
      ]),
      D('Je leert sommen als 4 × 67 en 67 × 4 uitrekenen met de basisstrategie splitsen, al dan niet door eerst om te keren' + (plus ? ', en met de variastrategieën rekenen met te veel en halveren en verdubbelen.' : '.'), [
        { label: '4 × 67', gen: () => keerV(rnd(3, 9), rnd(41, 89)) },
        { label: '67 × 4 (omkeren)', gen: () => keerV(rnd(41, 89), rnd(3, 9)) },
      ]),
      D('Je leert sommen als 42 : 3 uitrekenen met de basisstrategie splitsen.', [
        { label: 'basis', gen: () => deelV(rnd(3, 6), rnd(11, 20)) },
        { label: 'grotere getallen', gen: () => deelV(rnd(3, 8), rnd(21, 30)) },
      ]),
      D('Je leert van een klok met wijzers en van een digitale klok 5, 10 en 15 minuten voor en over een heel uur en een half uur aflezen.', [
        { label: 'voor en over het hele uur', gen: () => klokV([5, 10, 15, 45, 50, 55]) },
        { label: 'voor en over het halve uur', gen: () => klokV([20, 25, 35, 40]) },
      ]),
    ],
    1: [
      D('Je leert getallen tot 10.000 splitsen in en samenstellen met duizendtallen, honderdtallen, tientallen en eenheden, en de waardes van de cijfers schrijven in woorden en met cijfers.', [
        { label: 'splitsen en cijferwaarde', gen: () => getalSchrijvenV(9, 1) },
        { label: 'plaatsen op de getallenlijn', gen: () => getallenlijnV(rnd(0, 5) * 1000, 5000) },
      ]),
      D('Je leert sommen als 1200 + 1300, 4500 - 1200, 3 × 700 en 4500 : 9 vlot uitrekenen door te rekenen met de kleine som.', [
        { label: 'plus en min', gen: () => Math.random() < 0.5
          ? optelV(rnd(11, 80) * 100, rnd(11, 40) * 100)
          : (() => { const a = rnd(25, 90) * 100, b = rnd(11, Math.floor(a / 100) - 5) * 100; return aftrekV(a, b) })() },
        { label: 'keer en delen', gen: () => Math.random() < 0.5
          ? keerV(rnd(2, 9), rnd(2, 9) * 100)
          : deelV(rnd(2, 9), rnd(2, 9) * 100) },
      ]),
      D('Je leert meten met stroken en de uitkomst opschrijven in breukentaal, en je leert dat breuken ontstaan uit eerlijk verdelen.', [
        { label: 'eerlijk verdelen', gen: () => deelVanGeheelV() },
        { label: 'aanvullen tot een hele', gen: () => breukAanvullenV(false) },
      ]),
      D('Je leert van een klok met wijzers de tijd op de minuut nauwkeurig aflezen en van een digitale klok de minuten aflezen en aangeven.', [
        { label: 'hele vijf minuten', gen: () => klokV([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]) },
        { label: 'op de minuut nauwkeurig', gen: () => klokV(Array.from({ length: 60 }, (_, i) => i)) },
      ]),
    ],
    2: [
      D('Je leert tellen tot en met 10.000 met sprongen van 1, 10, 100 en 1000, getallen op volgorde zetten en schattend plaatsen en aflezen op de getallenlijn.', [
        { label: 'sprongen van 1000', gen: () => getallenlijnV(rnd(0, 5) * 1000, 5000) },
        { label: 'sprongen van 100', gen: () => getallenlijnV(rnd(0, 9) * 1000, 1000) },
      ]),
      D('Je leert sommen als 368 + 257 kolomsgewijs optellen en je begrijpt wat je opschrijft.', [
        { label: 'basis', gen: () => optelV(rnd(140, 480), rnd(140, 380)) },
        { label: 'grotere getallen', gen: () => optelV(rnd(340, 680 + M * 200), rnd(240, 680)) },
      ]),
      D('Je leert bij een plaatje aangeven welk deel gekleurd is en welke breuk erbij hoort.', [
        { label: 'welk deel is het', gen: () => deelVanGeheelV() },
        { label: 'aanvullen tot een hele', gen: () => breukAanvullenV(false) },
      ]),
      D('Je leert hoe je een plaats op een kaart kunt vinden en hoe je de lengte van een route kunt berekenen.', [
        { label: 'korte route', gen: () => kaartV(false) },
        { label: 'langere route', gen: () => kaartV(true) },
      ]),
    ],
    3: [
      D('Je leert getallen afronden op tientallen, honderdtallen en duizendtallen, en optellen en aftrekken met de afgeronde getallen.', [
        { label: 'afronden', gen: () => afrondV(9800, [10, 100, 1000]) },
        { label: 'rekenen met afgeronde getallen', gen: () => Math.random() < 0.5
          ? optelV(rnd(11, 89) * 100, rnd(11, 49) * 100)
          : (() => { const a = rnd(25, 90) * 100; return aftrekV(a, rnd(11, Math.floor(a / 100) - 5) * 100) })() },
      ]),
      D('Je leert sommen als 92 : 4 uitrekenen met de basisstrategie splitsen.', [
        { label: 'basis', gen: () => deelV(rnd(3, 6), rnd(11, 20)) },
        { label: 'grotere getallen', gen: () => deelV(rnd(3, 8), rnd(21, 30)) },
      ]),
      D('Je leert een breuk aanvullen tot een hele en bij een deel de hele tekenen.', [
        { label: 'aanvullen tot een hele', gen: () => breukAanvullenV(false) },
        { label: 'grotere noemers', gen: () => breukAanvullenV(true) },
      ]),
      D('Je leert uitrekenen hoe laat het over een bepaalde tijd is en hoeveel uren en minuten het later is.', [
        { label: 'binnen het uur', gen: () => tijdErbijV(60) },
        { label: 'over meerdere uren', gen: () => tijdErbijV(180) },
      ]),
    ],
    4: [
      D(`Je leert sommen als 432 + 257 ${cijf} optellen en je begrijpt wat je opschrijft.`, [
        { label: 'basis', gen: () => optelV(rnd(140, 440), rnd(140, 350)) },
        { label: 'grotere getallen', gen: () => optelV(rnd(340, 680), rnd(240, 560)) },
      ]),
      D(`Je leert sommen als 487 + 235 ${cijf} optellen en je begrijpt wat je opschrijft.`, [
        { label: 'met onthouden', gen: () => optelV(...metOnthouden(150, 490)) },
        { label: 'grotere getallen', gen: () => optelV(...metOnthouden(350, 690)) },
      ]),
      D('Je leert breuken schattend plaatsen en aflezen op de getallenlijn, vanaf 0 en vanaf een willekeurig getal.', [
        { label: 'deel van een geheel', gen: () => deelVanGeheelV() },
        { label: 'breuken vergelijken', gen: () => breukVergelijkV() },
      ]),
      D('Je leert de maten kilogram en gram en de maten liter, deciliter, centiliter en milliliter gebruiken.', [
        { label: 'kilogram en gram', gen: () => maatGewichtV() },
        { label: 'liter, dl, cl en ml', gen: () => maatInhoudV() },
      ]),
    ],
    5: [
      D('Je leert sommen als 463 - 248 kolomsgewijs aftrekken en je begrijpt wat je opschrijft.', [
        { label: 'basis', gen: () => { const a = rnd(360, 680); return aftrekV(a, rnd(140, a - 100)) } },
        { label: 'grotere getallen', gen: () => { const a = rnd(560, 980); return aftrekV(a, rnd(240, a - 100)) } },
      ]),
      D('Je leert sommen als 423 - 248 kolomsgewijs aftrekken (met meer wisselen) en je begrijpt wat je opschrijft.', [
        { label: 'met lenen', gen: () => aftrekV(...metLenen(240, 720)) },
        { label: 'grotere getallen', gen: () => aftrekV(...metLenen(340, 920)) },
      ]),
      D('Je leert breuken met elkaar vergelijken met behulp van afbeeldingen en de getallenlijn.', [
        { label: 'vergelijken', gen: () => breukVergelijkV() },
        { label: 'gelijkwaardige breuken', gen: () => gelijkwaardigeBreukV() },
      ]),
      D('Je leert tijden aflezen en aangeven op de seconde nauwkeurig en tijden omrekenen in minuten en seconden.', [
        { label: 'minuten naar seconden', gen: () => tijdNaarSecV(false) },
        { label: 'langere tijden', gen: () => tijdNaarSecV(true) },
      ]),
    ],
    6: [
      D('Je leert tellen tot en met 100.000 met sprongen van 1, 10, 100, 1000 en 10.000, getallen splitsen, samenstellen, schrijven, op volgorde zetten en schattend plaatsen op de getallenlijn.', [
        { label: 'plaatsen op de getallenlijn', gen: () => getallenlijnV(rnd(0, 5) * 10000, 50000) },
        { label: 'in cijfers schrijven', gen: () => getalSchrijvenV(99, 11) },
      ]),
      D('Je leert sommen als 826 : 9 (met rest) uitrekenen met de basisstrategie splitsen.', [
        { label: 'zonder rest', gen: () => deelV(rnd(3, 9), rnd(40, 99)) },
        { label: 'met rest', gen: () => { const deler = rnd(3, 9); return deelRestV(deler, rnd(40, 99), rnd(1, deler - 1)) } },
      ]),
      D('Je leert de betekenis van kommagetallen bij diverse maten en geld, en het lezen en schrijven van benoemde en onbenoemde kommagetallen met 1, 2 en 3 cijfers achter de komma.', [
        { label: 'breuk en kommagetal', gen: () => breukKommaV() },
        { label: 'kommagetal op de getallenlijn', gen: () => kommaLijnV() },
      ]),
      D('Je leert de maten kilometer, hectometer, meter, decimeter, centimeter en millimeter omrekenen, maten in meter met een komma opschrijven en de omtrek van een figuur berekenen.', [
        { label: 'maten omrekenen', gen: () => maatLengteV() },
        { label: 'omtrek berekenen', gen: () => omtrekV(12 + M * 6, 9 + M * 5) },
      ]),
    ],
    7: [
      D(`Je leert sommen als 454 - 237 ${cijf} aftrekken en je begrijpt wat je opschrijft.`, [
        { label: 'basis', gen: () => { const a = rnd(360, 680); return aftrekV(a, rnd(140, a - 100)) } },
        { label: 'grotere getallen', gen: () => { const a = rnd(560, 980); return aftrekV(a, rnd(240, a - 100)) } },
      ]),
      D(plus ? 'Je leert sommen als 432 - 263 en 1705 - 346 cijferend aftrekken.' : 'Je leert sommen als 432 - 263 en 402 - 267 cijferend of kolomsgewijs aftrekken.', [
        { label: '432 − 263', gen: () => aftrekV(...metLenen(240, 720)) },
        plus
          ? { label: '1705 − 346', gen: () => { const a = rnd(1100, 1900); return aftrekV(a, rnd(240, 900)) } }
          : { label: '402 − 267 (met nullen)', gen: () => { const a = rnd(4, 9) * 100 + rnd(0, 9); return aftrekV(a, rnd(240, a - 80)) } },
      ]),
      D('Je leert een deel van een geheel berekenen en een deel aflezen van een staafdiagram.', [
        { label: 'deel van een geheel', gen: () => deelVanGeheelV() },
        { label: 'aflezen van een staafdiagram', gen: () => diagramV('staaf', pick([5, 10]), rnd(3, 9)) },
      ]),
      D('Je leert een datum opschrijven in cijfers (dag-maand-jaar), een datum berekenen met en zonder kalender en een tijdbalk gebruiken bij het rekenen met jaartallen.', [
        { label: 'datum berekenen', gen: () => datumV() },
        { label: 'weken en kalender', gen: () => kalenderV() },
      ]),
    ],
    8: [
      D('Je leert sommen als 30 × 40 en 1500 : 30 uitrekenen met de kleine som.', [
        { label: '30 × 40', gen: () => keerV(rnd(2, 9) * 10, rnd(2, 9) * 10) },
        { label: '1500 : 30', gen: () => deelV(rnd(2, 9) * 10, rnd(2, 9)) },
      ]),
      D('Je leert sommen als 6 × 284 kolomsgewijs uit te rekenen en je begrijpt wat je opschrijft.', [
        { label: 'basis', gen: () => keerV(rnd(3, 9), rnd(110, 290)) },
        { label: 'grotere getallen', gen: () => keerV(rnd(3, 9), rnd(300, 450 + M * 240)) },
      ]),
      D('Je leert benoemde kommagetallen t/m honderdsten plaatsen en aflezen op de getallenlijn.', [
        { label: 'op de getallenlijn', gen: () => kommaLijnV() },
        { label: 'breuk en kommagetal', gen: () => breukKommaV() },
      ]),
      D('Je leert de inhoud aflezen bij maatbekers en de maten liter, deciliter, centiliter en milliliter omrekenen, en maten in liter met een komma opschrijven.', [
        { label: 'maten omrekenen', gen: () => maatInhoudV() },
        { label: 'aflezen op de maatbeker', gen: () => kommaLijnV() },
      ]),
    ],
    9: [
      D(plus ? 'Je leert sommen als 138 : 3 met de basisstrategie splitsen en sommen als 147 : 3 met rekenen met te veel uitrekenen.' : 'Je leert sommen als 138 : 3 uitrekenen met de basisstrategie splitsen.', [
        { label: 'basis', gen: () => deelV(rnd(2, 6), rnd(40, 90)) },
        { label: 'grotere getallen', gen: () => deelV(rnd(3, 9), rnd(80, 150)) },
      ]),
      D(plus ? 'Je leert sommen als 3 × 67 met splitsen, 4 × 69 met rekenen met te veel en 4 × 35 met halveren en verdubbelen uitrekenen.' : 'Je leert sommen als 3 × 67 en 4 × 35 uitrekenen met de basisstrategie splitsen.', [
        { label: '3 × 67 (splitsen)', gen: () => keerV(rnd(3, 6), rnd(41, 89)) },
        { label: '4 × 35 (halveren en verdubbelen)', gen: () => keerV(pick([4, 6, 8]), rnd(3, 9) * 5) },
      ]),
      D('Je leert een deel van een geheel berekenen en berekenen wat het geheel is als je een deel weet.', [
        { label: 'deel van een geheel', gen: () => deelVanGeheelV() },
        { label: 'terug naar het geheel', gen: () => geheelTerugV() },
      ]),
      D('Je leert de omtrek en de oppervlakte berekenen van een figuur met maten in centimeters of meters.', [
        { label: 'omtrek', gen: () => omtrekV(12 + M * 8, 8 + M * 7) },
        { label: 'oppervlakte', gen: () => oppRechthoekV(12 + M * 8, 8 + M * 7) },
      ]),
    ],
    10: [
      D('Je leert schattend vermenigvuldigen en delen in rekenverhalen met geld en met ronde getallen.', [
        { label: 'schatten bij keersommen', gen: () => schattenV('keer') },
        { label: 'schatten bij geld', gen: () => schattenV('geld') },
      ]),
      D(plus ? 'Je leert sommen als 4 × 231 en 4 × 36 cijferend uitrekenen, en je begrijpt wat je opschrijft.' : 'Je leert sommen als 4 × 231 en 4 × 536 cijferend of kolomsgewijs uitrekenen, en je begrijpt wat je opschrijft.', [
        { label: '4 × 231', gen: () => keerV(rnd(3, 9), rnd(110, 290)) },
        { label: '4 × 536', gen: () => keerV(rnd(3, 9), rnd(300, 590)) },
      ]),
      D('Je leert benoemde en onbenoemde kommagetallen t/m duizendsten vergelijken en ordenen.', [
        { label: 'breuk naar kommagetal', gen: () => breukKommaV() },
        { label: 'kommagetal naar breuk', gen: () => kommaNaarBreukV() },
      ]),
      D('Je leert rekenen met lijndiagrammen en een beelddiagram aflezen.', [
        { label: 'aflezen', gen: () => diagramV('lijn', pick([5, 10]), rnd(3, 9), 'lees') },
        { label: 'ermee rekenen', gen: () => diagramV('lijn', pick([5, 10]), rnd(3, 9), 'rekenen') },
      ]),
    ],
  }
}

// ── Groep 8 (Pluspunt FS + S+). Instap + blok 1 t/m 10. Aantal doelen per
//    blok wisselt (zoals in de methode): latere blokken hebben er minder. ──
function maakGroep8(plus) {
  const opp = (soort) => (soort === 'driehoek' ? oppDriehoekV() : oppRechthoekV(plus ? 30 : 16, plus ? 20 : 11))
  const kommaOptel = (soort) => {
    const p1 = rnd(150, plus ? 8000 : 3000) / 100, p2 = rnd(150, 3000) / 100, n = naam()
    if (soort === 'min') {
      const groot = Math.max(p1, p2) + 5, klein = Math.min(p1, p2)
      return { vraag: `${n} heeft ${euro(groot)} en koopt een pet van ${euro(klein)}. Hoeveel houdt ${n} over?`,
               kaal: `${euro(groot)} − ${euro(klein)} =`,
               antwoord: +(groot - klein).toFixed(2), eenheid: '€', uitleg: `${euro(groot)} − ${euro(klein)} = ${euro(groot - klein)}` }
    }
    return { vraag: `${n} koopt een tas van ${euro(p1)} en een pet van ${euro(p2)}. Hoeveel betaalt ${n} samen?`,
             kaal: `${euro(p1)} + ${euro(p2)} =`,
             antwoord: +(p1 + p2).toFixed(2), eenheid: '€', uitleg: `${euro(p1)} + ${euro(p2)} = ${euro(p1 + p2)}` }
  }
  const samengesteld = (zwaar) => {
    const perKg = rnd(150, zwaar ? 1800 : 900) / 100, kg = rnd(2, zwaar ? 12 : 6)
    return { vraag: `Vlees kost ${euro(perKg)} per kilogram. Hoeveel kost ${kg} kg?`,
             kaal: `${kg} × ${euro(perKg)} =`,
             antwoord: +(perKg * kg).toFixed(2), eenheid: '€', uitleg: `${kg} × ${euro(perKg)} = ${euro(perKg * kg)}` }
  }
  const kommaDelenV = (zwaar) => {
    const deler = rnd(15, 95) / 10, q = rnd(2, zwaar ? 14 : 9), deeltal = +(deler * q).toFixed(2)
    return { vraag: `${komma(deeltal)} kg appels wordt verdeeld in zakken van ${komma(deler)} kg. Hoeveel zakken kun je vullen?`,
             kaal: `${komma(deeltal)} : ${komma(deler)} =`,
             antwoord: q, eenheid: 'zakken', uitleg: `${komma(deeltal)} : ${komma(deler)} = ${q}` }
  }
  return {
    0: [
      D('Je oefent sommen als 12 × 64, 22 × 64 en 6 × 346 met cijferen of splitsen, en je begrijpt wat je opschrijft.', [
        { label: 'twee cijfers × twee cijfers', gen: () => keerV(rnd(12, plus ? 89 : 49), rnd(21, 89)) },
        { label: '6 × 346', gen: () => keerV(rnd(3, 9), rnd(110, 590)) },
      ]),
      D('Je oefent hoofdrekenend vermenigvuldigen en delen met benoemde kommagetallen en vermenigvuldigen bij sommen als 2,9 × 8,1 en 24 × 0,67.', [
        { label: 'heel getal × kommagetal', gen: () => kommaKeerV() },
        { label: 'kommagetal × kommagetal', gen: () => kommaVermV() },
      ]),
      D('Je herhaalt het koppelen van 5% of 10% aan breuken, kommagetallen en verhoudingen, en de nieuwe prijs uitrekenen uit de oude prijs en het kortingspercentage.', [
        { label: 'percentage van een aantal', gen: () => procentVanV(false) },
        { label: 'nieuwe prijs na korting', gen: () => nieuwePrijsV() },
      ]),
      D('Je leert de oppervlakte berekenen van rechthoeken en driehoeken en de inhoud van een balk berekenen in dm³ en liter.', [
        { label: 'oppervlakte', gen: () => opp(Math.random() < 0.5 ? 'driehoek' : 'rechthoek') },
        { label: 'inhoud van een balk', gen: () => balkInhoudV(plus ? 12 : 8) },
      ]),
    ],
    1: [
      D('Je leert in welke volgorde je moet vermenigvuldigen, delen, optellen en aftrekken.', [
        { label: 'plus en keer', gen: () => volgordeV('plus') },
        { label: 'keer en min', gen: () => volgordeV('min') },
      ]),
      D('Je leert delen met kommagetallen bij sommen als 18,88 : 5,9, door eerst te schatten en dan zonder komma te rekenen met de rekenmachine.', [
        { label: 'basis', gen: () => kommaDelenV(false) },
        { label: 'grotere getallen', gen: () => kommaDelenV(true) },
      ]),
      D(plus ? 'Je leert de oude prijs uitrekenen uit de nieuwe prijs en het kortingspercentage, en het totaal uitrekenen aan de hand van een percentage.' : 'Je herhaalt de nieuwe prijs uitrekenen uit de oude prijs en het kortingspercentage, en je leert het totaal uitrekenen aan de hand van een percentage.', [
        plus
          ? { label: 'de oude prijs terugrekenen', gen: () => oudePrijsV() }
          : { label: 'de nieuwe prijs uitrekenen', gen: () => nieuwePrijsV() },
        { label: 'het totaal via een percentage', gen: () => totaalViaPctV() },
      ]),
      D('Je leert de tijd uitrekenen van een plaats in een andere tijdzone en de tijdsduur tussen 2 tijdstippen berekenen.', [
        { label: 'tijdzones', gen: () => tijdzoneV() },
        { label: 'tijdsduur', gen: () => tijdsduurV() },
      ]),
    ],
    2: [
      D('Je leert heel grote getallen op 2 manieren schrijven (1,2 miljard en 1.200.000.000) en getallen afronden volgens de afrondregels.', [
        { label: 'in cijfers schrijven', gen: () => grootGetalV() },
        { label: 'afronden', gen: () => miljoenV('afronden') },
      ]),
      D(plus ? 'Je leert optellen en aftrekken met benoemde en onbenoemde kommagetallen.' : 'Je herhaalt het optellen en aftrekken van benoemde kommagetallen.', [
        { label: 'optellen', gen: () => kommaOptel('plus') },
        { label: 'aftrekken', gen: () => kommaOptel('min') },
      ]),
      D('Je herhaalt het koppelen van percentages aan breuken en verhoudingen en leert hoe je handig verhoudingsproblemen oplost.', [
        { label: 'percentages', gen: () => procentRedeneerV(false) },
        { label: 'verhoudingen', gen: () => verhoudingV() },
      ]),
      D('Je leert met een schaallijntje een lengte op schaal omrekenen naar een lengte in het echt en omgekeerd, en de schaal berekenen.', [
        { label: 'kaart ↔ in het echt', gen: () => schaalV('omrekenen') },
        { label: 'de schaal uitrekenen', gen: () => schaalV('schaal') },
      ]),
    ],
    3: plus ? [
      D('Je leert bewerkingen schattend uitrekenen, in contexten waarbij het zinvol is om te schatten.', [
        { label: 'schatten bij keersommen', gen: () => schattenV('keer') },
        { label: 'schatten bij geld en optellen', gen: () => schattenV('geld') },
      ]),
      D('Je leert een breuk met een breuk vermenigvuldigen.', [
        { label: 'basis', gen: () => breukMaalBreukV(false) },
        { label: 'grotere noemers', gen: () => breukMaalBreukV(true) },
      ]),
      D('Je leert redeneren over uitspraken met percentages, percentages boven 100% uitrekenen en het oude aantal uitrekenen.', [
        { label: 'boven de 100%', gen: () => pctBoven100V() },
        { label: 'het oude aantal terugrekenen', gen: () => oudAantalViaPctV() },
      ]),
      D('Je leert rekenen met alle maten voor gewicht, schattend en precies, met prijzen en gewichten.', [
        { label: 'gewichten omrekenen', gen: () => maatGewichtV() },
        { label: 'prijs per kilo', gen: () => samengesteld(true) },
      ]),
    ] : [
      D('Je leert bewerkingen schattend uitrekenen, in contexten waarbij het zinvol is om te schatten.', [
        { label: 'schatten bij keersommen', gen: () => schattenV('keer') },
        { label: 'schatten bij geld en optellen', gen: () => schattenV('geld') },
      ]),
      D('Je herhaalt het berekenen van een deel van een hoeveelheid en een heel getal met een benoemde breuk vermenigvuldigen.', [
        { label: 'deel van een hoeveelheid', gen: () => deelVanGeheelV() },
        { label: 'heel getal × breuk', gen: () => breukMaalHeelV(false) },
      ]),
      D('Je leert redeneren over uitspraken met percentages, via 1% rekenen en het oude aantal uitrekenen.', [
        { label: 'via 1% rekenen', gen: () => procentVia1V(false) },
        { label: 'het oude aantal terugrekenen', gen: () => oudAantalViaPctV() },
      ]),
      D('Je leert rekenen met alle maten voor gewicht in verhaalsommen, schattend en precies met prijzen en gewichten.', [
        { label: 'gewichten omrekenen', gen: () => maatGewichtV() },
        { label: 'prijs per kilo', gen: () => samengesteld(false) },
      ]),
    ],
    4: [
      D(plus ? 'Je herhaalt cijferend vermenigvuldigen bij sommen als 22 × 65 en 36 × 65, en kolomsgewijs delen bij sommen als 5819 : 23.' : 'Je herhaalt cijferend of kolomsgewijs vermenigvuldigen bij sommen als 6 × 346 en 22 × 64, en kolomsgewijs delen bij 5819 : 23.', [
        { label: 'vermenigvuldigen', gen: () => keerV(rnd(21, plus ? 89 : 49), rnd(21, 89)) },
        { label: 'delen', gen: () => deelV(rnd(13, 29), rnd(120, plus ? 399 : 250)) },
      ]),
      D(plus ? 'Je leert sommen als 2/3 : 1/6 uitrekenen op de getallenlijn of met een verhoudingstabel en door te rekenen met verhoudingen.' : 'Je leert problemen (verhalen en/of plaatjes) met breuken oplossen door te tekenen of op de getallenlijn.', [
        plus
          ? { label: 'delen door een breuk', gen: () => breukDeelV(false) }
          : { label: 'deel van een geheel', gen: () => deelVanGeheelV() },
        plus
          ? { label: 'grotere noemers', gen: () => breukDeelV(true) }
          : { label: 'breuken vergelijken', gen: () => breukVergelijkV() },
      ]),
      D('Je leert rekenen met breuken, kommagetallen, procenten en verhoudingen bij verschillende aanbiedingen.', [
        { label: 'korting', gen: () => nieuwePrijsV() },
        { label: 'redeneren met percentages', gen: () => procentRedeneerV(false) },
      ]),
      D('Je leert berekeningen maken met samengestelde grootheden, zoals de prijs per oppervlakte of gewicht, en verhoudingsgewijs vergelijken.', [
        { label: 'prijs per kilo', gen: () => samengesteld(false) },
        { label: 'verhoudingsgewijs vergelijken', gen: () => verhoudingV() },
      ]),
    ],
    5: [
      D(plus ? 'Je leert herkennen wanneer een getal deelbaar is door 2, 10, 5 of 4 en door 8, 3 en 9.' : 'Je leert herkennen wanneer een getal deelbaar is door 2, 10, 5 of 4.', [
        { label: 'deelbaar door 2, 4, 5 en 10', gen: () => restV(false) },
        plus
          ? { label: 'deelbaar door 3, 8 en 9', gen: () => restV(true) }
          : { label: 'grotere getallen', gen: () => restV(true) },
      ]),
      D(plus ? 'Je leert sommen als 3,5 : 0,5 met verhoudingen en sommen als 16,2 : 3 met splitsen uitrekenen.' : 'Je herhaalt sommen als 18,6 kg : 3 uitrekenen met de strategie splitsen.', [
        { label: 'delen door een heel getal', gen: () => kommaDeelV() },
        { label: 'delen door een kommagetal', gen: () => kommaDelenV(false) },
      ]),
      D('Je leert contextproblemen over procenten, verhoudingen, breuken en kommagetallen oplossen.', [
        { label: 'procenten', gen: () => procentRedeneerV(false) },
        { label: 'lastigere percentages', gen: () => procentRedeneerV(true) },
      ]),
      D('Je oriënteert je op het werken met diagrammen: gegevens aflezen, trends herkennen (stijgen, dalen, gelijk blijven), verbanden leggen en rekenen met eenvoudige percentages.', [
        { label: 'aflezen', gen: () => diagramV(pick(['staaf', 'lijn']), pick([5, 10]), rnd(3, 9), 'lees') },
        { label: 'ermee rekenen', gen: () => diagramV(pick(['staaf', 'lijn']), pick([5, 10]), rnd(3, 9), 'rekenen') },
      ]),
    ],
    6: [
      D('Je herhaalt het rekenen met een schaallijntje, het omrekenen van lengtes op schaal en in het echt, het berekenen van een schaal en van de omtrek en oppervlakte.', [
        { label: 'schaal', gen: () => schaalV() },
        { label: 'omtrek', gen: () => omtrekV(plus ? 30 : 16, plus ? 20 : 11) },
      ]),
      D('Je herhaalt het berekenen van de inhoud van een balk in dm³ en liter en het aantal blokken dat in een grotere doos past.', [
        { label: 'inhoud in liter', gen: () => balkInhoudV(plus ? 12 : 8, 'liter') },
        { label: 'blokken van 1 dm³', gen: () => balkInhoudV(plus ? 12 : 8, 'blokken') },
      ]),
      D('Je oriënteert je op het berekenen van de oppervlakte van figuren op roosters, die te verdelen zijn in rechthoeken en driehoeken.', [
        { label: 'rechthoek', gen: () => oppRechthoekV(plus ? 30 : 16, plus ? 20 : 11) },
        { label: 'driehoek', gen: () => oppDriehoekV() },
      ]),
      D('Je oriënteert je op het berekenen van de omtrek en de oppervlakte van een cirkel.', [
        { label: 'omtrek van een cirkel', gen: () => cirkelV('omtrek') },
        { label: 'oppervlakte van een cirkel', gen: () => cirkelV('oppervlakte') },
      ]),
    ],
    7: [
      D('Je herhaalt het koppelen van veelvoorkomende percentages aan breuken, kommagetallen en verhoudingen, en leert contextproblemen oplossen.', [
        { label: 'percentage van een aantal', gen: () => procentVanV(false) },
        { label: 'lastigere percentages', gen: () => procentVanV(true) },
      ]),
      D(plus ? 'Je herhaalt ongelijknamige breuken optellen en vermenigvuldigen met breuken.' : 'Je herhaalt benoemde gelijknamige breuken optellen en het berekenen van een deel van een hoeveelheid.', [
        { label: 'breuken optellen', gen: () => breukOptelGelijkV() },
        plus
          ? { label: 'breuk × breuk', gen: () => breukMaalBreukV(false) }
          : { label: 'deel van een hoeveelheid', gen: () => deelVanGeheelV() },
      ]),
      D('Je oriënteert je op getallen en grafieken uit het nieuws en of die kloppen.', [
        { label: 'aflezen', gen: () => diagramV('staaf', pick([5, 10]), rnd(3, 9), 'lees') },
        { label: 'ermee rekenen', gen: () => diagramV('staaf', pick([5, 10]), rnd(3, 9), 'rekenen') },
      ]),
      D('Je oriënteert je op het verwerken van enquêtes: het gemiddelde uitrekenen en rekenen met percentages.', [
        { label: 'het gemiddelde', gen: () => gemiddeldeV(false) },
        { label: 'percentages', gen: () => procentVanV(false) },
      ]),
    ],
    8: [
      D('Je herhaalt betekenis verlenen aan getallen tot in de miljarden, ze op 2 manieren schrijven en op volgorde zetten, aflezen en schattend plaatsen op een getallenlijn.', [
        { label: 'in cijfers schrijven', gen: () => grootGetalV() },
        { label: 'plaatsen op de getallenlijn', gen: () => getallenlijnV(rnd(0, 5) * 1000000000, 5000000000) },
      ]),
      D('Je herhaalt het gemiddelde berekenen met hoofdrekenen en met de rekenmachine.', [
        { label: 'hoofdrekenen', gen: () => gemiddeldeV(false) },
        { label: 'met de rekenmachine', gen: () => gemiddeldeV(true) },
      ]),
      D('Je oriënteert je op negatieve getallen en op Romeinse cijfers.', [
        { label: 'Romeinse cijfers', gen: () => romeinsV('romeins') },
        { label: 'negatieve getallen', gen: () => romeinsV('negatief') },
      ]),
      D('Je oriënteert je op eenvoudige kwadraten en wortels.', [
        { label: 'kwadraten', gen: () => kwadraatWortelV('kwadraat') },
        { label: 'wortels', gen: () => kwadraatWortelV('wortel') },
      ]),
    ],
    9: [
      D(plus ? 'Je herhaalt hoofdrekenend optellen, aftrekken, vermenigvuldigen en delen met eenvoudige benoemde en onbenoemde kommagetallen.' : 'Je herhaalt hoofdrekenend optellen, aftrekken, vermenigvuldigen en delen met eenvoudige benoemde kommagetallen.', [
        { label: 'plus en min', gen: () => kommaOptel(Math.random() < 0.5 ? 'plus' : 'min') },
        { label: 'keer en delen', gen: () => Math.random() < 0.5 ? kommaKeerV() : kommaDeelV() },
      ]),
      D('Je herhaalt in welke volgorde je moet optellen, aftrekken, vermenigvuldigen en delen.', [
        { label: 'plus en keer', gen: () => volgordeV('plus') },
        { label: 'keer en min', gen: () => volgordeV('min') },
      ]),
      D(plus ? 'Je leert staartdelen.' : 'Je herhaalt kolomsgewijs delen in maximaal 3 stappen.', [
        { label: 'zonder rest', gen: () => deelV(rnd(13, 29), rnd(15, plus ? 99 : 49)) },
        { label: 'met rest', gen: () => { const deler = rnd(13, 29); return deelRestV(deler, rnd(15, plus ? 99 : 49), rnd(1, deler - 1)) } },
      ]),
      D('Je leert ontbinden in priemgetallen.', [
        { label: 'kleine priemgetallen', gen: () => priemV(false) },
        { label: 'grotere priemgetallen', gen: () => priemV(true) },
      ]),
    ],
    10: [
      D('Je herhaalt het werken met diagrammen: aflezen, berekenen, trends herkennen (stijgen, dalen, gelijk blijven) en rekenen met percentages.', [
        { label: 'aflezen', gen: () => diagramV('staaf', pick([5, 10]), rnd(3, 9), 'lees') },
        { label: 'ermee rekenen', gen: () => diagramV('staaf', pick([5, 10]), rnd(3, 9), 'rekenen') },
      ]),
      D('Je herhaalt het werken met lijndiagrammen en met diagrammen met tijd en afstand: aflezen, maken en er berekeningen mee maken.', [
        { label: 'aflezen', gen: () => diagramV('lijn', pick([5, 10]), rnd(3, 9), 'lees') },
        { label: 'ermee rekenen', gen: () => diagramV('lijn', pick([5, 10]), rnd(3, 9), 'rekenen') },
      ]),
      D('Je oriënteert je op het herkennen, uitleggen en voortzetten van patronen met figuren en in getallenrijen.', [
        { label: 'eenvoudige rijen', gen: () => patroonRijV(false) },
        { label: 'grotere sprongen', gen: () => patroonRijV(true) },
      ]),
      D('Je oriënteert je op het handig tellen van alle mogelijke combinaties, waarbij de volgorde wel of niet belangrijk is.', [
        { label: 'basis', gen: () => combinatiesV(false) },
        { label: 'meer mogelijkheden', gen: () => combinatiesV(true) },
      ]),
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

export const GROEPEN = [5, 6, 7, 8]
export const HEEFT_ROUTE = (groep) => groep !== 5   // groep 5 heeft geen FS/S+

// ── Leerlijn-domeinen ────────────────────────────────────────────────
// De doelen worden niet per blok maar per leerlijn gegroepeerd (zoals de
// rekenleerlijnen op de basisschool). Elk doel houdt zijn groep + blok als
// label. DOMEINEN = de secties op het kiesscherm (in deze volgorde);
// REGELS worden van boven naar beneden geprobeerd — de eerste die past,
// wint (zo winnen specifieke termen van algemene).
const LEERLIJN_DOMEINEN = [
  { key: 'getal',      label: '🔢 Getallen & getalbegrip' },
  { key: 'plusmin',    label: '➕ Optellen & aftrekken' },
  { key: 'keerdeel',   label: '✖️ Keer- & deelsommen' },
  { key: 'breuk',      label: '🍕 Breuken' },
  { key: 'komma',      label: '💶 Kommagetallen & geld' },
  { key: 'procent',    label: '💯 Procenten' },
  { key: 'verhouding', label: '⚖️ Verhoudingen, schaal & snelheid' },
  { key: 'meten',      label: '📏 Meten & meetkunde' },
  { key: 'tijd',       label: '🕐 Tijd & kalender' },
  { key: 'diagram',    label: '📊 Diagrammen & data' },
  { key: 'schatten',   label: '🧮 Schatten & rekenmachine' },
  { key: 'overig',     label: '🎲 Overige doelen' },
]
const LEERLIJN_REGELS = [
  { key: 'procent',    re: /procent|percentage|korting|%/i },
  { key: 'verhouding', re: /verhouding|schaal|snelheid|valuta|samengestelde|gemiddelde/i },
  { key: 'breuk',      re: /breuk|\d+\/\d+/i },
  { key: 'diagram',    re: /diagram|grafiek|enquête|patroon|combinatie|nieuws/i },
  { key: 'tijd',       re: /klok|tijd|kalender|datum|jaartallen|seconde|weeknotatie/i },
  { key: 'komma',      re: /kommagetal|wisselgeld|spaarrekening/i },
  { key: 'meten',      re: /omtrek|oppervlakte|inhoud|maten|meten|lengte|gewicht|liter|meter|millimeter|cirkel|balk|kaart|windrichting|route|rooster|kilogram|standpunt|figuren|uitslag/i },
  { key: 'schatten',   re: /schat|rekenmachine|welke volgorde/i },
  { key: 'keerdeel',   re: /vermenigvuldig|verdubbel|staartdel|delen|deelsom|deelverhaal|keersom|kleine som|tafelsom/i },
  { key: 'breuk',      re: /deel van een geheel/i },
  { key: 'getal',      re: /getallen|miljoen|miljard|afronden|getallenlijn|romeins|negatiev|priem|kwadra|wortel|deelbaar|waarde|tellen/i },
  { key: 'keerdeel',   re: /keer|×|:\s/i },
  { key: 'plusmin',    re: /optel|aftrek|rijgen|aanvullen|\+|handig rekenen/i },
  { key: 'komma',      re: /prijs|betaalt|terugkrijgt|euro|geld/i },
  { key: 'overig',     re: /./ },
]
const leerlijnVan = (doel) => LEERLIJN_REGELS.find(l => l.re.test(doel)).key

// Alle doelen van een groep (eigen + herhaling uit eerdere groepen) als
// platte lijst. De sleutel is stabiel per doel (groep+blok+index), zodat de
// selectie bewaard blijft als je wisselt tussen blok- en leerlijnweergave.
function alleDoelen(groep, route) {
  const alles = []
  const voeg = (g, blokken, herhaling) => {
    for (const nr of Object.keys(blokken)) {
      blokken[nr].forEach((item, i) => {
        alles.push({ key: `g${g}b${nr}i${i}`, groep: g, blok: +nr, doel: item.doel, gen: item.gen, delen: item.delen, herhaling })
      })
    }
  }
  voeg(groep, blokkenVan(groep, route), false)
  const vorige = { 6: [5], 7: [5, 6], 8: [5, 6, 7] }[groep] || []
  for (const v of vorige) voeg(v, v === 5 ? CURR[5].single : blokkenVan(v, route), true)
  return alles
}

// Aanvinkbare onderdelen van een groep, gegroepeerd per leerlijn-domein
// (mode 'leerlijn') of per blok (mode 'blok'). Zelfde doelen en sleutels,
// alleen anders geordend.
// De eigen doelen van één blok, in de volgorde van de methode. De denkvragen
// verwijzen per les naar het doel van die les; die tekst staat hier al, dus
// overtypen zou hem alleen maar uit de pas laten lopen.
export function doelenVanBlok(groep, blok, route = 'FS') {
  return alleDoelen(groep, route)
    .filter((a) => !a.herhaling && a.blok === blok)
    .map((a) => a.doel)
}

export function onderdelenVan(groep, route, mode = 'leerlijn') {
  const alles = alleDoelen(groep, route)

  if (mode === 'blok') {
    const items = []
    const eigen = alles.filter(a => !a.herhaling)
    const blokNrs = [...new Set(eigen.map(a => a.blok))].sort((x, y) => x - y)
    for (const nr of blokNrs) {
      items.push({ key: 'blok-' + nr, label: nr === 0 ? '📍 Instap' : 'Blok ' + nr, gens: eigen.filter(a => a.blok === nr) })
    }
    const vorige = [...new Set(alles.filter(a => a.herhaling).map(a => a.groep))].sort()
    for (const v of vorige) {
      items.push({ key: 'herh-' + v, label: '🔁 Groep ' + v, gens: alles.filter(a => a.herhaling && a.groep === v) })
    }
    return items
  }

  // groepeer per leerlijn; binnen een domein: eigen groep eerst, dan per blok
  const perLijn = new Map(LEERLIJN_DOMEINEN.map(l => [l.key, []]))
  for (const item of alles) perLijn.get(leerlijnVan(item.doel)).push(item)

  const items = []
  for (const lijn of LEERLIJN_DOMEINEN) {
    const gens = perLijn.get(lijn.key)
    if (!gens.length) continue
    gens.sort((a, b) => (a.herhaling - b.herhaling) || (a.groep - b.groep) || (a.blok - b.blok))
    items.push({ key: 'll-' + lijn.key, label: lijn.label, gens })
  }
  return items
}

// ── Lesdelen ───────────────────────────────────────────────────────────────
// Een doel loopt over twee lessen en die doen vaak elk een ander stuk (zie D()
// in maakBlokken). Deze twee helpers geven de lescheck toegang tot één zo'n
// stuk, zonder dat de rest van het spel er iets van merkt.
export function delenVanDoel(groep, route, key) {
  return alleDoelen(groep, route).find(a => a.key === key)?.delen ?? []
}

// De generator van één lesdeel, in de vorm waar maakOpgaveUit mee overweg kan.
export function gensVoorDeel(groep, route, key, deelNr) {
  const item = alleDoelen(groep, route).find(a => a.key === key)
  const deel = item?.delen?.[deelNr - 1]
  if (!deel) return null
  return [{ groep: item.groep, blok: item.blok, doel: item.doel, gen: deel.gen }]
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
// Elk doel kent zijn blok en leerlijn-domein, zodat het overzicht per blok
// óf per leerlijn gegroepeerd kan worden.
function bouwCatalogus() {
  return GROEPEN.map(groep => {
    const blokken = blokkenVan(groep, 'FS')
    const doelen = [], seen = new Set()
    for (const nr of Object.keys(blokken)) for (const g of blokken[nr]) {
      if (seen.has(g.doel)) continue
      seen.add(g.doel)
      doelen.push({ doel: g.doel, blok: +nr, lijn: leerlijnVan(g.doel) })
    }
    return { groep, doelen }
  })
}
export const GROEP_DOELEN = bouwCatalogus()
export const LEERLIJN_LABEL = Object.fromEntries(LEERLIJN_DOMEINEN.map(l => [l.key, l.label]))
export const LEERLIJN_VOLGORDE = LEERLIJN_DOMEINEN.map(l => l.key)
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
  // Bij een antwoord van drie decimalen (0,242 m op de getallenlijn) mag de
  // speling niet groter zijn dan de laatste decimaal: anders is 0,24 ineens ook
  // goed.
  const decimalen = String(antwoord).split('.')[1]?.length ?? 0
  return Math.abs(v - antwoord) < (decimalen >= 3 ? 0.0005 : 0.005)
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
