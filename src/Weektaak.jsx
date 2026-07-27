import { useEffect, useState } from 'react'
import { useSessie } from './lib/sessie.jsx'
import { haalMijnWeektaak, zetActieveOpdracht, wisActieveOpdracht } from './lib/weektaak.js'
import { toolLabel } from './lib/tools.js'
import RenderTool from './games/toolRender.jsx'
import './game.css'

// Leerlingscherm: lijst met opdrachten uit de actieve weektaak van de eigen
// klas, aantikbaar om te starten. Los van GameMenu.jsx (zie toolRender.jsx
// voor waarom) — deze state-machine heeft maar twee standen: de lijst, of
// één gekozen opdracht.
export default function Weektaak({ onBack, addBriefgeld, addCuruntie }) {
  const { profiel, toegestaneGroepen } = useSessie()
  const [opdrachten, setOpdrachten] = useState(null)
  const [gekozen, setGekozen] = useState(null)
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
      {opdrachten?.length > 0 && (
        <div className="mode-grid">
          {opdrachten.map(o => (
            <button key={o.opdrachtId} className="mode-card" onClick={() => start(o)}>
              <span className="mode-name">{toolLabel(o.toolId)}{o.klaar ? ' ✅' : ''}</span>
              <span className="mode-desc">
                {o.doel != null
                  ? `${Math.min(o.somMax, o.doel)} / ${o.doel} gemaakt`
                  : `${o.pogingen}× gemaakt`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
