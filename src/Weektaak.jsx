import { useEffect, useMemo, useState } from 'react'
import { useSessie } from './lib/sessie.jsx'
import { haalMijnWeektaak, zetActieveOpdracht, wisActieveOpdracht } from './lib/weektaak.js'
import { toolLabel } from './lib/tools.js'
import { groepeer, korteDatum } from './lib/weektaakMapjes.js'
import RenderTool from './games/toolRender.jsx'
import './game.css'

// Leerlingscherm: de weektaken van de eigen klas als mapjes, met daarin de
// opdrachten die aan deze leerling zijn toegewezen. Los van GameMenu.jsx (zie
// toolRender.jsx voor waarom) — deze state-machine heeft drie standen: de
// mapjes, de opdrachten in één mapje, of één gekozen opdracht.
export default function Weektaak({ onBack, addBriefgeld, addCuruntie }) {
  const { profiel, toegestaneGroepen } = useSessie()
  const [opdrachten, setOpdrachten] = useState(null)
  const [gekozen, setGekozen] = useState(null)
  const [openMap, setOpenMap] = useState(null)
  const [ververs, setVervers] = useState(0)

  useEffect(() => {
    let actief = true
    async function laad() {
      if (!profiel?.id || !profiel?.klas_id) { if (actief) setOpdrachten([]); return }
      const data = await haalMijnWeektaak(profiel.id, profiel.klas_id)
      if (actief) setOpdrachten(data)
    }
    laad()
    return () => { actief = false }
  }, [profiel?.id, profiel?.klas_id, ververs])

  const mappen = useMemo(() => groepeer(opdrachten ?? []), [opdrachten])

  // Precies hier, vlak vóór het renderen van de tool, wordt kk_actieve_
  // opdracht gezet — en nergens anders. slaResultaatOp (kenniskist-login.js)
  // leest hem uit om het resultaat aan deze opdracht te hangen, maar alleen
  // als de toolId matcht: klikt de leerling terug en oefent hij iets anders
  // vrij, dan mag dát resultaat nooit aan deze opdracht blijven hangen.
  const start = (opdracht) => {
    zetActieveOpdracht(opdracht)
    setGekozen(opdracht)
  }

  const terugVanTool = () => {
    wisActieveOpdracht()
    setGekozen(null)
    setVervers(v => v + 1) // haalt de bijgewerkte voortgang opnieuw op
  }

  if (gekozen) {
    return (
      <RenderTool
        opdracht={gekozen}
        groep={toegestaneGroepen?.[0]}
        onBack={terugVanTool}
        addBriefgeld={addBriefgeld}
        addCuruntie={addCuruntie}
      />
    )
  }

  // Het open mapje wordt per render opnieuw opgezocht in plaats van in state
  // bewaard: na het maken van een opdracht laadt de voortgang opnieuw, en dan
  // moet het mapje de nieuwe cijfers tonen en niet die van een oude kopie.
  const map = openMap ? mappen.find(m => m.id === openMap) : null

  if (map) {
    const af = map.opdrachten.filter(o => o.klaar).length
    return (
      <div className="game-screen">
        <button className="back-btn" onClick={() => setOpenMap(null)}>← Weektaken</button>
        <div className="game-header">
          <span className="game-header-icon">📂</span>
          <h1 className="game-header-title">{map.titel}</h1>
          <p className="game-header-sub">
            {af} van de {map.opdrachten.length} opdracht{map.opdrachten.length === 1 ? '' : 'en'} af
            {map.eindOp ? ` · tot en met ${korteDatum(map.eindOp)}` : ''}
          </p>
        </div>

        <div className="mode-grid">
          {map.opdrachten.map(o => (
            <button key={o.opdrachtId} className="mode-card" onClick={() => start(o)}>
              <span className="mode-name">{toolLabel(o.toolId)}{o.klaar ? ' ✅' : ''}</span>
              <span className="mode-desc">
                {o.doel != null
                  ? `${Math.min(o.somMax, o.doel)} / ${o.doel} gemaakt`
                  : `${o.pogingen}× gemaakt`}
              </span>
              {/* Opnieuw gezet: door de juf of meester, of automatisch omdat er
                  minder dan de helft goed was. De teller staat dan weer op 0. */}
              {o.herkansingen > 0 && !o.klaar && (
                <span className="wt-opnieuw">↺ Opnieuw maken · poging {o.herkansingen + 1}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="game-screen">
      <button className="back-btn" onClick={onBack}>← Menu</button>
      <div className="game-header">
        <span className="game-header-icon">📋</span>
        <h1 className="game-header-title">Mijn weektaak</h1>
        <p className="game-header-sub">Opdrachten die je juf of meester voor je heeft klaargezet</p>
      </div>

      {opdrachten === null && <p className="mode-desc">Laden…</p>}
      {opdrachten?.length === 0 && (
        <p className="mode-desc">Nog geen weektaak — vraag het aan je juf of meester.</p>
      )}
      {mappen.length > 0 && (
        <div className="mode-grid">
          {mappen.map(m => {
            const af = m.opdrachten.filter(o => o.klaar).length
            const alles = af === m.opdrachten.length
            return (
              <button key={m.id} className="mode-card wt-map" onClick={() => setOpenMap(m.id)}>
                <span className="mode-emoji">{alles ? '✅' : '📂'}</span>
                <span className="mode-name">{m.titel}</span>
                <span className="mode-desc">
                  {af} van de {m.opdrachten.length} af
                </span>
                {m.eindOp && (
                  <span className="wt-map-datum">tot en met {korteDatum(m.eindOp)}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
