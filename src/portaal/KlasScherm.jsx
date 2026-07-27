import { useState } from 'react'
import KlasTabel from './KlasTabel.jsx'
import VakOverzicht from './VakOverzicht.jsx'
import VakTabel from './VakTabel.jsx'
import LeerlingDetail from './LeerlingDetail.jsx'
import WeektaakTab from './WeektaakTab.jsx'

// Eén klas: tabje "Per leerling" (klastabel) of "Per vak" (vak kiezen, dan
// alle leerlingen van déze klas op dat vak — met datumfilter). Een leerling
// kiezen — vanuit welke tab dan ook — blijft binnen dit scherm: het
// schakelt naar de leerling-tab en toont het detail daar, zodat de
// klas/vak-keuze niet verloren gaat als je terug gaat.
export default function KlasScherm({ klas, alleKlassen, onBack }) {
  const [tab, setTab] = useState('leerlingen') // 'leerlingen' | 'vakken' | 'weektaak'
  const [gekozenVak, setGekozenVak] = useState(null)
  const [gekozenLeerling, setGekozenLeerling] = useState(null)

  const kiesLeerling = (leerlingId) => {
    setGekozenLeerling(leerlingId)
    setTab('leerlingen')
  }

  return (
    <div className="portaal">
      <div className="portaal-inhoud">
        <button className="portaal-terug" onClick={onBack}>← Terug naar klassen</button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ margin: 0 }}>{klas.naam}{klas.schooljaar ? ` — ${klas.schooljaar}` : ''}</h2>
          <div className="portaal-tabs-nav">
            <button
              className={tab === 'leerlingen' ? 'portaal-tab-knop actief' : 'portaal-tab-knop'}
              onClick={() => { setTab('leerlingen'); setGekozenLeerling(null) }}
            >Per leerling</button>
            <button
              className={tab === 'vakken' ? 'portaal-tab-knop actief' : 'portaal-tab-knop'}
              onClick={() => { setTab('vakken'); setGekozenVak(null); setGekozenLeerling(null) }}
            >Per vak</button>
            <button
              className={tab === 'weektaak' ? 'portaal-tab-knop actief' : 'portaal-tab-knop'}
              onClick={() => { setTab('weektaak'); setGekozenVak(null); setGekozenLeerling(null) }}
            >Weektaak</button>
          </div>
        </div>

        {tab === 'leerlingen' && (
          gekozenLeerling
            ? <LeerlingDetail leerlingId={gekozenLeerling} onBack={() => setGekozenLeerling(null)} />
            : <KlasTabel klas={klas} alleKlassen={alleKlassen} onKiesLeerling={kiesLeerling} />
        )}
        {tab === 'vakken' && (
          gekozenVak
            ? <VakTabel klasId={klas.id} vak={gekozenVak} onTerug={() => setGekozenVak(null)} onKiesLeerling={kiesLeerling} />
            : <VakOverzicht onKiesVak={setGekozenVak} />
        )}
        {tab === 'weektaak' && <WeektaakTab klas={klas} onKiesLeerling={kiesLeerling} />}
      </div>
    </div>
  )
}
