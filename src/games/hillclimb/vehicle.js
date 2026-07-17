// Voertuig als Matter-compound: chassis + 2 wielen op onafhankelijke
// vering (constraints). Gas/rem stuurt de draaisnelheid van de wielen
// (grip met de grond doet de rest); in de lucht kantelt gas/rem het
// chassis zelf (voor flips/stunts).

// Reactiekoppel-tuning: de eerste GENADE_TIJD seconden van één ononder-
// broken druk kosten niets (tikken blijft altijd veilig, ongeacht hoe vaak).
// Daarna bouwt het koppel kwadratisch op met de duur van DIE druk — laat je
// los, dan telt de teller direct opnieuw vanaf 0. Zo hangt gevaar alleen af
// van "hoe lang houd je 'm nu al ingedrukt", niet van het ritme daarvoor.
const GENADE_TIJD = 0.55   // seconden gratis per druk
const WHEELIE_RAMP = 1.4   // opbouwsnelheid ná de genadetijd

export class Vehicle {
  constructor(scene, x, y, stats) {
    this.scene = scene
    this.stats = stats
    this.throttle = 0        // -1 (rem/achteruit) .. 0 .. 1 (gas)
    // Contact-tellers i.p.v. booleans: een wiel kan meerdere grond-slabs
    // tegelijk raken en het verlaten van één slab betekent niet "in de lucht".
    this.contactsL = 0
    this.contactsR = 0
    this._holdTime = 0        // seconden dat de HUIDIGE druk al duurt
    this._holdSign = 0        // richting van die druk (1 gas, -1 rem, 0 los)

    const M = scene.matter
    // Spawn de wielen exact op rustlengte van de vering — een mismatch geeft
    // de constraint-solver een grote initiële uitwijking (energie-explosie).
    const wheelY = y + stats.chassisH / 2 + stats.suspensionLength

    // Eigen (negatieve) collision-group: chassis en wielen botsen nooit op
    // elkaar, zodat de wielen dicht tegen/onder de carrosserie kunnen zitten
    // zoals in de art (korte vering) zonder physics-explosies.
    const group = M.body.nextGroup(true)

    this.chassis = M.add.rectangle(x, y, stats.chassisW, stats.chassisH, {
      density: 0.0022 * stats.mass, friction: 0.3, frictionAir: 0.018,
      chamfer: { radius: 8 }, label: 'chassis', collisionFilter: { group },
    })
    // De aandrijfkracht loopt via de draai-traagheid van het wiel (spin →
    // frictie-impuls op de grond). Traagheid ∝ r⁴, dus kleine art-getrouwe
    // wielen zouden nauwelijks kracht leveren — schaal de dichtheid mee
    // (genormaliseerd op r=28) zodat de acceleratie gelijk blijft. Alleen
    // omhoog: grote wielen (monstertruck) houden hun eigen gevoel.
    const wheelDensity = 0.0028 * stats.mass * Math.min(10, Math.max(1, (28 / stats.wheelRadius) ** 4))
    this.wheelL = M.add.circle(x - stats.wheelOffsetX, wheelY, stats.wheelRadius, {
      density: wheelDensity, friction: stats.grip, frictionAir: 0.01,
      label: 'wheel', collisionFilter: { group },
    })
    this.wheelR = M.add.circle(x + stats.wheelOffsetX, wheelY, stats.wheelRadius, {
      density: wheelDensity, friction: stats.grip, frictionAir: 0.01,
      label: 'wheel', collisionFilter: { group },
    })

    // Ophanging per wiel: één verticale draagveer (anker recht boven het
    // wiel op de chassis-onderkant — draagt het volle gewicht, ook bij een
    // korte veerlengte) plus één stijve arm naar het chassis-midden die de
    // voor/achter-positie vasthoudt. Diagonale veren werkten hier niet: bij
    // korte vering staan ze bijna horizontaal en is de verticale kracht ~0,
    // waardoor de wielen dwars door de carrosserie omhoog zakten.
    const veerStiff = Math.min(0.3, stats.suspensionStiffness * 7.5)
    const veer = (wheel, offX) => M.add.constraint(this.chassis, wheel, stats.suspensionLength, veerStiff, {
      pointA: { x: offX, y: stats.chassisH / 2 }, damping: stats.suspensionDamping * 1.7,
    })
    const armLen = Math.hypot(stats.wheelOffsetX, stats.chassisH / 2 + stats.suspensionLength)
    const arm = (wheel) => M.add.constraint(this.chassis, wheel, armLen, 0.85, {
      pointA: { x: 0, y: 0 }, damping: 0.02,
    })
    this.springs = [
      veer(this.wheelL, -stats.wheelOffsetX),
      veer(this.wheelR,  stats.wheelOffsetX),
      arm(this.wheelL),
      arm(this.wheelR),
    ]
    // Starre as tussen de wielen: onderlinge afstand ligt vast, zodat ze
    // nooit naar elkaar toe of van elkaar af bewegen.
    this.springs.push(M.add.constraint(this.wheelL, this.wheelR, stats.wheelOffsetX * 2, 0.95))

    this._onBeforeUpdate = () => this._applyPhysicsStep()
    scene.matter.world.on('beforeupdate', this._onBeforeUpdate)
  }

  get grounded() { return this.contactsL > 0 || this.contactsR > 0 }

  _applyPhysicsStep() {
    const Body = this.scene.matter.body
    const t = this.throttle
    const dt = 1 / 60

    // Duur van de HUIDIGE ononderbroken druk bijhouden. Andere richting of
    // loslaten (t=0) reset hem meteen — alleen dit maakt "te lang volhouden"
    // gevaarlijk, ongeacht hoe druk je verder op de knop tikt.
    const sign = Math.sign(t)
    this._holdTime = sign !== 0 && sign === this._holdSign ? this._holdTime + dt : 0
    this._holdSign = sign

    if (t !== 0) {
      if (this.grounded) {
        // Draaisnelheid-gestuurde wiel-spin (visueel + grip op hellingen).
        const maxSpin = this.stats.power * 12          // rad per physics-step
        const accel = this.stats.power * 0.55
        for (const w of [this.wheelL, this.wheelR]) {
          let av = w.angularVelocity + accel * t
          av = Math.max(-maxSpin, Math.min(maxSpin, av))
          Body.setAngularVelocity(w, av)
        }
        // Aandrijving: stuur de chassis-snelheid langs de helling richting
        // het doeltempo. Vroeger kwam de kracht uit spinnende wielen die
        // tegen de chassis-onderkant wreven; dat contact bestaat niet meer
        // (wielen en chassis botsen bewust niet meer op elkaar), dus de
        // snelheids-assist is nu het echte aandrijfpad. Alleen versnellen
        // richting doel — bergaf uitrollen wordt nooit afgeremd.
        const slope = this.groundSlope || 0
        const dirX = Math.cos(slope), dirY = Math.sin(slope)
        const vel = this.chassis.velocity
        const along = vel.x * dirX + vel.y * dirY
        const doel = this.stats.power * 260 * t
        if ((t > 0 && along < doel) || (t < 0 && along > doel)) {
          const k = 0.028
          const diff = doel - along
          Body.setVelocity(this.chassis, { x: vel.x + diff * k * dirX, y: vel.y + diff * k * dirY })
        }
        // Reactiekoppel van de aandrijving: net als in Hill Climb Racing
        // duwt aanhoudend gas de neus omhoog (rem de neus omlaag). Pas ná de
        // genadetijd van déze druk, en dan kwadratisch oplopend — dus tikken
        // blijft altijd veilig, maar vasthouden wordt snel link.
        const over = Math.max(0, this._holdTime - GENADE_TIJD)
        if (over > 0) {
          const pitchCap = 0.6
          let pav = this.chassis.angularVelocity - this.stats.power * sign * over * over * WHEELIE_RAMP
          pav = Math.max(-pitchCap, Math.min(pitchCap, pav))
          Body.setAngularVelocity(this.chassis, pav)
        }
      } else {
        // Luchtcontrole: gas = neus omhoog (backflip), rem = neus omlaag —
        // zoals in Hill Climb Racing (reactiekoppel van de wielen).
        const cap = 0.16
        let av = this.chassis.angularVelocity - this.stats.airControl * t * 0.14
        av = Math.max(-cap, Math.min(cap, av))
        Body.setAngularVelocity(this.chassis, av)
      }
    }

    // Wheelie voorbij ~43° t.o.v. het WEGDEK is onstabiel: het zwaartepunt
    // ligt dan voorbij het wielcontactpunt en de auto klapt snel over de
    // kop — rem op tijd om een wheelie te redden. Relatief aan de helling,
    // anders zou je op een steile klim vanzelf achterover geduwd worden.
    if (this.grounded) {
      const lean = Math.atan2(Math.sin(this.chassis.angle), Math.cos(this.chassis.angle))
      const rel = lean - (this.groundSlope || 0)
      if (Math.abs(rel) > 0.75) {
        Body.setAngularVelocity(this.chassis, this.chassis.angularVelocity + Math.sign(rel) * 0.009)
      }
    }

    // Tol-beveiliging: alleen extreme rotatie afkappen. Ruim genoeg dat je
    // bij te veel gas of een slechte landing echt over de kop kunt gaan.
    const cap = this.grounded ? 0.2 : 0.22
    const cav = this.chassis.angularVelocity
    if (Math.abs(cav) > cap) Body.setAngularVelocity(this.chassis, Math.sign(cav) * cap)
  }

  // Kop-positie in wereldcoördinaten (voor botsing-met-grond / game-over check).
  headWorldPos() {
    const a = this.chassis.angle
    const localX = 0, localY = -this.stats.chassisH / 2 - 16
    return {
      x: this.chassis.position.x + localX * Math.cos(a) - localY * Math.sin(a),
      y: this.chassis.position.y + localX * Math.sin(a) + localY * Math.cos(a),
    }
  }

  get x() { return this.chassis.position.x }
  get y() { return this.chassis.position.y }
  get angle() { return this.chassis.angle }
  get speed() {
    const v = this.chassis.velocity
    return Math.hypot(v.x, v.y)
  }

  destroy() {
    // Bij scene-shutdown is de physics-world soms al opgeruimd
    const world = this.scene.matter?.world
    if (!world) return
    world.off('beforeupdate', this._onBeforeUpdate)
    this.springs.forEach(c => world.removeConstraint(c))
    ;[this.chassis, this.wheelL, this.wheelR].forEach(b => world.remove(b))
  }
}
