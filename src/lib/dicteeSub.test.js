import { describe, it, expect } from 'vitest'
import { subVan, analyseer } from './dicteeAnalyse.js'

// Woorden en plekken uit het controledictee groep 7, thema 3 (geen leerlingdata).
const W = (w, ...c) => ({ w, c: c.map(([id, van, tot, x]) => ({ id, van, tot, ...(x ? { x } : {}) })) })
const woorden = [
  W('eetcafé', ['stokstaart', 3, 3], ['hond_hert', 2, 3], ['cavia', 3, 4], ['kameel', 4, 5], ['jaguar', 6, 7]),
  W('eigenwijs', ['stokstaart', 5, 5], ['geit_bij', 0, 2], ['geit_bij', 6, 8]),
  W('nonchalant', ['chimpansee', 3, 5], ['kameel', 5, 6], ['hond_hert', 9, 10]),
  W('douane', ['jaguar', 1, 3], ['krekel', 3, 4]),
  W('spannendste', ['kikker', 3, 5], ['hond_hert', 7, 8], ['hoogte', 8, 11]),
  W('rituelen', ['bizon', 1, 2], ['baviaan_leguaan', 4, 4, 'wj'], ['krekel', 4, 5]),
  W('smerige', ['krekel', 2, 3], ['gevaarlijk', 4, 6]),
]

describe('subcategorieën in het controledictee', () => {
  it('bepaalt de subcategorie uit de plek in het woord', () => {
    const s = (i, j) => subVan(woorden[i].w, woorden[i].c[j])
    expect(s(0, 1)).toBe('hond_hert:hert')
    expect(s(0, 4)).toBe('jaguar:e')
    expect(s(1, 1)).toBe('geit_bij:geit')
    expect(s(1, 2)).toBe('geit_bij:bij')
    expect(s(2, 2)).toBe('hond_hert:hert')
    expect(s(3, 0)).toBe('jaguar:ou')
    expect(s(4, 1)).toBe('hond_hert:hond')
    expect(s(5, 1)).toBe('baviaan_leguaan:leguaan')
    expect(s(6, 1)).toBe('gevaarlijk:giftig')
    expect(s(0, 0)).toBe(null)   // stokstaart heeft geen subcategorieën
  })

  it('telt fouten per subcategorie', () => {
    const rijen = [
      { leerling_id: 'a', antwoorden: ['eetcafe', 'eigenweis', 'nonchalant', 'douane', 'spanendste', 'rituelen', 'smerige'] },
      { leerling_id: 'b', antwoorden: woorden.map(w => w.w) },
    ]
    const a = analyseer(woorden, rijen)
    expect(a.subsVan.geit_bij.sort()).toEqual(['geit_bij:bij', 'geit_bij:geit'])
    expect(a.groepSub['geit_bij:bij']).toMatchObject({ fout: 1, kansen: 2 })
    expect(a.groepSub['geit_bij:geit']).toMatchObject({ fout: 0, kansen: 2 })
    expect(a.groepSub['jaguar:e'].leerlingen).toEqual([{ id: 'a', fout: 1 }])
    expect(a.kansenSub['hond_hert:hert']).toBe(2)
  })
})
