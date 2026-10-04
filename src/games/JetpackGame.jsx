import OrientationGate from '../OrientationGate'
import { TerugKnop } from '../ui/index.jsx'

export default function JetpackGame({ onBack }) {
  // The jetpack game reads/writes the SAME wallet (kk_curuntie) as the rest of
  // the app, so coins always match. The home badge refreshes on ← Menu.
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000' }}>
      <TerugKnop onClick={onBack} style={{ zIndex: 9999 }} />
      <iframe
        src="/jetpack/"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Jetpack"
      />
      <OrientationGate />
    </div>
  )
}
