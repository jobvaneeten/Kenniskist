import OrientationGate from '../OrientationGate'

export default function AstroKatapultGame({ onBack, reward = false }) {
  // Volledige game (eigen level-keuze). Voortgang staat in localStorage van het spel zelf.
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#060611' }}>
      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 200,
          background: 'rgba(14,16,48,0.82)', color: '#dfe3ff',
          border: '1px solid rgba(120,130,220,0.3)',
          borderRadius: 12, padding: '8px 16px', cursor: 'pointer',
          fontSize: 14, fontFamily: 'inherit', fontWeight: 700
        }}
      >
        ← Menu
      </button>
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
