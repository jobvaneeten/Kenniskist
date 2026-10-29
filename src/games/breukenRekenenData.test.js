import { describe, it, expect } from 'vitest'
import { maakSom, klopt, ggd } from './breukenRekenenData.js'

const waarde = (x) => (x.heel ?? 0) + (x.t ? x.t / x.n : 0)
const kgv = (a, b) => (a * b) / ggd(a, b)

describe('breuken rekenen', () => {
  it('rekent elke som goed uit en keurt het eigen antwoord goed', () => {
    for (const [soort, ops] of [['plusmin', ['+', '-']], ['keerdelen', ['×', ':']]]) {
      for (const niveau of [1, 2, 3]) {
        for (let i = 0; i < 300; i++) {
          const s = maakSom(soort, niveau, ops), a = waarde(s.links), b = waarde(s.rechts)
          const verwacht = { '+': a + b, '−': a - b, '×': a * b, ':': a / b }[s.op]
          expect(Math.abs(s.uitkomst.t / s.uitkomst.n - verwacht), `${soort} ${niveau}`).toBeLessThan(1e-9)
          expect(klopt({ heel: '', teller: String(s.uitkomst.t), noemer: String(s.uitkomst.n) }, s.uitkomst)).toBe(true)
        }
      }
    }
  })

  it('volgt de niveaus bij plus en min: gelijknamig, één omrekenen, allebei omrekenen', () => {
    for (let i = 0; i < 300; i++) {
      const [s1, s2, s3] = [1, 2, 3].map((nv) => maakSom('plusmin', nv, ['+', '-']))
      expect(s1.links.n).toBe(s1.rechts.n)
      const L2 = kgv(s2.links.n, s2.rechts.n)
      expect(s2.links.n !== s2.rechts.n && (L2 === s2.links.n || L2 === s2.rechts.n)).toBe(true)
      const L3 = kgv(s3.links.n, s3.rechts.n)
      expect(L3 !== s3.links.n && L3 !== s3.rechts.n).toBe(true)
      for (const s of [s1, s2, s3]) expect(s.uitkomst.t / s.uitkomst.n).toBeGreaterThan(0)
      for (const s of [s1, s2, s3]) expect(s.uitkomst.t / s.uitkomst.n).toBeLessThan(1)
    }
  })

  it('geeft alleen de bewerkingen die aanstaan', () => {
    for (let i = 0; i < 100; i++) {
      expect(maakSom('plusmin', 2, ['-']).op).toBe('−')
      expect(maakSom('keerdelen', 3, [':']).op).toBe(':')
    }
  })
})
