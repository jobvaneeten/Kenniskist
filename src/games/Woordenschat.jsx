import { useState, useMemo } from 'react'
import { WOORDEN, kernVan } from './woordenschatData.js'
import SpelBeloning, { BRIEFGELD } from './SpelBeloning'
import { useGebruikOpdracht } from './gebruikOpdracht.js'
import OpdrachtKlaarScherm from './OpdrachtKlaarScherm.jsx'
import './taal-oefenen.css'

// Woordenschat blok 1 (Staal thema 1, les 2/7/12) — alle 45 woorden door
// elkaar. Vier vraagvormen per woord, zodat hetzelfde begrip niet elke keer
// hetzelfde vraagje wordt: woord→betekenis, betekenis→woord, invullen in een
// zin en tegenstellingen (alleen bij woordparen).
//
// Beloning: na elke 10 goede antwoorden een spel (SpelBeloning, hetzelfde
// systeem als de andere oefeningen). Vrij oefenen loopt door tot de leerling
// stopt; vanuit een weektaak-opdracht stopt het na `aantal` vragen.

const GOED_VOOR_REWARD = 10
const OPTIES = 4

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Afleiders: eerst uit de "voorkeurspoel" (zelfde les, of ook een uitdrukking),
// aangevuld uit de rest zodra die poel te klein is.
function kiesAfleiders(woord, voorkeur, rest, waarde) {
  const juist = waarde(woord)
  const uniek = (lijst) => {
    const gezien = new Set([juist])
    return lijst.filter(w => {
      const v = waarde(w)
      if (w === woord || gezien.has(v)) return false
      gezien.add(v)
      return true
    })
  }
  const gekozen = shuffle(uniek(voorkeur)).slice(0, OPTIES - 1)
  if (gekozen.length < OPTIES - 1) {
    const gebruikt = new Set(gekozen.map(waarde))
    for (const w of shuffle(uniek(rest))) {
      if (gekozen.length >= OPTIES - 1) break
      if (!gebruikt.has(waarde(w))) { gekozen.push(w); gebruikt.add(waarde(w)) }
    }
  }
  return gekozen
}

function maakVraag(woord) {
  const soorten = ['betekenis', 'woord', 'zin']
  if (woord.tegen) soorten.push('tegen')
  const soort = soorten[Math.floor(Math.random() * soorten.length)]
  const zelfdeLes = WOORDEN.filter(w => w.les === woord.les)
  const anders = WOORDEN.filter(w => w.les !== woord.les)

  if (soort === 'betekenis') {
    const juist = woord.uitleg
    const opties = shuffle([juist, ...kiesAfleiders(woord, zelfdeLes, anders, w => w.uitleg).map(w => w.uitleg)])
    return { soort, woord, kop: woord.woord, vraag: 'Wat betekent dit woord?', juist, opties, lang: true }
  }

  if (soort === 'woord') {
    const juist = woord.woord
    const opties = shuffle([juist, ...kiesAfleiders(woord, zelfdeLes, anders, w => w.woord).map(w => w.woord)])
    return { soort, woord, kop: woord.uitleg, vraag: 'Welk woord hoort hierbij?', juist, opties }
  }

  if (soort === 'tegen') {
    const juist = woord.tegen
    const paren = WOORDEN.filter(w => w.tegen && w.woord !== juist)
    const opties = shuffle([juist, ...kiesAfleiders(woord, paren, WOORDEN, w => w.woord).map(w => w.woord)])
    return { soort, woord, kop: woord.woord, vraag: 'Wat is het tegenovergestelde?', juist, opties }
  }

  // invullen in een zin — afleiders van dezelfde vorm (uitdrukking of niet),
  // anders valt de juiste optie meteen op
  const juist = kernVan(woord)
  const zelfdeVorm = WOORDEN.filter(w => !!w.uitdrukking === !!woord.uitdrukking)
  const opties = shuffle([juist, ...kiesAfleiders(woord, zelfdeVorm, WOORDEN, kernVan).map(kernVan)])
  return { soort, woord, kop: woord.zin, vraag: 'Welk woord past in de zin?', juist, opties }
}

// De zin met het gat: het streepje is de plek van het woord, na het antwoord
// staat het juiste woord er ingevuld.
function ZinMetGat({ zin, ingevuld }) {
  const [voor, na] = zin.split('___')
  return (
    <>
      {voor}
      {ingevuld
        ? <mark className="tv-highlight">{ingevuld}</mark>
        : <span className="tv-gat">_____</span>}
      {na}
    </>
  )
}

export default function Woordenschat({ onBack, addBriefgeld, addCuruntie, aantal }) {
  const [pool, setPool] = useState(() => shuffle(WOORDEN))
  const [poolIdx, setPoolIdx] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState(null) // { correct, gekozen }
  const [showReward, setShowReward] = useState(false)

  const opdracht = useGebruikOpdracht({ toolId: 'woordenschat-blok1', aantal })
  const huidig = pool[poolIdx]
  // Eén vraag per woord-beurt: opnieuw genereren bij elke render zou de
  // antwoordknoppen laten springen zodra er state verandert.
  const vraag = useMemo(() => maakVraag(huidig), [huidig])

  function volgende() {
    setFeedback(null)
    const next = poolIdx + 1
    if (next >= pool.length) {
      setPool(shuffle(WOORDEN))
      setPoolIdx(0)
    } else {
      setPoolIdx(next)
    }
  }

  function antwoord(gekozen) {
    if (feedback) return
    const correct = gekozen === vraag.juist
    setFeedback({ correct, gekozen })

    // Laatste opgave van een weektaak-opdracht: eerst de feedback laten zien,
    // dan pas registreren (net als bij TaalOefenen/WerkwoordSpelling).
    const zalKlaarZijn = opdracht.aantal != null && (opdracht.gedaan + 1) >= opdracht.aantal
    if (zalKlaarZijn) {
      setTimeout(() => {
        setFeedback(null)
        opdracht.registreer(correct, { vraag: vraag.kop, antwoord: gekozen, juist: vraag.juist })
      }, 1800)
      return
    }
    opdracht.registreer(correct, { vraag: vraag.kop, antwoord: gekozen, juist: vraag.juist })

    if (correct) {
      const nieuw = correctCount + 1
      setCorrectCount(nieuw)
      if (nieuw % GOED_VOOR_REWARD === 0) {
        setTimeout(() => { setFeedback(null); setShowReward(true) }, 1400)
        return
      }
    }
    setTimeout(() => volgende(), correct ? 1400 : 2400)
  }

  if (showReward) {
    return (
      <SpelBeloning
        title="Top — 10 woorden goed!"
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

  const isZin = vraag.soort === 'zin'
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
        <div className={`tv-card ${feedback ? (feedback.correct ? 'tv-card-correct' : 'tv-card-wrong') : ''}`}>
          <p className="tv-mode-label">📓 Woordenschat · thema 1 · les {huidig.les}</p>
          <div className={isZin ? 'tv-zin' : `tv-ws-kop${vraag.soort === 'betekenis' || vraag.soort === 'tegen' ? ' tv-ws-begrip' : ''}`}>
            {isZin
              ? <ZinMetGat zin={huidig.zin} ingevuld={feedback ? vraag.juist : null} />
              : vraag.kop}
          </div>
          <p className="tv-vraag">{vraag.vraag}</p>
        </div>

        {/* De knoppen blijven na het antwoorden staan, met het juiste antwoord
            in het groen — zo zie je meteen wát het had moeten zijn. */}
        <div className={`tv-answers${vraag.lang ? ' tv-answers-kolom' : ''}`}>
          {vraag.opties.map(optie => {
            const staat = !feedback ? ''
              : optie === vraag.juist ? ' tv-answer-goed'
              : optie === feedback.gekozen ? ' tv-answer-fout'
              : ' tv-answer-dim'
            return (
              <button
                key={optie} className={`tv-answer-btn${staat}`} disabled={!!feedback}
                onClick={() => antwoord(optie)}
              >{optie}</button>
            )
          })}
        </div>

        {feedback && (
          <div className={`tv-feedback ${feedback.correct ? 'tv-feedback-correct' : 'tv-feedback-wrong'}`}>
            <span className="tv-feedback-icon">{feedback.correct ? '✓' : '✗'}</span>
            <div>
              <p className="tv-feedback-uitleg"><strong>{huidig.woord}</strong> — {huidig.uitleg}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
