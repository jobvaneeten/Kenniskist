import { Component } from 'react'
import { herlaadEenKeer } from './lib/herladen.js'

// Vangnet om de hele site: gaat er tijdens het tekenen iets mis, dan geen
// zwart scherm maar een melding met een knop om opnieuw te laden.
// Is de oorzaak een stukje site dat niet meer bestaat (de site is net
// vernieuwd terwijl het tabblad openstond), dan meteen één keer herladen.

const OUDE_VERSIE = /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i

export default class Vangnet extends Component {
  state = { fout: null }

  static getDerivedStateFromError(fout) { return { fout } }

  componentDidCatch(fout) {
    console.error('Er ging iets mis:', fout)
    if (OUDE_VERSIE.test(String(fout?.message || fout))) herlaadEenKeer()
  }

  render() {
    if (!this.state.fout) return this.props.children
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, color: 'var(--kk-text, #fff)', textAlign: 'center' }}>
        <div style={{ maxWidth: 420, display: 'grid', gap: 14, justifyItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Oeps, er ging iets mis</h1>
          <p style={{ margin: 0, color: 'var(--kk-text-soft, #bbb)', lineHeight: 1.45 }}>
            Laad de pagina opnieuw. Blijft dit gebeuren, vertel dan wat je aan het doen was.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ font: 'inherit', fontWeight: 800, padding: '12px 22px', borderRadius: 12, border: 0, cursor: 'pointer', background: 'var(--kk-primary, #7c3aed)', color: '#fff' }}
          >
            Opnieuw laden
          </button>
        </div>
      </div>
    )
  }
}
