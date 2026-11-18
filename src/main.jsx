import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css'
import './index.css'
import Root from './Root.jsx'
import Vangnet from './Vangnet.jsx'
import { herlaadEenKeer } from './lib/herladen.js'
import { toetsenbordHulpUit } from './lib/toetsenbord.js'
import { hydrateer, heeftOngesyncteWijzigingen } from './lib/voortgangSync.js'

// Is de site vernieuwd terwijl dit tabblad openstond, dan bestaan de oude
// stukjes niet meer: één keer herladen haalt de nieuwe versie op.
window.addEventListener('vite:preloadError', (e) => { if (herlaadEenKeer()) e.preventDefault() })

// Geen spellingcontrole, autocorrectie of suggesties op de hele site.
toetsenbordHulpUit()

// Nooit de hele site laten hangen op Supabase: als hydrateren faalt of traag is,
// starten we gewoon met de localStorage-voortgang die er al staat.
const hydratie = hydrateer()
try {
  await Promise.race([
    hydratie,
    new Promise((_, reject) => setTimeout(() => reject(new Error('hydrateer-timeout')), 8000)),
  ])
} catch (e) {
  console.error('Voortgang hydrateren mislukt — app start zonder sync:', e)
  // Komt de voortgang alsnog binnen terwijl de app al draait, dan staan de
  // schermen nog op de oude waarden. Is er nog niets veranderd, dan herladen we
  // één keer zodat alles klopt (de tweede keer is er niets nieuws meer).
  hydratie.then((gewijzigd) => {
    if (gewijzigd > 0 && !heeftOngesyncteWijzigingen()) window.location.reload()
  }).catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Vangnet>
      <Root />
    </Vangnet>
  </StrictMode>,
)
