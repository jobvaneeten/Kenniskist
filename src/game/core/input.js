// Invoer als acties, niet als toetsen. Gameplaycode vraagt naar 'spring', niet
// naar 'Space' — zodat gamepad of touch later kan worden toegevoegd zonder dat
// er één regel spelcode verandert.

const BINDINGEN = {
  links: ['ArrowLeft', 'KeyA'],
  rechts: ['ArrowRight', 'KeyD'],
  omhoog: ['ArrowUp', 'KeyW'],
  omlaag: ['ArrowDown', 'KeyS'],
  spring: ['Space', 'ArrowUp', 'KeyW', 'KeyZ'],
  ren: ['ShiftLeft', 'ShiftRight', 'KeyX'],
  pauze: ['Escape'],
  bevestig: ['Enter', 'Space', 'NumpadEnter'],
  terug: ['Escape', 'Backspace'],
}

// Toetsen waarvan de standaardactie de pagina zou laten scrollen of de
// Kenniskist-shell zou triggeren. Alleen deze worden geblokkeerd.
const SLIK_OP = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab',
])

export class Invoer {
  constructor(doel = window) {
    this.doel = doel
    this.nu = new Set()
    this.vorig = new Set()
    this.tekens = [] // ruwe toetsen deze frame, voor "druk op een toets"-schermen
    // Grendel voor aanslagen die tussen twee vaste updates in beginnen én
    // eindigen. De update draait op 60 Hz, de browser levert events los daarvan
    // aan: een korte tik of klik van 10 ms zou anders spoorloos verdwijnen.
    // Wordt in eindFrame() geleegd, dus één aanslag telt precies één keer.
    this.geraakt = new Set()
    this.muis = { x: 0, y: 0, neer: false, vorigNeer: false, geklikt: false, inBeeld: false }
    this.eersteInteractie = false
    this._naarBeeld = null // (clientX, clientY) -> {x, y} in spelcoördinaten

    this._down = (e) => {
      if (e.repeat) { if (SLIK_OP.has(e.code)) e.preventDefault(); return }
      this.nu.add(e.code)
      this.geraakt.add(e.code)
      this.tekens.push(e.code)
      this.eersteInteractie = true
      if (SLIK_OP.has(e.code)) e.preventDefault()
    }
    this._up = (e) => { this.nu.delete(e.code) }
    // Alt-tab en dergelijke laten toetsen anders "hangen".
    this._blur = () => { this.nu.clear() }
    this._move = (e) => {
      if (!this._naarBeeld) return
      const p = this._naarBeeld(e.clientX, e.clientY)
      this.muis.x = p.x
      this.muis.y = p.y
      this.muis.inBeeld = p.in
    }
    this._muisNeer = (e) => {
      if (e.button !== 0) return
      // Ook de positie bijwerken: een tik op een touchscreen of een klik zonder
      // beweging ervoor levert geen mousemove, en dan zou de knop waar je op
      // drukt niet de knop zijn die het spel ziet.
      this._move(e)
      this.muis.neer = true
      this.muis.geklikt = true
      this.eersteInteractie = true
    }
    this._muisOp = (e) => { if (e.button === 0) this.muis.neer = false }

    doel.addEventListener('keydown', this._down)
    doel.addEventListener('keyup', this._up)
    doel.addEventListener('blur', this._blur)
    doel.addEventListener('mousemove', this._move)
    doel.addEventListener('mousedown', this._muisNeer)
    doel.addEventListener('mouseup', this._muisOp)
  }

  koppelBeeld(fn) { this._naarBeeld = fn }

  stop() {
    this.doel.removeEventListener('keydown', this._down)
    this.doel.removeEventListener('keyup', this._up)
    this.doel.removeEventListener('blur', this._blur)
    this.doel.removeEventListener('mousemove', this._move)
    this.doel.removeEventListener('mousedown', this._muisNeer)
    this.doel.removeEventListener('mouseup', this._muisOp)
  }

  ingedrukt(actie) {
    const codes = BINDINGEN[actie]
    for (const c of codes) if (this.nu.has(c)) return true
    return false
  }

  wasIngedrukt(actie) {
    const codes = BINDINGEN[actie]
    for (const c of codes) if (this.vorig.has(c)) return true
    return false
  }

  netIngedrukt(actie) {
    for (const c of BINDINGEN[actie]) if (this.geraakt.has(c)) return true
    return this.ingedrukt(actie) && !this.wasIngedrukt(actie)
  }

  netLosgelaten(actie) { return !this.ingedrukt(actie) && this.wasIngedrukt(actie) }

  get muisNetNeer() { return this.muis.geklikt || (this.muis.neer && !this.muis.vorigNeer) }

  // As van -1 tot 1; tegelijk links+rechts betekent stilstaan, niet trillen.
  get as() {
    return (this.ingedrukt('rechts') ? 1 : 0) - (this.ingedrukt('links') ? 1 : 0)
  }

  eindFrame() {
    this.vorig = new Set(this.nu)
    this.muis.vorigNeer = this.muis.neer
    this.muis.geklikt = false
    this.geraakt.clear()
    this.tekens.length = 0
  }

  // Voor de instellingenpagina: welke toetsen horen bij een actie.
  static toetsenVoor(actie) { return BINDINGEN[actie] ?? [] }
}
