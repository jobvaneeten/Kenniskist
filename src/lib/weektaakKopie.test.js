import { describe, it, expect } from 'vitest'
import { plusDagen, dagenTussen, verschuiving, volgendeTitel, kopieVoorstel } from './weektaakKopie.js'

describe('plusDagen', () => {
  it('telt dagen op', () => {
    expect(plusDagen('2026-01-05', 7)).toBe('2026-01-12')
  })

  it('gaat over een maandgrens heen', () => {
    expect(plusDagen('2026-01-29', 7)).toBe('2026-02-05')
  })

  it('stapt over de zomertijdsprong zonder een dag te verliezen', () => {
    // In Nederland gaat de klok in de nacht van 28 op 29 maart 2026 vooruit.
    expect(plusDagen('2026-03-27', 7)).toBe('2026-04-03')
  })

  it('laat onzin met rust', () => {
    expect(plusDagen('geen datum', 7)).toBe('geen datum')
  })
})

describe('verschuiving', () => {
  it('schuift een gewone weektaak een week op', () => {
    expect(dagenTussen('2026-01-05', '2026-01-09')).toBe(4)
    expect(verschuiving('2026-01-05', '2026-01-09')).toBe(7)
  })

  it('schuift een weektaak van precies zeven dagen ook een week op', () => {
    expect(verschuiving('2026-01-05', '2026-01-11')).toBe(7)
  })

  it('schuift een weektaak van twee weken twee weken op, zodat hij niet overlapt', () => {
    expect(verschuiving('2026-01-05', '2026-01-16')).toBe(14)
  })

  it('schuift een weektaak van één dag ook een hele week op', () => {
    expect(verschuiving('2026-01-05', '2026-01-05')).toBe(7)
  })
})

describe('volgendeTitel', () => {
  it('telt het getal in de titel op', () => {
    expect(volgendeTitel('Weektaak 2')).toBe('Weektaak 3')
    expect(volgendeTitel('Weektaak 9')).toBe('Weektaak 10')
  })

  it('houdt voorloopnullen aan', () => {
    expect(volgendeTitel('Weektaak 09')).toBe('Weektaak 10')
    expect(volgendeTitel('Weektaak 07')).toBe('Weektaak 08')
  })

  it('telt het láátste getal op', () => {
    expect(volgendeTitel('Groep 5 weektaak 3')).toBe('Groep 5 weektaak 4')
  })

  it('houdt tekst achter het getal intact', () => {
    expect(volgendeTitel('Weektaak 3 (rekenen)')).toBe('Weektaak 4 (rekenen)')
  })

  it('zet (kopie) achter een titel zonder getal', () => {
    expect(volgendeTitel('Herfstweek')).toBe('Herfstweek (kopie)')
  })

  it('valt terug op een nette naam bij een lege titel', () => {
    expect(volgendeTitel('')).toBe('Weektaak')
    expect(volgendeTitel(null)).toBe('Weektaak')
  })
})

describe('kopieVoorstel', () => {
  it('vult titel en periode van de week erna in', () => {
    expect(kopieVoorstel({ titel: 'Weektaak 2', start_op: '2026-01-05', eind_op: '2026-01-09' }))
      .toEqual({ titel: 'Weektaak 3', startOp: '2026-01-12', eindOp: '2026-01-16' })
  })

  it('houdt de lengte van de periode gelijk', () => {
    const v = kopieVoorstel({ titel: 'Blok', start_op: '2026-02-02', eind_op: '2026-02-13' })
    expect(dagenTussen(v.startOp, v.eindOp)).toBe(11)
    expect(v.startOp > '2026-02-13').toBe(true)
  })
})
