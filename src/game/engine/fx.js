// Camerashake, hit-stop, schermflits en zwevende cijfers. Alles wat "feedback"
// is en niets met gameplaystate te maken heeft.

export class Fx {
  constructor(instellingen) {
    this.instellingen = instellingen
    this.shake = 0
    this.shakeDuur = 0
    this.shakeTijd = 0
    this.stop = 0 // seconden hit-stop; de levelscène slaat updates over
    this.flits = null // { kleur, tijd, duur }
    this.zwevend = [] // { tekst, x, y, kleur, tijd, duur }
  }

  schud(kracht, duur = 0.22) {
    if (!this.instellingen.shake) return
    // Een lopende, sterkere schud wint; anders overschrijft een klein tikje
    // de klap van een baas.
    if (kracht >= this.shake || this.shakeTijd >= this.shakeDuur) {
      this.shake = kracht
      this.shakeDuur = duur
      this.shakeTijd = 0
    }
  }

  hitStop(seconden) { this.stop = Math.max(this.stop, seconden) }

  flitsScherm(kleur, duur = 0.12) { this.flits = { kleur, tijd: 0, duur } }

  toonTekst(tekst, x, y, kleur, duur = 0.9) {
    this.zwevend.push({ tekst, x, y, kleur, tijd: 0, duur })
  }

  update(dt) {
    if (this.shakeTijd < this.shakeDuur) this.shakeTijd += dt
    if (this.flits) {
      this.flits.tijd += dt
      if (this.flits.tijd >= this.flits.duur) this.flits = null
    }
    for (let i = this.zwevend.length - 1; i >= 0; i--) {
      const z = this.zwevend[i]
      z.tijd += dt
      z.y -= dt * 22
      if (z.tijd >= z.duur) this.zwevend.splice(i, 1)
    }
  }

  // Offset die de camera deze frame moet krijgen. Uitdempend, en altijd op
  // hele pixels zodat de pixelart niet gaat trillen tussen twee rasters.
  get offset() {
    if (this.shakeTijd >= this.shakeDuur) return { x: 0, y: 0 }
    const rest = 1 - this.shakeTijd / this.shakeDuur
    const k = this.shake * rest * rest
    return {
      x: Math.round((Math.random() - 0.5) * 2 * k),
      y: Math.round((Math.random() - 0.5) * 2 * k),
    }
  }

  tekenFlits(ctx, w, h) {
    if (!this.flits) return
    const t = this.flits.tijd / this.flits.duur
    ctx.globalAlpha = (1 - t) * 0.55
    ctx.fillStyle = this.flits.kleur
    ctx.fillRect(0, 0, w, h)
    ctx.globalAlpha = 1
  }

  wis() {
    this.shakeTijd = this.shakeDuur
    this.flits = null
    this.zwevend.length = 0
    this.stop = 0
  }
}
