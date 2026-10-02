import { describe, it, expect } from 'vitest'
import { GEBIEDEND, NIET_GEBIEDEND, maakGebiedendVraag } from './gebiedendeWijsData.js'

describe('gebiedende wijs', () => {
  it('geen dubbele zinnen, en goed en fout lopen niet door elkaar', () => {
    const fout = NIET_GEBIEDEND.map(n => n.zin)
    expect(new Set(GEBIEDEND).size).toBe(GEBIEDEND.length)
    expect(new Set(fout).size).toBe(fout.length)
    for (const z of GEBIEDEND) expect(fout).not.toContain(z)
  })

  it('elke vraag: vier zinnen, één goed, altijd een vraag en een bevel-met-onderwerp erbij', () => {
    for (const goed of GEBIEDEND) {
      const v = maakGebiedendVraag(goed)
      expect(v.opties).toHaveLength(4)
      expect(new Set(v.opties.map(o => o.zin)).size).toBe(4)
      expect(v.opties.filter(o => o.goed).map(o => o.zin)).toEqual([goed])
      const soorten = v.opties.filter(o => !o.goed).map(o => o.soort)
      expect(soorten).toContain('vraag')
      expect(soorten).toContain('onderwerp')
    }
  })
})
