import { useEffect, useRef, useState } from 'react'
import {
  Engine, Scene, FollowCamera, TransformNode,
  HemisphericLight, DirectionalLight, ShadowGenerator,
  Vector3, Color3, Color4,
  MeshBuilder, StandardMaterial, DynamicTexture, ParticleSystem,
  DefaultRenderingPipeline,
} from '@babylonjs/core'
import * as Colyseus from '@colyseus/sdk'
import OrientationGate from '../OrientationGate'
import { KART_COLORS, AV_Y, AV_Z, buildKart, loadAvatar, safeJSON } from './kartShared'
import './botsen-game.css'

// ═══════════════════════════════════════════════════════════════════════
//  BOTSEN — eigen ballon-gevecht-modus (los van Racen), zelfde kart +
//  poppetje + besturing, maar in een kleine gesloten arena i.p.v. een baan.
//  Elke kart heeft 3 ballonnen; geraakt worden door een schild-projectiel
//  laat er één knappen. Bij 0 ballonnen lig je eruit. Laatste kart wint.
// ═══════════════════════════════════════════════════════════════════════

const SERVER_URL = 'wss://kenniskist-server.onrender.com'
const ROOM_TYPE = 'botsen'

// ── Vier-kwadranten-arena: vier gekleurde platforms (blauw/rood/groen/geel)
//    in een 2×2-grid, verbonden door bruggen die in het midden een kruising
//    vormen (een centrale hub-tegel), elk platform ook bereikbaar via een
//    helling naar de grond. Grens is ONZICHTBAAR (geen muur-mesh, alleen
//    botsing). MOET kloppen met de server (BotsenRoom.ts). ────────────────
const ARENA_HALF = 58            // speelveld: -58..58 in x en z (geeft de hellingen ruimte tot de rand)
const CAR_RADIUS = 1.5
const PLAT_H     = 4.2           // hoogte van alle vier platforms (gelijk)
const PLAT_SIZE  = 22            // breedte/diepte per platform
const CORRIDOR   = 20            // volledige open ruimte tussen twee platforms
const BRIDGE_W   = 8             // breedte van het brug-dek zelf (smaller dan CORRIDOR,
                                  // zodat er aan weerszijden grond overblijft om onderdoor te rijden)
const OFF        = PLAT_SIZE / 2 + CORRIDOR / 2   // 21 — afstand vanaf midden tot elk platform
const RAMP_LEN   = 14
// Elk platform: kleur + welke kant (x-richting) de buiten-helling op wijst.
const QUADRANTS = [
  { key: 'nw', x: -OFF, z: -OFF, body: '#2f6fed', top: '#8fbaff', rail: '#d6ebff', name: 'Blauw',  rampDir: -1 },
  { key: 'ne', x: OFF, z: -OFF, body: '#e63946', top: '#ff9b96', rail: '#ffd9d6', name: 'Rood',   rampDir: 1 },
  { key: 'sw', x: -OFF, z: OFF, body: '#2a9d5a', top: '#8fe3a8', rail: '#d6f5e0', name: 'Groen',  rampDir: -1 },
  { key: 'se', x: OFF, z: OFF, body: '#f2c11d', top: '#ffe27a', rail: '#fff3c2', name: 'Geel',   rampDir: 1 },
]
// Decoratieve dekking in de open grond-ring rond de vier platforms (in de
// diagonale hoeken, ver van de platforms/bruggen zelf).
const DIAG = OFF + PLAT_SIZE / 2 + 5
const OBSTACLES = [
  { x: -DIAG, z: -DIAG, w: 6, d: 6, color: '#9b5de5' },
  { x: DIAG, z: -DIAG, w: 6, d: 6, color: '#f4a261' },
  { x: -DIAG, z: DIAG, w: 6, d: 6, color: '#43aa8b' },
  { x: DIAG, z: DIAG, w: 6, d: 6, color: '#ff6b9d' },
]
const BALLOON_COLORS = ['#ff4d6d', '#ffd23f', '#4dd2ff']
// Item-boxen: één op elk platform (MOET kloppen met de server BotsenRoom.ts).
const BOX_SPOTS = QUADRANTS.map(q => ({ x: q.x, z: q.z }))

// Hoogte van de grond op (x,z). De vier platforms liggen op PLAT_H. De vier
// bruggen ertussen zijn SMALLER dan de volledige opening (BRIDGE_W < CORRIDOR)
// — aan weerszijden van elke brug blijft dus grond op hoogte 0 over, zodat je
// er onderdoor kunt rijden i.p.v. dat de brug de hele opening vult.
// Alleen de buiten-hellingen per platform lopen af naar de grond (0).
function inRect(x, z, cx, cz, hw, hd) { return x >= cx - hw && x <= cx + hw && z >= cz - hd && z <= cz + hd }
function heightAt(x, z) {
  const hp = PLAT_SIZE / 2, hc = CORRIDOR / 2, hb = BRIDGE_W / 2
  for (const q of QUADRANTS) if (inRect(x, z, q.x, q.z, hp, hp)) return PLAT_H
  // horizontale bruggen (boven-/onderrij, tussen linker- en rechterplatform):
  // dek loopt de volle corridor-lengte in x, maar is smal in z
  if (inRect(x, z, 0, -OFF, hc, hb)) return PLAT_H
  if (inRect(x, z, 0, OFF, hc, hb)) return PLAT_H
  // verticale bruggen (linker-/rechterkolom): smal in x, volle lengte in z
  if (inRect(x, z, -OFF, 0, hb, hc)) return PLAT_H
  if (inRect(x, z, OFF, 0, hb, hc)) return PLAT_H
  // buiten-helling per platform (op de rampDir-zijde, x-richting)
  for (const q of QUADRANTS) {
    const rx0 = q.x + q.rampDir * hp
    const t = q.rampDir > 0 ? (x - rx0) / RAMP_LEN : (rx0 - x) / RAMP_LEN
    if (t >= 0 && t <= 1 && z >= q.z - hp && z <= q.z + hp) return PLAT_H * (1 - t)
  }
  return 0
}
// Botsingswanden per platform: de buitenrand is volledig dicht, de
// helling-zijde heeft leuningen langs de opening, en de twee zijden die naar
// een brug leiden zijn dicht BEHALVE precies waar het (smalle) brug-dek zelf
// zit — zo kun je nergens zomaar tegen de platform-rand op rijden, alleen
// via de helling of de brug, en blijft de grond ernaast/eronder wél vrij.
function platformWalls(q) {
  const hp = PLAT_SIZE / 2, hb = BRIDGE_W / 2
  const isTop = q.z < 0
  const outerZ = isTop ? q.z - hp : q.z + hp        // buitenrand (dicht)
  const innerZ = isTop ? q.z + hp : q.z - hp        // rand naar boven-/onderbuur (brug)
  const rampX0 = q.x + q.rampDir * hp
  const innerX = q.x - q.rampDir * hp               // rand naar linker-/rechterbuur (brug)
  const railMidX = rampX0 + q.rampDir * (RAMP_LEN / 2)
  const flankLen = hp - hb, flankOff = hb + flankLen / 2
  return [
    { x: q.x, z: outerZ, hw: hp, hd: 0.4 },                              // buitenrand (dicht)
    { x: railMidX, z: q.z - hp, hw: RAMP_LEN / 2, hd: 0.4 },             // helling-leuning noordkant
    { x: railMidX, z: q.z + hp, hw: RAMP_LEN / 2, hd: 0.4 },             // helling-leuning zuidkant
    { x: q.x - flankOff, z: innerZ, hw: flankLen / 2, hd: 0.4 },         // flankwand naast de Z-brug-opening
    { x: q.x + flankOff, z: innerZ, hw: flankLen / 2, hd: 0.4 },
    { x: innerX, z: q.z - flankOff, hw: 0.4, hd: flankLen / 2 },         // flankwand naast de X-brug-opening
    { x: innerX, z: q.z + flankOff, hw: 0.4, hd: flankLen / 2 },
  ]
}
const ITEM_INFO = {
  schild:  { emoji: '🛡️', label: 'Schild' },
  bom:     { emoji: '💣', label: 'Bom' },
  vuurtje: { emoji: '🔥', label: 'Vuurtje' },
}

// ── Ballonnen: 3 bolletjes op een dun mastje achter de kart ─────────────
function buildBalloons(scene, idSuffix) {
  const balls = []
  for (let i = 0; i < 3; i++) {
    const s = MeshBuilder.CreateSphere('balloon' + idSuffix + i, { diameter: 0.6, segments: 10 }, scene)
    const m = new StandardMaterial('balloonMat' + idSuffix + i, scene)
    m.diffuseColor = Color3.FromHexString(BALLOON_COLORS[i])
    m.emissiveColor = Color3.FromHexString(BALLOON_COLORS[i]).scale(0.3)
    m.specularColor = new Color3(0.6, 0.6, 0.6)
    s.material = m
    s.position.set((i - 1) * 0.42, 1.7 + i * 0.05, -1.9)
    balls.push(s)
  }
  return balls
}
function setBalloons(balls, count) {
  balls.forEach((b, i) => b.setEnabled(i < count))
}

// ── Naamkaartje: zwevend, altijd naar de camera gericht, boven de kart ──
function makeNameTag(scene, name) {
  const plane = MeshBuilder.CreatePlane('bnametag', { width: 3.2, height: 0.8 }, scene)
  plane.billboardMode = 7 // Mesh.BILLBOARDMODE_ALL
  plane.isPickable = false
  const tex = new DynamicTexture('bnametagTex', { width: 256, height: 64 }, scene, false)
  const c = tex.getContext()
  c.clearRect(0, 0, 256, 64)
  c.fillStyle = 'rgba(10,10,20,0.55)'
  c.beginPath(); c.roundRect ? c.roundRect(4, 12, 248, 40, 16) : c.rect(4, 12, 248, 40); c.fill()
  c.fillStyle = '#fff'; c.font = 'bold 30px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.fillText((name || 'Speler').slice(0, 14), 128, 33)
  tex.update(); tex.hasAlpha = true
  const m = new StandardMaterial('bnametagMat', scene)
  m.diffuseTexture = tex; m.emissiveColor = new Color3(1, 1, 1); m.specularColor = Color3.Black()
  m.diffuseTexture.hasAlpha = true; m.useAlphaFromDiffuseTexture = true; m.backFaceCulling = false
  plane.material = m
  plane.position.y = 3.3
  return plane
}

// ── Zachte gloed-textuur voor vuurdeeltjes (radiaal verloop) ────────────
function makeFireTexture(scene) {
  const tex = new DynamicTexture('bfireTex', { width: 64, height: 64 }, scene, false)
  const c = tex.getContext()
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,225,1)')
  g.addColorStop(0.35, 'rgba(255,170,40,0.95)')
  g.addColorStop(1, 'rgba(255,60,0,0)')
  c.fillStyle = g; c.fillRect(0, 0, 64, 64)
  tex.update(); tex.hasAlpha = true
  return tex
}
// ── Projectielen: groen schild (zelfde look als Karten) of een écht
//    vlammend vuurtje (kleine gloeikern + deeltjes-vuur eromheen) ────────
function makeShellMesh(scene, kind, fireTex) {
  if (kind === 'vuurtje') {
    const core = MeshBuilder.CreateSphere('bflame', { diameter: 0.45, segments: 8 }, scene)
    const m = new StandardMaterial('bflamem', scene)
    m.emissiveColor = new Color3(1, 0.75, 0.25); m.diffuseColor = new Color3(1, 0.4, 0.05)
    m.specularColor = Color3.Black()
    core.material = m; core.isPickable = false
    const ps = new ParticleSystem('firePs', 80, scene)
    ps.particleTexture = fireTex
    ps.emitter = core
    ps.minEmitBox = new Vector3(-0.1, -0.1, -0.1); ps.maxEmitBox = new Vector3(0.1, 0.1, 0.1)
    ps.color1 = new Color4(1, 0.75, 0.25, 1); ps.color2 = new Color4(1, 0.35, 0.05, 1)
    ps.colorDead = new Color4(0.3, 0.05, 0, 0)
    ps.minSize = 0.35; ps.maxSize = 0.75
    ps.minLifeTime = 0.12; ps.maxLifeTime = 0.28
    ps.emitRate = 140
    ps.blendMode = ParticleSystem.BLENDMODE_ADD
    ps.direction1 = new Vector3(-0.6, 0.4, -0.6); ps.direction2 = new Vector3(0.6, 1.4, 0.6)
    ps.minEmitPower = 0.3; ps.maxEmitPower = 0.8
    ps.gravity = new Vector3(0, 1.4, 0)
    ps.start()
    core._fireParticles = ps
    return core
  }
  const dome = MeshBuilder.CreateSphere('bshell', { diameter: 0.9, segments: 14, slice: 0.62 }, scene)
  dome.scaling.y = 0.78
  const tex = new DynamicTexture('bshellTex', { width: 128, height: 128 }, scene, false)
  const tc = tex.getContext()
  const g = tc.createRadialGradient(64, 44, 4, 64, 44, 76)
  g.addColorStop(0, '#7CFF9E'); g.addColorStop(0.55, '#1FA648'); g.addColorStop(1, '#0B5B27')
  tc.fillStyle = g; tc.fillRect(0, 0, 128, 128)
  tc.strokeStyle = 'rgba(6,50,20,0.55)'; tc.lineWidth = 4
  for (let i = 0; i < 3; i++) { tc.beginPath(); tc.arc(64, 128, 34 + i * 26, Math.PI, Math.PI * 2); tc.stroke() }
  tc.strokeStyle = 'rgba(255,255,255,0.55)'; tc.lineWidth = 3
  tc.beginPath(); tc.ellipse(64, 44, 46, 26, 0, 0, Math.PI * 2); tc.stroke()
  tex.update()
  const m = new StandardMaterial('bshellm', scene)
  m.diffuseTexture = tex; m.emissiveColor = new Color3(0.08, 0.35, 0.14); m.specularColor = new Color3(0.7, 0.9, 0.7); m.specularPower = 24
  dome.material = m; dome.isPickable = false
  // subtiel glinster-sparkeltje eromheen (minder druk dan het vuurtje)
  const ps = new ParticleSystem('shellSparkle', 24, scene)
  ps.particleTexture = fireTex
  ps.emitter = dome
  ps.minEmitBox = new Vector3(-0.3, -0.1, -0.3); ps.maxEmitBox = new Vector3(0.3, 0.3, 0.3)
  ps.color1 = new Color4(0.6, 1, 0.7, 0.8); ps.color2 = new Color4(0.3, 0.9, 0.5, 0.6)
  ps.colorDead = new Color4(0.2, 0.6, 0.3, 0)
  ps.minSize = 0.12; ps.maxSize = 0.28
  ps.minLifeTime = 0.2; ps.maxLifeTime = 0.4
  ps.emitRate = 30
  ps.blendMode = ParticleSystem.BLENDMODE_ADD
  ps.direction1 = new Vector3(-0.3, 0.2, -0.3); ps.direction2 = new Vector3(0.3, 0.6, 0.3)
  ps.minEmitPower = 0.1; ps.maxEmitPower = 0.3
  ps.start()
  dome._fireParticles = ps
  return dome
}
// ── Explosie: felle lichtflits + deeltjes-uitbarsting + een uitdovende
//    ring die de schade-straal van de bom laat zien ──────────────────────
function makeExplosion(scene, x, y, z, radius, fireTex) {
  const burst = new ParticleSystem('boom', 140, scene)
  burst.particleTexture = fireTex
  burst.emitter = new Vector3(x, y + 0.3, z)
  burst.minEmitBox = new Vector3(-0.2, -0.2, -0.2); burst.maxEmitBox = new Vector3(0.2, 0.2, 0.2)
  burst.color1 = new Color4(1, 0.9, 0.4, 1); burst.color2 = new Color4(1, 0.4, 0.05, 1)
  burst.colorDead = new Color4(0.3, 0.05, 0, 0)
  burst.minSize = 0.6; burst.maxSize = 1.6
  burst.minLifeTime = 0.25; burst.maxLifeTime = 0.55
  burst.emitRate = 0
  burst.manualEmitCount = 90
  burst.blendMode = ParticleSystem.BLENDMODE_ADD
  burst.direction1 = new Vector3(-1, 0.3, -1); burst.direction2 = new Vector3(1, 1.6, 1)
  burst.minEmitPower = 3; burst.maxEmitPower = 9
  burst.gravity = new Vector3(0, -2, 0)
  burst.targetStopDuration = 0.15
  burst.disposeOnStop = true
  burst.start()

  // ringen die uitdijen tot de echte schade-straal en dan vervagen
  const rings = []
  for (let i = 0; i < 2; i++) {
    const ring = MeshBuilder.CreateTorus('boomRing' + i, { diameter: 0.6, thickness: 0.18, tessellation: 40 }, scene)
    ring.position.set(x, y + 0.15, z); ring.rotation.x = Math.PI / 2
    const rm = new StandardMaterial('boomRingM' + i, scene)
    rm.emissiveColor = new Color3(1, 0.55, 0.1); rm.disableLighting = true; rm.alpha = 0.85
    ring.material = rm
    rings.push({ mesh: ring, delay: i * 0.08 })
  }
  return { rings, radius, t: 0, dur: 0.5 }
}
function stepExplosion(ex, dt) {
  ex.t += dt
  const p = Math.min(1, ex.t / ex.dur)
  ex.rings.forEach(r => {
    const rp = Math.min(1, Math.max(0, (ex.t - r.delay) / (ex.dur - r.delay)))
    const d = 0.6 + rp * (ex.radius * 2 - 0.6)
    r.mesh.scaling.setAll(d / 0.6)
    r.mesh.material.alpha = 0.85 * (1 - rp)
  })
  return ex.t >= ex.dur
}
function disposeExplosion(ex) { ex.rings.forEach(r => r.mesh.dispose()) }
function disposeShellMesh(mesh) {
  mesh._fireParticles?.stop(); mesh._fireParticles?.dispose()
  mesh.dispose()
}
// ── Bom: zwarte bol met lont ─────────────────────────────────────────────
function makeBombMesh(scene) {
  const body = MeshBuilder.CreateSphere('bbomb', { diameter: 1.1, segments: 12 }, scene)
  const m = new StandardMaterial('bbombm', scene)
  m.diffuseColor = new Color3(0.1, 0.1, 0.12); m.specularColor = new Color3(0.4, 0.4, 0.4)
  body.material = m; body.isPickable = false
  const fuse = MeshBuilder.CreateCylinder('bfuse', { height: 0.4, diameter: 0.08, tessellation: 6 }, scene)
  fuse.parent = body; fuse.position.set(0, 0.6, 0); fuse.rotation.x = -0.3
  const fm = new StandardMaterial('bfusem', scene); fm.diffuseColor = new Color3(0.6, 0.5, 0.3)
  fuse.material = fm
  const spark = MeshBuilder.CreateSphere('bspark', { diameter: 0.18, segments: 6 }, scene)
  spark.parent = body; spark.position.set(0, 0.82, 0)
  const sm = new StandardMaterial('bsparkm', scene); sm.emissiveColor = new Color3(1, 0.7, 0.1); sm.diffuseColor = new Color3(1, 0.6, 0.1)
  spark.material = sm
  return body
}
// ── Item-box: draaiend "?"-blok (zelfde stijl als Karten) ───────────────
function makeItemBox(scene, x, z) {
  const box = MeshBuilder.CreateBox('bibox', { size: 1.3 }, scene)
  box.position.set(x, 1.05, z); box.isPickable = false
  const m = new StandardMaterial('biboxm', scene)
  const tex = new DynamicTexture('biboxt', { width: 128, height: 128 }, scene, false)
  const c = tex.getContext()
  const g = c.createLinearGradient(0, 0, 128, 128)
  g.addColorStop(0, '#ffe14d'); g.addColorStop(0.5, '#ff8a3d'); g.addColorStop(1, '#ff4db8')
  c.fillStyle = g; c.fillRect(0, 0, 128, 128)
  c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 8; c.strokeRect(6, 6, 116, 116)
  c.fillStyle = '#fff'; c.font = 'bold 92px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.fillText('?', 64, 70)
  tex.update()
  m.diffuseTexture = tex; m.emissiveColor = new Color3(0.6, 0.45, 0.2)
  box.material = m
  return box
}

// hex '#rrggbb' → [r,g,b] in 0..1
function hexRgb(hex) { const c = Color3.FromHexString(hex); return [c.r, c.g, c.b] }

// ── Zachte wolken: een paar losse bolletjes-clusters die stil in de lucht
//    hangen — puur sfeer, geen botsing. Maakt het "zwevend eiland"-gevoel
//    af zonder de arena zelf drukker te maken. ──
function buildClouds(scene) {
  const mat = new StandardMaterial('bcloudMat', scene)
  mat.diffuseColor = new Color3(1, 1, 1); mat.emissiveColor = new Color3(0.85, 0.9, 0.97)
  mat.specularColor = Color3.Black(); mat.alpha = 0.9
  const spots = [
    { x: -70, z: -30, y: 34 }, { x: 60, z: -55, y: 40 }, { x: -55, z: 60, y: 30 },
    { x: 75, z: 25, y: 44 }, { x: -20, z: -90, y: 38 }, { x: 30, z: 85, y: 36 },
  ]
  spots.forEach((s, si) => {
    const cluster = new TransformNode('bcloud' + si, scene)
    cluster.position.set(s.x, s.y, s.z)
    const puffs = 4 + Math.floor(Math.random() * 3)
    for (let i = 0; i < puffs; i++) {
      const r = 3 + Math.random() * 3.5
      const puff = MeshBuilder.CreateSphere('bcloudPuff' + si + i, { diameter: r * 2, segments: 8 }, scene)
      puff.material = mat; puff.isPickable = false
      puff.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 6)
      puff.scaling.y = 0.62
      puff.parent = cluster
    }
  })
}

// ── Arena bouwen: alleen lucht (géén gras/bomen), fort-achtige gekleurde
//    vloer + platform/helling, gekleurde kratten als dekking. Grens =
//    ONZICHTBAAR (geen muur-mesh — alleen botsing); mist laat de vloer
//    zachtjes in de lucht verdwijnen zodat het een zwevend eiland lijkt. ──
function buildArena(scene, sg) {
  const half = ARENA_HALF
  const skyTop = '#5fb0ff', skyBot = '#d8f0ff'

  // Skydome met verticale gradient
  const sky = MeshBuilder.CreateSphere('bsky', { diameter: (half + 160) * 2, segments: 16 }, scene)
  const skyTex = new DynamicTexture('bskyTex', { width: 8, height: 256 }, scene, false)
  const sx = skyTex.getContext()
  const grad = sx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, skyTop); grad.addColorStop(1, skyBot)
  sx.fillStyle = grad; sx.fillRect(0, 0, 8, 256); skyTex.update()
  const skyMat = new StandardMaterial('bskyMat', scene)
  skyMat.emissiveTexture = skyTex; skyMat.disableLighting = true; skyMat.backFaceCulling = false
  skyMat.diffuseColor = Color3.Black(); skyMat.specularColor = Color3.Black()
  sky.material = skyMat; sky.isPickable = false
  scene.clearColor = new Color4(...hexRgb(skyBot), 1)
  // Mist vlak achter de speelgrens: de vloer "verdwijnt" in de lucht i.p.v.
  // een harde rand — er is verder geen grond, dus je ziet er gewoon lucht.
  scene.fogMode = Scene.FOGMODE_LINEAR; scene.fogStart = half - 6; scene.fogEnd = half + 22
  scene.fogColor = new Color3(...hexRgb(skyBot))

  // Checker-tegelvloer: lichtblauw/wit schaakbordpatroon (zoals het voorbeeld)
  const floorTex = new DynamicTexture('bfloorTex', { width: 256, height: 256 }, scene, false)
  const fx = floorTex.getContext()
  const tileN = 8, tileS = 256 / tileN
  for (let ty = 0; ty < tileN; ty++) for (let tx = 0; tx < tileN; tx++) {
    fx.fillStyle = (tx + ty) % 2 === 0 ? '#d7e8f2' : '#c3dcea'
    fx.fillRect(tx * tileS, ty * tileS, tileS, tileS)
  }
  fx.strokeStyle = 'rgba(160,190,210,0.5)'; fx.lineWidth = 2
  for (let i = 0; i <= tileN; i++) { fx.beginPath(); fx.moveTo(i * tileS, 0); fx.lineTo(i * tileS, 256); fx.stroke(); fx.beginPath(); fx.moveTo(0, i * tileS); fx.lineTo(256, i * tileS); fx.stroke() }
  floorTex.update(); floorTex.wrapU = floorTex.wrapV = 1; floorTex.uScale = floorTex.vScale = half / 4
  const floor = MeshBuilder.CreateGround('bfloor', { width: half * 2, height: half * 2 }, scene)
  const fMat = new StandardMaterial('bfloorMat', scene)
  fMat.diffuseTexture = floorTex; fMat.specularColor = new Color3(0.15, 0.15, 0.18)
  floor.material = fMat; floor.receiveShadows = true; floor.position.y = -0.015

  // Rand rond de hele arena: een houten/gevlochten boord (zoals het voorbeeld)
  const borderTex = new DynamicTexture('bborderTex', { width: 256, height: 32 }, scene, false)
  const bx = borderTex.getContext()
  bx.fillStyle = '#a9743a'; bx.fillRect(0, 0, 256, 32)
  for (let i = 0; i < 16; i++) { bx.fillStyle = i % 2 ? '#8f5f2a' : '#b98548'; bx.fillRect(i * 16, 0, 16, 32) }
  bx.fillStyle = 'rgba(0,0,0,0.18)'; bx.fillRect(0, 0, 256, 4); bx.fillRect(0, 28, 256, 4)
  borderTex.update(); borderTex.wrapU = 1; borderTex.uScale = half / 2.5
  const borderMat = new StandardMaterial('bborderMat', scene)
  borderMat.diffuseTexture = borderTex; borderMat.specularColor = Color3.Black()
  const borderH = 1.6, borderT = 2.2
  ;[[0, -half - borderT / 2, half * 2 + borderT * 2, borderT], [0, half + borderT / 2, half * 2 + borderT * 2, borderT]].forEach(([, zc, w, d], i) => {
    const seg = MeshBuilder.CreateBox('bborderZ' + i, { width: w, height: borderH, depth: d }, scene)
    seg.position.set(0, borderH / 2 - 0.3, zc); seg.material = borderMat; seg.receiveShadows = true; sg.addShadowCaster(seg)
  })
  ;[[-half - borderT / 2, 0, borderT, half * 2 + borderT * 2], [half + borderT / 2, 0, borderT, half * 2 + borderT * 2]].forEach(([xc, , w, d], i) => {
    const seg = MeshBuilder.CreateBox('bborderX' + i, { width: w, height: borderH, depth: d }, scene)
    seg.position.set(xc, borderH / 2 - 0.3, 0); seg.material = borderMat; seg.receiveShadows = true; sg.addShadowCaster(seg)
  })

  // ── Vier gekleurde platforms + hun buiten-helling naar de grond, elk met
  //    een gekleurde rand bovenop (zoals het voorbeeld-plaatje) ───────────
  function buildQuadrant(q) {
    const hp = PLAT_SIZE / 2
    const bodyMat = new StandardMaterial('bplatMat' + q.key, scene)
    bodyMat.diffuseColor = Color3.FromHexString(q.body); bodyMat.specularColor = new Color3(0.2, 0.2, 0.2)
    const topMat = new StandardMaterial('bplatTopMat' + q.key, scene)
    topMat.diffuseColor = Color3.FromHexString(q.top); topMat.specularColor = Color3.Black()
    const body = MeshBuilder.CreateBox('bplateau' + q.key, { width: PLAT_SIZE, height: PLAT_H, depth: PLAT_SIZE }, scene)
    body.position.set(q.x, PLAT_H / 2, q.z); body.material = bodyMat
    body.receiveShadows = true; sg.addShadowCaster(body)
    const topPlane = MeshBuilder.CreateGround('bplateauTop' + q.key, { width: PLAT_SIZE, height: PLAT_SIZE }, scene)
    topPlane.position.set(q.x, PLAT_H + 0.01, q.z); topPlane.material = topMat; topPlane.receiveShadows = true

    // gekleurde opstaande rand net binnen de buitenrand van het platform
    const rimMat = new StandardMaterial('bplatRimMat' + q.key, scene)
    rimMat.diffuseColor = Color3.FromHexString(q.rail)
    rimMat.emissiveColor = Color3.FromHexString(q.rail).scale(0.3); rimMat.specularColor = Color3.Black()
    const rimT = 1.1, rimH = 0.5
    ;[-1, 1].forEach(s => {
      const rimX = MeshBuilder.CreateBox('brimX' + q.key + s, { width: rimT, height: rimH, depth: PLAT_SIZE }, scene)
      rimX.position.set(q.x + s * (hp - rimT / 2), PLAT_H + rimH / 2, q.z); rimX.material = rimMat
      const rimZ = MeshBuilder.CreateBox('brimZ' + q.key + s, { width: PLAT_SIZE, height: rimH, depth: rimT }, scene)
      rimZ.position.set(q.x, PLAT_H + rimH / 2, q.z + s * (hp - rimT / 2)); rimZ.material = rimMat
    })

    // helling naar de grond (buitenkant, in de x-richting van rampDir)
    const rampX0 = q.x + q.rampDir * hp
    const rampSlopeLen = Math.hypot(RAMP_LEN, PLAT_H)
    const ramp = MeshBuilder.CreateBox('bramp' + q.key, { width: rampSlopeLen, height: 0.6, depth: PLAT_SIZE }, scene)
    ramp.position.set(rampX0 + q.rampDir * RAMP_LEN / 2, PLAT_H / 2, q.z)
    // Rotatie om de Z-as tilt het verre X-uiteinde omlaag (analoog aan de
    // oude Z-georiënteerde helling die om de X-as tilde).
    ramp.rotation.z = -q.rampDir * Math.atan2(PLAT_H, RAMP_LEN)
    ramp.material = bodyMat; ramp.receiveShadows = true; sg.addShadowCaster(ramp)

    // leuningen (volgen de botsings-wanden van platformWalls exact)
    platformWalls(q).forEach((seg, i) => {
      const railH = 0.9
      const rail = MeshBuilder.CreateBox('brail' + q.key + i, { width: seg.hw * 2 * 0.9, height: railH, depth: seg.hd * 2 * 0.9 }, scene)
      const y = heightAt(seg.x, seg.z)
      rail.position.set(seg.x, y + railH / 2, seg.z); rail.material = rimMat
    })
  }
  QUADRANTS.forEach(buildQuadrant)

  // ── Vier korte, SMALLE bruggen tussen de platforms — smaller dan de hele
  //    opening (BRIDGE_W < CORRIDOR), met steunpoten, zodat duidelijk te
  //    zien is dat je aan weerszijden op de grond eronderdoor kunt rijden ──
  const bridgeMat = new StandardMaterial('bbridgeMat', scene)
  bridgeMat.diffuseColor = new Color3(0.72, 0.75, 0.8); bridgeMat.specularColor = Color3.Black()
  const bridgeRailMat = new StandardMaterial('bbridgeRailMat', scene)
  bridgeRailMat.diffuseColor = new Color3(0.5, 0.53, 0.6); bridgeRailMat.specularColor = Color3.Black()
  const hc = CORRIDOR / 2, hb = BRIDGE_W / 2
  const BRIDGES = [
    { x: 0, z: -OFF, horizontal: true }, { x: 0, z: OFF, horizontal: true },
    { x: -OFF, z: 0, horizontal: false }, { x: OFF, z: 0, horizontal: false },
  ]
  BRIDGES.forEach((b, i) => {
    const len = CORRIDOR, w = b.horizontal ? len : BRIDGE_W, d = b.horizontal ? BRIDGE_W : len
    const deck = MeshBuilder.CreateBox('bbridge' + i, { width: w, height: 0.6, depth: d }, scene)
    deck.position.set(b.x, PLAT_H - 0.3, b.z); deck.material = bridgeMat
    deck.receiveShadows = true; sg.addShadowCaster(deck)
    // leuningen langs de lange zijden van het dek (puur decoratief, geen botsing)
    ;[-hb, hb].forEach(off => {
      const rail = MeshBuilder.CreateBox('bbrail' + i + off, b.horizontal
        ? { width: len * 0.95, height: 0.7, depth: 0.3 } : { width: 0.3, height: 0.7, depth: len * 0.95 }, scene)
      rail.position.set(b.horizontal ? b.x : b.x + off, PLAT_H + 0.35, b.horizontal ? b.z + off : b.z)
      rail.material = bridgeRailMat; rail.isPickable = false
    })
    // twee steunpoten omlaag naar de grond, in het midden van het dek (visueel;
    // staan precies op de grens tussen brug en de open rijstroken ernaast)
    ;[-len / 4, len / 4].forEach(off => {
      const leg = MeshBuilder.CreateCylinder('bbleg' + i + off, { height: PLAT_H, diameter: 0.6, tessellation: 10 }, scene)
      leg.position.set(b.horizontal ? b.x + off : b.x, PLAT_H / 2 - 0.3, b.horizontal ? b.z : b.z + off)
      leg.material = bridgeRailMat
    })
  })

  // ── Obstakels: gekleurde fort-kratten (metaal-paneel-look) ──
  const boxes = []
  OBSTACLES.forEach((o, i) => {
    const h = 2.6
    const tex = new DynamicTexture('bcrateTex' + i, { width: 64, height: 64 }, scene, false)
    const ctx = tex.getContext()
    ctx.fillStyle = o.color; ctx.fillRect(0, 0, 64, 64)
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 5
    ctx.strokeRect(2, 2, 60, 60)
    ctx.beginPath(); ctx.moveTo(32, 2); ctx.lineTo(32, 62); ctx.moveTo(2, 32); ctx.lineTo(62, 32); ctx.stroke()
    tex.update()
    const mat = new StandardMaterial('bcrateMat' + i, scene)
    mat.diffuseTexture = tex; mat.specularColor = new Color3(0.25, 0.25, 0.25)
    const box = MeshBuilder.CreateBox('bobs' + i, { width: o.w, height: h, depth: o.d }, scene)
    box.position.set(o.x, h / 2, o.z); box.material = mat
    box.receiveShadows = true; sg.addShadowCaster(box)
    boxes.push({ x: o.x, z: o.z, hw: o.w / 2, hd: o.d / 2 })
  })

  // ── Onzichtbare grens (alleen botsing, geen mesh) ──
  const invisWalls = [
    { x: 0, z: half + 1, hw: half + 1, hd: 1 },
    { x: 0, z: -half - 1, hw: half + 1, hd: 1 },
    { x: half + 1, z: 0, hw: 1, hd: half + 1 },
    { x: -half - 1, z: 0, hw: 1, hd: half + 1 },
  ]

  buildClouds(scene)

  const platWalls = QUADRANTS.flatMap(platformWalls)
  return { boxes: boxes.concat(invisWalls, platWalls) }
}

// Cirkel-vs-AABB botsing: duwt een punt (met straal r) uit een blok.
function collideBoxes(pos, r, boxes) {
  for (const b of boxes) {
    const x0 = b.x - b.hw, x1 = b.x + b.hw, z0 = b.z - b.hd, z1 = b.z + b.hd
    const cx = Math.max(x0, Math.min(pos.x, x1)), cz = Math.max(z0, Math.min(pos.z, z1))
    const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz
    const inside = pos.x > x0 && pos.x < x1 && pos.z > z0 && pos.z < z1
    if (!inside && d2 >= r * r) continue
    if (inside) {
      const dL = pos.x - x0, dR = x1 - pos.x, dT = pos.z - z0, dB = z1 - pos.z
      const m = Math.min(dL, dR, dT, dB)
      if (m === dT) pos.z = z0 - r
      else if (m === dB) pos.z = z1 + r
      else if (m === dL) pos.x = x0 - r
      else pos.x = x1 + r
    } else {
      const d = Math.sqrt(d2) || 0.0001
      pos.x += (dx / d) * (r - d)
      pos.z += (dz / d) * (r - d)
    }
  }
}

function BotsenMatch({ onBack, room, sessionId, joinCode, myNameProp, myColorProp }) {
  const canvasRef = useRef(null)
  const minimapRef = useRef(null)
  const [phase, setPhase] = useState('lobby')       // lobby | countdown | playing | gameover
  const [count, setCount] = useState(3)
  const [timeLeft, setTimeLeft] = useState(0)
  const [aliveCount, setAliveCount] = useState(0)
  const [myBalloons, setMyBalloons] = useState(3)
  const [amAlive, setAmAlive] = useState(true)
  const [amStunned, setAmStunned] = useState(false)
  const [heldItem, setHeldItem] = useState('')
  const [heldCount, setHeldCount] = useState(0)
  const [winnerName, setWinnerName] = useState('')
  const [players, setPlayers] = useState([])
  const [botDiff, setBotDiff] = useState('normaal')
  const stateRef = useRef({})
  const useItemRef = useRef(() => {})

  const startMatch = () => { room.send('start') }

  useEffect(() => {
    const canvas = canvasRef.current
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
    const scene = new Scene(engine)

    const hemi = new HemisphericLight('h', new Vector3(0, 1, 0), scene)
    hemi.intensity = 0.9
    const sun = new DirectionalLight('s', new Vector3(-0.4, -1, -0.3), scene)
    sun.position = new Vector3(30, 50, 20); sun.intensity = 1.05
    const sg = new ShadowGenerator(1024, sun); sg.useBlurExponentialShadowMap = true

    const arena = buildArena(scene, sg)
    const fireTex = makeFireTexture(scene)

    // ── Eigen kart + avatar ──
    // "outer" = positie/richting voor besturing + camera (blijft stabiel).
    // "kartRoot" (kind) = puur visueel; tolt los tijdens een treffer zonder
    // dat de camera meedraait — je scherm blijft dus rustig, alleen je
    // autootje met poppetje tolt even rond.
    // room.state.players kan bij mount nog leeg zijn (de eerste server-sync
    // komt soms een fractie later dan de join-belofte) — voor je EIGEN kart
    // gebruiken we daarom wat je net zelf in de lobby koos, niet wat we
    // terug proberen te lezen uit de (mogelijk nog lege) server-state.
    const myP = room.state.players?.get(sessionId)
    const myColor = myColorProp || myP?.color || KART_COLORS[(myP?.grid ?? 0) % KART_COLORS.length]
    const outer = new TransformNode('outerMe', scene)
    outer.position.set(myP?.x ?? 0, heightAt(myP?.x ?? 0, myP?.z ?? 0), myP?.z ?? 0)
    outer.rotation.y = myP?.rotY ?? 0
    const { root: kartRoot, wheels } = buildKart(scene, myColor, 'me')
    kartRoot.parent = outer
    const myBalloonMeshes = buildBalloons(scene, 'me')
    myBalloonMeshes.forEach(b => { b.parent = kartRoot })
    const myNameTag = makeNameTag(scene, myNameProp || myP?.name)
    myNameTag.parent = outer

    const cam = new FollowCamera('cam', new Vector3(0, 6, -12), scene)
    cam.lockedTarget = outer
    cam.radius = 9; cam.heightOffset = 3.4; cam.rotationOffset = 180
    cam.cameraAcceleration = 0.06; cam.maxCameraSpeed = 40

    // ── Subtiele beeldkwaliteit-boost: zachte gloed op felle kleuren +
    //    net iets scherpere randen, zonder de speelse look te overdrijven ──
    const pipeline = new DefaultRenderingPipeline('bpipeline', true, scene, [cam])
    pipeline.fxaaEnabled = true
    pipeline.bloomEnabled = true
    pipeline.bloomThreshold = 0.7; pipeline.bloomWeight = 0.35; pipeline.bloomKernel = 48
    pipeline.sharpenEnabled = true
    pipeline.sharpen.edgeAmount = 0.25
    pipeline.imageProcessing.contrast = 1.08
    pipeline.imageProcessing.exposure = 1.05

    // ── Slip-vonken (Shift + sturen): puur visuele feedback tijdens het driften ──
    const driftPs = new ParticleSystem('driftPs', 60, scene)
    driftPs.particleTexture = fireTex
    driftPs.emitter = outer
    driftPs.minEmitBox = new Vector3(-0.6, -0.2, -1.6); driftPs.maxEmitBox = new Vector3(0.6, 0.1, -1.2)
    driftPs.color1 = new Color4(0.65, 0.85, 1, 0.9); driftPs.color2 = new Color4(1, 1, 1, 0.7)
    driftPs.colorDead = new Color4(0.4, 0.6, 1, 0)
    driftPs.minSize = 0.14; driftPs.maxSize = 0.32
    driftPs.minLifeTime = 0.15; driftPs.maxLifeTime = 0.3
    driftPs.emitRate = 0
    driftPs.blendMode = ParticleSystem.BLENDMODE_ADD
    driftPs.direction1 = new Vector3(-0.3, 0.2, -0.3); driftPs.direction2 = new Vector3(0.3, 0.6, 0.3)
    driftPs.minEmitPower = 0.5; driftPs.maxEmitPower = 1.2
    driftPs.start()

    loadAvatar(scene, localStorage.getItem('kk_shirt') || '', safeJSON(localStorage.getItem('kk_wearing')), (av) => {
      av.parent = kartRoot
      av.position.set(0, AV_Y, AV_Z)
      av.rotation = new Vector3(0, Math.PI, 0)
      av.getChildMeshes?.(false).forEach(m => sg.addShadowCaster(m))
    })

    // ── Remote karts (ook outer/visual gesplitst, voor dezelfde tol-animatie) ──
    const remotes = new Map()
    const makeRemote = (sid, p) => {
      const col = p.color || KART_COLORS[(p.grid ?? 0) % KART_COLORS.length]
      const outerR = new TransformNode('outer_r' + sid, scene)
      outerR.position.set(p.x || 0, heightAt(p.x || 0, p.z || 0), p.z || 0)
      outerR.rotation.y = p.rotY || 0
      const built = buildKart(scene, col, 'r' + sid)
      built.root.parent = outerR
      const balloons = buildBalloons(scene, 'r' + sid)
      balloons.forEach(b => { b.parent = built.root })
      const nameTag = makeNameTag(scene, p.name)
      nameTag.parent = outerR
      const ent = { outer: outerR, visual: built.root, wheels: built.wheels, balloons, tx: outerR.position.x, tz: outerR.position.z, trot: outerR.rotation.y, tvel: 0, lastBalloons: 3, lastHitSeq: p.hitSeq ?? 0 }
      loadAvatar(scene, p.shirt || '', safeJSON(p.wearing), (av) => {
        av.parent = built.root; av.position.set(0, AV_Y, AV_Z); av.rotation = new Vector3(0, Math.PI, 0)
        av.getChildMeshes?.(false).forEach(m => sg.addShadowCaster(m))
      })
      remotes.set(sid, ent)
    }

    // ── Projectielen, bommen, item-boxen ──
    const shellMeshes = new Map()
    const bombMeshes = new Map()
    const itemBoxMeshes = new Map()
    const useItem = () => { room.send('useItem') }
    useItemRef.current = useItem

    // ── Input (WASD én pijltjes rijden, spatie schiet) ──
    const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'])
    const keys = {}
    const kd = e => {
      const k = e.key.toLowerCase()
      keys[k] = true
      if (MOVE_KEYS.has(k)) e.preventDefault()
      if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); useItemRef.current() }
    }
    const ku = e => { keys[e.key.toLowerCase()] = false }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    // ── Physics (rustiger tempo dan Karten — dit is bots-en-botsen, geen race) ──
    const phys = {
      vel: 0, maxSpeed: 19, accel: 17, brakeForce: 22, friction: 11,
      turnSpeed: 2.1, heading: myP?.rotY ?? 0, sendAcc: 0,
      drifting: false, driftPower: 0, boostTime: 0,
    }
    stateRef.current = { phys, scene }

    // ── Fase / sync ──
    let lastPhase = room.state.phase
    // room.state.players kan bij mount nog leeg zijn (de eerste server-sync
    // komt soms een fractie later dan de join-belofte) — daarom zet de kart
    // hierboven voorlopig op (0,0,0). Zodra de échte server-positie binnen
    // is, snappen we outer/heading er ÉÉN keer naartoe, zodat je niet
    // midden op de kaart blijft staan i.p.v. op je toegewezen spawn-plek.
    let spawnedFromServer = false
    const sync = (state) => {
      const arr = []
      state.players?.forEach((p, sid) => arr.push({ sid, name: p.name, me: sid === sessionId, bot: p.isBot }))
      setPlayers(arr)
      setCount(state.countdown)
      setTimeLeft(Math.max(0, Math.ceil(state.timeLeft ?? 0)))
      let alive = 0
      state.players?.forEach(p => { if (p.alive) alive++ })
      setAliveCount(alive)
      const me = state.players?.get(sessionId)
      if (me) {
        setMyBalloons(me.balloons); setAmAlive(me.alive); setHeldItem(me.item); setHeldCount(me.itemCount)
        if (!spawnedFromServer) {
          spawnedFromServer = true
          outer.position.set(me.x, heightAt(me.x, me.z), me.z)
          outer.rotation.y = me.rotY
          phys.heading = me.rotY
        }
      }
      if (state.phase !== lastPhase) {
        lastPhase = state.phase
        setPhase(state.phase)
        if (state.phase === 'gameover') setWinnerName(state.winnerName || '')
      }
    }
    sync(room.state)
    room.onStateChange(sync)

    // ── Bom-explosies: server stuurt een los bericht zodra een bom afgaat,
    //    zodat we een lichtflits + schade-straal-ring kunnen tonen. ──
    const explosions = []
    room.onMessage('bombBoom', (msg) => {
      explosions.push(makeExplosion(scene, msg.x, heightAt(msg.x, msg.z) + 0.2, msg.z, msg.r, fireTex))
    })

    // ── Render/physics-loop ──
    let lastT = performance.now()
    engine.runRenderLoop(() => {
      const now = performance.now()
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now

      // Remote karts bijwerken
      room.state.players?.forEach((p, sid) => {
        if (sid === sessionId) return
        let e = remotes.get(sid)
        if (!e) { makeRemote(sid, p); e = remotes.get(sid) }
        e.tx = p.x; e.tz = p.z; e.trot = p.rotY; e.tvel = p.vel; e.stunTime = p.stunTime
        if (p.balloons !== e.lastBalloons) { setBalloons(e.balloons, p.balloons); e.lastBalloons = p.balloons }
        e.outer.setEnabled(p.alive)
      })
      for (const sid of [...remotes.keys()]) {
        if (!room.state.players?.get(sid)) { remotes.get(sid).outer.dispose(); remotes.delete(sid) }
      }
      const k = Math.min(1, dt * 12)
      remotes.forEach(e => {
        e.outer.position.x += (e.tx - e.outer.position.x) * k
        e.outer.position.z += (e.tz - e.outer.position.z) * k
        // Vloeiend naar de doelhoogte i.p.v. snappen — zo ziet een val van een
        // rand (bv. naast een brug) eruit als een val, niet als een glitch.
        const targetYr = heightAt(e.outer.position.x, e.outer.position.z)
        e.outer.position.y += (targetYr - e.outer.position.y) * Math.min(1, dt * 9)
        let dr = e.trot - e.outer.rotation.y
        while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2
        e.outer.rotation.y += dr * k
        e.wheels.forEach(w => { w.rotation.x += e.tvel * dt * 3 })
        // Tol-animatie + knipperende onkwetsbaarheid, los van de (stabiele) outer-rotatie
        if (e.stunTime > 0) {
          e.visual.rotation.y += 16 * dt
          const blink = Math.floor(now / 90) % 2 === 0
          e.visual.getChildMeshes(false).forEach(m => { m.visibility = blink ? 1 : 0.35 })
        } else if (e.visual.rotation.y !== 0) {
          e.visual.rotation.y = 0
          e.visual.getChildMeshes(false).forEach(m => { m.visibility = 1 })
        }
      })

      const playing = room.state.phase === 'playing'
      const meNow = room.state.players?.get(sessionId)
      if (meNow && meNow.balloons !== stateRef.current.lastMyBalloons) {
        setBalloons(myBalloonMeshes, meNow.balloons); stateRef.current.lastMyBalloons = meNow.balloons
      }
      const stunned = (meNow?.stunTime ?? 0) > 0
      setAmStunned(stunned)

      if (stunned) {
        // Getroffen: even geen besturing, autootje+poppetje tolt los rond
        // (de camera/outer staat stil — je scherm blijft dus rustig) en je
        // knippert als teken dat je nu onkwetsbaar bent.
        phys.vel = 0
        kartRoot.rotation.y += 16 * dt
        const blink = Math.floor(now / 90) % 2 === 0
        kartRoot.getChildMeshes(false).forEach(m => { m.visibility = blink ? 1 : 0.35 })
      } else if (kartRoot.rotation.y !== 0) {
        kartRoot.rotation.y = 0
        kartRoot.getChildMeshes(false).forEach(m => { m.visibility = 1 })
      }

      if (playing && meNow?.alive && !stunned) {
        const gas   = keys['w'] || keys['arrowup']
        const brake = keys['s'] || keys['arrowdown']
        const left  = keys['a'] || keys['arrowleft']
        const right = keys['d'] || keys['arrowright']
        const driftKey = keys['shift']

        if (gas)        phys.vel += phys.accel * dt
        else if (brake) phys.vel -= phys.brakeForce * dt
        else { const f = phys.friction * dt; phys.vel = phys.vel > 0 ? Math.max(0, phys.vel - f) : Math.min(0, phys.vel + f) }

        // Slippen (Shift + sturen, met genoeg vaart): scherpere bocht, bouwt
        // een boost op. Loslaten (of stoppen met sturen) geeft een korte
        // snelheidsboost als er genoeg is opgebouwd — mini-turbo-gevoel.
        const steer = (right ? 1 : 0) - (left ? 1 : 0)
        const canDrift = driftKey && steer !== 0 && Math.abs(phys.vel) > phys.maxSpeed * 0.45
        if (canDrift) {
          phys.drifting = true
          phys.driftPower = Math.min(1.4, phys.driftPower + dt)
          phys.heading += steer * phys.turnSpeed * 1.8 * dt
        } else {
          if (phys.drifting) {
            if (phys.driftPower > 0.35) phys.boostTime = 0.8
            phys.drifting = false; phys.driftPower = 0
          }
          phys.heading += steer * phys.turnSpeed * dt
        }
        driftPs.emitRate = canDrift ? 90 : 0
        outer.rotation.y = phys.heading

        let capSpeed = phys.maxSpeed
        if (phys.boostTime > 0) {
          capSpeed = phys.maxSpeed * 1.45
          phys.vel = Math.max(phys.vel, capSpeed * 0.92)
          phys.boostTime = Math.max(0, phys.boostTime - dt)
        }
        phys.vel = Math.max(-phys.maxSpeed * 0.4, Math.min(capSpeed, phys.vel))

        const fwd = new Vector3(Math.sin(phys.heading), 0, Math.cos(phys.heading))
        outer.position.addInPlace(fwd.scale(phys.vel * dt))

        // Arena-grenzen + obstakels
        collideBoxes(outer.position, CAR_RADIUS, arena.boxes)
        // Vloeiend naar de doelhoogte i.p.v. snappen — zo ziet een val van een
        // rand (bv. naast een brug) eruit als een val, niet als een glitch.
        const targetY = heightAt(outer.position.x, outer.position.z)
        outer.position.y += (targetY - outer.position.y) * Math.min(1, dt * 9)

        // Botsing met andere karts (beuken)
        remotes.forEach(e => {
          if (!e.outer.isEnabled()) return
          let dx = outer.position.x - e.outer.position.x
          let dz = outer.position.z - e.outer.position.z
          const d = Math.hypot(dx, dz), BUMP = 1.6 * 2
          if (d > 0.001 && d < BUMP) {
            const overlap = BUMP - d
            dx /= d; dz /= d
            outer.position.x += dx * overlap * 0.5
            outer.position.z += dz * overlap * 0.5
            phys.vel *= 0.7
          }
        })

        wheels.forEach(w => { w.rotation.x += phys.vel * dt * 3 })

        phys.sendAcc += dt
        if (phys.sendAcc >= 0.04) {
          phys.sendAcc = 0
          room.send('state', { x: outer.position.x, z: outer.position.z, rotY: phys.heading, vel: phys.vel })
        }
      } else {
        driftPs.emitRate = 0
      }

      // Schilden/vuurtjes syncen + draaien
      room.state.shells?.forEach((s, id) => {
        let m = shellMeshes.get(id)
        if (!m) { m = makeShellMesh(scene, s.kind, fireTex); shellMeshes.set(id, m) }
        m.position.set(s.x, heightAt(s.x, s.z) + 0.6, s.z); m.rotation.y += dt * 8
      })
      for (const id of [...shellMeshes.keys()]) {
        if (!room.state.shells?.get(id)) { disposeShellMesh(shellMeshes.get(id)); shellMeshes.delete(id) }
      }
      // Bommen syncen (lont knippert sneller naarmate hij korter wordt — hier simpel: schalen)
      room.state.bombs?.forEach((b, id) => {
        let m = bombMeshes.get(id)
        if (!m) { m = makeBombMesh(scene); bombMeshes.set(id, m) }
        m.position.set(b.x, heightAt(b.x, b.z) + 0.55, b.z)
        const pulse = 1 + Math.sin(now / 90) * 0.08
        m.scaling.setAll(pulse)
      })
      for (const id of [...bombMeshes.keys()]) {
        if (!room.state.bombs?.get(id)) { bombMeshes.get(id).dispose(); bombMeshes.delete(id) }
      }
      // Item-boxen syncen (zichtbaarheid via active, respawn op de server)
      room.state.boxes?.forEach((box, i) => {
        let m = itemBoxMeshes.get(i)
        if (!m) { m = makeItemBox(scene, box.x, box.z); itemBoxMeshes.set(i, m) }
        m.rotation.y += dt * 1.8
        m.position.y = heightAt(box.x, box.z) + 1.05 + Math.sin(now / 400 + i) * 0.15
        m.setEnabled(box.active)
      })

      // Bom-explosies: ring laten uitdijen tot de schade-straal, dan opruimen
      for (let i = explosions.length - 1; i >= 0; i--) {
        if (stepExplosion(explosions[i], dt)) { disposeExplosion(explosions[i]); explosions.splice(i, 1) }
      }

      // Minimap: "heading-up" — mijn pijl staat altijd vast rechtop (dat ben
      // ik, ik kijk omhoog op de kaart) en de tegenstanders draaien om mij
      // heen mee met mijn rijrichting, i.p.v. andersom.
      const mm = minimapRef.current
      if (mm) {
        const mctx = mm.getContext('2d')
        const S = mm.width, R = S / 2, RANGE = 60
        mctx.clearRect(0, 0, S, S)
        mctx.fillStyle = 'rgba(10,10,20,0.55)'
        mctx.beginPath(); mctx.arc(R, R, R - 2, 0, Math.PI * 2); mctx.fill()
        mctx.strokeStyle = 'rgba(255,255,255,0.35)'; mctx.lineWidth = 2
        mctx.beginPath(); mctx.arc(R, R, R - 2, 0, Math.PI * 2); mctx.stroke()
        // Mijn eigen kijkrichting als lokaal assenstelsel: "voor" en "rechts".
        const fxv = Math.sin(outer.rotation.y), fzv = Math.cos(outer.rotation.y)
        const rxv = fzv, rzv = -fxv
        room.state.players?.forEach((p, sid) => {
          if (sid === sessionId || !p.alive) return
          const dx = p.x - outer.position.x, dz = p.z - outer.position.z
          const lf = dx * fxv + dz * fzv   // hoe ver vóór mij
          const lr = dx * rxv + dz * rzv   // hoe ver rechts van mij
          const d = Math.hypot(lf, lr) || 0.0001
          const clamped = Math.min(d, RANGE) * ((R - 8) / RANGE)
          const mx = R + (lr / d) * clamped
          const my = R - (lf / d) * clamped   // "vóór mij" = omhoog op de kaart
          mctx.fillStyle = p.isBot ? '#ff8a3d' : '#ff4d6d'
          mctx.beginPath(); mctx.arc(mx, my, 5, 0, Math.PI * 2); mctx.fill()
          mctx.strokeStyle = 'rgba(0,0,0,0.5)'; mctx.lineWidth = 1; mctx.stroke()
        })
        // eigen kart: vaste pijl, wijst altijd recht omhoog (jij kijkt altijd "boven" op de kaart)
        mctx.fillStyle = '#4dd2ff'
        mctx.beginPath(); mctx.moveTo(R, R - 7); mctx.lineTo(R + 5, R + 6); mctx.lineTo(R - 5, R + 6); mctx.closePath(); mctx.fill()
      }

      scene.render()
    })

    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      window.removeEventListener('resize', onResize)
      scene.dispose(); engine.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="botsen-wrap">
      <OrientationGate />
      <canvas ref={canvasRef} className="botsen-canvas" />
      <button className="botsen-exit" onClick={onBack}>← Verlaten</button>

      {phase === 'lobby' && (
        <div className="botsen-lobby-wait">
          <h1>💥 Wachtkamer</h1>
          {joinCode && <p className="botsen-lobby-code">Code: <strong>{joinCode}</strong></p>}
          <p>Deel de code en wacht tot iedereen er is.</p>
          <ul className="botsen-lobby-list">
            {players.map(p => <li key={p.sid} className={p.me ? 'me' : ''}>{p.me ? '⭐ ' : (p.bot ? '🤖 ' : '💥 ')}{p.name}</li>)}
          </ul>
          <div className="botsen-bot-row">
            <button className="botsen-bot-btn" onClick={() => room.send('addBot', botDiff)}>🤖 Bot erbij</button>
            <button className="botsen-bot-btn" onClick={() => room.send('removeBot')}>➖ Bot eraf</button>
          </div>
          <button className="botsen-start-btn" onClick={startMatch}>Start! ({players.length})</button>
        </div>
      )}

      {phase !== 'lobby' && phase !== 'gameover' && (
        <div className="botsen-hud">
          <div className="botsen-hud-time">⏱ {timeLeft}s</div>
          <div className="botsen-hud-alive">{aliveCount} over</div>
          <div className="botsen-hud-balloons">
            {[0, 1, 2].map(i => <span key={i} className={i < myBalloons ? '' : 'popped'}>🎈</span>)}
          </div>
          <canvas ref={minimapRef} className="botsen-minimap" width={140} height={140} />
        </div>
      )}

      {phase === 'playing' && amStunned && (
        <div className="botsen-stunned">😵 Tollen… even onkwetsbaar!</div>
      )}

      {phase === 'countdown' && <div className="botsen-count">{count > 0 ? count : 'GO!'}</div>}

      {phase === 'playing' && amAlive && (
        <button
          className={'botsen-item-btn' + (heldItem ? ' has-item' : '')}
          onClick={() => useItemRef.current()}
          disabled={!heldItem}
        >
          <span className="botsen-item-emoji">{heldItem ? ITEM_INFO[heldItem]?.emoji : '❔'}</span>
          <span className="botsen-item-label">{heldItem ? ITEM_INFO[heldItem]?.label : 'Geen item'}</span>
          {heldItem && <span className="botsen-item-count">×{heldCount}</span>}
        </button>
      )}

      {phase === 'playing' && !amAlive && (
        <div className="botsen-out">💥 Uitgeschakeld — kijk toe tot het einde!</div>
      )}

      {phase === 'gameover' && (
        <div className="botsen-finish">
          <h1>🏆 Einde!</h1>
          <p>{winnerName ? `${winnerName} wint!` : 'Gelijkspel!'}</p>
          <div className="botsen-finish-btns">
            <button onClick={onBack}>👕 Kledingkast</button>
          </div>
        </div>
      )}

      <div className="botsen-help">W/↑ gas · S/↓ rem · A/← D/→ sturen · spatie = item gebruiken · pak de ❔-blokken!</div>
    </div>
  )
}

// ── Menu + lobby-connect (zelfde server als Karten/Voetbal/Paintball) ───
export default function BotsenGame({ onBack }) {
  const [screen, setScreen] = useState('menu')   // menu | lobby | match
  const [room, setRoom] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [joinCode, setJoinCode] = useState(null)
  const [myName, setMyName] = useState('')
  const [myColor, setMyColor] = useState('')

  if (screen === 'match' && room) {
    return <BotsenMatch onBack={() => { try { room.leave() } catch {} ; setRoom(null); setScreen('menu') }} room={room} sessionId={sessionId} joinCode={joinCode} myNameProp={myName} myColorProp={myColor} />
  }

  if (screen === 'lobby') {
    return <BotsenLobby
      onBack={() => setScreen('menu')}
      onJoined={(r, jc, name, color) => { setRoom(r); setSessionId(r.sessionId); setJoinCode(jc); setMyName(name); setMyColor(color); setScreen('match') }}
    />
  }

  return (
    <div className="botsen-menu">
      <button className="botsen-exit" onClick={onBack}>← Kledingkast</button>
      <div className="botsen-menu-box">
        <div className="botsen-menu-icon">💥</div>
        <h1 className="botsen-menu-title">Botsen</h1>
        <p className="botsen-menu-sub">Ballon-gevecht in de arena — laatste kart wint!</p>
        <button className="botsen-menu-btn online" onClick={() => setScreen('lobby')}>🌍 Online — knal ballonnen (of tegen bots)</button>
      </div>
    </div>
  )
}

function BotsenLobby({ onBack, onJoined }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState(() => localStorage.getItem('kk_playername') || '')
  const [color, setColor] = useState(() => localStorage.getItem('kk_botsen_color') || KART_COLORS[0])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const connect = async (create) => {
    setLoading(true); setError(null)
    try {
      const shirt = localStorage.getItem('kk_shirt') || ''
      const wearing = localStorage.getItem('kk_wearing') || '{}'
      const client = new Colyseus.Client(SERVER_URL)
      const joinCode = create ? String(Math.floor(1000 + Math.random() * 9000)) : code.trim()
      const opts = { joinCode, shirt, wearing, name: name || 'Speler', color }
      const room = create ? await client.create(ROOM_TYPE, opts) : await client.join(ROOM_TYPE, opts)
      if (name) localStorage.setItem('kk_playername', name)
      localStorage.setItem('kk_botsen_color', color)
      onJoined(room, joinCode, name || 'Speler', color)
    } catch { setError(create ? 'Kan geen potje aanmaken.' : 'Potje niet gevonden.'); setLoading(false) }
  }

  return (
    <div className="botsen-menu">
      <button className="botsen-exit" onClick={onBack}>← Terug</button>
      <div className="botsen-menu-box">
        <div className="botsen-menu-icon">🌍</div>
        <h1 className="botsen-menu-title">Online botsen</h1>
        <div className="botsen-lobby-field">
          <label>Jouw naam</label>
          <input className="botsen-input" placeholder="Speler" value={name} maxLength={12} onChange={e => setName(e.target.value)} />
        </div>
        <div className="botsen-lobby-field">
          <label>Kart-kleur</label>
          <div className="botsen-color-row">
            {KART_COLORS.map(c => (
              <button key={c} type="button" className={'botsen-color-swatch' + (c === color ? ' on' : '')}
                style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
            ))}
          </div>
        </div>
        <button className="botsen-menu-btn online" disabled={loading} onClick={() => connect(true)}>➕ Nieuw potje (maak code)</button>
        <div className="botsen-lobby-field">
          <label>Of join met code</label>
          <input className="botsen-input" placeholder="bv. 1234" value={code} maxLength={6} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
        </div>
        <button className="botsen-menu-btn solo" disabled={loading || code.trim().length < 1} onClick={() => connect(false)}>🔑 Join potje</button>
        {error && <p className="botsen-lobby-err">{error}</p>}
        {loading && <p className="botsen-lobby-info">Verbinden…</p>}
      </div>
    </div>
  )
}
