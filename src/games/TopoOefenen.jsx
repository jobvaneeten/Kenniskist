import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { KAART } from './topoKaart.js'
import { KAARTEN, SOORTEN, VRAAGTEKST } from './topoData.js'
import SpelBeloning, { BRIEFGELD } from './SpelBeloning'
import { useGebruikOpdracht } from './gebruikOpdracht.js'
import OpdrachtKlaarScherm from './OpdrachtKlaarScherm.jsx'
import './topo-oefenen.css'

// Topografie op de kaart: je krijgt een naam en wijst die aan (klikken), of je
// sleept naamkaartjes naar de juiste plek. Na elke 10 goede antwoorden een
// spelletje, net als bij de andere oefeningen.
//
// De kaart is een SVG die we zelf tekenen uit publiek-domein-grenzen (zie
// topoKaart.js). Álle landen, hoofdsteden en steden staan erop — ook die niet
// op de topolijst staan — anders verraadt de kaart welke er gevraagd worden.
// Kaart B is dezelfde tekening, maar ingezoomd op Noordwest-Europa.

const GOED_VOOR_REWARD = 10
const SLEEP_MARGE = 6
const TREFAFSTAND = 26   // px in kaartcoördinaten: hoe dicht je moet klikken

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const vraagTekst = (naam, soort) => VRAAGTEKST[naam] || SOORTEN[soort].vraag(naam)

const soortenVan = (kaart) => Object.keys(SOORTEN).filter(s => kaart.onderdelen[s]?.length)

function bouwOpgaven(kaart, gekozenSoorten) {
  const uit = []
  for (const soort of soortenVan(kaart)) {
    if (!gekozenSoorten.includes(soort)) continue
    for (const naam of kaart.onderdelen[soort]) uit.push({ naam, soort })
  }
  return uit
}

// Afstand van een punt tot een lijnstuk — voor rivieren en gebergtes.
function afstandTotLijn(px, py, punten) {
  let best = Infinity
  for (let i = 0; i < punten.length - 1; i++) {
    const [x1, y1] = punten[i]
    const [x2, y2] = punten[i + 1]
    const dx = x2 - x1
    const dy = y2 - y1
    const len2 = dx * dx + dy * dy || 1
    let t = ((px - x1) * dx + (py - y1) * dy) / len2
    t = Math.max(0, Math.min(1, t))
    best = Math.min(best, Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)))
  }
  return best
}

export default function TopoOefenen({ onBack, addBriefgeld, addCuruntie, aantal, config }) {
  const [kaartKey, setKaartKey] = useState(() => config?.kaart || KAARTEN[0].key)
  const kaart = KAARTEN.find(k => k.key === kaartKey) || KAARTEN[0]

  const [scherm, setScherm] = useState(() => (config ? 'oefening' : 'menu'))
  const [modus, setModus] = useState(() => config?.modus || 'klik')   // 'klik' | 'sleep'
  const [soorten, setSoorten] = useState(() => (
    config?.soorten?.length ? config.soorten : soortenVan(kaart)
  ))

  const [pool, setPool] = useState([])
  const [poolIdx, setPoolIdx] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState(null)   // { correct }
  const [showReward, setShowReward] = useState(false)
  const [actief, setActief] = useState(null)       // sleepmodus: opgepakt kaartje
  const [zweef, setZweef] = useState(null)

  const opdracht = useGebruikOpdracht({ toolId: kaart.toolId, aantal })
  const svgRef = useRef(null)

  useEffect(() => {
    if (scherm !== 'oefening') return
    setPool(prev => (prev.length ? prev : shuffle(bouwOpgaven(kaart, soorten))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scherm])

  const huidig = pool[poolIdx]

  // Sleepmodus: vier kaartjes, waarvan één de juiste.
  const kaartjes = useMemo(() => {
    if (modus !== 'sleep' || !huidig) return []
    const zelfde = pool.filter(o => o.soort === huidig.soort && o.naam !== huidig.naam)
    return shuffle([huidig, ...shuffle(zelfde).slice(0, 3)])
  }, [modus, huidig, pool])

  function volgende() {
    setFeedback(null)
    setActief(null)
    const next = poolIdx + 1
    if (next >= pool.length) {
      setPool(shuffle(bouwOpgaven(kaart, soorten)))
      setPoolIdx(0)
    } else {
      setPoolIdx(next)
    }
  }

  const registreer = useCallback((correct) => {
    setFeedback({ correct })
    const zalKlaarZijn = opdracht.aantal != null && (opdracht.gedaan + 1) >= opdracht.aantal
    if (zalKlaarZijn) {
      setTimeout(() => opdracht.registreer(correct, { vraag: huidig.naam, juist: huidig.naam }), 1600)
      return
    }
    opdracht.registreer(correct, { vraag: huidig.naam, juist: huidig.naam })
    if (correct) {
      const nieuw = correctCount + 1
      setCorrectCount(nieuw)
      if (nieuw % GOED_VOOR_REWARD === 0) {
        setTimeout(() => { setFeedback(null); setShowReward(true) }, 1600)
        return
      }
    }
    setTimeout(() => volgende(), correct ? 1400 : 2400)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huidig, correctCount, poolIdx, pool, opdracht])

  // Van schermpositie naar kaartcoördinaten (het venster verschilt per kaart).
  function naarKaart(clientX, clientY) {
    const rect = svgRef.current.getBoundingClientRect()
    const [vx, vy, vb, vh] = KAART.vensters[kaart.key]
    return [
      vx + ((clientX - rect.left) / rect.width) * vb,
      vy + ((clientY - rect.top) / rect.height) * vh,
    ]
  }

  // Landen en regio's zijn echte vlakken: kijken wat er onder de cursor ligt.
  // Een regio ligt bovenop zijn land, dus alle lagen onder het punt bekijken.
  function raakVlak(clientX, clientY, attribuut, naam) {
    return document.elementsFromPoint(clientX, clientY)
      .some(el => el?.dataset?.[attribuut] === naam)
  }

  function controleer(clientX, clientY) {
    if (!huidig) return
    const [x, y] = naarKaart(clientX, clientY)
    const { soort, naam } = huidig
    let goed = false
    if (soort === 'landen') goed = raakVlak(clientX, clientY, 'land', naam)
    else if (soort === 'regios') goed = raakVlak(clientX, clientY, 'regio', naam)
    else if (soort === 'hoofdsteden') {
      const p = KAART.hoofdsteden[naam].punt
      goed = Math.hypot(x - p[0], y - p[1]) <= TREFAFSTAND
    } else if (soort === 'steden') {
      const p = KAART.steden[naam].punt
      goed = Math.hypot(x - p[0], y - p[1]) <= TREFAFSTAND
    } else if (soort === 'wateren') {
      const p = KAART.wateren[naam]
      goed = Math.hypot(x - p[0], y - p[1]) <= TREFAFSTAND * 1.6
    } else if (soort === 'rivieren') {
      goed = afstandTotLijn(x, y, KAART.rivieren[naam]) <= TREFAFSTAND * 0.8
    } else if (soort === 'gebergtes') {
      goed = afstandTotLijn(x, y, KAART.gebergtes[naam]) <= TREFAFSTAND
    }
    registreer(goed)
  }

  function kaartKlik(e) {
    if (feedback) return
    if (modus === 'sleep') {
      if (!actief) return
      if (actief !== huidig?.naam) { registreer(false); return }
    }
    controleer(e.clientX, e.clientY)
  }

  // ── Slepen (muis én vinger) ──
  const sleepRef = useRef(null)
  const losRef = useRef(null)
  losRef.current = (naam, clientX, clientY) => {
    if (!huidig || feedback) return
    if (naam !== huidig.naam) { registreer(false); return }
    controleer(clientX, clientY)
  }

  useEffect(() => {
    function move(e) {
      const s = sleepRef.current
      if (!s) return
      if (Math.abs(e.clientX - s.startX) > SLEEP_MARGE || Math.abs(e.clientY - s.startY) > SLEEP_MARGE) s.bewogen = true
      if (s.bewogen) setZweef({ naam: s.naam, x: e.clientX, y: e.clientY })
    }
    function up(e) {
      const s = sleepRef.current
      if (!s) return
      sleepRef.current = null
      setZweef(null)
      if (!s.bewogen) return   // tikken: kaartje blijft geselecteerd
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        setActief(null)
        return
      }
      losRef.current(s.naam, e.clientX, e.clientY)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  function pak(e, naam) {
    if (feedback) return
    sleepRef.current = { naam, startX: e.clientX, startY: e.clientY, bewogen: false }
    setActief(prev => (prev === naam ? null : naam))
  }

  function start() {
    setPool(shuffle(bouwOpgaven(kaart, soorten)))
    setPoolIdx(0)
    setCorrectCount(0)
    setFeedback(null)
    setScherm('oefening')
  }

  if (showReward) {
    return (
      <SpelBeloning
        title={`Knap — ${GOED_VOOR_REWARD} goed op de kaart!`}
        geld={BRIEFGELD}
        addCuruntie={addCuruntie}
        onDone={() => { setShowReward(false); addBriefgeld?.(BRIEFGELD); volgende() }}
      />
    )
  }

  if (opdracht.klaar) {
    return (
      <OpdrachtKlaarScherm
        goed={opdracht.goed} aantal={opdracht.aantal}
        opslaanMislukt={opdracht.opslaanMislukt} onBack={onBack}
      />
    )
  }

  if (scherm === 'menu') {
    return (
      <div className="topo-screen topo-screen-center">
        <button className="topo-back" onClick={onBack}>← Menu</button>
        <div className="topo-header">
          <span className="topo-header-icon">🗺️</span>
          <h1>Topografie</h1>
          <p>TopoMaster Europa</p>
        </div>

        <div className="topo-modus">
          {KAARTEN.map(k => (
            <button
              key={k.key}
              className={`topo-modus-knop${kaartKey === k.key ? ' aan' : ''}`}
              onClick={() => { setKaartKey(k.key); setSoorten(soortenVan(k)) }}
            >
              <span>{k.key === 'europa-a' ? '🌍' : '🧭'}</span> {k.kort}
              <em>{k.naam.split('— ')[1]}</em>
            </button>
          ))}
        </div>

        <div className="topo-filter">
          {soortenVan(kaart).map(key => (
            <label key={key} className="topo-filter-item" style={{ '--topo-kleur': SOORTEN[key].kleur }}>
              <input
                type="checkbox"
                checked={soorten.includes(key)}
                onChange={e => setSoorten(prev => (
                  e.target.checked ? [...prev, key] : prev.filter(k => k !== key)
                ))}
              />
              <span>{SOORTEN[key].label} <em>({kaart.onderdelen[key].length})</em></span>
            </label>
          ))}
        </div>

        <div className="topo-modus">
          <button className={`topo-modus-knop${modus === 'klik' ? ' aan' : ''}`} onClick={() => setModus('klik')}>
            <span>👆</span> Aanwijzen
            <em>Je krijgt een naam en klikt de plek aan</em>
          </button>
          <button className={`topo-modus-knop${modus === 'sleep' ? ' aan' : ''}`} onClick={() => setModus('sleep')}>
            <span>✋</span> Slepen
            <em>Sleep het juiste naamkaartje naar de kaart</em>
          </button>
        </div>

        <button className="topo-start" disabled={soorten.length === 0} onClick={start}>
          Start oefenen →
        </button>
      </div>
    )
  }

  if (!huidig) return null

  const naarBeloning = correctCount % GOED_VOOR_REWARD
  const toonJuist = feedback && !feedback.correct
  const [vx, vy, vb, vh] = KAART.vensters[kaart.key]
  const juistIs = (soort, naam) => toonJuist && huidig.soort === soort && huidig.naam === naam
  const labelPunt = !toonJuist ? null
    : huidig.soort === 'landen' ? KAART.middelpunten[huidig.naam]
    : huidig.soort === 'regios' ? KAART.regioMidden[huidig.naam]
    : huidig.soort === 'hoofdsteden' ? KAART.hoofdsteden[huidig.naam].punt
    : huidig.soort === 'steden' ? KAART.steden[huidig.naam].punt
    : huidig.soort === 'wateren' ? KAART.wateren[huidig.naam]
    : huidig.soort === 'rivieren' ? KAART.rivieren[huidig.naam][Math.floor(KAART.rivieren[huidig.naam].length / 2)]
    : KAART.gebergtes[huidig.naam][Math.floor(KAART.gebergtes[huidig.naam].length / 2)]
  const metRegios = !!kaart.onderdelen.regios

  return (
    <div className="topo-screen">
      <div className="topo-top-bar">
        <button className="topo-back" onClick={() => (config ? onBack() : setScherm('menu'))}>← Stop</button>
        <div className="topo-progress">
          <span className="topo-score">✓ {correctCount}</span>
          <span className="topo-meter">
            <span className="topo-meter-track">
              <span className="topo-meter-fill" style={{ width: `${(naarBeloning / GOED_VOOR_REWARD) * 100}%` }} />
            </span>
            <span className="topo-meter-tekst">nog {GOED_VOOR_REWARD - naarBeloning} 🚀</span>
          </span>
        </div>
      </div>

      <p className={`topo-vraag${feedback ? (feedback.correct ? ' goed' : ' fout') : ''}`}>
        {feedback
          ? (feedback.correct ? `✓ Goed — dat is ${huidig.naam}!` : `✗ Bijna! Dit is ${huidig.naam}`)
          : (modus === 'klik'
            ? vraagTekst(huidig.naam, huidig.soort)
            : 'Sleep het juiste kaartje naar de plek op de kaart')}
      </p>

      <div className="topo-kaartwrap">
        <svg
          ref={svgRef}
          viewBox={`${vx} ${vy} ${vb} ${vh}`}
          className="topo-kaart"
          onClick={kaartKlik}
        >
          <defs>
            <linearGradient id="topo-zee" x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0%" stopColor="#dff1fb" />
              <stop offset="55%" stopColor="#c7e6f7" />
              <stop offset="100%" stopColor="#b3dbf2" />
            </linearGradient>
            <linearGradient id="topo-land" x1="0" y1="0" x2="0.2" y2="1">
              <stop offset="0%" stopColor="#fdf8e4" />
              <stop offset="100%" stopColor="#f2e7c2" />
            </linearGradient>
            <filter id="topo-kustgloed" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <filter id="topo-bergen" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
            <filter id="topo-schaduw" x="-10%" y="-10%" width="120%" height="130%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#33506b" floodOpacity="0.35" />
            </filter>
            <radialGradient id="topo-vignet" cx="50%" cy="45%" r="78%">
              <stop offset="65%" stopColor="#1d4666" stopOpacity="0" />
              <stop offset="100%" stopColor="#1d4666" stopOpacity="0.14" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width={KAART.breedte} height={KAART.hoogte} fill="url(#topo-zee)" />

          <g className="topo-graticule">
            {KAART.graticule.map((lijn, i) => (
              <polyline key={i} points={lijn.map(p => p.join(',')).join(' ')} />
            ))}
          </g>

          <g filter="url(#topo-kustgloed)" className="topo-kustgloed">
            {KAART.kust.map((d, i) => <path key={i} d={d} />)}
          </g>

          {/* Álle landen zien er hetzelfde uit en zijn aan te klikken, ook de
              landen die niet op de topolijst staan. */}
          <g filter="url(#topo-schaduw)">
            {Object.entries(KAART.landen).map(([naam, d]) => (
              <path
                key={naam}
                d={d}
                data-land={naam}
                fill="url(#topo-land)"
                className={`topo-land${juistIs('landen', naam) ? ' topo-aanwijzen' : ''}`}
              />
            ))}
          </g>

          {/* Regio's liggen als gekleurd vlak over hun land heen (kaart B). */}
          {metRegios && Object.entries(KAART.regios).map(([naam, d]) => (
            <path
              key={naam}
              d={d}
              data-regio={naam}
              className={`topo-regio${juistIs('regios', naam) ? ' topo-aanwijzen-regio' : ''}`}
            />
          ))}

          <g filter="url(#topo-bergen)">
            {Object.entries(KAART.gebergtes).map(([naam, punten]) => (
              <polyline
                key={naam}
                points={punten.map(p => p.join(',')).join(' ')}
                className={`topo-gebergte${juistIs('gebergtes', naam) ? ' topo-aanwijzen-lijn' : ''}`}
              />
            ))}
          </g>
          {Object.entries(KAART.rivieren).map(([naam, punten]) => (
            <polyline
              key={naam}
              points={punten.map(p => p.join(',')).join(' ')}
              className={`topo-rivier${juistIs('rivieren', naam) ? ' topo-aanwijzen-lijn' : ''}`}
            />
          ))}

          {Object.entries(KAART.hoofdsteden).map(([naam, info]) => (
            <g key={naam} className="topo-stadgroep">
              <circle cx={info.punt[0]} cy={info.punt[1]} r="7" className="topo-stad-ring" />
              <rect
                x={info.punt[0] - 3.2} y={info.punt[1] - 3.2} width="6.4" height="6.4"
                className={`topo-stad${juistIs('hoofdsteden', naam) ? ' topo-aanwijzen-punt' : ''}`}
              />
            </g>
          ))}
          {Object.entries(KAART.steden).map(([naam, info]) => (
            <circle
              key={naam}
              cx={info.punt[0]} cy={info.punt[1]} r="3.4"
              className={`topo-plaats${juistIs('steden', naam) ? ' topo-aanwijzen-punt' : ''}`}
            />
          ))}

          {toonJuist && huidig.soort === 'wateren' && (
            <circle
              cx={KAART.wateren[huidig.naam][0]} cy={KAART.wateren[huidig.naam][1]} r="18"
              className="topo-aanwijzen-punt"
            />
          )}

          {toonJuist && labelPunt && (
            <g className="topo-label">
              <text x={labelPunt[0]} y={labelPunt[1]} textAnchor="middle">{huidig.naam}</text>
            </g>
          )}

          <rect x="0" y="0" width={KAART.breedte} height={KAART.hoogte} fill="url(#topo-vignet)" pointerEvents="none" />

          <g
            className="topo-legenda"
            transform={`translate(${vx + 16} ${vy + vh - (metRegios ? 96 : 78)})`}
            pointerEvents="none"
          >
            <rect x="0" y="0" width="150" height={metRegios ? 84 : 66} rx="10" />
            <rect x="12" y="14" width="7" height="7" className="topo-legenda-stad" />
            <text x="28" y="21">Hoofdstad</text>
            <line x1="12" y1="36" x2="21" y2="36" className="topo-legenda-rivier" />
            <text x="28" y="40">Rivier</text>
            <line x1="12" y1="54" x2="21" y2="54" className="topo-legenda-berg" />
            <text x="28" y="58">Gebergte</text>
            {metRegios && (
              <>
                <circle cx="15.5" cy="72" r="3.4" className="topo-plaats" />
                <text x="28" y="76">Stad</text>
              </>
            )}
          </g>
        </svg>
      </div>

      {modus === 'sleep' && !feedback && (
        <div className="topo-tray">
          {kaartjes.map(k => (
            <button
              key={k.naam}
              type="button"
              className={`topo-kaartje${actief === k.naam ? ' aan' : ''}`}
              style={{ '--topo-kleur': SOORTEN[k.soort].kleur }}
              onPointerDown={e => pak(e, k.naam)}
            >{k.naam}</button>
          ))}
        </div>
      )}

      {zweef && (
        <span className="topo-kaartje topo-kaartje-zweef" style={{ left: zweef.x, top: zweef.y }}>
          {zweef.naam}
        </span>
      )}
    </div>
  )
}
