import { useState, useEffect, useRef, useCallback } from 'react'
import { THEMAS } from './begrijpendLezenData'
import SpelBeloning from './SpelBeloning'
import MenuScene from '../MenuScenes'
import './dictee-thema.css'
import { TerugKnop, Icoon } from '../ui/index.jsx'
import { useSessie } from '../lib/sessie.jsx'

// startLes: alleen gezet vanuit een weektaak-opdracht (toolRender.jsx) — het
// lesnummer binnen thema startThema (standaard "spullen"). Springt direct naar
// die les, de thema/les-kiesschermen overslaand.
//
// Thema's met groepKeuze hebben een les voor groep 7 en een moeilijkere voor
// groep 8. Vanuit het spellenmenu is de groep al gekozen (prop groep); vanuit
// een weektaak gaat het vanzelf als de klas alleen groep 7 of alleen groep 8
// is, en anders kiest de leerling eerst zijn groep.
export default function BegrijpendLezen({ onBack, addBriefgeld, addCuruntie, startLes, startThema = 'spullen', groep: menuGroep }) {
  const startT = THEMAS.find(t => t.key === startThema) ?? THEMAS[0]
  const [thema, setThema] = useState(() => startLes ? startT : null)
  const [les, setLes]     = useState(() => startLes ? startT.lessen[startLes - 1] : null)
  const { toegestaneGroepen } = useSessie()
  const klasGroep = (() => {
    const g = (toegestaneGroepen ?? []).filter(x => x === 7 || x === 8)
    return g.length === 1 ? g[0] : null
  })()
  const [gekozen, setGekozen] = useState(null)
  const vasteGroep = menuGroep === 7 || menuGroep === 8 ? menuGroep : klasGroep
  const groep = vasteGroep ?? gekozen
  const frameRef = useRef(null)
  const [beloning, setBeloning] = useState(false)

  const resume = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'begrijpend-resume' }, '*')
    setBeloning(false)
  }, [])

  // Elk goed antwoord levert 10 briefgeld op; na 5 goede antwoorden vraagt de
  // les om een spelletje. De keuze en de "één potje"-regel zitten in
  // SpelBeloning, gedeeld met alle andere oefeningen.
  useEffect(() => {
    function onMsg(e) {
      if (e.data?.type === 'begrijpend-correct') { addBriefgeld?.(e.data.amount || 10); return }
      if (e.data?.type === 'begrijpend-game')     { setBeloning(true) }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [addBriefgeld])

  // Buiten .game-screen zodat position:fixed niet overschreven wordt door de
  // `.game-screen > * { position: relative }` regel.
  const overlay = beloning && (
    <SpelBeloning
      title="5 goede antwoorden!"
      geld={50}
      addCuruntie={addCuruntie}
      onDone={() => { addBriefgeld?.(50); resume() }}
    />
  )

  if (thema?.groepKeuze && !groep) {
    return (
      <div className="game-screen game-screen-center">
        <TerugKnop onClick={() => { setLes(null); setThema(null); if (startLes) onBack() }} />
        <div className="game-header">
          <span className="game-header-icon" style={{ '--kk-accent': thema.kleur }}><Icoon naam="lezen" /></span>
          <h1 className="game-header-title">{thema.naam}</h1>
          <p className="game-header-sub">In welke groep zit je?</p>
        </div>
        <div className="mode-grid bl-thema-grid">
          {[7, 8].map(g => (
            <button key={g} className="mode-card bl-thema-card" onClick={() => setGekozen(g)} style={{ '--bl-kleur': thema.kleur }}>
              <MenuScene name="begrijpend" />
              <span className="mode-name">Groep {g}</span>
              <span className="mode-desc">{g === 8 ? 'Moeilijkere vragen' : 'Vragen voor groep 7'}</span>
              <span className="bl-thema-go">Kies</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (thema && les) {
    return (
      <>
        <div className="game-screen dictee-screen">
          <TerugKnop onClick={() => setLes(null)} />
          <iframe
            ref={frameRef}
            className="dictee-frame"
            src={`${import.meta.env.BASE_URL}begrijpend-lezen/${les.file}${thema.groepKeuze ? `?groep=${groep}` : ''}`}
            title={les.naam}
          />
        </div>
        {overlay}
      </>
    )
  }

  if (thema) {
    return (
      <div className="game-screen game-screen-center">
        <TerugKnop onClick={() => setThema(null)} />
        <div className="game-header">
          <span className="game-header-icon" style={{ '--kk-accent': thema.kleur }}><Icoon naam="lezen" /></span>
          <h1 className="game-header-title">{thema.naam}</h1>
          <p className="game-header-sub">
            Kies een les
            {thema.groepKeuze && <> · groep {groep}{!vasteGroep && <> · <button className="bl-wissel" onClick={() => setGekozen(null)}>andere groep</button></>}</>}
          </p>
        </div>
        <div className="blok-grid" style={{ '--kk-accent': thema.kleur }}>
          {thema.lessen.map(l => (
            <button
              key={l.key}
              className={`blok-card${l.klaar ? ' ready' : ''}`}
              onClick={() => l.klaar && setLes(l)}
              disabled={!l.klaar}
            >
              <MenuScene name="begrijpend" />
              <span className="blok-num">{l.naam}</span>
              <span className="blok-tag">{l.klaar ? 'Klaar' : 'Binnenkort'}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="game-screen game-screen-center">
      <TerugKnop onClick={onBack} />
      <div className="game-header">
        <span className="game-header-icon" style={{ '--kk-accent': 'var(--kk-vak-lezen)' }}><Icoon naam="lezen" /></span>
        <h1 className="game-header-title">Begrijpend Lezen</h1>
        <p className="game-header-sub">Kies een thema</p>
      </div>
      <div className="mode-grid bl-thema-grid">
        {THEMAS.map(t => (
          <button
            key={t.key}
            className="mode-card bl-thema-card"
            onClick={() => setThema(t)}
            style={{ '--bl-kleur': t.kleur }}
          >
            <MenuScene name="begrijpend" />
            <span className="mode-name">{t.naam}</span>
            <span className="mode-desc">{t.lessen.length} lessen</span>
            <span className="bl-thema-go">Start</span>
          </button>
        ))}
      </div>
    </div>
  )
}
