import { useState } from 'react'
import { VAKKEN, toolsVoorGroepen } from '../lib/tools.js'

// Kiest een concrete tool_id voor een nieuwe opdracht. Standaard gefilterd
// op de groepen van de klas (leeg = geen beperking, zie migratie 0006) —
// zonder dat filter is de lijst van ~14 tool-families onwerkbaar.
export default function ToolKiezer({ klasGroepen, onKies, onSluiten }) {
  const [toonAlles, setToonAlles] = useState(false)
  const families = toonAlles ? toolsVoorGroepen([]) : toolsVoorGroepen(klasGroepen)

  const kies = (fam, variant) => {
    if (variant) {
      onKies({ toolId: variant.toolId, familie: fam.familie })
    } else {
      onKies({ toolId: fam.toolId, familie: fam.familie })
    }
  }

  return (
    <div className="portaal-kaart" style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Kies een oefening</h2>
        <button type="button" className="portaal-knop portaal-knop-subtiel" onClick={onSluiten}>Sluiten</button>
      </div>
      {!toonAlles && klasGroepen?.length > 0 && (
        <p className="portaal-leeg" style={{ marginBottom: 10 }}>
          Gefilterd op groep {klasGroepen.join(', ')} van deze klas.{' '}
          <button type="button" className="portaal-knop portaal-knop-subtiel" onClick={() => setToonAlles(true)}>Toon alle groepen</button>
        </p>
      )}
      {VAKKEN.map(vak => {
        const vakFamilies = families.filter(f => f.vak === vak.key)
        if (vakFamilies.length === 0) return null
        return (
          <div key={vak.key} style={{ marginBottom: 14 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>{vak.label}</h3>
            <div className="portaal-grid">
              {vakFamilies.map(fam => (
                fam.varianten
                  ? (
                    <details key={fam.familie} className="portaal-vak-chip" style={{ padding: 10 }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 800 }}>{fam.label}</summary>
                      <div className="portaal-grid" style={{ marginTop: 8 }}>
                        {fam.varianten.map(v => (
                          <button key={v.toolId} type="button" className="portaal-vak-chip" onClick={() => kies(fam, v)}>{v.label}</button>
                        ))}
                      </div>
                    </details>
                  )
                  : <button key={fam.familie} type="button" className="portaal-vak-chip" onClick={() => kies(fam, null)}>{fam.label}</button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
