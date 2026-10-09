import { describe, it, expect } from 'vitest'
import { TOETS_GROEP5, TOETS_GROEP6 } from './toetsvormen6.js'
import { toetsGroep7, toetsGroep8 } from './toetsvormen8.js'
import { onderdelenVan, checkAntwoord, checkTijd } from './redactiesommen.js'
import { ggd } from './toetsHulp.js'

// De toetsvormen van groep 6 en 8 zijn gegenereerd: een fout komt pas bij de
// zoveelste opgave langs. Elke generator draait daarom honderden keren, en
// elk antwoord moet door de eigen controle van de verhaaltjessommen komen.

const RONDES = 400
const KOPPELINGEN = [
  { groep: 5, route: 'single', vormen: TOETS_GROEP5 },
  { groep: 6, route: 'FS', vormen: TOETS_GROEP6 },
  { groep: 6, route: 'S+', vormen: TOETS_GROEP6 },
  { groep: 7, route: 'FS', vormen: toetsGroep7(false) },
  { groep: 7, route: 'S+', vormen: toetsGroep7(true) },
  { groep: 8, route: 'FS', vormen: toetsGroep8(false) },
  { groep: 8, route: 'S+', vormen: toetsGroep8(true) },
]

// Zoals een kind het intypt: Nederlandse komma.
const invoer = (a) => (typeof a === 'number' ? String(a).replace('.', ',') : String(a))

describe('toetsvormen groep 6 en 8', () => {
  it('koppelt alleen aan doelen die bestaan', () => {
    for (const { groep, route, vormen } of KOPPELINGEN) {
      const blokken = onderdelenVan(groep, route, 'blok').filter(b => b.key.startsWith('blok-'))
      for (const [blok, perDoel] of Object.entries(vormen)) {
        const doelen = blokken.find(b => b.key === `blok-${blok}`)?.gens ?? []
        perDoel.forEach((g, i) => { if (g) expect(doelen[i], `groep ${groep} ${route} blok ${blok} doel ${i + 1}`).toBeTruthy() })
      }
    }
  })

  for (const { groep, route, vormen } of KOPPELINGEN) {
    for (const [blok, perDoel] of Object.entries(vormen)) {
      perDoel.forEach((gen, i) => {
        if (!gen) return
        it(`groep ${groep} ${route} blok ${blok} doel ${i + 1} (${gen.name || 'toetsvorm'})`, () => {
          for (let n = 0; n < RONDES; n++) {
            const o = gen()
            const tekst = `${o.vraag} | ${o.kaal} | ${o.uitleg}`
            expect(typeof o.vraag, 'vraag').toBe('string')
            expect(o.vraag.length).toBeGreaterThan(10)
            expect(typeof o.uitleg, 'uitleg').toBe('string')
            expect(tekst, 'NaN/undefined').not.toMatch(/NaN|undefined|Infinity|\[object/)
            // Een punt met 1 of 2 cijfers erachter is een JS-kommagetal dat
            // er niet Nederlands in staat (duizendtallen hebben er 3).
            expect(tekst, `JS-getal in tekst: ${tekst}`).not.toMatch(/\d\.\d{1,2}(?!\d)|\d\.\d{4,}/)
            if (o.opties) {
              expect(o.opties.length, 'minstens 2 keuzes').toBeGreaterThanOrEqual(2)
              expect(new Set(o.opties).size, `dubbele keuze: ${o.opties}`).toBe(o.opties.length)
              expect(o.opties, `antwoord ${o.antwoord} niet bij de keuzes`).toContain(o.antwoord)
              continue
            }
            if (o.antwoordType === 'tijd') {
              expect(o.tijdM).toBeGreaterThanOrEqual(0)
              expect(o.tijdM).toBeLessThan(60)
              expect(checkTijd(o.antwoord, o.tijdH, o.tijdM), `tijd ${o.antwoord}`).toBe(true)
              continue
            }
            expect(o.antwoord, 'antwoord').toBeDefined()
            if (typeof o.antwoord === 'number') {
              expect(Number.isFinite(o.antwoord)).toBe(true)
              expect(o.antwoord, `negatief antwoord: ${o.vraag}`).toBeGreaterThanOrEqual(0)
              const dec = String(o.antwoord).split('.')[1]?.length ?? 0
              expect(dec, `te veel decimalen: ${o.antwoord} bij ${o.vraag}`).toBeLessThanOrEqual(o.eenheid === '€' ? 2 : 3)
            }
            // Alleen als de vraag erom vraagt; "2 van de 6 stukken" mag 2/6 blijven.
            if (typeof o.antwoord === 'string' && o.antwoord.includes('/') && /zo klein mogelijk/.test(o.vraag)) {
              const [t, d] = o.antwoord.split('/').map(Number)
              expect(ggd(t, d), `breuk niet zo klein mogelijk: ${o.antwoord}`).toBe(1)
            }
            expect(checkAntwoord(invoer(o.antwoord), o.antwoord), `eigen antwoord ${o.antwoord} wordt fout gerekend bij: ${o.vraag}`).toBe(true)
            if (o.rest != null) expect(checkAntwoord(invoer(o.rest), o.rest), `rest ${o.rest}`).toBe(true)
          }
        })
      })
    }
  }
})
