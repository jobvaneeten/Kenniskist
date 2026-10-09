// Redactie-/verhaaltjessommen generator — Groep 7 (Pluspunt FS + S+)
// Doelen afgeleid uit de Pluspunt doelenoverzichten groep 7 (blok 1 t/m 10).
// In plaats van losse sommen uittypen: per blok sjablonen die getallen,
// namen en voorwerpen invullen. Antwoord en uitleg worden berekend.

const NAMEN = ['Sem', 'Noor', 'Liam', 'Saar', 'Daan', 'Mila', 'Finn', 'Lina',
  'Bram', 'Tess', 'Luuk', 'Evi', 'Jesse', 'Fleur', 'Sam', 'Yara', 'Mees', 'Roos']
const DINGEN = [['knikker', 'knikkers'], ['sticker', 'stickers'], ['kaart', 'kaarten'],
  ['snoepje', 'snoepjes'], ['munt', 'munten'], ['kraal', 'kralen'], ['postzegel', 'postzegels']]

import * as T from './toetsvormen7.js'
import { TOETS_GROEP5, TOETS_GROEP6, maatKiezen } from './toetsvormen6.js'
import { toetsGroep7, toetsGroep8 } from './toetsvormen8.js'

const rnd  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = a => a[Math.floor(Math.random() * a.length)]
const naam = () => pick(NAMEN)
const ding = () => pick(DINGEN)
// Vaste formatters: toLocaleString per aanroep is traag, en de tests maken
// duizenden sommen.
const NF = new Intl.NumberFormat('nl-NL')
const NF_DEC = [0, 1, 2, 3].map(d => new Intl.NumberFormat('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d }))
const euro = n => '€ ' + NF_DEC[2].format(n)
const getal = n => NF.format(n)   // 35.400
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
// Binnen een lesdeel mag niets meer aan het toeval worden overgelaten: elk
// kind hoort dezelfde sóórt som te krijgen, alleen met eigen getallen. Gaat een
// lesdeel echt over twee bewerkingen ("plus en min", "keer en delen"), dan
// krijgt het kind er twee — één van elk — want anders weet je van de helft niet
// of het is blijven hangen. Zo'n deel schrijf je met `soorten`; een deel met
// één soort houdt gewoon `gen`.
const D = (doel, delen) => {
  const uit = delen.map(d => {
    const soorten = d.soorten ?? [{ label: d.label, gen: d.gen }]
    return { label: d.label, soorten, gen: () => pick(soorten).gen() }
  })
  return { doel, delen: uit, gen: () => pick(uit).gen() }
}

// Afwisselen tussen de bestaande som en de vorm waarin de toets het vraagt
// (toetsvormen7.js). Binnen één soort, zodat de lescheck niet langer wordt.
const ofToets = (gewoon, toets) => () => (Math.random() < 0.5 ? gewoon() : toets())

function maakBlokken(plus) {

  return {
    0: [
      D('Je leert schattend vermenigvuldigen en delen in rekenverhalen met geld en met ronde getallen.', [
        { label: 'schatten met geld', gen: ofToets(() => schatGeldV(plus), T.genoegGeld) },
        { label: 'schatten met ronde getallen', soorten: [
          { label: 'keer', gen: () => schatKeerV(plus) },
          { label: 'delen', gen: () => schatDeelV(plus) },
        ] },
      ]),
      D('Je leert sommen als 4 × 231 en 4 × 536 cijferend of kolomsgewijs uitrekenen en je begrijpt wat je opschrijft.', [
        { label: 'cijferen', gen: () => cijferKeer3V('cijferen') },
        plus
          ? { label: 'kolomsgewijs', soorten: [
              { label: 'kolomsgewijs', gen: () => cijferKeer3V('kolom') },
              { label: 'puzzel', gen: () => pick([vlek3V, grootsteSomV])() },
            ] }
          : { label: 'kolomsgewijs', gen: () => cijferKeer3V('kolom') },
      ]),
      D('Je leert benoemde en onbenoemde kommagetallen tot en met duizendsten vergelijken en ordenen.', [
        { label: 'vergelijken', gen: () => (plus && Math.random() < 0.3 ? dichtstbijV() : kommaGroterV(plus)) },
        { label: 'ordenen', gen: () => kommaOrdenenV(plus) },
      ]),
      D('Je leert rekenen met lijndiagrammen en een beelddiagram aflezen en gebruiken.', [
        { label: 'lijndiagram', gen: () => tempV() },
        { label: 'beelddiagram', gen: () => beeldV() },
      ]),
    ],
    1: [
      D('Je leert getallen tot en met 1 miljoen in cijfers schrijven, de waarde van de cijfers benoemen, en getallen op volgorde zetten, aflezen en schattend plaatsen op een getallenlijn.', [
        { label: 'in cijfers schrijven en cijferwaarde', gen: () => pick([getalWoordenV, splitsingV, cijferWaardeV])() },
        { label: 'op volgorde en op de getallenlijn', gen: () => pick(plus ? [volgordeMiljoenV, miljoenLijnV, sprongV] : [volgordeMiljoenV, miljoenLijnV])() },
      ]),
      D('Je leert sommen als 35.400 + 3500 en 56.700 - 2400 uitrekenen, en sommen als 50 × 7000 en 24.000 : 600 met de kleine som.', [
        { label: 'plus en min', soorten: [
          { label: 'plus', gen: ofToets(() => grootPlusMinV(plus, 'plus'), () => T.samenVerschil(plus)) },
          { label: 'min', gen: () => grootPlusMinV(plus, 'min') },
        ] },
        // 24.000 : 600 — deler én deeltal met nullen, zodat de kleine som helpt.
        { label: 'keer en delen', soorten: [
          { label: 'keer', gen: () => keerNullenV(plus) },
          { label: 'delen', gen: () => deelNullenV() },
        ] },
      ]),
      D('Je leert helen uit de breuk halen en benoemde breuken in een rekenverhaal met elkaar vergelijken en op volgorde zetten.', [
        { label: 'helen uit de breuk halen', gen: () => breukHelen7V(plus) },
        { label: 'breuken vergelijken', gen: () => (Math.random() < 0.6 ? breukMeerV : breukVolgordeV)(plus) },
      ]),
      D('Je leert de weeknotatie op een kalender gebruiken, de tijdsduur berekenen in dagen, uren en minuten, en een begintijd of eindtijd berekenen.', [
        { label: 'kalender en weken', gen: () => kalender7V() },
        { label: 'tijdsduur, begin- en eindtijd', soorten: [
          { label: 'tijdsduur', gen: () => tijdsduur7V(plus) },
          { label: 'begin- of eindtijd', gen: () => beginEind7V() },
        ] },
      ]),
    ],
    2: [
      D('Je leert sommen als 12 × 64 cijferend uitrekenen of met de strategie splitsen en je begrijpt wat je opschrijft.', [
        { label: 'tiener × tweecijferig', gen: () => tienerKeerV(plus) },
        { label: 'splitsen', soorten: [
          { label: 'splitsen', gen: () => splitsKeerV() },
          plus ? { label: 'rekenverhaal in stappen', gen: () => schoolreisV() }
               : { label: 'cijferen', gen: () => tienerKeerV(false) },
        ] },
      ]),
      D(plus ? 'Je leert sommen als 22 × 64 en 65 × 36 cijferend uitrekenen.' : 'Je leert sommen als 22 × 64 cijferend uitrekenen of met splitsen, en je herhaalt sommen als 6 × 346.', [
        { label: '22 × 64', gen: () => tweeKeerV(21, 21, 69) },
        plus
          ? { label: '65 × 36', soorten: [
              { label: 'cijferen', gen: () => tweeKeerV(50, 21, 99) },
              { label: 'wat staat er onder de vlek?', gen: () => vlekV() },
            ] }
          : { label: 'herhaling: 6 × 346', gen: () => drieKeerV() },
      ]),
      D('Je leert hoofdrekenend optellen en aftrekken met eenvoudige benoemde kommagetallen.', [
        { label: 'optellen', gen: () => Math.random() < 0.3 ? samenRondV(plus) : kommaPlusMinV(plus, 'plus') },
        { label: 'aftrekken', gen: () => plus && Math.random() < 0.2 ? grootsteKleinsteV() : kommaPlusMinV(plus, 'min') },
      ]),
      D('Je leert met een schaallijntje een lengte op schaal omrekenen naar een lengte in het echt en je leert hoe je de schaal berekent.', [
        { label: 'tekening ↔ in het echt', gen: () => schaalBlok2V(rnd(1, 2)) },
        { label: 'de schaal uitrekenen', gen: () => schaalBlok2V(3) },
      ]),
    ],
    3: [
      D('Je leert betekenis geven aan hele grote getallen tot in de miljarden, deze in cijfers schrijven en op volgorde zetten, aflezen en schattend plaatsen op een getallenlijn.', [
        { label: 'in cijfers schrijven', gen: ofToets(() => grootGetalV(), T.duizendMiljoenMiljard) },
        { label: 'plaatsen op de getallenlijn', gen: () => getallenlijnV(rnd(0, 5) * 1000000000, 5000000000) },
      ]),
      D('Je leert cijferend of kolomsgewijs optellen en aftrekken met benoemde kommagetallen.', [
        { label: 'optellen', gen: ofToets(() => kommaCijferV(plus ? 9000 : 4000, 'plus'), () => T.kommaOnderElkaar('plus')) },
        { label: 'aftrekken', gen: ofToets(() => kommaCijferV(plus ? 9000 : 4000, 'min'), () => T.kommaOnderElkaar('min')) },
      ]),
      D('Je leert welke breuken gelijkwaardig zijn en benoemde gelijknamige en ongelijknamige breuken vergelijken.', [
        { label: 'gelijkwaardige breuken', gen: ofToets(() => gelijkwaardigeBreukV(), () => T.breukPlusMin(false)) },
        { label: 'breuken vergelijken', gen: ofToets(() => (Math.random() < 0.5 ? breukVergelijkV() : breukMeerV(plus)), () => T.breukPlusMin(true)) },
      ]),
      D('Je leert maten voor lengte vergelijken, ordenen, omrekenen en optellen met hele getallen.', [
        { label: 'omrekenen', gen: ofToets(() => maatLengteV(), T.lengteOmrekenen) },
        { label: 'optellen met maten', gen: ofToets(() => maatLengteOptelV(), T.lengteOptellen) },
      ]),
    ],
    4: [
      D('Je leert sommen met een rekenmachine uitrekenen met eerst een passende schatting, en kiezen tussen hoofdrekenen en de rekenmachine.', [
        { label: 'schatten bij keersommen', gen: ofToets(() => schattenV('keer'), T.rekenmachineSom) },
        { label: 'schatten bij geld en optellen', gen: ofToets(() => schattenV('geld'), T.bonnetje) },
      ]),
      D('Je leert eenvoudige breuken omzetten in kommagetallen en omgekeerd, met en zonder rekenmachine.', [
        { label: 'breuk → kommagetal', gen: ofToets(() => breukKommaV(), T.breukOfKomma) },
        { label: 'kommagetal → breuk', gen: ofToets(() => kommaNaarBreukV(), T.breukOfKomma) },
      ]),
      D('Je leert percentages aflezen en inkleuren in een strook of cirkel, en percentages aan breuken koppelen en uitrekenen.', [
        { label: 'percentage in een strook', gen: ofToets(() => procentVanAantalV(plus ? [10, 20, 25, 50, 75] : [10, 25, 50], plus ? 9 : 6,
          'In de aula zitten', 'kinderen', 'heeft een boek bij zich'), T.procentDeelAantal) },
        { label: 'percentage in een cirkel', gen: () => cirkelDiagramV(plus ? 10 : 6) },
      ]),
      D('Je leert de gemiddelde snelheid uitrekenen in kilometer per uur en rekenen met de gemiddelde snelheid.', [
        { label: 'de snelheid uitrekenen', gen: ofToets(() => snelheidV(), T.snelheidToets) },
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
        { label: 'verhoudingstabel', gen: ofToets(() => verhoudingsTabelV(), T.vanDeTotaal) },
        { label: 'cirkeldiagram', gen: () => cirkelDiagramV(plus ? 10 : 6) },
      ]),
      D('Je leert de oppervlakte berekenen van rechthoeken en eenvoudige figuren met maten in cm, dm of m.', [
        { label: 'rechthoek', gen: ofToets(() => oppRechthoekV(plus ? 25 : 12, plus ? 18 : 9), T.oppervlakteToets) },
        // L-vorm: een grote rechthoek met een hoek eruit. Twee manieren om hem
        // te verdelen, precies waar "eenvoudige figuren" over gaat.
        { label: 'driehoek en L-vorm', soorten: [
        { label: 'driehoek', gen: () => oppDriehoekV() },
        { label: 'L-vorm', gen: () => {
          const l = rnd(6, plus ? 14 : 10), b = rnd(4, plus ? 10 : 7)
          const hl = rnd(2, l - 3), hb = rnd(2, b - 2)
          return { vraag: `Een kamer heeft de vorm van een L. De hele rechthoek zou ${l} m bij ${b} m zijn, maar er is een hoek van ${hl} m bij ${hb} m uit weggelaten. Hoeveel m² is de kamer?`,
                   kaal: `Rechthoek ${l} m bij ${b} m, met een hoek van ${hl} m bij ${hb} m eruit. Hoeveel m²?`,
                   antwoord: l * b - hl * hb, eenheid: 'm²', figuur: { type: 'lvorm', l, b, hl, hb, eenheid: 'm' },
                   uitleg: `Hele rechthoek: ${l} × ${b} = ${l * b} m². Hoek eraf: ${hl} × ${hb} = ${hl * hb} m². ${l * b} − ${hl * hb} = ${l * b - hl * hb} m²` }
        } },
        ] },
      ]),
    ],
    6: [
      D('Je leert betekenis verlenen aan getallen tot in de miljarden, afronden op een honderdduizendtal en getallen op 2 manieren schrijven (5,2 miljoen en 5.200.000).', [
        { label: '5,2 miljoen in cijfers', gen: ofToets(() => miljoenV('cijfers'), () => T.miljoenKomma('cijfers')) },
        { label: 'afronden op honderdduizendtallen', gen: ofToets(() => miljoenV('afronden'), () => T.miljoenKomma('afronden')) },
      ]),
      D('Je leert een heel getal met een benoemde breuk vermenigvuldigen.', [
        { label: 'basis', gen: () => breukMaalHeelV(false) },
        { label: 'grotere aantallen', gen: () => breukMaalHeelV(true) },
      ]),
      D('Je leert een deel van hoeveelheden omrekenen naar 5%, 10%, 25%, 50%, 75% en 100%, en 5% of 10% koppelen aan breuken, kommagetallen en verhoudingen.', [
        { label: '25%, 50% en 75%', gen: () => procentVanAantalV([25, 50, 75], plus ? 12 : 8,
          'Op het schoolplein staan', 'kinderen', 'gaat naar binnen') },
        { label: '5% en 10%', gen: ofToets(() => procentVanAantalV([5, 10], plus ? 12 : 8,
          'Op het schoolplein staan', 'kinderen', 'gaat naar binnen'), T.procentRaak) },
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
        { label: 'verhoudingen', gen: ofToets(() => verhoudingV(), T.brandstof) },
        { label: 'vreemde valuta', gen: ofToets(() => valutaV(), T.valutaKoers) },
      ]),
      D('Je leert de inhoud van een balk berekenen in dm³ en liter, en uitrekenen hoeveel blokken van 1 dm³ er in een grotere doos passen.', [
        { label: 'inhoud in liter', gen: ofToets(() => balkInhoudV(plus ? 9 : 6, 'liter'), T.inhoudM3) },
        { label: 'blokken van 1 dm³', gen: () => balkInhoudV(plus ? 9 : 6, 'blokken') },
      ]),
    ],
    8: [
      D('Je leert hoe je eenvoudige opgaven met hele getallen en kommagetallen in een verhaal op de rekenmachine kunt uitrekenen.', [
        { label: 'basis', gen: ofToets(() => boodschappenV(false), T.welkeSom) },
        { label: 'grotere bedragen', gen: ofToets(() => boodschappenV(true), T.welkeSom) },
      ]),
      D('Je herhaalt het vermenigvuldigen van een heel getal met een benoemde breuk.', [
        { label: 'basis', gen: () => breukMaalHeelV(false) },
        { label: 'grotere aantallen', gen: ofToets(() => breukMaalHeelV(true), T.heelMaalGemengd) },
      ]),
      D('Je leert de nieuwe prijs uitrekenen als je de oude prijs en het kortingspercentage weet, en percentages boven 100% uitrekenen.', [
        { label: 'korting en nieuwe prijs', soorten: [
          { label: 'de nieuwe prijs', gen: ofToets(() => nieuwePrijsV(), () => T.kortingExtra('korting')) },
          { label: 'hoeveel procent korting', gen: () => kortingPctV() },
        ] },
        { label: 'boven de 100%', gen: ofToets(() => pctBoven100V(), () => T.kortingExtra('extra')) },
      ]),
      D('Je leert gewichten omrekenen naar een andere maat, een passende maat kiezen en rekenen met prijzen en gewichten.', [
        { label: 'gewichten omrekenen', gen: ofToets(() => maatGewichtV(), T.gewichtOmrekenen) },
        { label: 'prijs en gewicht', gen: ofToets(() => maatGewichtV('prijs'), T.prijsPerKilo) },
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
        { label: 'een route volgen', gen: () => windRouteV('volgen') },
        { label: 'de kortste route', gen: () => windRouteV('kortste') },
      ]),
    ],
    10: [
      D('Je leert bewerkingen schattend uitrekenen, in contexten waarbij het zinvol is om te schatten.', [
        { label: 'schatten bij keersommen', gen: () => schattenV('keer') },
        { label: 'schatten bij geld en optellen', gen: () => schattenV('geld') },
      ]),
      D('Je leert vermenigvuldigen met kommagetallen, bij sommen als 2,9 × 8,1 en 24 × 0,67: eerst schatten, dan zonder komma rekenen met de rekenmachine en ten slotte de komma plaatsen.', [
        { label: 'heel getal × kommagetal', gen: () => heelKommaV() },
        { label: 'kommagetal × kommagetal', gen: () => {
          if (Math.random() < 0.5) return kommaVermV()
          const a = rnd(110, 220) / 100, liter = rnd(20, plus ? 600 : 250) / 10
          return { vraag: `1 liter benzine kost ${euro(a)}. Je tankt ${komma(liter)} liter. Hoeveel betaal je?`,
                   kaal: `${komma(liter)} × ${euro(a)} =`,
                   antwoord: +(a * liter).toFixed(2), eenheid: '€', uitleg: `${komma(liter)} × ${euro(a)} = ${euro(a * liter)}` }
        } },
      ]),
      D('Je leert eenvoudige breuken omzetten in kommagetallen en omgekeerd, ze vergelijken en op volgorde zetten.', [
        { label: 'omzetten', soorten: [
          { label: 'breuk → kommagetal', gen: () => breukKommaV() },
          { label: 'kommagetal → breuk', gen: () => kommaNaarBreukV() },
        ] },
        { label: 'vergelijken en ordenen', gen: () => breukKommaOrdenV() },
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
// Halveren en verdubbelen: een even getal keer een getal op 5 (4 × 35 = 2 × 70).
const halveerV = (as) => {
  const a = pick(as), b = pick([15, 25, 35, 45])
  return { ...keerV(a, b), uitleg: `Halveren en verdubbelen: ${a} × ${b} = ${a / 2} × ${b * 2} = ${a * b}` }
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
// Schattend rekenen in drie soorten context, niet alleen "rijen × stoelen":
// het doel gaat over situaties waarin schatten zinvol is, en dat is bij geld
// en bij optellen net zo goed als bij vermenigvuldigen.
const schattenV = (soort) => {
  const n = naam()
  const k = soort === 'keer' ? 1 : soort === 'geld' ? rnd(2, 3) : rnd(1, 3)
  if (k === 1) {
    const nietRond = () => { let x; do x = rnd(16, 89); while (x % 10 === 0 || x % 10 === 5); return x }
    const a = nietRond(), b = nietRond(), ra = Math.round(a / 10) * 10, rb = Math.round(b / 10) * 10
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
const breukMaalHeelV = (zwaar) => {   // heel getal × benoemde breuk: 3 × 1/8 dl, 2 × 3/4 liter
  const noem = pick(zwaar ? [3, 4, 5, 6, 8, 10] : [2, 3, 4, 5, 8]), tel = zwaar ? rnd(1, noem - 1) : 1, keer = rnd(2, zwaar ? 6 : 5)
  const t = keer * tel, g = ggd(t, noem), nm = naam()
  const [wat, e] = pick([['smoothie', 'deciliter sap'], ['pannenkoek', 'liter melk'], ['cake', 'kilo bloem'], ['taart', 'liter room']])
  const ant = noem / g === 1 ? t / g : `${t / g}/${noem / g}`
  return { vraag: `Voor één ${wat} heb je ${tel}/${noem} ${e} nodig. ${nm} maakt er ${keer}. Hoeveel ${e} is dat samen? Schrijf de breuk zo klein mogelijk.`,
           kaal: `${keer} × ${tel}/${noem} =`, antwoord: ant,
           uitleg: `${keer} × ${tel}/${noem} = ${t}/${noem}${g > 1 ? ` = ${ant}` : ''}${t > noem && noem / g > 1 ? ` (= ${Math.floor(t / noem)} ${breukKort(t % noem, noem)})` : ''}.` }
}
const breukKort = (t, n) => { const g = ggd(t, n); return `${t / g}/${n / g}` }
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
// Schaal: van de kaart naar het echt, van het echt naar de kaart, en de schaal
// zelf uitrekenen — het doel noemt die laatste met zoveel woorden.
const schaalV = (soort) => {
  const N = pick([100, 500, 1000, 2500]), cm = rnd(2, 9), nm = naam(), m = cm * N / 100
  const k = soort === 'omrekenen' ? rnd(1, 2) : soort === 'schaal' ? 3 : rnd(1, 3)
  if (k === 1) {
    return { vraag: `${nm} maakt een fietsroute op een kaart met schaallijntje 1 : ${getal(N)}. Op de kaart is het stuk langs het kanaal ${cm} cm lang. Hoeveel meter fietst ${nm} daar in het echt?`,
             kaal: `Schaal 1 : ${getal(N)}. ${cm} cm op de kaart = … m in het echt`, figuur: schaalTabel(N, [1, cm], [getal(N), '?']),
             antwoord: m, eenheid: 'm', uitleg: `${cm} cm × ${getal(N)} = ${getal(cm * N)} cm = ${getal(m)} m` }
  }
  if (k === 2) {
    return { vraag: `${nm} tekent de speelplaats op schaal 1 : ${getal(N)}. In het echt is het voetbalveldje ${getal(m)} m lang. Hoeveel centimeter wordt dat op de tekening van ${nm}?`,
             kaal: `Schaal 1 : ${getal(N)}. ${getal(m)} m in het echt = … cm op de kaart`, figuur: schaalTabel(N, [1, '?'], [getal(N), getal(m * 100)]),
             antwoord: cm, eenheid: 'cm', uitleg: `${getal(m)} m = ${getal(m * 100)} cm. ${getal(m * 100)} : ${getal(N)} = ${cm} cm` }
  }
  return { vraag: `Op de plattegrond van het park is de vijver ${cm} cm lang. In het echt is diezelfde vijver ${getal(m)} m lang. De plattegrond heeft schaal 1 : ?. Welk getal hoort op de plaats van het vraagteken?`,
           kaal: `${cm} cm op de kaart is ${getal(m)} m in het echt. Schaal 1 : …?`, figuur: schaalTabel(null, [cm, 1], [getal(m * 100), '?']),
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
const tijdNaarSecV = (zwaar) => {   // tijden omrekenen naar seconden
  const m = zwaar ? rnd(10, 45) : rnd(1, 9), s = zwaar ? rnd(1, 59) : pick([5, 10, 15, 20, 30, 45])
  return { vraag: `Een liedje duurt ${m} minuten en ${s} seconden. Hoeveel seconden is dat in totaal?`,
           kaal: `${m} min ${s} sec = … seconden`,
           antwoord: m * 60 + s, eenheid: 's', uitleg: `${m} × 60 + ${s} = ${m * 60} + ${s} = ${m * 60 + s} s` }
}
const datumV = () => {   // datum: dagen verder rekenen binnen een maand
  const dag = rnd(1, 10), erbij = rnd(5, 18)
  return { vraag: `Het is de ${dag}e van de maand. Welke datum is het over ${erbij} dagen? Geef de dag van de maand.`,
           kaal: `Dag ${dag} + ${erbij} dagen = dag …`,
           antwoord: dag + erbij, uitleg: `${dag} + ${erbij} = ${dag + erbij}` }
}
const volgordeV = (soort) => {   // volgorde van bewerkingen, in een verhaal
  if (Math.random() < 0.3) return haakjesV()
  const a = rnd(2, 9), b = rnd(2, 9), c = rnd(2, 9), n = naam(), d = ding()
  if (soort === 'plus' || (!soort && pick([0, 1]) === 0)) return { vraag: `${n} heeft ${a} losse ${d[1]} en ${b} zakjes met elk ${c} ${d[1]}. Hoeveel ${d[1]} heeft ${n} in totaal?`, kaal: `${a} + ${b} × ${c} =`, antwoord: a + b * c, eenheid: d[1], uitleg: `Eerst ${b} × ${c} = ${b * c}, dan ${a} + ${b * c} = ${a + b * c}.` }
  // Nooit meer opeten dan er zijn: a × b − c werd anders negatief, en dan
  // vraag je een kind hoeveel snoepjes er overblijven als je er meer eet dan
  // je hebt.
  const opgegeten = Math.min(c, a * b - 1)
  return { vraag: `${n} koopt ${a} zakjes met elk ${b} ${d[1]} en eet er daarna ${opgegeten} op. Hoeveel ${d[1]} blijven er over?`, kaal: `${a} × ${b} − ${opgegeten} =`, antwoord: a * b - opgegeten, eenheid: d[1], uitleg: `Eerst ${a} × ${b} = ${a * b}, dan ${a * b} − ${opgegeten} = ${a * b - opgegeten}.` }
}
const restV = (zwaar, groot = zwaar) => {   // deelbaarheid: rest bij delen, in een verhaal
  if (Math.random() < 0.5) return deelbaarJaNeeV(zwaar)
  const deler = pick(zwaar ? [3, 8, 9] : [2, 4, 5, 10]), q = rnd(3, groot ? 39 : 19), rest = rnd(0, deler - 1), n = deler * q + rest
  const nm = naam(), d = ding()
  return { vraag: `${nm} heeft ${n} ${d[1]} en legt ze in groepjes van ${deler}. Hoeveel ${d[1]} houdt ${nm} over?`, kaal: `${n} : ${deler} — hoeveel blijft er over?`, antwoord: rest, eenheid: d[1], uitleg: `${n} : ${deler} = ${q} met rest ${rest}. Er ${rest === 1 ? `blijft 1 ${d[0]}` : `blijven ${rest} ${d[1]}`} over.` }
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
const kommaDeelV = (zwaar) => {   // delen met benoemde kommagetallen
  const deler = zwaar ? rnd(3, 9) : rnd(2, 6), per = zwaar ? rnd(305, 999) / 100 : rnd(15, 60) / 10, totaal = +(per * deler).toFixed(2)
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
  return { vraag: `${nm} heeft ${n} euro gespaard. Tussen welke twee honderdtallen ligt dat bedrag? Geef het kleinste honderdtal.`, kaal: `${n} ligt tussen … en ${laag + 100}`, antwoord: laag, eenheid: '€', uitleg: `${n} ligt tussen ${laag} en ${laag + 100}.` }
}
const wisselV = () => {
  const prijs = rnd(150, 4500) / 100, betaald = Math.ceil(prijs / 5) * 5, n = naam()
  return { vraag: `Iets kost ${euro(prijs)}. ${n} betaalt met ${euro(betaald)}. Hoeveel geld krijgt ${n} terug?`, kaal: `${euro(betaald)} − ${euro(prijs)} =`, antwoord: +(betaald - prijs).toFixed(2), eenheid: '€', uitleg: `${euro(betaald)} − ${euro(prijs)} = ${euro(betaald - prijs)}` }
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
const maatGewichtV = (soort) => {
  if (soort === 'prijs') return prijsGewichtV()
  const varianten = [
    () => { const kg = rnd(1, 9), g = rnd(50, 950); return { k: `${kg} kg en ${g} g = … g`, v: `${naam()} zet de schooltas op de weegschaal: ${kg} kg en ${g} g. Hoeveel gram is dat samen?`, a: kg * 1000 + g, e: 'g', u: `${kg} kg = ${getal(kg * 1000)} g. ${getal(kg * 1000)} + ${g} = ${getal(kg * 1000 + g)} g` } },
    () => { const g = pick([250, 500, 750]), n = rnd(3, 8), tot = g * n; return { k: `${n} × ${g} g = … kg`, v: `Voor het bakproject haalt de klas ${n} pakken meel van ${g} gram. Hoeveel kilogram meel is dat samen?`, a: tot / 1000, e: 'kg', u: `${n} × ${g} g = ${tot} g = ${komma(tot / 1000)} kg` } },
  ]
  const variant = (soort === 'samen' ? varianten[0] : soort === 'pakken' ? varianten[1] : pick(varianten))()
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
const kommaVermV = () => { const a = (rnd(1, 4) * 10 + rnd(1, 9)) / 10, b = (rnd(1, 4) * 10 + rnd(1, 9)) / 10, ant = +(a * b).toFixed(2), n = naam(); return { vraag: `${n} laat bij de stoffenwinkel een lap afknippen voor een verkleedpak. De stof kost ${euro(a)} per meter en ${n} heeft ${komma(b)} meter nodig. Hoeveel moet ${n} betalen? (eerst schatten, dan precies uitrekenen)`, kaal: `${komma(b)} × ${komma(a)} =`, antwoord: ant, eenheid: '€', uitleg: `${komma(b)} × ${euro(a)} = ${euro(ant)}` } }
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
const breukDeelV = (zwaar) => { if (Math.random() < 0.5) { const [a, b, n] = pick(zwaar ? [[3, 4, 8], [2, 3, 6], [3, 4, 12], [5, 6, 12], [2, 3, 9]] : [[2, 3, 6], [1, 2, 4], [3, 4, 8], [1, 2, 6], [1, 3, 6]]), q = a * n / b; return { kaal: `${a}/${b} : 1/${n} =`, vraag: `In een kan zit ${a}/${b} liter sap. Hoeveel glaasjes van 1/${n} liter kun je ermee vullen?`, antwoord: q, eenheid: 'glaasjes', uitleg: `${a}/${b} = ${q}/${n}. ${q}/${n} : 1/${n} = ${q}` } } const n = pick(zwaar ? [4, 5, 6, 8] : [2, 3, 4, 5]), m = rnd(2, zwaar ? 12 : 6); return { kaal: `${m} : 1/${n} =`, vraag: `Hoeveel glazen van 1/${n} liter kun je vullen uit ${m} liter?`, antwoord: m * n, eenheid: 'glazen', uitleg: `${m} : 1/${n} = ${m} × ${n} = ${m * n}` } }
const cirkelV = (soort) => { const r = pick([2, 3, 4, 5, 10]), nm = naam(); if (soort === 'omtrek' || (!soort && Math.random() < 0.5)) return { figuur: { type: 'cirkelr', r }, kaal: `Omtrek van een cirkel met straal ${r} cm? (π ≈ 3,14)`, vraag: `${nm} maakt een rond kleedje met een straal van ${r} cm en wil er een lint omheen plakken. Hoeveel cm lint is dat (de omtrek)? (gebruik π ≈ 3,14)`, antwoord: +(2 * 3.14 * r).toFixed(2), eenheid: 'cm', uitleg: `omtrek = 2 × π × r = 2 × 3,14 × ${r} = ${komma(+(2 * 3.14 * r).toFixed(2))} cm` }; return { figuur: { type: 'cirkelr', r }, kaal: `Oppervlakte van een cirkel met straal ${r} cm? (π ≈ 3,14)`, vraag: `${nm} maakt een ronde tafel met een straal van ${r} cm. Bereken de oppervlakte van het tafelblad. (gebruik π ≈ 3,14)`, antwoord: +(3.14 * r * r).toFixed(2), eenheid: 'cm²', uitleg: `oppervlakte = π × r × r = 3,14 × ${r} × ${r} = ${komma(+(3.14 * r * r).toFixed(2))} cm²` } }
const ROMEINS = [['IV', 4], ['VI', 6], ['IX', 9], ['XI', 11], ['XIII', 13], ['XIV', 14], ['XIX', 19], ['XXII', 22], ['XXV', 25], ['XL', 40], ['L', 50]]
const romeinsV = (soort) => { if (soort === 'romeins' || (!soort && Math.random() < 0.5)) { const [r, n] = pick(ROMEINS); return { kaal: `${r} = …`, vraag: `Op een oud gebouw staat het bouwjaar met het Romeinse getal ${r}. Welk gewoon getal is dat?`, antwoord: n, uitleg: `${r} = ${n}` } } const a = rnd(2, 9), b = rnd(1, 9); return { figuur: { type: 'thermo', t: a }, kaal: `${a} − ${a + b} =`, vraag: `Het is ${a} graden buiten (zie de thermometer). Het wordt ${a + b} graden kouder. Hoeveel graden staat de thermometer dan aan?`, antwoord: -b, eenheid: '°', uitleg: `${a} − ${a + b} = −${b} graden` } }
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
  { e: 'm', min: 1, max: 2, zin: (n) => `${n} wordt gemeten langs de meetlat op de deurpost. De pijl staat bij de lengte van ${n}. Hoe lang is ${n} in meter?` },
  { e: 'km', min: 1, max: 8, zin: (n) => `${n} kijkt tijdens het hardlopen op de app van het sporthorloge. De pijl laat zien hoe ver ${n} al is. Hoeveel kilometer is dat?` },
]
const kommaLijnV = (dieptes = [1, 2, 2, 3]) => {
  const c = pick(KOMMA_LIJN)
  const diepte = pick(dieptes)          // tienden, honderdsten, duizendsten
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

// ── Groep 7 blok 2, naar het werkblad uit de klas ───────────────────────────
// Zelfde soort sommen als op het extra-oefenenblad: bij cijferen staat de
// tiener onderaan ("keer de som om als dat handig is"), splitsen schrijf je als
// 10 × 47 + 3 × 47, verhalen vragen "welke som hoort erbij?", kommagetallen
// komen met én zonder maat, en schaal gaat via schaallijntje en
// verhoudingstabel. Alleen de getallen verschillen per kind.
const geenTiental = (min, max) => { let n; do n = rnd(min, max); while (n % 10 === 0); return n }
// Zoals Pluspunt: onder de 10.000 zonder punt (3700, 8100 : 90).
const pp = n => (Math.abs(n) < 10000 ? String(Math.round(n * 1000) / 1000).replace('.', ',') : getal(n))
const heleEuro = n => `€ ${pp(n)},-`
const SCHOLEN = ['De Vlinder', 'Het Anker', 'De Wilgen', 'De Horizon', 'De Regenboog', 'De Ster']
const UITJES = ['de bioscoop', 'de dierentuin', 'het zwembad', 'het museum', 'de klimhal', 'het pretpark']
const ABOS = ['telefoonabonnement', 'abonnement op de sportschool', 'abonnement op een streamingdienst', 'krantenabonnement']

// Cijferen zoals in de klas: eerst de eenheden van het onderste getal, dan
// eerst een 0 opschrijven en de tientallen erbij.
const cijferUitleg = (boven, onder) => {
  const e = onder % 10, t = onder - e
  if (!t) return `${onder} × ${pp(boven)} = ${pp(boven * onder)}`
  return `${e} × ${boven} = ${pp(e * boven)}. Eerst een 0 opschrijven, want ${t} × ${boven} = ${pp(t * boven)}. `
    + `${pp(e * boven)} + ${pp(t * boven)} = ${pp(boven * onder)}`
}
// Alleen bij een kale som te zien: in een verhaal moet het kind de som zelf vinden.
const cijferFiguur = (boven, onder) => ({ type: 'cijferend', alleenKaal: true, rijen: [{ t: boven }, { t: onder, op: '×' }] })

const kaartjesZin = (prijs, n) => {
  const uitje = pick(UITJES)
  return `Een kaartje voor ${uitje} kost ${heleEuro(prijs)}. Basisschool ${pick(SCHOLEN)} gaat met ${n} personen naar ${uitje}. Hoeveel kost dat?`
}
const aboZin = (prijs, jaar) => `${naam()} heeft een ${pick(ABOS)} van ${heleEuro(prijs)} per maand. Het loopt ${jaar} jaar. Hoeveel kost dat bij elkaar?`

// Doel 1, les 1: tiener × tweecijferig, soms met de tiener voorop zodat het
// kind zelf moet omkeren.
const tienerKeerV = (plus) => {
  const verhaal = rnd(1, 3)
  const t = verhaal === 2 ? 12 : geenTiental(11, 19), b = geenTiental(plus ? 41 : 21, 99)
  const vraag = verhaal === 1 ? kaartjesZin(t, b) : verhaal === 2 ? aboZin(b, 1) : pick(KEER_KLEIN)(t, b)
  const omkeren = Math.random() < 0.4
  return { vraag, kaal: omkeren ? `${b} × ${t} =` : `${t} × ${b} =`, antwoord: t * b,
           uitleg: (omkeren ? `Keer de som om, dan staat de tiener onderaan: ${t} × ${b}. ` : '') + cijferUitleg(b, t) }
}
// Doel 1, les 2: de strategie splitsen, opgeschreven zoals in de hulp.
const splitsKeerV = () => {
  const t = geenTiental(11, 19), b = geenTiental(21, 99), e = t - 10
  return { vraag: Math.random() < 0.5 ? kaartjesZin(t, b) : pick(KEER_KLEIN)(t, b),
           kaal: `${t} × ${b} = 10 × ${b} + ${e} × ${b} =`, antwoord: t * b,
           uitleg: `${t} × ${b} = 10 × ${b} + ${e} × ${b} = ${10 * b} + ${e * b} = ${pp(t * b)}` }
}
// S+: een rekenverhaal in stappen (personen × prijs per persoon + de bus).
const schoolreisV = () => {
  const k = rnd(38, 64), bg = rnd(4, 9), kaartje = rnd(9, 14), snack = rnd(2, 5), bus = rnd(60, 120) * 5
  const n = k + bg, per = kaartje + snack, tot = n * per + bus
  return { vraag: `Groep 7 en 8 van basisschool ${pick(SCHOLEN)} gaan op schoolreisje naar ${pick(UITJES)}. Er gaan ${k} kinderen en ${bg} begeleiders mee. De bus kost ${heleEuro(bus)} voor de hele dag. Iedereen betaalt ${heleEuro(kaartje)} entree en krijgt een snack van ${heleEuro(snack)}. Wat kost het schoolreisje?`,
           kaal: `(${k} + ${bg}) × (${kaartje} + ${snack}) + ${bus} =`, antwoord: tot,
           uitleg: `${k} + ${bg} = ${n} personen. Per persoon € ${kaartje} + € ${snack} = € ${per}. ${n} × € ${per} = € ${pp(n * per)}. Met de bus erbij: € ${pp(n * per)} + € ${bus} = € ${pp(tot)}.` }
}

// Doel 2: tweecijferig × tweecijferig, cijferend onder elkaar.
const tweeKeerV = (bMin, oMin, oMax) => {
  if (Math.random() < 0.35) {
    const jaar = pick([2, 3]), prijs = geenTiental(21, 99)
    return { vraag: aboZin(prijs, jaar), kaal: `${prijs} × ${12 * jaar} =`, antwoord: prijs * 12 * jaar,
             figuur: cijferFiguur(prijs, 12 * jaar), uitleg: `${jaar} jaar = ${12 * jaar} maanden. ` + cijferUitleg(prijs, 12 * jaar) }
  }
  const boven = geenTiental(bMin, 99), onder = geenTiental(oMin, oMax)
  return { vraag: pick(KEER_KLEIN)(onder, boven), kaal: `${boven} × ${onder} =`, antwoord: boven * onder,
           figuur: cijferFiguur(boven, onder), uitleg: cijferUitleg(boven, onder) }
}
// S+: wat staat er onder de vlek? De hele uitwerking staat er, op één getal na.
const vlekV = () => {
  const boven = geenTiental(21, 99), onder = geenTiental(21, 59), e = onder % 10, t = onder - e
  const vlek = rnd(0, 1)
  const uitleg = vlek === 0
    ? `${e} × ? = ${pp(e * boven)}, dus ? = ${pp(e * boven)} : ${e} = ${boven}. Controle: ${t} × ${boven} = ${pp(t * boven)}.`
    : `De eerste regel is ${pp(e * boven)} = ${e} × ${boven}, de tweede ${pp(t * boven)} = ${t} × ${boven}. Onder de vlek staat ${onder}.`
  return { vraag: `${naam()} heeft deze som cijferend uitgerekend, maar er is een vlek op het blad gekomen. Welk getal staat er onder de vlek?`,
           kaal: 'Welk getal staat er onder de vlek?', antwoord: vlek === 0 ? boven : onder, uitleg,
           figuur: { type: 'cijferend', vlek, rijen: [{ t: boven }, { t: onder, op: '×' }, { t: e * boven }, { t: t * boven, op: '+' }, { t: boven * onder }] } }
}
// FS: herhaling 6 × 346, cijferend of kolomsgewijs.
const drieKeerV = () => {
  const boven = rnd(110, 590), onder = rnd(3, 9)
  const h = Math.floor(boven / 100) * 100, tt = Math.floor(boven % 100 / 10) * 10, e = boven % 10
  return { vraag: pick(KEER_KLEIN)(onder, boven), kaal: `${boven} × ${onder} =`, antwoord: boven * onder,
           figuur: cijferFiguur(boven, onder),
           uitleg: `Kolomsgewijs: ${onder} × ${h} = ${pp(onder * h)}, ${onder} × ${tt} = ${onder * tt}, ${onder} × ${e} = ${onder * e}. Samen ${pp(boven * onder)}.` }
}

// Doel 3: hoofdrekenen met kommagetallen, met en zonder maat. Alles rekent
// in duizendsten, zodat er geen afrondfoutjes in de getallen sluipen.
const kf = (n, dec) => NF_DEC[dec].format(n / 1000)
const kommaPaar = (plus) => {
  const soort = plus ? pick(['een', 'twee', 'twee', 'drie', 'mix']) : pick(['een', 'twee', 'twee'])
  if (soort === 'een') return { a: rnd(12, 89) * 100, b: rnd(5, 49) * 100, da: 1, db: 1 }
  if (soort === 'twee') return { a: rnd(20, 179) * 50, b: rnd(5, 99) * 50, da: 2, db: 2 }
  if (soort === 'drie') return { a: rnd(20, 179) * 50, b: rnd(3, 99) * 50, da: 3, db: 3 }
  let b; do b = rnd(101, 499) * 10; while ((b / 10) % 10 === 0)
  return Math.random() < 0.5 ? { a: rnd(30, 89) * 100, b, da: 1, db: 2 } : { a: b + rnd(20, 60) * 100, b: rnd(5, 29) * 100, da: 2, db: 1 }
}
const KOMMA_PLUS = {
  km: (n, A, B) => `${n} fietst eerst ${A} km naar de sporthal en daarna nog ${B} km door naar opa en oma. Hoeveel kilometer fietst ${n} in totaal?`,
  l:  (n, A, B) => `In een emmer zit ${A} l water. ${n} giet er nog ${B} l bij. Hoeveel liter zit er nu in de emmer?`,
  m:  (n, A, B) => `${n} legt twee planken achter elkaar: een van ${A} m en een van ${B} m. Hoe lang is dat samen?`,
  kg: (n, A, B) => `${n} koopt op de markt ${A} kg appels en ${B} kg peren. Hoeveel kilo fruit is dat samen?`,
}
const KOMMA_MIN = {
  km: (n, A, B) => `${n} fietst ${A} km naar school. Na ${B} km moet ${n} wachten bij de brug. Hoe ver moet ${n} dan nog fietsen?`,
  l:  (n, A, B) => `In een emmer zit ${A} l water. ${n} giet er ${B} l van in de gieter. Hoeveel liter zit er nog in de emmer?`,
  m:  (n, A, B) => `${n} heeft een rol lint van ${A} m en knipt er ${B} m af voor een cadeau. Hoeveel meter lint is er nog over?`,
  kg: (n, A, B) => `Een zak aardappels weegt ${A} kg. ${n} kookt er ${B} kg van. Hoeveel kilo aardappels zit er nog in de zak?`,
}
const kommaPlusMinV = (plus, soort) => {
  let { a, b, da, db } = kommaPaar(plus)
  if (soort === 'min' && b >= a) { a += b; da = Math.max(da, db) }
  const d = Math.max(da, db), uit = soort === 'plus' ? a + b : a - b, op = soort === 'plus' ? '+' : '−'
  const heel = Math.floor(b / 1000) * 1000, rest = b - heel
  const tussen = soort === 'plus' ? a + heel : a - heel
  // Het verhaal heeft altijd een maat; de kale som soms niet (onbenoemd).
  const maat = pick(['km', 'l', 'm', 'kg']), benoemd = Math.random() < 0.6, m = benoemd ? ` ${maat}` : ''
  const uitleg = heel && rest
    ? `Rijgen: ${kf(a, da)} ${op} ${heel / 1000} = ${kf(tussen, d)}, en ${kf(tussen, d)} ${op} ${kf(rest, db)} = ${kf(uit, d)}${m}.`
    : `${kf(a, da)} ${op} ${kf(b, db)} = ${kf(uit, d)}${m}`
  const A = kf(a, da), B = kf(b, db), n = naam()
  return { vraag: (soort === 'plus' ? KOMMA_PLUS : KOMMA_MIN)[maat](n, A, B), kaal: `${A}${m} ${op} ${B}${m} =`,
           antwoord: uit / 1000, eenheid: benoemd ? (maat === 'l' ? 'liter' : maat) : undefined, uitleg }
}
// Samen een rond getal: aanvullen tot 2, 3, 4, 5, 6 of 10.
const samenRondV = (plus) => {
  const T = pick([2, 3, 4, 5, 6, 10]), dec = plus ? 2 : 1
  const a = plus ? rnd(1, T * 20 - 1) * 50 : rnd(1, T * 10 - 1) * 100, b = T * 1000 - a
  const heel = Math.ceil(a / 1000) * 1000, stap1 = heel - a, stap2 = T * 1000 - heel
  const maat = pick(['l', 'm', 'kg']), A = kf(a, dec), n = naam()
  const vraag = maat === 'l' ? `In een jerrycan van ${T} liter zit al ${A} l water. Hoeveel liter moet er nog bij om samen ${T} liter te hebben?`
    : maat === 'm' ? `${n} heeft een touw van ${A} m. Hoeveel meter moet er nog aan vast om samen precies ${T} m te hebben?`
    : `Op de weegschaal ligt ${A} kg aardappels. Hoeveel kilo moet er nog bij om samen ${T} kg te hebben?`
  return { vraag, kaal: `${A} ${maat} + … = ${T} ${maat}`, antwoord: b / 1000, eenheid: maat === 'l' ? 'liter' : maat,
           uitleg: stap1 && stap2
             ? `Aanvullen: ${A} + ${kf(stap1, dec)} = ${heel / 1000}, en ${heel / 1000} + ${stap2 / 1000} = ${T}. Samen ${kf(b, dec)} ${maat}.`
             : `${A} + ${kf(b, dec)} = ${T}, dus ${kf(b, dec)} ${maat}.` }
}
// S+: grootste en kleinste getal met 1 cijfer achter de komma, en het verschil.
const grootsteKleinsteV = () => {
  const c = []; while (c.length < 3) { const x = rnd(1, 9); if (!c.includes(x)) c.push(x) }
  const [x, y, z] = [...c].sort((p, q) => p - q), G = z * 100 + y * 10 + x, K = x * 100 + y * 10 + z
  return { vraag: `${naam()} krijgt drie kaartjes met de cijfers ${c.join(', ')}. Daarmee maak je het grootste en het kleinste getal met 1 cijfer achter de komma. Wat is het verschil tussen die twee getallen?`,
           kaal: `Cijfers ${c.join(', ')}: grootste getal − kleinste getal (1 cijfer achter de komma) =`, antwoord: (G - K) / 10,
           uitleg: `Grootste: ${kf(G * 100, 1)}. Kleinste: ${kf(K * 100, 1)}. ${kf(G * 100, 1)} − ${kf(K * 100, 1)} = ${kf((G - K) * 100, 1)}.` }
}

// Doel 4: schaal met schaallijntje en verhoudingstabel, in centimeters.
const SCHALEN = [20, 25, 40, 50, 60, 80, 100, 200, 250, 300, 400, 500]
const SCHAAL_DINGEN = [
  { wat: 'de schutting', maat: 'lang', m: [8, 10, 12, 15, 16, 20, 24] },
  { wat: 'de flat', maat: 'hoog', m: [15, 18, 20, 24, 30, 36] },
  { wat: 'de vlaggenstok', maat: 'lang', m: [6, 8, 9, 10, 12] },
  { wat: 'de bus', maat: 'lang', m: [10, 12, 15] },
  { wat: 'het klaslokaal', maat: 'lang', m: [7, 8, 9, 10, 12] },
  { wat: 'het zwembad', maat: 'lang', m: [25, 50] },
  { wat: 'de boom', maat: 'hoog', m: [6, 9, 12, 15, 18] },
  { wat: 'de winkel', maat: 'breed', m: [10, 12, 16, 20] },
]
const RUIMTES = ['de slaapkamer', 'het klaslokaal', 'de schuur', 'de keuken', 'de woonkamer']
const schaalTabel = (N, tekening, echt) => ({ type: 'schaal', N, tabel: [['in de tekening (cm)', ...tekening], ['in het echt (cm)', ...echt]] })
const schaalBlok2V = (k) => {
  if (k === 2) {   // van het echt naar de tekening
    const N = pick([20, 25, 40, 50, 60, 80, 100]); let c, L
    do { c = rnd(4, 24) / 2; L = c * N / 100 } while (L < 2)
    const Lf = kf(L * 1000, 2), ruimte = pick(RUIMTES)
    return { vraag: `${naam()} tekent een plattegrond van ${ruimte} op schaal 1 : ${N}. Eén muur is in het echt ${Lf} m lang. Hoeveel cm wordt die muur in de tekening?`,
             kaal: `Schaal 1 : ${N}. In het echt ${Lf} m. In de tekening … cm?`, antwoord: c, eenheid: 'cm',
             figuur: schaalTabel(N, ['1', '?'], [pp(N), pp(L * 100)]),
             uitleg: `${Lf} m = ${pp(L * 100)} cm. 1 cm in de tekening is ${N} cm in het echt. ${pp(L * 100)} : ${N} = ${komma(c)} cm.` }
  }
  let d, L, N, c
  do { d = pick(SCHAAL_DINGEN); L = pick(d.m); N = pick(SCHALEN); c = L * 100 / N } while (c < 2 || c > 12 || !Number.isInteger(c * 2))
  if (k === 1) {   // van de tekening naar het echt
    return { vraag: `Op een tekening met schaal 1 : ${N} is ${d.wat} ${komma(c)} cm ${d.maat}. Hoeveel meter is ${d.wat} in het echt?`,
             kaal: `Schaal 1 : ${N}. In de tekening ${komma(c)} cm. In het echt … m?`, antwoord: L, eenheid: 'm',
             figuur: schaalTabel(N, ['1', komma(c)], [pp(N), '?']),
             uitleg: `1 cm in de tekening is ${N} cm in het echt. ${komma(c)} × ${N} = ${pp(L * 100)} cm = ${L} m.` }
  }
  return { vraag: `In een tekening is ${d.wat} ${komma(c)} cm ${d.maat}. In het echt is ${d.wat} ${L} m ${d.maat}. Wat is de schaal? 1 : …`,
           kaal: `${komma(c)} cm in de tekening is ${L} m in het echt. Schaal 1 : …?`, antwoord: N,
           figuur: schaalTabel(null, [komma(c), '1'], [pp(L * 100), '?']),
           uitleg: `${L} m = ${pp(L * 100)} cm. ${pp(L * 100)} : ${komma(c)} = ${N}. Dus 1 cm is ${N} cm in het echt: schaal 1 : ${N}.` }
}

// ── Groep 7 instap, naar het werkblad uit de klas ──────────────────────────
// Schatten met geld en ronde getallen, 4 × 536 cijferend of kolomsgewijs,
// kommagetallen tot duizendsten vergelijken en ordenen, en lijn- en
// beelddiagrammen aflezen.

// Schatten met geld: de prijs ligt vlak bij een hele euro, zodat afronden
// maar één kant op kan (€ 2,95 ≈ € 3,-).
const SCHAT_SPULLEN = [['stickervel', 'stickervellen'], ['stripboek', 'stripboeken'], ['speelgoedauto', 'speelgoedauto’s'],
  ['zak appels', 'zakken appels'], ['bak aardbeien', 'bakken aardbeien'], ['tros bananen', 'trossen bananen'], ['doos ijsjes', 'dozen ijsjes']]
const schatGeldV = (plus) => {
  const [een, meer] = pick(SCHAT_SPULLEN), heel = rnd(1, plus ? 9 : 5), n = naam()
  const prijs = (heel * 100 + rnd(1, 20) * (heel > 1 && Math.random() < 0.6 ? -1 : 1)) / 100
  if (Math.random() < 0.5) {
    const aantal = rnd(3, 10)
    return { vraag: `${n} wil ${aantal} ${meer} kopen. Eén ${een} kost ${euro(prijs)}. Hoeveel euro is dat ongeveer? Rond de prijs af op hele euro’s.`,
             kaal: `${aantal} × ${euro(prijs)} ≈ (in hele euro’s)`, antwoord: aantal * heel, eenheid: '€',
             uitleg: `${euro(prijs)} ≈ € ${heel},-. Ik reken: ${aantal} × ${heel} = ${aantal * heel}. Ongeveer € ${aantal * heel},- (precies ${euro(aantal * prijs)}).` }
  }
  const q = rnd(3, 10), bedrag = heel * q
  return { vraag: `${n} heeft € ${bedrag},- en ziet een ${een} van ${euro(prijs)}. Hoeveel ${meer} kan ${n} daarvan ongeveer kopen?`,
           kaal: `€ ${bedrag},- : ${euro(prijs)} ≈`, antwoord: q,
           uitleg: `${euro(prijs)} ≈ € ${heel},-. Ik reken: ${bedrag} : ${heel} = ${q}. Dus ongeveer ${q} ${meer}.` }
}
// Schatten met ronde getallen: 18 × 580 ≈ 20 × 600, en 1540 : 32 ≈ 1500 : 30.
const bijRond = (R, max) => R + rnd(1, max) * (Math.random() < 0.5 ? -1 : 1)
const SCHAT_KEER = [
  (a, b) => `Een tuin is ${a} meter lang en ${b} meter breed. Hoeveel vierkante meter is de tuin ongeveer?`,
  (a, b) => `In de schouwburg zijn ${a} rijen met elk ${b} stoelen. Voor hoeveel mensen is er ongeveer plek?`,
  (a, b) => `Een bakkerij bakt elke dag ${b} broodjes. Hoeveel broodjes zijn dat ongeveer in ${a} dagen?`,
]
const schatKeerV = (plus) => {
  const k1 = rnd(2, 9), k2 = rnd(2, 9), groot = plus && Math.random() < 0.5
  const R1 = k1 * 10, R2 = k2 * (groot ? 100 : 10), a = bijRond(R1, 3), b = bijRond(R2, groot ? 30 : 3)
  return { vraag: pick(SCHAT_KEER)(a, b), kaal: `Schat: ${a} × ${b} ≈`, antwoord: R1 * R2,
           uitleg: `Ik reken met ronde getallen: ${R1} × ${R2} = ${pp(R1 * R2)} (kleine som ${k1} × ${k2} = ${k1 * k2}).` }
}
const SCHAT_DEEL = [
  (t, d) => `In een parkeergarage staan ${pp(t)} auto’s. Er staan ${d} auto’s op een rij. Hoeveel rijen heeft de garage ongeveer?`,
  (t, d) => `Een boer heeft ${pp(t)} eieren en doet ze in dozen van ${d} stuks. Hoeveel dozen heeft de boer ongeveer nodig?`,
  (t, d) => `De school krijgt € ${pp(t)},- en verdeelt dat over ${d} klassen. Hoeveel euro krijgt elke klas ongeveer?`,
]
const schatDeelV = (plus) => {
  let d, q, x, y, T
  do { d = rnd(2, 9); q = rnd(2, 9); y = plus ? rnd(1, 2) : 1; x = rnd(y, y + 2); T = d * q * 10 ** x } while (T < 200 || T > 90000)
  const D = d * 10 ** y, ant = q * 10 ** (x - y)
  const deler = bijRond(D, y === 1 ? 3 : 9), totaal = T + rnd(1, Math.max(2, Math.floor(T / 60))) * (Math.random() < 0.5 ? -1 : 1)
  return { vraag: pick(SCHAT_DEEL)(totaal, deler), kaal: `Schat: ${pp(totaal)} : ${deler} ≈`, antwoord: ant,
           uitleg: `Ik reken met handige getallen: ${pp(T)} : ${D} = ${pp(ant)} (kleine som ${d * q} : ${d} = ${q}).` }
}

// 4 × 536: cijferen met de stappen uit de hulp, of kolomsgewijs.
const cijferStappen = (boven, onder) => {
  const cijfers = String(boven).split('').reverse().map(Number), namen = ['eenheden', 'tientallen', 'honderdtallen']
  let onth = 0
  const stappen = cijfers.map((c, i) => {
    const p = onder * c, tot = p + onth, laatste = i === cijfers.length - 1
    const tekst = `${namen[i]}: ${onder} × ${c} = ${p}${onth ? `, ${p} + ${onth} = ${tot}` : ''}`
      + (laatste ? '' : `, ${tot % 10} opschrijven${tot >= 10 ? ` en ${Math.floor(tot / 10)} onthouden` : ''}`)
    onth = Math.floor(tot / 10)
    return tekst
  })
  return `Achteraan beginnen. ${stappen.join('. ')}. Antwoord: ${pp(boven * onder)}.`
}
const kolomUitleg = (boven, onder) => {
  const delen = [Math.floor(boven / 100) * 100, Math.floor(boven % 100 / 10) * 10, boven % 10].filter(Boolean)
  return `Kolomsgewijs: ${delen.map(x => `${onder} × ${x} = ${pp(onder * x)}`).join(', ')}. Samen ${pp(boven * onder)}.`
}
const PER_STUK = [
  (n, p) => `Een vliegreis kost ${heleEuro(p)} per persoon. De familie van ${naam()} boekt voor ${n} personen. Hoeveel moeten ze betalen?`,
  (n, p) => `Een nieuwe fiets kost ${heleEuro(p)}. De fietsenmaker verkoopt er vandaag ${n}. Hoeveel euro krijgt de winkel daarvoor?`,
  (n, p) => `Een zomerkamp van een week kost ${heleEuro(p)} per kind. Uit de straat van ${naam()} gaan ${n} kinderen mee. Hoeveel kost dat samen?`,
  (n, p) => `Een vrachtwagen rijdt elke dag ${p} kilometer. Hoeveel kilometer rijdt de vrachtwagen in ${n} dagen?`,
  (n, p) => `In een doos zitten ${p} knikkers. ${naam()} koopt ${n} van die dozen voor de klas. Hoeveel knikkers zijn dat?`,
]
const drieCijfers = () => { let b; do b = rnd(112, 989); while (b % 10 === 0 || b % 100 < 10); return b }
const cijferKeer3V = (soort) => {
  const boven = drieCijfers(), onder = rnd(3, 9)
  return { vraag: pick(PER_STUK)(onder, boven),
           kaal: `${boven} × ${onder} =`, antwoord: boven * onder, figuur: cijferFiguur(boven, onder),
           uitleg: soort === 'kolom' ? kolomUitleg(boven, onder) : cijferStappen(boven, onder) }
}
const vlek3V = () => {
  const boven = drieCijfers(), onder = rnd(3, 9), vlek = rnd(0, 1)
  return { vraag: `${naam()} heeft deze som cijferend uitgerekend, maar er is een vlek op het blad gekomen. Welk getal staat er onder de vlek?`,
           kaal: 'Welk getal staat er onder de vlek?', antwoord: vlek ? onder : boven,
           figuur: { type: 'cijferend', vlek, rijen: [{ t: boven }, { t: onder, op: '×' }, { t: boven * onder }] },
           uitleg: vlek ? `${pp(boven * onder)} : ${boven} = ${onder}.` : `${pp(boven * onder)} : ${onder} = ${boven}.` }
}
const grootsteSomV = () => {
  const c = []; while (c.length < 4) { const x = rnd(2, 9); if (!c.includes(x)) c.push(x) }
  const groot = Math.random() < 0.5, opties = []
  for (const d of c) {
    const rest = c.filter(x => x !== d)
    for (const p of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
      const b = rest[p[0]] * 100 + rest[p[1]] * 10 + rest[p[2]]
      opties.push([b, d, b * d])
    }
  }
  opties.sort((p, q) => (groot ? q[2] - p[2] : p[2] - q[2]))
  const [b, d, uit] = opties[0], w = groot ? 'grootste' : 'kleinste'
  return { vraag: `${naam()} krijgt kaartjes met de cijfers ${c.join(', ')}. Maak daarmee een keersom van drie cijfers keer één cijfer, met de ${w} uitkomst. Wat is die uitkomst?`,
           kaal: `Cijfers ${c.join(', ')}: ${w} uitkomst van drie cijfers × één cijfer =`, antwoord: uit,
           uitleg: `De ${w} som is ${b} × ${d} = ${pp(uit)}.` }
}

// Kommagetallen tot duizendsten vergelijken en ordenen. Alles in duizendsten,
// met het aantal decimalen zoals het er staat (35,3 en 35,03). Het antwoord
// is het getal zelf als tekst, zodat 6,169 niet goed wordt gerekend bij 6,17.
const kommaTekst = ([n, dec]) => kf(n, dec)
const kommaParen = (W) => {
  const a = rnd(1, 9), b = rnd(1, 9), ab = rnd(11, 99), c = rnd(1, 9), w = W * 1000
  return pick([
    [[w + a * 10, 2], [w + a * 100, 1]],                                  // 35,03 of 35,3
    [[w + a * 10, 2], [w + a * 100 + (b === a ? 0 : b * 10), 2]],         // 8,09 of 8,90
    [[w + ab * 10, 2], [w + ab * 10 - 1, 3]],                             // 6,17 of 6,169
    [[w + ab * 10 + c, 3], [w + ab * 10, 2]],                             // 27,142 of 27,14
    [[w + a, 3], [w + a * 10, 2]],                                        // 6,005 of 6,05
    [[w + ab * 10, 2], [w + (ab % 10 === 9 ? ab - 1 : ab + 1) * 10, 2]],  // 4,23 of 4,21
  ]).sort(() => Math.random() - 0.5)
}
const MAAT_ZIN = {
  kg: (n, A, B) => `Bij de kaasboer liggen twee stukken kaas: een van ${A} kg en een van ${B} kg. Welk stuk is het zwaarst? Typ dat gewicht.`,
  m:  (n, A, B) => `Bij verspringen springt ${n} ${A} m en ${naam2(n)} ${B} m. Welke sprong is het verst? Typ die afstand.`,
  km: (n, A, B) => `${n} fietst op zaterdag ${A} km en op zondag ${B} km. Op welke dag fietst ${n} het verst? Typ die afstand.`,
}
const kommaGroterV = (plus) => {
  const [x, y] = kommaParen(plus ? rnd(0, 80) : rnd(0, 9)), groot = x[0] > y[0] ? x : y, maat = pick(['kg', 'm', 'km'])
  return { vraag: MAAT_ZIN[maat](naam(), kommaTekst(x), kommaTekst(y)), kaal: `Welk getal is groter: ${kommaTekst(x)} of ${kommaTekst(y)}?`,
           antwoord: kommaTekst(groot), opties: [kommaTekst(x), kommaTekst(y)],
           uitleg: `Maak ze even lang en vergelijk cijfer voor cijfer: ${kf(x[0], 3)} en ${kf(y[0], 3)}. ${kommaTekst(groot)} is groter.` }
}
const dichtstbijV = () => {
  const t = rnd(0, 20) * 1000 + rnd(11, 99) * 10, dichtst = pick([1, 2]) * pick([-1, 1])
  const afw = [dichtst, ...[5, 10, 20, 40, 100].sort(() => Math.random() - 0.5).slice(0, 4).map(v => v * pick([-1, 1]))]
  const opties = afw.map(v => t + v).filter(v => v > 0).sort(() => Math.random() - 0.5)
  const toon = v => kf(v, v % 10 ? 3 : 2), n = naam()
  return { vraag: `${n} moet bij een spel zo dicht mogelijk bij ${kf(t, 2)} kg zand scheppen. De kinderen scheppen ${opties.map(v => toon(v) + ' kg').join(' – ')}. Welk gewicht ligt het dichtst bij ${kf(t, 2)} kg?`,
           kaal: `Welk getal ligt het dichtst bij ${kf(t, 2)}? Kies uit: ${opties.map(toon).join(' – ')}`, antwoord: toon(t + dichtst),
           uitleg: `${toon(t + dichtst)} scheelt maar ${kf(Math.abs(dichtst), 3)} met ${kf(t, 2)}. De andere getallen liggen verder weg.` }
}
const kommaOrdenenV = (plus) => {
  const W = plus ? rnd(0, 50) : rnd(0, 9), a = rnd(1, 9), b = rnd(1, 9), w = W * 1000
  const kandidaten = [[w + a * 100, 1], [w + a * 10, 2], [w + a * 100 + b * 10, 2], [w + a * 100 + b, 3], [w + b * 100 + a * 10, 2], [w + a, 3], [w + a * 100 + b * 10 + 5, 3]]
  const lijst = []
  for (const k of kandidaten.sort(() => Math.random() - 0.5)) if (lijst.length < 4 && !lijst.some(x => x[0] === k[0])) lijst.push(k)
  const klein = [...lijst].sort((p, q) => p[0] - q[0]), plek = rnd(1, 4), maat = pick(['kg', 'km', 'm', ''])
  const m = maat ? ` ${maat}` : '', tekst = lijst.map(x => kommaTekst(x) + m).join(' – '), licht = maat === 'kg'
  return { vraag: licht ? `Bij de kaasboer liggen vier stukken kaas: ${tekst}. Zet ze van licht naar zwaar. Welk gewicht staat op plek ${plek}?`
             : `Vier kinderen schrijven een getal op het bord: ${tekst}. Zet de getallen van klein naar groot. Welk getal staat op plek ${plek}?`,
           kaal: `${licht ? 'Van licht naar zwaar' : 'Van klein naar groot'}: ${tekst}. Wat staat op plek ${plek}?`, antwoord: kommaTekst(klein[plek - 1]),
           uitleg: `Maak ze even lang: ${lijst.map(x => kf(x[0], 3)).join(', ')}. Van klein naar groot: ${klein.map(x => kommaTekst(x) + m).join(' – ')}.` }
}

// Lijndiagram met de hoogste en laagste temperatuur, zoals op het werkblad.
const DAGEN = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const DAG_VOLUIT = { ma: 'maandag', di: 'dinsdag', wo: 'woensdag', do: 'donderdag', vr: 'vrijdag', za: 'zaterdag', zo: 'zondag' }
const tempV = () => {
  const hoog = [rnd(18, 30)]
  while (hoog.length < 7) hoog.push(Math.min(34, Math.max(12, hoog[hoog.length - 1] + rnd(-4, 4))))
  const laag = hoog.map(h => Math.max(2, h - rnd(6, 15)))
  const figuur = { type: 'temp', dagen: DAGEN, hoog, laag }, intro = 'Tijdens de vakantie houdt de klas de temperatuur bij in een lijndiagram.'
  const k = rnd(1, 5), i = rnd(0, 6), dag = DAG_VOLUIT[DAGEN[i]]
  if (k >= 4) {
    // Toetsvorm: op welke dag was het het warmst, of het verschil het grootst?
    const waarden = k === 4 ? hoog : hoog.map((h, d) => h - laag[d])
    const max = Math.max(...waarden)
    if (waarden.filter(v => v === max).length > 1) return tempV()
    const d = waarden.indexOf(max), juist = DAG_VOLUIT[DAGEN[d]]
    return { vraag: k === 4 ? `${intro} Op welke dag was de temperatuur deze week het hoogst?`
                            : `${intro} Op welke dag was het verschil tussen de hoogste en de laagste temperatuur het grootst?`,
             kaal: k === 4 ? 'Op welke dag was het het warmst?' : 'Op welke dag was het verschil het grootst?',
             opties: DAGEN.map(x => DAG_VOLUIT[x]), antwoord: juist, figuur,
             uitleg: k === 4 ? `De oranje lijn is het hoogst op ${juist}: ${max} °C.`
                             : `Het verschil is het grootst op ${juist}: ${hoog[d]} − ${laag[d]} = ${max} graden.` }
  }
  if (k === 1) {
    const welke = pick(['hoogste', 'laagste']), v = welke === 'hoogste' ? hoog[i] : laag[i]
    return { vraag: `${intro} Wat was de ${welke} temperatuur op ${dag}?`, kaal: `De ${welke} temperatuur op ${dag} = … °C`,
             antwoord: v, eenheid: '°C', figuur, uitleg: `Zoek ${DAGEN[i]} en ga omhoog naar de ${welke === 'hoogste' ? 'oranje' : 'blauwe'} lijn: ${v} °C.` }
  }
  if (k === 2) {
    return { vraag: `${intro} Hoeveel graden verschil was er op ${dag} tussen de hoogste en de laagste temperatuur?`,
             kaal: `Verschil hoogste en laagste op ${dag} = … °C`, antwoord: hoog[i] - laag[i], eenheid: '°C', figuur,
             uitleg: `Op ${dag}: ${hoog[i]} − ${laag[i]} = ${hoog[i] - laag[i]} graden.` }
  }
  const j = rnd(0, 5)
  if (hoog[j + 1] === hoog[j]) { hoog[j + 1] += 2; laag[j + 1] = Math.min(laag[j + 1], hoog[j + 1] - 6) }
  const w = hoog[j + 1] > hoog[j] ? 'steeg' : 'daalde', v = Math.abs(hoog[j + 1] - hoog[j])
  return { vraag: `${intro} Hoeveel graden ${w} de hoogste temperatuur van ${DAG_VOLUIT[DAGEN[j]]} naar ${DAG_VOLUIT[DAGEN[j + 1]]}?`,
           kaal: `De hoogste temperatuur ${w} van ${DAGEN[j]} naar ${DAGEN[j + 1]} met … °C`, antwoord: v, eenheid: '°C', figuur,
           uitleg: `${DAGEN[j]}: ${hoog[j]} °C, ${DAGEN[j + 1]}: ${hoog[j + 1]} °C. De lijn gaat ${w === 'steeg' ? 'omhoog' : 'omlaag'} met ${v} graden.` }
}
// Beelddiagram: één plaatje staat voor 10 (of 100), een half plaatje voor de helft.
const BEELD_SETS = [
  { titel: 'Geleende boeken in groep 6', rijen: ['januari', 'februari', 'maart'], soorten: ['leesboeken', 'informatieboeken'], per: 10, alles: 'boeken' },
  { titel: 'Honden en katten in het dierenpension', rijen: ['De Blafhoek', 'Het Mandje'], soorten: ['honden', 'katten'], per: 10, alles: 'dieren' },
  { titel: 'Boeken in de schoolbibliotheek', rijen: ['groep 1 en 2', 'groep 3, 4 en 5', 'groep 6, 7 en 8'], soorten: ['prentenboeken', 'leesboeken', 'informatieboeken'], per: 100, alles: 'boeken' },
]
const beeldV = () => {
  const set = pick(BEELD_SETS)
  const rijen = set.rijen.map(label => ({ label, n: set.soorten.map(() => rnd(1, 12) / 2) }))
  const figuur = { type: 'beeld', titel: set.titel, soorten: set.soorten, per: set.per, rijen }
  const aantal = (r, s) => rijen[r].n[s] * set.per, k = rnd(1, 3), r = rnd(0, rijen.length - 1), s = rnd(0, set.soorten.length - 1)
  const intro = `Kijk naar het beelddiagram "${set.titel}".`
  if (k === 1) {
    return { vraag: `${intro} Hoeveel ${set.soorten[s]} horen er bij ${rijen[r].label}?`, kaal: `Hoeveel ${set.soorten[s]} bij ${rijen[r].label}?`,
             antwoord: aantal(r, s), figuur,
             uitleg: `${komma(rijen[r].n[s])} plaatjes van ${set.per}: ${komma(rijen[r].n[s])} × ${set.per} = ${pp(aantal(r, s))}.${rijen[r].n[s] % 1 ? ` Een half plaatje is ${set.per / 2}.` : ''}` }
  }
  if (k === 2) {
    const tot = set.soorten.reduce((acc, _, i) => acc + aantal(r, i), 0)
    return { vraag: `${intro} Hoeveel ${set.alles} zijn er in totaal bij ${rijen[r].label}?`,
             kaal: `Hoeveel ${set.alles} in totaal bij ${rijen[r].label}?`, antwoord: tot, figuur,
             uitleg: `${set.soorten.map((x, i) => pp(aantal(r, i))).join(' + ')} = ${pp(tot)}.` }
  }
  const tot = rijen.reduce((acc, _, i) => acc + aantal(i, s), 0)
  return { vraag: `${intro} Hoeveel ${set.soorten[s]} zijn het in alle rijen samen?`,
           kaal: `Hoeveel ${set.soorten[s]} in totaal?`, antwoord: tot, figuur,
           uitleg: `${rijen.map((_, i) => pp(aantal(i, s))).join(' + ')} = ${pp(tot)}.` }
}

// ── Groep 7 blok 1, naar het werkblad uit de klas ───────────────────────────
// Getallen tot 1 miljoen in woorden, splitsingen en cijferwaarde; plus en min
// met handige duizendtallen; keer en delen met de kleine som; helen uit de
// breuk en breuken vergelijken; kalender met weeknummers en tijdsduur in
// "… uur en … minuten".
const EENHEDEN = ['', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf', 'twaalf',
  'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien']
const TIGEN = ['', '', 'twintig', 'dertig', 'veertig', 'vijftig', 'zestig', 'zeventig', 'tachtig', 'negentig']
const tot100 = n => n < 20 ? EENHEDEN[n]
  : (n % 10 ? EENHEDEN[n % 10] + (EENHEDEN[n % 10].endsWith('e') ? 'ën' : 'en') : '') + TIGEN[Math.floor(n / 10)]
const tot1000 = n => (n >= 100 ? (n >= 200 ? EENHEDEN[Math.floor(n / 100)] : '') + 'honderd' : '') + tot100(n % 100)
// 450600 → "vierhonderdvijftigduizend zeshonderd"
export const getalInWoorden = n => {
  const d = Math.floor(n / 1000), r = n % 1000
  return [d ? (d > 1 ? tot1000(d) : '') + 'duizend' : '', tot1000(r)].filter(Boolean).join(' ')
}
// Getallen met nullen erin, zoals op het werkblad: 903.000, 24.010, 600.090.
const miljoenGetal = () => {
  const d = pick([rnd(11, 999), rnd(1, 9) * 100, rnd(1, 99) * 10 + rnd(0, 1) * 100])
  const r = pick([0, rnd(1, 9) * 100, rnd(1, 99), rnd(101, 999), rnd(1, 9) * 100 + rnd(1, 9)])
  return d * 1000 + r
}
const getalWoordenV = () => {
  const n = miljoenGetal(), w = getalInWoorden(n)
  return { vraag: `${naam()} leest in de krant: "Er kwamen ${w} bezoekers naar de tentoonstelling." Schrijf dat aantal in cijfers.`,
           kaal: `Schrijf in cijfers: ${w}`, antwoord: n, uitleg: `${w} = ${pp(n)}` }
}
const splitsingV = () => {
  let n; do n = rnd(1, 9) * 100000 + rnd(100, 99999) * pick([1, 1, 10]) % 100000; while (String(n).replace(/0/g, '').length < 4)
  const delen = String(n).split('').map((c, i, s) => +c * 10 ** (s.length - 1 - i)).filter(Boolean).sort(() => Math.random() - 0.5)
  const som = delen.map(getal).join(' + ')
  return { vraag: `${naam()} telt het geld van de loterij. Er ligt ${delen.map(x => heleEuro(x)).join(' en ')}. Hoeveel euro is dat samen?`,
           kaal: `${som} =`, antwoord: n,
           uitleg: `Zet ze in het schema: ${[...delen].sort((x, y) => y - x).map(getal).join(' + ')} = ${pp(n)}` }
}
const POS_NAAM = ['eenheden', 'tientallen', 'honderdtallen', 'duizendtallen', 'tienduizendtallen', 'honderdduizendtallen']
const cijferWaardeV = () => {
  for (;;) {
    const n = rnd(100000, 999999), s = String(n), k = rnd(0, 5), c = s[5 - k]
    if (c === '0' || s.split(c).length !== 2) continue
    const w = +c * 10 ** k
    return { vraag: `Op het scorebord van een game staat ${pp(n)} punten. Hoeveel is de ${c} in dat getal waard?`,
             kaal: `Hoeveel is de ${c} in ${pp(n)} waard?`, antwoord: w,
             uitleg: `De ${c} staat op de plaats van de ${POS_NAAM[k]}, dus hij is ${pp(w)} waard.` }
  }
}
const volgordeMiljoenV = () => {
  const c = []; while (c.length < 4) { const x = rnd(1, 9); if (!c.includes(x)) c.push(x) }
  const [x, y, z, w] = c
  const lijst = [...new Set([x * 1e5 + y * 1e4 + z * 1e3 + w * 100, y * 1e5 + x * 1e4 + z * 1e3 + w * 100, x * 1e4 + y * 1e3 + z * 100,
    x * 1e5 + z * 1e4 + y * 1e3 + w * 100, y * 1e4 + w * 1e3 + x * 100])].sort(() => Math.random() - 0.5)
  const klein = [...lijst].sort((p, q) => p - q), plek = rnd(2, lijst.length - 1)
  return { vraag: `Bij een quiz scoren vijf teams ${lijst.map(getal).join(', ')} punten. Zet de scores van klein naar groot. Welke score staat op plek ${plek}?`,
           kaal: `Van klein naar groot: ${lijst.map(getal).join(', ')}. Welk getal staat op plek ${plek}?`, antwoord: klein[plek - 1],
           uitleg: `Van klein naar groot: ${klein.map(getal).join(' – ')}. Op plek ${plek} staat ${pp(klein[plek - 1])}.` }
}
// Streepjes per 100.000, de pijl soms precies tussen twee streepjes in.
const miljoenLijnV = () => {
  const start = rnd(0, 4) * 100000, eind = start + 600000, stap = rnd(1, 11), waarde = start + stap * 50000
  const tussen = stap % 2
  return { vraag: `${naam()} zet een pijl op de getallenlijn van ${pp(start)} tot ${pp(eind)}. Elk streepje is 100.000 verder. Welk getal hoort bij de pijl?`,
           kaal: 'Welk getal hoort bij de pijl?', antwoord: waarde, figuur: { type: 'getallenlijn', start, eind, waarde, segs: 6 },
           uitleg: tussen
             ? `De pijl staat precies tussen ${pp(waarde - 50000)} en ${pp(waarde + 50000)}, dus op ${pp(waarde)}.`
             : `Elk streepje is 100.000 verder. De pijl staat op ${pp(waarde)}.` }
}
const sprongV = () => {
  const n = pick([3, 3, 4]), sprong = rnd(8, 30) * 5000, start = rnd(2, Math.floor((1000000 - n * sprong) / 5000)) * 5000
  const eind = start + n * sprong
  return { vraag: `${naam()} maakt ${n} even grote sprongen op de getallenlijn, van ${pp(start)} naar ${pp(eind)}. Hoe groot is één sprong?`,
           kaal: `${n} sprongen van ${pp(start)} naar ${pp(eind)}. Hoe groot is de sprong?`, antwoord: sprong,
           figuur: { type: 'sprongen', start, eind, n },
           uitleg: `${pp(eind)} − ${pp(start)} = ${pp(n * sprong)}. ${pp(n * sprong)} : ${n} = ${pp(sprong)}.` }
}

// Plus en min: HULP 45.300 + 3700 (300 + 700 = 1000) en 56.000 − 2800.
const GROOT_PLUS = [
  (a, b) => `Vorig jaar had vlogger ${naam()} ${pp(a)} volgers. Dit jaar zijn er ${pp(b)} volgers bijgekomen. Hoeveel volgers zijn het nu?`,
  (a, b) => a < 100000
    ? `Een camper kost ${heleEuro(a)}. De fietsendrager en de luifel kosten samen ${heleEuro(b)}. Hoeveel euro is dat bij elkaar?`
    : `Een huis kost ${heleEuro(a)}. De nieuwe keuken en badkamer kosten samen ${heleEuro(b)}. Hoeveel euro is dat bij elkaar?`,
  (a, b) => `Het museum had in het voorjaar ${pp(a)} bezoekers. In de zomer kwamen er nog ${pp(b)} bij. Hoeveel bezoekers zijn dat samen?`,
]
const GROOT_MIN = [
  (a, b) => `Vlogger ${naam()} had ${pp(a)} volgers. Na een saaie video zijn er ${pp(b)} gestopt met volgen. Hoeveel volgers zijn er nog?`,
  (a, b) => `${a < 100000 ? 'Een camper' : 'Een huis'} stond te koop voor ${heleEuro(a)}. Na het bieden gaat er ${heleEuro(b)} vanaf. Hoeveel euro kost ${a < 100000 ? 'de camper' : 'het huis'} nu?`,
  (a, b) => `Het stadion heeft ${pp(a)} plaatsen. Er zijn al ${pp(b)} kaarten verkocht. Hoeveel plaatsen zijn er nog vrij?`,
]
const vlekGrootV = (soort) => {
  const a = rnd(12, 89) * 1000 + rnd(1, 9) * 100, b = pick([rnd(1, 9) * 100, rnd(11, 99) * 100])
  const [kaal, ant] = soort === 'plus'
    ? pick([[`${pp(a)} + … = ${pp(a + b)}`, b], [`… + ${pp(b)} = ${pp(a + b)}`, a]])
    : pick([[`${pp(a)} − … = ${pp(a - b)}`, b], [`… − ${pp(b)} = ${pp(a - b)}`, a]])
  return { vraag: `${naam()} heeft een som opgeschreven, maar er zit een vlek op: ${kaal}. Welk getal staat onder de vlek?`,
           kaal, antwoord: ant,
           uitleg: soort === 'plus' ? `Reken terug met min: onder de vlek staat ${pp(ant)}.` : `Reken het verschil uit: onder de vlek staat ${pp(ant)}.` }
}
const grootPlusMinV = (plus, soort) => {
  if (plus && Math.random() < 0.25) return vlekGrootV(soort)
  const A = rnd(12, plus ? 480 : 99), h = rnd(1, 9), B = rnd(1, plus ? 49 : 9), handig = Math.random() < 0.5
  let a, b, uitleg
  if (soort === 'plus') {
    a = A * 1000 + h * 100
    b = handig ? B * 1000 + (10 - h) * 100 : pick([B * 1000 + rnd(1, 9) * 100, rnd(11, 99) * 100])
    uitleg = handig ? `${h * 100} + ${(10 - h) * 100} = 1000, dus ${pp(a)} + ${pp(b)} = ${pp(a + b)}` : `${pp(a)} + ${pp(b)} = ${pp(a + b)}`
  } else {
    a = handig ? A * 1000 : A * 1000 + h * 100
    b = B * 1000 + (handig ? h : rnd(1, 9)) * 100
    while (b >= a) a += 10000
    uitleg = handig ? `1000 − ${h * 100} = ${1000 - h * 100}, dus ${pp(a)} − ${pp(b)} = ${pp(a - b)}` : `${pp(a)} − ${pp(b)} = ${pp(a - b)}`
  }
  return { vraag: pick(soort === 'plus' ? GROOT_PLUS : GROOT_MIN)(a, b), kaal: `${pp(a)} ${soort === 'plus' ? '+' : '−'} ${pp(b)} =`,
           antwoord: soort === 'plus' ? a + b : a - b, uitleg }
}
// Keer en delen met de kleine som: 50 × 7000 via 5 × 7, en 24.000 : 600 via 24 : 6.
const keerNullenV = (plus) => {
  const k1 = rnd(2, 9), p = rnd(1, 2), k2 = plus && Math.random() < 0.4 ? pick([12, 15, 25]) : rnd(2, 9), q = rnd(2, 3)
  const a = k1 * 10 ** p, b = k2 * 10 ** q
  return { vraag: pick(KEER_GROOT)(a, b), kaal: `${a} × ${pp(b)} =`, antwoord: a * b,
           uitleg: `Kleine som: ${k1} × ${k2} = ${k1 * k2}. ${k1} × ${pp(b)} = ${pp(k1 * b)} (${pp(10 ** q)}× zoveel). ${a} × ${pp(b)} = ${pp(a * b)} (${10 ** p}× zoveel).` }
}
const deelNullenV = () => {
  const d = rnd(2, 9), q = rnd(2, 9), K = d * q, y = rnd(1, 3), x = rnd(y + 1, 4)
  const totaal = K * 10 ** x, deler = d * 10 ** y, ant = q * 10 ** (x - y)
  return { vraag: pick(DEEL_GROOT)(totaal, deler, ding()), kaal: `${pp(totaal)} : ${pp(deler)} =`, antwoord: ant,
           uitleg: `Kleine som: ${K} : ${d} = ${q}. ${pp(totaal)} : ${d} = ${pp(totaal / d)} (${pp(10 ** x)}× zoveel). ${pp(totaal)} : ${pp(deler)} = ${pp(ant)} (${pp(10 ** y)}× zo weinig).` }
}

// Breuken: helen eruit halen, en vergelijken via gelijknamig maken. Het
// antwoord is een breuk ("2/3"); checkAntwoord keurt elke gelijke breuk goed.
const ggd = (a, b) => b ? ggd(b, a % b) : a
const kgv = (a, b) => a * b / ggd(a, b)
const breukHelen7V = (plus) => {
  const noem = pick([3, 4, 5, 6, 7, 8, 10]), h = rnd(1, plus ? 6 : 4), r = rnd(0, noem - 1), t = h * noem + r
  const zin = `Op het buffet liggen ${t} stukken taart. Elk stuk is 1/${noem} taart. Hoeveel hele taarten is dat${r ? ', en welk deel van een taart blijft er over' : ''}?`
  return { vraag: zin, kaal: `Haal de helen eruit: ${t}/${noem} =`, antwoord: h, rest: r ? r : null,
           antwLabel: 'Hele', restLabel: `…/${noem}`, toon: r ? `${h} ${r}/${noem}` : `${h}`,
           uitleg: `${t} : ${noem} = ${h}${r ? ` met rest ${r}` : ''}. Dus ${t}/${noem} = ${h}${r ? ` ${r}/${noem}` : ''}.` }
}
const maakBreuken = (aantal, plus) => {
  const noemers = plus ? [2, 3, 4, 5, 6, 7, 8, 9, 10] : [2, 3, 4, 5, 6, 8, 10]
  for (;;) {
    const br = Array.from({ length: aantal }, () => { const n = pick(noemers); return [rnd(1, n - 1), n] })
    const w = br.map(([t, n]) => t / n).sort((p, q) => p - q)
    if (w.every((v, i) => !i || v - w[i - 1] >= 0.02)) return br
  }
}
const breukTekst = ([t, n]) => `${t}/${n}`
const gelijknamig = (br) => {
  const N = br.reduce((acc, [, n]) => kgv(acc, n), 1)
  return N <= 60 ? `Maak ze gelijknamig: ${br.map(([t, n]) => `${t}/${n} = ${t * N / n}/${N}`).join(', ')}. ` : ''
}
const breukOptelOngelijkV = () => {   // ongelijknamige breuken optellen, in een verhaal
  for (;;) {
    const n1 = pick([2, 3, 4, 5, 6, 8]), n2 = pick([2, 3, 4, 5, 6, 8, 10]), N = kgv(n1, n2)
    if (n1 === n2 || N > 24) continue
    const t1 = rnd(1, n1 - 1), t2 = rnd(1, n2 - 1), s = t1 * N / n1 + t2 * N / n2
    if (s % N === 0) continue
    const g = ggd(s, N), nm = naam(), nm2 = naam2(nm)
    return { vraag: `${nm} drinkt ${t1}/${n1} liter limonade en ${nm2} drinkt ${t2}/${n2} liter. Hoeveel liter drinken ze samen?`,
             kaal: `${t1}/${n1} + ${t2}/${n2} =`, antwoord: `${s / g}/${N / g}`, eenheid: 'liter',
             uitleg: `${gelijknamig([[t1, n1], [t2, n2]])}${t1 * N / n1}/${N} + ${t2 * N / n2}/${N} = ${s}/${N}${g > 1 ? ` = ${s / g}/${N / g}` : ''}` }
  }
}
const breukMeerV = (plus) => {
  const br = maakBreuken(2, plus), groot = br[0][0] / br[0][1] > br[1][0] / br[1][1] ? br[0] : br[1]
  const n1 = naam(), n2 = naam2(n1)
  const wat = pick([['pizza', 'een even grote pizza'], ['reep chocola', 'een even grote reep']])
  return { vraag: `${n1} eet ${breukTekst(br[0])} van een ${wat[0]} en ${n2} eet ${breukTekst(br[1])} van ${wat[1]}. Wie eet het meest? Typ die breuk.`,
           kaal: `Wat is meer: ${breukTekst(br[0])} of ${breukTekst(br[1])}?`, antwoord: breukTekst(groot),
           uitleg: `${gelijknamig(br)}${breukTekst(groot)} is meer.` }
}
const breukVolgordeV = (plus) => {
  const br = maakBreuken(3, plus), klein = [...br].sort((p, q) => p[0] / p[1] - q[0] / q[1])
  return { vraag: `Drie kinderen lopen een even lange route. Ze zijn op ${br.map(breukTekst).join(', ')} van de route. Zet de breuken van klein naar groot. Welke breuk staat in het midden?`,
           kaal: `Zet van klein naar groot: ${br.map(breukTekst).join(', ')}. Welke staat in het midden?`, antwoord: breukTekst(klein[1]),
           uitleg: `${gelijknamig(br)}Van klein naar groot: ${klein.map(breukTekst).join(', ')}.` }
}

// Kalender met weeknummers, zoals op het werkblad.
const MAANDNAMEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
const WEEKDAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
const isoWeek = (jaar, maand, dag) => {
  const t = new Date(Date.UTC(jaar, maand, dag)), wd = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - wd)
  return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7)
}
const maandKalender = (jaar, maand) => {
  const dagen = new Date(Date.UTC(jaar, maand + 1, 0)).getUTCDate(), weken = []
  for (let d = 1; d <= dagen; d++) {
    const wd = (new Date(Date.UTC(jaar, maand, d)).getUTCDay() + 6) % 7
    if (!weken.length || wd === 0) weken.push({ nr: isoWeek(jaar, maand, d), dagen: Array(7).fill(null) })
    weken[weken.length - 1].dagen[wd] = d
  }
  return { dagen, weken }
}
const kalender7V = () => {
  const jaar = pick([2026, 2027]), maand = rnd(0, 11), { dagen, weken } = maandKalender(jaar, maand)
  const figuur = { type: 'kalender', titel: `${MAANDNAMEN[maand]} ${jaar}`, weken }
  const weekVan = d => weken.find(w => w.dagen.includes(d)).nr
  const datum = d => `${PAD(d)}-${PAD(maand + 1)}-${jaar}`
  const k = rnd(1, 3)
  if (k === 1) {
    const d = rnd(1, dagen)
    return { vraag: `${naam()} is jarig op ${datum(d)}. Kijk op de kalender. In welke week is dat?`, kaal: `In welke week valt ${datum(d)}?`,
             antwoord: weekVan(d), figuur, uitleg: `${d} ${MAANDNAMEN[maand]} staat in de kolom van week ${weekVan(d)}.` }
  }
  if (k === 2) {
    const w = pick(weken), wd = pick(w.dagen.map((d, i) => d ? i : -1).filter(i => i >= 0)), d = w.dagen[wd]
    return { vraag: `De schoolfotograaf komt op ${WEEKDAGEN[wd]} in week ${w.nr}. Welke datum is dat? Geef de dag van de maand.`,
             kaal: `${WEEKDAGEN[wd][0].toUpperCase()}${WEEKDAGEN[wd].slice(1)} in week ${w.nr} is … ${MAANDNAMEN[maand]}`, antwoord: d, figuur,
             uitleg: `Zoek week ${w.nr} en ga naar de rij ${WEEKDAGEN[wd]}: dat is ${d} ${MAANDNAMEN[maand]} (${datum(d)}).` }
  }
  const d = rnd(1, dagen - 8), erbij = rnd(5, dagen - d)
  return { vraag: `Het is vandaag ${d} ${MAANDNAMEN[maand]}. Over ${erbij} dagen begint de vakantie. In welke week is dat?`,
           kaal: `${d} ${MAANDNAMEN[maand]} + ${erbij} dagen = week …`, antwoord: weekVan(d + erbij), figuur,
           uitleg: `${d} + ${erbij} = ${d + erbij} ${MAANDNAMEN[maand]}. Die dag staat in week ${weekVan(d + erbij)}.` }
}
// Tijdsduur in "… uur en … minuten", met de sprongen uit de hulp: eerst de
// hele uren, dan naar het hele uur, dan de rest.
const hm = (min) => `${PAD(Math.floor(min / 60))}:${PAD(min % 60)}`
const hms = (s) => `${hm(Math.floor(s / 60))}:${PAD(s % 60)}`
const duurStappen = (van, dur) => {
  const H = Math.floor(dur / 60), rest = dur % 60, stappen = []
  let t = van
  const stap = (min, tekst) => { stappen.push(`${hm(t)} + ${tekst} = ${hm(t + min)}`); t += min }
  if (H) stap(H * 60, `${H} uur`)
  if (rest) {
    const totUur = 60 - t % 60
    if (t % 60 && rest > totUur) { stap(totUur, `${totUur} minuten`); stap(rest - totUur, `${rest - totUur} minuten`) } else stap(rest, `${rest} minuten`)
  }
  return stappen.join(', ')
}
const duurTekst = (dur) => `${Math.floor(dur / 60) ? `${Math.floor(dur / 60)} uur en ` : ''}${dur % 60} minuten`
const DUUR_ZINNEN = [
  (a, b) => `Het voetbaltoernooi begint om ${a} uur en de laatste wedstrijd is om ${b} uur afgelopen. Hoe lang duurt het toernooi?`,
  (a, b) => `De bus voor het schoolreisje vertrekt om ${a} uur en is om ${b} uur weer terug bij school. Hoe lang zijn ze weg?`,
  (a, b) => `${naam()} begint om ${a} uur aan een filmmarathon en zet om ${b} uur de tv uit. Hoe lang heeft de marathon geduurd?`,
]
const tijdsduur7V = (plus) => {
  if (plus && Math.random() < 0.5) {
    const van = rnd(8 * 3600, 15 * 3600), M = rnd(20, 59), S = rnd(1, 59), tot = van + M * 60 + S
    return { vraag: `Bij de sponsorloop start ${naam()} om ${hms(van)} en komt om ${hms(tot)} over de finish. Hoe lang heeft de loop geduurd?`,
             kaal: `Van ${hms(van)} tot ${hms(tot)} = … minuten en … seconden`, antwoord: M, rest: S, eenheid: 'min',
             antwLabel: 'Minuten', restLabel: 'seconden', toon: `${M} minuten en ${S} seconden`,
             uitleg: `${hms(van)} + ${M} minuten = ${hms(van + M * 60)}, + ${S} seconden = ${hms(tot)}. Samen ${M} minuten en ${S} seconden.` }
  }
  const zon = Math.random() < 0.25
  const van = zon ? rnd(330, 480) : rnd(6 * 12, 15 * 12) * 5 + (plus ? rnd(0, 4) : 0)
  const dur = zon ? rnd(1020, 1300) - van : rnd(1, 4) * 60 + rnd(1, 11) * 5
  const H = Math.floor(dur / 60), M = dur % 60
  if (!M) return tijdsduur7V(plus)
  const a = hm(van), b = hm(van + dur)
  return { vraag: zon ? `Vandaag komt de zon op om ${a} uur, en om ${b} uur gaat de zon onder. Hoe lang is het vandaag licht?` : pick(DUUR_ZINNEN)(a, b),
           kaal: `Van ${a} tot ${b} = … uur en … minuten`, antwoord: H, rest: M, eenheid: 'uur',
           antwLabel: 'Uur', restLabel: 'minuten', toon: `${H} uur en ${M} minuten`,
           uitleg: `${duurStappen(van, dur)}. Samen ${H} uur en ${M} minuten.` }
}
const beginEind7V = () => {
  const van = rnd(7 * 12, 16 * 12) * 5, dur = rnd(0, 2) * 60 + rnd(1, 11) * 5, tot = van + dur
  if (Math.random() < 0.5) {
    return { vraag: `De film begint om ${hm(van)} uur en duurt ${duurTekst(dur)}. Hoe laat is de film afgelopen?`,
             kaal: `${hm(van)} + ${duurTekst(dur)} = …`, antwoordType: 'tijd', tijdH: Math.floor(tot / 60), tijdM: tot % 60, antwoord: hm(tot),
             uitleg: `${duurStappen(van, dur)}. De film is om ${hm(tot)} uur afgelopen.` }
  }
  const H = Math.floor(dur / 60), M = dur % 60
  return { vraag: `De zwemles is om ${hm(tot)} uur afgelopen. De les duurde ${duurTekst(dur)}. Hoe laat begon de zwemles?`,
           kaal: `… + ${duurTekst(dur)} = ${hm(tot)}`, antwoordType: 'tijd', tijdH: Math.floor(van / 60), tijdM: van % 60, antwoord: hm(van),
           uitleg: `Terugrekenen: ${hm(tot)}${H ? ` − ${H} uur = ${hm(tot - H * 60)}` : ''}, − ${M} minuten = ${hm(van)}. De les begon om ${hm(van)} uur.` }
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
  const k = rnd(4, 5), gem = rnd(12, 60) * 5, spreiding = Math.floor(gem / 10)
  let waarden
  do {
    waarden = []
    let som = 0
    for (let i = 0; i < k - 1; i++) { const w = gem + rnd(-spreiding, spreiding) * 5; waarden.push(w); som += w }
    waarden.push(gem * k - som)
  } while (waarden[k - 1] < gem / 3 || waarden[k - 1] > gem * 2)
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
  // Het voorbeeld laat alleen zien hóé je het opschrijft; het mag nooit het
  // antwoord zelf zijn.
  const vb = h === 7 && m === 25 ? '8:10' : '7:25'
  return {
    vraag: `Hoe laat is het ${dd.naam} op de klok? Schrijf het zo: ${vb}`,
    kaal: `Hoe laat is het? Schrijf het zo: ${vb}`,
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

// ── Plaatjes bij de doelen die over een plaatje gaan ─────────────────────
// Bij deze doelen draait het om het plaatje (een gekleurd deel, een kaart,
// een maatbeker, een kalender, een bouwwerk). De som komt dus mét plaatje,
// ook als kale som.

const kies4 = (goed, fout) => [goed, ...[...new Set(fout)].filter(f => f !== goed).slice(0, 3)].sort(() => Math.random() - 0.5)

// Welk deel is gekleurd (of niet gekleurd)?
const breukPlaatjeV = (soort = 'gekleurd') => {
  const vorm = pick(['strook', 'taart', 'reep'])
  const n = vorm === 'reep' ? pick([6, 8, 10, 12]) : pick([2, 3, 4, 5, 6, 8]), k = rnd(1, n - 1)
  const ding = { strook: 'de strook', taart: 'de taart', reep: 'de reep chocola' }[vorm]
  const figuur = { type: 'breuk', vorm, n, k }
  if (soort === 'rest') {
    return { vraag: `Van ${ding} is een deel gekleurd. Welk deel van ${ding} is níet gekleurd?`, kaal: 'Welk deel is níet gekleurd?',
      antwoord: `${n - k}/${n}`, figuur, uitleg: `${n} gelijke stukken, ${k} gekleurd. Niet gekleurd: ${n - k} van de ${n} = ${n - k}/${n}. Samen ${n}/${n} = 1 hele.` }
  }
  return { vraag: `Kijk naar ${ding}. Welk deel van ${ding} is gekleurd?`, kaal: 'Welk deel is gekleurd?',
    antwoord: `${k}/${n}`, figuur, uitleg: `${ding[0].toUpperCase() + ding.slice(1)} is in ${n} gelijke stukken verdeeld en ${k} zijn gekleurd: ${k}/${n}.` }
}

// Meten met een strook: het voorwerp is zo lang als het gekleurde deel.
const strookMetenV = () => {
  const n = pick([2, 3, 4, 5, 6, 8]), k = rnd(1, n - 1), wat = pick(['het potlood', 'de lepel', 'de gum', 'het schriftje', 'de schaar'])
  return { vraag: `${naam()} meet ${wat} met een papieren strook. ${wat[0].toUpperCase() + wat.slice(1)} is precies zo lang als het gekleurde deel. Hoe lang is ${wat} in breukentaal?`,
    kaal: 'Hoeveel van de strook is gekleurd?', antwoord: `${k}/${n}`, figuur: { type: 'breuk', vorm: 'strook', n, k },
    uitleg: `De strook is in ${n} gelijke stukken gevouwen, ${k} zijn gekleurd: ${wat} is ${k}/${n} strook lang.` }
}

// Breuken ontstaan uit eerlijk verdelen: 3 pannenkoeken voor 4 kinderen.
const eerlijkVerdelenV = () => {
  // Meestal 1 ding over b mensen (1 stuk is 1/b deel), zoals in de toets.
  const b = pick([2, 3, 4, 5, 6, 8]), a = b === 2 || Math.random() < 0.6 ? 1 : rnd(2, b - 1), [wat, wie] = pick([['pannenkoeken', 'kinderen'], ["pizza's", 'vrienden'], ['taarten', 'tafels'], ['repen', 'kinderen']])
  return { vraag: `${a} ${a === 1 ? wat.replace(/en$|'s$|s$/, '') : wat} ${a === 1 ? 'wordt' : 'worden'} eerlijk verdeeld over ${b} ${wie}. Welk deel krijgt ieder?`,
    kaal: `${a} verdelen over ${b}: ieder krijgt … deel`, antwoord: `${a}/${b}`, figuur: { type: 'breuk', vorm: 'taart', n: b, k: a },
    uitleg: `Snijd alles in ${b} gelijke stukken. Ieder krijgt van elk stuk er één: ${a} × 1/${b} = ${a}/${b}.` }
}


// Breuk op de getallenlijn, vanaf 0 of vanaf een willekeurig getal.
const breukLijnV = (vanafGetal) => {
  const n = pick([2, 3, 4, 5, 6, 8, 10]), k = rnd(1, n - 1), start = vanafGetal ? rnd(1, 4) : 0
  return { vraag: `${naam()} zet een pijl op de getallenlijn van ${start} tot ${start + 1}. Welke breuk hoort bij de pijl?${start ? ' Schrijf het als gemengd getal, bijvoorbeeld 2 1/4.' : ''}`,
    kaal: 'Welke breuk hoort bij de pijl?', antwoord: `${start * n + k}/${n}`, toon: start ? `${start} ${k}/${n}` : `${k}/${n}`,
    figuur: { type: 'getallenlijn', start, eind: start + 1, waarde: start + k / n, segs: n },
    uitleg: `Van ${start} tot ${start + 1} zijn ${n} gelijke stapjes van 1/${n}. De pijl staat na ${k} stapjes: ${start ? `${start} ${k}/${n}` : `${k}/${n}`}.` }
}

// Breuken vergelijken met een plaatje (twee stroken of twee getallenlijnen).
const breukVergelijkPlaatjeV = (lijn) => {
  let a, b
  do {
    const n1 = pick([2, 3, 4, 5, 6, 8]), n2 = Math.random() < 0.5 ? n1 : pick([2, 3, 4, 5, 6, 8])
    a = [rnd(1, n1 - 1), n1]; b = [rnd(1, n2 - 1), n2]
  } while (a[0] * b[1] === b[0] * a[1])
  const groot = a[0] / a[1] > b[0] / b[1] ? 'A' : 'B'
  return { vraag: lijn
      ? `Op getallenlijn A staat een stip bij ${a[0]}/${a[1]}, op getallenlijn B bij ${b[0]}/${b[1]}. Welke breuk is het grootst?`
      : `Twee even lange stroken. Bij A is ${a[0]}/${a[1]} gekleurd, bij B is ${b[0]}/${b[1]} gekleurd. Bij welke strook is het meest gekleurd?`,
    kaal: `Wat is meer: ${a[0]}/${a[1]} (A) of ${b[0]}/${b[1]} (B)?`, opties: ['A', 'B'], antwoord: groot,
    figuur: { type: 'breuken2', a, b, vorm: lijn ? 'lijn' : 'strook' },
    uitleg: `Kijk welk deel het langst is (of welke stip het verst naar rechts staat): ${groot === 'A' ? `${a[0]}/${a[1]}` : `${b[0]}/${b[1]}`} is het grootst.` }
}

// Een deelsom bij een plaatje: stippen in groepjes (en losse stippen = rest).
const DEELDINGEN = [['koekjes', 'bordje', 'bordjes'], ['knikkers', 'zakje', 'zakjes'], ['appels', 'mand', 'manden'], ['snoepjes', 'bakje', 'bakjes']]
const deelPlaatjeV = (metRest) => {
  const d = rnd(2, 5), q = rnd(2, metRest ? 6 : 8), r = metRest ? rnd(1, Math.min(4, q - 1)) : 0, t = d * q + r
  const [ding, enk, mv] = pick(DEELDINGEN)
  const figuur = { type: 'stippen', groepen: d, per: q, los: r }
  if (metRest) {
    return { vraag: `Op het plaatje zie je ${t} ${ding}. Er gaan er steeds ${q} in een ${enk}. Hoeveel ${mv} worden vol, en hoeveel ${ding} blijven er over?`,
      kaal: `${t} : ${q} = … rest …`, antwoord: d, rest: r, figuur, uitleg: `${d} ${mv} van ${q} = ${d * q}. Er blijven ${r} over: ${t} : ${q} = ${d} rest ${r}.` }
  }
  return { vraag: `Op het plaatje zie je ${t} ${ding}. Er gaan er steeds ${q} in een ${enk}. Welke deelsom hoort erbij? Hoeveel ${mv} zijn het?`,
    kaal: `${t} : ${q} =`, antwoord: d, figuur, uitleg: `${t} : ${q} = ${d}, want ${d} × ${q} = ${t}.` }
}

// Deelsom met rest op de getallenlijn: sprongen van de deler.
const deelRestLijnV = () => {
  const d = rnd(3, 8), q = rnd(3, 7), r = rnd(1, d - 1), t = d * q + r
  return { vraag: `${naam()} springt op de getallenlijn steeds ${d} verder, vanaf 0. Hoeveel hele sprongen passen er tot ${t}, en hoeveel blijft er over?`,
    kaal: `${t} : ${d} = … rest …`, antwoord: q, rest: r, figuur: { type: 'sprongen', start: 0, eind: q * d, n: q },
    uitleg: `${q} sprongen van ${d} = ${q * d}. Van ${q * d} tot ${t} is nog ${r}: ${t} : ${d} = ${q} rest ${r}.` }
}

// Bouwwerk van blokjes, van boven gezien.
const stapelsV = () => {
  const rij = rnd(2, 3), kol = rnd(2, 3)
  const grid = Array.from({ length: rij }, () => Array.from({ length: kol }, () => rnd(0, 3)))
  if (grid.flat().filter(h => h > 0).length < 2) return stapelsV()
  const totaal = grid.flat().reduce((a, b) => a + b, 0), boven = grid.flat().filter(h => h > 0).length
  const voor = [...Array(kol)].reduce((t, _, x) => t + Math.max(...grid.map(r => r[x])), 0)
  const figuur = { type: 'stapels', grid }
  const soort = rnd(1, 3)
  if (soort === 1) return { vraag: 'Dit is een bouwwerk van boven gezien. In elk vakje staat hoeveel blokjes er op elkaar staan. Hoeveel blokjes zijn het samen?', kaal: 'Hoeveel blokjes zijn het samen?', antwoord: totaal, figuur, uitleg: `Tel alle getallen op: ${grid.flat().filter(h => h).join(' + ')} = ${totaal}.` }
  if (soort === 2) return { vraag: 'Dit is een bouwwerk van boven gezien (het getal = hoeveel blokjes op elkaar). Je kijkt recht van boven. Hoeveel vierkantjes zie je?', kaal: 'Van boven gezien: hoeveel vierkantjes?', antwoord: boven, figuur, uitleg: `Van boven zie je elk vakje waar iets staat één keer: ${boven} vierkantjes.` }
  return { vraag: 'Dit is een bouwwerk van boven gezien (het getal = hoeveel blokjes op elkaar). Je kijkt vanaf de voorkant. Hoeveel vierkantjes zie je?', kaal: 'Vanaf de voorkant gezien: hoeveel vierkantjes?', antwoord: voor, figuur,
    uitleg: `Van voren zie je per kolom de hoogste toren: ${[...Array(kol)].map((_, x) => Math.max(...grid.map(r => r[x]))).join(' + ')} = ${voor}.` }
}

// Namen van figuren, en een balk.
const VORMNAMEN = [[3, 'driehoek'], [4, 'vierkant'], [-4, 'rechthoek'], [5, 'vijfhoek'], [6, 'zeshoek'], [8, 'achthoek'], [0, 'cirkel']]
const vormNaamV = () => {
  const soort = rnd(1, 3)
  if (soort === 3) {
    const [wat, n] = pick([['vlakken', 6], ['ribben', 12], ['hoekpunten', 8]])
    return { vraag: `Kijk naar de balk. Hoeveel ${wat} heeft een balk?`, kaal: `Een balk heeft … ${wat}`, antwoord: n, figuur: { type: 'balk', l: 4, b: 2, h: 3, eenheid: '' },
      uitleg: `Een balk heeft 6 vlakken (de uitslag bestaat uit 6 rechthoeken), 12 ribben en 8 hoekpunten.` }
  }
  const [n, nm] = pick(soort === 2 ? VORMNAMEN.filter(v => v[0] !== 0) : VORMNAMEN)
  if (soort === 2) {
    const hoeken = Math.abs(n)
    return { vraag: 'Hoeveel hoeken heeft deze figuur?', kaal: 'Aantal hoeken?', antwoord: hoeken, figuur: { type: 'veelhoek', n }, uitleg: `Dit is een ${nm}: ${hoeken} hoeken.` }
  }
  return { vraag: 'Hoe heet deze figuur?', kaal: 'Naam van de figuur?', opties: kies4(nm, VORMNAMEN.map(v => v[1])), antwoord: nm, figuur: { type: 'veelhoek', n },
    uitleg: n === 0 ? 'Een ronde figuur zonder hoeken is een cirkel.' : `${Math.abs(n)} hoeken${n === -4 ? ', twee lange en twee korte zijden' : ''}: een ${nm}.` }
}

// Bedragen maken en schrijven met euroteken en komma.
const GELD = [[20, 'briefje', 'briefjes', '€ 20'], [10, 'briefje', 'briefjes', '€ 10'], [5, 'briefje', 'briefjes', '€ 5'], [2, 'munt', 'munten', '€ 2'],
  [1, 'munt', 'munten', '€ 1'], [0.5, 'munt', 'munten', '50 cent'], [0.2, 'munt', 'munten', '20 cent'], [0.1, 'munt', 'munten', '10 cent'], [0.05, 'munt', 'munten', '5 cent']]
const geldMakenV = () => {
  const soorten = [...GELD].sort(() => Math.random() - 0.5).slice(0, rnd(3, 4)).sort((a, b) => b[0] - a[0])
  const stuks = soorten.map(() => rnd(1, 3))
  const totaal = Math.round(soorten.reduce((t, g, i) => t + g[0] * stuks[i] * 100, 0)) / 100
  if (totaal > 100) return geldMakenV()
  const tekst = soorten.map((g, i) => `${stuks[i]} ${stuks[i] === 1 ? g[1] : g[2]} van ${g[3]}`)
  return { vraag: `In de portemonnee van ${naam()} zitten ${tekst.slice(0, -1).join(', ')} en ${tekst.at(-1)}. Hoeveel geld is dat? Schrijf het met een komma.`,
    kaal: `${soorten.map((g, i) => `${stuks[i]} × ${euro(g[0])}`).join(' + ')} =`, antwoord: totaal, eenheid: '€',
    uitleg: `${soorten.map((g, i) => euro(g[0] * stuks[i])).join(' + ')} = ${euro(totaal)}.` }
}

// Jaarkalender: welke dag, hoeveel keer een dag, welke datum.
const RANG = ['eerste', 'tweede', 'derde']
const jaarkalenderV = () => {
  const jaar = pick([2026, 2027]), maand = rnd(0, 11), { dagen, weken } = maandKalender(jaar, maand)
  const figuur = { type: 'kalender', titel: `${MAANDNAMEN[maand]} ${jaar}`, weken }
  const wdVan = (d) => (new Date(Date.UTC(jaar, maand, d)).getUTCDay() + 6) % 7
  const soort = rnd(1, 3)
  if (soort === 1) {
    const d = rnd(1, dagen), goed = WEEKDAGEN[wdVan(d)]
    return { vraag: `Kijk op de kalender. Op welke dag van de week valt ${d} ${MAANDNAMEN[maand]}?`, kaal: `${d} ${MAANDNAMEN[maand]} is een …`,
      opties: kies4(goed, WEEKDAGEN), antwoord: goed, figuur, uitleg: `Zoek ${d} op de kalender en kijk in welke rij het staat: ${goed}.` }
  }
  const wd = rnd(0, 6), lijst = [...Array(dagen)].map((_, i) => i + 1).filter(d => wdVan(d) === wd)
  if (soort === 2) {
    return { vraag: `Kijk op de kalender. Hoeveel ${WEEKDAGEN[wd]}en heeft ${MAANDNAMEN[maand]} ${jaar}?`, kaal: `Aantal ${WEEKDAGEN[wd]}en in ${MAANDNAMEN[maand]}?`,
      antwoord: lijst.length, figuur, uitleg: `Tel de rij ${WEEKDAGEN[wd]}: ${lijst.join(', ')}. Dat zijn er ${lijst.length}.` }
  }
  const nr = rnd(0, 2)
  return { vraag: `Kijk op de kalender. Welke datum is de ${RANG[nr]} ${WEEKDAGEN[wd]} van ${MAANDNAMEN[maand]}? Geef de dag van de maand.`, kaal: `De ${RANG[nr]} ${WEEKDAGEN[wd]} van ${MAANDNAMEN[maand]} is de …`,
    antwoord: lijst[nr], figuur, uitleg: `De ${WEEKDAGEN[wd]}en in ${MAANDNAMEN[maand]}: ${lijst.join(', ')}. De ${RANG[nr]} is ${lijst[nr]} ${MAANDNAMEN[maand]}.` }
}

// Datum in cijfers (dag-maand-jaar) en jaartallen op een tijdbalk.
const datumTijdbalkV = () => {
  if (Math.random() < 0.5) {
    const d = rnd(1, 28), m = rnd(1, 12), j = rnd(2024, 2032)
    const goed = `${PAD(d)}-${PAD(m)}-${j}`
    const fout = [`${PAD(m)}-${PAD(d)}-${j}`, `${PAD(d)}-${PAD(m)}-${String(j).slice(2)}`, `${j}-${PAD(d)}-${PAD(m)}`, `${PAD(d)}-${PAD((m % 12) + 1)}-${j}`]
    return { vraag: `${naam()} schrijft de datum ${d} ${MAANDNAMEN[m - 1]} ${j} in cijfers (dag-maand-jaar). Welke is goed?`, kaal: `${d} ${MAANDNAMEN[m - 1]} ${j} in cijfers?`,
      opties: kies4(goed, fout), antwoord: goed, uitleg: `Eerst de dag (${PAD(d)}), dan de maand (${MAANDNAMEN[m - 1]} = ${PAD(m)}), dan het jaar: ${goed}.` }
  }
  const start = pick([1900, 1950, 1980]), stap = pick([5, 10]), segs = start === 1900 ? 10 : 6, eind = start + segs * stap * (start === 1900 ? 1 : 1)
  const i = rnd(1, segs - 1), jaar = start + i * stap
  return { vraag: `Op de tijdbalk van ${start} tot ${eind} staat een pijl bij het jaar dat de school werd gebouwd. Welk jaartal is dat?`, kaal: 'Welk jaartal hoort bij de pijl?',
    antwoord: jaar, figuur: { type: 'getallenlijn', start, eind, waarde: jaar, segs, ruw: true }, uitleg: `Elk streepje is ${stap} jaar. De pijl staat ${i} streepjes na ${start}: ${jaar}.` }
}

// Maatbeker aflezen, in ml of in liter met een komma.
const maatbekerV = () => {
  const [max, stap] = pick([[500, 50], [1000, 100], [250, 25], [1000, 50]]), waarde = stap * rnd(1, max / stap - 1)
  const figuur = { type: 'maatbeker', max, stap, waarde, eenheid: 'ml' }
  if (Math.random() < 0.6) return { vraag: `${naam()} schenkt melk in een maatbeker. Hoeveel milliliter zit erin?`, kaal: 'Hoeveel ml zit in de maatbeker?', antwoord: waarde, eenheid: 'ml', figuur, uitleg: `Het melkpeil staat bij ${waarde} ml.` }
  return { vraag: `${naam()} schenkt water in een maatbeker. Hoeveel liter is dat? Schrijf het met een komma.`, kaal: 'Hoeveel liter zit in de maatbeker? (met komma)', antwoord: komma(+(waarde / 1000).toFixed(3)), eenheid: 'l', figuur,
    uitleg: `Het peil staat bij ${waarde} ml. 1000 ml = 1 liter, dus ${komma(+(waarde / 1000).toFixed(3))} liter.` }
}

// Plaats op de kaart vinden (letter en cijfer).
const roosterPlaatsV = () => {
  const kol = 6, rij = 5, c = rnd(0, kol - 1), r = rnd(0, rij - 1), vak = `${'ABCDEF'[c]}${r + 1}`
  const fout = [`${'ABCDEF'[(c + 1) % kol]}${r + 1}`, `${'ABCDEF'[c]}${((r + 1) % rij) + 1}`, `${r + 1}${'ABCDEF'[c]}`.replace(/^(\d)([A-F])$/, (_, x, y) => `${'ABCDEF'[Math.min(+x, 5)]}${'ABCDEF'.indexOf(y) + 1}`)]
  const plek = pick(['de speeltuin', 'het zwembad', 'de school', 'de bibliotheek', 'het station'])
  return { vraag: `Op de kaart staat een ster bij ${plek}. In welk vak ligt ${plek}? Eerst de letter, dan het cijfer.`, kaal: 'In welk vak staat de ster?',
    opties: kies4(vak, fout), antwoord: vak, figuur: { type: 'rooster', kol, rij, ster: [c, r] }, uitleg: `De ster staat in kolom ${'ABCDEF'[c]} en rij ${r + 1}: vak ${vak}.` }
}

// Lengte van een route op de kaart: hokjes tellen keer de afstand per hokje.
const roosterRouteV = (lang) => {
  const kol = 7, rij = 5, per = pick(lang ? [50, 100, 250] : [10, 20, 50])
  let x = rnd(0, 2), y = rnd(0, rij), hokjes = 0
  const route = [[x, y]]
  const delen = lang ? rnd(3, 4) : 2
  for (let i = 0; i < delen; i++) {
    if (i % 2 === 0) { const nx = rnd(Math.min(x + 1, kol), kol); hokjes += nx - x; x = nx }
    else { const ny = y >= rij / 2 ? rnd(0, y - 1) : rnd(y + 1, rij); hokjes += Math.abs(ny - y); y = ny }
    route.push([x, y])
  }
  if (hokjes < 2) return roosterRouteV(lang)
  return { vraag: `${naam()} fietst de rode route over de lijnen van de kaart. Elk hokje is ${per} meter. Hoeveel meter is de route?`, kaal: `1 hokje = ${per} m. Hoe lang is de route?`,
    antwoord: hokjes * per, eenheid: 'm', figuur: { type: 'rooster', kol, rij, route, per, letters: false },
    uitleg: `Tel de hokjes langs de route: ${hokjes}. ${hokjes} × ${per} m = ${getal(hokjes * per)} m.` }
}

// Problemen met breuken: tekenen of op de getallenlijn (groep 8 FS).
const breukProbleemV = (soort = pick(['deel', 'lijn'])) => {
  if (soort === 'lijn') {
    const k = pick([2, 3, 4]), liter = rnd(1, 3)
    return { vraag: `Een fles bevat ${liter} liter sap. Hoeveel glazen van 1/${k} liter kun je ermee vullen? Je mag de getallenlijn gebruiken.`, kaal: `${liter} : 1/${k} =`,
      antwoord: liter * k, figuur: { type: 'sprongen', start: 0, eind: liter, n: liter * k }, uitleg: `Op de getallenlijn van 0 tot ${liter} passen ${liter * k} sprongen van 1/${k}.` }
  }
  const n = pick([3, 4, 5, 6]), k = rnd(1, n - 1), km = n * rnd(2, 6)
  return { vraag: `${naam()} fietst een route van ${km} km. Het gekleurde deel is al gefietst. Hoeveel km is dat?`, kaal: `${k}/${n} van ${km} km =`,
    antwoord: km / n * k, eenheid: 'km', figuur: { type: 'breuk', vorm: 'strook', n, k }, uitleg: `1/${n} van ${km} = ${km / n} km. ${k}/${n} = ${k} × ${km / n} = ${km / n * k} km.` }
}

// Getallen splitsen in en samenstellen met honderdtallen, tientallen en eenheden.
const splitsenHTEV = () => {
  const H = rnd(1, 9), T = rnd(0, 9), E = rnd(0, 9), n = H * 100 + T * 10 + E
  if (Math.random() < 0.5) {
    return { vraag: `In een doos zitten ${H} zakken van 100 knikkers, ${T} zakjes van 10 en ${E} losse knikkers. Hoeveel knikkers zijn dat?`, kaal: `${H * 100} + ${T * 10} + ${E} =`, antwoord: n,
      uitleg: `${H} honderdtallen, ${T} tientallen en ${E} eenheden: ${n}.` }
  }
  const [plek, waarde] = pick([['honderdtallen', H], ['tientallen', T], ['eenheden', E]])
  return { vraag: `Er zijn ${n} kaartjes verkocht. Hoeveel ${plek} zitten er in ${n}?`, kaal: `${n} = … ${plek}`, antwoord: waarde,
    uitleg: `${n} = ${H} honderdtallen, ${T} tientallen en ${E} eenheden.` }
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
      { doel: 'Je leert getallen tot en met 1000 splitsen in en samenstellen met honderdtallen, tientallen en eenheden.', gen: () => splitsenHTEV() },
      { doel: 'Je leert tussen welke honderdtallen een getal ligt en getallen tot en met 1000 op volgorde zetten.', gen: () => tussenHonderdV() },
      { doel: 'Je leert alle tafelsommen vlot maken.', gen: () => keerV(rnd(2, 10), rnd(2, 10)) },
      { doel: 'Je leert de tijd van een digitale klok aflezen, bij hele en halve uren en bij kwartieren.', gen: () => klokV([0, 15, 30, 45]) },
    ],
    2: [
      { doel: 'Je leert getallen tot en met 1000 schattend plaatsen en aflezen op de streepjesgetallenlijn vanaf een willekeurig getal.', gen: () => getallenlijnV(rnd(0, 5) * 100, 500) },
      { doel: 'Je leert keersommen uitrekenen met behulp van de kleine som, ook door de som eerst om te keren.', gen: () => keerV(rnd(2, 9), rnd(2, 9) * 10) },
      { doel: 'Je leert wat delen is en bij een deelverhaal of een plaatje een deelsom bedenken.', gen: () => (Math.random() < 0.6 ? deelPlaatjeV(false) : deelV(rnd(2, 5), rnd(2, 9))) },
      { doel: 'Je leert bedenken wat je vanuit een bepaald standpunt ziet en iets op de goede plek in een bovenaanzicht tekenen.', gen: () => stapelsV() },
    ],
    3: [
      { doel: 'Je leert optellen tot en met 1000 met de strategie rijgen, bij sommen als 380 + 200 en 380 + 160, en via de kleine som 5 + 3.', gen: () => optelV(rnd(11, 80) * 10, rnd(2, 8) * 20) },
      { doel: 'Je leert sommen als 3 × 14 uitrekenen met de basisstrategie splitsen.', gen: () => keerV(rnd(2, 9), rnd(11, 19)) },
      { doel: 'Je leert wat delen is en bij een deelverhaal of plaatje een deelsom bedenken (ook met een rest).', gen: () => { if (Math.random() < 0.6) return deelPlaatjeV(true); const deler = rnd(3, 8); return deelRestV(deler, rnd(4, 9), rnd(1, deler - 1)) } },
      { doel: 'Je leert van een klok met wijzers en van een digitale klok 5 en 10 minuten voor en over een heel uur aflezen.', gen: () => klokV([5, 10, 50, 55]) },
    ],
    4: [
      { doel: 'Je leert aftrekken tot en met 1000 met de strategie rijgen, bij sommen als 580 - 200 en 540 - 160, en via de kleine som 5 - 3.', gen: () => { const a = rnd(30, 95) * 10, b = rnd(2, 8) * 20; return aftrekV(a, Math.min(b, a - 20)) } },
      { doel: 'Je leert sommen als 4 × 67 uitrekenen met de basisstrategie splitsen.', gen: () => keerV(rnd(3, 9), rnd(41, 89)) },
      { doel: 'Je leert een deelsom met rest bedenken bij een deelverhaal en uitrekenen op de getallenlijn.', gen: () => { if (Math.random() < 0.6) return deelRestLijnV(); const deler = rnd(3, 8); return deelRestV(deler, rnd(4, 12), rnd(1, deler - 1)) } },
      { doel: 'Je leert bedragen tot en met 100 euro maken en schrijven met het euroteken en een komma.', gen: () => geldMakenV() },
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
      { doel: 'Je leert de namen van figuren en vormen en welke uitslag bij een balk hoort.', gen: () => vormNaamV() },
    ],
    7: [
      { doel: 'Je leert optellen tot en met 1000 met de basisstrategie splitsen, bij sommen als 435 + 220 en 435 + 224.', gen: () => optelV(rnd(120, 560), rnd(110, 430)) },
      { doel: 'Je leert aftrekken tot en met 1000 met de basisstrategie splitsen, bij sommen als 687 - 450 en 687 - 456.', gen: () => { const a = rnd(450, 950), b = rnd(150, a - 100); return aftrekV(a, b) } },
      { doel: 'Je leert deelsommen zonder en met rest vlot uitrekenen met de keersom als hulpsom.', gen: () => { const deler = rnd(2, 9); return Math.random() < 0.5 ? deelV(deler, rnd(3, 12)) : deelRestV(deler, rnd(3, 12), rnd(1, deler - 1)) } },
      { doel: 'Je leert een jaarkalender aflezen en een datum vinden in de maand.', gen: () => jaarkalenderV() },
    ],
    8: [
      { doel: 'Je leert aftrekken tot en met 1000 met de strategie aanvullen.', gen: () => { const a = rnd(400, 900), b = rnd(a - 90, a - 10); return aftrekV(a, b) } },
      { doel: 'Je leert sommen als 4 × 69 uitrekenen met de variastrategie rekenen met te veel.', gen: () => keerV(rnd(3, 9), rnd(2, 9) * 10 - 1) },
      { doel: 'Je leert sommen als 120 : 3 uitrekenen met de kleine som 12 : 3.', gen: () => { const deler = rnd(2, 8), q = rnd(3, 9), totaal = deler * q * 10, d = ding(); return { vraag: `${getal(totaal)} ${d[1]} gaan in ${deler} dozen. Hoeveel ${d[1]} in elke doos?`, kaal: `${getal(totaal)} : ${deler} =`, antwoord: q * 10, uitleg: `${getal(totaal)} : ${deler} = ${q * 10} (kleine som ${deler * q} : ${deler} = ${q})` } } },
      { doel: 'Je leert uitrekenen hoeveel je terugkrijgt als je met te veel betaalt.', gen: () => wisselV() },
    ],
    9: [
      { doel: 'Je leert optellen tot en met 1000 met de strategie rijgen met te veel.', gen: () => optelV(rnd(120, 800), rnd(2, 9) * 10 - 1) },
      { doel: 'Je leert aftrekken tot en met 1000 met de strategie rijgen met te veel.', gen: () => { const a = rnd(200, 900), b = rnd(2, 9) * 10 - 1; return aftrekV(a, b) } },
      { doel: 'Je leert sommen als 42 : 3 uitrekenen met de basisstrategie splitsen.', gen: () => deelV(rnd(2, 8), rnd(11, 30)) },
      { doel: 'Je leert nauwkeurig meten in millimeters, centimeters en decimeters en deze maten met elkaar vergelijken.', gen: () => { const cm = rnd(3, 20), mm = rnd(1, 9); return { vraag: `Een potlood is ${cm} cm en ${mm} mm lang. Hoeveel millimeter is dat in totaal?`, kaal: `${cm} cm ${mm} mm = … mm`, antwoord: cm * 10 + mm, eenheid: 'mm', uitleg: `${cm} cm = ${cm * 10} mm. ${cm * 10} + ${mm} = ${cm * 10 + mm} mm` } } },
    ],
    10: [
      { doel: 'Je leert handig rekenen bij een lange optelsom en aftreksom.', gen: () => { const a = rnd(20, 90) * 10, b = rnd(15, 60) * 10, c = rnd(10, 40) * 10, d = ding(); return { vraag: `In 3 dozen zitten ${getal(a)}, ${getal(b)} en ${getal(c)} ${d[1]}. Hoeveel ${d[1]} samen?`, kaal: `${getal(a)} + ${getal(b)} + ${getal(c)} =`, antwoord: a + b + c, uitleg: `${getal(a)} + ${getal(b)} + ${getal(c)} = ${getal(a + b + c)}` } } },
      { doel: 'Je leert sommen als 4 × 35 uitrekenen met de variastrategie halveren en verdubbelen.', gen: () => halveerV([2, 4, 6, 8]) },
      { doel: 'Je leert sommen als 72 : 3 uitrekenen met de basisstrategie splitsen.', gen: () => deelV(rnd(2, 6), rnd(11, 40)) },
      { doel: 'Je leert een stapeldiagram en een lijndiagram aflezen en gebruiken.', gen: () => diagramV(pick(['staaf', 'lijn']), pick([2, 5]), rnd(3, 8)) },
    ],
  }
}

// ── Groep 6 (Pluspunt FS + S+). Instap + blok 1 t/m 10, exacte doelen. ──
// ── Zo vraagt de toets het ──────────────────────────────────────────────────
// Per doel de vraagvorm uit de Pluspunt-toets van het blok erna (toets blok N
// toetst de doelen van blok N − 1), als verhaaltje met eigen getallen.

// "Hoeveel is het gekleurde cijfer waard?" (1267: de 2 is 200 waard)
const cijferWaarde4V = () => {
  for (;;) {
    const n = rnd(1001, 9999), s = String(n), k = rnd(0, 3), c = s[3 - k]
    if (c === '0' || s.split(c).length !== 2) continue
    const w = +c * 10 ** k
    return { vraag: `Op de teller van de schoolbus staat ${getal(n)} kilometer. Hoeveel is de ${c} in dat getal waard?`,
             kaal: `Hoeveel is de ${c} in ${getal(n)} waard?`, antwoord: w,
             uitleg: `De ${c} staat op de plaats van de ${POS_NAAM[k]}, dus hij is ${getal(w)} waard.` }
  }
}
// "600 + 5000 + 50 + 3 = …": samenstellen, met de delen door elkaar.
const samenstelV = () => {
  let n; do n = rnd(1001, 9999); while (String(n).replace(/0/g, '').length < 3)
  const delen = String(n).split('').map((c, i, s) => +c * 10 ** (s.length - 1 - i)).filter(Boolean).sort(() => Math.random() - 0.5)
  return { vraag: `${naam()} telt het geld van de loterij. Er ligt ${delen.map(x => `€ ${getal(x)}`).join(', ')}. Hoeveel euro is dat samen?`,
           kaal: `${delen.map(getal).join(' + ')} =`, antwoord: n, eenheid: '€',
           uitleg: `Zet ze op volgorde: ${[...delen].sort((x, y) => y - x).map(getal).join(' + ')} = ${getal(n)}.` }
}
// "Het is 3 minuten voor half 11" → 10:27 op de digitale klok.
const klokWoorden = (h, m) => {
  const v = h % 12 + 1, min = (x) => `${x} minu${x === 1 ? 'ut' : 'ten'}`
  if (m === 0) return `${h} uur`
  if (m < 15) return `${min(m)} over ${h}`
  if (m === 15) return `kwart over ${h}`
  if (m < 30) return `${min(30 - m)} voor half ${v}`
  if (m === 30) return `half ${v}`
  if (m < 45) return `${min(m - 30)} over half ${v}`
  if (m === 45) return `kwart voor ${v}`
  return `${min(60 - m)} voor ${v}`
}
const klokWoordenV = () => {
  let m; do m = rnd(1, 59); while (m % 5 === 0)
  const h = rnd(1, 12), vb = h === 7 && m === 25 ? '8:10' : '7:25', tekst = klokWoorden(h, m)
  return { vraag: `${naam()} hoort op de radio: "Het is ${tekst}." Hoe schrijf je die tijd op een digitale klok? Schrijf het zo: ${vb}`,
           kaal: `${tekst[0].toUpperCase() + tekst.slice(1)} = … (digitaal, zo: ${vb})`,
           antwoordType: 'tijd', tijdH: h, tijdM: m, antwoord: `${h}:${PAD(m)}`,
           uitleg: `${tekst[0].toUpperCase() + tekst.slice(1)} is ${h}:${PAD(m)}.` }
}
// "Tel verder en terug": 5426 – 5526 – 5626 – … met sprongen van 1, 10, 100 of 1000.
const telSprongV = (max) => {
  const stap = pick(max > 10000 ? [100, 1000, 10000] : [1, 10, 100, 1000]), terug = Math.random() < 0.4, nm = naam()
  for (;;) {
    const start = terug ? rnd(stap * 4 + 1, max - 1) : rnd(1, max - stap * 4 - 1)
    const rij = [0, 1, 2, 3].map(i => start + (terug ? -i : i) * stap), volg = start + (terug ? -4 : 4) * stap
    // De moeilijkheid zit in de overgang (8956 – 9056): die moet erin zitten.
    if (stap * 10 < max && Math.floor(rij[0] / (stap * 10)) === Math.floor(volg / (stap * 10))) continue
    return { vraag: `${nm} doet een telspel en telt steeds ${getal(stap)} ${terug ? 'terug' : 'verder'}: ${rij.map(getal).join(' – ')} – … Welk getal zegt ${nm} daarna?`,
             kaal: `Tel ${terug ? 'terug' : 'verder'} met sprongen van ${getal(stap)}: ${rij.map(getal).join(' – ')} – …`, antwoord: volg,
             uitleg: `Steeds ${terug ? 'min' : 'plus'} ${getal(stap)}: ${getal(rij[3])} ${terug ? '−' : '+'} ${getal(stap)} = ${getal(volg)}.` }
  }
}
// "Maak een schatting": 3959 + 2210 ≈ 6000, kies uit ronde duizendtallen.
const schatPlusMinV = (soort) => {
  const bij = (k) => k * 1000 + pick([-1, 1]) * rnd(10, 180), min = soort === 'min'
  const ka = rnd(3, 7), kb = min ? rnd(1, ka - 2) : rnd(1, 4), a = bij(ka), b = bij(kb)
  const goed = min ? (ka - kb) * 1000 : (ka + kb) * 1000
  return { vraag: min
             ? `Een pretpark heeft ${getal(a)} kaartjes voor de zomerdag. Er zijn er al ${getal(b)} verkocht. Ongeveer hoeveel kaartjes zijn er nog over? Rond eerst af op duizendtallen.`
             : `Op zaterdag kwamen er ${getal(a)} bezoekers naar het pretpark en op zondag ${getal(b)}. Ongeveer hoeveel bezoekers waren dat samen? Rond eerst af op duizendtallen.`,
           kaal: `Schat: ${getal(a)} ${min ? '−' : '+'} ${getal(b)} ≈`,
           opties: kies4(getal(goed), [goed - 1000, goed + 1000, goed + 2000, goed - 2000].filter(x => x > 0).map(getal)), antwoord: getal(goed),
           uitleg: `${getal(a)} ≈ ${getal(ka * 1000)} en ${getal(b)} ≈ ${getal(kb * 1000)}. ${getal(ka * 1000)} ${min ? '−' : '+'} ${getal(kb * 1000)} = ${getal(goed)}.` }
}
// "Welk deel is opgegeten?" — het gekleurde deel is er nog.
const breukOpV = (zwaar) => {
  const noem = pick(zwaar ? [6, 8, 10, 12] : [3, 4, 5, 6]), over = rnd(1, noem - 1), op = noem - over
  const d = pick(['taart', 'pizza', 'reep chocola'])
  const vorm = d !== 'reep chocola' ? 'taart' : noem % 2 === 0 && noem >= 6 ? 'reep' : 'strook'
  return { vraag: `${naam()} snijdt een ${d} in ${noem} gelijke stukken. Het gekleurde deel is er nog. Welk deel is al opgegeten?`,
           kaal: `${over}/${noem} + … = 1 hele`, antwoord: `${op}/${noem}`, figuur: { type: 'breuk', vorm, n: noem, k: over },
           uitleg: `Er is nog ${over}/${noem}. Een hele is ${noem}/${noem}, dus er is ${noem}/${noem} − ${over}/${noem} = ${op}/${noem} opgegeten.` }
}
// "Teken de hele plank. Dit is 1/3 deel van de plank."
const heleTekenenV = (zwaar) => {
  const n = pick(zwaar ? [3, 4, 5, 6, 8] : [2, 3, 4, 5]), k = rnd(1, Math.min(n - 1, zwaar ? 3 : 2)), per = pick([10, 15, 20, 25, 30])
  return { vraag: `${naam()} heeft een stuk plank van ${k * per} cm. Dat is ${k}/${n} deel van de hele plank (het gekleurde deel). Hoe lang is de hele plank?`,
           kaal: `${k}/${n} deel is ${k * per} cm. De hele plank is … cm`, antwoord: n * per, eenheid: 'cm',
           figuur: { type: 'breuk', vorm: 'strook', n, k },
           uitleg: `${k}/${n} is ${k * per} cm, dus 1/${n} is ${per} cm. De hele plank is ${n} × ${per} = ${n * per} cm.` }
}
// "Hoe laat wordt het? 1 uur en 25 minuten later" en "Hoeveel later?"
const tijdLaterV = (soort) => {
  const h1 = rnd(7, 16), m1 = rnd(0, 11) * 5, du = rnd(soort === 'hoeveel' ? 1 : 0, 4), dm = rnd(1, 11) * 5
  const tot = h1 * 60 + m1 + du * 60 + dm, h2 = Math.floor(tot / 60), m2 = tot % 60
  const duur = `${du ? `${du} uur en ` : ''}${dm} minuten`
  if (soort === 'hoeveel') {
    return { vraag: `De film begint om ${h1}:${PAD(m1)} uur en is om ${h2}:${PAD(m2)} uur afgelopen. Hoeveel uur en minuten later is dat?`,
             kaal: `Van ${h1}:${PAD(m1)} tot ${h2}:${PAD(m2)} = … uur en … minuten`, antwoord: du, rest: dm,
             antwLabel: 'uur', restLabel: 'minuten', toon: `${du} uur en ${dm} minuten`,
             uitleg: `Van ${h1}:${PAD(m1)} tot ${h1 + du}:${PAD(m1)} is ${du} uur. Tot ${h2}:${PAD(m2)} nog ${dm} minuten.` }
  }
  return { vraag: `Het is ${h1}:${PAD(m1)} uur. De wedstrijd begint ${duur} later. Hoe laat begint de wedstrijd?`,
           kaal: `${h1}:${PAD(m1)} + ${duur} = …`, antwoordType: 'tijd', tijdH: h2, tijdM: m2, antwoord: `${h2}:${PAD(m2)}`,
           uitleg: `${h1}:${PAD(m1)} + ${du} uur = ${h1 + du}:${PAD(m1)}. Nog ${dm} minuten erbij: ${h2}:${PAD(m2)} uur.` }
}
// "Schrijf met cijfers: 2 en 58 honderdste" en "tel verder met een tiende".
const kommaSchrijfV = () => {
  const [woord, N, d] = pick([['tiende', 10, 1], ['honderdste', 100, 2], ['duizendste', 1000, 3]])
  let deel; do deel = rnd(1, N - 1); while (N > 10 && deel % 10 === 0)
  const heel = rnd(0, 9), w = +(heel + deel / N).toFixed(d), tekst = `${heel ? `${heel} en ` : ''}${deel} ${woord}`
  const [e, zin] = pick([['kg', 'De slager weegt het vlees'], ['m', 'De juf meet de tafel'], ['km', 'De app meet de wandeling'], ['liter', 'In de fles zit']])
  return { vraag: `${zin}: ${tekst} ${e}. Schrijf dat als kommagetal.`, kaal: `Schrijf met cijfers: ${tekst} =`,
           antwoord: w, eenheid: e, omrekenen: true, uitleg: `${tekst} = ${komma(w.toFixed(d))}` }
}
const kommaTelV = () => {
  const tiende = Math.random() < 0.6, dec = tiende ? pick([1, 2]) : 2, stap = tiende ? 10 ** (dec - 1) : 1, terug = Math.random() < 0.4
  const f = x => (x / 10 ** dec).toFixed(dec).replace('.', ',')
  for (;;) {
    const s = rnd(10 ** dec + stap * 4, 9 * 10 ** dec), rij = [0, 1, 2, 3].map(i => s + (terug ? -i : i) * stap), v = s + (terug ? -4 : 4) * stap
    if (Math.floor(rij[0] / (stap * 10)) === Math.floor(v / (stap * 10))) continue
    const wat = tiende ? 'tiende' : 'honderdste'
    return { vraag: `${naam()} telt steeds een ${wat} ${terug ? 'terug' : 'verder'}: ${rij.map(f).join(' – ')} – … Welk getal komt daarna?`,
             kaal: `Steeds een ${wat} ${terug ? 'minder' : 'meer'}: ${rij.map(f).join(' – ')} – …`, antwoord: v / 10 ** dec,
             uitleg: `${f(rij[3])} ${terug ? '−' : '+'} ${tiende ? '0,1' : '0,01'} = ${f(v)}` }
  }
}
// "Reken om naar de andere maat": 3 dm = 30 cm, 7000 m = 7 km.
const MAAT_DING = { km: 'fietstocht', hm: 'wandeling', m: 'tuin', dm: 'plank', cm: 'potlood', l: 'emmer', dl: 'kan', cl: 'beker' }
const maatOmV = (stappen) => {
  const [groot, klein, f] = pick(stappen), n = rnd(2, 9) * (Math.random() < 0.3 ? 10 : 1) + (Math.random() < 0.3 ? rnd(1, 9) : 0)
  const inhoud = ['l', 'dl', 'cl'].includes(groot), zin = (x, e) => inhoud ? `In de ${MAAT_DING[groot]} zit ${getal(x)} ${e}.` : `De ${MAAT_DING[groot]} is ${getal(x)} ${e} lang.`
  if (Math.random() < 0.4) {
    const k = n * f
    return { vraag: `${zin(k, klein)} Hoeveel ${groot} is dat?`, kaal: `${getal(k)} ${klein} = … ${groot}`, antwoord: n, eenheid: groot,
             uitleg: `1 ${groot} = ${getal(f)} ${klein}, dus ${getal(k)} ${klein} = ${getal(k)} : ${getal(f)} = ${n} ${groot}.` }
  }
  return { vraag: `${zin(n, groot)} Hoeveel ${klein} is dat?`, kaal: `${n} ${groot} = … ${klein}`, antwoord: n * f, eenheid: klein,
           uitleg: `1 ${groot} = ${getal(f)} ${klein}, dus ${n} ${groot} = ${n} × ${getal(f)} = ${getal(n * f)} ${klein}.` }
}
const LENGTE_STAP = [['km', 'm', 1000], ['m', 'cm', 100], ['dm', 'cm', 10], ['cm', 'mm', 10], ['m', 'dm', 10], ['hm', 'm', 100]]
const INHOUD_STAP = [['l', 'dl', 10], ['l', 'cl', 100], ['l', 'ml', 1000], ['dl', 'cl', 10], ['dl', 'ml', 100], ['cl', 'ml', 10]]
// "Hoeveel glazen kun je ermee vullen?" (1 liter, glazen van 2 dl)
const glazenVullenV = () => {
  const [fles, glas, n] = pick([[1000, 200, 5], [1000, 250, 4], [1500, 250, 6], [2000, 250, 8], [1500, 300, 5], [2000, 200, 10], [750, 150, 5], [1000, 125, 8]])
  const glasT = glas % 100 === 0 ? `${glas / 100} dl` : `${glas / 10} cl`, flesT = `${komma(fles / 1000)} liter`, nm = naam()
  return { vraag: `Een fles limonade bevat ${flesT}. ${nm} schenkt glazen van ${glasT}. Hoeveel glazen kan ${nm} vullen?`,
           kaal: `${flesT} : ${glasT} = … glazen`, antwoord: n, eenheid: 'glazen',
           uitleg: `${flesT} = ${fles} ml en ${glasT} = ${glas} ml. ${fles} : ${glas} = ${n}.` }
}
// Omtrek in cm, antwoord in meter met een komma (145 + 80 + 145 + 80 = 450 cm = 4,50 m).
const omtrekCmV = () => {
  const l = rnd(12, 38) * 5, b = rnd(8, Math.floor(l / 5) - 2) * 5, o = 2 * (l + b)
  return { vraag: `${naam()} plakt een lint rond een prikbord van ${l} cm bij ${b} cm. Hoeveel meter lint is dat? Schrijf het met een komma.`,
           kaal: `Omtrek van ${l} cm bij ${b} cm = … m`, antwoord: o / 100, eenheid: 'm', figuur: { type: 'rechthoek', l, b, eenheid: 'cm' },
           uitleg: `${l} + ${b} + ${l} + ${b} = ${o} cm = ${komma(o / 100)} m.` }
}
// Rekenen met te veel: 116 : 4 = 30 − 1, 6 × 49 = 6 × 50 − 6.
const teVeelDeelV = () => {
  const d = rnd(3, 8), q = pick([19, 28, 29, 38, 39, 48, 49]), boven = Math.ceil(q / 10) * 10, x = boven - q
  return { ...deelV(d, q), uitleg: `Rekenen met te veel: ${d} × ${boven} = ${d * boven}, dat is ${d * x} te veel. ${getal(d * q)} : ${d} = ${boven} − ${x} = ${q}.` }
}
const teVeelKeerV = () => {
  const a = rnd(3, 9), b = pick([38, 39, 48, 49, 58, 59, 68, 69, 78, 79, 88, 89, 98, 99]), boven = Math.ceil(b / 10) * 10, x = boven - b
  return { ...keerV(a, b), uitleg: `Rekenen met te veel: ${a} × ${boven} − ${a} × ${x} = ${a * boven} − ${a * x} = ${a * b}.` }
}
const splitsKeer35V = () => {   // 4 × 35 met splitsen
  const a = pick([2, 4, 6, 8]), b = pick([15, 25, 35, 45]), t = Math.floor(b / 10) * 10
  return { ...keerV(a, b), uitleg: `Splitsen: ${a} × ${t} + ${a} × ${b - t} = ${a * t} + ${a * (b - t)} = ${a * b}.` }
}
// Breuken en kommagetallen door elkaar vergelijken: 3/4, 0,7, 0,66 of 2/5?
const breukKommaOrdenV = () => {
  const BR = [['1/2', 0.5], ['1/4', 0.25], ['3/4', 0.75], ['1/5', 0.2], ['2/5', 0.4], ['3/5', 0.6], ['4/5', 0.8], ['1/10', 0.1], ['3/10', 0.3], ['7/10', 0.7], ['9/10', 0.9]]
  for (;;) {
    const alle = [pick(BR), pick(BR), ...[rnd(2, 98), rnd(2, 98)].map(x => [komma(x / 100), x / 100])]
    const w = alle.map(x => x[1]).sort((a, b) => a - b)
    if (w.some((v, i) => i && v - w[i - 1] < 0.02)) continue
    const groot = Math.random() < 0.5, goed = alle.find(x => x[1] === (groot ? w[3] : w[0]))[0]
    const lijst = [...alle].sort(() => Math.random() - 0.5).map(x => x[0])
    return { vraag: `Vier kinderen schenken een beker sap in: ${lijst.map(x => `${x} liter`).join(', ')}. Hoeveel liter zit er in de beker met het ${groot ? 'meeste' : 'minste'} sap?`,
             kaal: `Wat is het ${groot ? 'grootst' : 'kleinst'}: ${lijst.join(' – ')}?`, opties: lijst, antwoord: goed,
             uitleg: `Schrijf alles als kommagetal: ${[...alle].sort((a, b) => a[1] - b[1]).map(x => x[0].includes('/') ? `${x[0]} = ${komma(x[1])}` : x[0]).join(' < ')}. Het ${groot ? 'grootst' : 'kleinst'} is ${goed}.` }
  }
}
// Route volgen op de kaart (200 m oost, dan 400 m noord …) en de kortste route.
const windRouteV = (soort) => {
  const kol = 7, rij = 5, nm = naam(), vak = (x, y) => `${'ABCDEFGH'[x]}${y + 1}`
  for (;;) {
    const sx = rnd(0, kol - 1), sy = rnd(0, rij - 1), ex = rnd(0, kol - 1), ey = rnd(0, rij - 1), dx = ex - sx, dy = ey - sy
    if (!dx || !dy || Math.abs(dx) + Math.abs(dy) < 3) continue
    const oostWest = `${Math.abs(dx) * 100} m ${dx > 0 ? 'oost' : 'west'}`, noordZuid = `${Math.abs(dy) * 100} m ${dy > 0 ? 'zuid' : 'noord'}`
    if (soort === 'kortste') {
      const m = (Math.abs(dx) + Math.abs(dy)) * 100
      return { vraag: `Op de kaart is elk hokje 100 m. ${nm} staat bij de ster en wil naar de vlag. ${nm} mag alleen naar het noorden, oosten, zuiden of westen. Hoeveel meter is de kortste route?`,
               kaal: `Van de ster naar de vlag, alleen N, O, Z en W. Kortste route = … m`, antwoord: m, eenheid: 'm',
               figuur: { type: 'rooster', kol, rij, ster: [sx, sy], vlag: [ex, ey], per: 100 },
               uitleg: `${oostWest} en ${noordZuid}: ${Math.abs(dx) + Math.abs(dy)} hokjes × 100 m = ${m} m.` }
    }
    const tekst = Math.random() < 0.5 ? `${oostWest}, dan ${noordZuid}` : `${noordZuid}, dan ${oostWest}`
    const binnen = (x, y) => vak(Math.max(0, Math.min(kol - 1, x)), Math.max(0, Math.min(rij - 1, y)))
    return { vraag: `Op de kaart is elk hokje 100 m. ${nm} start bij de ster en loopt ${tekst}. In welk vak komt ${nm} uit?`,
             kaal: `Start bij de ster: ${tekst}. In welk vak kom je uit?`, antwoord: vak(ex, ey),
             opties: kies4(vak(ex, ey), [binnen(sx - dx, ey), binnen(ex, sy - dy), binnen(sx - dx, sy - dy), vak(ex, sy), vak(sx, ey)]),
             figuur: { type: 'rooster', kol, rij, ster: [sx, sy], per: 100 },
             uitleg: `Oost is naar rechts, west naar links, noord omhoog en zuid omlaag. Zo kom je in vak ${vak(ex, ey)}.` }
  }
}
// "4 op de 5 kinderen = …%", "3/5 deel = …%", "40% = … (breuk)".
const PCT_PAREN = [[1, 2, 50], [1, 4, 25], [3, 4, 75], [1, 5, 20], [2, 5, 40], [3, 5, 60], [4, 5, 80], [1, 10, 10], [3, 10, 30], [7, 10, 70], [9, 10, 90], [1, 20, 5]]
const pctKoppelV = () => {
  const [t, n, p] = pick(PCT_PAREN), [wie, wat] = pick([['kinderen', 'houden van spaghetti'], ['toeristen', 'logeren in een hotel'], ['leerlingen', 'fietsen naar school'], ['bezoekers', 'komen met de trein']])
  const k = rnd(1, 3)
  if (k === 1) return { vraag: `${t} op de ${n} ${wie} ${wat}. Hoeveel procent is dat?`, kaal: `${t} op de ${n} = … %`, antwoord: p, eenheid: '%', uitleg: `${t} op de ${n} = ${t}/${n} = ${p}%.` }
  if (k === 2) return { vraag: `${t}/${n} deel van de ${wie} ${wat}. Hoeveel procent is dat?`, kaal: `${t}/${n} = … %`, antwoord: p, eenheid: '%', uitleg: `${t}/${n} = ${p}/100 = ${p}%.` }
  return { vraag: `${p}% van de ${wie} ${wat}. Welk deel is dat? Schrijf de breuk zo klein mogelijk.`, kaal: `${p}% = … (breuk)`, antwoord: `${t}/${n}`, uitleg: `${p}% = ${p}/100 = ${t}/${n}.` }
}
// Aanbiedingen: "4 halen, 3 betalen", "4 + 1 gratis" en de beste aanbieding.
const aanbiedingV = () => {
  const k = rnd(1, 3), nm = naam()
  if (k === 1) {
    const [h, b, p] = pick([[2, 1, 50], [4, 3, 25], [5, 4, 20], [10, 9, 10]])
    return { vraag: `In de supermarkt hangt een bord: ${h} halen, ${b} betalen. Hoeveel procent korting krijg je dan?`, kaal: `${h} halen, ${b} betalen = … % korting`,
             antwoord: p, eenheid: '%', uitleg: `Van de ${h} krijg je er ${h - b} gratis: ${h - b}/${h} = ${p}% korting.` }
  }
  if (k === 2) {
    const [a, g, p] = pick([[1, 1, 50], [3, 1, 25], [4, 1, 20], [9, 1, 10]])
    return { vraag: `Op de pakken staat: ${a} + ${g} gratis. Hoeveel procent korting is dat?`, kaal: `${a} + ${g} gratis = … % korting`,
             antwoord: p, eenheid: '%', uitleg: `Je krijgt ${a + g} pakken en betaalt er ${a}. ${g} van de ${a + g} is gratis: ${g}/${a + g} = ${p}% korting.` }
  }
  for (;;) {
    const prijs = rnd(30, 80) * 5 / 100, q = pick([10, 20, 30]), n = 12
    const A = +(9 * prijs).toFixed(2), B = +(n * prijs * (100 - q) / 100).toFixed(2)
    if (A === B) continue
    return { vraag: `${nm} wil ${n} kaarsen van ${euro(prijs)} per stuk. Winkel A: 4 halen, 3 betalen. Winkel B: ${q}% korting. Hoeveel euro betaalt ${nm} bij de goedkoopste winkel?`,
             kaal: `${n} × ${euro(prijs)}: A = 4 halen 3 betalen, B = ${q}% korting. Goedkoopste = €`, antwoord: Math.min(A, B), eenheid: '€',
             uitleg: `A: je betaalt 9 van de 12 = 9 × ${euro(prijs)} = ${euro(A)}. B: ${n} × ${euro(prijs)} = ${euro(n * prijs)}, min ${q}% = ${euro(B)}. Het goedkoopst is ${euro(Math.min(A, B))}.` }
  }
}
// Verhoudingsgewijs vergelijken: welke verpakking is per liter of kilo goedkoper?
const goedkoperV = () => {
  for (;;) {
    const [wat, e, v1, v2] = pick([['sap', 'liter', 1.5, 2], ['limonade', 'liter', 1, 1.5], ['kaas', 'kg', 0.5, 0.75], ['appels', 'kg', 1.5, 2.5], ['pindakaas', 'kg', 0.25, 0.5]])
    const p1 = Math.round(v1 * rnd(80, 400)) / 100, p2 = Math.round(v2 * rnd(80, 400)) / 100
    if (Math.abs(p1 / v1 - p2 / v2) < 0.08) continue
    const goed = p1 / v1 < p2 / v2 ? 'A' : 'B'
    return { vraag: `Er zijn twee verpakkingen ${wat}. A: ${komma(v1)} ${e} voor ${euro(p1)}. B: ${komma(v2)} ${e} voor ${euro(p2)}. Welke is naar verhouding goedkoper?`,
             kaal: `A: ${komma(v1)} ${e} voor ${euro(p1)}. B: ${komma(v2)} ${e} voor ${euro(p2)}. Wat is goedkoper per ${e}?`, opties: ['A', 'B'], antwoord: goed,
             uitleg: `Per ${e}: A kost ${euro(p1 / v1)}, B kost ${euro(p2 / v2)}. ${goed} is goedkoper.` }
  }
}
// "Door welke getallen is 3055 deelbaar?" — de deelbaarheidsregel erbij.
const DEEL_REGEL = { 2: 'het laatste cijfer even is', 5: 'het getal eindigt op 0 of 5', 10: 'het getal eindigt op 0', 4: 'het getal van de laatste twee cijfers deelbaar is door 4',
  3: 'de som van de cijfers deelbaar is door 3', 9: 'de som van de cijfers deelbaar is door 9', 8: 'het getal van de laatste drie cijfers deelbaar is door 8' }
const deelbaarJaNeeV = (zwaar) => {
  const deler = pick(zwaar ? [3, 8, 9] : [2, 4, 5, 10]), ja = Math.random() < 0.5
  const n = deler * rnd(Math.ceil(1001 / deler), Math.floor(9989 / deler)) + (ja ? 0 : rnd(1, deler - 1))
  return { vraag: `${naam()} heeft ${getal(n)} knikkers en wil ze in zakjes van ${deler} doen, zonder dat er knikkers overblijven. Kan dat? Is ${getal(n)} deelbaar door ${deler}?`,
           kaal: `Is ${getal(n)} deelbaar door ${deler}?`, opties: ['ja', 'nee'], antwoord: ja ? 'ja' : 'nee',
           uitleg: `Een getal is deelbaar door ${deler} als ${DEEL_REGEL[deler]}. ${getal(n)} : ${deler} = ${getal(Math.floor(n / deler))}${ja ? '' : ` rest ${n % deler}`}, dus ${ja ? 'ja' : 'nee'}.` }
}
// "In welke groep zitten naar verhouding meer meisjes?"
const naarVerhoudingV = () => {
  for (;;) {
    const a = rnd(20, 32), b = rnd(20, 32), x = rnd(Math.ceil(a * 0.3), Math.floor(a * 0.8)), y = rnd(Math.ceil(b * 0.3), Math.floor(b * 0.8))
    if (a === b || Math.abs(x / a - y / b) < 0.03) continue
    const goed = x / a > y / b ? '8a' : '8b', [wie, wat] = pick([['meisjes', 'zijn meisjes'], ['sporters', 'zitten op een sportclub'], ['fietsers', 'komen op de fiets']])
    return { vraag: `In groep 8a zitten ${a} kinderen; ${x} daarvan ${wat}. In groep 8b zitten ${b} kinderen; ${y} daarvan ${wat}. In welke groep zijn naar verhouding de meeste ${wie}?`,
             kaal: `8a: ${x} van de ${a}. 8b: ${y} van de ${b}. Waar naar verhouding meer?`, opties: ['8a', '8b'], antwoord: goed,
             uitleg: `8a: ${x}/${a} ≈ ${Math.round(x / a * 100)}%. 8b: ${y}/${b} ≈ ${Math.round(y / b * 100)}%. Dus ${goed}.` }
  }
}
// Klopt de krantenkop bij het diagram?
const nieuwsV = () => {
  const a = rnd(2, 8) * 10, dubbel = Math.random() < 0.5, klopt = Math.random() < 0.5
  const b = dubbel ? (klopt ? a * 2 : a + rnd(1, 3) * 5) : (klopt ? a / 2 : a - rnd(1, 2) * 5)
  const kop = dubbel ? 'Twee keer zoveel bezoekers als vorig jaar!' : 'Aantal bezoekers gehalveerd!'
  return { vraag: `In de krant staat: "${kop}" Bij het artikel staat dit diagram van de bezoekers van de kinderboerderij (in duizenden). Klopt de kop?`,
           kaal: `"${kop}" Klopt dat met het diagram?`, opties: ['ja', 'nee'], antwoord: klopt ? 'ja' : 'nee',
           figuur: { type: 'staaf', items: [{ label: '2025', waarde: a }, { label: '2026', waarde: b }], step: 5, titel: 'bezoekers (×1000)' },
           uitleg: `Vorig jaar ${a}, dit jaar ${b}. ${dubbel ? `Twee keer zoveel is ${a * 2}` : `De helft is ${a / 2}`}, dus de kop ${klopt ? 'klopt' : 'klopt niet'}.` }
}
// Combinaties waarbij de volgorde wel of niet belangrijk is.
const tweetallenV = () => {
  const n = rnd(4, 8)
  if (Math.random() < 0.5) {
    return { vraag: `Er doen ${n} kinderen mee aan een tafeltennistoernooi. Iedereen speelt één keer tegen iedereen. Hoeveel wedstrijden zijn dat? (De volgorde maakt niet uit.)`,
             kaal: `${n} kinderen, iedereen 1 keer tegen iedereen = … wedstrijden`, antwoord: n * (n - 1) / 2, eenheid: 'wedstrijden',
             uitleg: `Elk kind speelt ${n - 1} keer: ${n} × ${n - 1} = ${n * (n - 1)}. Zo tel je elke wedstrijd twee keer, dus ${n * (n - 1)} : 2 = ${n * (n - 1) / 2}.` }
  }
  return { vraag: `${n} kinderen lopen een hardloopwedstrijd. Hoeveel verschillende uitslagen zijn er voor de 1e en de 2e plaats? (Hier is de volgorde wél belangrijk.)`,
           kaal: `${n} kinderen: 1e en 2e plaats = … mogelijkheden`, antwoord: n * (n - 1),
           uitleg: `Voor de 1e plaats zijn er ${n} kinderen, voor de 2e nog ${n - 1}: ${n} × ${n - 1} = ${n * (n - 1)}.` }
}
// Breuk × breuk (2/3 × 3/4) en een breuk van een hoeveelheid (2/3 van 27 km).
const breukMaalBreuk2V = () => {
  const P = [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 8], [5, 8]], [t1, n1] = pick(P), [t2, n2] = pick(P)
  const t = t1 * t2, n = n1 * n2, g = ggd(t, n)
  return { vraag: `Van een taart is nog ${t1}/${n1} over. ${naam()} eet ${t2}/${n2} van dat stuk op. Welk deel van de héle taart is dat? Schrijf de breuk zo klein mogelijk.`,
           kaal: `${t1}/${n1} × ${t2}/${n2} =`, antwoord: `${t / g}/${n / g}`,
           uitleg: `Teller × teller en noemer × noemer: ${t1} × ${t2} = ${t} en ${n1} × ${n2} = ${n}. Dus ${t}/${n}${g > 1 ? ` = ${t / g}/${n / g}` : ''}.` }
}
const breukVanKmV = () => {
  const [t, n] = pick([[2, 3], [3, 4], [5, 6], [3, 5], [2, 5], [4, 5], [5, 8], [7, 10]]), tot = n * rnd(4, 15), nm = naam()
  return { vraag: `${nm} fietst in totaal ${tot} km. ${nm} heeft al ${t}/${n} deel gefietst. Hoeveel km is dat?`,
           kaal: `${t}/${n} × ${tot} =`, antwoord: tot / n * t, eenheid: 'km',
           uitleg: `${tot} : ${n} = ${tot / n}. ${t} × ${tot / n} = ${tot / n * t} km.` }
}
// Afronden op een eenheid, een tiende of een honderdste (452,372 → 452,4).
const kommaAfrondV = () => {
  const [factor, d, woord] = pick([[1000, 0, 'een heel getal'], [100, 1, 'een tiende'], [10, 2, 'een honderdste']])
  const xi = rnd(100000, 999999), af = Math.floor((xi + factor / 2) / factor) * factor / 1000, x = xi / 1000
  return { vraag: `Op de weegschaal van de groothandel staat ${komma(x)} kg. Rond dat af op ${woord}.`, kaal: `Rond ${komma(x)} af op ${woord}`,
           antwoord: af, eenheid: 'kg', uitleg: `${komma(x)} afgerond op ${woord} = ${komma(af.toFixed(d))}.` }
}
// Haakjes eerst: (4 + 20) : 4.
const haakjesV = () => {
  const c = rnd(2, 6), s = c * rnd(3, 9), a = rnd(1, s - 1), b = s - a, n = naam(), d = ding()
  return { vraag: `${n} heeft ${a} ${d[1]} en krijgt er ${b} bij. Daarna verdeelt ${n} ze eerlijk over ${c} zakjes. Hoeveel ${d[1]} gaan er in één zakje?`,
           kaal: `(${a} + ${b}) : ${c} =`, antwoord: s / c, eenheid: d[1],
           uitleg: `Eerst wat tussen de haakjes staat: ${a} + ${b} = ${s}. Dan ${s} : ${c} = ${s / c}.` }
}
// 24 × 0,67: een heel getal keer een kommagetal.
const heelKommaV = () => {
  const n = rnd(12, 48), p = rnd(35, 95) / 100
  return { vraag: `De klas koopt ${n} pakjes drinken van ${euro(p)}. Hoeveel kost dat samen? Schat eerst, reken dan zonder komma en zet de komma op de goede plaats.`,
           kaal: `${n} × ${komma(p)} =`, antwoord: +(n * p).toFixed(2), eenheid: '€',
           uitleg: `Schatting: ${n} × ${komma(Math.round(p * 10) / 10)} ≈ ${komma(+(n * Math.round(p * 10) / 10).toFixed(1))}. Zonder komma: ${n} × ${Math.round(p * 100)} = ${n * Math.round(p * 100)}, dus ${euro(n * p)}.` }
}

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
        { label: 'waarde van een cijfer', gen: () => cijferWaarde4V() },
        { label: 'samenstellen', gen: () => samenstelV() },
      ]),
      D('Je leert sommen als 1200 + 1300, 4500 - 1200, 3 × 700 en 4500 : 9 vlot uitrekenen door te rekenen met de kleine som.', [
        { label: 'plus en min', soorten: [
          { label: 'plus', gen: () => optelV(rnd(11, 80) * 100, rnd(11, 40) * 100) },
          { label: 'min', gen: () => { const a = rnd(25, 90) * 100, b = rnd(11, Math.floor(a / 100) - 5) * 100; return aftrekV(a, b) } },
        ] },
        { label: 'keer en delen', soorten: [
          { label: 'keer', gen: () => keerV(rnd(2, 9), rnd(2, 9) * 100) },
          { label: 'delen', gen: () => deelV(rnd(2, 9), rnd(2, 9) * 100) },
        ] },
      ]),
      D('Je leert meten met stroken en de uitkomst opschrijven in breukentaal, en je leert dat breuken ontstaan uit eerlijk verdelen.', [
        { label: 'meten met stroken', gen: () => strookMetenV() },
        { label: 'eerlijk verdelen', gen: () => eerlijkVerdelenV() },
      ]),
      D('Je leert van een klok met wijzers de tijd op de minuut nauwkeurig aflezen en van een digitale klok de minuten aflezen en aangeven.', [
        { label: 'tijd in woorden', gen: () => klokWoordenV() },
        { label: 'op de minuut nauwkeurig', gen: () => klokV(Array.from({ length: 60 }, (_, i) => i)) },
      ]),
    ],
    2: [
      D('Je leert tellen tot en met 10.000 met sprongen van 1, 10, 100 en 1000, getallen op volgorde zetten en schattend plaatsen en aflezen op de getallenlijn.', [
        { label: 'tel verder en terug', gen: () => telSprongV(10000) },
        { label: 'op de getallenlijn', gen: () => getallenlijnV(rnd(0, 5) * 1000, 5000) },
      ]),
      D('Je leert sommen als 368 + 257 kolomsgewijs optellen en je begrijpt wat je opschrijft.', [
        { label: 'basis', gen: () => optelV(rnd(140, 480), rnd(140, 380)) },
        { label: 'grotere getallen', gen: () => optelV(rnd(340, 680 + M * 200), rnd(240, 680)) },
      ]),
      D('Je leert bij een plaatje aangeven welk deel gekleurd is en welke breuk erbij hoort.', [
        { label: 'welk deel is gekleurd', gen: () => breukPlaatjeV('gekleurd') },
        { label: 'welk deel is niet gekleurd', gen: () => breukPlaatjeV('rest') },
      ]),
      D('Je leert hoe je een plaats op een kaart kunt vinden en hoe je de lengte van een route kunt berekenen.', [
        { label: 'plaats op de kaart', gen: () => roosterPlaatsV() },
        { label: 'lengte van een route', gen: () => roosterRouteV(Math.random() < 0.5) },
      ]),
    ],
    3: [
      D('Je leert getallen afronden op tientallen, honderdtallen en duizendtallen, en optellen en aftrekken met de afgeronde getallen.', [
        { label: 'afronden', gen: () => afrondV(9800, [10, 100, 1000]) },
        { label: 'schatten met afgeronde getallen', soorten: [
          { label: 'plus', gen: () => schatPlusMinV('plus') },
          { label: 'min', gen: () => schatPlusMinV('min') },
        ] },
      ]),
      D('Je leert sommen als 92 : 4 uitrekenen met de basisstrategie splitsen.', [
        { label: 'basis', gen: () => deelV(rnd(3, 4), rnd(21, 69)) },
        { label: 'grotere getallen', gen: () => deelV(rnd(5, 8), rnd(31, 79)) },
      ]),
      D('Je leert een breuk aanvullen tot een hele en bij een deel de hele tekenen.', [
        { label: 'welk deel is op', gen: () => breukOpV(Math.random() < 0.4) },
        { label: 'de hele tekenen', gen: () => heleTekenenV(Math.random() < 0.4) },
      ]),
      D('Je leert uitrekenen hoe laat het over een bepaalde tijd is en hoeveel uren en minuten het later is.', [
        { label: 'hoe laat wordt het', gen: () => tijdLaterV('later') },
        { label: 'hoeveel later', gen: () => tijdLaterV('hoeveel') },
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
        { label: 'vanaf 0', gen: () => breukLijnV(false) },
        { label: 'vanaf een willekeurig getal', gen: () => breukLijnV(true) },
      ]),
      D('Je leert de maten kilogram en gram en de maten liter, deciliter, centiliter en milliliter gebruiken.', [
        { label: 'kilogram en gram', gen: () => maatKiezen('gewicht') },
        { label: 'liter, dl, cl en ml', gen: () => maatKiezen('inhoud') },
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
        { label: 'met afbeeldingen', gen: () => breukVergelijkPlaatjeV(false) },
        { label: 'op de getallenlijn', gen: () => breukVergelijkPlaatjeV(true) },
      ]),
      D('Je leert tijden aflezen en aangeven op de seconde nauwkeurig en tijden omrekenen in minuten en seconden.', [
        { label: 'minuten naar seconden', gen: () => tijdNaarSecV(false) },
        { label: 'langere tijden', gen: () => tijdNaarSecV(true) },
      ]),
    ],
    6: [
      D('Je leert tellen tot en met 100.000 met sprongen van 1, 10, 100, 1000 en 10.000, getallen splitsen, samenstellen, schrijven, op volgorde zetten en schattend plaatsen op de getallenlijn.', [
        { label: 'tel verder en terug', gen: () => telSprongV(100000) },
        { label: 'plaatsen op de getallenlijn', gen: () => getallenlijnV(rnd(0, 5) * 10000, 50000) },
      ]),
      D('Je leert sommen als 826 : 9 (met rest) uitrekenen met de basisstrategie splitsen.', [
        { label: 'zonder rest', gen: () => deelV(rnd(3, 9), rnd(40, 99)) },
        { label: 'met rest', gen: () => { const deler = rnd(3, 9); return deelRestV(deler, rnd(40, 99), rnd(1, deler - 1)) } },
      ]),
      D('Je leert de betekenis van kommagetallen bij diverse maten en geld, en het lezen en schrijven van benoemde en onbenoemde kommagetallen met 1, 2 en 3 cijfers achter de komma.', [
        { label: 'schrijven met cijfers', gen: () => kommaSchrijfV() },
        { label: 'tellen met tienden', gen: () => kommaTelV() },
      ]),
      D('Je leert de maten kilometer, hectometer, meter, decimeter, centimeter en millimeter omrekenen, maten in meter met een komma opschrijven en de omtrek van een figuur berekenen.', [
        { label: 'maten omrekenen', gen: () => maatOmV(LENGTE_STAP) },
        { label: 'omtrek berekenen', gen: () => omtrekCmV() },
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
        { label: 'datum en tijdbalk', gen: () => (Math.random() < 0.6 ? datumTijdbalkV() : datumV()) },
        { label: 'met de kalender', gen: () => jaarkalenderV() },
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
        { label: 'tienden', gen: () => kommaLijnV([1]) },
        { label: 'honderdsten', gen: () => kommaLijnV([2]) },
      ]),
      D('Je leert de inhoud aflezen bij maatbekers en de maten liter, deciliter, centiliter en milliliter omrekenen, en maten in liter met een komma opschrijven.', [
        { label: 'maten omrekenen', gen: () => (Math.random() < 0.4 ? glazenVullenV() : maatOmV(INHOUD_STAP)) },
        { label: 'aflezen op de maatbeker', gen: () => maatbekerV() },
      ]),
    ],
    9: [
      D(plus ? 'Je leert sommen als 138 : 3 met de basisstrategie splitsen en sommen als 147 : 3 met rekenen met te veel uitrekenen.' : 'Je leert sommen als 138 : 3 uitrekenen met de basisstrategie splitsen.', [
        { label: 'splitsen', gen: () => deelV(rnd(3, 6), rnd(21, 59)) },
        plus
          ? { label: 'rekenen met te veel', gen: () => teVeelDeelV() }
          : { label: 'grotere getallen', gen: () => deelV(rnd(3, 8), rnd(41, 79)) },
      ]),
      D(plus ? 'Je leert sommen als 3 × 67 met splitsen, 4 × 69 met rekenen met te veel en 4 × 35 met halveren en verdubbelen uitrekenen.' : 'Je leert sommen als 3 × 67 en 4 × 35 uitrekenen met de basisstrategie splitsen.', [
        { label: '3 × 67 (splitsen)', gen: () => keerV(rnd(3, 6), rnd(41, 89)) },
        plus
          ? { label: 'te veel en halveren', soorten: [
              { label: '4 × 69 (te veel)', gen: () => teVeelKeerV() },
              { label: '4 × 35 (halveren en verdubbelen)', gen: () => halveerV([4, 6, 8]) },
            ] }
          : { label: '4 × 35 (splitsen)', gen: () => splitsKeer35V() },
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
        { label: 'schatten met geld', gen: ofToets(() => schatGeldV(plus), T.genoegGeld) },
        { label: 'schatten met ronde getallen', soorten: [
          { label: 'keer', gen: () => schatKeerV(plus) },
          { label: 'delen', gen: () => schatDeelV(plus) },
        ] },
      ]),
      D(plus ? 'Je leert sommen als 4 × 231 en 4 × 36 cijferend uitrekenen, en je begrijpt wat je opschrijft.' : 'Je leert sommen als 4 × 231 en 4 × 536 cijferend of kolomsgewijs uitrekenen, en je begrijpt wat je opschrijft.', [
        { label: 'cijferen', gen: () => cijferKeer3V('cijferen') },
        { label: plus ? 'grotere getallen' : 'kolomsgewijs', gen: () => cijferKeer3V(plus ? 'cijferen' : 'kolom') },
      ]),
      D('Je leert benoemde en onbenoemde kommagetallen t/m duizendsten vergelijken en ordenen.', [
        { label: 'vergelijken', gen: () => kommaGroterV(plus) },
        { label: 'ordenen', gen: () => kommaOrdenenV(plus) },
      ]),
      D('Je leert rekenen met lijndiagrammen en een beelddiagram aflezen.', [
        { label: 'lijndiagram', gen: () => tempV() },
        { label: 'beelddiagram', gen: () => beeldV() },
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
    let deler
    do deler = rnd(15, 95) / 10; while (Number.isInteger(deler))
    const q = rnd(2, zwaar ? 14 : 9), deeltal = +(deler * q).toFixed(2)
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
        { label: 'oppervlakte', soorten: [
          { label: 'rechthoek', gen: () => opp('rechthoek') },
          { label: 'driehoek', gen: () => opp('driehoek') },
        ] },
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
        { label: 'afronden', gen: () => (Math.random() < 0.6 ? miljoenV('afronden') : kommaAfrondV()) },
      ]),
      D(plus ? 'Je leert optellen en aftrekken met benoemde en onbenoemde kommagetallen.' : 'Je herhaalt het optellen en aftrekken van benoemde kommagetallen.', [
        { label: 'optellen', gen: () => kommaOptel('plus') },
        { label: 'aftrekken', gen: () => kommaOptel('min') },
      ]),
      D('Je herhaalt het koppelen van percentages aan breuken en verhoudingen en leert hoe je handig verhoudingsproblemen oplost.', [
        { label: 'percentages', gen: () => pctKoppelV() },
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
        { label: 'grotere noemers', gen: () => breukMaalBreuk2V() },
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
          : { label: 'deel van een geheel', gen: () => breukProbleemV('deel') },
        plus
          ? { label: 'grotere noemers', gen: () => breukDeelV(true) }
          : { label: 'op de getallenlijn', gen: () => breukProbleemV('lijn') },
      ]),
      D('Je leert rekenen met breuken, kommagetallen, procenten en verhoudingen bij verschillende aanbiedingen.', [
        { label: 'korting', gen: () => nieuwePrijsV() },
        { label: 'aanbiedingen', gen: () => aanbiedingV() },
      ]),
      D('Je leert berekeningen maken met samengestelde grootheden, zoals de prijs per oppervlakte of gewicht, en verhoudingsgewijs vergelijken.', [
        { label: 'prijs per kilo', gen: () => samengesteld(false) },
        { label: 'verhoudingsgewijs vergelijken', gen: () => goedkoperV() },
      ]),
    ],
    5: [
      D(plus ? 'Je leert herkennen wanneer een getal deelbaar is door 2, 10, 5 of 4 en door 8, 3 en 9.' : 'Je leert herkennen wanneer een getal deelbaar is door 2, 10, 5 of 4.', [
        { label: 'deelbaar door 2, 4, 5 en 10', gen: () => restV(false) },
        plus
          ? { label: 'deelbaar door 3, 8 en 9', gen: () => restV(true) }
          : { label: 'grotere getallen', gen: () => restV(false, true) },
      ]),
      D(plus ? 'Je leert sommen als 3,5 : 0,5 met verhoudingen en sommen als 16,2 : 3 met splitsen uitrekenen.' : 'Je herhaalt sommen als 18,6 kg : 3 uitrekenen met de strategie splitsen.', [
        { label: 'delen door een heel getal', gen: () => kommaDeelV() },
        plus
          ? { label: 'delen door een kommagetal', gen: () => kommaDelenV(false) }
          : { label: 'grotere bedragen', gen: () => kommaDeelV(true) },
      ]),
      D('Je leert contextproblemen over procenten, verhoudingen, breuken en kommagetallen oplossen.', [
        { label: 'procenten', gen: () => procentRedeneerV(false) },
        { label: 'naar verhouding', gen: () => naarVerhoudingV() },
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
        { label: 'percentage, breuk en verhouding', gen: () => pctKoppelV() },
        { label: 'korting', gen: () => pick([nieuwePrijsV, kortingPctV])() },
      ]),
      D(plus ? 'Je herhaalt ongelijknamige breuken optellen en vermenigvuldigen met breuken.' : 'Je herhaalt benoemde gelijknamige breuken optellen en het berekenen van een deel van een hoeveelheid.', [
        { label: 'breuken optellen', gen: () => (plus ? breukOptelOngelijkV() : breukOptelGelijkV()) },
        plus
          ? { label: 'breuk van een hoeveelheid', gen: () => breukVanKmV() }
          : { label: 'deel van een hoeveelheid', gen: () => deelVanGeheelV() },
      ]),
      D('Je oriënteert je op getallen en grafieken uit het nieuws en of die kloppen.', [
        { label: 'aflezen', gen: () => diagramV('staaf', pick([5, 10]), rnd(3, 9), 'lees') },
        { label: 'klopt het?', gen: () => nieuwsV() },
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
        { label: 'plus en min', soorten: [
          { label: 'plus', gen: () => kommaOptel('plus') },
          { label: 'min', gen: () => kommaOptel('min') },
        ] },
        { label: 'keer en delen', soorten: [
          { label: 'keer', gen: () => kommaKeerV() },
          { label: 'delen', gen: () => kommaDeelV() },
        ] },
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
        { label: 'volgorde wel of niet belangrijk', gen: () => tweetallenV() },
      ]),
    ],
  }
}

// Toetsvormen van groep 6 en 8 (toetsvormen6.js, toetsvormen8.js) als variant
// bij de bestaande doelen: `vormen` is per blok een rij met per doel (in de
// volgorde van het blok) een generator of null.
// Alleen op doelniveau (item.gen): vrij oefenen en de weektaak krijgen de
// toetsvorm, maar een lesdeel (lescheck, gensVoorDeel) blijft precies de soort
// som van die les — anders kreeg "zonder rest" ook sommen met rest.
function metToetsvormen(blokken, vormen) {
  for (const [blok, perDoel] of Object.entries(vormen)) {
    perDoel.forEach((toets, i) => {
      const item = blokken[blok]?.[i]
      if (toets && item) item.gen = ofToets(item.gen, toets)
    })
  }
  return blokken
}

// ── Curriculum per groep en route ──
const CURR = {
  5: { single: metToetsvormen(maakGroep5(), TOETS_GROEP5) },
  6: { 'FS': metToetsvormen(maakGroep6(false), TOETS_GROEP6), 'S+': metToetsvormen(maakGroep6(true), TOETS_GROEP6) },
  7: { 'FS': metToetsvormen(maakBlokken(false), toetsGroep7(false)), 'S+': metToetsvormen(maakBlokken(true), toetsGroep7(true)) },
  8: { 'FS': metToetsvormen(maakGroep8(false), toetsGroep8(false)), 'S+': metToetsvormen(maakGroep8(true), toetsGroep8(true)) },
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
  { key: 'getal',      label: 'Getallen & getalbegrip' },
  { key: 'plusmin',    label: 'Optellen & aftrekken' },
  { key: 'keerdeel',   label: 'Keer- & deelsommen' },
  { key: 'breuk',      label: 'Breuken' },
  { key: 'komma',      label: 'Kommagetallen & geld' },
  { key: 'procent',    label: 'Procenten' },
  { key: 'verhouding', label: 'Verhoudingen, schaal & snelheid' },
  { key: 'meten',      label: 'Meten & meetkunde' },
  { key: 'tijd',       label: 'Tijd & kalender' },
  { key: 'diagram',    label: 'Diagrammen & data' },
  { key: 'schatten',   label: 'Schatten & rekenmachine' },
  { key: 'overig',     label: 'Overige doelen' },
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

// De generatoren van één lesdeel: één per soort som, in vaste volgorde. Twee
// soorten = twee sommen voor het kind (eerst de plus, dan de min).
export function gensVoorDeel(groep, route, key, deelNr) {
  const item = alleDoelen(groep, route).find(a => a.key === key)
  const deel = item?.delen?.[deelNr - 1]
  if (!deel) return null
  return deel.soorten.map(s => ({
    groep: item.groep, blok: item.blok, doel: item.doel, gen: s.gen, soort: s.label,
  }))
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
  if (typeof antwoord !== 'number') return null      // breuk als antwoord: geen som te controleren
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
  // Breuk als antwoord ("2/3"): elke breuk met dezelfde waarde is goed (4/6),
  // en boven de 1 ook als gemengd getal ("9/4" = "2 1/4").
  if (typeof antwoord === 'string' && antwoord.includes('/')) {
    const [t, n] = antwoord.split('/').map(Number)
    const m = String(input).trim().replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').match(/^(?:(\d+) )?(\d+)\/(\d+)$/)
    if (!m || +m[3] === 0) return false
    return ((+(m[1] ?? 0)) * +m[3] + +m[2]) * n === t * +m[3]
  }
  // Kommagetal als tekst ("6,17"): precies dat getal, geen speling, want
  // 6,169 ligt er maar 0,001 naast. Een extra nul (6,170) mag wel.
  if (typeof antwoord === 'string') {
    const getalVan = (x) => parseFloat(String(x).toLowerCase().replace(/km|kg|cm|€|\bm\b|\bl\b/g, '').replace(/\s/g, '').replace(',', '.'))
    const v = getalVan(input)
    return !Number.isNaN(v) && Math.abs(v - getalVan(antwoord)) < 1e-9
  }
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
