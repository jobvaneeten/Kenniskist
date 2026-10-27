import { describe, it, expect } from 'vitest'
import { leesVragen, isGoed, normaal, vragenAlsTekst, VOORBEELD_CSV } from './eigenVragen.js'

describe('leesVragen', () => {
  it('leest geplakte Excel-cellen (tabs) en slaat de kopregel over', () => {
    const { vragen, meldingen } = leesVragen('Vraag\tAntwoord\tFout\nHoofdstad van Frankrijk?\tParijs\tLyon\tNice\n7 x 8?\t56\n')
    expect(meldingen).toEqual([])
    expect(vragen).toEqual([
      { vraag: 'Hoofdstad van Frankrijk?', antwoord: 'Parijs', fout: ['Lyon', 'Nice'] },
      { vraag: '7 x 8?', antwoord: '56', fout: [] },
    ])
  })

  it('leest het voorbeeldbestand met puntkomma\'s', () => {
    const { vragen, meldingen } = leesVragen(VOORBEELD_CSV)
    expect(meldingen).toEqual([])
    expect(vragen).toHaveLength(5)
    expect(vragen[0].fout).toEqual(['Lyon', 'Marseille', 'Nice'])
  })

  it('snapt aanhalingstekens in CSV', () => {
    const { vragen } = leesVragen('"Wat is 1,5 + 1,5?",3\n"Zeg ""hallo""",hallo')
    expect(vragen[0]).toEqual({ vraag: 'Wat is 1,5 + 1,5?', antwoord: '3', fout: [] })
    expect(vragen[1].vraag).toBe('Zeg "hallo"')
  })

  it('meldt regels zonder antwoord en slaat lege regels over', () => {
    const { vragen, meldingen } = leesVragen('Vraag zonder antwoord\n\n2 + 2?;4')
    expect(vragen).toHaveLength(1)
    expect(meldingen[0]).toMatch(/Regel 1/)
  })

  it('kan terug naar tekst en weer ingelezen worden', () => {
    const { vragen } = leesVragen(VOORBEELD_CSV)
    expect(leesVragen(vragenAlsTekst(vragen)).vragen).toEqual(vragen)
  })
})

describe('isGoed', () => {
  it('let niet op hoofdletters, spaties en een punt aan het eind', () => {
    expect(isGoed('  parijs. ', 'Parijs')).toBe(true)
    expect(isGoed('Lyon', 'Parijs')).toBe(false)
    expect(isGoed('', 'Parijs')).toBe(false)
  })
  it('komma en punt in getallen zijn gelijk', () => {
    expect(isGoed('2,5', '2.5')).toBe(true)
    expect(normaal('08')).toBe('8')
  })
  it('meer goede antwoorden met " / "', () => {
    expect(isGoed("'s-gravenhage", "Den Haag / 's-Gravenhage")).toBe(true)
    expect(isGoed('3/4', '3/4')).toBe(true)
  })
})
