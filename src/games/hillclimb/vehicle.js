// Voertuig als Matter-compound: chassis + 2 wielen op onafhankelijke
// vering (constraints). Gas/rem stuurt de draaisnelheid van de wielen
// (grip met de grond doet de rest); in de lucht kantelt gas/rem het
// chassis zelf (voor flips/stunts).

export class Vehicle {
  constructor(scene, x, y, stats) {
    this.scene = scene
    this.stats = stats
    this.throttle = 0        // -1 (rem/achteruit) .. 0 .. 1 (gas)
    // Contact-tellers i.p.v. booleans: een wiel kan meerdere grond-slabs
    // tegelijk raken en het verlaten van één slab betekent niet "in de lucht".
    this.contactsL = 0
    this.contactsR = 0

    const M = scene.matter
    // Spawn de wielen exact op rustlengte van de vering — een mismatch geeft
    // de constraint-solver een grote initiële uitwijking (energie-explosie).
    const wheelY = y + stats.chassisH / 2 + stats.suspensionLength

    this.chassis = M.add.rectangle(x, y, stats.chassisW, stats.chassisH, {
      density: 0.0022 * stats.mass, friction: 0.3, frictionAir: 0.018,
      chamfer: { radius: 8 }, label: 'chassis',
    })
    this.wheelL = M.add.circle(x - stats.wheelOffsetX, wheelY, stats.wheelRadius, {
      density: 0.0028 * stats.mass, friction: stats.grip, frictionAir: 0.01,
      label: 'wheel',
    })
    this.wheelR = M.add.circle(x + stats.wheelOffsetX, wheelY, stats.wheelRadius, {
      density: 0.0028 * stats.mass, friction: stats.grip, frictionAir: 0.01,
      label: 'wheel',
    })

    // Driehoeks-ophanging: twee veren per wiel (anker vóór en achter het
    // wiel op de chassis-onderkant). Verticaal inveren rekt beide veren
    // symmetrisch (mag), horizontaal zwaaien rekt ze asymmetrisch en wordt
    // dus tegengehouden — wielen kunnen niet meer naar elkaar toe slingeren.
    const brace = Math.min(26, stats.wheelOffsetX * 0.55)
    const restLen = Math.hypot(brace, stats.suspensionLength)
    const spring = (wheel, offX, sideX) => M.add.constraint(this.chassis, wheel, restLen, stats.suspensionStiffness, {
      pointA: { x: offX + sideX, y: stats.chassisH / 2 }, damping: stats.suspensionDamping,
    })
    this.springs = [
      spring(this.wheelL, -stats.wheelOffsetX, -brace),
      spring(this.wheelL, -stats.wheelOffsetX,  brace),
      spring(this.wheelR,  stats.wheelOffsetX, -brace),
      spring(this.wheelR,  stats.wheelOffsetX,  brace),
    ]
    // Starre as tussen de wielen: onderlinge afstand ligt vast, zodat ze
    // nooit naar elkaar toe of van elkaar af bewegen. De diagonale veren
    // blijven het op-en-neer veren doen.
    this.springs.push(M.add.constraint(this.wheelL, this.wheelR, stats.wheelOffsetX * 2, 0.95))

    this._onBeforeUpdate = () => this._applyPhysicsStep()
    scene.matter.world.on('beforeupdate', this._onBeforeUpdate)
  }

  get grounded() { return this.contactsL > 0 || this.contactsR > 0 }

  _applyPhysicsStep() {
    const Body = this.scene.matter.body
    const t = this.throttle

    if (t !== 0) {
      if (this.grounded) {
        // Draaisnelheid-gestuurde aandrijving: ramp de wiel-spin naar een
        // maximum. Veel stabieler dan torque (geen oneindige opbouw).
        const maxSpin = this.stats.power * 12          // rad per physics-step
        const accel = this.stats.power * 0.55
        for (const w of [this.wheelL, this.wheelR]) {
          let av = w.angularVelocity + accel * t
          av = Math.max(-maxSpin, Math.min(maxSpin, av))
          Body.setAngularVelocity(w, av)
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
