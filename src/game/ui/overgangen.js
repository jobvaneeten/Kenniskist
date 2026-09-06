// Schermovergangen: iris-wipe en fade. De overgang zit tussen twee scènes in,
// dus de scènemanager houdt hem vast, niet de scènes zelf.

export const OVERGANG = { IRIS: 'iris', FADE: 'fade' }

export class Overgang {
  constructor(breedte, hoogte) {
    this.w = breedte
    this.h = hoogte
    this.actief = false
    this.soort = OVERGANG.IRIS
    this.fase = 'dicht' // dicht (naar zwart) | open (uit zwart)
    this.tijd = 0
    this.duur = 0.32
    this.opHalf = null
    this.midden = { x: breedte / 2, y: hoogte / 2 }
  }

  // opHalf wordt aangeroepen op het zwartste punt: daar wisselt de scène.
  start(opHalf, { soort = OVERGANG.IRIS, duur = 0.32, midden } = {}) {
    if (this.actief) return
    this.actief = true
    this.soort = soort
    this.duur = duur
    this.fase = 'dicht'
    this.tijd = 0
    this.opHalf = opHalf
    this.midden = midden ?? { x: this.w / 2, y: this.h / 2 }
  }

  update(dt) {
    if (!this.actief) return
    this.tijd += dt
    if (this.tijd >= this.duur) {
      if (this.fase === 'dicht') {
        this.fase = 'open'
        this.tijd = 0
        const fn = this.opHalf
        this.opHalf = null
        fn?.()
      } else {
        this.actief = false
      }
    }
  }

  get bezig() { return this.actief }

  teken(ctx) {
    if (!this.actief) return
    const t = Math.min(1, this.tijd / this.duur)
    const deel = this.fase === 'dicht' ? t : 1 - t

    if (this.soort === OVERGANG.FADE) {
      ctx.globalAlpha = deel
      ctx.fillStyle = '#0a0713'
      ctx.fillRect(0, 0, this.w, this.h)
      ctx.globalAlpha = 1
      return
    }

    // Iris: een krimpende cirkel rond het middelpunt. Getekend als vier
    // rechthoeken plus een ring van blokjes, zodat het op pixelniveau scherp
    // blijft in plaats van een geantialiaste cirkel te worden.
    const maxR = Math.hypot(this.w, this.h) / 2 + 8
    const r = maxR * (1 - deel)
    ctx.fillStyle = '#0a0713'
    const cx = this.midden.x
    const cy = this.midden.y
    for (let y = 0; y < this.h; y += 2) {
      const dy = y + 1 - cy
      const half = r * r - dy * dy
      if (half <= 0) { ctx.fillRect(0, y, this.w, 2); continue }
      const b = Math.sqrt(half)
      ctx.fillRect(0, y, Math.max(0, Math.ceil(cx - b)), 2)
      const rechts = Math.floor(cx + b)
      ctx.fillRect(rechts, y, Math.max(0, this.w - rechts), 2)
    }
  }
}
