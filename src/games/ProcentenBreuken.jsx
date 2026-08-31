import { useState, useRef, useEffect, useCallback } from 'react'
import { PROCENT_SETS, shuffle } from './procentenData'
import SpelBeloning, { BRIEFGELD } from './SpelBeloning'
import OpdrachtKlaarScherm from './OpdrachtKlaarScherm.jsx'
import './procenten.css'

const PER_ROUND    = 4   // aantal vakjes (percentages) per ronde
const PER_BELONING = 5   // na elke 5 opgeloste rondes een spelletje

// Bouw een ronde: kies 4 sets als vakjes en zet ALLE breuken én ALLE
// kommagetallen in de sleep-bak (dus ook van de andere percentages → afleiders).
function buildRound(pool) {
  const sets = shuffle(pool).slice(0, PER_ROUND)
  const boxes = sets.map(s => ({ setId: s.id, pct: s.pct }))
  const chips = []
  pool.forEach(s => {
    chips.push({ id: s.id + '-b', setId: s.id, kind: 'breuk', value: s.breuk })
    chips.push({ id: s.id + '-d', setId: s.id, kind: 'deci',  value: s.deci  })
  })
  return { boxes, chips: shuffle(chips) }
}

// aantal: alleen gezet vanuit een weektaak-opdracht (toolRender.jsx) — hoeveel
// rondes de leerling moet oplossen. Geen fout-antwoord mogelijk in deze tool
// (chips weigeren simpelweg te vallen op de verkeerde plek), dus score = aantal
// zodra klaar (eenheid 'sessies' in de registry, geen percentage-kleurcode).
export default function ProcentenBreuken({ onBack, addBriefgeld, aantal }) {
  // Startsein voor de tijdmeting in kenniskist-login.js.
  useEffect(() => { window.KennisKist?.startOefening?.('procenten-breuken') }, [])

  const [round, setRound]   = useState(() => buildRound(PROCENT_SETS))
  const [placed, setPlaced] = useState({})     // chipId -> true
  const [roundNo, setRoundNo] = useState(1)
  const [sinds, setSinds]     = useState(0)    // opgeloste rondes sinds laatste beloning
  const [rondesGedaan, setRondesGedaan] = useState(0)
  const [klaar, setKlaar] = useState(false)
  const [opslaanMislukt, setOpslaanMislukt] = useState(false)
  const [verdiend, setVerdiend] = useState(0)  // briefgeld deze sessie
  const [drag, setDrag]       = useState(null) // { id, value, kind, x, y }
  const [wrongId, setWrongId] = useState(null)
  const [celebrate, setCelebrate] = useState(false)
  const [phase, setPhase]     = useState('play')  // play | keuze
  const dragRef = useRef(null)

  const isFilled = (setId, kind) => round.chips.some(c => c.setId === setId && c.kind === kind && placed[c.id])
  const valueFor = (setId, kind) => round.chips.find(c => c.setId === setId && c.kind === kind)?.value
  const roundDone = round.boxes.every(b => isFilled(b.setId, 'breuk') && isFilled(b.setId, 'deci'))

  // Volgende ronde laden
  const nieuweRonde = useCallback(() => {
    setPlaced({}); setRound(buildRound(PROCENT_SETS)); setRoundNo(n => n + 1); setPhase('play')
  }, [])

  // Ronde opgelost → vieren, dan beloning (elke 5) of volgende ronde. Elke
  // ronde wordt los gerapporteerd (score 1, max 1) i.p.v. pas bij de laatste
  // ronde — zo gaat er niets verloren als de leerling halverwege stopt.
  useEffect(() => {
    if (!roundDone || phase !== 'play') return
    setCelebrate(true)
    const t = setTimeout(() => {
      setCelebrate(false)
      const nieuwRondesGedaan = rondesGedaan + 1
      setRondesGedaan(nieuwRondesGedaan)
      if (aantal != null) {
        const opslaan = window.KennisKist?.slaResultaatOp?.('procenten-breuken', 1, 1, {})
        opslaan?.then(r => { if (!r?.ok) setOpslaanMislukt(true) })
      }
      if (aantal != null && nieuwRondesGedaan >= aantal) {
        setKlaar(true)
        return
      }
      const n = sinds + 1
      if (n >= PER_BELONING) { setSinds(0); setPhase('keuze') }
      else { setSinds(n); nieuweRonde() }
    }, 1400)
    return () => clearTimeout(t)
  }, [roundDone, phase, rondesGedaan, aantal])

  // ── Drag-mechaniek (pointer; muis + touch) ──
  const startDrag = (e, chip) => {
    if (placed[chip.id]) return
    e.preventDefault()
    const r = e.currentTarget.getBoundingClientRect()
    dragRef.current = { offsetX: e.clientX - r.left - r.width / 2, offsetY: e.clientY - r.top - r.height / 2 }
    setDrag({ id: chip.id, setId: chip.setId, value: chip.value, kind: chip.kind, x: e.clientX, y: e.clientY })
  }
  useEffect(() => {
    if (!drag) return
    const move = e => setDrag(d => d ? { ...d, x: e.clientX, y: e.clientY } : d)
    const up = e => {
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const box = el?.closest('[data-box]')
      if (box && box.dataset.box === drag.setId) setPlaced(p => ({ ...p, [drag.id]: true }))
      else { setWrongId(drag.id); setTimeout(() => setWrongId(null), 420) }
      setDrag(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [drag])

  if (klaar) {
    return <OpdrachtKlaarScherm goed={aantal} aantal={aantal} opslaanMislukt={opslaanMislukt} onBack={onBack} />
  }

  return (
    <>
      {phase === 'keuze' && (
        <SpelBeloning
          title="5 rondes opgelost!"
          geld={BRIEFGELD}
          addCuruntie={() => {}}
          onDone={() => { addBriefgeld?.(BRIEFGELD); setVerdiend(v => v + BRIEFGELD); nieuweRonde() }}
        />
      )}

      <div className="pbk-screen" style={{ display: phase === 'play' ? 'flex' : 'none' }}>
        <button className="back-btn" onClick={onBack}>← Menu</button>

        <div className="pbk-head">
          <h1>💯 Procenten · Breuken · Kommagetallen</h1>
          <p>Sleep de juiste breuk én het juiste kommagetal naar elk percentage-vakje.</p>
          <div className="pbk-stats">
            <span>🏁 Ronde {roundNo}</span>
            <span>🎮 nog {PER_BELONING - sinds} tot een spelletje</span>
            <span>💵 € {verdiend}</span>
          </div>
        </div>

        {/* Doel-vakjes */}
        <div className="pbk-boxes">
          {round.boxes.map(b => {
            const bDone = isFilled(b.setId, 'breuk')
            const dDone = isFilled(b.setId, 'deci')
            const full = bDone && dDone
            return (
              <div key={b.setId} data-box={b.setId} className={'pbk-box' + (full ? ' pbk-box-done' : '')}>
                <div className="pbk-box-pct">{b.pct}</div>
                <div className="pbk-slots">
                  <div className={'pbk-slot' + (bDone ? ' filled' : '')}>
                    {bDone ? <span className="pbk-chip placed breuk">{valueFor(b.setId, 'breuk')}</span>
                           : <span className="pbk-slot-hint">breuk</span>}
                  </div>
                  <div className={'pbk-slot' + (dDone ? ' filled' : '')}>
                    {dDone ? <span className="pbk-chip placed deci">{valueFor(b.setId, 'deci')}</span>
                           : <span className="pbk-slot-hint">kommagetal</span>}
                  </div>
                </div>
                {full && <div className="pbk-check">✓</div>}
              </div>
            )
          })}
        </div>

        {/* Sleep-bak met ALLE opties (incl. afleiders) */}
        <div className="pbk-tray">
          {round.chips.map(c => {
            if (placed[c.id]) return null
            const hidden = drag?.id === c.id
            return (
              <button
                key={c.id}
                className={'pbk-chip ' + c.kind + (wrongId === c.id ? ' pbk-wrong' : '') + (hidden ? ' pbk-dragging-src' : '')}
                onPointerDown={e => startDrag(e, c)}
              >
                {c.value}
              </button>
            )
          })}
        </div>

        {/* Zwevende chip tijdens slepen */}
        {drag && (
          <div className={'pbk-chip pbk-float ' + drag.kind}
            style={{ left: drag.x - (dragRef.current?.offsetX || 0), top: drag.y - (dragRef.current?.offsetY || 0) }}>
            {drag.value}
          </div>
        )}

        {celebrate && (
          <div className="pbk-celebrate">
            <div className="pbk-celebrate-box">🎉 Ronde opgelost!</div>
          </div>
        )}
      </div>
    </>
  )
}
