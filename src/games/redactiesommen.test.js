import { describe, it, expect } from 'vitest'
import { onderdelenVan, doelenVanBlok, checkSom, checkAntwoord } from './redactiesommen.js'

// De verhaaltjessommen worden gegenereerd, dus een fout laat zich niet met het
// blote oog vinden: hij komt pas bij de zoveelste opgave langs. Deze test
// draait elke generator honderden keren en let op dingen die aantoonbaar mis
// zijn geweest — klassen met 5,33 kinderen, een touwstuk van 0,128 meter, en
// "je eet er 9 op" terwijl je er 8 hebt.

const ROUTES = { 5: ['single'], 6: ['FS', 'S+'], 7: ['FS', 'S+'], 8: ['FS', 'S+'] }
const RONDES = 250

function alleGenerators() {
  const uit = []
  for (const groep of [5, 6, 7, 8]) {
    for (const route of ROUTES[groep]) {
      for (const blok of onderdelenVan(groep, route, 'blok')) {
        if (!blok.key.startsWith('blok-')) continue
        for (const g of blok.gens) uit.push({ groep, route, blok: blok.label, ...g })
      }
    }
  }
  return uit
}

const GENERATORS = alleGenerators()

describe('verhaaltjessommen', () => {
  // Bij doelen die óver een plaatje gaan, hoort de som een plaatje te hebben —
  // ook als kale som. [deel van de doeltekst, minimaal aandeel met plaatje]
  const PLAATJE_NODIG = [
    [/bij een plaatje aangeven welk deel gekleurd/, 1], [/meten met stroken/, 1], [/breuken schattend plaatsen en aflezen op de getallenlijn/, 1],
    [/breuken met elkaar vergelijken met behulp van afbeeldingen/, 1], [/jaarkalender aflezen/, 1], [/vanuit een bepaald standpunt ziet/, 1],
    [/namen van figuren en vormen/, 1], [/plaats op een kaart kunt vinden/, 0.6],
    [/inhoud aflezen bij maatbekers/, 0.3], [/bij een deelverhaal of (een )?plaatje een deelsom/, 0.35], [/met een schaallijntje een lengte op schaal/, 0.6],
    [/lijndiagrammen en een beelddiagram/, 1], [/stapeldiagram en een lijndiagram/, 1],
    [/windrichtingen gebruiken/, 1], [/een deel aflezen van een staafdiagram/, 0.12], [/breuk aanvullen tot een hele/, 1], [/omtrek en de oppervlakte van een cirkel/, 1], [/negatieve getallen en op Romeinse/, 0.3],
    [/oppervlakte berekenen van rechthoeken en eenvoudige figuren/, 0.5],
  ]
  it('geeft een plaatje bij doelen die over een plaatje gaan', () => {
    for (const [re, min] of PLAATJE_NODIG) {
      const gens = GENERATORS.filter(g => re.test(g.doel))
      expect(gens.length, `geen doel gevonden voor ${re}`).toBeGreaterThan(0)
      for (const g of gens) {
        let met = 0
        for (let n = 0; n < 200; n++) if (g.gen().figuur) met++
        expect(met / 200, `groep ${g.groep} ${g.route} ${g.blok}: ${g.doel.slice(0, 50)} — te weinig plaatjes`).toBeGreaterThanOrEqual(min)
      }
    }
  })

  // "Kale sommen" (VerhaaltjesSommen met kaleSommen) toont altijd opgave.kaal;
  // zonder kale som zou het kind toch het verhaaltje krijgen.
  it('heeft bij elk doel een kale som', () => {
    for (const g of GENERATORS) {
      for (let n = 0; n < 60; n++) {
        const o = g.gen()
        expect(typeof o.kaal, `groep ${g.groep} ${g.route} ${g.blok}: ${g.doel.slice(0, 45)}`).toBe('string')
        expect(o.kaal).not.toBe(o.vraag)
      }
    }
  })

  it('heeft generatoren voor alle vier de groepen', () => {
    expect(GENERATORS.length).toBeGreaterThan(150)
    for (const groep of [5, 6, 7, 8]) {
      expect(GENERATORS.some((g) => g.groep === groep), `groep ${groep}`).toBe(true)
    }
  })

  it('maakt nooit een opgave met een onmogelijk getal erin', () => {
    for (const g of GENERATORS) {
      const waar = `groep ${g.groep} ${g.route} ${g.blok}: ${g.doel.slice(0, 45)}`
      for (let n = 0; n < RONDES; n++) {
        const o = g.gen()
        const vraag = String(o.vraag)
        // Vier of meer cijfers achter een punt kan geen Nederlands
        // duizendtalscheidingsteken zijn; dat is altijd een rekenfout.
        expect(vraag, `${waar}: raar getal`).not.toMatch(/\d\.\d{4,}/)
        expect(vraag, `${waar}: NaN of undefined`).not.toMatch(/NaN|undefined|Infinity/)
        if (o.uitleg) {
          expect(String(o.uitleg), `${waar}: uitleg`).not.toMatch(/\d\.\d{4,}|NaN|undefined/)
        }
      }
    }
  })

  it('geeft antwoorden die een kind kan opschrijven', () => {
    // Alleen het doel over negatieve getallen mag onder nul uitkomen.
    const magNegatief = (doel) => /negatieve getallen/i.test(doel)
    for (const g of GENERATORS) {
      const waar = `groep ${g.groep} ${g.route} ${g.blok}: ${g.doel.slice(0, 45)}`
      for (let n = 0; n < RONDES; n++) {
        const o = g.gen()
        if (typeof o.antwoord !== 'number') continue
        expect(Number.isFinite(o.antwoord), `${waar}: antwoord niet eindig`).toBe(true)
        if (!magNegatief(g.doel)) {
          expect(o.antwoord, `${waar}: negatief antwoord`).toBeGreaterThanOrEqual(0)
        }
        const decimalen = String(o.antwoord).split('.')[1]?.length ?? 0
        // Een kommagetal dat van een getallenlijn wordt afgelezen mag drie
        // decimalen hebben (0,242 m), net als maten omrekenen (752 g = 0,752 kg);
        // verder rekent geen kind met duizendsten.
        const maxDec = o.figuur?.type === 'getallenlijn' || o.omrekenen ? 3 : 2
        expect(decimalen, `${waar}: ${o.antwoord} heeft ${decimalen} decimalen`).toBeLessThanOrEqual(maxDec)
      }
    }
  })

  it('geeft elke opgave een vraag en een uitleg', () => {
    for (const g of GENERATORS) {
      const o = g.gen()
      expect(String(o.vraag).length, g.doel.slice(0, 40)).toBeGreaterThan(15)
      expect(o.uitleg, g.doel.slice(0, 40)).toBeTruthy()
    }
  })

  it('laat het eigen antwoord altijd goedgekeurd worden', () => {
    for (const g of GENERATORS) {
      for (let n = 0; n < 20; n++) {
        const o = g.gen()
        if (typeof o.antwoord !== 'number') continue
        expect(checkAntwoord(String(o.antwoord).replace('.', ','), o.antwoord),
          `groep ${g.groep} ${g.blok}: ${g.doel.slice(0, 40)}`).toBe(true)
      }
    }
  })
})

describe('groep 7 in het bijzonder', () => {
  const g7 = GENERATORS.filter((g) => g.groep === 7)

  it('schrijft nooit hij of zij bij een naam die net zo goed een meisje kan zijn', () => {
    for (const g of g7) {
      for (let n = 0; n < 40; n++) {
        expect(String(g.gen().vraag), g.doel.slice(0, 40)).not.toMatch(/\b(hij|zij|haar|hem)\b/)
      }
    }
  })

  it('rekent bij kommagetallen vergelijken 6,169 niet goed als 6,17 het antwoord is', () => {
    // Het instapdoel gaat over duizendsten: het verschil tussen twee getallen
    // is soms maar 0,001, dus het antwoord mag geen speling hebben.
    const doelen = g7.filter((g) => g.blok === 0 && /duizendsten/.test(g.doel))
    expect(doelen.length).toBeGreaterThan(0)
    let vergeleken = 0
    for (const g of doelen) {
      for (let n = 0; n < 80; n++) {
        const o = g.gen()
        expect(checkAntwoord(o.antwoord, o.antwoord), o.kaal).toBe(true)
        const m = String(o.kaal).match(/groter: (.+) of (.+)\?/)
        if (!m) continue
        vergeleken++
        const ander = m[1] === o.antwoord ? m[2] : m[1]
        expect(checkAntwoord(ander, o.antwoord), o.kaal).toBe(false)
      }
    }
    expect(vergeleken).toBeGreaterThan(0)
  })

  it('zet elke som in een situatie met een onderwerp, niet in een kale rekenregel', () => {
    for (const g of g7) {
      for (let n = 0; n < 20; n++) {
        const vraag = String(g.gen().vraag)
        expect(vraag.split(' ').length, `${g.doel.slice(0, 40)}: te kort voor een verhaal`).toBeGreaterThan(9)
      }
    }
  })
})

describe('doelen per blok', () => {
  it('geeft groep 7 vier doelen per blok, instap tot en met blok 10', () => {
    for (let b = 0; b <= 10; b++) {
      expect(doelenVanBlok(7, b), `blok ${b}`).toHaveLength(4)
    }
  })
})

describe('checkSom', () => {
  it('rekent een som zonder isgelijkteken gewoon na', () => {
    expect(checkSom('4000 + 751', 4751)).toBe(true)
    expect(checkSom('4000 + 750', 4751)).toBe(false)
  })

  it('accepteert nog steeds een som mét isgelijkteken', () => {
    expect(checkSom('4000 + 751 = 4751', 4751)).toBe(true)
  })

  it('geeft null als er niets is ingevuld', () => {
    expect(checkSom('', 10)).toBe(null)
    expect(checkSom('   ', 10)).toBe(null)
  })
})
