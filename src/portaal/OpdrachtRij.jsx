import { TOOL_BY_ID, VAKKEN } from '../lib/tools.js'
import VerhaaltjesSommenConfig from './VerhaaltjesSommenConfig.jsx'

// Eén opdrachtregel binnen een weektaak-formulier: wat de leerling gaat doen,
// hoeveel, en de instellingen van die tool. `opdracht` is het lokale
// conceptobject { id?, toolId, aantal, config }; `onWijzig` krijgt steeds de
// volledige bijgewerkte opdracht terug.
//
// De configvelden komen uit TOOL_BY_ID[toolId].configVelden. Bij spelling zijn
// dat er bijna vijftig, dus die lijst heeft knoppen om alles of niets aan te
// vinken en toont hoeveel er gekozen zijn — anders zit je te scrollen zonder
// te weten waar je bent.
export default function OpdrachtRij({ opdracht, nummer, onWijzig, onVerwijder }) {
  const info = TOOL_BY_ID[opdracht.toolId]
  if (!info) return null

  const vakLabel = VAKKEN.find(v => v.key === info.vak)?.label ?? 'Overig'
  const aantal = opdracht.aantal ?? info.standaardAantal

  const zetAantal = (v) => onWijzig({ ...opdracht, aantal: v === '' ? null : Math.max(1, parseInt(v, 10) || 1) })
  const zetConfig = (key, waarde) => onWijzig({ ...opdracht, config: { ...opdracht.config, [key]: waarde } })

  const toggelCheckbox = (key, optie) => {
    const huidig = new Set(opdracht.config?.[key] ?? [])
    huidig.has(optie) ? huidig.delete(optie) : huidig.add(optie)
    zetConfig(key, [...huidig])
  }

  // Wat de leerling straks te zien krijgt, in gewone taal.
  const eenheidNaam = info.eenheid === 'opgaven' ? 'opgaven' : info.eenheid === 'woorden' ? 'woorden' : null
  const samenvatting = eenheidNaam
    ? `${aantal} ${eenheidNaam}`
    : aantal > 1 ? `${aantal} keer maken` : '1 keer maken'

  return (
    <div className="portaal-opdracht">
      <div className="portaal-opdracht-kop">
        <span className="portaal-opdracht-nr">{nummer}</span>
        <div className="portaal-opdracht-titel">
          <strong>{info.label}</strong>
          <span className="portaal-zacht">{vakLabel} · {samenvatting}</span>
        </div>
        <button type="button" className="portaal-knop portaal-knop-subtiel" onClick={onVerwijder}>Verwijderen</button>
      </div>

      <div className="portaal-opdracht-velden">
        {info.aantalInstelbaar && (
          <label className="portaal-veld">
            <span className="portaal-veld-label">{eenheidNaam ? `Aantal ${eenheidNaam}` : 'Hoe vaak maken'}</span>
            <input type="number" min={1} value={aantal} onChange={e => zetAantal(e.target.value)} />
            <span className="portaal-veld-hint">
              {eenheidNaam
                ? 'De oefening stopt vanzelf na dit aantal.'
                : 'Zo vaak moet de leerling deze oefening doen.'}
            </span>
          </label>
        )}

        {info.familie === 'verhaaltjessommen' && (
          <VerhaaltjesSommenConfig
            config={opdracht.config}
            onWijzig={cfg => onWijzig({ ...opdracht, config: cfg })}
          />
        )}

        {info.configVelden.map(veld => {
          if (veld.type === 'getal') {
            return (
              <label key={veld.key} className="portaal-veld">
                <span className="portaal-veld-label">{veld.label}</span>
                <input
                  type="number" min={veld.min ?? 1} max={veld.max}
                  placeholder={veld.placeholder}
                  value={opdracht.config?.[veld.key] ?? ''}
                  onChange={e => zetConfig(veld.key, e.target.value === '' ? null : Math.max(veld.min ?? 1, parseInt(e.target.value, 10) || 1))}
                />
                {veld.hint && <span className="portaal-veld-hint">{veld.hint}</span>}
              </label>
            )
          }

          if (veld.type === 'bool') {
            return (
              <label key={veld.key} className="portaal-vinkje" style={{ alignSelf: 'flex-start' }}>
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
              <label key={veld.key} className="portaal-veld">
                <span className="portaal-veld-label">{veld.label}</span>
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
          const alleWaarden = veld.opties.map(o => (typeof o === 'string' ? o : o.value))
          return (
            <div key={veld.key} className="portaal-veld portaal-veld-breed">
              <div className="portaal-veld-kop">
                <span className="portaal-veld-label">{veld.label}</span>
                <span className="portaal-zacht">
                  {gekozen.size === 0 ? 'niets gekozen' : `${gekozen.size} van ${alleWaarden.length}`}
                  {' · '}
                  <button type="button" className="portaal-minilink" onClick={() => zetConfig(veld.key, alleWaarden)}>alles</button>
                  {' · '}
                  <button type="button" className="portaal-minilink" onClick={() => zetConfig(veld.key, [])}>niets</button>
                </span>
              </div>
              <div className="portaal-keuzevakjes">
                {veld.opties.map(o => {
                  const waarde = typeof o === 'string' ? o : o.value
                  const weergave = typeof o === 'string' ? o : o.label
                  return (
                    <label key={waarde} className={gekozen.has(waarde) ? 'portaal-vakje aan' : 'portaal-vakje'}>
                      <input type="checkbox" checked={gekozen.has(waarde)} onChange={() => toggelCheckbox(veld.key, waarde)} />
                      {weergave}
                    </label>
                  )
                })}
              </div>
              {veld.min > 0 && gekozen.size < veld.min && (
                <p className="portaal-fout" style={{ marginTop: 4 }}>Kies er minstens {veld.min}.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
