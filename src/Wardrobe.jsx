import { useEffect, useRef, useState } from 'react'
import {
  Engine, Scene, ArcRotateCamera,
  HemisphericLight, DirectionalLight,
  Vector3, Color3, Color4, Texture,
  MeshBuilder, StandardMaterial, Quaternion,
} from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import { SHIRT_COLORS } from './data'
import './wardrobe.css'

const SHIRT_TEXTURES = []
const SHIRT_MODELS = [
  { key: 'ajax', label: 'Ajax', file: '/ajaxshirt.glb', preview: '/logo_ajax.svg' },
  { key: 'psv',  label: 'PSV',  file: '/psvshirt.glb',  preview: '/logo_psv.svg' },
]
const CLOTHING_MESHES = ['Shirt', 'Broek', 'Sokken', 'Schoenen']
const FACE_MESH_NAMES = new Set([
  'Gezicht', 'Face',
  'Ogen', 'Eyes',
  'Wenkbrauwen', 'Eyebrows',
  'Mond', 'Mouth',
  'Neus', 'Nose',
])
const ITEMS = [
  { key: 'broek',    label: 'Broek',    emoji: '👖' },
  { key: 'sokken',   label: 'Sokken',   emoji: '🧦' },
  { key: 'schoenen', label: 'Schoenen', emoji: '👟' },
]

// All animation GLBs use the same bone names as Poppetje.glb — no remapping needed.
// Hips excluded: Mixamo FBX bakes the root orientation into Hips data.
const RETARGET_BONES = new Set([
  'Root',
  'Hips','Spine','Spine1',
  'Neck','Head',
  'LeftShoulder','LeftArm','LeftForeArm','LeftHand',
  'RightShoulder','RightArm','RightForeArm','RightHand',
  'LeftUpLeg','LeftLeg','LeftFoot','LeftToeBase',
  'RightUpLeg','RightLeg','RightFoot','RightToeBase',
])

// Each file has one animation; we store it under a stable key (not the internal name).
const ANIM_FILES = [
  { key: 'rust',       file: 'rust.glb'              },
  { key: 'hip_hop',    file: 'hip_hop_dancing.glb'   },
  { key: 'breakdance', file: 'emote_breakdance.glb'  },
  { key: 'lopen',      file: 'emote_lopen.glb'       },
  { key: 'verloren',   file: 'emote_verloren.glb'    },
]

const EMOTE_META = {
  hip_hop:    { emoji: '💃', label: 'Hip Hop'    },
  breakdance: { emoji: '🕺', label: 'Breakdance' },
  lopen:      { emoji: '🚶', label: 'Lopen'      },
  verloren:   { emoji: '😢', label: 'Verloren'   },
}

// ── Material helpers ──────────────────────────────────────────────
function walkMeshes(node, fn) {
  fn(node)
  ;(node.getChildMeshes ? node.getChildMeshes(false) : []).forEach(fn)
}

function applyColor(mesh, hex) {
  const col = Color3.FromHexString(hex)
  walkMeshes(mesh, m => {
    if (!m.material) return
    const mat = m.material.clone(m.material.name + '_col')
    m.material = mat
    if (mat.albedoColor !== undefined) {
      mat.albedoTexture = null
      mat.albedoColor   = col
      mat.metallic      = 0
      mat.roughness     = 0.8
      mat.unlit         = false
    } else if (mat.diffuseColor !== undefined) {
      mat.diffuseTexture = null
      mat.diffuseColor   = col
    }
  })
}

function applyTexture(mesh, texture) {
  walkMeshes(mesh, m => {
    if (!m.material) return
    const mat = m.material.clone(m.material.name + '_tex')
    m.material = mat
    if (mat.albedoColor !== undefined) {
      mat.albedoTexture = texture
      mat.albedoColor   = Color3.White()
      mat.metallic      = 0
      mat.roughness     = 0.8
    } else if (mat.diffuseColor !== undefined) {
      mat.diffuseTexture = texture
      mat.diffuseColor   = Color3.White()
    }
  })
}

// ── Component ─────────────────────────────────────────────────────
export default function Wardrobe({ onBack, onPlay3D, unlockedColors = {} }) {
  const canvasRef      = useRef(null)
  const sceneRef       = useRef(null)
  const skeletonRef    = useRef(null)
  const meshesRef      = useRef({})
  const extraMeshesRef = useRef([])
  const animGroupsRef  = useRef({})
  const restPoseRef    = useRef({})   // bone name → { node, rot, pos } captured at T-pose

  const [shirtColor, setShirtColor] = useState(() => {
    try { return localStorage.getItem('kk_shirt') || null } catch { return null }
  })
  const [wearing, setWearing] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kk_wearing') || '{}') } catch { return {} }
  })
  const [loading,    setLoading]    = useState(true)
  const [activeAnim, setActiveAnim] = useState(null)
  const [animsReady, setAnimsReady] = useState(false)

  useEffect(() => {
    if (shirtColor) localStorage.setItem('kk_shirt', shirtColor)
    else localStorage.removeItem('kk_shirt')
  }, [shirtColor])

  useEffect(() => {
    localStorage.setItem('kk_wearing', JSON.stringify(wearing))
  }, [wearing])

  const clearExtraMeshes = () => {
    extraMeshesRef.current.forEach(m => { try { m.dispose() } catch {} })
    extraMeshesRef.current = []
  }

  const pickShirt = (key) => {
    const next = shirtColor === key ? null : key
    setShirtColor(next)
    clearExtraMeshes()
    const m = meshesRef.current.shirt
    if (!m) return
    if (!next) { m.setEnabled(false); return }

    const colorItem   = SHIRT_COLORS.find(c => c.key === next)
    const textureItem = SHIRT_TEXTURES.find(t => t.key === next)
    const modelItem   = SHIRT_MODELS.find(t => t.key === next)

    if (modelItem && sceneRef.current) {
      m.setEnabled(false)  // hide Poppetje's shirt slot to avoid z-fighting
      SceneLoader.ImportMesh('', '/', modelItem.file.replace(/^\//, ''), sceneRef.current, (loadedMeshes) => {
        const skel = skeletonRef.current
        // Re-assign skeleton so the GLB shirt deforms with Poppetje's animations
        if (skel) loadedMeshes.forEach(em => { if (em.skeleton) em.skeleton = skel })
        // Keep ALL meshes — the GLB is the shirt itself, nothing to filter out
        extraMeshesRef.current = loadedMeshes
      })
    } else if (textureItem && sceneRef.current) {
      const scene = sceneRef.current
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width  = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        const tex = new Texture(canvas.toDataURL(), scene, false, false)
        tex.onLoadObservable.addOnce(() => applyTexture(m, tex))
      }
      img.src = textureItem.file
      m.setEnabled(true)
    } else if (colorItem) {
      applyColor(m, colorItem.hex)
      m.setEnabled(true)
    }
  }

  const pickClothing = (itemKey, colorKey) => {
    setWearing(prev => {
      const next = prev[itemKey] === colorKey ? null : colorKey
      const mesh = meshesRef.current[itemKey]
      if (mesh) {
        if (!next) {
          mesh.setEnabled(false)
        } else {
          const colorItem = SHIRT_COLORS.find(c => c.key === colorKey)
          if (colorItem) applyColor(mesh, colorItem.hex)
          mesh.setEnabled(true)
        }
      }
      return { ...prev, [itemKey]: next }
    })
  }

  const resetToTPose = () => {
    Object.values(restPoseRef.current).forEach(({ node, rot, pos }) => {
      if (node.rotationQuaternion) node.rotationQuaternion.copyFrom(rot)
      else node.rotationQuaternion = rot.clone()
      node.position.copyFrom(pos)
    })
  }

  const playRust = (groups) => {
    const all = groups ?? animGroupsRef.current
    // Stop any running animation
    Object.values(all).forEach(g => { try { g?.stop() } catch {} })
    const rg = all['rust']
    if (rg) {
      rg.play(true)  // loop=true
    }
    setActiveAnim('rust')
  }

  const pickEmote = (name) => {
    const groups = animGroupsRef.current
    if (activeAnim === name) {
      // Toggle off → go back to rust
      groups[name]?.stop()
      playRust()
    } else {
      if (activeAnim && activeAnim !== 'rust') groups[activeAnim]?.stop()
      groups['rust']?.stop()
      groups[name]?.play(true)
      setActiveAnim(name)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new Engine(canvas, true)
    const scene  = new Scene(engine)
    sceneRef.current = scene
    scene.clearColor = new Color4(0, 0, 0, 0)

    const camera = new ArcRotateCamera('cam', Math.PI / 2, Math.PI / 2.5, 5, Vector3.Zero(), scene)
    camera.wheelPrecision = 50
    camera.lowerBetaLimit = Math.PI / 2.5
    camera.upperBetaLimit = Math.PI / 2.5
    camera.attachControl(canvas, true)

    new HemisphericLight('hemi', new Vector3(0, 1, 0), scene).intensity = 1.6
    const sun = new DirectionalLight('sun', new Vector3(-1, -2, -1), scene)
    sun.intensity = 1.8

    SceneLoader.ImportMesh('', '/', 'Poppetje.glb', scene, (meshes) => {
      // Store Poppetje's skeleton so extra meshes (Ajax shirt) can share it
      skeletonRef.current = scene.skeletons[0] ?? null

      // Store clothing mesh refs
      meshes.forEach(mesh => {
        const name = mesh.name
        const key  = name.toLowerCase()
        if (CLOTHING_MESHES.includes(name)) {
          mesh.setEnabled(false)
          meshesRef.current[key] = mesh
        }
      })

      // Fit camera to character
      let min = new Vector3( 1e9,  1e9,  1e9)
      let max = new Vector3(-1e9, -1e9, -1e9)
      meshes.forEach(m => {
        if (!m.getHierarchyBoundingVectors) return
        const b = m.getHierarchyBoundingVectors(true)
        min = Vector3.Minimize(min, b.min)
        max = Vector3.Maximize(max, b.max)
      })
      const center = Vector3.Lerp(min, max, 0.5)
      const maxDim = Math.max(...max.subtract(min).asArray())
      camera.target           = center
      camera.radius           = maxDim * 1.8
      camera.lowerRadiusLimit = maxDim * 0.8
      camera.upperRadiusLimit = maxDim * 5

      // Floor plane at the character's feet
      const ground = MeshBuilder.CreateGround('ground', { width: maxDim * 3, height: maxDim * 3 }, scene)
      ground.position.y = min.y
      const groundMat = new StandardMaterial('groundMat', scene)
      groundMat.emissiveColor = new Color3(0.10, 0.11, 0.20)
      groundMat.diffuseColor  = Color3.Black()
      groundMat.specularColor = Color3.Black()
      ground.material = groundMat

      // Restore saved clothing
      if (shirtColor) {
        const colorItem = SHIRT_COLORS.find(c => c.key === shirtColor)
        const modelItem = SHIRT_MODELS.find(t => t.key === shirtColor)
        const m = meshesRef.current.shirt
        if (modelItem) {
          if (m) m.setEnabled(false)  // hide Poppetje's shirt slot
          SceneLoader.ImportMesh('', '/', modelItem.file.replace(/^\//, ''), scene, (loadedMeshes) => {
            const skel = skeletonRef.current
            if (skel) loadedMeshes.forEach(em => { if (em.skeleton) em.skeleton = skel })
            extraMeshesRef.current = loadedMeshes
          })
        } else if (colorItem && m) {
          applyColor(m, colorItem.hex)
          m.setEnabled(true)
        }
      }
      Object.entries(wearing).forEach(([key, colorKey]) => {
        if (!colorKey) return
        const mesh = meshesRef.current[key]
        const colorItem = SHIRT_COLORS.find(c => c.key === colorKey)
        if (mesh && colorItem) { applyColor(mesh, colorItem.hex); mesh.setEnabled(true) }
      })

      // Face features always black
      meshes.forEach(m => {
        if (!FACE_MESH_NAMES.has(m.name) || !m.material) return
        const mat = m.material.clone(m.material.name + '_face')
        m.material = mat
        if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = Color3.Black() }
        else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = Color3.Black() }
      })

      setLoading(false)

      // ── Build Poppetje node map + capture T-pose for reset ──
      const nodeMap = {}
      const dstRestRots = {}
      scene.transformNodes.forEach(n => {
        nodeMap[n.name] = n
        if (RETARGET_BONES.has(n.name)) {
          dstRestRots[n.name] = n.rotationQuaternion
            ? n.rotationQuaternion.clone()
            : Quaternion.Identity()
          restPoseRef.current[n.name] = {
            node: n,
            rot:  n.rotationQuaternion ? n.rotationQuaternion.clone() : Quaternion.Identity(),
            pos:  n.position.clone(),
          }
        }
      })
      scene.meshes.forEach(m2 => { if (!nodeMap[m2.name]) nodeMap[m2.name] = m2 })

      // ── Load all animation files with rest-pose-corrected retargeting ──
      const groups = {}
      let pending = ANIM_FILES.length

      const onFileLoaded = () => {
        pending--
        if (pending === 0) {
          animGroupsRef.current = groups
          setAnimsReady(true)
          playRust(groups)
        }
      }

      ANIM_FILES.forEach(({ key, file }) => {
        SceneLoader.ImportMesh('', '/', file, scene,
          (aMeshes, _ps, _sk, aGroups) => {
            aMeshes.forEach(m2 => m2.setEnabled(false))
            if (aGroups.length > 0) {
              const orig = aGroups[0]

              // Capture SOURCE rest rotations before cloning remaps the targets
              const srcRestRots = {}
              orig.targetedAnimations.forEach(ta => {
                const n = ta.target
                srcRestRots[n.name] = n.rotationQuaternion
                  ? n.rotationQuaternion.clone()
                  : Quaternion.Identity()
              })

              // Clone and remap targets to Poppetje's nodes
              const retargeted = orig.clone(key, target => {
                if (!RETARGET_BONES.has(target.name)) return target
                return nodeMap[target.name] ?? target
              })

              // Process each track
              const tas = retargeted.targetedAnimations
              for (let i = tas.length - 1; i >= 0; i--) {
                const ta   = tas[i]
                const prop = ta.animation.targetProperty
                const name = ta.target.name

                // Strip scale always
                if (prop === 'scaling' || prop === 'scale') { tas.splice(i, 1); continue }

                // Strip position for all bones except Root (Root carries the actual movement)
                if (prop === 'position') {
                  if (name !== 'Root') { tas.splice(i, 1); continue }
                  // Keep Root position as-is (no rotation correction needed for translation)
                  continue
                }

                // Rotation tracks: only keep retargeted bones
                if (!RETARGET_BONES.has(name)) { tas.splice(i, 1); continue }

                // Strip Root rotation for rust – the raw Z-up in rust.glb would
                // lay the character flat; keeping it out lets Hips drive the pose.
                if (key === 'rust' && name === 'Root') { tas.splice(i, 1); continue }

                // Apply rest-pose correction for emote animations only, not the base rust animation
                if (key !== 'rust') {
                  const srcRest = srcRestRots[name] ?? Quaternion.Identity()
                  const dstRest = dstRestRots[name] ?? Quaternion.Identity()
                  const correction = Quaternion.Inverse(dstRest).multiply(srcRest)
                  ta.animation.getKeys().forEach(kf => {
                    kf.value.copyFrom(correction.multiply(kf.value))
                  })
                }
              }

              retargeted.stop()
              groups[key] = retargeted
              orig.dispose()
            }
            onFileLoaded()
          },
          null,
          (_, msg) => { console.warn(file + ' load error:', msg); onFileLoaded() }
        )
      })
    }, null, (_, msg, err) => {
      console.error('Poppetje load error:', msg, err)
      setLoading(false)
    })

    engine.runRenderLoop(() => scene.render())
    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      Object.values(animGroupsRef.current).forEach(g => { try { g.dispose() } catch {} })
      clearExtraMeshes()
      scene.dispose()
      engine.dispose()
    }
  }, [])

  return (
    <div className="wardrobe-screen">
      <button className="back-btn" onClick={onBack}>← Menu</button>

      {/* ── Left: clothing ── */}
      <aside className="clothing-panel">
        <h2 className="panel-title">Kledingkast</h2>
        <p className="panel-sub">Klik om aan te trekken</p>

        <div className="clothing-list">
          <div className="clothing-section">
            <div className={`clothing-header ${shirtColor ? 'clothing-on' : ''}`}>
              <span className="clothing-emoji">👕</span>
              <span className="clothing-label">Shirt</span>
              {shirtColor && <span className="clothing-check">✓</span>}
            </div>
            <div className="color-swatches">
              {SHIRT_COLORS.map(c => {
                const locked = !(unlockedColors.shirt || []).includes(c.key)
                return (
                  <button
                    key={c.key}
                    className={`color-swatch ${shirtColor === c.key ? 'swatch-active' : ''} ${locked ? 'swatch-locked' : ''}`}
                    style={{ background: c.hex }}
                    title={locked ? '🔒 Win via lootbox' : c.label}
                    onClick={() => !locked && pickShirt(c.key)}
                  />
                )
              })}
              {SHIRT_TEXTURES.map(t => (
                <button
                  key={t.key}
                  className={`color-swatch texture-swatch ${shirtColor === t.key ? 'swatch-active' : ''}`}
                  style={{ backgroundImage: `url('${t.file}')`, backgroundSize: 'cover' }}
                  title={t.label}
                  onClick={() => pickShirt(t.key)}
                />
              ))}
              {SHIRT_MODELS.map(t => {
                const locked = !(unlockedColors.shirt || []).includes(t.key)
                return (
                  <button
                    key={t.key}
                    className={`color-swatch texture-swatch ${shirtColor === t.key ? 'swatch-active' : ''} ${locked ? 'swatch-locked' : ''}`}
                    style={{ backgroundImage: `url('${t.preview}')`, backgroundSize: 'cover' }}
                    title={locked ? '🔒 Win via lootbox' : t.label}
                    onClick={() => !locked && pickShirt(t.key)}
                  />
                )
              })}
            </div>
          </div>

          {ITEMS.map(item => (
            <div key={item.key} className="clothing-section">
              <div className={`clothing-header ${wearing[item.key] ? 'clothing-on' : ''}`}>
                <span className="clothing-emoji">{item.emoji}</span>
                <span className="clothing-label">{item.label}</span>
                {wearing[item.key] && <span className="clothing-check">✓</span>}
              </div>
              <div className="color-swatches">
                {SHIRT_COLORS.map(c => {
                  const locked = !(unlockedColors[item.key] || []).includes(c.key)
                  return (
                    <button
                      key={c.key}
                      className={`color-swatch ${wearing[item.key] === c.key ? 'swatch-active' : ''} ${locked ? 'swatch-locked' : ''}`}
                      style={{ background: c.hex }}
                      title={locked ? '🔒 Win via lootbox' : c.label}
                      onClick={() => !locked && pickClothing(item.key, c.key)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Center: 3D viewer ── */}
      <div className="viewer-panel">
        <canvas ref={canvasRef} className="three-canvas" />
        {loading && <div className="viewer-loading">Laden...</div>}
        {!loading && onPlay3D && (
          <button className="play3d-btn" onClick={onPlay3D}>
            ⚽ Speel in 3D
          </button>
        )}
      </div>

      {/* ── Right: emotes ── */}
      <aside className="emotes-panel">
        <h2 className="panel-title">Emotes</h2>
        <p className="panel-sub">Klik om te bewegen</p>
        <div className="emote-list">
          {/* Rust button — speelt rust.glb in lus */}
          <button
            className={`emote-btn ${activeAnim === 'rust' ? 'emote-on' : ''}`}
            onClick={() => playRust()}
            disabled={!animsReady}
            title={!animsReady ? 'Laden…' : ''}
          >
            <span className="emote-emoji">🧍</span>
            <span className="emote-label">Rust</span>
            {activeAnim === 'rust' && <span className="emote-play">▶</span>}
          </button>

          {Object.entries(EMOTE_META).map(([name, meta]) => (
            <button
              key={name}
              className={`emote-btn ${activeAnim === name ? 'emote-on' : ''}`}
              onClick={() => pickEmote(name)}
              disabled={!animsReady}
              title={!animsReady ? 'Laden…' : ''}
            >
              <span className="emote-emoji">{meta.emoji}</span>
              <span className="emote-label">{meta.label}</span>
              {activeAnim === name && <span className="emote-play">▶</span>}
            </button>
          ))}
        </div>
        {!animsReady && !loading && (
          <p className="panel-sub" style={{ marginTop: 8 }}>Animaties laden…</p>
        )}
      </aside>
    </div>
  )
}
