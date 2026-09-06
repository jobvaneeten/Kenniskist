// Camera met deadzone en look-ahead. De speler mag binnen een venstertje
// bewegen zonder dat het beeld meeschuift; kijkt hij een kant op, dan schuift
// het beeld die kant op vooruit zodat je ziet waar je heen loopt.

import { klem, naar } from '../engine/physics.js'

export class Camera {
  constructor(breedte, hoogte) {
    this.w = breedte
    this.h = hoogte
    this.x = 0
    this.y = 0
    this.grensW = breedte
    this.grensH = hoogte
    this.lookAhead = 0
    this.zoom = 1
    this.doelZoom = 1
  }

  grenzen(breedtePx, hoogtePx) {
    this.grensW = breedtePx
    this.grensH = hoogtePx
  }

  // Direct op het doel zetten, zonder na te slepen. Bij respawn en levelstart.
  spring(doelX, doelY) {
    this.lookAhead = 0
    this.x = this._klemX(doelX - this.w / 2)
    this.y = this._klemY(doelY - this.h / 2)
  }

  volg(doel, dt, richting = 0) {
    // Look-ahead loopt traag mee zodat snel wisselen van richting geen
    // slingerbeweging geeft.
    this.lookAhead = naar(this.lookAhead, richting * 34, 90 * dt)

    const midX = this.x + this.w / 2
    const midY = this.y + this.h / 2
    const deadX = 18
    const deadY = 26

    const gewensteX = doel.x + this.lookAhead
    const verschilX = gewensteX - midX
    if (Math.abs(verschilX) > deadX) {
      const over = verschilX - Math.sign(verschilX) * deadX
      this.x += over * Math.min(1, dt * 9)
    }

    const verschilY = doel.y - midY
    if (Math.abs(verschilY) > deadY) {
      const over = verschilY - Math.sign(verschilY) * deadY
      // Naar beneden iets trager: bij een lange val moet het beeld niet
      // vooruitschieten en de landing buiten beeld duwen.
      this.y += over * Math.min(1, dt * (over > 0 ? 6 : 9))
    }

    this.zoom = naar(this.zoom, this.doelZoom, dt * 0.6)
    this.x = this._klemX(this.x)
    this.y = this._klemY(this.y)
  }

  _klemX(x) {
    if (this.grensW <= this.w) return (this.grensW - this.w) / 2
    return klem(x, 0, this.grensW - this.w)
  }

  _klemY(y) {
    if (this.grensH <= this.h) return (this.grensH - this.h) / 2
    return klem(y, 0, this.grensH - this.h)
  }

  // De waarden waarmee getekend wordt: altijd hele pixels, anders wordt de
  // pixelart wazig aan de randen.
  get tekenX() { return Math.round(this.x) }
  get tekenY() { return Math.round(this.y) }

  zichtbaar(x, y, w, h, marge = 32) {
    return x + w > this.x - marge && x < this.x + this.w + marge
      && y + h > this.y - marge && y < this.y + this.h + marge
  }
}
