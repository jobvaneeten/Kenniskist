// Kleedt een animatiebestand (.glb) uit tot alleen de animatie.
//
//   node tools/glb-uitkleden.mjs public/emotelopen.glb [...]
//
// De animaties voor het poppetje komen uit Mixamo/Blender en bevatten elk een
// volledige kopie van het poppetje (meshes, skins) plus een plaatje van
// 1,5 MB. Het spel gebruikt daar niets van: het leest alleen de animatie en
// zet die over op Poppetje.glb (zie RETARGET_BONES in de spellen). Zonder die
// ballast gaat een bestand van ~2 MB naar 50-600 KB.
//
// Wat blijft: alle nodes (de botten, met hun rustpose: die is nodig om de
// animatie om te rekenen), de animaties en één skin (zoals emote_lopen.glb,
// dat al zo gebouwd was). Nodes die een mesh droegen blijven als lege node
// staan, zodat er niets hernummerd hoeft te worden.
import fs from 'fs'

const PAD = (n) => (4 - (n % 4)) % 4

function leesGlb(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('geen GLB')
  const jsonLen = buf.readUInt32LE(12)
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
  const binStart = 20 + jsonLen + 8
  const bin = buf.length > binStart ? buf.subarray(binStart, binStart + buf.readUInt32LE(20 + jsonLen)) : Buffer.alloc(0)
  return { json, bin }
}

function schrijfGlb(json, bin) {
  const js = Buffer.from(JSON.stringify(json), 'utf8')
  const jsPad = Buffer.concat([js, Buffer.alloc(PAD(js.length), 0x20)])
  const binPad = Buffer.concat([bin, Buffer.alloc(PAD(bin.length))])
  const kop = Buffer.alloc(12)
  kop.writeUInt32LE(0x46546c67, 0); kop.writeUInt32LE(2, 4)
  kop.writeUInt32LE(12 + 8 + jsPad.length + 8 + binPad.length, 8)
  const stuk = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b }
  return Buffer.concat([kop, stuk(jsPad.length, 0x4e4f534a), jsPad, stuk(binPad.length, 0x004e4942), binPad])
}

export function kleedUit(buf) {
  const { json: j, bin } = leesGlb(buf)
  if (!j.animations?.length) throw new Error('geen animatie in dit bestand')
  const nodig = new Set()
  for (const a of j.animations) for (const s of a.samplers) { nodig.add(s.input); nodig.add(s.output) }
  const skin = j.skins?.[0] ? { ...j.skins[0] } : null
  if (skin?.inverseBindMatrices != null) nodig.add(skin.inverseBindMatrices)

  // nieuwe buffer met alleen de accessors die nog gebruikt worden
  const oudNaarNieuw = new Map(), accessors = [], views = [], delen = []
  let offset = 0
  for (const i of [...nodig].sort((a, b) => a - b)) {
    const acc = { ...j.accessors[i] }
    const bv = j.bufferViews[acc.bufferView]
    if (bv.byteStride) throw new Error('verweven buffer wordt niet ondersteund')
    const start = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0)
    const per = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[acc.type]
    const grootte = { 5126: 4, 5123: 2, 5125: 4, 5121: 1, 5122: 2, 5120: 1 }[acc.componentType]
    const len = acc.count * per * grootte
    delen.push(bin.subarray(start, start + len), Buffer.alloc(PAD(len)))
    views.push({ buffer: 0, byteOffset: offset, byteLength: len })
    offset += len + PAD(len)
    acc.bufferView = views.length - 1
    delete acc.byteOffset
    oudNaarNieuw.set(i, accessors.length)
    accessors.push(acc)
  }

  const nodes = j.nodes.map(n => { const m = { ...n }; delete m.mesh; delete m.skin; return m })
  const uit = {
    asset: j.asset, scene: j.scene ?? 0, scenes: j.scenes, nodes,
    animations: j.animations.map(a => ({
      ...a, samplers: a.samplers.map(s => ({ ...s, input: oudNaarNieuw.get(s.input), output: oudNaarNieuw.get(s.output) })),
    })),
    accessors, bufferViews: views, buffers: [{ byteLength: offset }],
  }
  if (skin) {
    if (skin.inverseBindMatrices != null) skin.inverseBindMatrices = oudNaarNieuw.get(skin.inverseBindMatrices)
    uit.skins = [skin]
  }
  return schrijfGlb(uit, Buffer.concat(delen))
}

if (process.argv[1]?.endsWith('glb-uitkleden.mjs')) {
  for (const f of process.argv.slice(2)) {
    const voor = fs.statSync(f).size
    const na = kleedUit(fs.readFileSync(f))
    fs.writeFileSync(f, na)
    console.log(`${f}: ${Math.round(voor / 1024)} KB → ${Math.round(na.length / 1024)} KB`)
  }
}
