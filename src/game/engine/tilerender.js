// Tilelagen in chunks van 16×16 tegels naar offscreen canvases. Zonder deze
// cache zijn het bij een vol scherm ruim 500 drawImage-aanroepen per frame,
// alleen voor de vloer.

import { TEGEL, T } from './tilemap.js'
import { tileset, tegelFrame } from '../art/tegels.js'
import { nieuwCanvas } from '../core/atlas.js'

const CHUNK = 16 // tegels
const CHUNK_PX = CHUNK * TEGEL

export class TileRenderer {
  constructor(map, palet) {
    this.map = map
    this.palet = palet
    this.set = tileset(palet)
    this.chunksX = Math.ceil(map.w / CHUNK)
    this.chunksY = Math.ceil(map.h / CHUNK)
    this.chunks = new Array(this.chunksX * this.chunksY).fill(null)
  }

  // Tekent de zichtbare toestand: een kapotgeslagen blok is hier al weg en een
  // onthuld blok is hier al zichtbaar.
  _bak(cx, cy) {
    const { canvas, ctx } = nieuwCanvas(CHUNK_PX, CHUNK_PX)
    for (let y = 0; y < CHUNK; y++) {
      for (let x = 0; x < CHUNK; x++) {
        const tx = cx * CHUNK + x
        const ty = cy * CHUNK + y
        const t = this.map.tegel(tx, ty)
        if (t === T.LEEG) continue
        const blad = this.set.soorten[t]
        if (!blad) continue
        blad.teken(ctx, tegelFrame(this.map.buren(tx, ty), tx, ty), x * TEGEL, y * TEGEL)
      }
    }
    return canvas
  }

  chunk(cx, cy) {
    const i = cy * this.chunksX + cx
    if (!this.chunks[i]) this.chunks[i] = this._bak(cx, cy)
    return this.chunks[i]
  }

  // Een tegel is veranderd: alleen de chunk waar hij in zit opnieuw bakken.
  // Dat gebeurt hooguit een paar keer per level, dus dit is goedkoper dan per
  // frame losse tegels overtekenen — en het geeft geen gaten in de achtergrond.
  markeer(tx, ty) {
    const cx = Math.floor(tx / CHUNK)
    const cy = Math.floor(ty / CHUNK)
    if (cx < 0 || cy < 0 || cx >= this.chunksX || cy >= this.chunksY) return
    this.chunks[cy * this.chunksX + cx] = null
  }

  // Na een respawn zijn alle kapotte blokken terug.
  herbak() { this.chunks.fill(null) }

  teken(ctx, camX, camY, viewW, viewH) {
    const x0 = Math.max(0, Math.floor(camX / CHUNK_PX))
    const x1 = Math.min(this.chunksX - 1, Math.floor((camX + viewW) / CHUNK_PX))
    const y0 = Math.max(0, Math.floor(camY / CHUNK_PX))
    const y1 = Math.min(this.chunksY - 1, Math.floor((camY + viewH) / CHUNK_PX))

    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        ctx.drawImage(this.chunk(cx, cy), Math.round(cx * CHUNK_PX - camX), Math.round(cy * CHUNK_PX - camY))
      }
    }
  }
}
