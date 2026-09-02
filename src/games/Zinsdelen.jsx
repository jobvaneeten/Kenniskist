import { useState, useMemo } from 'react'
import {
  VRAGEN, ZINSDELEN, SAMENGESTELDE_ZINNEN, TIP_ZINSDEEL, splitZin, woordIndexen, zinsdeelFrase,
} from './taalData.js'
import SpelBeloning, { BRIEFGELD } from './SpelBeloning'
import { useGebruikOpdracht } from './gebruikOpdracht.js'
import OpdrachtKlaarScherm from './OpdrachtKlaarScherm.jsx'
import './taal-oefenen.css'

// Zinsdelen ontleden door aan te klikken. De zin staat al in woordgroepen op
// het scherm ("De juf" · "leest" · "de kinderen" · …); je klikt de groep aan
// die bij het gevraagde onderdeel hoort — niet losse woorden.
//
// Eén zin gaat stap voor stap: eerst het onderwerp, dan de persoonsvorm, dan
// het gezegde, het lijdend voorwerp, het meewerkend voorwerp en als laatste de
// bepaling. Wat je al goed hebt blijft staan, dus de ontleding groeit onder de
// zin. Er wordt pas nagekeken als je op "Verder" klikt — aanklikken alleen is
// nog geen antwoord, je kunt een groep eerst weer uitklikken.
//
// Nergens staat hoevéél groepen er bij een stap horen: dat moet de leerling
// zelf zien. Een gezegde dat uit elkaar staat ("De juf leest … voor") of een
// samengestelde zin met twee onderwerpen vraagt dus om meerdere kliks.
//
// Een zin telt als één opgave: goed als er bij geen enkele stap een misser was.
// Na 5 goede zinnen volgt een spelletje.

const GOED_VOOR_REWARD = 5

// Vaste kleur per zinsdeel, zodat de vraag en de streep onder de zin dezelfde
// kleur hebben.
const KLEUR = {
  'onderwerp':            '#4FC3F7',
  'persoonsvorm':         '#ffb020',
  'gezegde':              '#a855f7',
  'lijdend voorwerp':     '#06d6a0',
  'meewerkend voorwerp':  '#ff6b9d',
  'bepaling':             '#7f8cff',
}

// De vaste leervolgorde — precies de volgorde waarin ZINSDELEN staat.
const VOLGORDE = ZINSDELEN.map(z => z.label)

// Onder de zin is weinig plek: daar staat de schoolafkorting op de streep, met
// de hele naam in de vraag, in de stappenrij en in de uitleg.
const AFK = {
  'onderwerp':            'ond',
  'persoonsvorm':         'pv',
  'gezegde':              'gez',
  'lijdend voorwerp':     'lv',
  'meewerkend voorwerp':  'mv',
  'bepaling':             'bep',
}

// Hoe de vraag per stap luidt. Nooit een aantal noemen — dat zou het antwoord
// half weggeven.
const VRAAG = {
  'onderwerp':            'Klik op het onderwerp',
  'persoonsvorm':         'Klik op de persoonsvorm',
  'gezegde':              'Klik op het gezegde — alle werkwoorden',
  'lijdend voorwerp':     'Klik op het lijdend voorwerp',
  'meewerkend voorwerp':  'Klik op het meewerkend voorwerp',
  'bepaling':             'Klik op de bepaling',
}

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
// niets goeds aanklikken. `plekIds` bevat alleen de te benoemen plekken.
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

// Per zin alle plekken die aangewezen moeten worden. Twee bepalingen in
// dezelfde zin (of twee onderwerpen in een samengestelde zin) zijn twee losse
// plekken.
//
// Elke plek wordt daarna nog opgeknipt in doelen: één per woordgroep waar de
// plek overheen loopt. Een gezegde als "heeft … gekocht" staat in twee groepen
// en is dus twee doelen — beide stukken moeten aangeklikt worden.
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
      const segmenten = maakSegmenten(zin, alle, plekken)
      const doelen = []
      plekken.forEach(p => {
        segmenten.forEach((seg, segIdx) => {
          if (seg.plekIds.includes(p.id)) {
            doelen.push({ id: `${p.id}@${segIdx}`, plekId: p.id, zinsdeel: p.zinsdeel, segIdx })
          }
        })
      })
      // De stappen: de aangevinkte onderdelen in vaste volgorde, en alleen die
      // ook echt in deze zin zitten.
      const stappen = VOLGORDE
        .filter(l => labels.includes(l))
        .map(zinsdeel => ({ zinsdeel, doelen: doelen.filter(d => d.zinsdeel === zinsdeel) }))
        .filter(s => s.doelen.length > 0)
      return { zin, plekken, segmenten, doelen, stappen }
    })
    // Zinnen zonder één van de aangevinkte onderdelen hebben niets te doen.
    .filter(z => z.stappen.length > 0)
}

// Elke aangewezen plek krijgt een eigen baan onder de zin; plekken die elkaar
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
  const [stapIdx, setStapIdx] = useState(0)
  const [gedaan, setGedaan] = useState({})             // doelId → true (nagekeken en goed)
  const [gekozen, setGekozen] = useState([])           // welke woordgroepen nu aanstaan
  const [stapFout, setStapFout] = useState(false)      // laatste keer "Verder" was mis
  const [misgeklikt, setMisgeklikt] = useState(new Set()) // zinsdelen waarbij het misging
  const [zinKlaar, setZinKlaar] = useState(false)
  const [zinGoed, setZinGoed] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [showReward, setShowReward] = useState(false)
  const [tipOpen, setTipOpen] = useState(false)
  const [wachtOpAfronden, setWachtOpAfronden] = useState(null) // laatste opgave van een weektaak

  const opdracht = useGebruikOpdracht({ toolId: 'taal-zinsdelen', aantal })
  const huidig = pool[poolIdx]
  const stap = huidig && !zinKlaar ? huidig.stappen[stapIdx] : null
  const goedeSegmenten = stap ? stap.doelen.map(d => d.segIdx) : []

  const gedaanPlekken = huidig
    ? huidig.plekken.filter(p => huidig.doelen.some(d => d.plekId === p.id && gedaan[d.id]))
    : []
  const banen = verdeelBanen(gedaanPlekken)

  function volgendeZin() {
    setGedaan({})
    setGekozen([])
    setStapIdx(0)
    setStapFout(false)
    setMisgeklikt(new Set())
    setZinKlaar(false)
    setZinGoed(false)
    setTipOpen(false)
    const next = poolIdx + 1
    if (next >= pool.length) {
      setPool(shuffle(zinnen))
      setPoolIdx(0)
    } else {
      setPoolIdx(next)
    }
  }

  // Een woordgroep aan- of uitklikken — nog niet nakijken.
  function kies(segIdx) {
    if (!stap) return
    setGekozen(prev => (prev.includes(segIdx) ? prev.filter(s => s !== segIdx) : [...prev, segIdx]))
    setStapFout(false)
  }

  // "Verder": pas hier wordt de stap nagekeken.
  function kijkStapNa() {
    const mijn = [...gekozen].sort((a, b) => a - b)
    const verwacht = [...goedeSegmenten].sort((a, b) => a - b)
    const goed = mijn.length === verwacht.length && mijn.every((s, i) => s === verwacht[i])
    if (!goed) {
      setStapFout(true)
      setMisgeklikt(prev => new Set(prev).add(stap.zinsdeel))
      return
    }
    const nieuw = { ...gedaan }
    stap.doelen.forEach(d => { nieuw[d.id] = true })
    setGedaan(nieuw)
    setGekozen([])
    setStapFout(false)
    setTipOpen(false)
    if (stapIdx + 1 < huidig.stappen.length) setStapIdx(stapIdx + 1)
    else rondAf()
  }

  // Alle stappen gedaan: de zin telt als één opgave, goed als er nergens een
  // misser zat.
  function rondAf() {
    const correct = misgeklikt.size === 0
    setZinKlaar(true)
    setZinGoed(correct)
    if (correct) setCorrectCount(c => c + 1)
    const zalKlaarZijn = opdracht.aantal != null && (opdracht.gedaan + 1) >= opdracht.aantal
    // Bij de laatste opgave van een weektaak pas registreren als de leerling
    // de uitleg gelezen heeft en op "Verder" klikt — anders klapt het
    // klaar-scherm er meteen overheen.
    if (zalKlaarZijn) setWachtOpAfronden({ correct })
    else opdracht.registreer(correct, { vraag: huidig.zin, goedInEenKeer: correct })
  }

  function naZin() {
    if (wachtOpAfronden) {
      opdracht.registreer(wachtOpAfronden.correct, { vraag: huidig.zin, goedInEenKeer: wachtOpAfronden.correct })
      setWachtOpAfronden(null)
      return
    }
    if (zinGoed && correctCount > 0 && correctCount % GOED_VOOR_REWARD === 0) {
      setShowReward(true)
      return
    }
    volgendeZin()
  }

  if (showReward) {
    return (
      <SpelBeloning
        title={`Knap — ${GOED_VOOR_REWARD} zinnen helemaal ontleed!`}
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
  const kleurNu = stap ? KLEUR[stap.zinsdeel] : null

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
        <div className={`tv-card ${zinKlaar ? (zinGoed ? 'tv-card-correct' : 'tv-card-wrong') : ''}`}>
          <p className="tv-mode-label">
            🔍 Zinsdelen{SAMENGESTELDE_ZINNEN.has(huidig.zin) ? ' · samengestelde zin' : ''}
          </p>

          {/* De stappenrij: wat je al hebt, waar je nu bent en wat er nog komt. */}
          <div className="zd-stappen">
            {huidig.stappen.map((s, i) => (
              <span
                key={s.zinsdeel}
                className={`zd-stap${i < stapIdx || zinKlaar ? ' zd-stap-klaar' : ''}${!zinKlaar && i === stapIdx ? ' zd-stap-nu' : ''}`}
                style={{ '--zd-kleur': KLEUR[s.zinsdeel] }}
              >{i < stapIdx || zinKlaar ? '✓ ' : ''}{s.zinsdeel}</span>
            ))}
          </div>

          <div className="zd-zin">
            {huidig.segmenten.map((seg, segIdx) => {
              const tekst = seg.woorden.map(i => woorden[i]).join(' ')
              const aan = gekozen.includes(segIdx)
              const vol = seg.plekIds.some(id => gedaan[`${id}@${segIdx}`])
              return (
                <span key={segIdx} className="zd-kolom">
                  <button
                    type="button"
                    data-segment={segIdx}
                    className={`zd-groep${vol ? ' zd-groep-vol' : ''}${aan ? ' zd-groep-gekozen' : ''}${stapFout && aan ? ' zd-groep-mis' : ''}`}
                    style={aan ? { '--zd-kleur': kleurNu } : undefined}
                    disabled={zinKlaar}
                    onClick={() => kies(segIdx)}
                  >{tekst}</button>

                  {/* Onder de groep een baan per goedgekeurd onderdeel, in
                      dezelfde kleur als de vraag. */}
                  {banen.map((baan, l) => {
                    const plek = baan.find(p => gedaan[`${p.id}@${segIdx}`])
                    // Loopt dezelfde plek door vanaf de vorige groep? Dan geen
                    // nieuw labeltje, maar de streep doortrekken.
                    const vervolg = !!plek && segIdx > 0 && !!gedaan[`${plek.id}@${segIdx - 1}`]
                    return (
                      <span
                        key={l}
                        className={`zd-baan${plek ? ' zd-baan-aan' : ''}${vervolg ? ' zd-baan-vervolg' : ''}`}
                        style={plek ? { '--zd-kleur': KLEUR[plek.zinsdeel] } : undefined}
                      >
                        {plek && !vervolg && (
                          <span className="zd-baan-label" title={plek.zinsdeel}>{AFK[plek.zinsdeel]}</span>
                        )}
                      </span>
                    )
                  })}

                  {/* De baan van de stap waar je nú mee bezig bent: gestippeld,
                      want er is nog niets nagekeken. */}
                  {stap && (
                    <span
                      className={`zd-baan${aan ? ' zd-baan-aan zd-baan-nu' : ''}${stapFout && aan ? ' zd-baan-fout' : ''}`}
                      style={aan ? { '--zd-kleur': kleurNu } : undefined}
                    >
                      {aan && <span className="zd-baan-label" title={stap.zinsdeel}>{AFK[stap.zinsdeel]}</span>}
                    </span>
                  )}
                </span>
              )
            })}
          </div>

          {!zinKlaar && stap && (
            <p className={`tv-vraag${stapFout ? ' tv-vraag-fout' : ''}`}>
              {stapFout
                ? 'Nog niet goed — klik een woordgroep uit of juist aan en probeer het opnieuw.'
                : (
                  <>
                    <strong style={{ color: kleurNu }}>{VRAAG[stap.zinsdeel]}</strong>
                    <span className="tv-vraag-extra"> — je mag ook meer dan één woordgroep aanklikken.</span>
                  </>
                )}
            </p>
          )}
          {zinKlaar && (
            <p className="tv-vraag">
              {zinGoed ? 'Helemaal zelf ontleed!' : 'Klaar! Kijk hieronder nog even wat waar hoort.'}
            </p>
          )}
        </div>

        {!zinKlaar && stap && (
          <>
            <button className="zd-verder" disabled={gekozen.length === 0} onClick={kijkStapNa}>
              {gekozen.length === 0 ? 'Klik eerst in de zin' : 'Verder →'}
            </button>

            {/* Hulp: geen antwoord, maar de truc om het onderdeel zelf te
                vinden. De tip hoort bij de stap waar je nu mee bezig bent. */}
            <div className="tv-tip-rij">
              <button className="tv-tip-knop" onClick={() => setTipOpen(o => !o)}>
                {tipOpen ? '💡 Tip verbergen' : '💡 Hoe vind ik dit?'}
              </button>
            </div>
            {tipOpen && (
              <div className="tv-tip">
                <span className="tv-tip-icon">💡</span>
                <p>
                  <strong style={{ color: kleurNu }}>{stap.zinsdeel}</strong> — {TIP_ZINSDEEL[stap.zinsdeel]}
                </p>
              </div>
            )}
          </>
        )}

        {zinKlaar && (
          <>
            <div className={`tv-feedback ${zinGoed ? 'tv-feedback-correct' : 'tv-feedback-wrong'}`}>
              <span className="tv-feedback-icon">{zinGoed ? '✓' : '✗'}</span>
              <div>
                {huidig.stappen
                  .flatMap(s => [...new Set(s.doelen.map(d => d.plekId))])
                  .map(id => huidig.plekken.find(p => p.id === id))
                  .map(plek => (
                    <p key={plek.id} className="tv-feedback-uitleg">
                      <strong style={{ color: KLEUR[plek.zinsdeel] }}>{plek.zinsdeel}</strong> — {plek.uitleg}
                    </p>
                  ))}
              </div>
            </div>
            <button className="zd-verder" onClick={naZin}>Volgende zin →</button>
          </>
        )}
      </div>
    </div>
  )
}
