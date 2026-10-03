import { useState, useMemo } from 'react'
import { WOORDEN_PER_BLOK, kernVan, deelVan, deelNaam } from './woordenschatData.js'
import SpelBeloning, { BRIEFGELD } from './SpelBeloning'
import { useGebruikOpdracht } from './gebruikOpdracht.js'
import OpdrachtKlaarScherm from './OpdrachtKlaarScherm.jsx'
import './taal-oefenen.css'

// Woordenschat per blok (blok 1 = thema 1, les 2/7/12; blok 2-8 = thema 2-8,
// week 1-3) — alle 45 woorden van het blok door elkaar. Vier vraagvormen per woord, zodat hetzelfde begrip niet elke keer
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

function maakVraag(woord, woorden) {
  const soorten = ['betekenis', 'woord', 'zin']
  if (woord.tegen) soorten.push('tegen')
  const soort = soorten[Math.floor(Math.random() * soorten.length)]
  const zelfdeLes = woorden.filter(w => deelVan(w) === deelVan(woord))
  const anders = woorden.filter(w => deelVan(w) !== deelVan(woord))

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
    const paren = woorden.filter(w => w.tegen && w.woord !== juist)
    const opties = shuffle([juist, ...kiesAfleiders(woord, paren, woorden, w => w.woord).map(w => w.woord)])
    return { soort, woord, kop: woord.woord, vraag: 'Wat is het tegenovergestelde?', juist, opties }
  }

  // invullen in een zin — afleiders van dezelfde vorm (uitdrukking of niet),
  // anders valt de juiste optie meteen op
  const juist = kernVan(woord)
  const zelfdeVorm = woorden.filter(w => !!w.uitdrukking === !!woord.uitdrukking)
  const opties = shuffle([juist, ...kiesAfleiders(woord, zelfdeVorm, woorden, kernVan).map(kernVan)])
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

export default function Woordenschat({ blok = 1, onBack, addBriefgeld, addCuruntie, aantal }) {
  const woorden = WOORDEN_PER_BLOK[blok]
  const [pool, setPool] = useState(() => shuffle(woorden))
  const [poolIdx, setPoolIdx] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState(null) // { correct, gekozen }
  const [showReward, setShowReward] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)

  const opdracht = useGebruikOpdracht({ toolId: `woordenschat-blok${blok}`, aantal })
  const huidig = pool[poolIdx]
  // Eén vraag per woord-beurt: opnieuw genereren bij elke render zou de
  // antwoordknoppen laten springen zodra er state verandert.
  const vraag = useMemo(() => maakVraag(huidig, woorden), [huidig, woorden])
  // De hint: alle woorden van deze les/week met hun betekenis, op alfabet. Het
  // antwoord staat er dus tussen, maar de leerling moet het er zelf uit halen.
  const lesWoorden = useMemo(
    () => woorden.filter(w => deelVan(w) === deelVan(huidig))
      .sort((a, b) => kernVan(a).localeCompare(kernVan(b), 'nl')),
    [woorden, huidig],
  )

  function volgende() {
    setFeedback(null)
    setHintOpen(false)
    const next = poolIdx + 1
    if (next >= pool.length) {
      setPool(shuffle(woorden))
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
          <p className="tv-mode-label">📓 Woordenschat · blok {blok} · {deelNaam(huidig)}</p>
          <div className={isZin ? 'tv-zin' : `tv-ws-kop${vraag.soort === 'betekenis' || vraag.soort === 'tegen' ? ' tv-ws-begrip' : ''}`}>
            {isZin
              ? <ZinMetGat zin={huidig.zin} ingevuld={feedback ? vraag.juist : null} />
              : vraag.kop}
          </div>
          <p className="tv-vraag">{vraag.vraag}</p>
        </div>

        {/* Hulp bij het zoeken: de woordenlijst van deze les met de betekenis
            erbij. Het antwoord staat er tussen, maar je moet het er zelf
            uithalen — daarom staat de lijst op alfabet en niet op volgorde van
            de vraag. */}
        {!feedback && (
          <div className="tv-hint">
            <button
              className={`tv-hint-btn${hintOpen ? ' tv-hint-btn-open' : ''}`}
              onClick={() => setHintOpen(v => !v)}
            >
              {hintOpen ? '💡 Hint verbergen' : `💡 Hint — woordenlijst van ${deelNaam(huidig)}`}
            </button>
            {hintOpen && (
              <div className="tv-hint-lijst">
                <p className="tv-hint-kop">
                  Alle woorden van {deelNaam(huidig)}. Zoek zelf welk woord erbij hoort.
                </p>
                <ul>
                  {lesWoorden.map(w => (
                    <li key={w.woord}><strong>{w.woord}</strong> — {w.uitleg}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

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
