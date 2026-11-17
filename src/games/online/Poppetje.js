import { Color3, Quaternion, MeshBuilder, StandardMaterial, DynamicTexture } from '@babylonjs/core'
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'
import { findItem } from '../../itemsCatalog'
import { applyItemToMesh, loadClothingDonor, usesDonor, loadHeadItem, zetLegeOnderdelenUit } from '../../applyClothing'
import { laadAnimatieBron, kopieVoorSpeler } from './animaties.js'

// Eén poppetje met de kleding uit de Kledingkast en een naamkaartje, voor de
// Vloerquiz. Laadt Poppetje.glb, trekt de kleding aan en zet de animaties om
// naar het eigen skelet (elk animatiebestand één keer per potje, animaties.js).
//
//   const p = new Poppetje(scene, { shirt, wearing, naam, kleur, anims })
//   p.zet(x, y, z, rotY); p.beweeg(loopt); p.speel('hip_hop', true)

const BOTTEN = new Set([
  'Root', 'Hips', 'Spine', 'Spine1', 'Neck', 'Head',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
  'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase',
])
const KLEDING = new Set(['Shirt', 'Broek', 'Sokken', 'Schoenen'])
const GEZICHT = new Set(['Gezicht', 'Face', 'Ogen', 'Eyes', 'Wenkbrauwen', 'Eyebrows', 'Mond', 'Mouth', 'Neus', 'Nose'])

// key → bestand; stripRoot: de verplaatsing in de animatie zelf weglaten
export const ANIMATIES = {
  rust:       { file: 'rust.glb',             stripRoot: true },
  rennen:     { file: 'emoterennen.glb',      stripRoot: true },
  geraakt:    { file: 'emotegeraakt.glb',     stripRoot: true },
  hip_hop:    { file: 'hip_hop_dancing.glb',  stripRoot: false },
  breakdance: { file: 'emote_breakdance.glb', stripRoot: false },
  verloren:   { file: 'emote_verloren.glb',   stripRoot: false },
  springen:   { file: 'emotespringen.glb',    stripRoot: true },
}

const kaal = (naam) => String(naam || 'Speler').replace(/^\u{1F916}\s*/u, '').slice(0, 14)

// Naamkaartje boven het hoofd: donker plaatje met een rand in de kleur.
function naamKaartje(scene, naam, kleur, ik) {
  const tex = new DynamicTexture('naamTex', { width: 256, height: 64 }, scene, true)
  const c = tex.getContext()
  c.clearRect(0, 0, 256, 64)
  const tekst = ik ? 'Jij' : kaal(naam)
  c.font = '900 30px "Baloo 2", Nunito, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'
  const br = Math.min(248, c.measureText(tekst).width + 34), x0 = 128 - br / 2
  c.fillStyle = ik ? kleur : 'rgba(11,10,26,0.8)'
  c.beginPath(); c.roundRect ? c.roundRect(x0, 10, br, 44, 16) : c.rect(x0, 10, br, 44); c.fill()
  c.strokeStyle = kleur; c.lineWidth = 3; c.stroke()
  c.fillStyle = ik ? '#0b0a1a' : '#fff'
  c.fillText(tekst, 128, 33)
  tex.update(); tex.hasAlpha = true
  const m = new StandardMaterial('naamMat', scene)
  m.diffuseTexture = tex; m.useAlphaFromDiffuseTexture = true
  m.emissiveColor = Color3.White(); m.disableLighting = true; m.backFaceCulling = false
  const plane = MeshBuilder.CreatePlane('naam', { width: 3, height: 0.75 }, scene)
  plane.material = m; plane.billboardMode = 7; plane.isPickable = false
  plane.onDisposeObservable.add(() => { tex.dispose(); m.dispose() })
  scene.effectLayers?.forEach(l => l.addExcludedMesh?.(plane))
  return plane
}

export default class Poppetje {
  constructor(scene, opts) {
    this.scene = scene
    this.opts = opts          // { shirt, wearing (object), naam, kleur, ik, schaal, schaduw, anims }
    this.root = null
    this.naam = naamKaartje(scene, opts.naam, opts.kleur || '#ffffff', opts.ik)
    this.naam.setEnabled(false)
    this._nodes = {}
    this._rest = {}
    this._anims = {}
    this._donors = []
    this._stand = ''
    this._klaar = false
    this._laad()
  }

  _laad() {
    SceneLoader.ImportMesh('', '/', 'Poppetje.glb', this.scene, (meshes, _ps, skels) => {
      if (this._weg) { meshes.forEach(m => m.dispose()); return }
      zetLegeOnderdelenUit(meshes)
      this.root = meshes[0]
      this._skelet = skels[0] ?? null
      meshes.forEach(m => { this.opts.schaduw?.addShadowCaster(m); m.isPickable = false })

      // botten van dít poppetje (niet die van een ander met dezelfde naam)
      this.root.getDescendants(false).forEach(n => { if (!this._nodes[n.name]) this._nodes[n.name] = n })
      Object.entries(this._nodes).forEach(([naam, n]) => {
        if (BOTTEN.has(naam)) this._rest[naam] = n.rotationQuaternion ? n.rotationQuaternion.clone() : Quaternion.Identity()
      })
      this._rootPos = this._nodes.Root?.position.clone()

      // kleding, zoals in de Kledingkast
      const draagt = this.opts.wearing ?? {}
      meshes.forEach(m => {
        if (!KLEDING.has(m.name)) return
        const key = m.name.toLowerCase()
        const kleur = key === 'shirt' ? this.opts.shirt : draagt[key]
        const item = kleur && findItem(key, kleur)
        if (!item) { m.setEnabled(false); return }
        if (usesDonor(key, item)) loadClothingDonor(this.scene, m, this._skelet, key, item, g => this._donors.push(g))
        else { applyItemToMesh(this.scene, m, item); m.setEnabled(true) }
      })
      const pet = draagt.hoofd && findItem('hoofd', draagt.hoofd)
      if (pet) {
        const ouder = meshes.find(m => KLEDING.has(m.name))?.parent || this.root
        loadHeadItem(this.scene, ouder, this._skelet, pet, draagt.hoofdStance || 'normaal', g => this._donors.push(g))
      }
      meshes.forEach(m => {
        if (!GEZICHT.has(m.name) || !m.material) return
        const mat = m.material.clone(m.material.name + '_f')
        m.material = mat
        if (mat.albedoColor !== undefined) { mat.albedoTexture = null; mat.albedoColor = Color3.Black() }
        else if (mat.diffuseColor !== undefined) { mat.diffuseTexture = null; mat.diffuseColor = Color3.Black() }
      })

      const s = this.opts.schaal ?? 1
      if (s !== 1) this.root.scaling.scaleInPlace(s)
      this.naam.setEnabled(this._zicht !== false)
      if (this._zicht === false) this.root.setEnabled(false)
      if (this._pose) this.zet(...this._pose)
      this._laadAnimaties()
    }, null, (_s, msg) => console.error('Poppetje laden mislukt:', msg))
  }

  _laadAnimaties() {
    const keys = this.opts.anims ?? Object.keys(ANIMATIES)
    let nog = keys.length
    const klaar = () => {
      if (--nog > 0) return
      this._klaar = true
      const wil = this._wil ?? ['rust', true]
      this._stand = ''
      this.speel(...wil)
    }
    keys.forEach(key => {
      const { file, stripRoot } = ANIMATIES[key]
      laadAnimatieBron(this.scene, file).then(({ groep, srcRests }) => {
        if (this._weg) return
        const rt = kopieVoorSpeler({ groep }, key, this.scene, t => (BOTTEN.has(t.name) ? (this._nodes[t.name] ?? null) : null))
        const tas = rt.targetedAnimations
        for (let i = tas.length - 1; i >= 0; i--) {
          const { animation: anim, target } = tas[i]
          const prop = anim.targetProperty, naam = target.name
          if (prop === 'scaling' || prop === 'scale') { tas.splice(i, 1); continue }
          if (prop === 'position') { if (stripRoot || naam !== 'Root') tas.splice(i, 1); continue }
          if (key === 'rust' && naam === 'Root') { tas.splice(i, 1); continue }
          if (key !== 'rust') {
            const corr = Quaternion.Inverse(this._rest[naam] ?? Quaternion.Identity()).multiply(srcRests[naam] ?? Quaternion.Identity())
            anim.getKeys().forEach(kf => kf.value.copyFrom(corr.multiply(kf.value)))
          }
        }
        rt.stop()
        // welke botten deze animatie draait en of hij Root verplaatst (zie speel)
        rt._draait = new Set(tas.filter(ta => ta.animation.targetProperty !== 'position').map(ta => ta.target.name))
        rt._verplaatst = tas.some(ta => ta.animation.targetProperty === 'position')
        this._anims[key] = rt
        klaar()
      }).catch(e => { console.warn('animatie niet geladen:', key, e?.message); klaar() })
    })
  }

  // Animatie afspelen; nog niet geladen: onthouden voor straks.
  speel(naam, herhaal = true) {
    this._wil = [naam, herhaal]
    if (!this._klaar || this._stand === naam) return
    Object.values(this._anims).forEach(g => g.stop())
    const g = this._anims[naam] ?? this._anims.rust
    // botten die de nieuwe animatie niet aanstuurt terug naar de ruststand:
    // anders blijft het poppetje na vallen of dansen scheef (rust draait Root niet)
    if (g) {
      Object.entries(this._rest).forEach(([bot, q]) => {
        const n = this._nodes[bot]
        if (n && !g._draait.has(bot)) n.rotationQuaternion = q.clone()
      })
      if (!g._verplaatst && this._rootPos) this._nodes.Root?.position.copyFrom(this._rootPos)
    }
    g?.play(herhaal)
    if (this._zicht === false) g?.pause()
    this._stand = naam
  }

  // Tonen of verbergen. Verborgen kost niets: geen tekenen, geen animatie.
  zichtbaar(aan) {
    if (this._zicht === aan) return
    this._zicht = aan
    if (!this.root) return
    this.root.setEnabled(aan)
    this.naam.setEnabled(aan)
    const g = this._anims[this._stand]
    if (g) aan ? g.restart() : g.pause()
  }

  beweeg(loopt) {
    if (this._stand === 'geraakt' || this._vast) return
    this.speel(loopt ? 'rennen' : 'rust')
  }

  // Een animatie vastzetten (vallen, dansen): beweeg() doet dan niets.
  vast(naam, herhaal = true) { this._vast = !!naam; if (naam) { this._stand = ''; this.speel(naam, herhaal) } else this.speel('rust') }

  zet(x, y, z, rotY) {
    this._pose = [x, y, z, rotY]
    if (!this.root) return
    this.root.position.set(x, y, z)
    this.naam.position.set(x, y + 2.25 * (this.opts.schaal ?? 1) + 0.35, z)
    this.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(rotY + Math.PI, 0, 0)
  }

  dispose() {
    this._weg = true
    Object.values(this._anims).forEach(g => { try { g.dispose() } catch { /* al weg */ } })
    this._donors.forEach(g => { try { g.dispose() } catch { /* al weg */ } })
    this.naam.dispose()
    this.root?.dispose?.()
  }
}
