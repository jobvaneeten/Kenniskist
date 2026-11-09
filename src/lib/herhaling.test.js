import { describe, it, expect } from 'vitest'
import { herhalingVan, geledenTekst } from './herhaling.js'

const nu = new Date('2026-11-20T12:00:00Z').getTime()

describe('herhaling van een doel', () => {
  it('aan de beurt als de datum voorbij is', () => {
    const h = herhalingVan({ volgende_op: '2026-11-19T10:00:00Z', rondes_ok: 0, vast: false, gehaald_op: '2026-11-05T10:00:00Z' }, nu)
    expect(h).toMatchObject({ nu: true, ronde: 1, vast: false })
  })
  it('nog niet, of vast, of geen rij', () => {
    expect(herhalingVan({ volgende_op: '2026-12-01T10:00:00Z', rondes_ok: 1 }, nu)).toMatchObject({ nu: false, ronde: 2 })
    expect(herhalingVan({ volgende_op: null, rondes_ok: 2, vast: true }, nu)).toMatchObject({ nu: false, vast: true })
    expect(herhalingVan(null)).toBe(null)
  })
  it('hoe lang geleden', () => {
    expect(geledenTekst('2026-11-20T08:00:00Z', nu)).toBe('vandaag')
    expect(geledenTekst('2026-11-15T12:00:00Z', nu)).toBe('5 dagen geleden')
    expect(geledenTekst('2026-11-06T12:00:00Z', nu)).toBe('2 weken geleden')
  })
})
