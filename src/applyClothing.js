// Shared clothing application for the 3D world + multiplayer game, so the
// new catalog items (colours / patterns / emoji-print shirts) render the same
// way everywhere as in the wardrobe.
import { Texture, Color3, Vector3, Quaternion } from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import { buildTextureCanvas, buildShirtPrintTexture, emojiUrl } from './itemsCatalog'

function applyCanvasTex(scene, mesh, canvas) {
  const tex = new Texture(canvas.toDataURL(), scene, false, false)
  const mat = mesh.material
  if (mat) {
    if (mat.albedoColor !== undefined) { mat.albedoTexture = tex; mat.albedoColor = Color3.White() }
    else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = tex; mat.diffuseColor = Color3.White() }
  }
}

// Build + apply the generated texture. Prints load the Twemoji image first so
// they render identically on every device (iOS can't draw emoji to a texture).
function applyGeneratedTexture(scene, mesh, type, item) {
  const build = (img) => type === 'shirt'
    ? buildShirtPrintTexture(item, img)
    : buildTextureCanvas(item, img)
  if (item.kind === 'print') {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload  = () => applyCanvasTex(scene, mesh, build(img))
    img.onerror = () => applyCanvasTex(scene, mesh, build(null))
    img.src = emojiUrl(item.emoji)
  } else {
    applyCanvasTex(scene, mesh, build(null))   // pattern
  }
}

function walk(node, fn) {
  fn(node)
  ;(node.getChildMeshes ? node.getChildMeshes(false) : []).forEach(fn)
}

function applyColor(mesh, hex) {
  const col = Color3.FromHexString(hex)
  walk(mesh, m => {
    if (!m.material) return
    const mat = m.material.clone(m.material.name + '_c')
    m.material = mat
    if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = col }
    else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = col }
  })
}

function applyTexture(mesh, tex) {
  walk(mesh, m => {
    if (!m.material) return
    const mat = m.material.clone(m.material.name + '_tex')
    m.material = mat
    if (mat.albedoColor !== undefined) { mat.albedoTexture = tex; mat.albedoColor = Color3.White() }
    else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = tex; mat.diffuseColor = Color3.White() }
  })
}

// Colour / pattern / print applied directly onto a clothing mesh.
// (pattern/print only render as a solid colour on the legs/feet meshes,
//  exactly like the wardrobe — their UV can't show a print.)
export function applyItemToMesh(scene, mesh, item) {
  if (!mesh || !item) return
  if (item.kind === 'color') { applyColor(mesh, item.hex); return }
  if (item.kind === 'pattern' || item.kind === 'print') {
    const tex = new Texture(buildTextureCanvas(item).toDataURL(), scene, false, false)
    applyTexture(mesh, tex)
  }
}

// Donor GLBs with a proper UV unwrap, used to show prints/patterns on the
// clothing meshes (Poppetje's own clothing UV is collapsed to a point).
const DONOR = {
  broek:    '/test/nieuwebroektest.glb',   // Meshy broek with a clean 0–1 UV
  sokken:   '/sokken.glb',
  schoenen: '/Schoenen/schoenengoed.glb',  // nieuwe gerigde sneakers (alle schoenen)
}

// Types whose own Poppetje mesh glitches → always use the donor (even colours).
// schoenen: alle schoen-items tonen het nieuwe sneaker-model (getint/getextureerd).
const ALWAYS_DONOR = new Set(['broek', 'schoenen'])

// Should this item render via a donor mesh (true) or straight on Poppetje (false)?
export function usesDonor(type, item) {
  return item.kind !== 'color' || ALWAYS_DONOR.has(type)
}

// For a print/pattern/model item: load the matching donor mesh (real UV),
// attach the character's skeleton, parent it like the plain slot, and bake the
// generated texture (emoji print / pattern) onto it. `type` = shirt|broek|…
export function loadClothingDonor(scene, mesh, skeleton, type, item, onReady) {
  const file = (item.kind === 'model' || item.kind === 'texmodel')
    ? item.file
    : (type === 'shirt' ? '/ajaxshirt.glb' : (DONOR[type] || '/ajaxshirt.glb'))
  mesh.setEnabled(false)
  SceneLoader.ImportMesh('', '/', file.replace(/^\//, ''), scene, (loaded, _ps, srcSkels) => {
    const g = loaded.find(lm => (lm.getTotalVertices?.() ?? 0) > 0)
    if (g && skeleton) {
      g.parent             = mesh.parent
      g.position           = new Vector3(0, 0, 0)
      g.rotationQuaternion = null
      g.scaling            = new Vector3(1, 1, 1)
      g.skeleton           = skeleton
      if (item.kind === 'texmodel') {
        // donor mesh + a custom designed texture image (its UV matches the file)
        const tex = new Texture(item.texture, scene, false, false)
        const mat = g.material
        if (mat) {
          if (mat.albedoColor !== undefined) { mat.albedoTexture = tex; mat.albedoColor = Color3.White() }
          else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = tex; mat.diffuseColor = Color3.White() }
        }
      } else if (item.kind === 'color') {
        // solid colour on the donor mesh
        const col = Color3.FromHexString(item.hex)
        const mat = g.material
        if (mat) {
          if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = col }
          else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = col }
        }
      } else if (item.kind !== 'model') {
        applyGeneratedTexture(scene, g, type, item)
      }
      g.setEnabled(true)
      onReady?.(g)
    }
    loaded.forEach(lm => { if (lm !== g) { try { lm.dispose() } catch {} } })
    srcSkels?.[0]?.dispose()
  })
}

// Back-compat wrapper (shirt only)
export function loadShirtDonor(scene, shirtMesh, skeleton, item, onReady) {
  return loadClothingDonor(scene, shirtMesh, skeleton, 'shirt', item, onReady)
}

// ── Hoofd (pet) ───────────────────────────────────────────────────────
// The pet is one GLB rigged to the Head bone of Poppetje's skeleton, in two
// orientations (normaal / achterstevoren). There is no Poppetje head mesh, so
// it's loaded as a standalone mesh: share the skeleton (follows the head),
// parent it like the clothing, then tint it to the chosen colour.
// One pet, two stances — each is its own GLB, both rigged to the Head bone.
const HEAD_FILES = { normaal: 'Pet/petnormaal.glb', achter: 'Pet/petachter.glb' }

// Remap a mesh's per-vertex bone indices from srcSkel's order to dstSkel's
// order, matching by bone name (so it can share dstSkel and follow the right
// bones even when the GLB exported bones in a different order).
function remapBoneIndices(mesh, srcSkel, dstSkel) {
  const dstMap = {}
  dstSkel.bones.forEach((b, i) => { dstMap[b.name] = i })
  const remap = srcSkel.bones.map(b => (dstMap[b.name] ?? 0))
  ;['matricesIndices', 'matricesIndicesExtra'].forEach(kind => {
    const data = mesh.getVerticesData?.(kind)
    if (!data) return
    const out = new Float32Array(data.length)
    for (let i = 0; i < data.length; i++) {
      const idx = Math.round(data[i])
      out[i] = (idx >= 0 && idx < remap.length) ? remap[idx] : 0
    }
    mesh.updateVerticesData(kind, out)
  })
}

export function loadHeadItem(scene, parentNode, skeleton, item, stance, onReady) {
  if (!item) return
  const file = HEAD_FILES[stance] || HEAD_FILES.normaal
  SceneLoader.ImportMesh('', '/', file, scene, (loaded, _ps, srcSkels) => {
    const g = loaded.find(lm => (lm.getTotalVertices?.() ?? 0) > 0)
    if (!g) { loaded.forEach(lm => { try { lm.dispose() } catch {} }); srcSkels?.[0]?.dispose(); return }

    if (item.kind === 'texmodel') {
      applyTexture(g, new Texture(item.texture, scene, false, false))
    } else if (item.kind === 'color') {
      applyColor(g, item.hex)
    }

    // The pet is rigid (100% Head bone). Skinning onto Poppetje's skeleton is
    // unreliable for this GLB (its bind pose differs), so keep the GLB's own
    // __root__ (correct orientation/placement) and rigidly parent it to the
    // Head bone's transform node. Compute the offset against the Head bone's
    // REST (bind) matrix — NOT its live world — so it is independent of where
    // the avatar root currently is (e.g. seated in the kart) or its pose.
    let capRoot = g; while (capRoot.parent) capRoot = capRoot.parent
    const headBone = skeleton?.bones?.find(b => b.name === 'Head')
    const headNode = headBone?.getTransformNode?.()
    const restHead = headBone && (
      headBone.getAbsoluteBindMatrix?.() ||
      headBone.getAbsoluteInverseBindMatrix?.()?.clone().invert()
    )

    if (headNode && restHead) {
      capRoot.computeWorldMatrix(true)
      // cap.world = local · headNode.world ; want cap.world = capWorld0 when the
      // head is at its rest (bind) → local = capWorld0 · restHead⁻¹
      const local = capRoot.getWorldMatrix().multiply(restHead.clone().invert())
      capRoot.parent = headNode
      if (!capRoot.rotationQuaternion) capRoot.rotationQuaternion = Quaternion.Identity()
      local.decompose(capRoot.scaling, capRoot.rotationQuaternion, capRoot.position)
      walkSet(g, m => { m.skeleton = null })   // rigid follow → no skinning
    } else if (skeleton) {
      // Fallback: skinning (works when avatar is at the origin)
      if (parentNode) g.parent = parentNode
      g.position = new Vector3(0, 0, 0); g.rotationQuaternion = null; g.scaling = new Vector3(1, 1, 1)
      const srcSkel = srcSkels?.[0]
      if (srcSkel) remapBoneIndices(g, srcSkel, skeleton)
      g.skeleton = skeleton
      capRoot = g
    }

    g.setEnabled(true)
    onReady?.(capRoot)

    const keep = new Set(); walkSet(capRoot, m => keep.add(m))
    loaded.forEach(lm => { if (!keep.has(lm)) { try { lm.dispose() } catch {} } })
    srcSkels?.[0]?.dispose()
  })
}

function walkSet(node, fn) {
  fn(node)
  ;(node.getChildMeshes ? node.getChildMeshes(false) : []).forEach(fn)
}
