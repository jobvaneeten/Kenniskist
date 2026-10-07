// ═══════════════════════════════════════════════════════════════════════════
//  Gebakken maps: geometrie + licht komen uit Blender (tools/blender/*.blend).
//
//  Waarom: op Chromebooks/iPads is realtime licht met schaduwen en PBR te
//  zwaar. Blender rekent de belichting (maan, lantaarns, verlichte ramen,
//  teamlampen) één keer uit en bakt die in een lightmap. In het spel is elk
//  statisch oppervlak dan gewoon "textuur × lightmap" zonder lichtberekening:
//  rijk om te zien en spotgoedkoop. Alleen spelers en kogels gebruiken nog
//  echte lampen.
//
//  De GLB heeft twee UV-sets: UVMap (1 eenheid = 1 meter, voor de tegel-
//  texturen) en Lightmap (TEXCOORD_1). Materialen worden op naam vervangen.
// ═══════════════════════════════════════════════════════════════════════════
import { StandardMaterial, Texture, Color3 } from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'

// cfg = {
//   map: '/paintball/dorp/', glb: 'dorp.glb',
//   lightmaps: { floor: 'lm_grond.jpg', '*': 'lm_dorp.jpg' },   // per meshnaam, '*' = de rest
//   lichtNiveau: 1.6,                                         // lightmap-versterking
//   materialen: {
//     <naam>: { tex: '/tex/dorp/x.jpg', m: 2.5, tint: '#ffffff' }   // getegeld × lightmap
//     <naam>: { gloed: '#ffb860', sterkte: 1, tex? }                  // zelflichtend (optioneel met textuur)
//   },
//   geenBotsing: ['deco_'],   // naam-voorvoegsels zonder collision/dekking
// }
export function laadGebakkenMap(scene, cfg, { onMesh, onKlaar } = {}) {
  const lm = {}
  const lightmap = (bestand) => {
    if (!lm[bestand]) {
      const t = new Texture(cfg.map + bestand, scene, false, false)
      t.coordinatesIndex = 1
      t.level = cfg.lichtNiveau ?? 1.5
      lm[bestand] = t
    }
    return lm[bestand]
  }
  const tegels = {}
  const tegel = (pad, m) => {
    const k = pad + '|' + m
    if (!tegels[k]) {
      const t = new Texture(pad, scene)
      t.uScale = 1 / m; t.vScale = 1 / m
      t.anisotropicFilteringLevel = 4
      tegels[k] = t
    }
    return tegels[k]
  }
  const matCache = new Map()
  const gloeiend = new Map()   // materialen die echt licht geven → gloedkleur
  function materiaal(naam, lmBestand) {
    const def = cfg.materialen[naam]
    const sleutel = naam + '|' + (def?.gloed ? '' : lmBestand)
    if (matCache.has(sleutel)) return matCache.get(sleutel)
    const m = new StandardMaterial('gb_' + sleutel, scene)
    m.specularColor = Color3.Black()
    if (def?.gloed) {
      m.disableLighting = true
      const kleur = Color3.FromHexString(def.gloed).scale(def.sterkte ?? 1)
      m.emissiveColor = kleur
      if (def.tex) {
        // bv. verlichte ramen. emissiveTexture wordt in de shader bij emissiveColor
        // OPGETELD, dus kleur zwart en sterkte via level; de gloedlaag
        // vermenigvuldigt textuur × kleur (zie selector), dus geen gloeiende gevel.
        const t = new Texture(def.tex, scene)
        t.uScale = t.vScale = 1 / (def.m ?? 2.5)
        t.level = def.sterkte ?? 1
        m.emissiveTexture = t
        m.emissiveColor = Color3.Black()
      }
      m.diffuseColor = Color3.Black()
      gloeiend.set(m, kleur)
    } else {
      // Licht zit in de lightmap: geen lichtberekening. Met disableLighting
      // wordt de eindkleur (emissiveColor × diffuseTexture), dus de tint gaat
      // in emissiveColor en de tegeltextuur in diffuseTexture. De lightmap
      // (als 'shadowmap') vermenigvuldigt daar nog overheen.
      m.disableLighting = true
      m.diffuseColor = Color3.Black()
      if (def?.tex) m.diffuseTexture = tegel(def.tex, def.m ?? 2.5)
      m.emissiveColor = def?.tint ? Color3.FromHexString(def.tint) : Color3.White()
      if (lmBestand) { m.lightmapTexture = lightmap(lmBestand); m.useLightmapAsShadowmap = true }
    }
    if (def?.geenMist) m.fogEnabled = false   // verre skyline: donker silhouet i.p.v. grijze mistmuur
    m.freeze()
    matCache.set(sleutel, m)
    return m
  }

  SceneLoader.ImportMesh('', cfg.map, cfg.glb, scene, (meshes) => {
    const geen = cfg.geenBotsing ?? ['deco_']
    const oude = new Set()   // glTF-materialen worden door meerdere meshes gedeeld: pas na afloop weg
    // eerst de hele boom doorrekenen (de glTF-root draait de assen om): wie
    // vóór z'n ouder bevriest, krijgt een verkeerde matrix en wordt weggeculld
    for (const m of meshes) m.computeWorldMatrix(true)
    for (const mesh of meshes) {
      if (!mesh.getTotalVertices || mesh.getTotalVertices() === 0) { mesh.isPickable = false; continue }
      // naam van het object (glTF-primitives heten <object>_primitive<n>)
      const obj = (mesh.parent && mesh.parent.name !== '__root__' ? mesh.parent.name : mesh.name).replace(/_primitive\d+$/, '').replace(/\.\d+$/, '')   // Blender-dubbelnamen als floor.001
      const lmBestand = cfg.lightmaps[obj] ?? cfg.lightmaps['*']
      const matNaam = (mesh.material?.name || '').replace(/\.\d+$/, '')
      if (mesh.material) oude.add(mesh.material)
      mesh.material = materiaal(matNaam, mesh.isVerticesDataPresent('uv2') ? lmBestand : null)
      const deco = geen.some(p => obj.startsWith(p))
      mesh.isPickable = !deco
      mesh.checkCollisions = !deco
      mesh.refreshBoundingInfo()
      mesh.freezeWorldMatrix()
      onMesh?.(mesh, { obj, deco, materiaal: matNaam })
    }
    oude.forEach(m => m.dispose())
    // Gloed: alleen echt zelflichtende materialen. Gewone gebakken oppervlakken
    // doen wél mee als (zwarte) afdekking, zodat een lamp achter een huis niet
    // dwars door de muur heen gloeit.
    const dof = new Set([...matCache.values()].filter(m => !gloeiend.has(m)))
    scene.effectLayers?.forEach(l => {
      if (!('customEmissiveColorSelector' in l)) return
      l.customEmissiveColorSelector = (mesh, sub, mat, res) => {
        if (dof.has(mat)) res.set(0, 0, 0, 1)
        else { const e = gloeiend.get(mat) ?? mat?.emissiveColor; if (e) res.set(e.r, e.g, e.b, 1); else res.set(0, 0, 0, 1) }
      }
    })
    onKlaar?.(meshes)
  }, null, (_s, msg, err) => console.error('gebakken map niet geladen:', msg, err))
}
