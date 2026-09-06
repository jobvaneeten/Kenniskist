import { describe, it, expect } from 'vitest'
import { Lichaam, beweeg, hoekCorrectie, naar, klem, BASIS } from './physics.js'
import { Tilemap, TEGEL, T } from './tilemap.js'

// Kleine testkaart: 10 tegels breed, 8 hoog. Rij 6 is vloer, rij 5 heeft een
// muur op kolom 5, rij 3 een one-way platform op kolom 2-3.
//
// Tilemap eist een start en een finish; die worden hier automatisch links en
// rechts op de vloerrij gezet zodat de testkaarten leesbaar blijven.
function kaart(rijen) {
  const uit = [...rijen]
  const vloerRij = uit.length - 3
  if (!uit.some((r) => r.includes('S'))) {
    uit[vloerRij] = `S${uit[vloerRij].slice(1)}`
  }
  if (!uit.some((r) => r.includes('F'))) {
    uit[vloerRij] = `${uit[vloerRij].slice(0, -1)}F`
  }
  return new Tilemap({
    id: 'test-l01',
    naam: 'test',
    wereld: 1,
    index: 1,
    doeltijd: 60,
    kaart: uit,
  })
}

const VLOER = [
  '..........',
  '..........',
  '..........',
  '..==......',
  '..........',
  '.....#....',
  '##########',
  '##########',
]

describe('AABB-collision', () => {
  // De speler past elke stap zelf zwaartekracht toe vóór beweeg(); dat doen
  // deze tests ook, anders staat vy stil op 0 en zakt het lichaam nooit meer
  // die halve pixel omlaag die het contact met de vloer bevestigt.
  const val = (l, map, stappen) => {
    for (let i = 0; i < stappen; i++) {
      l.vy = Math.min(l.vy + BASIS.zwaartekrachtNeer / 60, BASIS.maxVal)
      beweeg(l, map, 1 / 60)
    }
  }

  it('zet het lichaam precies op de vloer, zonder erin te zakken', () => {
    const map = kaart(VLOER)
    const l = new Lichaam(16, 16, 10, 20)
    val(l, map, 30)
    expect(l.opGrond).toBe(true)
    expect(l.onder).toBeCloseTo(6 * TEGEL, 5)
  })

  it('laat een hoge valsnelheid niet door de vloer schieten', () => {
    const map = kaart(VLOER)
    const l = new Lichaam(16, 0, 10, 20)
    // Ver boven de maximale valsnelheid: één stap van 40 px moet nog pakken.
    l.vy = BASIS.maxVal * 6
    beweeg(l, map, 1 / 60)
    expect(l.onder).toBeLessThanOrEqual(6 * TEGEL)
  })

  it('stopt tegen een muur en laat de x-snelheid vallen', () => {
    const map = kaart(VLOER)
    const l = new Lichaam(4 * TEGEL, 5 * TEGEL, 10, 14)
    l.vx = 400
    const uit = beweeg(l, map, 1 / 60)
    expect(uit.muurGeraakt).toBe(1)
    expect(l.rechts).toBeCloseTo(5 * TEGEL, 5)
    expect(l.vx).toBe(0)
  })

  it('blijft niet haken in een binnenhoek: X wordt vóór Y opgelost', () => {
    const map = kaart(VLOER)
    // Tegen de muur aan, precies op vloerhoogte: hij mag niet vast komen te
    // zitten maar moet gewoon blijven staan.
    const l = new Lichaam(4 * TEGEL + 6, 6 * TEGEL - 26, 10, 20)
    l.vx = 200
    for (let i = 0; i < 15; i++) {
      l.vy = Math.min(l.vy + BASIS.zwaartekrachtNeer / 60, BASIS.maxVal)
      beweeg(l, map, 1 / 60)
    }
    expect(l.opGrond).toBe(true)
    expect(l.onder).toBeCloseTo(6 * TEGEL, 5)
    expect(l.rechts).toBeLessThanOrEqual(5 * TEGEL)
  })
})

describe('one-way platforms', () => {
  it('vangt je op als je van boven komt', () => {
    const map = kaart(VLOER)
    const l = new Lichaam(2 * TEGEL, 3 * TEGEL - 25, 10, 20)
    l.vy = 360
    beweeg(l, map, 1 / 60)
    expect(l.opGrond).toBe(true)
    expect(l.onder).toBeCloseTo(3 * TEGEL, 5)
  })

  it('laat je er van onderaf doorheen', () => {
    const map = kaart(VLOER)
    const l = new Lichaam(2 * TEGEL, 4 * TEGEL, 10, 20)
    l.vy = -200
    const uit = beweeg(l, map, 1 / 60)
    expect(uit.plafondGeraakt).toBe(false)
    expect(l.boven).toBeLessThan(4 * TEGEL)
  })

  it('laat je er doorheen zakken met negeerPlatform', () => {
    const map = kaart(VLOER)
    const l = new Lichaam(2 * TEGEL, 3 * TEGEL - 25, 10, 20)
    l.negeerPlatform = 0.2
    l.vy = 360
    beweeg(l, map, 1 / 60)
    expect(l.opGrond).toBe(false)
  })
})

describe('omgekeerde zwaartekracht', () => {
  it('laat je op het plafond landen in plaats van erdoorheen te stoten', () => {
    const map = kaart([
      '##########',
      '##########',
      '..........',
      '..........',
      '..........',
      '..........',
      '##########',
      '##########',
    ])
    const l = new Lichaam(3 * TEGEL, 4 * TEGEL, 10, 20)
    l.omgekeerd = true
    for (let i = 0; i < 30; i++) {
      // "Vallen" gaat omhoog: de snelheid wordt negatiever.
      l.vy = Math.max(l.vy - BASIS.zwaartekrachtNeer / 60, -BASIS.maxVal)
      beweeg(l, map, 1 / 60)
    }
    expect(l.opGrond).toBe(true)
    expect(l.tegenPlafond).toBe(false)
    expect(l.boven).toBeCloseTo(2 * TEGEL, 5)
  })

  it('laat one-way platforms de andere kant op vangen', () => {
    const map = kaart([
      '..........',
      '..........',
      '..==......',
      '..........',
      '..........',
      '..........',
      '##########',
      '##########',
    ])
    const l = new Lichaam(2 * TEGEL, 3 * TEGEL + 5, 10, 20)
    l.omgekeerd = true
    l.vy = -360
    beweeg(l, map, 1 / 60)
    expect(l.opGrond).toBe(true)
    expect(l.boven).toBeCloseTo(3 * TEGEL, 5)
  })
})

describe('ledge forgiveness', () => {
  it('schuift je tot 3 px opzij als je hoofd net een blok raakt', () => {
    const map = kaart([
      '..........',
      '..........',
      '.....#....',
      '..........',
      '..........',
      '..........',
      '##########',
      '##########',
    ])
    // Lichaam steekt 3 px onder het blok uit, omhoog bewegend.
    const l = new Lichaam(5 * TEGEL - 7, 2 * TEGEL, 10, 20)
    l.vy = -100
    const verschoven = hoekCorrectie(l, map)
    expect(verschoven).toBe(true)
    expect(l.rechts).toBeLessThanOrEqual(5 * TEGEL)
  })
})

describe('tegelsoorten', () => {
  it('kent stekels als dodelijk en platforms als niet-vast', () => {
    const map = kaart(VLOER)
    expect(map.tegel(2, 3)).toBe(T.PLATFORM)
    expect(map.vastOp(2, 3)).toBe(false)
    expect(map.vastOp(5, 5)).toBe(true)
  })

  it('haalt een breekbaar blok weg en zet het bij herstel terug', () => {
    const map = kaart([
      '..........',
      '..........',
      '..bb......',
      '..........',
      '..........',
      '..........',
      '##########',
      '##########',
    ])
    expect(map.vastOp(2, 2)).toBe(true)
    expect(map.sloop(2, 2)).toBe(true)
    expect(map.vastOp(2, 2)).toBe(false)
    map.herstel()
    expect(map.vastOp(2, 2)).toBe(true)
  })

  it('onthult een verborgen blok pas na een klap van onderaf', () => {
    const map = kaart([
      '..........',
      '..........',
      '..x.......',
      '..........',
      '..........',
      '..........',
      '##########',
      '##########',
    ])
    expect(map.tegel(2, 2)).toBe(T.LEEG)
    expect(map.onthul(2, 2)).toBe(true)
    expect(map.tegel(2, 2)).toBe(T.VERBORGEN)
    expect(map.onthul(2, 2)).toBe(false)
  })
})

describe('hulpfuncties', () => {
  it('naar() schiet nooit voorbij het doel', () => {
    expect(naar(0, 10, 3)).toBe(3)
    expect(naar(0, 10, 100)).toBe(10)
    expect(naar(10, 0, 100)).toBe(0)
    expect(naar(5, 5, 3)).toBe(5)
  })

  it('klem() begrenst aan beide kanten', () => {
    expect(klem(-5, 0, 10)).toBe(0)
    expect(klem(15, 0, 10)).toBe(10)
    expect(klem(5, 0, 10)).toBe(5)
  })
})

describe('muntvolgorde', () => {
  it('nummert munten rij voor rij, links naar rechts', () => {
    const map = kaart([
      '..o....o..',
      '..........',
      'o.........',
      '..........',
      '..........',
      '..........',
      '#####S###F',
      '##########',
    ])
    expect(map.munten.map((m) => [m.index, m.x / TEGEL, m.y / TEGEL])).toEqual([
      [0, 2, 0],
      [1, 7, 0],
      [2, 0, 2],
    ])
  })
})
