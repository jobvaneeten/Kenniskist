import { TOOL_BY_ID } from '../lib/tools.js'
import VerhaaltjesSommenConfig from './VerhaaltjesSommenConfig.jsx'

// Eén opdrachtregel binnen een weektaak-formulier: toollabel, aantal (alleen
// als de tool dat toestaat) en een generieke config-editor gedreven door
// TOOL_BY_ID[toolId].configVelden. `opdracht` is het lokale conceptobject
// { id?, toolId, aantal, config }; `onWijzig` krijgt steeds de volledige
// bijgewerkte opdracht terug.
export default function OpdrachtRij({ opdracht, onWijzig, onVerwijder }) {
  const info = TOOL_BY_ID[opdracht.toolId]
  if (!info) return null

  const zetAantal = (v) => onWijzig({ ...opdracht, aantal: v === '' ? null : Math.max(1, parseInt(v, 10) || 1) })
  const zetConfig = (key, waarde) => onWijzig({ ...opdracht, config: { ...opdracht.config, [key]: waarde } })

  const toggelCheckbox = (key, optie) => {
    const huidig = new Set(opdracht.config?.[key] ?? [])
    huidig.has(optie) ? huidig.delete(optie) : huidig.add(optie)
    zetConfig(key, [...huidig])
  }

  return (
    <div className="portaal-kaart" style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <strong>{info.label}</strong>
        <button type="button" className="portaal-knop portaal-knop-subtiel" onClick={onVerwijder}>Verwijderen</button>
      </div>

      {info.aantalInstelbaar && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', fontWeight: 700, marginTop: 10, maxWidth: 160 }}>
          Aantal {info.eenheid === 'opgaven' ? 'opgaven' : 'keer'}
          <input
            type="number" min={1}
            value={opdracht.aantal ?? info.standaardAantal}
            onChange={e => zetAantal(e.target.value)}
          />
        </label>
      )}

      {info.familie === 'verhaaltjessommen' && (
        <VerhaaltjesSommenConfig
          config={opdracht.config}
          onWijzig={cfg => onWijzig({ ...opdracht, config: cfg })}
        />
      )}

      {info.configVelden.map(veld => {
        if (veld.type === 'bool') {
          return (
            <label key={veld.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: '0.85rem', fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={!!opdracht.config?.[veld.key]}
                onChange={e => zetConfig(veld.key, e.target.checked)}
              />
              {veld.label}
            </label>
          )
        }
        if (veld.type === 'keuze') {
          return (
            <label key={veld.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', fontWeight: 700, marginTop: 10, maxWidth: 200 }}>
              {veld.label}
              <select value={opdracht.config?.[veld.key] ?? ''} onChange={e => zetConfig(veld.key, e.target.value)}>
                <option value="">— kies —</option>
                {veld.opties.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          )
        }
        // checkboxes — opties zijn strings, of { value, label } als de
        // opgeslagen waarde (bv. een categorie-id) niet leesbaar genoeg is
        // om ook als label te tonen (zie dictee-categorie in tools.js).
        const gekozen = new Set(opdracht.config?.[veld.key] ?? [])
        return (
          <div key={veld.key} style={{ marginTop: 10 }}>
            <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 4 }}>{veld.label}</span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', maxHeight: 220, overflowY: 'auto' }}>
              {veld.opties.map(o => {
                const waarde = typeof o === 'string' ? o : o.value
                const weergave = typeof o === 'string' ? o : o.label
                return (
                  <label key={waarde} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                    <input type="checkbox" checked={gekozen.has(waarde)} onChange={() => toggelCheckbox(veld.key, waarde)} />
                    {weergave}
                  </label>
                )
              })}
            </div>
            {veld.min > 0 && gekozen.size < veld.min && (
              <p className="portaal-fout" style={{ marginTop: 4 }}>Kies er minstens {veld.min}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
