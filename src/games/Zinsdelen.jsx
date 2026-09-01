import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  VRAGEN, ZINSDELEN, SAMENGESTELDE_ZINNEN, TIP_ZINSDEEL, splitZin, woordIndexen, zinsdeelFrase,
} from './taalData.js'
import SpelBeloning, { BRIEFGELD } from './SpelBeloning'
import { useGebruikOpdracht } from './gebruikOpdracht.js'
import OpdrachtKlaarScherm from './OpdrachtKlaarScherm.jsx'
import './taal-oefenen.css'

// Zinsdelen ontleden door te slepen. De zin staat al in woordgroepen op het
// scherm ("De juf" · "leest" · "de kinderen" · …); je sleept elk onderdeel naar
// de groep waar het bij hoort — niet naar losse woorden. Eén zin is één
// opgave: hij telt pas als álle onderdelen liggen, en alleen als goed als er
// geen misser bij zat. Tikken werkt ook (eerst het kaartje, dan de groep),
// zodat het op een tablet net zo goed gaat als met een muis.
//
// Bij een samengestelde zin heeft elke deelzin een eigen onderwerp en
// persoonsvorm; die kaartjes liggen dan dus twee keer in het bakje.

const GOED_VOOR_REWARD = 10
const SLEEP_MARGE = 6 // px: minder verplaatsing telt als "tikken", niet slepen

// Vaste kleur per zinsdeel, zodat een groep in de zin en zijn kaartje dezelfde
// kleur hebben.
const KLEUR = {
  'onderwerp':            '#4FC3F7',
  'persoonsvorm':         '#ffb020',
  'gezegde':              '#a855f7',
  'lijdend voorwerp':     '#06d6a0',
  'meewerkend voorwerp':  '#ff6b9d',
  'bepaling':             '#7f8cff',
}

const VOLGORDE = ZINSDELEN.map(z => z.label)

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// De zin opknippen in woordgroepen: woorden die bij precies dezelfde
// zinsdelen horen, vormen samen één vak. Zo wordt "De juf leest de kinderen
// een spannend verhaal voor." → [De juf] [leest] [de kinderen] [een spannend
// verhaal] [voor.]
//
// Het knippen gebeurt op álle zinsdelen die de zin heeft, ook die de leerling
// niet hoeft te benoemen: die vakken staan er dus gewoon, je kunt er alleen
// niets goeds op leggen. `plekIds` bevat alleen de te benoemen plekken.
function maakSegmenten(zin, alleGroepen, plekken) {
  const segmenten = []
  let vorigeSleutel = null
  splitZin(zin).forEach((_, i) => {
    const sleutel = alleGroepen.filter(g => g.indexen.has(i)).map(g => g.id).join(',')
    if (segmenten.length && sleutel === vorigeSleutel) {
      segmenten[segmenten.length - 1].woorden.push(i)
    } else {
      segmenten.push({ woorden: [i], plekIds: plekken.filter(p => p.indexen.has(i)).map(p => p.id) })
    }
    vorigeSleutel = sleutel
  })
  return segmenten
}

// Per zin alle plekken die gelegd moeten worden. Twee bepalingen in dezelfde
// zin (of twee onderwerpen in een samengestelde zin) zijn twee losse plekken,
// dus het kaartje ligt dan ook twee keer in het bakje.
function bouwZinnen(labels, metSamengesteld) {
  const perZin = new Map()
  for (const r of VRAGEN) {
    if (!r.zinsdeel) continue
    if (!metSamengesteld && SAMENGESTELDE_ZINNEN.has(r.zin)) continue
    const indexen = woordIndexen(r.zin, zinsdeelFrase(r))
    if (!indexen.size) continue
    if (!perZin.has(r.zin)) perZin.set(r.zin, [])
    const groepen = perZin.get(r.zin)
    const sleutel = [...indexen].sort((a, b) => a - b).join(',')
    if (groepen.some(g => g.zinsdeel === r.zinsdeel && g.sleutel === sleutel)) continue
    groepen.push({ id: `${r.zinsdeel}-${sleutel}`, sleutel, zinsdeel: r.zinsdeel, indexen, uitleg: r.uitleg_zd })
  }
  return [...perZin]
    .map(([zin, groepen]) => {
      const alle = [...groepen].sort((a, b) => Math.min(...a.indexen) - Math.min(...b.indexen))
      const plekken = alle.filter(g => labels.includes(g.zinsdeel))
      return { zin, plekken, segmenten: maakSegmenten(zin, alle, plekken) }
    })
    // Zinnen zonder één van de aangevinkte onderdelen hebben niets te doen.
    .filter(z => z.plekken.length > 0)
}

// Elke gelegde plek krijgt een eigen baan onder de zin; plekken die elkaar
// overlappen (de persoonsvorm zit ín het gezegde) schuiven een baan lager.
function verdeelBanen(plekken) {
  const banen = []
  for (const p of plekken) {
    const van = Math.min(...p.indexen)
    const tot = Math.max(...p.indexen)
    let l = 0
    while (banen[l]?.some(q => van <= Math.max(...q.indexen) && tot >= Math.min(...q.indexen))) l++
    if (!banen[l]) banen[l] = []
    banen[l].push(p)
  }
  return banen
}

// labels: de aangevinkte zinsdelen. aantal: gezet vanuit een weektaak-opdracht
// (dan stopt de oefening na dat aantal zinnen), anders vrij oefenen.
export default function Zinsdelen({
  labels, metSamengesteld = false, onBack, addBriefgeld, addCuruntie, aantal, beloning = BRIEFGELD,
}) {
  const zinnen = useMemo(() => bouwZinnen(labels, metSamengesteld), [labels, metSamengesteld])
  const [pool, setPool] = useState(() => shuffle(zinnen))
  const [poolIdx, setPoolIdx] = useState(0)
  const [gelegd, setGelegd] = useState({})             // plekId → true
  const [misgeklikt, setMisgeklikt] = useState(new Set()) // zinsdelen waarbij het misging
  const [flits, setFlits] = useState(null)             // { segment, label } korte foutmelding
  const [zinKlaar, setZinKlaar] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [showReward, setShowReward] = useState(false)
  const [actief, setActief] = useState(null)           // opgepakt of aangetikt kaartje: plekId
  const [zweef, setZweef] = useState(null)             // { label, x, y } tijdens het slepen
  const [tipOpen, setTipOpen] = useState(false)

  const opdracht = useGebruikOpdracht({ toolId: 'taal-zinsdelen', aantal })
  const huidig = pool[poolIdx]

  const gelegdePlekken = huidig ? huidig.plekken.filter(p => gelegd[p.id]) : []
  const banen = verdeelBanen(gelegdePlekken)
  const tray = huidig ? huidig.plekken.filter(p => !gelegd[p.id]) : []
  const actiefLabel = tray.find(p => p.id === actief)?.zinsdeel ?? null
  // Waar de hulptip over gaat: het kaartje dat je vasthebt, anders het eerste
  // dat nog moet.
  const tipLabel = actiefLabel ?? tray[0]?.zinsdeel ?? null

  function volgendeZin() {
    setGelegd({})
    setMisgeklikt(new Set())
    setZinKlaar(false)
    setActief(null)
    const next = poolIdx + 1
    if (next >= pool.length) {
      setPool(shuffle(zinnen))
      setPoolIdx(0)
    } else {
      setPoolIdx(next)
    }
  }

  // Alles ligt: de zin telt als één opgave, goed als er geen misser bij zat.
  function rondAf(fouten) {
    setZinKlaar(true)
    const correct = fouten.size === 0
    const zalKlaarZijn = opdracht.aantal != null && (opdracht.gedaan + 1) >= opdracht.aantal
    if (zalKlaarZijn) {
      setTimeout(() => opdracht.registreer(correct, { vraag: huidig.zin, goedInEenKeer: correct }), 2600)
      return
    }
    opdracht.registreer(correct, { vraag: huidig.zin, goedInEenKeer: correct })

    if (correct) {
      const nieuw = correctCount + 1
      setCorrectCount(nieuw)
      if (nieuw % GOED_VOOR_REWARD === 0) {
        setTimeout(() => setShowReward(true), 2600)
        return
      }
    }
    setTimeout(() => volgendeZin(), 2600)
  }

  // Een kaartje op een groep leggen: goed als deze groep bij een nog lege plek
  // van dat onderdeel hoort.
  const legNeer = useCallback((plekId, segIdx) => {
    if (zinKlaar) return
    const kaartje = huidig.plekken.find(p => p.id === plekId)
    if (!kaartje || gelegd[plekId]) return
    const segment = huidig.segmenten[segIdx]
    const doel = huidig.plekken.find(p =>
      p.zinsdeel === kaartje.zinsdeel && !gelegd[p.id] && segment.plekIds.includes(p.id))
    if (!doel) {
      setFlits({ segment: segIdx, label: kaartje.zinsdeel })
      setTimeout(() => setFlits(null), 800)
      setMisgeklikt(prev => new Set(prev).add(kaartje.zinsdeel))
      return
    }
    const nieuw = { ...gelegd, [doel.id]: true }
    setGelegd(nieuw)
    setActief(null)
    if (Object.keys(nieuw).length === huidig.plekken.length) rondAf(misgeklikt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zinKlaar, gelegd, huidig, misgeklikt, correctCount, poolIdx])

  // Slepen met muis én vinger: bij pointerup kijken we welke groep er onder de
  // cursor zit. Nauwelijks bewogen = tikken, dan blijft het kaartje
  // geselecteerd en kies je daarna de groep.
  const sleepRef = useRef(null)
  const legNeerRef = useRef(legNeer)
  legNeerRef.current = legNeer

  useEffect(() => {
    function move(e) {
      const s = sleepRef.current
      if (!s) return
      if (Math.abs(e.clientX - s.startX) > SLEEP_MARGE || Math.abs(e.clientY - s.startY) > SLEEP_MARGE) s.bewogen = true
      if (s.bewogen) setZweef({ label: s.label, x: e.clientX, y: e.clientY })
    }
    function up(e) {
      const s = sleepRef.current
      if (!s) return
      sleepRef.current = null
      setZweef(null)
      if (!s.bewogen) return // tikken: blijft geselecteerd voor de tweede tik
      const doel = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-segment]')
      if (doel) legNeerRef.current(s.plekId, Number(doel.dataset.segment))
      else setActief(null)
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

  function pak(e, plek) {
    if (zinKlaar) return
    sleepRef.current = { plekId: plek.id, label: plek.zinsdeel, startX: e.clientX, startY: e.clientY, bewogen: false }
    setActief(prev => (prev === plek.id ? null : plek.id))
  }

  if (showReward) {
    return (
      <SpelBeloning
        title={`Knap — ${GOED_VOOR_REWARD} zinnen goed!`}
        geld={beloning}
        addCuruntie={addCuruntie}
        onDone={() => { setShowReward(false); addBriefgeld?.(beloning); volgendeZin() }}
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

  if (!huidig) {
    return (
      <div className="tv-screen tv-screen-center">
        <button className="tv-back" onClick={onBack}>← Terug</button>
        <p className="tv-filter-warn">Voor deze onderdelen zijn nog geen zinnen.</p>
      </div>
    )
  }

  const woorden = splitZin(huidig.zin)
  const naarBeloning = correctCount % GOED_VOOR_REWARD

  return (
    <div className="tv-screen">
      <div className="tv-top-bar">
        <button className="tv-back" onClick={onBack}>← Stop</button>
        <div className="tv-progress">
          <span className="tv-score-badge">✓ {correctCount}</span>
          <span className="tv-reward-meter">
            <span className="tv-reward-track">
              <span className="tv-reward-fill" style={{ width: `${(naarBeloning / GOED_VOOR_REWARD) * 100}%` }} />
            </span>
            <span className="tv-reward-tekst">nog {GOED_VOOR_REWARD - naarBeloning} 🚀</span>
          </span>
        </div>
      </div>

      <div className="tv-werk">
        <div className={`tv-card ${zinKlaar ? (misgeklikt.size === 0 ? 'tv-card-correct' : 'tv-card-wrong') : ''}`}>
          <p className="tv-mode-label">
            🔍 Zinsdelen{SAMENGESTELDE_ZINNEN.has(huidig.zin) ? ' · samengestelde zin' : ''}
          </p>
          <div className="zd-zin">
            {huidig.segmenten.map((seg, segIdx) => {
              const tekst = seg.woorden.map(i => woorden[i]).join(' ')
              const vol = seg.plekIds.some(id => gelegd[id])
              return (
                <span key={segIdx} className="zd-kolom">
                  <button
                    type="button"
                    data-segment={segIdx}
                    className={`zd-groep${vol ? ' zd-groep-vol' : ''}${flits?.segment === segIdx ? ' zd-groep-mis' : ''}${actief ? ' zd-groep-doel' : ''}`}
                    disabled={zinKlaar}
                    onClick={() => actief && legNeer(actief, segIdx)}
                  >{tekst}</button>
                  {/* Onder de groep een baan per gelegd onderdeel, in dezelfde
                      kleur als het kaartje. */}
                  {banen.map((baan, l) => {
                    const plek = baan.find(p => seg.plekIds.includes(p.id))
                    // Loopt dezelfde plek door vanaf de vorige groep? Dan geen
                    // nieuw labeltje, maar de streep doortrekken.
                    const vervolg = !!plek && segIdx > 0 && huidig.segmenten[segIdx - 1].plekIds.includes(plek.id)
                    const eerste = !!plek && !vervolg
                    return (
                      <span
                        key={l}
                        className={`zd-baan${plek ? ' zd-baan-aan' : ''}${vervolg ? ' zd-baan-vervolg' : ''}`}
                        style={plek ? { '--zd-kleur': KLEUR[plek.zinsdeel] } : undefined}
                      >
                        {eerste && <span className="zd-baan-label">{plek.zinsdeel}</span>}
                      </span>
                    )
                  })}
                </span>
              )
            })}
          </div>
          <p className="tv-vraag">
            {zinKlaar
              ? (misgeklikt.size === 0 ? 'Alles goed — helemaal zelf ontleed!' : 'Klaar! Kijk hieronder wat waar hoort.')
              : `Sleep ${actiefLabel ? `"${actiefLabel}"` : 'elk onderdeel'} naar de juiste woordgroep`}
          </p>
        </div>

        {!zinKlaar && (
          <>
            <div className="zd-tray">
              {tray.map(plek => (
                <button
                  key={plek.id}
                  type="button"
                  className={`zd-kaartje${actief === plek.id ? ' zd-kaartje-actief' : ''}${flits?.label === plek.zinsdeel ? ' zd-kaartje-mis' : ''}`}
                  style={{ '--zd-kleur': KLEUR[plek.zinsdeel] }}
                  onPointerDown={e => pak(e, plek)}
                >{plek.zinsdeel}</button>
              ))}
            </div>

            {/* Hulp: geen antwoord, maar de truc om het onderdeel zelf te
                vinden. De tip hoort bij het kaartje dat je vast hebt — pak een
                ander kaartje en de tip verandert mee. */}
            <div className="tv-tip-rij">
              <button className="tv-tip-knop" onClick={() => setTipOpen(o => !o)}>
                {tipOpen ? '💡 Tip verbergen' : '💡 Hoe vind ik dit?'}
              </button>
            </div>
            {tipOpen && tipLabel && (
              <div className="tv-tip">
                <span className="tv-tip-icon">💡</span>
                <p>
                  <strong style={{ color: KLEUR[tipLabel] }}>{tipLabel}</strong> — {TIP_ZINSDEEL[tipLabel]}
                </p>
              </div>
            )}
          </>
        )}

        {zinKlaar && (
          <div className={`tv-feedback ${misgeklikt.size === 0 ? 'tv-feedback-correct' : 'tv-feedback-wrong'}`}>
            <span className="tv-feedback-icon">{misgeklikt.size === 0 ? '✓' : '✗'}</span>
            <div>
              {huidig.plekken.map(p => (
                <p key={p.id} className="tv-feedback-uitleg">
                  <strong style={{ color: KLEUR[p.zinsdeel] }}>{p.zinsdeel}</strong> — {p.uitleg}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Het kaartje dat met je vinger/muis meebeweegt tijdens het slepen */}
      {zweef && (
        <span
          className="zd-kaartje zd-kaartje-zweef"
          style={{ '--zd-kleur': KLEUR[zweef.label], left: zweef.x, top: zweef.y }}
        >{zweef.label}</span>
      )}
    </div>
  )
}
