import { describe, it, expect } from 'vitest'
import { Tilemap, TEGEL } from '../engine/tilemap.js'
import { BASIS } from '../engine/physics.js'
import { BAAS_KLASSEN } from './bazen.js'
import { ALLE_LEVELS } from '../data/levels/index.js'
import { paletVoorWereld } from '../art/palet.js'

// Elke baas moet te verslaan zijn door op het goede moment op zijn kop te
// springen. Twee dingen konden dat stilletjes onmogelijk maken:
//
//   1. de baas hangt tijdens zijn kwetsbare venster hoger dan je kunt springen
//      (de Kern-AI hing op 58 px, de Verslinder op 70, en je haalt er 56);
//   2. het venster komt nooit, omdat een fase vastloopt.
//
// Deze test speelt daarom elke baas een minuut lang na met een stilstaande
// speler en kijkt hoe hoog het raakvlak dan staat.

// Hoogte die de voeten halen vanaf de vloer: v² / 2g.
const SPRONGHOOGTE = (BASIS.sprong * BASIS.sprong) / (2 * BASIS.zwaartekrachtOp)
const STAP = 1 / 60

// Waar je op moet landen. Voor de titaan is dat alleen zijn kop, voor de rest
// de bovenkant van zijn raakbox.
function stampVlak(baas) {
  return baas.kopVlak ? baas.kopVlak.y : baas.lichaam.y
}

// Bazen schieten projectielen, en die bakken bij het ontstaan hun sprite naar
// een offscreen canvas. Voor deze test hoeft er niets getekend te worden, dus
// een canvas dat alles slikt is genoeg — geen jsdom nodig.
if (typeof document === 'undefined') {
  const nepCtx = new Proxy({}, {
    get: (doel, sleutel) => (sleutel in doel ? doel[sleutel] : () => {}),
    set: () => true,
  })
  globalThis.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => nepCtx }),
  }
}

// Genoeg van de wereld om een baas te laten draaien: hij beweegt zelf, botst
// hooguit tegen de vloer en praat verder alleen met deze vier dingen.
const nepFx = {
  schud() {}, hitStop() {}, flitsScherm() {}, toonTekst() {},
}
const nepParticles = {
  landing() {}, spuit() {}, pop() {}, sparkle() {},
}

function bouw(level) {
  const map = new Tilemap(level)
  const plek = map.entiteiten.find((e) => e.type === 'baas')
  expect(plek, `${level.id} heeft geen baasmarkering`).toBeTruthy()
  const Klasse = BAAS_KLASSEN[level.baas]
  expect(Klasse, `${level.id}: onbekende baas '${level.baas}'`).toBeTruthy()
  const baas = new Klasse(plek.x, plek.y, paletVoorWereld(level.wereld), {
    links: 2 * TEGEL,
    rechts: map.breedtePx - 2 * TEGEL,
  })
  // De vloer is de tegelrij onder de markering; daar staat de speler ook.
  return { map, baas, grondY: plek.y + TEGEL }
}

// Een speler die stil op de vloer staat, midden in de arena.
function nepSpeler(map, grondY) {
  return { midX: map.breedtePx / 2, midY: grondY - 12 }
}

const baasLevels = ALLE_LEVELS.filter((l) => l.baas)

describe('bazen', () => {
  it('heeft vijf baaslevels', () => {
    expect(baasLevels).toHaveLength(5)
  })

  for (const level of baasLevels) {
    describe(`${level.id} — ${level.naam}`, () => {
      it('komt binnen een minuut in zijn kwetsbare venster', () => {
        const { map, baas, grondY } = bouw(level)
        const speler = nepSpeler(map, grondY)
        let vensters = 0
        let vorigKwetsbaar = false
        for (let n = 0; n < 60 * 60; n++) {
          baas.update(STAP, map, speler, nepParticles, nepFx)
          const nu = baas.kwetsbaar > 0
          if (nu && !vorigKwetsbaar) vensters++
          vorigKwetsbaar = nu
        }
        expect(vensters, `${level.id} werd nooit kwetsbaar`).toBeGreaterThan(0)
      })

      it('is dan te raken vanaf de vloer', () => {
        const { map, baas, grondY } = bouw(level)
        const speler = nepSpeler(map, grondY)
        // Laagste stand van het raakvlak tijdens een kwetsbaar venster.
        let laagste = Infinity
        for (let n = 0; n < 60 * 60; n++) {
          baas.update(STAP, map, speler, nepParticles, nepFx)
          if (baas.kwetsbaar > 0) laagste = Math.min(laagste, grondY - stampVlak(baas))
        }
        expect(laagste).toBeLessThan(Infinity)
        // Vier pixels marge: precies op de millimeter halen is geen spel.
        expect(
          laagste,
          `${level.id}: het raakvlak staat ${laagste.toFixed(1)} px boven de vloer,`
          + ` maar je springt maar ${SPRONGHOOGTE.toFixed(1)} px hoog`,
        ).toBeLessThanOrEqual(SPRONGHOOGTE - 4)
      })

      it('gaat door alle drie de fases heen naar dood', () => {
        const { map, baas, grondY } = bouw(level)
        const speler = nepSpeler(map, grondY)
        let treffers = 0
        for (let n = 0; n < 60 * 180 && !baas.klaar; n++) {
          baas.update(STAP, map, speler, nepParticles, nepFx)
          if (baas.kwetsbaar > 0) {
            // Een speler die precies op het raakvlak landt.
            const top = stampVlak(baas)
            const vlak = baas.kopVlak ?? baas.lichaam
            const l = {
              x: vlak.x + 2, y: top - 20, w: 12, h: 24,
              get links() { return this.x },
              get rechts() { return this.x + this.w },
              get onder() { return this.y + this.h },
            }
            if (baas.opStamp(nepParticles, nepFx, l)) treffers++
          }
        }
        expect(treffers, `${level.id}: geen enkele stamp kwam aan`).toBeGreaterThanOrEqual(9)
        expect(baas.klaar, `${level.id} ging na negen treffers niet dood`).toBe(true)
      })
    })
  }
})
