// Brug Bouwen: bouwt per level een referentie-brug (zoals een kind hem ook kan
// bouwen: knopen op het 20px-raster, binnen maxLen en met de toegestane
// materialen) en simuleert hem headless. Controleert:
//   1. de referentie haalt de overkant binnen het budget (level is oplosbaar)
//   2. alleen een kaal weg-dek zonder steun faalt (level vraagt echt een constructie)
// Gebruik: node tools/brugTest.js [levelnummer]
import { pathToFileURL } from 'node:url'
import { LEVELS, MAT, SNAP, initialBuild, createSim, stepSim, buildCost, insideTerrain } from '../src/games/brugPhysics.js'

function builder(lv) {
  const { nodes, members } = initialBuild(lv)
  const node = (x, y) => {
    const i = nodes.findIndex(n => Math.abs(n.x - x) < 7 && Math.abs(n.y - y) < 7)
    if (i >= 0) return i
    x = Math.round(x / SNAP) * SNAP; y = Math.round(y / SNAP) * SNAP
    const j = nodes.findIndex(n => Math.abs(n.x - x) < 7 && Math.abs(n.y - y) < 7)
    if (j >= 0) return j
    if (insideTerrain(lv, x, y)) throw new Error(`knoop (${x},${y}) in terrein`)
    nodes.push({ x, y, fixed: false }); return nodes.length - 1
  }
  const anchor = (x, y) => {
    const i = nodes.findIndex(n => n.fixed && Math.abs(n.x - x) < 8 && Math.abs(n.y - y) < 8)
    if (i < 0) throw new Error(`geen anker bij (${x},${y})`)
    return i
  }
  const mem = (i, j, mat) => {
    if (i === j) return
    if (!lv.mats.includes(mat)) throw new Error(`${mat} niet toegestaan`)
    const a = nodes[i], b = nodes[j], len = Math.hypot(a.x - b.x, a.y - b.y)
    if (len > MAT[mat].maxLen || len < 12) throw new Error(`${mat}-balk ${len.toFixed(0)}px ongeldig (${a.x},${a.y})→(${b.x},${b.y})`)
    if (members.some(m => (m.a === i && m.b === j) || (m.a === j && m.b === i))) return
    members.push({ a: i, b: j, mat })
  }
  // deck P→Q in stukken ≤ seg; met depth>0 een vakwerk (Warren) eronder
  const span = (P, Q, o = {}) => {
    const a = nodes[P], b = nodes[Q], dx = b.x - a.x, dy = b.y - a.y, Ls = Math.hypot(dx, dy)
    const n = Math.max(1, Math.ceil(Ls / (o.seg ?? 140)))
    const ids = [P]
    for (let i = 1; i < n; i++) ids.push(node(a.x + dx * i / n, a.y + dy * i / n))
    ids.push(Q)
    for (let i = 0; i < n; i++) mem(ids[i], ids[i + 1], 'weg')
    const depth = o.depth ?? 0
    if (depth && n > 1) {
      const nx = -dy / Ls, ny = dx / Ls, B = []
      for (let i = 0; i < n; i++) {
        const p = nodes[ids[i]], q = nodes[ids[i + 1]]
        const bx = (p.x + q.x) / 2 + nx * depth, by = (p.y + q.y) / 2 + ny * depth
        if (insideTerrain(lv, Math.round(bx / SNAP) * SNAP, Math.round(by / SNAP) * SNAP)) { B.push(null); continue }   // pilaar in de weg
        B.push(node(bx, by))
        mem(ids[i], B[i], o.diag ?? 'hout'); mem(B[i], ids[i + 1], o.diag ?? 'hout')
        if (i && B[i - 1] != null) mem(B[i - 1], B[i], o.chord ?? 'hout')
      }
    }
    return ids
  }
  return { lv, nodes, members, node, anchor, mem, span }
}

const plats = lv => lv.terrain.filter(t => t.h > 0).map(t => ({ x0: t.x, x1: t.x + t.w, y: t.y }))

// referentie-ontwerp per level-soort; o = ontwerpkeuzes (diepte, materiaal)
export function reference(lv, o = {}) {
  const B = builder(lv), P = plats(lv)
  const depth = o.depth ?? 70, diag = o.diag ?? 'hout', chord = o.chord ?? diag, seg = o.seg ?? 140
  const so = { depth, diag, chord, seg }
  const first = P[0], last = lv.kind === 'slope' ? P[P.length - 2] : P[P.length - 1]
  if (lv.kind === 'pil' || lv.kind === 'slope' || lv.kind === 'pylons') {
    // dek van rand naar rand; pilaren die boven de lijn uitsteken liggen op de
    // route (weg eroverheen), lagere krijgen een A-steun omhoog naar het dek
    const mids = P.slice(1, lv.kind === 'slope' ? -2 : -1)
    const L0 = B.anchor(first.x1, first.y), R0 = B.anchor(last.x0, last.y)
    const lineY = (pts, x) => { for (let i = 0; i < pts.length - 1; i++) if (x <= pts[i + 1].x) return pts[i].y + (pts[i + 1].y - pts[i].y) * (x - pts[i].x) / (pts[i + 1].x - pts[i].x); return pts.at(-1).y }
    const straight = [B.nodes[L0], B.nodes[R0]]
    const high = mids.filter(pm => pm.y < lineY(straight, (pm.x0 + pm.x1) / 2) + 15)
    const way = [{ x: B.nodes[L0].x, y: B.nodes[L0].y, id: L0 }]
    high.forEach(pm => way.push({ x: pm.x0, y: pm.y, id: B.anchor(pm.x0, pm.y), top: true }, { x: pm.x1, y: pm.y, id: B.anchor(pm.x1, pm.y) }))
    way.push({ x: B.nodes[R0].x, y: B.nodes[R0].y, id: R0 })
    const deck = [...way]
    for (const pm of mids.filter(m => !high.includes(m))) {
      const px = (pm.x0 + pm.x1) / 2, D = B.node(px, lineY(way, px))
      const dn = B.nodes[D], len = Math.max(...[pm.x0, pm.x1].map(x => Math.hypot(dn.x - x, dn.y - pm.y)))
      const sm = len <= MAT[diag].maxLen ? diag : 'metaal'
      B.mem(B.anchor(pm.x0, pm.y), D, sm); B.mem(B.anchor(pm.x1, pm.y), D, sm)
      deck.push({ x: dn.x, y: dn.y, id: D })
    }
    deck.sort((p, q) => p.x - q.x)
    for (let i = 0; i < deck.length - 1; i++) {
      if (deck[i].top) { B.mem(deck[i].id, deck[i + 1].id, 'weg'); continue }
      const d = Math.hypot(deck[i + 1].x - deck[i].x, deck[i + 1].y - deck[i].y)
      B.span(deck[i].id, deck[i + 1].id, d <= MAT.weg.maxLen && !o.pierDepth ? { depth: 0 } : { ...so, depth: o.pierDepth || depth })
    }
  } else if (lv.kind === 'opn') {
    B.span(B.anchor(first.x1, first.y), B.anchor(last.x0, last.y), so)
  } else if (lv.kind === 'pre') {
    const tip = lv.prebuilt[0].pts.at(-1)
    B.span(B.anchor(tip[0], tip[1]), B.anchor(last.x0, last.y), so)
  } else if (lv.kind === 'jmp' || lv.kind === 'mjmp' || lv.kind === 'stairs') {
    for (let i = 0; i < P.length - 1; i++) B.span(B.anchor(P[i].x1, P[i].y), B.anchor(P[i + 1].x0, P[i + 1].y), so)
  } else if (lv.kind === 'susp') {
    const ids = B.span(B.anchor(first.x1, first.y), B.anchor(last.x0, last.y), { seg: o.seg ?? 100 })
    const fl = lv.floatAnchors.map(f => B.anchor(f.x, f.y))
    for (const d of ids.slice(1, -1)) {
      const dn = B.nodes[d]
      const best = fl.map(i => [i, Math.hypot(B.nodes[i].x - dn.x, B.nodes[i].y - dn.y)]).sort((p, q) => p[1] - q[1])
      B.mem(best[0][0], d, 'touw')
      if (o.double && best[1] && best[1][1] <= MAT.touw.maxLen) B.mem(best[1][0], d, 'touw')
    }
  }
  return B
}

function simulate(lv, B) {
  const sim = createSim(lv, B.nodes, B.members)
  let r = null
  while (!r) r = stepSim(sim)
  return { r, reason: sim.reason, frames: sim.frame, broken: sim.beams.filter(b => b.broken).length, cost: buildCost(B.members) }
}

// ontwerpvarianten van licht naar zwaar; de eerste die het haalt is de referentie
const VARIANTS = [
  { depth: 60 }, { depth: 80 }, { depth: 80, diag: 'metaal', chord: 'hout' }, { depth: 100, diag: 'metaal' },
  { depth: 80, pierDepth: 50 }, { depth: 100, pierDepth: 60, diag: 'metaal' }, { double: true }, { seg: 70, double: true },
  { seg: 75, depth: 60 }, { seg: 75, depth: 80, diag: 'metaal', chord: 'hout' }, { seg: 75, depth: 90, diag: 'metaal' },
]

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
function main() {
const only = process.argv[2] ? +process.argv[2] - 1 : null
let fails = 0
LEVELS.forEach((lv, i) => {
  if (only != null && i !== only) return
  let ref = null, err = []
  for (const v of VARIANTS) {
    let B
    try { B = reference(lv, v) } catch (e) { err.push(e.message); continue }
    const res = simulate(lv, B)
    if (res.r === 'win' && res.cost <= lv.budget) { ref = { v, ...res }; break }
    err.push(`${JSON.stringify(v)}: ${res.r}/${res.reason} broken=${res.broken} cost=${res.cost}`)
  }
  let bareRes
  try {
    const B = builder(lv), P = plats(lv)
    // kaal: dezelfde route, alleen weg
    const R = reference(lv, { depth: 0, pierDepth: 0 })
    R.members = R.members.filter(m => m.mat === 'weg' || m.pre)
    bareRes = simulate(lv, R)
    void B; void P
  } catch (e) { bareRes = { r: 'err', reason: e.message } }
  // budget: referentie ≈ 45-60% ⇒ 3 sterren (≤60%) haalbaar, en ruim speelruimte voor minder zuinige bruggen
  const ratio = ref ? ref.cost / lv.budget : 0
  const ok = !!ref && ratio >= 0.45 && ratio <= 0.6 && bareRes.r !== 'win'
  if (!ok) fails++
  const nr = String(i + 1).padStart(2)
  console.log(`${ok ? '✓' : '✗'} ${nr} ${lv.kind.padEnd(6)} ${lv.title.padEnd(18)} budget ${String(lv.budget).padStart(4)}`
    + (ok ? ` ref ${String(ref.cost).padStart(4)} (${Math.round(ref.cost / lv.budget * 100)}%) ${JSON.stringify(ref.v)} t=${(ref.frames / 60).toFixed(1)}s` : '')
    + ` | kaal: ${bareRes.r}${bareRes.reason ? '/' + bareRes.reason : ''}`
    + (ref && (ratio < 0.45 || ratio > 0.6) ? `  → budget ${Math.ceil(ref.cost / 0.55 / 10) * 10}` : ''))
  if (!ok) err.forEach(e => console.log('      ' + e))
})
if (fails) { console.log(`\n${fails} level(s) niet opgelost`); process.exit(1) }
}
