import { useState } from 'react'
import { onderdelenVan, HEEFT_ROUTE, GROEPEN } from '../games/redactiesommen.js'

// Speciale config-editor voor verhaaltjessommen — kan niet generiek via
// OpdrachtRij's configVelden: welke doelen geldig zijn hangt cascaderend af
// van de gekozen groep + route, dat is geen vaste optielijst. Hergebruikt
// dezelfde onderdelenVan() als het spel zelf, dus de leerkracht ziet exact
// dezelfde doelen/blokken als de leerling straks te kiezen zou krijgen.
export default function VerhaaltjesSommenConfig({ config, onWijzig }) {
  const groep = Number(config?.groep) || 7
  const heeftRoute = HEEFT_ROUTE(groep)
  const route = heeftRoute ? (config?.route || 'FS') : null
  const [mode, setMode] = useState('leerlijn')
  const gekozen = new Set(config?.doelen ?? [])

  const onderdelen = onderdelenVan(groep, route, mode)

  const zetGroep = (g) => onWijzig({ ...config, groep: g, route: HEEFT_ROUTE(g) ? 'FS' : null, doelen: [] })
  const zetRoute = (r) => onWijzig({ ...config, route: r, doelen: [] })

  const toggelDoel = (key) => {
    const s = new Set(gekozen)
    s.has(key) ? s.delete(key) : s.add(key)
    onWijzig({ ...config, groep, route, doelen: [...s] })
  }
  const toggelBlok = (onderdeel) => {
    const keys = onderdeel.gens.map(g => g.key)
    const allesAan = keys.every(k => gekozen.has(k))
    const s = new Set(gekozen)
    keys.forEach(k => allesAan ? s.delete(k) : s.add(k))
    onWijzig({ ...config, groep, route, doelen: [...s] })
  }

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', fontWeight: 700, maxWidth: 140 }}>
          Groep
          <select value={groep} onChange={e => zetGroep(Number(e.target.value))}>
            {GROEPEN.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        {heeftRoute && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.82rem', fontWeight: 700, maxWidth: 140 }}>
            Route
            <select value={route} onChange={e => zetRoute(e.target.value)}>
              <option value="FS">FS</option>
              <option value="S+">S+</option>
            </select>
          </label>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className={mode === 'leerlijn' ? 'portaal-tab-knop actief' : 'portaal-tab-knop'}
          onClick={() => setMode('leerlijn')}
        >Per leerlijn</button>
        <button
          type="button"
          className={mode === 'blok' ? 'portaal-tab-knop actief' : 'portaal-tab-knop'}
          onClick={() => setMode('blok')}
        >Per blok</button>
      </div>

      <p className="portaal-leeg" style={{ margin: 0 }}>
        Leeg = alle doelen van deze groep/route (zonder herhaling uit eerdere groepen).
        Klik een sectie open om doelen aan te vinken.
      </p>

      {/* Eigen scrolvak i.p.v. de hele pagina laten meegroeien — met alle
          secties dichtgeklapt past dit meestal zonder scrollen; met een paar
          openstaande secties (bv. groep 8 met drie herhaal-groepen) blijft
          de rest van het formulier binnen bereik. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
        {onderdelen.map(onderdeel => {
          const keys = onderdeel.gens.map(g => g.key)
          const aantalAan = keys.filter(k => gekozen.has(k)).length
          const vink = aantalAan === keys.length && keys.length ? '☑' : aantalAan > 0 ? '◪' : '☐'
          return (
            <details key={onderdeel.key} className="portaal-vak-chip" style={{ padding: '8px 12px' }}>
              <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.85rem' }}>
                <span>{onderdeel.label}</span>
                <span style={{ opacity: 0.65, fontWeight: 700 }}>{aantalAan}/{keys.length}</span>
              </summary>
              <button
                type="button"
                onClick={() => toggelBlok(onderdeel)}
                className="portaal-knop portaal-knop-subtiel"
                style={{ marginTop: 8, fontSize: '0.72rem', padding: '4px 10px' }}
              >{vink} alles aan/uit</button>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                {onderdeel.gens.map(g => (
                  <label key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', opacity: g.herhaling ? 0.6 : 1, maxWidth: 260 }}>
                    <input type="checkbox" checked={gekozen.has(g.key)} onChange={() => toggelDoel(g.key)} />
                    {g.doel}
                  </label>
                ))}
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
