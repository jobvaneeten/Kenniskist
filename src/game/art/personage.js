// Characters. De onderdelen (kop, romp, arm, been, oren) staan als pixeldata in
// dit bestand; een rig zet ze bij het opstarten samen tot complete animaties en
// bakt die naar offscreen canvases.
//
// Waarom een rig en niet elke frame met de hand: 12 characters × 10 animaties ×
// 4-6 frames is ruim 400 frames van 24×28. Met de hand getekend zou dat óf
// maanden kosten óf twee frames per animatie worden — precies wat de opdracht
// verbiedt. Met onderdelen als pixeldata houdt elk character zijn eigen
// silhouet, palet en accessoire, en krijgt elke animatie echte frames.

import { Blad, nieuwCanvas, tekenPixels } from '../core/atlas.js'

export const FRAME_W = 24
export const FRAME_H = 28

// Waar de collisionbox zit binnen het frame. De voeten staan op y = 27.
export const BOX = { w: 10, h: 20, dx: 7, dy: 8 }

// --- Onderdelen ------------------------------------------------------------
// o = outline, h = highlight, m = midtone, s = shadow, w = oogwit, e = oog,
// a = accentkleur, . = transparant

const KOP = [
  '....oooooo....',
  '..oohhhhhhoo..',
  '.ohhhhhhhhhho.',
  'ohhhhmmmmhhhho',
  'ohhmmmmmmmmhho',
  'ohmwwmmmmwwmho',
  'ohmwemmmmewmho',
  'ohmmmmmmmmmmho',
  'ohmmmssssmmmho',
  '.ommmmssmmmmo.',
  '..oommmmmmoo..',
]

const ROMP = [
  '...ommmmmmo...',
  '...omaaaamo...',
  '...omaaaamo...',
  '...ommaammo...',
  '...osmmmmso...',
  '...oommmmoo...',
]

// Benen, 4×7. Drie poses; de linkerkant wordt gespiegeld getekend.
const BEEN = {
  recht: ['.oo.', 'omm.', 'omm.', 'omm.', 'osm.', 'oooo', '....'],
  voor: ['.oo.', 'omm.', 'omm.', '.omm', '.osm', '.ooo', '....'],
  achter: ['.oo.', 'omm.', 'omm.', 'mmo.', 'smo.', 'ooo.', '....'],
  gebogen: ['.oo.', 'omm.', 'omm.', 'oso.', 'oooo', '....', '....'],
  gespreid: ['.oo.', 'omm.', '.omm', '.osm', '..oo', '....', '....'],
}

// Armen, 3×7.
const ARM = {
  rust: ['oo.', 'om.', 'om.', 'om.', 'os.', 'oo.', '...'],
  voor: ['oo.', 'om.', 'om.', '.om', '.os', '.oo', '...'],
  achter: ['oo.', 'om.', 'mo.', 'so.', 'oo.', '...', '...'],
  omhoog: ['oo.', 'om.', 'om.', 'om.', 'om.', 'oo.', '...'],
  uit: ['...', 'ooo', 'omm', 'oss', 'ooo', '...', '...'],
}

// Oren en accessoires. Elk variant is pixeldata plus de plek waar hij op de kop
// landt; ze geven de characters hun silhouet.
const OREN = {
  antenne: { dx: 5, dy: -6, data: ['..oo..', '.oaao.', '..oo..', '..om..', '..om..', '..om..'] },
  lang: { dx: 0, dy: -7, data: ['.oo......oo.', 'omm......mmo', 'omm......mmo', 'omm......mmo', 'omm......mmo', '.om......mo.', '..o......o..'] },
  plaat: { dx: -2, dy: 2, data: ['oo........oo', 'omm......mmo', 'oma......amo', 'omm......mmo', 'oo........oo'] },
  hoorn: { dx: 1, dy: -5, data: ['.o........o.', 'oao......oao', 'oam......mao', '.om......mo.', '..o......o..'] },
  punt: { dx: 0, dy: -5, data: ['..o......o..', '.oao....oao.', '.omo....omo.', 'oom......moo', '.o........o.'] },
  kristal: { dx: 3, dy: -7, data: ['..oo..', '.oaao.', 'oaaaao', 'oahhao', '.oaao.', '..oo..', '..om..'] },
  vlam: { dx: 4, dy: -7, data: ['..oo..', '.oaao.', 'oahhao', 'oaaaao', '.oaao.', '..oo..', '......'] },
  ster: { dx: 3, dy: -7, data: ['..oo..', '.oaao.', 'oaaaao', '.oaao.', '.o..o.', '......', '......'] },
  nevel: { dx: 0, dy: -5, data: ['.o..o..o..o.', 'oao.oao.oao.', '.o..o..o..o.', '............', '............'] },
  kroon: { dx: 2, dy: -5, data: ['.o..o..o..o.', 'oao.oao.oao.', 'oaaaaaaaaao.', 'ooooooooooo.', '............'] },
}

function paletVan(k) {
  return { o: k.o, h: k.h, m: k.m, s: k.s, w: '#ffffff', e: k.oog, a: k.accent }
}

// --- Rig -------------------------------------------------------------------

// Eén frame: alles op hele pixels, geen transformaties behalve de squash die
// expliciet wordt meegegeven.
function bouwFrame(kleuren, vorm, pose) {
  const { canvas, ctx } = nieuwCanvas(FRAME_W, FRAME_H)
  const palet = paletVan(kleuren)
  const {
    bob = 0,           // verticale verplaatsing van kop + romp
    kanteling = 0,     // horizontale verplaatsing van de kop t.o.v. de romp
    beenL = 'recht',
    beenR = 'recht',
    beenLdy = 0,
    beenRdy = 0,
    armL = 'rust',
    armR = 'rust',
    armLdy = 0,
    armRdy = 0,
    ogen = 'open',
  } = pose

  const kopX = 5
  const kopY = 6 + bob
  const rompY = kopY + KOP.length
  const heupY = rompY + ROMP.length

  // Oren zitten achter de kop zodat ze niet over het gezicht vallen.
  const oor = OREN[vorm.oren]
  if (oor) tekenPixels(ctx, oor.data, palet, kopX + oor.dx, kopY + oor.dy)

  // Armen achter de romp.
  tekenPixels(ctx, ARM[armL], palet, kopX + 1, rompY + 1 + armLdy)
  tekenPixels(ctx, KOP, palet, kopX + kanteling, kopY)
  tekenPixels(ctx, ROMP, palet, kopX, rompY)
  tekenPixels(ctx, ARM[armR], palet, kopX + 10, rompY + 1 + armRdy)

  // Benen: rechts normaal, links gespiegeld zodat de voeten naar buiten wijzen.
  tekenPixels(ctx, spiegel(BEEN[beenL]), palet, kopX + 3, heupY - 1 + beenLdy)
  tekenPixels(ctx, BEEN[beenR], palet, kopX + 7, heupY - 1 + beenRdy)

  if (ogen === 'dicht') {
    ctx.fillStyle = kleuren.o
    ctx.fillRect(kopX + 3 + kanteling, kopY + 6, 2, 1)
    ctx.fillRect(kopX + 9 + kanteling, kopY + 6, 2, 1)
  } else if (ogen === 'kruis') {
    ctx.fillStyle = kleuren.o
    for (const ox of [3, 9]) {
      ctx.fillRect(kopX + ox + kanteling, kopY + 5, 1, 1)
      ctx.fillRect(kopX + ox + 1 + kanteling, kopY + 6, 1, 1)
      ctx.fillRect(kopX + ox + 1 + kanteling, kopY + 5, 1, 1)
      ctx.fillRect(kopX + ox + kanteling, kopY + 6, 1, 1)
    }
  }

  return canvas
}

function spiegel(data) {
  return data.map((r) => [...r].reverse().join(''))
}

// Nearest-neighbour squash. Alleen bij het bakken, nooit tijdens het tekenen.
function persen(bron, schaalX, schaalY) {
  const { canvas, ctx } = nieuwCanvas(FRAME_W, FRAME_H)
  const w = Math.round(FRAME_W * schaalX)
  const h = Math.round(FRAME_H * schaalY)
  ctx.drawImage(bron, Math.round((FRAME_W - w) / 2), FRAME_H - h, w, h)
  return canvas
}

// --- Animaties -------------------------------------------------------------

const ANIMATIES = {
  idle: { fps: 6, poses: [
    { bob: 0, armL: 'rust', armR: 'rust' },
    { bob: -1, armL: 'rust', armR: 'rust', armLdy: -1, armRdy: -1 },
    { bob: 0, armL: 'rust', armR: 'rust' },
    { bob: 1, armL: 'rust', armR: 'rust', armLdy: 1, armRdy: 1, ogen: 'dicht' },
  ] },
  lopen: { fps: 10, poses: [
    { bob: 0, beenL: 'voor', beenR: 'achter', armL: 'achter', armR: 'voor' },
    { bob: -1, beenL: 'recht', beenR: 'recht', armL: 'rust', armR: 'rust' },
    { bob: 0, beenL: 'achter', beenR: 'voor', armL: 'voor', armR: 'achter' },
    { bob: -1, beenL: 'recht', beenR: 'recht', armL: 'rust', armR: 'rust' },
    { bob: 0, beenL: 'voor', beenR: 'achter', armL: 'achter', armR: 'voor' },
    { bob: -1, beenL: 'recht', beenR: 'recht', armL: 'rust', armR: 'rust' },
  ] },
  rennen: { fps: 14, poses: [
    { bob: 0, kanteling: 1, beenL: 'voor', beenR: 'achter', armL: 'achter', armR: 'voor', armLdy: -1 },
    { bob: -2, kanteling: 1, beenL: 'gebogen', beenR: 'recht', armL: 'rust', armR: 'omhoog', armRdy: -1 },
    { bob: 0, kanteling: 1, beenL: 'achter', beenR: 'voor', armL: 'voor', armR: 'achter', armRdy: -1 },
    { bob: -2, kanteling: 1, beenL: 'recht', beenR: 'gebogen', armL: 'omhoog', armR: 'rust', armLdy: -1 },
    { bob: 0, kanteling: 1, beenL: 'voor', beenR: 'achter', armL: 'achter', armR: 'voor', armLdy: -1 },
    { bob: -2, kanteling: 1, beenL: 'gebogen', beenR: 'recht', armL: 'rust', armR: 'omhoog', armRdy: -1 },
  ] },
  springen: { fps: 1, poses: [
    { bob: -1, beenL: 'gebogen', beenR: 'gebogen', armL: 'omhoog', armR: 'omhoog', armLdy: -2, armRdy: -2 },
  ] },
  vallen: { fps: 1, poses: [
    { bob: 0, beenL: 'gespreid', beenR: 'gespreid', armL: 'uit', armR: 'uit', armLdy: -1, armRdy: -1 },
  ] },
  landen: { fps: 14, poses: [
    { bob: 2, beenL: 'gebogen', beenR: 'gebogen', armL: 'uit', armR: 'uit', squash: [1.18, 0.84] },
    { bob: 1, beenL: 'gebogen', beenR: 'gebogen', armL: 'rust', armR: 'rust', squash: [1.06, 0.95] },
  ] },
  geraakt: { fps: 1, poses: [
    { bob: 1, kanteling: -1, beenL: 'gespreid', beenR: 'gespreid', armL: 'uit', armR: 'uit', ogen: 'kruis' },
  ] },
  dood: { fps: 8, poses: [
    { bob: -2, beenL: 'gebogen', beenR: 'gebogen', armL: 'omhoog', armR: 'omhoog', ogen: 'kruis', squash: [0.9, 1.14] },
    { bob: -1, beenL: 'gespreid', beenR: 'gespreid', armL: 'uit', armR: 'uit', ogen: 'kruis' },
    { bob: 0, beenL: 'gespreid', beenR: 'gespreid', armL: 'uit', armR: 'uit', ogen: 'kruis', squash: [1.1, 0.9] },
    { bob: 1, beenL: 'recht', beenR: 'recht', armL: 'uit', armR: 'uit', ogen: 'kruis', squash: [1.2, 0.8] },
  ] },
  winnen: { fps: 8, poses: [
    { bob: 0, armL: 'omhoog', armR: 'omhoog', armLdy: -2, armRdy: -2 },
    { bob: -3, beenL: 'gebogen', beenR: 'gebogen', armL: 'omhoog', armR: 'omhoog', armLdy: -3, armRdy: -3 },
    { bob: 0, armL: 'omhoog', armR: 'omhoog', armLdy: -2, armRdy: -2 },
    { bob: 1, beenL: 'gebogen', beenR: 'gebogen', armL: 'rust', armR: 'rust', squash: [1.1, 0.92] },
  ] },
  // Kleiner loopje voor de wereldkaart: rustiger cadans, geen kanteling.
  kaart: { fps: 8, poses: [
    { bob: 0, beenL: 'voor', beenR: 'achter', armL: 'achter', armR: 'voor' },
    { bob: -1, beenL: 'recht', beenR: 'recht', armL: 'rust', armR: 'rust' },
    { bob: 0, beenL: 'achter', beenR: 'voor', armL: 'voor', armR: 'achter' },
    { bob: -1, beenL: 'recht', beenR: 'recht', armL: 'rust', armR: 'rust' },
  ] },
}

const cache = new Map()

export function bakCharacter(char) {
  if (cache.has(char.id)) return cache.get(char.id)

  const animaties = {}
  for (const [naam, def] of Object.entries(ANIMATIES)) {
    const blad = new Blad(FRAME_W, FRAME_H, def.poses.length)
    def.poses.forEach((pose, i) => {
      let frame = bouwFrame(char.kleuren, char.vorm, pose)
      if (pose.squash) frame = persen(frame, pose.squash[0], pose.squash[1])
      blad.ctx.drawImage(frame, i * FRAME_W, 0)
    })
    animaties[naam] = { blad, fps: def.fps, aantal: def.poses.length }
  }

  const uit = { id: char.id, animaties, box: BOX }
  cache.set(char.id, uit)
  return uit
}

// Silhouet voor vergrendelde characters in de winkel.
export function bakSilhouet(char) {
  const gebakken = bakCharacter(char)
  const bron = gebakken.animaties.idle.blad
  const { canvas, ctx } = nieuwCanvas(FRAME_W, FRAME_H)
  ctx.drawImage(bron.canvas, 0, 0, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H)
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = '#2a1f4a'
  ctx.fillRect(0, 0, FRAME_W, FRAME_H)
  return canvas
}

// Speelt een animatie af: geeft het framenummer bij een tijdstip in seconden.
export function frameVan(anim, tijd, herhaal = true) {
  const n = Math.floor(tijd * anim.fps)
  if (!herhaal) return Math.min(n, anim.aantal - 1)
  return n % anim.aantal
}
