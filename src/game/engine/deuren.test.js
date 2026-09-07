import { describe, it, expect } from 'vitest'
import { Tilemap, T } from './tilemap.js'
import { ALLE_LEVELS } from '../data/levels/index.js'

// Sleutelkaartdeuren gaan op volgorde open: de eerste kaart opent de linkse
// deur, de tweede de volgende. Vroeger gingen ze pas open als je álle kaarten
// had, en dat maakte 4-11 onspeelbaar: daar ligt de tweede kaart áchter de
// eerste deur, dus je kwam er nooit bij.

function maak(rijen) {
  return new Tilemap({ id: 'test-l01', kaart: rijen, hints: [] })
}

describe('sleutelkaartdeuren', () => {
  const kaart = [
    '..........',
    '.S.q.d.d.F',
    '##########',
  ]

  it('telt de deuren van links naar rechts', () => {
    const m = maak(kaart)
    expect(m.aantalDeuren).toBe(2)
  })

  it('houdt alles dicht zonder kaart', () => {
    const m = maak(kaart)
    expect(m.tegel(5, 1)).toBe(T.DEUR)
    expect(m.tegel(7, 1)).toBe(T.DEUR)
  })

  it('opent met één kaart alleen de eerste deur', () => {
    const m = maak(kaart)
    m.sleutelsGepakt = 1
    expect(m.tegel(5, 1)).toBe(T.LEEG)
    expect(m.tegel(7, 1)).toBe(T.DEUR)
  })

  it('opent met twee kaarten allebei', () => {
    const m = maak(kaart)
    m.sleutelsGepakt = 2
    expect(m.tegel(5, 1)).toBe(T.LEEG)
    expect(m.tegel(7, 1)).toBe(T.LEEG)
  })

  it('telt een deur van meerdere tegels hoog als één deur', () => {
    const m = maak([
      '.....d....',
      '.S.q.d...F',
      '##########',
    ])
    expect(m.aantalDeuren).toBe(1)
    m.sleutelsGepakt = 1
    expect(m.tegel(5, 0)).toBe(T.LEEG)
    expect(m.tegel(5, 1)).toBe(T.LEEG)
  })

  it('doet de deuren weer dicht bij een respawn', () => {
    const m = maak(kaart)
    m.sleutelsGepakt = 2
    m.herstel()
    expect(m.sleutelsGepakt).toBe(0)
    expect(m.tegel(5, 1)).toBe(T.DEUR)
  })
})

describe('deuren in de echte levels', () => {
  const metDeur = ALLE_LEVELS.filter((l) => l.kaart.some((r) => r.includes('d')))

  it('komen alleen in wereld 4 voor', () => {
    expect(metDeur.length).toBeGreaterThan(0)
    for (const l of metDeur) expect(l.wereld).toBe(4)
  })

  it('hebben voor elke deur genoeg kaarten links ervan', () => {
    for (const l of metDeur) {
      const kolommen = (teken) => {
        const uit = new Set()
        for (const r of l.kaart) {
          for (let x = 0; x < r.length; x++) if (r[x] === teken) uit.add(x)
        }
        return [...uit].sort((a, b) => a - b)
      }
      const deuren = kolommen('d')
      const kaarten = kolommen('q')
      deuren.forEach((dx, i) => {
        const ervoor = kaarten.filter((kx) => kx < dx).length
        expect(ervoor, `${l.id}: deur ${i + 1} op kolom ${dx} heeft ${ervoor} kaart(en) ervoor`)
          .toBeGreaterThanOrEqual(i + 1)
      })
    }
  })

  it('zijn hoog genoeg om niet overheen te springen', () => {
    // Springhoogte is 3,5 tegel; een deur van minstens 5 tegels is dus een
    // echte versperring en geen drempeltje.
    for (const l of metDeur) {
      const perKolom = new Map()
      l.kaart.forEach((r) => {
        for (let x = 0; x < r.length; x++) {
          if (r[x] === 'd') perKolom.set(x, (perKolom.get(x) ?? 0) + 1)
        }
      })
      for (const [x, hoog] of perKolom) {
        expect(hoog, `${l.id}: deur op kolom ${x} is maar ${hoog} tegel(s) hoog`).toBeGreaterThanOrEqual(5)
      }
    }
  })
})
