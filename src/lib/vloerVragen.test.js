import { describe, it, expect } from 'vitest'
import { eigenNaarVloer, tafel, woordenschat, hoofdsteden, kiesVragen, VASTE_REEKSEN } from './vloerVragen.js'

const geldig = (v) => {
  expect(v.vraag).toBeTruthy()
  expect(v.goed).toBeTruthy()
  expect(v.fout.length).toBeGreaterThan(0)
  expect(v.fout.length).toBeLessThanOrEqual(3)
  expect(v.fout.map(f => f.toLowerCase())).not.toContain(v.goed.toLowerCase())
  expect(new Set(v.fout).size).toBe(v.fout.length)
}

describe('vloerVragen', () => {
  it('eigen oefening: open vragen krijgen foute keuzes uit de andere antwoorden', () => {
    const v = eigenNaarVloer({ id: 'x', vragen: [
      { vraag: 'Hoofdstad van Nederland?', antwoord: 'Amsterdam / A\'dam', fout: [] },
      { vraag: 'Hoeveel poten heeft een spin?', antwoord: '8', fout: ['6', '10', '4'] },
      { vraag: '7 x 8?', antwoord: '56' },
    ] })
    expect(v).toHaveLength(3)
    v.forEach(geldig)
    expect(v[0].goed).toBe('Amsterdam')
    expect(v[1].fout).toEqual(['6', '10', '4'])
  })

  it('een eigen oefening met één open vraag kan niet (geen foute keuze)', () => {
    expect(eigenNaarVloer({ id: 'y', vragen: [{ vraag: 'a', antwoord: 'b' }] })).toHaveLength(0)
  })

  it('tafels, woordenschat en hoofdsteden zijn allemaal speelbaar', () => {
    const t = tafel(7)
    expect(t).toHaveLength(10)
    expect(t.find(v => v.vraag === '8 × 7').goed).toBe('56')
    t.forEach(geldig)
    tafel(1).forEach(geldig)
    expect(woordenschat(2).length).toBeGreaterThan(30)
    woordenschat(2).forEach(v => { geldig(v); expect(v.fout).toHaveLength(3) })
    const h = hoofdsteden()
    expect(h.find(v => v.vraag.includes('Frankrijk')).goed).toBe('Parijs')
    h.forEach(geldig)
    VASTE_REEKSEN.forEach(r => expect(r.vragen().length).toBeGreaterThan(0))
  })

  it('kiesVragen neemt het aantal en geeft alleen wat de server nodig heeft', () => {
    const k = kiesVragen(tafel(3), 4)
    expect(k).toHaveLength(4)
    expect(Object.keys(k[0]).sort()).toEqual(['fout', 'goed', 'vraag'])
    expect(kiesVragen(tafel(3), 99, false).map(v => v.vraag)[0]).toBe('1 × 3')
  })
})
