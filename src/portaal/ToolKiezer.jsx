import { useState } from 'react'
import { VAKKEN, toolsVoorGroepen } from '../lib/tools.js'

// Kiest een concrete tool_id voor een nieuwe opdracht, in stapjes: eerst een
// vak, dan een oefening, en bij families met varianten (dictee, Duurzaam
// design) nog welk blok of welke les. Eerder stonden alle ~14 families
// onder elkaar met de varianten in uitklappertjes; dat is prima als je de
// tools kent, maar niet als je dit voor het eerst doet.
//
// Standaard gefilterd op de groepen van de klas (leeg = geen beperking, zie
// migratie 0006).
export default function ToolKiezer({ klasGroepen, onKies, onSluiten }) {
  const [toonAlles, setToonAlles] = useState(false)
  const [vak, setVak] = useState(null)
  const [familie, setFamilie] = useState(null)

  const families = toonAlles ? toolsVoorGroepen([]) : toolsVoorGroepen(klasGroepen)

  const omschrijving = (fam) => {
    const groepen = fam.groepen?.length ? `groep ${fam.groepen.join(', ')}` : 'alle groepen'
    const hoeveel = fam.eenheid === 'opgaven' ? `${fam.standaardAantal} opgaven (aan te passen)`
      : fam.eenheid === 'woorden' ? `${fam.standaardAantal} woorden (aan te passen)`
      : 'vaste oefening, 1 keer maken'
    return `${groepen} · ${hoeveel}`
  }

  const kop = (titel, terug) => (
    <div className="portaal-sectiekop">
      <div>
        <h2 style={{ margin: 0 }}>{titel}</h2>
        {terug && <button type="button" className="portaal-terug" style={{ padding: '4px 0 0' }} onClick={terug}>← een stap terug</button>}
      </div>
      <button type="button" className="portaal-knop portaal-knop-subtiel" onClick={onSluiten}>Sluiten</button>
    </div>
  )

  // Stap 3: welke variant (blok, les, level)
  if (familie) {
    return (
      <div className="portaal-kaart" style={{ marginTop: 10 }}>
        {kop(familie.label, () => setFamilie(null))}
        <p className="portaal-leeg" style={{ marginTop: 0 }}>Kies welke je klaarzet.</p>
        <div className="portaal-naamlijst">
          {familie.varianten.map(v => (
            <div key={v.toolId} className="portaal-naamrij">
              <button type="button" className="portaal-naamknop" onClick={() => onKies({ toolId: v.toolId, familie: familie.familie })}>
                <span className="portaal-naamknop-naam">{v.label}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Stap 2: welke oefening binnen het vak
  if (vak) {
    const vakFamilies = families.filter(f => f.vak === vak.key)
    return (
      <div className="portaal-kaart" style={{ marginTop: 10 }}>
        {kop(vak.label, () => setVak(null))}
        {vakFamilies.length === 0 && (
          <p className="portaal-leeg">
            Geen oefeningen voor dit vak binnen groep {klasGroepen?.join(', ')}.{' '}
            <button type="button" className="portaal-minilink" onClick={() => setToonAlles(true)}>Toon alle groepen</button>
          </p>
        )}
        <div className="portaal-oefenkaarten">
          {vakFamilies.map(fam => (
            <button
              key={fam.familie} type="button" className="portaal-oefenkaart"
              onClick={() => fam.varianten ? setFamilie(fam) : onKies({ toolId: fam.toolId, familie: fam.familie })}
            >
              <span className="portaal-oefenkaart-naam">{fam.label}</span>
              <span className="portaal-zacht">{omschrijving(fam)}</span>
              {fam.varianten && <span className="portaal-zacht">{fam.varianten.length} varianten →</span>}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Stap 1: welk vak
  const metAantal = VAKKEN.map(v => ({ ...v, aantal: families.filter(f => f.vak === v.key).length }))
  return (
    <div className="portaal-kaart" style={{ marginTop: 10 }}>
      {kop('Voor welk vak?', null)}
      {!toonAlles && klasGroepen?.length > 0 && (
        <p className="portaal-leeg" style={{ marginTop: 0 }}>
          Je ziet de oefeningen voor groep {klasGroepen.join(', ')} van deze klas.{' '}
          <button type="button" className="portaal-minilink" onClick={() => setToonAlles(true)}>Toon alle groepen</button>
        </p>
      )}
      <div className="portaal-naamlijst">
        {metAantal.map(v => (
          <div key={v.key} className="portaal-naamrij">
            <button type="button" className="portaal-naamknop" disabled={v.aantal === 0} onClick={() => setVak(v)}>
              <span className="portaal-naamknop-naam">{v.label}</span>
              <span className="portaal-zacht">
                {v.aantal === 0 ? 'niets voor deze groep' : `${v.aantal} ${v.aantal === 1 ? 'oefening' : 'oefeningen'}`}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
