import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { VRIJE_SPELLEN, spelPlaatje, spelMiniatuur } from './spellen.js'

const publiek = (pad) => new URL('../../public' + pad, import.meta.url)

describe('spellenlijst (spelmenu en voorpagina)', () => {
  it('heeft voor elk spel een plaatje en een miniatuur voor de voorpagina', () => {
    for (const spel of VRIJE_SPELLEN) {
      expect(existsSync(publiek(spelPlaatje(spel))), `plaatje van ${spel.key}`).toBe(true)
      expect(existsSync(publiek(spelMiniatuur(spel))), `miniatuur van ${spel.key} — draai node tools/spelMiniaturen.js`).toBe(true)
    }
  })
  it('heeft unieke sleutels', () => {
    expect(new Set(VRIJE_SPELLEN.map(s => s.key)).size).toBe(VRIJE_SPELLEN.length)
  })
})
