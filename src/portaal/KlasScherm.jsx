import { useState } from 'react'
import KlasTabel from './KlasTabel.jsx'
import VakTabel from './VakTabel.jsx'
import LeerlingDetail from './LeerlingDetail.jsx'
import WeektaakTab from './WeektaakTab.jsx'

// Eén klas, twee tabbladen: "Overzicht" (wie heeft gewerkt en hoe ging het) en
// "Weektaak". Vanuit het overzicht zijn er twee drill-downs die géén eigen tab
// zijn, omdat je er altijd vanaf het overzicht in komt en weer terug wilt:
// een leerling (detail met fouten) en een oefening (die ene oefening voor de
// hele klas). De tab-keuze blijft daarbij staan.
export default function KlasScherm({ klas, alleKlassen, onBack }) {
  const [tab, setTab] = useState('overzicht')   // 'overzicht' | 'weektaak'
  const [gekozenOefening, setGekozenOefening] = useState(null)
  const [gekozenLeerling, setGekozenLeerling] = useState(null)

  const kiesLeerling = (leerlingId) => {
    setGekozenLeerling(leerlingId)
    setGekozenOefening(null)
  }
  const naarOverzicht = () => { setGekozenLeerling(null); setGekozenOefening(null) }

  return (
    <div className="portaal">
      <div className="portaal-inhoud">
        <button className="portaal-terug" onClick={onBack}>← Terug naar klassen</button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ margin: 0 }}>{klas.naam}{klas.schooljaar ? ` — ${klas.schooljaar}` : ''}</h2>
          <div className="portaal-tabs-nav">
            <button
              className={tab === 'overzicht' ? 'portaal-tab-knop actief' : 'portaal-tab-knop'}
              onClick={() => { setTab('overzicht'); naarOverzicht() }}
            >Overzicht</button>
            <button
              className={tab === 'weektaak' ? 'portaal-tab-knop actief' : 'portaal-tab-knop'}
              onClick={() => { setTab('weektaak'); naarOverzicht() }}
            >Weektaak</button>
          </div>
        </div>

        {gekozenLeerling
          ? <LeerlingDetail leerlingId={gekozenLeerling} onBack={naarOverzicht} />
          : gekozenOefening
            ? <VakTabel klasId={klas.id} vak={gekozenOefening} onTerug={naarOverzicht} onKiesLeerling={kiesLeerling} />
            : tab === 'overzicht'
              ? <KlasTabel klas={klas} alleKlassen={alleKlassen} onKiesLeerling={kiesLeerling} onKiesOefening={setGekozenOefening} />
              : <WeektaakTab klas={klas} onKiesLeerling={kiesLeerling} />}
      </div>
    </div>
  )
}
