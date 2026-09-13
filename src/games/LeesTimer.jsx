import { useCallback, useEffect, useRef, useState } from 'react'
import { useGebruikOpdracht } from './gebruikOpdracht.js'
import './lees-timer.css'

// Stil lezen als weektaak-opdracht: geen vragen, geen scherm om naar te
// kijken — alleen een timer die loopt terwijl het kind in zijn boek leest.
//
// Twee dingen maken dit een taak en geen kookwekker:
//   • Tijdens het lopen is er geen uitgang. De terugknop verdwijnt, zodat het
//     kind die kwartier ook echt niet iets anders in Kenniskist kan doen.
//   • De klok telt alleen als dit scherm vóór staat (zichtbaar én in focus).
//     Wegklikken naar een spelletje of een ander tabblad zet de timer stil in
//     plaats van hem door te laten lopen.
//
// De verstreken tijd staat in localStorage, per opdracht. Herladen of even
// wegklikken kost dus geen voortgang — maar levert ook niets op.
const STANDAARD_MINUTEN = 15
const BRIEFGELD_PER_MINUUT = 10
const VERVALT_NA_MS = 24 * 60 * 60 * 1000

function sleutelVoor(opdrachtId) {
  return `kk_leestimer_${opdrachtId ?? 'vrij'}`
}

function leesOpgeslagen(sleutel, doelSeconden) {
  try {
    const d = JSON.parse(localStorage.getItem(sleutel) || 'null')
    if (!d || d.doel !== doelSeconden) return 0
    if (!d.op || Date.now() - d.op > VERVALT_NA_MS) return 0
    return Math.min(doelSeconden, Math.max(0, d.seconden | 0))
  } catch { return 0 }
}

const minutenTekst = (n) => `${n} ${n === 1 ? 'minuut' : 'minuten'}`

function klok(seconden) {
  const m = Math.floor(seconden / 60)
  const s = seconden % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function LeesTimer({ onBack, addBriefgeld, aantal, config, opdrachtId }) {
  const minuten = Math.max(1, Math.min(60, parseInt(config?.minuten, 10) || STANDAARD_MINUTEN))
  const opdrachttekst = config?.opdrachttekst?.trim()
  const doelSeconden = minuten * 60
  const sleutel = sleutelVoor(opdrachtId)

  const opdracht = useGebruikOpdracht({ toolId: 'lezen-timer', aantal })
  const [fase, setFase] = useState('start')   // start | bezig | af
  const [seconden, setSeconden] = useState(() => leesOpgeslagen(sleutel, doelSeconden))
  const [loopt, setLoopt] = useState(true)    // false = scherm staat niet vóór
  const afgerondRef = useRef(false)

  const bewaar = useCallback((s) => {
    try { localStorage.setItem(sleutel, JSON.stringify({ seconden: s, doel: doelSeconden, op: Date.now() })) } catch { /* vol of privémodus */ }
  }, [sleutel, doelSeconden])

  // Eén tik per seconde, maar alleen als dit scherm zichtbaar is én de focus
  // heeft. Beide checks binnen de tik zelf: een visibilitychange-listener zou
  // het geval "ander venster ervoor" missen.
  useEffect(() => {
    if (fase !== 'bezig') return
    const id = setInterval(() => {
      const voor = document.visibilityState === 'visible' && document.hasFocus()
      setLoopt(voor)
      if (!voor) return
      setSeconden(s => {
        const nieuw = s + 1
        if (nieuw % 5 === 0 || nieuw >= doelSeconden) bewaar(nieuw)
        return nieuw
      })
    }, 1000)
    return () => clearInterval(id)
  }, [fase, doelSeconden, bewaar])

  // Klaar: één keer rapporteren (score 1 van 1, zodat de weektaak deze sessie
  // als gemaakt telt) en de bewaarde tijd opruimen.
  useEffect(() => {
    if (fase !== 'bezig' || seconden < doelSeconden || afgerondRef.current) return
    afgerondRef.current = true
    opdracht.registreer(true, { vraag: `${minutenTekst(minuten)} lezen`, antwoord: 'uitgelezen' })
    addBriefgeld?.(minuten * BRIEFGELD_PER_MINUUT)
    try { localStorage.removeItem(sleutel) } catch { /* niets aan te doen */ }
    setFase('af')
  }, [fase, seconden, doelSeconden, minuten, opdracht, addBriefgeld, sleutel])

  const over = Math.max(0, doelSeconden - seconden)
  const pct = Math.min(100, Math.round((seconden / doelSeconden) * 100))

  if (fase === 'af') {
    const nogNodig = opdracht.aantal != null && !opdracht.klaar
    return (
      <div className="game-screen game-screen-center">
        <div className="game-header">
          <span className="game-header-icon">📖</span>
          <h1 className="game-header-title">{minutenTekst(minuten)} gelezen!</h1>
          <p className="game-header-sub">
            {nogNodig
              ? `Je hebt ${opdracht.gedaan} van de ${opdracht.aantal} leesbeurten gedaan.`
              : 'Je leestaak is af — laat het aan je juf of meester zien.'}
          </p>
        </div>
        {opdracht.opslaanMislukt && (
          <p className="lt-waarschuwing">⚠️ Je leesbeurt kon niet worden opgeslagen — laat dit scherm zien.</p>
        )}
        <div className="lt-knoppen">
          {nogNodig && (
            <button
              className="lt-startknop"
              onClick={() => { afgerondRef.current = false; setSeconden(0); setFase('bezig') }}
            >
              Nog een leesbeurt
            </button>
          )}
          <button className="back-btn lt-terug" onClick={onBack}>← Terug naar weektaak</button>
        </div>
      </div>
    )
  }

  if (fase === 'bezig') {
    return (
      <div className={`game-screen game-screen-center lt-scherm${loopt ? '' : ' lt-stil'}`}>
        <div className="lt-klok">{klok(over)}</div>
        <div className="lt-balk"><div className="lt-balk-vul" style={{ width: `${pct}%` }} /></div>
        <p className="lt-status">
          {loopt
            ? 'Lezen maar — de timer loopt. Deze pagina moet openblijven.'
            : '⏸ De timer staat stil. Klik op dit scherm om verder te gaan.'}
        </p>
        {opdrachttekst && <p className="lt-opdracht">{opdrachttekst}</p>}
      </div>
    )
  }

  return (
    <div className="game-screen game-screen-center">
      <button className="back-btn" onClick={onBack}>← Terug naar weektaak</button>
      <div className="game-header">
        <span className="game-header-icon">📖</span>
        <h1 className="game-header-title">{minutenTekst(minuten)} lezen</h1>
        <p className="game-header-sub">
          {opdrachttekst || 'Pak je leesboek erbij. Als je op start drukt loopt de timer.'}
        </p>
      </div>
      {seconden > 0 && (
        <p className="lt-hervat">Je was al {klok(seconden)} bezig — je gaat verder waar je gebleven was.</p>
      )}
      <p className="lt-uitleg">
        Tijdens het lezen kun je niets anders doen in Kenniskist. Klik je weg, dan staat de timer stil tot je
        terug bent.
      </p>
      <button className="lt-startknop" onClick={() => setFase('bezig')}>
        {seconden > 0 ? 'Verder lezen' : 'Start de timer'}
      </button>
    </div>
  )
}
