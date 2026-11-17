import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { haalEigenOefeningen } from '../lib/eigenOefeningen.js'
import { VASTE_REEKSEN, eigenNaarVloer, kiesVragen } from '../lib/vloerVragen.js'
import { wekServer } from '../games/online/server.js'
import { Knop } from '../ui/index.jsx'

// Vloerquiz klaarzetten: vragen aanvinken uit wat al op de site staat, het
// aantal en de tijd kiezen, en dan op het bord starten. De kinderen doen mee
// via Kledingkast, Speel een spel, Vloerquiz.

const VloerHost = lazy(() => import('../games/VloerQuiz.jsx').then(m => ({ default: m.VloerHost })))
const TIJDEN = [10, 20, 30, 60]
const AANTALLEN = [5, 10, 15, 20, 30]
const EIGEN = 'Eigen oefeningen'

export default function VloerQuizTab({ klas }) {
  const [eigen, setEigen] = useState(null)
  const [soort, setSoort] = useState(EIGEN)
  const [reeksKey, setReeksKey] = useState(null)
  const [gekozen, setGekozen] = useState(() => new Map())   // id → vraag
  const [aantal, setAantal] = useState(10)
  const [tijd, setTijd] = useState(20)
  const [door, setDoor] = useState(true)
  const [spel, setSpel] = useState(null)

  useEffect(() => {
    wekServer()   // de spelserver slaapt na een kwartier: alvast wakker maken
    let actief = true
    haalEigenOefeningen(klas.id).then(d => { if (actief) setEigen(d) }).catch(() => { if (actief) setEigen([]) })
    return () => { actief = false }
  }, [klas.id])

  const reeksen = useMemo(() => [
    ...(eigen ?? []).map(o => ({ key: 'eigen-' + o.id, soort: EIGEN, naam: o.onderwerp, sub: `Groep ${o.groep}`, vragen: () => eigenNaarVloer(o) })),
    ...VASTE_REEKSEN,
  ], [eigen])
  const soorten = [EIGEN, ...new Set(VASTE_REEKSEN.map(r => r.soort))]
  const reeks = reeksen.find(r => r.key === reeksKey)
  const vragen = useMemo(() => reeks?.vragen() ?? [], [reeks])

  const zet = (lijst, aan) => setGekozen(oud => {
    const nieuw = new Map(oud)
    lijst.forEach(v => (aan ? nieuw.set(v.id, v) : nieuw.delete(v.id)))
    return nieuw
  })
  const allesAan = vragen.length > 0 && vragen.every(v => gekozen.has(v.id))
  const n = gekozen.size
  const echt = Math.min(aantal, n)

  if (spel) {
    return (
      <Suspense fallback={null}>
        <VloerHost vragen={spel.vragen} tijd={spel.tijd} onBack={() => setSpel(null)} />
      </Suspense>
    )
  }

  return (
    <div className="portaal-kaart vq-klaar">
      <h2>Vloerquiz</h2>
      <p className="portaal-zacht kk-mt-0">
        Een quiz op het bord, waarin de kinderen met hun eigen poppetje naar het vlak met het goede antwoord rennen.
        Vink de vragen aan, kies hoeveel het er worden en start. De kinderen doen mee via Kledingkast, Speel een spel, Vloerquiz.
      </p>

      <div className="vq-soorten kk-mt-3" role="tablist" aria-label="Waar komen de vragen vandaan">
        {soorten.map(s => (
          <button key={s} type="button" role="tab" aria-selected={soort === s}
            className={'vq-soort' + (soort === s ? ' aan' : '')} onClick={() => { setSoort(s); setReeksKey(null) }}>{s}</button>
        ))}
      </div>

      <div className="vq-reeksen kk-mt-2">
        {soort === EIGEN && eigen === null && <p className="portaal-zacht">Laden…</p>}
        {soort === EIGEN && eigen?.length === 0 && (
          <p className="portaal-leeg">Je hebt nog geen eigen oefeningen. Maak ze bij Eigen oefeningen, of kies hierboven een andere soort.</p>
        )}
        {reeksen.filter(r => r.soort === soort).map(r => (
          <button key={r.key} type="button" className={'vq-reeks' + (reeksKey === r.key ? ' aan' : '')} onClick={() => setReeksKey(r.key)}>
            <b>{r.naam}</b>{r.sub && <span>{r.sub}</span>}
          </button>
        ))}
      </div>

      {reeks && (
        <div className="vq-vragenlijst kk-mt-3">
          <div className="vq-lijstkop">
            <b>{reeks.naam}</b>
            <span>{vragen.filter(v => gekozen.has(v.id)).length} van {vragen.length} aangevinkt</span>
            <Knop variant="subtiel" maat="sm" onClick={() => zet(vragen, !allesAan)}>{allesAan ? 'Alles uit' : 'Alles aan'}</Knop>
          </div>
          {vragen.length === 0 && <p className="portaal-leeg">Deze oefening heeft geen vragen die op de vloer passen (er is minstens één fout antwoord nodig).</p>}
          <ul>
            {vragen.map(v => (
              <li key={v.id}>
                <label className="vq-vraagregel">
                  <input type="checkbox" checked={gekozen.has(v.id)} onChange={e => zet([v], e.target.checked)} />
                  <span className="vq-vraagtekst">{v.vraag}</span>
                  <span className="vq-goed">{v.goed}</span>
                  <span className="vq-fout">{v.fout.join(' · ')}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="vq-start kk-mt-3">
        <div className="portaal-veldrij">
          <label className="portaal-veld">
            <span className="portaal-veld-label">Aantal vragen</span>
            <select value={aantal} onChange={e => setAantal(Number(e.target.value))}>
              {AANTALLEN.map(a => <option key={a} value={a}>{a} vragen</option>)}
            </select>
            <span className="portaal-veld-hint">
              {n === 0 ? 'Nog niets aangevinkt.' : n < aantal ? `Je hebt er ${n} aangevinkt: het worden er ${n}.` : `Uit ${n} aangevinkte vragen.`}
            </span>
          </label>
          <label className="portaal-veld">
            <span className="portaal-veld-label">Tijd per vraag</span>
            <select value={tijd} onChange={e => setTijd(Number(e.target.value))}>
              {TIJDEN.map(t => <option key={t} value={t}>{t} seconden</option>)}
            </select>
          </label>
        </div>
        <label className="portaal-vinkje kk-mt-2">
          <input type="checkbox" checked={door} onChange={e => setDoor(e.target.checked)} />
          Vragen in willekeurige volgorde
        </label>
        <div className="portaal-eigen-knoppen kk-mt-3">
          <Knop variant="primair" icoon="spelen" disabled={n === 0} onClick={() => setSpel({ vragen: kiesVragen([...gekozen.values()], echt, door), tijd })}>
            Start op het bord{n > 0 ? ` (${echt} ${echt === 1 ? 'vraag' : 'vragen'})` : ''}
          </Knop>
          {n > 0 && <Knop variant="subtiel" onClick={() => setGekozen(new Map())}>Alles wissen</Knop>}
        </div>
      </div>
    </div>
  )
}
