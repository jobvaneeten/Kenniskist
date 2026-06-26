export default function EngelsOefenen({ onBack }) {
  // Engelse woordjes (RONDÉ Song 7, 8 & 9). Volledige quiz draait in /engels/,
  // gestyld in het Kenniskist-thema. Voortgang is per sessie (geen opslag nodig).
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#0d0d1a' }}>
      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 200,
          background: 'rgba(13,13,26,0.82)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.22)',
          borderRadius: 12, padding: '8px 16px', cursor: 'pointer',
          fontSize: 14, fontFamily: "'Nunito', sans-serif", fontWeight: 800,
        }}
      >
        ← Menu
      </button>
      <iframe
        src="/engels/"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Engelse woordjes — Song 7, 8 & 9"
      />
    </div>
  )
}
