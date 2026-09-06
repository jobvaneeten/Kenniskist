import { describe, it, expect } from 'vitest'
import { groepeer, korteDatum } from './weektaakMapjes.js'

// De leerkracht zet opdrachten klaar per weektaak. De leerling zag ze eerst
// allemaal door elkaar in één lijst; nu eerst het mapje, daarna de inhoud.

const wt = (id, titel, start) => ({ id, titel, start_op: start, eind_op: '2026-01-09' })
const opdracht = (opdrachtId, weektaak, klaar = false) => ({
  opdrachtId, toolId: 'tafels', weektaak, klaar,
})

describe('groepeer', () => {
  it('zet opdrachten in het mapje van hun weektaak', () => {
    const w1 = wt('a', 'Weektaak 1', '2026-01-05')
    const w2 = wt('b', 'Weektaak 2', '2026-01-12')
    const mappen = groepeer([opdracht(1, w1), opdracht(2, w2), opdracht(3, w1)])
    expect(mappen).toHaveLength(2)
    expect(mappen.map((m) => m.titel)).toEqual(['Weektaak 2', 'Weektaak 1'])
    expect(mappen.find((m) => m.titel === 'Weektaak 1').opdrachten).toHaveLength(2)
  })

  it('zet de nieuwste weektaak bovenaan', () => {
    const mappen = groepeer([
      opdracht(1, wt('oud', 'Oud', '2026-01-01')),
      opdracht(2, wt('nieuw', 'Nieuw', '2026-02-01')),
    ])
    expect(mappen[0].titel).toBe('Nieuw')
  })

  it('houdt de einddatum bij het mapje', () => {
    const [m] = groepeer([opdracht(1, wt('a', 'Weektaak 3', '2026-01-05'))])
    expect(m.eindOp).toBe('2026-01-09')
  })

  it('houdt de volgorde binnen een mapje intact', () => {
    const w = wt('a', 'Weektaak 1', '2026-01-05')
    const mappen = groepeer([opdracht(3, w), opdracht(1, w), opdracht(2, w)])
    expect(mappen[0].opdrachten.map((o) => o.opdrachtId)).toEqual([3, 1, 2])
  })

  it('vangt een opdracht zonder weektaak op in plaats van te crashen', () => {
    const mappen = groepeer([{ opdrachtId: 9, toolId: 'tafels' }])
    expect(mappen).toHaveLength(1)
    expect(mappen[0].titel).toBe('Weektaak')
    expect(mappen[0].opdrachten).toHaveLength(1)
  })

  it('geeft een lege lijst terug als er niets is', () => {
    expect(groepeer([])).toEqual([])
  })
})

describe('korteDatum', () => {
  it('maakt er een korte Nederlandse datum van', () => {
    // Middag als tijdstip, zodat een tijdzone-verschuiving nooit een dag scheelt.
    expect(korteDatum('2026-01-09')).toMatch(/9/)
  })

  it('geeft een lege string bij niets of onzin', () => {
    expect(korteDatum(null)).toBe('')
    expect(korteDatum('geen datum')).toBe('')
  })
})
