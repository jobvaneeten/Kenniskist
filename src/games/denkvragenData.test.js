import { describe, it, expect } from 'vitest'
import {
  BLOKKEN, LESSEN_PER_BLOK, DOEL_VAN_LES,
  denkvraag, heeftBlok, isHerhalingsles, GROEPEN_MET_DENKVRAGEN,
} from './denkvragenData.js'

// Een blok heeft tien lessen en vier doelen: les 1-2 doel 1, les 3-4 doel 2,
// les 6-7 doel 3, les 8-9 doel 4. Les 5 en 10 zijn herhaling.

describe('lesindeling', () => {
  it('koppelt elke les aan het juiste doel', () => {
    expect(DOEL_VAN_LES).toEqual({ 1: 1, 2: 1, 3: 2, 4: 2, 5: null, 6: 3, 7: 3, 8: 4, 9: 4, 10: null })
  })

  it('geeft elk doel precies twee lessen', () => {
    for (const doel of [1, 2, 3, 4]) {
      const lessen = Object.entries(DOEL_VAN_LES).filter(([, d]) => d === doel)
      expect(lessen, `doel ${doel}`).toHaveLength(2)
    }
  })

  it('merkt les 5 en 10 aan als herhaling', () => {
    expect(isHerhalingsles(5)).toBe(true)
    expect(isHerhalingsles(10)).toBe(true)
    expect(isHerhalingsles(1)).toBe(false)
  })

  it('kent een instapblok plus tien genummerde blokken', () => {
    expect(BLOKKEN[0]).toEqual({ nr: 0, label: 'Instap' })
    expect(BLOKKEN).toHaveLength(11)
    expect(LESSEN_PER_BLOK).toBe(10)
  })
})

describe('groep 7, instapblok', () => {
  it('is voorlopig het enige blok dat klaar is', () => {
    expect(GROEPEN_MET_DENKVRAGEN).toEqual([7])
    expect(heeftBlok(7, 0)).toBe(true)
    expect(heeftBlok(7, 1)).toBe(false)
    expect(heeftBlok(6, 0)).toBe(false)
  })

  it('heeft een denkvraag bij elke les behalve de herhalingslessen', () => {
    for (let les = 1; les <= LESSEN_PER_BLOK; les++) {
      const v = denkvraag(7, 0, les)
      if (isHerhalingsles(les)) expect(v, `les ${les}`).toBeNull()
      else expect(v, `les ${les}`).not.toBeNull()
    }
  })

  it('geeft bij elke denkvraag het doel van de methode mee', () => {
    for (let les = 1; les <= LESSEN_PER_BLOK; les++) {
      const v = denkvraag(7, 0, les)
      if (!v) continue
      expect(typeof v.doel, `les ${les}`).toBe('string')
      expect(v.doel.length, `les ${les}`).toBeGreaterThan(20)
      expect(v.doelNr).toBe(DOEL_VAN_LES[les])
    }
  })

  it('geeft de twee lessen van één doel niet dezelfde vraag', () => {
    for (const [a, b] of [[1, 2], [3, 4], [6, 7], [8, 9]]) {
      expect(denkvraag(7, 0, a).vraag).not.toBe(denkvraag(7, 0, b).vraag)
    }
  })

  it('stelt overal een open vraag met een zetje erbij', () => {
    for (let les = 1; les <= LESSEN_PER_BLOK; les++) {
      const v = denkvraag(7, 0, les)
      if (!v) continue
      expect(v.vraag.length, `les ${les}`).toBeGreaterThan(60)
      expect(v.hint.length, `les ${les}`).toBeGreaterThan(20)
      // Een denkvraag vraagt om uitleggen, bedenken of beoordelen — niet om
      // één getal. Zonder zo'n werkwoord is het gewoon een som.
      // "leg ... uit" en "zoek ... uit" mogen er woorden tussen hebben
      // ("leg bij elke som uit", "zoek kolom voor kolom uit").
      expect(v.vraag, `les ${les}`).toMatch(
        /\b(leg|zoek)\b[^.\n]*\buit\b|bedenk|waarom|waaraan|hoe (kun|kan|had|zie)|wat vind|welke zou jij|laat zien|lukt het|wat gaat er mis/i,
      )
    }
  })

  it('blijft op de bovenste drie niveaus van Bloom', () => {
    const toegestaan = ['analyseren', 'evalueren', 'creëren']
    for (let les = 1; les <= LESSEN_PER_BLOK; les++) {
      const v = denkvraag(7, 0, les)
      if (!v) continue
      const woorden = v.niveau.split(/ en /)
      for (const w of woorden) expect(toegestaan, `les ${les}: ${w}`).toContain(w)
    }
  })

  it('gebruikt alle drie de niveaus over het blok heen', () => {
    const alles = []
    for (let les = 1; les <= LESSEN_PER_BLOK; les++) {
      const v = denkvraag(7, 0, les)
      if (v) alles.push(...v.niveau.split(/ en /))
    }
    for (const niveau of ['analyseren', 'evalueren', 'creëren']) {
      expect(alles, niveau).toContain(niveau)
    }
  })
})
