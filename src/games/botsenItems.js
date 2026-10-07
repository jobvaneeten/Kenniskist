// ── Items in Ballonnengevecht: ❔-blokken, schild, vuurtje, bom ─────────
// Puur visueel; de server bepaalt waar alles is. Projectielen worden lokaal
// doorgerekend (zelfde rechte lijn en snelheid als de server) en alleen
// zacht bijgestuurd naar de serverpositie: de server stuurt ~30 updates per
// seconde, en bij 36–46 m/s gaf dat zichtbare sprongetjes van ruim een meter.
import {
  Vector3, Color3, Color4, MeshBuilder, StandardMaterial, DynamicTexture,
  ParticleSystem, TransformNode, TrailMesh,
} from '@babylonjs/core'

export const SNELHEID = { schild: 36, vuurtje: 46 }   // gelijk aan SHELL_SPEED / FLAME_SPEED op de server

const emissief = (scene, naam, hex, k = 1) => {
  const m = new StandardMaterial(naam, scene)
  m.disableLighting = true; m.emissiveColor = Color3.FromHexString(hex).scale(k)
  return m
}

function deeltjes(scene, naam, tex, emitter, o) {
  const ps = new ParticleSystem(naam, o.max ?? 60, scene)
  ps.particleTexture = tex; ps.emitter = emitter
  ps.minEmitBox = new Vector3(-o.box, -o.box, -o.box); ps.maxEmitBox = new Vector3(o.box, o.box, o.box)
  ps.color1 = o.c1; ps.color2 = o.c2; ps.colorDead = o.dood ?? new Color4(0, 0, 0, 0)
  ps.minSize = o.size[0]; ps.maxSize = o.size[1]
  ps.minLifeTime = o.life[0]; ps.maxLifeTime = o.life[1]
  ps.emitRate = o.rate ?? 0
  ps.blendMode = ParticleSystem.BLENDMODE_ADD
  ps.direction1 = o.dir?.[0] ?? new Vector3(-1, 0.3, -1); ps.direction2 = o.dir?.[1] ?? new Vector3(1, 1.2, 1)
  ps.minEmitPower = o.power?.[0] ?? 0.2; ps.maxEmitPower = o.power?.[1] ?? 0.8
  ps.gravity = o.grav ?? Vector3.Zero()
  return ps
}

// ── ❔-blok: regenboog-glaskubus met een gloeiende kern; ploft weg bij
//    oppakken en veert terug als hij weer verschijnt ──────────────────────
let blokTex = null
function blokTextuur(scene) {
  if (blokTex && blokTex.getScene() === scene) return blokTex
  blokTex = new DynamicTexture('biboxt', { width: 256, height: 256 }, scene, true)
  const c = blokTex.getContext()
  const g = c.createLinearGradient(0, 0, 256, 256)
  g.addColorStop(0, 'rgba(255,225,77,0.85)'); g.addColorStop(0.5, 'rgba(255,110,170,0.75)'); g.addColorStop(1, 'rgba(90,170,255,0.85)')
  c.fillStyle = g; c.fillRect(0, 0, 256, 256)
  c.strokeStyle = '#fff'; c.lineWidth = 14
  c.beginPath(); c.roundRect ? c.roundRect(10, 10, 236, 236, 30) : c.rect(10, 10, 236, 236); c.stroke()
  c.font = '900 170px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.lineWidth = 12; c.strokeStyle = 'rgba(80,20,90,0.6)'; c.strokeText('?', 128, 140)
  c.fillStyle = '#fff'; c.fillText('?', 128, 140)
  blokTex.update(); blokTex.hasAlpha = true
  return blokTex
}

export function maakItemBlok(scene, fireTex) {
  const root = new TransformNode('iblok', scene)
  const kubus = MeshBuilder.CreateBox('ibloks', { size: 1.35 }, scene)
  const m = new StandardMaterial('iblokm', scene)
  m.diffuseTexture = blokTextuur(scene); m.useAlphaFromDiffuseTexture = true
  m.emissiveTexture = m.diffuseTexture; m.emissiveColor = new Color3(0.9, 0.9, 0.9)
  m.disableLighting = true; m.alpha = 0.92   // alleen voorkanten: anders zie je de vraagtekens gespiegeld door het glas
  kubus.material = m; kubus.parent = root; kubus.isPickable = false
  const kern = MeshBuilder.CreatePolyhedron('iblokk', { type: 1, size: 0.32 }, scene)
  kern.material = emissief(scene, 'iblokkm', '#fff6c2', 1.3); kern.parent = root; kern.isPickable = false
  const glans = deeltjes(scene, 'iblokps', fireTex, root, {
    max: 20, box: 0.7, rate: 7, size: [0.08, 0.18], life: [0.5, 0.9],
    c1: new Color4(1, 0.95, 0.6, 1), c2: new Color4(1, 0.6, 0.9, 1), dir: [new Vector3(-0.2, 0.4, -0.2), new Vector3(0.2, 1, 0.2)],
  })
  glans.start()

  let zicht = 1, wasActief = true
  return {
    root,
    update(dt, now, actief, x, y, z, i) {
      if (actief !== wasActief) {
        if (!actief) poef(scene, fireTex, x, y, z, ['#ffe14d', '#ff6ec4', '#5aaaff'], 26)
        wasActief = actief
      }
      // in- en uitfaden met een veer (overshoot bij verschijnen)
      const doel = actief ? 1 : 0
      zicht += (doel - zicht) * Math.min(1, dt * (actief ? 6 : 14))
      const veer = actief ? 1 + Math.sin(Math.min(1, zicht) * Math.PI) * 0.18 * (1 - zicht) : 1
      root.setEnabled(zicht > 0.02)
      root.position.set(x, y + Math.sin(now / 420 + i) * 0.16, z)
      root.scaling.setAll(Math.max(0.001, zicht * veer))
      kubus.rotation.y += dt * 1.6; kubus.rotation.x = Math.sin(now / 900 + i) * 0.25
      kern.rotation.y -= dt * 3; kern.rotation.z += dt * 2
      kern.scaling.setAll(1 + Math.sin(now / 160 + i) * 0.12)
      glans.emitRate = actief ? 7 : 0
    },
  }
}

// ── korte deeltjes-ploef (oppakken, treffer) ─────────────────────────────
export function poef(scene, fireTex, x, y, z, kleuren, n = 30, kracht = 6) {
  const [a, b] = kleuren.map(h => Color3.FromHexString(h))
  const ps = deeltjes(scene, 'poef', fireTex, new Vector3(x, y, z), {
    max: n, box: 0.2, size: [0.18, 0.5], life: [0.25, 0.55],
    c1: new Color4(a.r, a.g, a.b, 1), c2: new Color4(b.r, b.g, b.b, 1),
    dir: [new Vector3(-1, 0.2, -1), new Vector3(1, 1.4, 1)], power: [kracht * 0.4, kracht], grav: new Vector3(0, -6, 0),
  })
  ps.manualEmitCount = n; ps.targetStopDuration = 0.1; ps.disposeOnStop = true
  ps.start()
}

// ── Projectiel: schild (groen schild met witte rand) of vuurbal, met een
//    lichtspoor erachter. Wordt lokaal voortbewogen (zie bovenaan). ────────
export function maakProjectiel(scene, kind, fireTex, x, y, z) {
  const vuur = kind === 'vuurtje'
  const root = new TransformNode('proj', scene)
  root.position.set(x, y, z)
  const draai = new TransformNode('projd', scene); draai.parent = root
  let ps
  if (vuur) {
    const kern = MeshBuilder.CreateSphere('pvuur', { diameter: 0.55, segments: 10 }, scene)
    kern.material = emissief(scene, 'pvuurm', '#ffd27a', 1.4); kern.parent = draai; kern.isPickable = false
    const schil = MeshBuilder.CreateSphere('pvuurs', { diameter: 0.85, segments: 10 }, scene)
    const sm = emissief(scene, 'pvuursm', '#ff5a14', 1.1); sm.alpha = 0.45
    schil.material = sm; schil.parent = draai; schil.isPickable = false
    ps = deeltjes(scene, 'pvuurps', fireTex, root, {
      max: 120, box: 0.15, rate: 160, size: [0.35, 0.8], life: [0.12, 0.3],
      c1: new Color4(1, 0.8, 0.3, 1), c2: new Color4(1, 0.35, 0.05, 1), dood: new Color4(0.3, 0.05, 0, 0),
      dir: [new Vector3(-0.5, 0.3, -0.5), new Vector3(0.5, 1.2, 0.5)], power: [0.3, 0.9], grav: new Vector3(0, 1.6, 0),
    })
  } else {
    const kap = MeshBuilder.CreateSphere('pschild', { diameter: 0.95, segments: 16, slice: 0.55 }, scene)
    kap.scaling.y = 0.7
    const tex = new DynamicTexture('pschildt', { width: 128, height: 128 }, scene, false)
    const c = tex.getContext()
    const g = c.createRadialGradient(64, 40, 4, 64, 40, 80)
    g.addColorStop(0, '#9dffb5'); g.addColorStop(0.5, '#22b04f'); g.addColorStop(1, '#0a5424')
    c.fillStyle = g; c.fillRect(0, 0, 128, 128)
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 5
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(a) * 70, 64 + Math.sin(a) * 70); c.stroke() }
    tex.update()
    const km = new StandardMaterial('pschildm', scene)
    km.diffuseTexture = tex; km.emissiveColor = new Color3(0.12, 0.45, 0.2); km.specularColor = new Color3(0.9, 1, 0.9); km.specularPower = 32
    kap.material = km; kap.parent = draai; kap.isPickable = false
    const rand = MeshBuilder.CreateTorus('pschildr', { diameter: 0.92, thickness: 0.14, tessellation: 24 }, scene)
    rand.material = emissief(scene, 'pschildrm', '#eafff0', 1); rand.parent = draai; rand.isPickable = false
    ps = deeltjes(scene, 'pschildps', fireTex, root, {
      max: 40, box: 0.3, rate: 40, size: [0.1, 0.25], life: [0.2, 0.4],
      c1: new Color4(0.6, 1, 0.7, 0.9), c2: new Color4(0.3, 0.9, 0.5, 0.7), power: [0.1, 0.3],
    })
  }
  ps.start()
  // lichtspoor
  const spoor = new TrailMesh('pspoor', root, scene, vuur ? 0.42 : 0.3, vuur ? 22 : 16, true)
  const spm = emissief(scene, 'pspoorm', vuur ? '#ff7a1a' : '#5cff8e', 1)
  spm.alpha = 0.38; spm.backFaceCulling = false
  spoor.material = spm; spoor.isPickable = false

  return {
    kind, root, rx: x, rz: z, dx: 0, dz: 0, sx: x, sz: z, st: performance.now(), leeftijd: 0,
    // server-update verwerken: richting uit het verschil, positie als ijkpunt
    server(x2, z2, now) {
      if (x2 === this.sx && z2 === this.sz) return
      const ddx = x2 - this.sx, ddz = z2 - this.sz, l = Math.hypot(ddx, ddz)
      if (l > 0.05) { this.dx = ddx / l; this.dz = ddz / l }
      this.sx = x2; this.sz = z2; this.st = now
    },
    stap(dt, now, hoogte) {
      this.leeftijd += dt
      const v = SNELHEID[this.kind] ?? 36
      // lokaal doorrijden + zacht naar de voorspelde serverpositie trekken
      this.rx += this.dx * v * dt; this.rz += this.dz * v * dt
      const vooruit = Math.min(0.15, (now - this.st) / 1000)
      const px = this.sx + this.dx * v * vooruit, pz = this.sz + this.dz * v * vooruit
      const k = Math.min(1, dt * 10)
      this.rx += (px - this.rx) * k; this.rz += (pz - this.rz) * k
      root.position.set(this.rx, hoogte(this.rx, this.rz) + 0.6, this.rz)
      // lanceer-pop + draaien in de vliegrichting
      const pop = Math.min(1, this.leeftijd / 0.15)
      draai.scaling.setAll(0.3 + 0.7 * pop + Math.sin(pop * Math.PI) * 0.25)
      root.rotation.y = Math.atan2(this.dx, this.dz)
      if (vuur) draai.rotation.z += dt * 9
      else draai.rotation.y += dt * 14
    },
    weg(raak) {
      const p = root.position
      poef(scene, fireTex, p.x, p.y, p.z, vuur ? ['#ffd27a', '#ff4a0a'] : ['#b8ffca', '#22c45a'], raak ? 34 : 18, raak ? 8 : 4)
      ps.stop(); ps.dispose(); spoor.dispose(false, true); root.dispose(false, true)
    },
  }
}

// ── Bom: glanzende bol met metalen kap, sissende lont en een rode ring op
//    de grond die de ontploffingsstraal toont en sneller knippert ─────────
export function maakBom(scene, fireTex, x, y, z, straal) {
  const root = new TransformNode('bom', scene)
  const lijf = MeshBuilder.CreateSphere('boml', { diameter: 1.1, segments: 16 }, scene)
  const lm = new StandardMaterial('bomlm', scene)
  lm.diffuseColor = new Color3(0.07, 0.07, 0.1); lm.specularColor = new Color3(0.9, 0.9, 1); lm.specularPower = 48
  lm.emissiveColor = new Color3(0, 0, 0)
  lijf.material = lm; lijf.parent = root; lijf.position.y = 0.55; lijf.isPickable = false
  const kap = MeshBuilder.CreateCylinder('bomk', { height: 0.18, diameter: 0.38, tessellation: 16 }, scene)
  const km = new StandardMaterial('bomkm', scene); km.diffuseColor = new Color3(0.75, 0.62, 0.3); km.specularColor = new Color3(1, 0.9, 0.6)
  kap.material = km; kap.parent = root; kap.position.y = 1.12; kap.isPickable = false
  const lont = MeshBuilder.CreateCylinder('bomlont', { height: 0.32, diameter: 0.06, tessellation: 6 }, scene)
  lont.material = km; lont.parent = root; lont.position.set(0.06, 1.32, 0); lont.rotation.z = -0.4; lont.isPickable = false
  const vonk = new TransformNode('bomv', scene); vonk.parent = root; vonk.position.set(0.13, 1.48, 0)
  const ps = deeltjes(scene, 'bomps', fireTex, vonk, {
    max: 50, box: 0.02, rate: 60, size: [0.08, 0.2], life: [0.15, 0.35],
    c1: new Color4(1, 0.95, 0.5, 1), c2: new Color4(1, 0.5, 0.1, 1), dir: [new Vector3(-1, 0.5, -1), new Vector3(1, 1.5, 1)],
    power: [0.8, 2], grav: new Vector3(0, -4, 0),
  })
  ps.start()
  const ring = MeshBuilder.CreateDisc('bomr', { radius: straal, tessellation: 48 }, scene)
  ring.rotation.x = Math.PI / 2
  const rt = new DynamicTexture('bomrt', { width: 128, height: 128 }, scene, false)
  const c = rt.getContext()
  const g = c.createRadialGradient(64, 64, 40, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,40,40,0)'); g.addColorStop(0.85, 'rgba(255,40,40,0.35)'); g.addColorStop(0.95, 'rgba(255,90,90,1)'); g.addColorStop(1, 'rgba(255,40,40,0)')
  c.fillStyle = g; c.fillRect(0, 0, 128, 128); rt.update(); rt.hasAlpha = true
  const rm = new StandardMaterial('bomrm', scene)
  rm.diffuseTexture = rt; rm.useAlphaFromDiffuseTexture = true; rm.emissiveTexture = rt; rm.disableLighting = true
  ring.material = rm; ring.parent = root; ring.position.y = 0.06; ring.isPickable = false

  root.position.set(x, y, z)
  let t = 0
  return {
    root,
    stap(dt, x2, y2, z2, lontOver, lontTotaal) {
      t += dt
      root.position.set(x2, y2, z2)
      // neerploffen: valt vanaf kart-hoogte en stuitert even
      const val = Math.min(1, t / 0.35)
      lijf.position.y = 0.55 + (1 - val) * 1.4 * (1 - val) + Math.abs(Math.sin(val * Math.PI * 2)) * 0.15 * (1 - val)
      const over = Math.max(0, Math.min(1, lontOver / lontTotaal))
      const snel = 6 + (1 - over) * 30                       // knipperen versnelt
      const flits = (Math.sin(t * snel) + 1) / 2
      lm.emissiveColor.set(flits * (1 - over) * 0.9, 0, 0)    // lijf gloeit rood op
      lijf.scaling.setAll(1 + flits * 0.06 * (1 - over) + Math.sin(t * 10) * 0.02)
      rm.alpha = 0.35 + flits * 0.65
      ring.scaling.setAll(0.96 + flits * 0.04)
    },
    weg() { ps.stop(); ps.dispose(); root.dispose(false, true) },
  }
}
