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

// Shirt 'model' (Ajax/PSV) or 'print' → load the donor shirt GLB (real UV),
// attach the character's skeleton, parent it like the plain shirt slot, and
// for prints bake our all-over emoji texture over it.
export function loadShirtDonor(scene, shirtMesh, skeleton, item, onReady) {
  const file = item.kind === 'model' ? item.file : '/ajaxshirt.glb'
  shirtMesh.setEnabled(false)
  SceneLoader.ImportMesh('', '/', file.replace(/^\//, ''), scene, (loaded, _ps, srcSkels) => {
    const glbShirt = loaded.find(lm => (lm.getTotalVertices?.() ?? 0) > 0)
    if (glbShirt && skeleton) {
      glbShirt.parent             = shirtMesh.parent
      glbShirt.position           = new Vector3(0, 0, 0)
      glbShirt.rotationQuaternion = null
      glbShirt.scaling            = new Vector3(1, 1, 1)
      glbShirt.skeleton           = skeleton
      if (item.kind === 'print') {
        const tex = new Texture(buildShirtPrintTexture(item).toDataURL(), scene, false, false)
        const mat = glbShirt.material
        if (mat) {
          if (mat.albedoColor !== undefined) { mat.albedoTexture = tex; mat.albedoColor = Color3.White() }
          else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = tex; mat.diffuseColor = Color3.White() }
        }
      }
      glbShirt.setEnabled(true)
      onReady?.(glbShirt)
    }
    loaded.forEach(lm => { if (lm !== glbShirt) { try { lm.dispose() } catch {} } })
    srcSkels?.[0]?.dispose()
  })
}
