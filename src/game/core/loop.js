// Vaste timestep van 1/60 s met accumulator. Physics loopt dus altijd op
// dezelfde cadans, ongeacht de verversingssnelheid van het scherm; het tekenen
// interpoleert ertussen en snapt daarna naar hele pixels.

export const STAP = 1 / 60
const MAX_ACHTERSTAND = 0.25 // seconden; daarboven springen we bij i.p.v. inhalen

export class Lus {
  constructor({ update, teken }) {
    this.update = update
    this.teken = teken
    this.draait = false
    this.accumulator = 0
    this.vorigeTijd = 0
    this.rafId = 0
    this.fps = 60
    this._fpsTeller = 0
    this._fpsTijd = 0
    this._tik = this._tik.bind(this)
  }

  start() {
    if (this.draait) return
    this.draait = true
    this.vorigeTijd = performance.now()
    this.accumulator = 0
    this.rafId = requestAnimationFrame(this._tik)
  }

  stop() {
    this.draait = false
    cancelAnimationFrame(this.rafId)
  }

  // Na een tabwissel of pauze: de klok bijzetten zodat er geen berg aan
  // ingehaalde updates in één frame wordt afgevuurd.
  hervat() {
    this.vorigeTijd = performance.now()
    this.accumulator = 0
  }

  _tik(nu) {
    if (!this.draait) return
    this.rafId = requestAnimationFrame(this._tik)

    let dt = (nu - this.vorigeTijd) / 1000
    this.vorigeTijd = nu
    if (dt > MAX_ACHTERSTAND) dt = MAX_ACHTERSTAND
    this.accumulator += dt

    let stappen = 0
    while (this.accumulator >= STAP && stappen < 5) {
      this.update(STAP)
      this.accumulator -= STAP
      stappen++
    }
    // Verzadigd: liever een fractie van een stap laten vallen dan blijvend
    // achterlopen op een trage machine.
    if (stappen === 5) this.accumulator = 0

    this.teken(this.accumulator / STAP)

    this._fpsTeller++
    this._fpsTijd += dt
    if (this._fpsTijd >= 0.5) {
      this.fps = Math.round(this._fpsTeller / this._fpsTijd)
      this._fpsTeller = 0
      this._fpsTijd = 0
    }
  }
}
