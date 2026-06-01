// Shared clothing application for the 3D world + multiplayer game, so the
// new catalog items (colours / patterns / emoji-print shirts) render the same
// way everywhere as in the wardrobe.
import { Texture, Color3, Vector3 } from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import { buildTextureCanvas, buildShirtPrintTexture } from './itemsCatalog'

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
  broek:    '/broek.glb',
  sokken:   '/sokken.glb',
  schoenen: '/schoenen.glb',
}

// For a print/pattern/model item: load the matching donor mesh (real UV),
// attach the character's skeleton, parent it like the plain slot, and bake the
// generated texture (emoji print / pattern) onto it. `type` = shirt|broek|…
export function loadClothingDonor(scene, mesh, skeleton, type, item, onReady) {
  const file = item.kind === 'model'
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
      if (item.kind !== 'model') {
        // shirt uses its own donor stamp; others tile across the full UV
        const canvas = type === 'shirt' ? buildShirtPrintTexture(item) : buildTextureCanvas(item)
        const tex = new Texture(canvas.toDataURL(), scene, false, false)
        const mat = g.material
        if (mat) {
          if (mat.albedoColor !== undefined) { mat.albedoTexture = tex; mat.albedoColor = Color3.White() }
          else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = tex; mat.diffuseColor = Color3.White() }
        }
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
