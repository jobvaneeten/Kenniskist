import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import LeerlingLijst from './LeerlingLijst.jsx'
import LeerlingDetail from './LeerlingDetail.jsx'
import WeektaakTab from './WeektaakTab.jsx'
import Werkblad from './Werkblad.jsx'
import { TerugKnop } from '../ui/index.jsx'

// De leerkracht ziet alleen wat hij zelf klaarzet: de weektaak voor de klas en
// de taken en doelen per leerling ("Speciaal voor mij" aan de leerlingkant).
// Wat kinderen daarnaast vrij oefenen blijft bewust buiten beeld. Leerlingen
// staat er alleen voor beheer (inloggegevens, wachtwoord, verplaatsen).
const TABS = [
  { key: 'weektaak', label: 'Weektaak', hint: 'hele klas' },
  { key: 'taak', label: 'Taken', hint: 'per leerling' },
  { key: 'doel', label: 'Doelen', hint: 'per leerling' },
  { key: 'werkblad', label: 'Werkblad', hint: 'printen' },
  { key: 'leerlingen', label: 'Leerlingen', hint: 'inloggen & beheer' },
]

export default function KlasScherm({ klas, alleKlassen, onBack }) {
  const [tab, setTab] = useState('weektaak')
  const [leerlingId, setLeerlingId] = useState(null)
  const [leerlingen, setLeerlingen] = useState(null)
  const [teller, setTeller] = useState(0)

  useEffect(() => {
    let actief = true
    supabase.from('profielen').select('id, weergavenaam, gebruikersnaam')
      .eq('klas_id', klas.id).eq('rol', 'leerling').order('weergavenaam')
      .then(({ data }) => { if (actief) setLeerlingen(data ?? []) })
    return () => { actief = false }
  }, [klas.id, teller])

  const herlaad = useCallback(() => setTeller(t => t + 1), [])
  const naarTab = (key) => { setTab(key); setLeerlingId(null) }
  const naam = leerlingen?.find(l => l.id === leerlingId)?.weergavenaam ?? '…'

  return (
    <div className="portaal">
      <div className="portaal-inhoud">
        <TerugKnop vast={false} onClick={onBack}>Alle klassen</TerugKnop>

        <div className="portaal-klaskop">
          <div>
            <h1>{klas.naam}</h1>
            <p className="portaal-zacht">
              {klas.schooljaar ? `${klas.schooljaar} · ` : ''}
              {leerlingen?.length ?? '…'} leerlingen · inlogcode <strong>{klas.code}</strong>
            </p>
          </div>
        </div>

        <nav className="portaal-tabs-nav">
          {TABS.map(t => (
            <button
              key={t.key}
              className={tab === t.key && !leerlingId ? 'portaal-tab-knop actief' : 'portaal-tab-knop'}
              onClick={() => naarTab(t.key)}
            >
              {t.label}<span className="portaal-tab-hint">{t.hint}</span>
            </button>
          ))}
        </nav>

        {leerlingId && (
          <>
            <div className="portaal-kruimels">
              <button onClick={() => setLeerlingId(null)}>{TABS.find(t => t.key === tab)?.label}</button>
              <span>›</span>
              <strong>{naam}</strong>
            </div>
            <LeerlingDetail leerlingId={leerlingId} />
          </>
        )}

        {!leerlingId && tab === 'leerlingen' && (
          leerlingen === null
            ? <p className="portaal-leeg">Laden…</p>
            : leerlingen.length === 0
              ? <div className="portaal-kaart"><p className="portaal-leeg">Nog geen leerlingen in deze klas.</p></div>
              : <LeerlingLijst
                  klas={klas} alleKlassen={alleKlassen} leerlingen={leerlingen}
                  onKiesLeerling={setLeerlingId} onGewijzigd={herlaad}
                />
        )}

        {!leerlingId && tab === 'werkblad' && <Werkblad klas={klas} />}

        {!leerlingId && !['leerlingen', 'werkblad'].includes(tab) && (
          <WeektaakTab key={tab} klas={klas} soort={tab} onKiesLeerling={setLeerlingId} />
        )}
      </div>
    </div>
  )
}
