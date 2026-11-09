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

describe('CSV uit Excel', () => {
  it('slaat een regel sep=; en de kopregel over', () => {
    const { vragen } = leesVragen('sep=;\r\nVraag;Goed antwoord;Fout 1\r\nHoofdstad?;Parijs;Lyon\r\n;;\r\n')
    expect(vragen).toEqual([{ vraag: 'Hoofdstad?', antwoord: 'Parijs', fout: ['Lyon'] }])
  })
  it('herkent ook een kopregel "Vragen; Antwoorden"', () => {
    expect(leesVragen('Vragen;Antwoorden\nA?;b\n').vragen).toHaveLength(1)
  })
})

describe('nummerkolom en kopjes', () => {
  it('laat een nummerkolom vooraan weg (met kopregel)', () => {
    const { vragen } = leesVragen('Nr;Vraag;Goed antwoord;Fout 1\r\n1;Hoofdstad?;Parijs;Lyon\r\n2;7 x 8?;56;\r\n')
    expect(vragen).toEqual([{ vraag: 'Hoofdstad?', antwoord: 'Parijs', fout: ['Lyon'] }, { vraag: '7 x 8?', antwoord: '56', fout: [] }])
  })
  it('laat een nummerkolom vooraan weg (zonder kopregel)', () => {
    const { vragen } = leesVragen('1.;Hoofdstad?;Parijs\n2.;Hoeveel poten heeft een spin?;8\n')
    expect(vragen.map(v => v.vraag)).toEqual(['Hoofdstad?', 'Hoeveel poten heeft een spin?'])
  })
  it('volgt de kopjes in een andere volgorde', () => {
    const { vragen } = leesVragen('Antwoord;Vraag\nParijs;Hoofdstad?\n')
    expect(vragen).toEqual([{ vraag: 'Hoofdstad?', antwoord: 'Parijs', fout: [] }])
  })
  it('een rij antwoorden plakken blijft gewoon staan', () => {
    const { vragen } = leesVragen('Wat is 2 x 2?;4\nWat is 3 x 3?;9\n')
    expect(vragen).toHaveLength(2)
  })
})

describe('Blooket-sjabloon', () => {
  it('leest vraag, goed antwoord (nummer) en de foute keuzes', () => {
    const csv = '"Blooket\nImport Template",,,,,,,,,\nQuestion #,Question Text,Answer 1,Answer 2,"Answer 3\n(Optional)","Answer 4\n(Optional)","Time Limit (sec)\n(Max: 300 seconds)","Correct Answer(s)\n(Only include Answer #)",,,\n1,Mijn opa houdt ... wandelen.,van,op,aan,naar,20,1,,,\n2,Wij kijken ... een film.,op,naar,aan,voor,20,2,,,\n'
    const { vragen, meldingen } = leesVragen(csv)
    expect(meldingen).toEqual([])
    expect(vragen).toEqual([
      { vraag: 'Mijn opa houdt ... wandelen.', antwoord: 'van', fout: ['op', 'aan', 'naar'] },
      { vraag: 'Wij kijken ... een film.', antwoord: 'naar', fout: ['op', 'aan', 'voor'] },
    ])
  })
})
