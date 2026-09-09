import { describe, it, expect } from 'vitest'
import {
  GROEPEN_MET_LESDELEN, bouwLesOpdracht, delenVoorDoel, doelenVanBlokMetKey,
  doelVoorLes, isHerhalingsles, lescheckTitel,
} from './lescheck.js'
import { doelenVanBlok, gensVoorDeel, onderdelenVan } from '../games/redactiesommen.js'

// De lescheck koppelt een les aan één doel uit de methode. Gaat die koppeling
// schuiven, dan krijgt een kind een som over het verkeerde doel en ziet de
// leerkracht een uitslag die nergens over gaat — vandaar deze test.

describe('lescheck: les → doel', () => {
  it('geeft dezelfde doelen als de denkvragen en de weektaak-config', () => {
    for (let blok = 0; blok <= 10; blok++) {
      const metKey = doelenVanBlokMetKey(7, 'FS', blok)
      expect(metKey.map(d => d.doel), `blok ${blok}`).toEqual(doelenVanBlok(7, blok))
      expect(metKey.every(d => typeof d.key === 'string' && d.key.length > 0)).toBe(true)
    }
  })

  it('koppelt les 1 t/m 4 aan de eerste twee doelen van het blok', () => {
    const doelen = doelenVanBlok(7, 3)
    expect(doelVoorLes(7, 'FS', 3, 1).doel).toBe(doelen[0])
    expect(doelVoorLes(7, 'FS', 3, 2).doel).toBe(doelen[0])
    expect(doelVoorLes(7, 'FS', 3, 3).doel).toBe(doelen[1])
    expect(doelVoorLes(7, 'FS', 3, 4).doel).toBe(doelen[1])
    expect(doelVoorLes(7, 'FS', 3, 9).doel).toBe(doelen[3])
  })

  it('heeft geen automatisch doel bij de herhalingslessen 5 en 10', () => {
    expect(isHerhalingsles(5)).toBe(true)
    expect(isHerhalingsles(10)).toBe(true)
    expect(doelVoorLes(7, 'FS', 3, 5)).toBe(null)
    expect(doelVoorLes(7, 'FS', 3, 10)).toBe(null)
    expect(isHerhalingsles(4)).toBe(false)
  })
})

describe('lesdelen', () => {
  // Een doel loopt over twee lessen die elk een ander stuk doen. Raakt die
  // indeling zoek, dan krijgt een kind een som over iets wat het die les niet
  // heeft gehad — precies waar de lescheck voor bedoeld was.
  it('geeft elk doel van groep 6, 7 en 8 precies twee lesdelen met een naam', () => {
    for (const groep of GROEPEN_MET_LESDELEN) {
      for (const route of ['FS', 'S+']) {
        for (const blok of onderdelenVan(groep, route, 'blok')) {
          if (!blok.key.startsWith('blok-')) continue
          for (const g of blok.gens) {
            expect(g.delen, `g${groep} ${route} ${blok.key}: ${g.doel.slice(0, 40)}`).toHaveLength(2)
            for (const d of g.delen) expect(typeof d.label === 'string' && d.label.length > 2).toBe(true)
          }
        }
      }
    }
  })

  it('levert bij elk lesdeel een kale som, zonder verhaal eromheen', () => {
    for (const groep of GROEPEN_MET_LESDELEN) {
      for (const route of ['FS', 'S+']) {
        for (const blok of onderdelenVan(groep, route, 'blok')) {
          if (!blok.key.startsWith('blok-')) continue
          for (const g of blok.gens) {
            for (const d of g.delen) {
              for (let n = 0; n < 12; n++) {
                const o = d.gen()
                expect(typeof o.kaal, `g${groep} ${blok.key} ${d.label}`).toBe('string')
                expect(o.kaal.length).toBeGreaterThan(2)
                // Een kale som is kort en is niet stiekem het verhaal.
                expect(o.kaal.split(' ').length, `te lang: ${o.kaal}`).toBeLessThan(21)
                expect(o.kaal, 'de kale som is het verhaal').not.toBe(o.vraag)
              }
            }
          }
        }
      }
    }
  })

  it('geeft twee sommen als een lesdeel over twee bewerkingen gaat', () => {
    // Bij "plus en min" krijgt elk kind er één van elk: anders weet je van de
    // helft van de les niet of het is blijven hangen.
    const les3 = bouwLesOpdracht({ groep: 7, route: 'FS', blok: 1, les: 3, doelNr: 2, deelNr: 1 })
    expect(les3.aantal).toBe(2)
    expect(les3.config.lescheck.soorten).toEqual(['plus', 'min'])
    const les4 = bouwLesOpdracht({ groep: 7, route: 'FS', blok: 1, les: 4, doelNr: 2, deelNr: 2 })
    expect(les4.aantal).toBe(2)
    expect(les4.config.lescheck.soorten).toEqual(['keer', 'delen'])
  })

  it('serveert die twee sommen in vaste volgorde, één per soort', () => {
    const gens = gensVoorDeel(7, 'FS', 'g7b1i1', 1)
    expect(gens.map(g => g.soort)).toEqual(['plus', 'min'])
    for (let n = 0; n < 30; n++) {
      expect(gens[0].gen().kaal).toContain('+')
      expect(gens[1].gen().kaal).toContain('−')
    }
  })

  it('geeft elk kind eigen getallen, ook binnen dezelfde soort', () => {
    const gens = gensVoorDeel(7, 'FS', 'g7b1i1', 1)
    const sommen = new Set()
    for (let kind = 0; kind < 60; kind++) sommen.add(gens[0].gen().kaal)
    expect(sommen.size, 'te weinig variatie: kinderen kunnen spieken').toBeGreaterThan(30)
  })

  it('koppelt les 3 aan het eerste deel van doel 2 en les 4 aan het tweede', () => {
    // Het voorbeeld uit de klas: blok 1 les 3 is plus en min, les 4 is keer en
    // delen — allebei doel 2.
    const les3 = doelVoorLes(7, 'FS', 1, 3), les4 = doelVoorLes(7, 'FS', 1, 4)
    expect(les3.doelNr).toBe(2)
    expect(les4.doelNr).toBe(2)
    expect(les3.deelNr).toBe(1)
    expect(les4.deelNr).toBe(2)
    expect(delenVoorDoel(7, 'FS', 1, 2).map(d => d.label)).toEqual(['plus en min', 'keer en delen'])
  })
})

describe('lescheck: opdracht bouwen', () => {
  it('maakt één som over precies één doel', () => {
    const o = bouwLesOpdracht({ groep: 7, route: 'FS', blok: 3, les: 4, doelNr: 2 })
    expect(o.toolId).toBe('verhaaltjessommen')
    expect(o.aantal).toBe(1)
    expect(o.config.doelen).toHaveLength(1)
    expect(o.config.lescheck).toMatchObject({ blok: 3, les: 4, doelNr: 2 })
    expect(o.config.lescheck.doel).toBe(doelenVanBlok(7, 3)[1])
  })

  it('geeft null bij een doelnummer dat het blok niet heeft', () => {
    expect(bouwLesOpdracht({ groep: 7, route: 'FS', blok: 3, les: 5, doelNr: 9 })).toBe(null)
  })

  it('noemt het instapblok bij naam', () => {
    expect(lescheckTitel(0)).toBe('Lescheck Instap')
    expect(lescheckTitel(3)).toBe('Lescheck Blok 3')
  })
})
