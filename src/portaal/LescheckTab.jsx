import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { haalLeschecks } from '../lib/lescheck.js'
import { korteDatum } from '../lib/weektaakMapjes.js'
import LescheckForm from './LescheckForm.jsx'
import LescheckLive from './LescheckLive.jsx'

// Vijfde tab van KlasScherm.jsx: één som per rekenles over het doel van die
// les. Drie standen — de lijst met klaargezette blokken, het formulier om er
// lessen bij te zetten, en het live-bord tijdens de les.
export default function LescheckTab({ klas }) {
  const [blokken, setBlokken] = useState(null)
  const [leerlingen, setLeerlingen] = useState([])
  const [weergave, setWeergave] = useState('lijst')   // lijst | form | live
  const [gekozen, setGekozen] = useState(null)
  const [scores, setScores] = useState(new Map())     // opdracht_id → {gemaakt, goed}

  const laad = useCallback(async () => {
    const [lijst, { data: lln }] = await Promise.all([
      haalLeschecks(klas.id),
      supabase.from('profielen').select('id, weergavenaam')
        .eq('klas_id', klas.id).eq('rol', 'leerling').order('weergavenaam'),
    ])
    setBlokken(lijst)
    setLeerlingen(lln ?? [])

    const ids = lijst.flatMap(b => b.opdrachten.map(o => o.id))
    if (!ids.length) { setScores(new Map()); return }
    const { data: res } = await supabase
      .from('resultaten').select('opdracht_id, leerling_id, score').in('opdracht_id', ids)
    const kaart = new Map()
    for (const r of res ?? []) {
      if (!kaart.has(r.opdracht_id)) kaart.set(r.opdracht_id, new Map())
      kaart.get(r.opdracht_id).set(r.leerling_id, Number(r.score) > 0)
    }
    setScores(new Map([...kaart].map(([id, m]) => [id, {
      gemaakt: m.size, goed: [...m.values()].filter(Boolean).length,
    }])))
  }, [klas.id])

  useEffect(() => { laad() }, [laad])

  const naLijst = () => { setWeergave('lijst'); setGekozen(null); laad() }

  if (weergave === 'form') {
    return (
      <LescheckForm
        klas={klas} leerlingen={leerlingen} bestaand={gekozen}
        onKlaar={naLijst} onAnnuleer={naLijst}
      />
    )
  }

  if (weergave === 'live' && gekozen) {
    return <LescheckLive blok={gekozen} leerlingen={leerlingen} onTerug={naLijst} />
  }

  return (
    <div className="portaal-kaart">
      <div className="portaal-sectiekop">
        <h2>Lescheck</h2>
        <button className="portaal-knop" onClick={() => { setGekozen(null); setWeergave('form') }}>
          + Blok klaarzetten
        </button>
      </div>
      <p className="portaal-zacht">
        Eén som aan het eind van elke rekenles, over het doel van díe les. Zet de lessen vooruit klaar;
        de kinderen klikken na de les op hun les en maken hem. Elk kind krijgt een eigen som.
      </p>

      {blokken === null && <p className="portaal-leeg">Laden…</p>}
      {blokken?.length === 0 && (
        <p className="portaal-leeg">Nog niets klaargezet. Begin met "Blok klaarzetten".</p>
      )}

      {blokken?.map(b => {
        const totaalGemaakt = b.opdrachten.reduce((s, o) => s + (scores.get(o.id)?.gemaakt ?? 0), 0)
        const totaalGoed = b.opdrachten.reduce((s, o) => s + (scores.get(o.id)?.goed ?? 0), 0)
        const verlopen = b.eindOp < new Date().toLocaleDateString('sv-SE')
        return (
          <div key={b.weektaakId} className="portaal-opdracht" style={{ marginTop: 12 }}>
            <div className="portaal-opdracht-kop">
              <span className="portaal-opdracht-titel">{b.titel}</span>
              <span className="portaal-zacht">
                {b.opdrachten.length} {b.opdrachten.length === 1 ? 'les' : 'lessen'}
                {' · '}{verlopen ? 'verlopen op' : 'zichtbaar t/m'} {korteDatum(b.eindOp)}
                {totaalGemaakt > 0 && ` · ${totaalGoed}/${totaalGemaakt} goed`}
              </span>
            </div>
            <div className="portaal-lesbadges">
              {b.opdrachten.map(o => {
                const s = scores.get(o.id)
                return (
                  <span key={o.id} className="portaal-lesbadge">
                    Les {o.les}
                    <span className="portaal-zacht">
                      {s ? ` ${s.goed}/${s.gemaakt}` : ' —'}
                    </span>
                  </span>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <button className="portaal-knop" onClick={() => { setGekozen(b); setWeergave('live') }}>
                Bekijk live
              </button>
              <button className="portaal-knop portaal-knop-subtiel" onClick={() => { setGekozen(b); setWeergave('form') }}>
                Lessen toevoegen
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
