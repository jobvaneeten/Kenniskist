// AABB-collision tegen het tilegrid, per as opgelost: eerst X, dan Y. Dat is de
// reden dat je nooit in een binnenhoek blijft haken en nooit door een vloer
// zakt bij hoge valsnelheid.
//
// Alle constanten in pixels per seconde. Eén tegel is 16 px.

import { TEGEL, T, isVast } from './tilemap.js'

export const BASIS = {
  loop: 112,            // 7 tegels/s
  ren: 176,             // 11 tegels/s
  accelGrond: 720,
  accelLucht: 448,
  wrijvingGrond: 960,
  wrijvingLucht: 192,
  sprong: 330,          // ≈ 3,5 tegels hoog
  zwaartekrachtOp: 960,
  zwaartekrachtNeer: 1450,
  maxVal: 352,
  sprongAfkap: 150,     // bij loslaten wordt opwaartse snelheid hierop afgekapt
  coyote: 6 / 60,
  buffer: 6 / 60,
  stampBounce: 250,
  stampBounceHoog: 330,
  ijsWrijving: 90,      // gladde grond: bijna geen remweg
  duwSnelheid: 60,      // lopende banden
}

export class Lichaam {
  constructor(x, y, w, h) {
    this.x = x
    this.y = y
    this.w = w
    this.h = h
    this.vx = 0
    this.vy = 0
    this.opGrond = false
    this.tegenPlafond = false
    this.tegenMuur = 0 // -1 links, 1 rechts, 0 geen
    this.vorigeX = x
    this.vorigeY = y
    this.negeerPlatform = 0 // seconden waarin je door een one-way platform valt
    this.opPlatform = null  // bewegend platform waar we op staan
    // Omgekeerde zwaartekracht: "de grond" is dan het plafond. Alleen de speler
    // gebruikt dit (wereld 5 en de Kern-AI); vijanden lopen gewoon door.
    this.omgekeerd = false
  }

  get links() { return this.x }
  get rechts() { return this.x + this.w }
  get boven() { return this.y }
  get onder() { return this.y + this.h }
  get midX() { return this.x + this.w / 2 }
  get midY() { return this.y + this.h / 2 }

  raakt(a) {
    return this.x < a.x + a.w && this.x + this.w > a.x && this.y < a.y + a.h && this.y + this.h > a.y
  }
}

// Verplaatst het lichaam en lost de botsingen op. Geeft terug wat er geraakt
// is, zodat de aanroeper daar geluid/particles/schade aan kan hangen.
export function beweeg(lichaam, map, dt) {
  const uit = { grondGeraakt: false, plafondGeraakt: false, muurGeraakt: 0, koppen: [] }

  lichaam.vorigeX = lichaam.x
  lichaam.vorigeY = lichaam.y
  if (lichaam.negeerPlatform > 0) lichaam.negeerPlatform -= dt

  // --- X ---------------------------------------------------------------
  lichaam.x += lichaam.vx * dt
  lichaam.tegenMuur = 0
  if (lichaam.vx !== 0) {
    const naarRechts = lichaam.vx > 0
    const rand = naarRechts ? lichaam.rechts : lichaam.links
    const tx = Math.floor((naarRechts ? rand - 0.001 : rand) / TEGEL)
    const y0 = Math.floor(lichaam.boven / TEGEL)
    const y1 = Math.floor((lichaam.onder - 0.001) / TEGEL)
    for (let ty = y0; ty <= y1; ty++) {
      if (isVast(map.tegel(tx, ty))) {
        lichaam.x = naarRechts ? tx * TEGEL - lichaam.w : (tx + 1) * TEGEL
        lichaam.vx = 0
        lichaam.tegenMuur = naarRechts ? 1 : -1
        uit.muurGeraakt = lichaam.tegenMuur
        break
      }
    }
  }

  // --- Y ---------------------------------------------------------------
  lichaam.y += lichaam.vy * dt
  lichaam.opGrond = false
  lichaam.tegenPlafond = false

  if (lichaam.vy >= 0) {
    const ty = Math.floor((lichaam.onder - 0.001) / TEGEL)
    const x0 = Math.floor(lichaam.links / TEGEL)
    const x1 = Math.floor((lichaam.rechts - 0.001) / TEGEL)
    for (let tx = x0; tx <= x1; tx++) {
      const t = map.tegel(tx, ty)
      const vast = isVast(t)
      // One-way: alleen pakken als we er vorige frame nog bovenop stonden.
      // One-way platforms vangen je alleen van boven op, en niet als de
      // zwaartekracht omgekeerd staat — dan val je er juist vanaf.
      const eenrichting =
        t === T.PLATFORM &&
        !lichaam.omgekeerd &&
        lichaam.negeerPlatform <= 0 &&
        lichaam.vorigeY + lichaam.h <= ty * TEGEL + 1
      if (vast || eenrichting) {
        lichaam.y = ty * TEGEL - lichaam.h
        lichaam.vy = 0
        // Bij omgekeerde zwaartekracht is de vloer het plafond: dan is dit een
        // botsing met je hoofd, niet met je voeten.
        if (lichaam.omgekeerd) {
          lichaam.tegenPlafond = true
          uit.plafondGeraakt = true
          uit.koppen.push({ tx, ty })
        } else {
          lichaam.opGrond = true
          uit.grondGeraakt = true
        }
        break
      }
    }
  } else {
    const ty = Math.floor(lichaam.boven / TEGEL)
    const x0 = Math.floor(lichaam.links / TEGEL)
    const x1 = Math.floor((lichaam.rechts - 0.001) / TEGEL)
    for (let tx = x0; tx <= x1; tx++) {
      const t = map.tegel(tx, ty)
      const eenrichting =
        t === T.PLATFORM &&
        lichaam.omgekeerd &&
        lichaam.negeerPlatform <= 0 &&
        lichaam.vorigeY >= (ty + 1) * TEGEL - 1
      if (isVast(t) || eenrichting) {
        lichaam.y = (ty + 1) * TEGEL
        lichaam.vy = 0
        if (lichaam.omgekeerd) {
          lichaam.opGrond = true
          uit.grondGeraakt = true
        } else {
          lichaam.tegenPlafond = true
          uit.plafondGeraakt = true
          uit.koppen.push({ tx, ty })
        }
        break
      }
    }
  }

  return uit
}

// Welke tegelsoort staat er onder de voeten? Bepaalt grip (ijs) en of we op een
// lopende band staan.
export function grondSoort(lichaam, map) {
  if (!lichaam.opGrond) return T.LEEG
  // Bij omgekeerde zwaartekracht sta je op het plafond; dan is dát de grond.
  const ty = lichaam.omgekeerd
    ? Math.floor((lichaam.boven - 1) / TEGEL)
    : Math.floor((lichaam.onder + 1) / TEGEL)
  const x0 = Math.floor(lichaam.links / TEGEL)
  const x1 = Math.floor((lichaam.rechts - 0.001) / TEGEL)
  for (let tx = x0; tx <= x1; tx++) {
    const t = map.tegel(tx, ty)
    if (t !== T.LEEG) return t
  }
  return T.LEEG
}

// Raakt het lichaam een dodelijke tegel? Iets krapper dan de volle box, zodat
// een stekel je pas raakt als je er echt in zit.
export function raaktDodelijk(lichaam, map) {
  const marge = 2
  const x0 = Math.floor((lichaam.links + marge) / TEGEL)
  const x1 = Math.floor((lichaam.rechts - marge) / TEGEL)
  const y0 = Math.floor((lichaam.boven + marge) / TEGEL)
  const y1 = Math.floor((lichaam.onder - marge) / TEGEL)
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (map.dodelijkOp(tx, ty)) return map.tegel(tx, ty)
    }
  }
  return 0
}

// "Ledge forgiveness": spring je met je hoofd net naast een blok omhoog, dan
// schuiven we tot 3 px opzij in plaats van je hard te stoppen. Zonder dit voelt
// elke krappe schacht oneerlijk.
export function hoekCorrectie(lichaam, map) {
  if (lichaam.vy >= 0) return false
  const ty = Math.floor(lichaam.boven / TEGEL)
  const linksVrij = !isVast(map.tegel(Math.floor((lichaam.links - 3) / TEGEL), ty))
  const rechtsVrij = !isVast(map.tegel(Math.floor((lichaam.rechts + 3) / TEGEL), ty))
  const linksTegel = Math.floor(lichaam.links / TEGEL)
  const rechtsTegel = Math.floor((lichaam.rechts - 0.001) / TEGEL)

  if (isVast(map.tegel(linksTegel, ty)) && !isVast(map.tegel(rechtsTegel, ty)) && rechtsVrij) {
    const doel = (linksTegel + 1) * TEGEL
    if (doel - lichaam.links <= 3) { lichaam.x = doel; return true }
  }
  if (isVast(map.tegel(rechtsTegel, ty)) && !isVast(map.tegel(linksTegel, ty)) && linksVrij) {
    const doel = rechtsTegel * TEGEL - lichaam.w
    if (lichaam.x - doel <= 3) { lichaam.x = doel; return true }
  }
  return false
}

export const klem = (v, a, b) => (v < a ? a : v > b ? b : v)

// Beweegt `waarde` richting `doel` met hooguit `stap`. Gebruikt voor
// acceleratie en wrijving, zodat beide precies dezelfde vorm hebben.
export function naar(waarde, doel, stap) {
  if (waarde < doel) return Math.min(waarde + stap, doel)
  if (waarde > doel) return Math.max(waarde - stap, doel)
  return waarde
}
