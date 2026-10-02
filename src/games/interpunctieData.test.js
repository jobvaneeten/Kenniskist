import { describe, it, expect } from 'vitest'
import { ZINNEN, ONDERDELEN, foutVersies, maakVraag, vragenVoor, pasToe } from './interpunctieData.js'

const ALLE = ONDERDELEN.map(o => o.id)

describe('interpunctie', () => {
  it('elke fout past precies één keer in zijn zin en maakt hem echt anders', () => {
    for (const item of ZINNEN) {
      for (const f of item.fouten) {
        expect(ALLE, f.cat).toContain(f.cat)
        expect(item.zin.split(f.van).length - 1, `${item.zin} — ${f.van}`).toBe(1)
        expect(pasToe(item.zin, [f])).not.toBe(item.zin)
        expect(f.uitleg.length).toBeGreaterThan(10)
      }
    }
  })

  it('twee fouten samen bevatten allebei hun wijziging', () => {
    for (const item of ZINNEN) {
      for (const v of foutVersies(item, ALLE).filter(x => x.fouten.length === 2)) {
        for (const f of v.fouten) expect(v.tekst, item.zin).toContain(f.naar)
      }
    }
  })

  it('elk onderdeel heeft los genoeg zinnen, en elke combinatie ook', () => {
    for (const cat of ALLE) expect(vragenVoor([cat]).length, cat).toBeGreaterThanOrEqual(8)
    for (let i = 0; i < ALLE.length; i++) {
      for (let j = i + 1; j < ALLE.length; j++) {
        expect(vragenVoor([ALLE[i], ALLE[j]]).length).toBeGreaterThanOrEqual(12)
      }
    }
  })

  it('een vraag heeft vier verschillende zinnen waarvan één goed', () => {
    for (const cats of [ALLE, ['komma'], ['aanhalingstekens', 'punten'], ['hoofdletters']]) {
      for (const item of vragenVoor(cats)) {
        const v = maakVraag(item, cats)
        expect(v.opties).toHaveLength(4)
        expect(new Set(v.opties.map(o => o.tekst)).size).toBe(4)
        expect(v.opties.filter(o => o.goed)).toHaveLength(1)
        for (const o of v.opties.filter(x => !x.goed)) {
          for (const f of o.fouten) expect(cats).toContain(f.cat)
        }
      }
    }
  })
})
