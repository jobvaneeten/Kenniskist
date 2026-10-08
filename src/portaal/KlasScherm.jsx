import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import LeerlingLijst from './LeerlingLijst.jsx'
import LeerlingDetail from './LeerlingDetail.jsx'
import WeektaakTab from './WeektaakTab.jsx'
import Werkblad from './Werkblad.jsx'
import KlasWeekoverzicht from './KlasWeekoverzicht.jsx'
import { TerugKnop, Icoon } from '../ui/index.jsx'

// De leerkracht ziet alleen wat hij zelf klaarzet: de weektaak voor de klas en
// de taken en doelen per leerling ("Speciaal voor mij" aan de leerlingkant).
// Wat kinderen daarnaast vrij oefenen blijft bewust buiten beeld. Leerlingen
// staat er alleen voor beheer (inloggegevens, wachtwoord, verplaatsen).
const TABS = [
  { key: 'weektaak', label: 'Weektaak', hint: 'hele klas', icoon: 'klembord', accent: 'var(--kk-cyan)' },
  { key: 'taak', label: 'Taken', hint: 'per leerling', icoon: 'potlood', accent: 'var(--kk-pink)' },
  { key: 'doel', label: 'Doelen', hint: 'per leerling', icoon: 'doel', accent: 'var(--kk-gold)' },
  { key: 'week', label: 'Weekoverzicht', hint: 'per leerling', icoon: 'grafiek', accent: 'var(--kk-primary-hi)' },
  { key: 'werkblad', label: 'Werkblad', hint: 'printen', icoon: 'printer', accent: 'var(--kk-success)' },
  { key: 'leerlingen', label: 'Leerlingen', hint: 'inloggen & beheer', icoon: 'mensen', accent: 'var(--kk-text-soft)' },
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

        <div className="portaal-klashero">
          <span className="portaal-klashero-icoon"><Icoon naam="school" /></span>
          <div>
            <h1>{klas.naam}</h1>
            <div className="portaal-chips">
              <span className="portaal-chip"><Icoon naam="mensen" />{leerlingen?.length ?? '…'} leerlingen</span>
              <span className="portaal-chip"><Icoon naam="sleutel" />inlogcode <strong>{klas.code}</strong></span>
              {klas.schooljaar && <span className="portaal-chip">{klas.schooljaar}</span>}
            </div>
          </div>
        </div>

        <nav className="portaal-tabs-nav">
          {TABS.map(t => (
            <button
              key={t.key}
              className={tab === t.key && !leerlingId ? 'portaal-tab-knop actief' : 'portaal-tab-knop'}
              style={{ '--kk-accent': t.accent }}
              onClick={() => naarTab(t.key)}
            >
              <span className="portaal-tab-icoon"><Icoon naam={t.icoon} /></span>
              <span className="portaal-tab-tekst">{t.label}<span className="portaal-tab-hint">{t.hint}</span></span>
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

        {!leerlingId && tab === 'week' && <KlasWeekoverzicht key={klas.id} leerlingen={leerlingen} />}

        {!leerlingId && !['leerlingen', 'werkblad', 'week'].includes(tab) && (
          <WeektaakTab key={tab} klas={klas} soort={tab} onKiesLeerling={setLeerlingId} />
        )}
      </div>
    </div>
  )
}
