import { describe, it, expect, beforeEach } from 'vitest'
import { spelNa, heeftSpel } from './beloning.js'

const opslag = {}
globalThis.localStorage = {
  getItem: (k) => (k in opslag ? opslag[k] : null),
  setItem: (k, v) => { opslag[k] = String(v) },
  removeItem: (k) => { delete opslag[k] },
}
const zetKlas = (spelNa) => localStorage.setItem('kk_profiel_cache', JSON.stringify({ id: 'x', spelNa }))

beforeEach(() => localStorage.removeItem('kk_profiel_cache'))

describe('spelNa: hoe vaak een spelletje, per klas', () => {
  it('gebruikt de standaard van de oefening zonder instelling of zonder login', () => {
    expect(spelNa(5)).toBe(5)
    zetKlas(null)
    expect(spelNa(10)).toBe(10)
  })
  it('gebruikt het aantal dat de leerkracht koos', () => {
    zetKlas(15)
    expect(spelNa(5)).toBe(15)
    expect(heeftSpel(spelNa(5))).toBe(true)
  })
  it('geeft nooit een spelletje als de klas er geen krijgt', () => {
    zetKlas(0)
    const per = spelNa(5)
    expect(heeftSpel(per)).toBe(false)
    // de tellers in de oefeningen halen hem nooit
    for (let n = 1; n < 500; n++) {
      expect(n >= per).toBe(false)
      expect(n % per === 0).toBe(false)
    }
  })
  it('valt terug op de standaard bij een kapotte cache', () => {
    localStorage.setItem('kk_profiel_cache', '{kapot')
    expect(spelNa(5)).toBe(5)
  })
})
