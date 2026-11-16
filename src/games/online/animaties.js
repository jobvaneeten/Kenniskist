import { AnimationGroup, Quaternion } from '@babylonjs/core'
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader'
import '@babylonjs/loaders/glTF'

// Animaties voor het poppetje in de online spellen, één keer per potje laden.
//
// Voorheen laadde elke speler elk animatiebestand opnieuw (7 per speler bij
// voetbal, 9 bij paintball): met 8 spelers tientallen keren hetzelfde bestand
// downloaden, uitpakken en weer weggooien. Nu staat elk bestand één keer in
// een AssetContainer (niet in de scene) en krijgt elke speler een eigen kopie
// van de animatie, met eigen sleutels: de spellen rekenen die per speler om
// naar het skelet van Poppetje.glb.

const bronnen = new WeakMap()   // scene → Map(bestand → Promise<{ groep, srcRests }>)

export function laadAnimatieBron(scene, bestand) {
  let perScene = bronnen.get(scene)
  if (!perScene) {
    perScene = new Map()
    bronnen.set(scene, perScene)
    scene.onDisposeObservable.addOnce(() => {
      perScene.forEach(p => p.then(b => b.container.dispose()).catch(() => {}))
      bronnen.delete(scene)
    })
  }
  if (!perScene.has(bestand)) {
    perScene.set(bestand, LoadAssetContainerAsync('/' + bestand, scene).then(container => {
      const groep = container.animationGroups[0]
      if (!groep) throw new Error(`geen animatie in ${bestand}`)
      groep.stop()
      // rustpose van de bron-botten (nodig om om te rekenen naar Poppetje)
      const srcRests = {}
      groep.targetedAnimations.forEach(ta => {
        srcRests[ta.target.name] = ta.target.rotationQuaternion ? ta.target.rotationQuaternion.clone() : Quaternion.Identity()
      })
      return { container, groep, srcRests }
    }))
  }
  return perScene.get(bestand)
}

// Kopie van de bron-animatie voor één speler. `naarDoel(target)` geeft de
// node van die speler (of null: dan valt dat spoor weg). De sleutels zijn
// echte kopieën, dus de speler mag ze aanpassen zonder de bron te raken.
export function kopieVoorSpeler(bron, naam, scene, naarDoel) {
  const rt = new AnimationGroup(naam, scene)
  for (const ta of bron.groep.targetedAnimations) {
    const doel = naarDoel(ta.target)
    if (doel) rt.addTargetedAnimation(ta.animation.clone(true), doel)
  }
  rt.normalize(bron.groep.from, bron.groep.to)
  return rt
}
