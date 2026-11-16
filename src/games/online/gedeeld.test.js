import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

// De arena-data van de online spellen komt uit de server-repo
// (kenniskist-server/src/gedeeld/, gekopieerd met `npm run gedeeld` daar).
// Staat de server naast de site, dan moet de kopie gelijk zijn aan de bron.
// In de Cloudflare-build staat de server er niet: dan slaat deze test over.
const KOP = '// KOPIE uit kenniskist-server/src/gedeeld/ (npm run gedeeld). Pas het daar aan, niet hier.\n'
const hier = path.join(process.cwd(), 'src', 'games', 'online', 'gedeeld')
const bron = path.join(process.cwd(), '..', 'kenniskist-server', 'src', 'gedeeld')
const lees = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')

describe('gedeelde arena-data', () => {
  it('elke kopie begint met de waarschuwing', () => {
    for (const f of fs.readdirSync(hier).filter(f => f.endsWith('.js'))) {
      expect(lees(path.join(hier, f)).startsWith(KOP), f).toBe(true)
    }
  })
  it.skipIf(!fs.existsSync(bron))('is gelijk aan de bron in kenniskist-server (anders: npm run gedeeld daar)', () => {
    for (const f of fs.readdirSync(bron).filter(f => f.endsWith('.js'))) {
      expect(lees(path.join(hier, f)), f).toBe(KOP + lees(path.join(bron, f)))
    }
  })
})
