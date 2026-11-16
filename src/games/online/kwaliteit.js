// Automatisch terugschakelen op trage apparaten (oude iPads, Chromebooks):
// liever vloeiend dan mooi-en-schokkerig. Elke 3 seconden kijken: haalt het
// spel geen 45 beelden per seconde, dan een stap omlaag.
//   1. bloom en gloed uit, geen MSAA
//   2. schaduwen uit
//   3. minder pixels (1,4× zo grof)
export function autoKwaliteit(engine, scene, { pipe = null, schaduw = null } = {}) {
  let stap = 0
  const timer = setInterval(() => {
    if (engine.isDisposed || stap >= 3) return
    if (engine.getFps() >= 45) return
    stap++
    if (stap === 1) {
      scene.effectLayers?.forEach(l => { l.isEnabled = false })
      if (pipe) { pipe.bloomEnabled = false; pipe.samples = 1 }
    } else if (stap === 2) {
      if (schaduw) {
        const licht = schaduw.getLight?.()
        if (licht) licht.shadowEnabled = false
      } else stap++                       // geen schaduwen: meteen door naar stap 3
    }
    if (stap === 3) engine.setHardwareScalingLevel(engine.getHardwareScalingLevel() * 1.4)
  }, 3000)
  return () => clearInterval(timer)
}
