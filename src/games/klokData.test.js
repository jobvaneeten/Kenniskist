import { describe, it, expect } from 'vitest'
import { tijdInWoorden, tijdLabel, maakOpgave } from './klokData.js'

const t = (h, m) => h * 60 + m

describe('tijdInWoorden', () => {
  it('leest de vaste punten', () => {
    expect(tijdInWoorden(t(3, 0))).toBe('drie uur')
    expect(tijdInWoorden(t(3, 15))).toBe('kwart over drie')
    expect(tijdInWoorden(t(3, 30))).toBe('half vier')
    expect(tijdInWoorden(t(3, 45))).toBe('kwart voor vier')
    expect(tijdInWoorden(t(12, 30))).toBe('half één')
  })
  it('rekent rond half vanaf het volgende uur', () => {
    expect(tijdInWoorden(t(3, 20))).toBe('tien voor half vier')
    expect(tijdInWoorden(t(3, 37))).toBe('zeven over half vier')
    expect(tijdInWoorden(t(15, 58))).toBe('twee voor vier')
  })
})

describe('tijdLabel', () => {
  it('gebruikt de 12-uursklok op de lage levels en 24 uur vanaf level 3', () => {
    expect(tijdLabel(t(12, 15), 'digitaal', 2)).toBe('12:15')
    expect(tijdLabel(t(15, 40), 'digitaal', 3)).toBe('15:40')
  })
})

describe('maakOpgave', () => {
  it('geeft altijd vier verschillende opties met precies één goede', () => {
    for (const modus of ['analoog', 'digitaal']) {
      for (const lvl of [1, 2, 3, 4]) {
        for (let i = 0; i < 200; i++) {
          const o = maakOpgave(modus, lvl)
          const keys = o.opties.map(x => x.key)
          expect(new Set(keys).size).toBe(4)
          expect(keys.filter(k => k === o.goed)).toHaveLength(1)
          expect(new Set(o.opties.map(x => x.label)).size).toBe(4)
        }
      }
    }
  })
})
