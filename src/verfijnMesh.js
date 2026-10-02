// Kledingmodellen fijner maken: meer driehoeken en een gladde, ronde vorm.
//
// De donor-modellen zijn grof (de broek heeft ~300 driehoeken, het shirt
// ~960) en de pet heeft harde facetten. Bij het laden delen we elke driehoek
// in vieren. Het nieuwe middenpunt van een rand wordt niet recht tussen de
// twee hoeken gezet maar iets naar buiten gebogen langs de normalen ("Phong-
// tessellation"), zodat het model echt ronder wordt in plaats van alleen meer
// driehoeken met dezelfde hoeken. Botgewichten en UV gaan mee, dus de kleding
// beweegt en de print zit precies waar hij zat.
//
// Normalen worden op positie samengevoegd: zo krijgen naden (waar de UV is
// geknipt) geen scheurtjes en verdwijnen de facetten van de pet.

import { VertexData } from '@babylonjs/core'

const DOEL = 3000      // fijner maken tot minstens zoveel driehoeken
const MAX_NIVEAU = 2
const BUIG = 0.75      // 0 = recht (alleen meer driehoeken), 1 = maximaal rond

const sleutel = (p, i) => `${Math.round(p[i] * 1e4)},${Math.round(p[i + 1] * 1e4)},${Math.round(p[i + 2] * 1e4)}`

// Gladde normaal per positie (gewogen naar oppervlak), terug per vertex.
function gladdeNormalen(pos, idx) {
  const n = pos.length / 3
  const groep = new Int32Array(n)
  const map = new Map()
  for (let v = 0; v < n; v++) {
    const k = sleutel(pos, v * 3)
    if (!map.has(k)) map.set(k, map.size)
    groep[v] = map.get(k)
  }
  const som = new Float64Array(map.size * 3)
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t] * 3, idx[t + 1] * 3, idx[t + 2] * 3]
    const e1 = [pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]]
    const e2 = [pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]]
    const fn = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]
    for (const v of [idx[t], idx[t + 1], idx[t + 2]]) {
      const g = groep[v] * 3
      som[g] += fn[0]; som[g + 1] += fn[1]; som[g + 2] += fn[2]
    }
  }
  const uit = new Float32Array(n * 3)
  for (let v = 0; v < n; v++) {
    const g = groep[v] * 3
    const l = Math.hypot(som[g], som[g + 1], som[g + 2]) || 1
    uit[v * 3] = som[g] / l; uit[v * 3 + 1] = som[g + 1] / l; uit[v * 3 + 2] = som[g + 2] / l
  }
  return uit
}

// Botgewichten van twee hoekpunten samenvoegen tot de 4 (of 8) sterkste.
function mengGewichten(ia, wa, ib, wb, a, b, breed) {
  const m = new Map()
  for (let k = 0; k < breed; k++) {
    if (wa[a * breed + k] > 0) m.set(ia[a * breed + k], (m.get(ia[a * breed + k]) || 0) + wa[a * breed + k] * 0.5)
    if (wb[b * breed + k] > 0) m.set(ib[b * breed + k], (m.get(ib[b * breed + k]) || 0) + wb[b * breed + k] * 0.5)
  }
  const top = [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, breed)
  const tot = top.reduce((s, [, w]) => s + w, 0) || 1
  const i = new Array(breed).fill(0), w = new Array(breed).fill(0)
  top.forEach(([bot, gw], k) => { i[k] = bot; w[k] = gw / tot })
  return [i, w]
}

function deelEenKeer(d) {
  const { pos, uv, idx, mi, mw } = d
  const nrm = gladdeNormalen(pos, idx)
  const P = Array.from(pos), U = Array.from(uv), N = Array.from(nrm)
  const MI = mi ? Array.from(mi) : null, MW = mw ? Array.from(mw) : null
  const randen = new Map()
  const midden = (a, b) => {
    const k = a < b ? a * 1e7 + b : b * 1e7 + a
    if (randen.has(k)) return randen.get(k)
    const pa = [pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]], pb = [pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]]
    const na = [nrm[a * 3], nrm[a * 3 + 1], nrm[a * 3 + 2]], nb = [nrm[b * 3], nrm[b * 3 + 1], nrm[b * 3 + 2]]
    const m = [0, 1, 2].map(i => (pa[i] + pb[i]) / 2)
    const proj = (p, n) => { const s = (m[0] - p[0]) * n[0] + (m[1] - p[1]) * n[1] + (m[2] - p[2]) * n[2]; return m.map((v, i) => v - s * n[i]) }
    const qa = proj(pa, na), qb = proj(pb, nb)
    const v = P.length / 3
    for (let i = 0; i < 3; i++) P.push((1 - BUIG) * m[i] + BUIG * (qa[i] + qb[i]) / 2)
    U.push((uv[a * 2] + uv[b * 2]) / 2, (uv[a * 2 + 1] + uv[b * 2 + 1]) / 2)
    const nn = [na[0] + nb[0], na[1] + nb[1], na[2] + nb[2]], l = Math.hypot(...nn) || 1
    N.push(nn[0] / l, nn[1] / l, nn[2] / l)
    if (MI) {
      const [i, w] = mengGewichten(mi, mw, mi, mw, a, b, 4)
      MI.push(...i); MW.push(...w)
    }
    randen.set(k, v)
    return v
  }
  const I = []
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2]
    const ab = midden(a, b), bc = midden(b, c), ca = midden(c, a)
    I.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca)
  }
  return { pos: new Float32Array(P), uv: new Float32Array(U), idx: new Uint32Array(I), nrm: new Float32Array(N),
    mi: MI && new Float32Array(MI), mw: MW && new Float32Array(MW) }
}

// Maakt een (skinned) mesh fijner en gladder. Veilig om vaker aan te roepen:
// een mesh wordt maar één keer bewerkt.
export function verfijnMesh(mesh) {
  if (!mesh?.getVerticesData || mesh.metadata?.verfijnd) return
  const pos = mesh.getVerticesData('position'), uv = mesh.getVerticesData('uv'), idx = mesh.getIndices()
  if (!pos || !uv || !idx || idx.length < 3) return
  // Extra botinvloeden (8 per vertex) laten we met rust: dan alleen gladmaken.
  const extra = mesh.getVerticesData('matricesIndicesExtra')
  let d = { pos, uv, idx, mi: extra ? null : mesh.getVerticesData('matricesIndices'), mw: extra ? null : mesh.getVerticesData('matricesWeights') }
  let niveau = 0
  if (!extra) {
    while (d.idx.length / 3 < DOEL && niveau < MAX_NIVEAU) { d = deelEenKeer(d); niveau++ }
  }
  const vd = new VertexData()
  vd.positions = d.pos
  vd.indices = d.idx
  vd.uvs = d.uv
  vd.normals = gladdeNormalen(d.pos, d.idx)
  if (d.mi && d.mw) { vd.matricesIndices = d.mi; vd.matricesWeights = d.mw }
  else if (extra) {
    vd.matricesIndices = mesh.getVerticesData('matricesIndices'); vd.matricesWeights = mesh.getVerticesData('matricesWeights')
    vd.matricesIndicesExtra = extra; vd.matricesWeightsExtra = mesh.getVerticesData('matricesWeightsExtra')
  }
  vd.applyToMesh(mesh, false)
  mesh.refreshBoundingInfo?.(true)
  mesh.metadata = { ...(mesh.metadata || {}), verfijnd: true }
}
