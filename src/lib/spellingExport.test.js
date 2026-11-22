import { describe, it, expect } from 'vitest'
import { analyseer } from './dicteeAnalyse.js'
import { bouwSpellingExport, bestandsnaam } from './spellingExport.js'

// Woorden en categorieën van het controledictee groep 7, thema 3 (geen leerlingdata).
const W = (w, ...c) => ({ w, c: c.map(([id, van, tot]) => ({ id, van, tot })) })
const woorden = [
  W('smerige', ['krekel', 2, 3], ['gevaarlijk', 4, 6]),
  W('eetcafé', ['stokstaart', 3, 3], ['hond_hert', 2, 3], ['cavia', 3, 4], ['kameel', 4, 5], ['jaguar', 6, 7]),
  W('nonchalant', ['chimpansee', 3, 5], ['kameel', 5, 6], ['hond_hert', 9, 10]),
  W('etage', ['krekel', 0, 1], ['krekel', 2, 3], ['page', 3, 4]),
  W('vergissinkje', ['winterkoninkje', 7, 12], ['gestreept', 1, 2], ['kikker', 5, 7]),
  W('spannendste', ['kikker', 3, 5], ['hond_hert', 7, 8], ['hoogte', 8, 11]),
  W("'s avonds", ['snachts', 0, 3], ['krekel', 3, 4], ['hond_hert', 7, 8]),
]
const leerlingen = [
  { id: 'a', weergavenaam: 'Kind A' }, { id: 'b', weergavenaam: 'Kind B' },
  { id: 'c', weergavenaam: 'Kind C' }, { id: 'd', weergavenaam: 'Kind D' },
]
const ingeleverd = '2026-11-20T09:35:00Z'
const rijen = [
  { leerling_id: 'a', ingeleverd_op: ingeleverd, antwoorden: ['smeerige', 'eetcafé', 'nonchaland', 'eetage', 'vergisinkje', 'spanendste', 's avonds'] },
  { leerling_id: 'b', ingeleverd_op: ingeleverd, antwoorden: woorden.map(w => w.w) },
  { leerling_id: 'c', ingeleverd_op: ingeleverd, antwoorden: ['smerige', 'etcafé', 'nonchalant', 'etage', 'vergisingkje', 'spannendste', 'savonds'] },
  { leerling_id: 'd', ingeleverd_op: null, antwoorden: ['smer'] },   // nog bezig
]
const dictee = { id: 'toets-1', titel: 'Groep 7, thema 3', woorden, aangemaakt_op: '2026-11-20T08:47:02Z' }

function maak() {
  const ing = rijen.filter(r => r.ingeleverd_op)
  const a = analyseer(woorden, ing)
  return { a, n: ing.length, exp: bouwSpellingExport({ dictee, rijen, leerlingen, a, nu: new Date('2026-11-20T09:43:00Z') }) }
}

describe('export voor de Spellingvolger', () => {
  it('heeft het afgesproken formaat', () => {
    const { exp } = maak()
    expect(exp).toMatchObject({ type: 'kenniskist-spellinganalyse', versie: 1, groep: '7', thema: 3, maxScore: 7, methode: 'Taal actief 5' })
    expect(exp.toets).toEqual({ id: 'toets-1', naam: 'Groep 7, thema 3', afgenomenOp: '2026-11-20' })
    expect(bestandsnaam(exp)).toBe('spellinganalyse_groep7_thema3_2026-11-20.json')
    expect(exp.categorieen.find(c => c.id === 'hond_hert')).toEqual({ id: 'hond_hert', naam: 'hond / hert', regel: expect.any(String), kansen: 4 })
    expect(exp.categorieen.find(c => c.id === 'krekel').kansen).toBe(3)   // etage telt één keer, net als de fouten
  })

  it('neemt iedereen uit de groep mee, ook wie niet inleverde', () => {
    const { exp } = maak()
    expect(exp.leerlingen.map(l => l.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(exp.leerlingen[3]).toEqual({ id: 'd', naam: 'Kind D', ingeleverd: false, score: null, fouten: {}, foutenBuitenCategorie: 0 })
    expect(exp.leerlingen[1]).toMatchObject({ ingeleverd: true, score: 7, fouten: {}, foutenBuitenCategorie: 0 })
  })

  it('geeft per categorie hetzelfde percentage als de analysepagina', () => {
    const { a, n, exp } = maak()
    const ids = new Set(exp.categorieen.map(c => c.id))
    for (const c of exp.categorieen) {
      const fout = exp.leerlingen.filter(l => l.ingeleverd).reduce((s, l) => s + (l.fouten[c.id] || 0), 0)
      const pagina = 100 - Math.round((100 * a.groepCat[c.id].fout) / a.groepCat[c.id].kansen)
      expect(Math.round(100 * (1 - fout / (c.kansen * n)))).toBe(pagina)
    }
    for (const l of exp.leerlingen) for (const k of Object.keys(l.fouten)) expect(ids.has(k)).toBe(true)
    expect(exp.foutenBuitenCategorieTotaal).toBe(a.overig)
  })
})
