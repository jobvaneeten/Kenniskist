import { describe, it, expect } from 'vitest'
import { doelenVanBlokMetKey, doelVoorLes, bouwLesOpdracht, isHerhalingsles, lescheckTitel } from './lescheck.js'
import { doelenVanBlok } from '../games/redactiesommen.js'

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
