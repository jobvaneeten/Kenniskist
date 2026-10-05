// Neongolf: zoekt per hole met een beam-search naar de minste slagen (hoeken in
// stappen van 3°, 8 krachten — grof genoeg dat een kind het ook kan mikken).
// Controleert dat elke hole binnen par te halen is en niet triviaal (par niet te ruim).
// Gebruik: node tools/neongolfTest.js [holenummer | van-tot]
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const ctx = {}
vm.createContext(ctx)
vm.runInContext(readFileSync(new URL('../public/neongolf/kern.js', import.meta.url), 'utf8'), ctx)
const NG = ctx.NG

const HOEKEN = 120, KRACHTEN = [0.12, 0.2, 0.3, 0.4, 0.5, 0.62, 0.78, 1]
const BEAM = 24, CEL = 10

// afstand-tot-gat per rastercel (muren en water blokkeren, portalen verbinden)
function afstandsKaart(h) {
  NG.voorbereid(h)
  const nx = NG.W / CEL, ny = NG.H / CEL, vrij = new Uint8Array(nx * ny), dist = new Float64Array(nx * ny).fill(Infinity)
  const segD = (x, y) => Math.min(...h._seg.map(([x1, y1, x2, y2]) => {
    const dx = x2 - x1, dy = y2 - y1, u = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
    return Math.hypot(x - x1 - u * dx, y - y1 - u * dy)
  }))
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = i * CEL + CEL / 2, y = j * CEL + CEL / 2
    vrij[j * nx + i] = NG.binnen(h.rand, x, y) && !NG.inZone(h.blokken, x, y) && !NG.inZone(h.water, x, y) && segD(x, y) > NG.R - 2 ? 1 : 0
  }
  const cel = (x, y) => Math.min(ny - 1, Math.max(0, Math.floor(y / CEL))) * nx + Math.min(nx - 1, Math.max(0, Math.floor(x / CEL)))
  const q = [[0, cel(h.gat[0], h.gat[1])]]
  dist[q[0][1]] = 0
  const portIn = new Map()   // uitgang-cel → ingang-cellen (zoeken loopt achteruit)
  ;(h.portalen || []).forEach(p => { const k = cel(p[2], p[3]); portIn.set(k, [...(portIn.get(k) || []), cel(p[0], p[1])]) })
  while (q.length) {
    q.sort((a, b) => a[0] - b[0])
    const [d, c] = q.shift()
    if (d > dist[c]) continue
    const ci = c % nx, cj = (c - ci) / nx
    const buren = []
    for (const [di, dj, w] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41]]) {
      const i2 = ci + di, j2 = cj + dj
      if (i2 >= 0 && j2 >= 0 && i2 < nx && j2 < ny && vrij[j2 * nx + i2]) buren.push([j2 * nx + i2, w * CEL])
    }
    for (const pi of portIn.get(c) || []) buren.push([pi, 0])
    for (const [n, w] of buren) if (d + w < dist[n]) { dist[n] = d + w; q.push([d + w, n]) }
  }
  return (x, y) => dist[cel(x, y)]
}

function zoek(h, maxD) {
  const af = afstandsKaart(h)
  let laag = [{ x: h.start[0], y: h.start[1], t: 0, pad: [] }]
  for (let d = 1; d <= maxD; d++) {
    const volgende = new Map()
    let raak = null, raakAantal = 0
    for (const s of laag) {
      for (let a = 0; a < HOEKEN; a++) for (const k of KRACHTEN) {
        const hoek = a / HOEKEN * 2 * Math.PI
        const r = NG.speelSlag(h, s.x, s.y, s.t, hoek, k)
        if (r.uit === 'gat') { raakAantal++; if (!raak) raak = [...s.pad, [Math.round(a * 3), k]]; continue }
        if (r.uit === 'water') continue
        const key = Math.round(r.x / 20) + ',' + Math.round(r.y / 20)
        const score = af(r.x, r.y)
        const old = volgende.get(key)
        if (!old || score < old.score) volgende.set(key, { x: r.x, y: r.y, t: r.t, score, pad: [...s.pad, [Math.round(a * 3), k]] })
      }
    }
    if (raak) return { slagen: d, pad: raak, raakAantal }
    laag = [...volgende.values()].sort((p, q) => p.score - q.score).slice(0, BEAM)
  }
  return null
}

const [van, tot] = process.argv[2] ? process.argv[2].split('-').map(Number).concat([]) : [1, NG.HOLES.length]
let fout = 0
NG.HOLES.forEach((h, i) => {
  if (i + 1 < van || i + 1 > (tot || van)) return
  // start en gat moeten vrij liggen
  for (const [naam, [x, y]] of [['start', h.start], ['gat', h.gat]]) {
    if (!NG.binnen(h.rand, x, y) || NG.inZone(h.blokken, x, y) || NG.inZone(h.water, x, y)) { console.log(`✗ ${i + 1} ${naam} ligt niet vrij`); fout++ }
  }
  const t0 = Date.now()
  const res = zoek(h, h.par)
  const ok = res && res.slagen <= h.par && res.slagen >= h.par - 2
  if (!ok) fout++
  console.log(`${ok ? '✓' : '✗'} ${String(i + 1).padStart(2)} ${h.naam.padEnd(15)} par ${h.par}  `
    + (res ? `best ${res.slagen} slag(en)  pad ${JSON.stringify(res.pad)}  (${res.raakAantal} raak-slagen in laatste ronde)` : 'NIET binnen par gevonden')
    + ` ${((Date.now() - t0) / 1000).toFixed(1)}s`)
})
if (fout) { console.log(`\n${fout} hole(s) kloppen niet`); process.exit(1) }
