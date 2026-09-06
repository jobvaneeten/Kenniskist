import { describe, it, expect } from 'vitest'
import { ALLE_LEVELS, muntenInLevel, levelsVanWereld, kaartHash } from './levels/index.js'
import { totaalVerdienbaar, LEVELS_PER_WERELD, TOTAAL_STERREN, bonusVoor, ontleedLevelId } from './werelden.js'
import { CHARACTERS, teKoop, sterrenCharacters, modVan, zwaksteProfiel } from './characters.js'

describe('werelden', () => {
  it('rekent het totaal verdienbare uit geplande aantallen', () => {
    const { totaal, per } = totaalVerdienbaar({})
    expect(per).toHaveLength(5)
    expect(per.every((w) => !w.gemeten)).toBe(true)
    expect(totaal).toBeGreaterThan(0)
  })

  it('vervangt geplande door gemeten aantallen waar die er zijn', () => {
    const gemeten = { 1: 1000 }
    const { per, munten } = totaalVerdienbaar(gemeten)
    expect(per[0].gemeten).toBe(true)
    expect(per[0].munten).toBe(1000)
    expect(per[1].gemeten).toBe(false)
    expect(munten).toBeGreaterThan(1000)
  })

  it('geeft de baas een hogere bonus dan een regulier level', () => {
    expect(bonusVoor(1)).toBe(25)
    expect(bonusVoor(LEVELS_PER_WERELD)).toBe(100)
  })

  it('ontleedt level-id\'s', () => {
    expect(ontleedLevelId('w3-l07')).toEqual({ wereld: 3, index: 7 })
    expect(ontleedLevelId('onzin')).toBe(null)
  })
})

describe('characters', () => {
  it('heeft precies 1 gratis, 8 te koop en 3 op sterren', () => {
    expect(CHARACTERS).toHaveLength(12)
    expect(teKoop()).toHaveLength(8)
    expect(sterrenCharacters()).toHaveLength(3)
    expect(CHARACTERS.filter((c) => c.prijs === 0 && !c.sterren)).toHaveLength(1)
  })

  it('vraagt nooit meer sterren dan er in het spel zitten', () => {
    for (const c of sterrenCharacters()) {
      expect(c.sterren).toBeLessThanOrEqual(TOTAAL_STERREN)
    }
  })

  it('geeft elk character een eigenschap in het Nederlands', () => {
    for (const c of CHARACTERS) {
      expect(typeof c.eigenschap).toBe('string')
      expect(c.eigenschap.length).toBeGreaterThan(5)
    }
  })

  it('vult ontbrekende modifiers aan met 1', () => {
    const m = modVan('pip')
    expect(m.loop).toBe(1)
    expect(m.sprong).toBe(1)
    expect(modVan('bolt').loop).toBeCloseTo(1.12)
  })

  it('is nergens strikt beter: elk voordeel heeft een nadeel', () => {
    // Sterren-characters mogen puur voordeel hebben; die koop je niet met geld.
    // Bij de meeste modifiers is lager slechter, maar bij valZwaartekracht is
    // hóger slechter: je valt dan sneller.
    const omgekeerd = new Set(['valZwaartekracht'])
    const negeer = new Set(['levens', 'magneet', 'ijsGrip', 'immuunSpetters', 'luchtsprong', 'spoor', 'onkwetsbaar'])
    for (const c of teKoop()) {
      const heeftNadeel = Object.entries(c.mod).some(([k, v]) => {
        if (negeer.has(k)) return false
        return omgekeerd.has(k) ? v > 1 : v < 1
      })
      expect(heeftNadeel, `${c.naam} heeft geen enkel nadeel`).toBe(true)
    }
  })

  it('levert een zwakste profiel dat niet beter is dan het gemiddelde', () => {
    const z = zwaksteProfiel()
    expect(z.sprong).toBeLessThanOrEqual(1)
    expect(z.loop).toBeLessThanOrEqual(1)
  })
})

describe('leveldata', () => {
  it('heeft unieke id\'s en oplopende index per wereld', () => {
    const ids = ALLE_LEVELS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (let w = 1; w <= 5; w++) {
      const levels = levelsVanWereld(w)
      if (levels.length === 0) continue
      expect(levels.map((l) => l.index)).toEqual(
        Array.from({ length: levels.length }, (_, i) => i + 1),
      )
    }
  })

  it('houdt het aantal munten per level binnen de grenzen', () => {
    for (const l of ALLE_LEVELS) {
      const n = muntenInLevel(l)
      const min = l.index === LEVELS_PER_WERELD ? 10 : 25
      expect(n, `${l.id} heeft ${n} munten`).toBeGreaterThanOrEqual(min)
      expect(n, `${l.id} heeft ${n} munten`).toBeLessThanOrEqual(60)
    }
  })

  it('geeft elk level een naam, doeltijd en gelijke rijlengtes', () => {
    for (const l of ALLE_LEVELS) {
      expect(l.naam, l.id).toBeTruthy()
      expect(l.doeltijd, l.id).toBeGreaterThan(30)
      const breedte = l.kaart[0].length
      for (const rij of l.kaart) expect(rij.length, l.id).toBe(breedte)
    }
  })

  it('geeft een stabiele hash per kaart', () => {
    const h1 = kaartHash(ALLE_LEVELS[0])
    const h2 = kaartHash(ALLE_LEVELS[0])
    expect(h1).toBe(h2)
    expect(h1).not.toBe(kaartHash(ALLE_LEVELS[1]))
    expect(h1).toMatch(/^[0-9a-f]{8}$/)
  })
})
