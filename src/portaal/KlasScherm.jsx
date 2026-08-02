import { useMemo, useState } from 'react'
import DatumFilter from './DatumFilter.jsx'
import HerkomstFilter from './HerkomstFilter.jsx'
import { useKlasGegevens, vatKlasSamen } from './klasGegevens.js'
import { filterHerkomst } from './resultaatHelpers.js'
import { toolLabel } from '../lib/tools.js'
import KlasDashboard from './KlasDashboard.jsx'
import LeerlingLijst from './LeerlingLijst.jsx'
import OefeningLijst from './OefeningLijst.jsx'
import OefeningDetail from './OefeningDetail.jsx'
import LeerlingDetail from './LeerlingDetail.jsx'
import WeektaakTab from './WeektaakTab.jsx'

const TABS = [
  { key: 'overzicht', label: 'Overzicht', hint: 'signalen' },
  { key: 'leerlingen', label: 'Leerlingen', hint: 'wie deed wat' },
  { key: 'oefeningen', label: 'Oefeningen', hint: 'per vak' },
  { key: 'weektaak', label: 'Weektaak', hint: 'af of niet' },
]

// Eén klas, vier pagina's. De filters (periode en herkomst) staan bovenaan en
// gelden voor het hele scherm; daarvoor had elk tabblad zijn eigen filter en
// zijn eigen fetch, wat betekende dat "deze week" op de ene pagina iets anders
// kon zijn dan op de andere.
//
// Een leerling of een oefening openen is geen tabblad maar een laag eroverheen:
// je komt er altijd vandaan uit een lijst en wilt terug naar diezelfde lijst.
export default function KlasScherm({ klas, alleKlassen, onBack }) {
  const [tab, setTab] = useState('overzicht')
  // Stapel van open drill-downs, zodat "oefening → leerling" een kruimelpad
  // wordt waarin je één stap terug kunt in plaats van meteen naar de lijst.
  const [pad, setPad] = useState([])   // [{ soort: 'leerling' | 'oefening', id }]
  const [bereik, setBereik] = useState('week')
  const [herkomst, setHerkomst] = useState('alles')

  const { leerlingen, rijen, herlaad } = useKlasGegevens(klas.id, bereik)
  const gefilterd = useMemo(() => filterHerkomst(rijen, herkomst), [rijen, herkomst])
  const samenvatting = useMemo(() => vatKlasSamen(leerlingen ?? [], gefilterd), [leerlingen, gefilterd])

  const detail = pad[pad.length - 1] ?? null
  const kiesLeerling = (id) => setPad([{ soort: 'leerling', id }])
  const kiesOefening = (id) => setPad([{ soort: 'oefening', id }])
  const openVanuitDetail = (stap) => setPad(p => [...p, stap])
  const naarTab = (key) => { setTab(key); setPad([]) }

  const kruimelNaam = (stap) => stap.soort === 'leerling'
    ? samenvatting.lijst.find(l => l.id === stap.id)?.weergavenaam ?? '…'
    : toolLabel(stap.id)

  const toontFilters = tab !== 'weektaak'
  const laden = leerlingen === null

  return (
    <div className="portaal">
      <div className="portaal-inhoud">
        <button className="portaal-terug" onClick={onBack}>← Alle klassen</button>

        <div className="portaal-klaskop">
          <div>
            <h1>{klas.naam}</h1>
            <p className="portaal-zacht">
              {klas.schooljaar ? `${klas.schooljaar} · ` : ''}
              {leerlingen?.length ?? '…'} leerlingen · inlogcode <strong>{klas.code}</strong>
            </p>
          </div>
          {toontFilters && (
            <div className="portaal-filters">
              <DatumFilter waarde={bereik} onChange={setBereik} />
              <HerkomstFilter waarde={herkomst} onChange={setHerkomst} />
            </div>
          )}
        </div>

        <nav className="portaal-tabs-nav">
          {TABS.map(t => (
            <button
              key={t.key}
              className={tab === t.key && !detail ? 'portaal-tab-knop actief' : 'portaal-tab-knop'}
              onClick={() => naarTab(t.key)}
            >
              {t.label}<span className="portaal-tab-hint">{t.hint}</span>
            </button>
          ))}
        </nav>

        {detail && (
          <div className="portaal-kruimels">
            <button onClick={() => setPad([])}>{TABS.find(t => t.key === tab).label}</button>
            {pad.map((stap, i) => (
              <span key={`${stap.soort}-${stap.id}`} className="portaal-kruimels">
                <span>›</span>
                {i === pad.length - 1
                  ? <strong>{kruimelNaam(stap)}</strong>
                  : <button onClick={() => setPad(p => p.slice(0, i + 1))}>{kruimelNaam(stap)}</button>}
              </span>
            ))}
          </div>
        )}

        {laden && <p className="portaal-leeg">Laden…</p>}

        {!laden && leerlingen.length === 0 && tab !== 'weektaak' && (
          <div className="portaal-kaart"><p className="portaal-leeg">Nog geen leerlingen in deze klas.</p></div>
        )}

        {!laden && leerlingen.length > 0 && detail?.soort === 'leerling' && (
          <LeerlingDetail leerlingId={detail.id} bereik={bereik} herkomst={herkomst} />
        )}

        {!laden && leerlingen.length > 0 && detail?.soort === 'oefening' && (
          <OefeningDetail
            toolId={detail.id} samenvatting={samenvatting} rijen={gefilterd}
            onKiesLeerling={(id) => openVanuitDetail({ soort: 'leerling', id })}
          />
        )}

        {!laden && leerlingen.length > 0 && !detail && tab === 'overzicht' && (
          <KlasDashboard
            samenvatting={samenvatting} rijen={gefilterd}
            onKiesLeerling={kiesLeerling} onKiesOefening={kiesOefening}
            onNaarLeerlingen={() => naarTab('leerlingen')}
          />
        )}

        {!laden && leerlingen.length > 0 && !detail && tab === 'leerlingen' && (
          <LeerlingLijst
            klas={klas} alleKlassen={alleKlassen} samenvatting={samenvatting}
            onKiesLeerling={kiesLeerling} onKiesOefening={kiesOefening} onGewijzigd={herlaad}
          />
        )}

        {!laden && leerlingen.length > 0 && !detail && tab === 'oefeningen' && (
          <OefeningLijst samenvatting={samenvatting} onKiesOefening={kiesOefening} />
        )}

        {!detail && tab === 'weektaak' && <WeektaakTab klas={klas} onKiesLeerling={kiesLeerling} />}
      </div>
    </div>
  )
}
