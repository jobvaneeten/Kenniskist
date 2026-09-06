// Leest de ASCII-kaart van een level in een tilegrid plus een lijst entiteiten.
//
// De muntvolgorde is hier vastgelegd en mag nooit veranderen: rij voor rij,
// links naar rechts. Bit n van het opgeslagen masker is de n-de munt in die
// volgorde. tools/validate-levels.js hasht de kaart zodat een gewijzigd level
// niet stil andermans munten "al gepakt" maakt.

export const TEGEL = 16 // pixels

export const T = {
  LEEG: 0,
  VAST: 1,
  PLATFORM: 2, // van onderaf doorheen te springen
  STEKEL: 3,
  BREEKBAAR: 4,
  VERBORGEN: 5, // onzichtbaar tot je hem van onderaf raakt
  LAVA: 6,
  IJS: 7,
  BAND_LINKS: 8,
  BAND_RECHTS: 9,
}

const VAST_SET = new Set([T.VAST, T.BREEKBAAR, T.IJS, T.BAND_LINKS, T.BAND_RECHTS])

export const isVast = (t) => VAST_SET.has(t)
export const isDodelijk = (t) => t === T.STEKEL || t === T.LAVA

// Standaardlegenda. Levels mogen hem per bestand aanvullen of overschrijven,
// maar in de praktijk gebruikt bijna elk level alleen deze tekens.
export const LEGENDA = {
  '.': { tegel: T.LEEG },
  ' ': { tegel: T.LEEG },
  '#': { tegel: T.VAST },
  '=': { tegel: T.PLATFORM },
  '^': { tegel: T.STEKEL },
  b: { tegel: T.BREEKBAAR },
  x: { tegel: T.VERBORGEN },
  '~': { tegel: T.LAVA },
  I: { tegel: T.IJS },
  '<': { tegel: T.BAND_LINKS },
  '>': { tegel: T.BAND_RECHTS },

  // Entiteiten. De tegel eronder is altijd leeg.
  S: { ent: 'start' },
  F: { ent: 'finish' },
  C: { ent: 'checkpoint' },
  o: { ent: 'munt' },
  v: { ent: 'veer' },
  E: { ent: 'vijand', soort: 'slijm' },
  J: { ent: 'vijand', soort: 'spoor' },
  K: { ent: 'vijand', soort: 'kwal' },
  B: { ent: 'vijand', soort: 'kever' },
  M: { ent: 'platform', richting: 'h' },
  N: { ent: 'platform', richting: 'v' },
  V: { ent: 'valplatform' },
  '?': { ent: 'capsule' },
  H: { ent: 'hint' },
  Q: { ent: 'baas' },
}

export class Tilemap {
  constructor(level, legendaExtra = {}) {
    this.level = level
    const legenda = { ...LEGENDA, ...legendaExtra, ...(level.legenda ?? {}) }
    const kaart = level.kaart

    this.h = kaart.length
    this.w = Math.max(...kaart.map((r) => r.length))
    this.tegels = new Uint8Array(this.w * this.h)

    this.start = { x: 1, y: 1 }
    this.finish = null
    this.checkpoints = []
    this.munten = [] // { x, y, index } — index = volgorde in leesrichting
    this.entiteiten = [] // { type, x, y, ...opties }
    this.hints = []

    let muntTeller = 0

    for (let y = 0; y < this.h; y++) {
      const rij = kaart[y]
      for (let x = 0; x < this.w; x++) {
        const teken = rij[x] ?? '.'
        const def = legenda[teken]
        if (!def) {
          throw new Error(`Onbekend teken '${teken}' in ${level.id} op rij ${y}, kolom ${x}`)
        }
        if (def.tegel != null) {
          this.tegels[y * this.w + x] = def.tegel
          continue
        }
        // Middelpunt van de tegel in pixels; entiteiten positioneren zichzelf.
        const px = x * TEGEL
        const py = y * TEGEL
        switch (def.ent) {
          case 'start': this.start = { x: px, y: py }; break
          case 'finish': this.finish = { x: px, y: py }; break
          case 'checkpoint': this.checkpoints.push({ x: px, y: py }); break
          case 'munt': this.munten.push({ x: px, y: py, index: muntTeller++ }); break
          case 'hint': this.hints.push({ x: px, y: py, tekst: level.hints?.[this.hints.length] ?? '' }); break
          default:
            this.entiteiten.push({ type: def.ent, x: px, y: py, ...def, tegelX: x, tegelY: y })
        }
      }
    }

    if (!this.finish) throw new Error(`${level.id} heeft geen finish`)
    this.breedtePx = this.w * TEGEL
    this.hoogtePx = this.h * TEGEL

    // Tegels die kapot zijn geslagen deze poging; wordt bij respawn gereset.
    this.kapot = new Set()
    this.onthuld = new Set()
    // Wachtrij voor de tekenlaag: welke tegels wijken af van de gebakken
    // chunk. De scène leegt hem elke frame.
    this.veranderd = []
  }

  tegel(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return T.LEEG
    const i = ty * this.w + tx
    if (this.kapot.has(i)) return T.LEEG
    const t = this.tegels[i]
    if (t === T.VERBORGEN && !this.onthuld.has(i)) return T.LEEG
    return t
  }

  // De ruwe tegel, zonder kapot/verborgen-correctie. Voor de tekenlaag.
  ruw(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return T.LEEG
    return this.tegels[ty * this.w + tx]
  }

  vastOp(tx, ty) { return isVast(this.tegel(tx, ty)) }

  // Eén-richtingsplatform telt alleen als vast wanneer je van boven komt; die
  // beslissing valt in physics.js, hier alleen de vraag "staat er iets".
  platformOp(tx, ty) { return this.tegel(tx, ty) === T.PLATFORM }

  dodelijkOp(tx, ty) { return isDodelijk(this.tegel(tx, ty)) }

  sloop(tx, ty) {
    const i = ty * this.w + tx
    if (this.tegels[i] === T.BREEKBAAR) { this.kapot.add(i); this.veranderd.push([tx, ty]); return true }
    return false
  }

  onthul(tx, ty) {
    const i = ty * this.w + tx
    if (this.tegels[i] === T.VERBORGEN && !this.onthuld.has(i)) {
      this.onthuld.add(i)
      this.veranderd.push([tx, ty])
      return true
    }
    return false
  }

  herstel() {
    this.kapot.clear()
    this.onthuld.clear()
    this.veranderd.length = 0
  }

  // Buren als bitmasker voor de tileset-autotiling: 1=boven 2=rechts 4=onder
  // 8=links. Alleen gebruikt bij het bakken van de chunk-cache.
  buren(tx, ty) {
    const zelf = this.ruw(tx, ty)
    const gelijk = (a, b) => isVast(a) === isVast(b) && (a === T.LAVA) === (b === T.LAVA)
    let m = 0
    if (gelijk(zelf, this.ruw(tx, ty - 1))) m |= 1
    if (gelijk(zelf, this.ruw(tx + 1, ty))) m |= 2
    if (gelijk(zelf, this.ruw(tx, ty + 1))) m |= 4
    if (gelijk(zelf, this.ruw(tx - 1, ty))) m |= 8
    return m
  }
}
