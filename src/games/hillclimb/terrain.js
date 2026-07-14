// Procedureel, deterministisch heuvel-terrein voor Hill Climb.
// Het terrein wordt beschreven door een pure hoogtefunctie van x (geen opslag
// nodig) zodat chunks ver weg simpelweg opnieuw berekend/verwijderd kunnen
// worden. Botsing = een ketting van kleine, schuine Matter-rechthoeken langs
// het oppervlak. Het uiterlijk wordt programmatisch getekend (grondvlak +
// oppervlakte-strip + spikkels) in de kleuren van het level.

export const SEGMENT_LEN = 24
export const CHUNK_SEGMENTS = 34          // ≈ 816px per chunk
export const CHUNK_WIDTH = SEGMENT_LEN * CHUNK_SEGMENTS
export const SLAB_THICK = 46
export const WORLD_BASE_Y = 480           // referentiehoogte (y=0-lijn van het terrein)

function seedFromId(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

function hash(n, seed) {
  const s = Math.sin(n * 127.1 + seed * 0.0311 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

function noise1D(x, seed) {
  const xi = Math.floor(x), xf = x - xi
  const a = hash(xi, seed), b = hash(xi + 1, seed)
  const t = xf * xf * (3 - 2 * xf)
  return a + (b - a) * t
}

// Hoogte (wereld-y van het grondoppervlak) op positie x. Start vlak (ramp)
// en wordt geleidelijk ruiger naarmate x groeit, tot een plafond.
export function heightAt(level, x) {
  const seed = level._seed ?? (level._seed = seedFromId(level.id))
  const growth = Math.min(1 + (Math.max(0, x) / 1000) * level.growth, 2.2)
  const ramp = Math.min(1, 0.2 + Math.max(0, x) / 1600)
  const amp = level.amplitude * growth * ramp
  const f = level.frequency

  let h = 0
  h += Math.sin(x * f + seed) * amp * 0.6
  h += Math.sin(x * f * 2.1 + seed * 1.7) * amp * 0.28
  h += Math.sin(x * f * 4.7 + seed * 2.3) * amp * 0.12
  h += (noise1D(x * f * 8, seed) * 2 - 1) * amp * level.jaggedness * 0.5

  return WORLD_BASE_Y - h
}

export class TerrainManager {
  constructor(scene, level) {
    this.scene = scene
    this.level = level
    this.chunks = new Map() // index -> { bodies:[], gfx }
  }

  chunkIndexAt(x) { return Math.floor(x / CHUNK_WIDTH) }

  ensureRange(minX, maxX) {
    const i0 = this.chunkIndexAt(minX), i1 = this.chunkIndexAt(maxX)
    for (let i = i0; i <= i1; i++) {
      if (!this.chunks.has(i)) this._buildChunk(i)
    }
    for (const i of [...this.chunks.keys()]) {
      if (i < i0 - 1 || i > i1 + 1) this._destroyChunk(i)
    }
  }

  _buildChunk(index) {
    const { scene, level } = this
    const pal = level.palette
    const x0 = index * CHUNK_WIDTH
    const pts = []
    for (let s = 0; s <= CHUNK_SEGMENTS; s++) {
      const x = x0 + s * SEGMENT_LEN
      pts.push({ x, y: heightAt(level, x) })
    }

    const bodies = []
    for (let s = 0; s < pts.length - 1; s++) {
      const p1 = pts[s], p2 = pts[s + 1]
      const dx = p2.x - p1.x, dy = p2.y - p1.y
      const len = Math.hypot(dx, dy)
      const angle = Math.atan2(dy, dx)
      const nx = -dy / len, ny = dx / len // wijst altijd "naar beneden" (dx > 0)
      const cx = (p1.x + p2.x) / 2 + nx * (SLAB_THICK / 2)
      const cy = (p1.y + p2.y) / 2 + ny * (SLAB_THICK / 2)
      const body = scene.matter.add.rectangle(cx, cy, len + 2, SLAB_THICK, {
        isStatic: true, angle, friction: level.friction, frictionStatic: level.friction + 0.3,
        label: 'ground',
      })
      bodies.push(body)
    }

    const maxY = Math.max(...pts.map(p => p.y)) + 700
    const g = scene.add.graphics().setDepth(5)

    // grondvlak
    g.fillStyle(pal.dirt, 1)
    g.beginPath()
    g.moveTo(pts[0].x, pts[0].y)
    pts.forEach(p => g.lineTo(p.x, p.y))
    g.lineTo(pts[pts.length - 1].x, maxY)
    g.lineTo(pts[0].x, maxY)
    g.closePath()
    g.fillPath()

    // spikkels (steentjes) — deterministisch per chunk
    g.fillStyle(pal.speckle, 0.55)
    for (let n = 0; n < 42; n++) {
      const sx = x0 + hash(index * 131 + n, 5) * CHUNK_WIDTH
      const sy = heightAt(level, sx) + 24 + hash(index * 131 + n, 6) * 300
      g.fillCircle(sx, sy, 2 + hash(index * 131 + n, 7) * 3.5)
    }

    // oppervlakte-strip (gras/sneeuw/zand) net iets over de rand heen
    const strip = pts.map(p => ({ x: p.x, y: p.y + 5 }))
    g.lineStyle(16, pal.surface, 1)
    g.strokePoints(strip, false, false)
    g.lineStyle(5, pal.surfaceLight, 0.8)
    g.strokePoints(pts, false, false)

    this.chunks.set(index, { bodies, gfx: g })
  }

  _destroyChunk(index) {
    const c = this.chunks.get(index)
    if (!c) return
    // Bij scene-shutdown is de physics-world soms al opgeruimd
    const world = this.scene.matter?.world
    if (world) c.bodies.forEach(b => world.remove(b))
    c.gfx.destroy()
    this.chunks.delete(index)
  }

  destroy() {
    for (const i of [...this.chunks.keys()]) this._destroyChunk(i)
  }
}
