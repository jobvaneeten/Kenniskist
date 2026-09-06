// Bakt pixeldata één keer naar offscreen canvases. Daarna wordt er alleen nog
// geblit — nooit per frame pixel voor pixel getekend.
//
// Pixeldata is een array van gelijk lange strings. Elk teken is een sleutel in
// het meegegeven palet; een teken dat niet in het palet staat (conventie: '.')
// blijft transparant.

export function nieuwCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, w | 0)
  c.height = Math.max(1, h | 0)
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = false
  return { canvas: c, ctx }
}

// Tekent pixeldata in een bestaande context, met de linkerbovenhoek op (dx, dy).
// Tekent per horizontale run in plaats van per pixel: scheelt bij het bakken van
// een paar honderd sprites merkbaar werk.
export function tekenPixels(ctx, rijen, palet, dx = 0, dy = 0) {
  for (let y = 0; y < rijen.length; y++) {
    const rij = rijen[y]
    let x = 0
    while (x < rij.length) {
      const teken = rij[x]
      const kleur = palet[teken]
      if (!kleur) { x++; continue }
      let eind = x + 1
      while (eind < rij.length && rij[eind] === teken) eind++
      ctx.fillStyle = kleur
      ctx.fillRect(dx + x, dy + y, eind - x, 1)
      x = eind
    }
  }
}

// Een gebakken sprite: één rij frames naast elkaar, plus een gespiegelde kopie.
// De spiegel wordt vooraf gebakken zodat de renderloop nooit ctx.scale(-1,1)
// hoeft te doen (traag, en het verschuift sprites een halve pixel).
export class Blad {
  constructor(w, h, aantal) {
    this.w = w
    this.h = h
    this.aantal = aantal
    const a = nieuwCanvas(w * aantal, h)
    this.canvas = a.canvas
    this.ctx = a.ctx
    this._spiegel = null
  }

  get spiegel() {
    if (!this._spiegel) {
      const s = nieuwCanvas(this.w * this.aantal, this.h)
      for (let i = 0; i < this.aantal; i++) {
        s.ctx.save()
        s.ctx.translate((i + 1) * this.w, 0)
        s.ctx.scale(-1, 1)
        s.ctx.drawImage(this.canvas, i * this.w, 0, this.w, this.h, 0, 0, this.w, this.h)
        s.ctx.restore()
      }
      this._spiegel = s.canvas
    }
    return this._spiegel
  }

  // x/y zijn de linkerbovenhoek in wereldpixels; de aanroeper snapt al af.
  teken(ctx, frame, x, y, gespiegeld = false) {
    const bron = gespiegeld ? this.spiegel : this.canvas
    const f = frame % this.aantal
    ctx.drawImage(bron, f * this.w, 0, this.w, this.h, x, y, this.w, this.h)
  }
}

// frames: array van pixeldata-blokken (elk een array strings van gelijke lengte)
export function bakFrames(frames, palet) {
  const h = frames[0].length
  const w = frames[0][0].length
  const blad = new Blad(w, h, frames.length)
  frames.forEach((rijen, i) => tekenPixels(blad.ctx, rijen, palet, i * w, 0))
  return blad
}

// Bakt een enkel plaatje dat door een tekenfunctie wordt gevuld (tiles,
// achtergronden, logo). Handig waar pixeldata-strings onhandig zouden worden.
export function bakGetekend(w, h, tekenFn) {
  const { canvas, ctx } = nieuwCanvas(w, h)
  tekenFn(ctx, w, h)
  return canvas
}

// Zet een lijst losse canvases naast elkaar in één blad, zodat er per animatie
// maar één textuur is. Alle bronnen moeten even groot zijn.
export function bundel(canvases) {
  const w = canvases[0].width
  const h = canvases[0].height
  const blad = new Blad(w, h, canvases.length)
  canvases.forEach((c, i) => blad.ctx.drawImage(c, i * w, 0))
  return blad
}

// Deterministische ruis voor tilevariatie. Geen Math.random: dezelfde tile op
// dezelfde plek moet er na een reload identiek uitzien, anders flikkert het
// level bij elke start.
export function ruis(x, y, zaad = 0) {
  let n = (x * 374761393 + y * 668265263 + zaad * 1274126177) | 0
  n = (n ^ (n >> 13)) * 1274126177
  return (((n ^ (n >> 16)) >>> 0) % 1000) / 1000
}
