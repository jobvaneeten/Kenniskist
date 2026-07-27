// Gedeeld eindscherm voor tools die via gebruikOpdracht.js rapporteren.
// Gebruikt alleen game.css-klassen (al geladen via toolRender.jsx) — geen
// eigen stylesheet nodig.
export default function OpdrachtKlaarScherm({ goed, aantal, opslaanMislukt, onBack }) {
  return (
    <div className="game-screen game-screen-center">
      <div className="game-header">
        <span className="game-header-icon">🎉</span>
        <h1 className="game-header-title">{goed} / {aantal}</h1>
        <p className="game-header-sub">goed beantwoord — laat dit aan je juf of meester zien!</p>
      </div>
      {opslaanMislukt && (
        <p style={{ color: '#fca5a5', fontWeight: 700, textAlign: 'center' }}>
          ⚠️ Je resultaat kon niet worden opgeslagen — laat dit scherm zien.
        </p>
      )}
      <button className="back-btn" onClick={onBack}>← Terug naar weektaak</button>
    </div>
  )
}
