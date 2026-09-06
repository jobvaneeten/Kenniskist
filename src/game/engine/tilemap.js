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
  BROOS: 10, // dun ijs: barst zodra je erop staat, komt later terug
  DEUR: 11,  // vast tot je de sleutelkaart hebt
}

const VAST_SET = new Set([T.VAST, T.BREEKBAAR, T.IJS, T.BAND_LINKS, T.BAND_RECHTS, T.BROOS, T.DEUR])

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
  i: { tegel: T.BROOS },
  d: { tegel: T.DEUR },
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
  P: { ent: 'vijand', soort: 'pinguin' },
  Y: { ent: 'vijand', soort: 'ijsstekel' },
  W: { ent: 'vijand', soort: 'kanon' },
  Z: { ent: 'vijand', soort: 'kanon', naarLinks: true },
  L: { ent: 'vijand', soort: 'vrieskwal' },
  A: { ent: 'vijand', soort: 'spetter' },
  U: { ent: 'vijand', soort: 'vleermuis' },
  R: { ent: 'vijand', soort: 'krab' },
  D: { ent: 'vijand', soort: 'asvlieg' },
  G: { ent: 'geiser' },
  j: { ent: 'laser', richting: 'v' },
  k: { ent: 'laser', richting: 'h' },
  q: { ent: 'sleutel' },
  X: { ent: 'vijand', soort: 'drone' },
  O: { ent: 'vijand', soort: 'torret' },
  n: { ent: 'vijand', soort: 'kortsluiter' },
  r: { ent: 'vijand', soort: 'patrouille' },
  z: { ent: 'zinkplatform' },
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
    // Dun ijs: index -> { staat: 'barst' | 'weg', t }. Tegels die er niet in
    // staan zijn heel.
    this.broos = new Map()
    // Deuren staan open zodra alle sleutelkaarten van het level gepakt zijn.
    this.deurenOpen = false
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
    if (t === T.BROOS && this.broos.get(i)?.staat === 'weg') return T.LEEG
    if (t === T.DEUR && this.deurenOpen) return T.LEEG
    return t
  }

  // --- Dun ijs -------------------------------------------------------------

  // Wordt aangeroepen zodra de speler op de tegel staat. Barsten duurt even,
  // zodat je het ziet gebeuren en nog weg kunt springen.
  betreedBroos(tx, ty) {
    const i = ty * this.w + tx
    if (this.tegels[i] !== T.BROOS || this.broos.has(i)) return false
    this.broos.set(i, { staat: 'barst', t: 0.55 })
    this.veranderd.push([tx, ty])
    return true
  }

  broosStaat(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return null
    return this.broos.get(ty * this.w + tx) ?? null
  }

  updateTegels(dt) {
    if (this.broos.size === 0) return
    for (const [i, s] of this.broos) {
      s.t -= dt
      if (s.t > 0) continue
      if (s.staat === 'barst') {
        s.staat = 'weg'
        s.t = 2.6
        this.veranderd.push([i % this.w, Math.floor(i / this.w)])
      } else {
        this.broos.delete(i)
        this.veranderd.push([i % this.w, Math.floor(i / this.w)])
      }
    }
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
    this.broos.clear()
    this.deurenOpen = false
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
