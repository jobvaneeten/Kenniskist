export default function JetpackGame({ onBack }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000' }}>
      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 200,
          background: 'rgba(0,0,0,0.75)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 8, padding: '6px 16px', cursor: 'pointer',
          fontSize: 14, fontFamily: 'inherit'
        }}
      >
        ← Menu
      </button>
      <iframe
        src="/jetpack/"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Jetpack"
      />
    </div>
  )
}
