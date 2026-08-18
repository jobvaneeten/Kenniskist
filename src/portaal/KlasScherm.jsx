import { useMemo, useState } from 'react'
import DatumFilter from './DatumFilter.jsx'
import HerkomstFilter from './HerkomstFilter.jsx'
import { useKlasGegevens, vatKlasSamen } from './klasGegevens.js'
import { filterHerkomst } from './resultaatHelpers.js'
import { VAKKEN, toolLabel, toolVak } from '../lib/tools.js'
import KlasDashboard from './KlasDashboard.jsx'
import LeerlingLijst from './LeerlingLijst.jsx'
import VakLijst from './VakLijst.jsx'
import OefeningLijst from './OefeningLijst.jsx'
import OefeningDetail from './OefeningDetail.jsx'
import LeerlingDetail from './LeerlingDetail.jsx'
import WeektaakTab from './WeektaakTab.jsx'

const TABS = [
  { key: 'overzicht', label: 'Groepsoverzicht', hint: 'de hele klas' },
  { key: 'leerlingen', label: 'Per leerling', hint: 'wie deed wat' },
  { key: 'oefeningen', label: 'Per vak', hint: 'wat is geoefend' },
  { key: 'weektaak', label: 'Weektaak', hint: 'af of niet' },
]

// Keuzescherm bij het openen van een klas. Zonder deze stap landde je altijd
// op het groepsoverzicht en moest je zelf ontdekken dat de andere invalshoeken
// achter de tabbladen zaten; nu kies je eerst bewust waar je naar kijkt. De
// getallen op de kaarten komen uit dezelfde samenvatting als de schermen zelf,
// dus je ziet vooraf al of er iets te halen valt.
function KlasKeuze({ samenvatting, aantalLeerlingen, onKies }) {
  const { totaal, tools, lijst } = samenvatting
  const aandacht = lijst.filter(l => l.opgaven === 0 || (l.pct !== null && l.pct < 60)).length
  const vakken = new Set(tools.map(t => toolVak(t.toolId) ?? 'overig')).size

  const kaarten = [
    {
      key: 'overzicht', titel: 'Groepsoverzicht',
      uitleg: 'Hoe staat de klas ervoor en wie heeft je nodig?',
      // Zonder werk in deze periode zou "12 vragen aandacht" onzin zijn: dan
      // telt iedereen mee omdat niemand iets gemaakt heeft.
      stat: totaal.opgaven === 0
        ? 'er is in deze periode niet geoefend'
        : `${totaal.pct}% goed · ${aandacht === 0 ? 'niemand valt op' : `${aandacht} ${aandacht === 1 ? 'vraagt' : 'vragen'} aandacht`}`,
    },
    {
      key: 'leerlingen', titel: 'Per leerling',
      uitleg: 'Eén regel per kind: wanneer, hoeveel en hoe goed.',
      stat: `${aantalLeerlingen} leerlingen · ${totaal.actief} actief in deze periode`,
    },
    {
      key: 'oefeningen', titel: 'Per vak',
      uitleg: 'Wat is er geoefend en hoe ging het per oefening?',
      stat: tools.length === 0
        ? 'geen oefeningen in deze periode'
        : `${vakken} ${vakken === 1 ? 'vak' : 'vakken'} · ${tools.length} ${tools.length === 1 ? 'oefening' : 'oefeningen'}`,
    },
    {
      key: 'weektaak', titel: 'Weektaak',
      uitleg: 'Wie heeft de opdrachten af en wie nog niet?',
      stat: 'opdrachten, voortgang en vrijstellingen',
    },
  ]

  return (
    <div className="portaal-kaart">
      <div className="portaal-sectiekop">
        <h2>Waar wil je naar kijken?</h2>
        <span className="portaal-zacht">je kunt daarna gewoon wisselen</span>
      </div>
      <div className="portaal-keuze-grid">
        {kaarten.map(k => (
          <button key={k.key} className="portaal-keuzekaart" onClick={() => onKies(k.key)}>
            <span className="portaal-keuzekaart-titel">{k.titel}</span>
            <span className="portaal-keuzekaart-uitleg">{k.uitleg}</span>
            <span className="portaal-zacht">{k.stat}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Eén klas, vier invalshoeken. De filters (periode en herkomst) staan bovenaan
// en gelden voor het hele scherm; daarvoor had elk tabblad zijn eigen filter en
// zijn eigen fetch, wat betekende dat "deze week" op de ene pagina iets anders
// kon zijn dan op de andere.
//
// Een leerling of een oefening openen is geen tabblad maar een laag eroverheen:
// je komt er altijd vandaan uit een lijst en wilt terug naar diezelfde lijst.
export default function KlasScherm({ klas, alleKlassen, onBack }) {
  const [tab, setTab] = useState(null)      // null = keuzescherm
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
  const kiesVak = (key) => setPad([{ soort: 'vak', id: key }])
  const openVanuitDetail = (stap) => setPad(p => [...p, stap])
  const naarTab = (key) => { setTab(key); setPad([]) }

  const kruimelNaam = (stap) => {
    if (stap.soort === 'leerling') return samenvatting.lijst.find(l => l.id === stap.id)?.weergavenaam ?? '…'
    if (stap.soort === 'vak') return VAKKEN.find(v => v.key === stap.id)?.label ?? 'Overig'
    return toolLabel(stap.id)
  }

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

        {tab && (
          <nav className="portaal-tabs-nav">
            <button className="portaal-tab-knop portaal-tab-keuze" onClick={() => naarTab(null)} title="Terug naar de keuze">
              ⌂<span className="portaal-tab-hint">keuze</span>
            </button>
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
        )}

        {detail && (
          <div className="portaal-kruimels">
            <button onClick={() => setPad([])}>{TABS.find(t => t.key === tab)?.label ?? 'Terug'}</button>
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

        {!laden && leerlingen.length > 0 && !detail && tab === null && (
          <KlasKeuze samenvatting={samenvatting} aantalLeerlingen={leerlingen.length} onKies={naarTab} />
        )}

        {!laden && leerlingen.length > 0 && detail?.soort === 'leerling' && (
          <LeerlingDetail leerlingId={detail.id} bereik={bereik} herkomst={herkomst} />
        )}

        {!laden && leerlingen.length > 0 && detail?.soort === 'vak' && (
          <OefeningLijst
            vak={detail.id} samenvatting={samenvatting}
            onKiesOefening={(id) => openVanuitDetail({ soort: 'oefening', id })}
          />
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
            onKiesLeerling={kiesLeerling} onGewijzigd={herlaad}
          />
        )}

        {!laden && leerlingen.length > 0 && !detail && tab === 'oefeningen' && (
          <VakLijst samenvatting={samenvatting} onKiesVak={kiesVak} />
        )}

        {!detail && tab === 'weektaak' && <WeektaakTab klas={klas} onKiesLeerling={kiesLeerling} />}
      </div>
    </div>
  )
}
