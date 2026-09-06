// Particles uit een vaste pool. Er wordt nooit een object aangemaakt tijdens
// het spelen: op = een dood deeltje hergebruiken. Zonder pool geeft dit systeem
// gegarandeerd garbage-pieken bij elke muntpak.

const MAX = 400

export class Particles {
  constructor(max = MAX) {
    this.pool = new Array(max)
    for (let i = 0; i < max; i++) {
      this.pool[i] = { leeft: false, x: 0, y: 0, vx: 0, vy: 0, tijd: 0, duur: 0, kleur: '#fff', grootte: 1, zwaarte: 0, fade: true, vorm: 'blok' }
    }
    this.volgende = 0
  }

  _pak() {
    // Ronddraaiende index: als alles leeft overschrijven we het oudste deeltje.
    for (let n = 0; n < this.pool.length; n++) {
      const p = this.pool[this.volgende]
      this.volgende = (this.volgende + 1) % this.pool.length
      if (!p.leeft) return p
    }
    const p = this.pool[this.volgende]
    this.volgende = (this.volgende + 1) % this.pool.length
    return p
  }

  spuit(x, y, opties) {
    const p = this._pak()
    p.leeft = true
    p.x = x
    p.y = y
    p.vx = opties.vx ?? 0
    p.vy = opties.vy ?? 0
    p.tijd = 0
    p.duur = opties.duur ?? 0.5
    p.kleur = opties.kleur ?? '#ffffff'
    p.grootte = opties.grootte ?? 1
    p.zwaarte = opties.zwaarte ?? 0
    p.fade = opties.fade !== false
    p.vorm = opties.vorm ?? 'blok'
    return p
  }

  // --- Voorgedefinieerde uitbarstingen ------------------------------------

  stof(x, y, kant = 0) {
    for (let i = 0; i < 5; i++) {
      this.spuit(x + (Math.random() - 0.5) * 8, y, {
        vx: (kant || (Math.random() - 0.5) * 2) * (18 + Math.random() * 26),
        vy: -12 - Math.random() * 24,
        duur: 0.28 + Math.random() * 0.2,
        kleur: 'rgba(230,230,240,0.75)',
        zwaarte: 160,
      })
    }
  }

  landing(x, y) {
    for (let i = 0; i < 9; i++) {
      const kant = i < 5 ? -1 : 1
      this.spuit(x + kant * (2 + Math.random() * 5), y, {
        vx: kant * (30 + Math.random() * 45),
        vy: -18 - Math.random() * 22,
        duur: 0.3 + Math.random() * 0.22,
        kleur: 'rgba(255,255,255,0.7)',
        zwaarte: 220,
        grootte: Math.random() > 0.7 ? 2 : 1,
      })
    }
  }

  sparkle(x, y, kleur) {
    for (let i = 0; i < 8; i++) {
      const hoek = (i / 8) * Math.PI * 2
      this.spuit(x, y, {
        vx: Math.cos(hoek) * (28 + Math.random() * 26),
        vy: Math.sin(hoek) * (28 + Math.random() * 26) - 18,
        duur: 0.32 + Math.random() * 0.18,
        kleur,
        zwaarte: 60,
        vorm: 'ster',
      })
    }
  }

  pop(x, y, kleur, aantal = 12) {
    for (let i = 0; i < aantal; i++) {
      const hoek = Math.random() * Math.PI * 2
      const kracht = 40 + Math.random() * 90
      this.spuit(x, y, {
        vx: Math.cos(hoek) * kracht,
        vy: Math.sin(hoek) * kracht - 40,
        duur: 0.4 + Math.random() * 0.35,
        kleur,
        zwaarte: 340,
        grootte: Math.random() > 0.6 ? 2 : 1,
      })
    }
  }

  vonk(x, y, kleur) {
    for (let i = 0; i < 4; i++) {
      this.spuit(x, y, {
        vx: (Math.random() - 0.5) * 70,
        vy: -40 - Math.random() * 70,
        duur: 0.5 + Math.random() * 0.4,
        kleur,
        zwaarte: 120,
      })
    }
  }

  spoorPunt(x, y, kleur) {
    this.spuit(x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 6, {
      vx: (Math.random() - 0.5) * 10,
      vy: -6 - Math.random() * 10,
      duur: 0.4,
      kleur,
      zwaarte: -20,
    })
  }

  update(dt) {
    for (const p of this.pool) {
      if (!p.leeft) continue
      p.tijd += dt
      if (p.tijd >= p.duur) { p.leeft = false; continue }
      p.vy += p.zwaarte * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
    }
  }

  teken(ctx, camX, camY) {
    for (const p of this.pool) {
      if (!p.leeft) continue
      const t = p.tijd / p.duur
      ctx.globalAlpha = p.fade ? Math.max(0, 1 - t * t) : 1
      ctx.fillStyle = p.kleur
      const x = Math.round(p.x - camX)
      const y = Math.round(p.y - camY)
      if (p.vorm === 'ster') {
        ctx.fillRect(x, y - 1, 1, 3)
        ctx.fillRect(x - 1, y, 3, 1)
      } else {
        ctx.fillRect(x, y, p.grootte, p.grootte)
      }
    }
    ctx.globalAlpha = 1
  }

  wis() {
    for (const p of this.pool) p.leeft = false
  }
}
