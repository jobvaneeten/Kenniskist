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
        expect(decimalen, `${waar}: ${o.antwoord} heeft ${decimalen} decimalen`).toBeLessThanOrEqual(2)
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
