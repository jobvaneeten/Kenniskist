import { describe, it, expect } from 'vitest'
import { WOORDEN_PER_BLOK, BLOK_NUMMERS, kernVan, deelVan } from './woordenschatData.js'

describe('woordenschat per blok', () => {
  it('heeft blok 1 t/m 8 met elk 45 woorden', () => {
    expect(BLOK_NUMMERS).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    for (const b of BLOK_NUMMERS) expect(WOORDEN_PER_BLOK[b].length, `blok ${b}`).toBe(45)
  })

  for (const b of BLOK_NUMMERS) {
    const lijst = WOORDEN_PER_BLOK[b]
    it(`blok ${b}: elke zin heeft één gat, tegenstellingen bestaan en wijzen terug`, () => {
      const woorden = new Map(lijst.map(w => [w.woord, w]))
      expect(woorden.size).toBe(lijst.length)
      for (const w of lijst) {
        expect(w.zin.split('___').length, w.woord).toBe(2)
        expect(w.uitleg.length, w.woord).toBeGreaterThan(2)
        expect(deelVan(w), w.woord).toBeTruthy()
        if (w.tegen) {
          expect(woorden.get(w.tegen)?.tegen, `${w.woord} ↔ ${w.tegen}`).toBe(w.woord)
        }
      }
      // Bij "welk woord past in de zin" mogen twee opties niet gelijk zijn.
      expect(new Set(lijst.map(kernVan)).size).toBe(lijst.length)
    })
  }
})
