import OrientationGate from '../OrientationGate'
import { TerugKnop } from '../ui/index.jsx'

export default function AstroKatapultGame({ onBack, reward = false }) {
  // Volledige game (eigen level-keuze). Voortgang staat in localStorage van het spel zelf.
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#060611' }}>
      <TerugKnop onClick={onBack} style={{ zIndex: 9999 }} />
      <iframe
        src={reward ? '/astrokatapult/?reward' : '/astrokatapult/'}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Astro Katapult"
        allow="autoplay"
      />
      <OrientationGate />
    </div>
  )
}
