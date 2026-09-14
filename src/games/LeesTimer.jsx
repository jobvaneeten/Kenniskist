import { useCallback, useEffect, useRef, useState } from 'react'
import { useGebruikOpdracht } from './gebruikOpdracht.js'
import { doelMinuten, leesStand, schrijfStand, wisStand, verstreken } from '../lib/leestimerOpslag.js'
import './lees-timer.css'

// Stil lezen als weektaak-opdracht: geen vragen, geen scherm om naar te
// kijken — alleen een timer die loopt terwijl het kind in zijn boek leest.
//
// De klok rekent met échte kloktijd (zie lib/leestimerOpslag.js), niet met
// tikken. Gaat de iPad in slaapstand, valt het tabblad weg of herlaadt de
// pagina midden in een leesbeurt, dan telt de tijd gewoon door — precies wat je
// wilt bij een kind dat in een papieren boek leest. Daarbovenop vraagt dit
// scherm een Wake Lock aan, zodat het scherm zo lang mogelijk aanblijft.
//
// Stoppen doe je expliciet: de pauzeknop, of teruggaan naar de weektaak. Beide
// zetten de verstreken tijd vast. Op de weektaakkaart staat dan hoeveel
// minuten er nog te lezen zijn; de opdracht blijft open tot ze gelezen zijn.
const BRIEFGELD_PER_MINUUT = 10

const minutenTekst = (n) => `${n} ${n === 1 ? 'minuut' : 'minuten'}`

function klok(seconden) {
  const m = Math.floor(seconden / 60)
  const s = seconden % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function LeesTimer({ onBack, addBriefgeld, aantal, config, opdrachtId }) {
  const minuten = doelMinuten(config)
  const opdrachttekst = config?.opdrachttekst?.trim()
  const doelSeconden = minuten * 60

  const opdracht = useGebruikOpdracht({ toolId: 'lezen-timer', aantal })
  const beginstand = useRef(leesStand(opdrachtId, doelSeconden)).current
  const [stand, setStand] = useState(beginstand)
  // Liep de timer nog toen de pagina wegviel (slaapstand, crash, herladen),
  // dan pakken we hem meteen lopend weer op: de tijd is ondertussen ook
  // doorgelopen, het zou raar zijn om dan op een startknop te wachten.
  const [fase, setFase] = useState(beginstand.startOp ? 'bezig' : 'start')
  const [, tik] = useState(0)
  const afgerondRef = useRef(false)

  const standRef = useRef(stand)
  standRef.current = stand

  const zet = useCallback((nieuw) => {
    setStand(nieuw)
    schrijfStand(opdrachtId, doelSeconden, nieuw)
  }, [opdrachtId, doelSeconden])

  const seconden = verstreken(stand, doelSeconden)

  // Vastzetten zonder de fase aan te raken: ook gebruikt bij het verlaten van
  // het scherm, en dan is er geen component meer om een fase aan te geven.
  const zetVast = useCallback(() => {
    const s = standRef.current
    if (!s.startOp) return
    const stil = { gebankt: verstreken(s, doelSeconden), startOp: null }
    standRef.current = stil
    schrijfStand(opdrachtId, doelSeconden, stil)
    return stil
  }, [opdrachtId, doelSeconden])

  const pauzeer = useCallback(() => {
    const stil = zetVast()
    if (stil) setStand(stil)
    setFase(f => (f === 'bezig' ? 'pauze' : f))
  }, [zetVast])

  // Eén render per seconde zolang de timer loopt; het rekenwerk zit in
  // verstreken(). Ook bij terugkomst uit de slaapstand meteen bijwerken, zodat
  // de klok niet een seconde lang de oude tijd laat staan.
  useEffect(() => {
    if (fase !== 'bezig') return
    const id = setInterval(() => tik(n => n + 1), 1000)
    const bij = () => tik(n => n + 1)
    document.addEventListener('visibilitychange', bij)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', bij) }
  }, [fase])

  // Scherm wakker houden terwijl er gelezen wordt. iPadOS geeft de lock terug
  // zodra het tabblad even weg is geweest, dus opnieuw aanvragen bij terugkomst.
  useEffect(() => {
    if (fase !== 'bezig') return
    let lock = null
    let levend = true
    const vraag = async () => {
      try {
        if (!levend || !navigator.wakeLock) return
        lock = await navigator.wakeLock.request('screen')
      } catch { /* batterijbesparing of geen ondersteuning — niet erg */ }
    }
    const opnieuw = () => { if (document.visibilityState === 'visible') vraag() }
    vraag()
    document.addEventListener('visibilitychange', opnieuw)
    return () => {
      levend = false
      document.removeEventListener('visibilitychange', opnieuw)
      lock?.release?.().catch(() => {})
    }
  }, [fase])

  // Weg van dit scherm (terugknop, of het hele menu sluit) = pauze. Anders zou
  // een lopende startOp blijven staan en zou het kind na een uur iets anders
  // doen zijn leesbeurt "af" hebben. Alleen de opslag, geen fase: in StrictMode
  // is een unmount niet altijd echt het einde.
  useEffect(() => zetVast, [zetVast])

  // Klaar: één keer rapporteren (score 1 van 1, zodat de weektaak deze sessie
  // als gemaakt telt) en de bewaarde tijd opruimen.
  useEffect(() => {
    if (fase !== 'bezig' || seconden < doelSeconden || afgerondRef.current) return
    afgerondRef.current = true
    opdracht.registreer(true, { vraag: `${minutenTekst(minuten)} lezen`, antwoord: 'uitgelezen' })
    addBriefgeld?.(minuten * BRIEFGELD_PER_MINUUT)
    setStand({ gebankt: 0, startOp: null })
    wisStand(opdrachtId)
    setFase('af')
  }, [fase, seconden, doelSeconden, minuten, opdracht, addBriefgeld, opdrachtId])

  const over = Math.max(0, doelSeconden - seconden)
  const pct = Math.min(100, Math.round((seconden / doelSeconden) * 100))
  const minutenOver = Math.ceil(over / 60)

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
              onClick={() => {
                afgerondRef.current = false
                zet({ gebankt: 0, startOp: Date.now() })
                setFase('bezig')
              }}
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
      <div className="game-screen game-screen-center lt-scherm">
        <div className="lt-klok">{klok(over)}</div>
        <div className="lt-balk"><div className="lt-balk-vul" style={{ width: `${pct}%` }} /></div>
        <p className="lt-status">Lezen maar — de timer loopt gewoon door, ook als het scherm uitgaat.</p>
        {opdrachttekst && <p className="lt-opdracht">{opdrachttekst}</p>}
        <div className="lt-knoppen">
          <button className="lt-pauzeknop" onClick={pauzeer}>⏸ Pauze</button>
        </div>
      </div>
    )
  }

  const hervat = seconden > 0

  return (
    <div className="game-screen game-screen-center">
      <button className="back-btn" onClick={onBack}>← Terug naar weektaak</button>
      <div className="game-header">
        <span className="game-header-icon">{fase === 'pauze' ? '⏸' : '📖'}</span>
        <h1 className="game-header-title">
          {fase === 'pauze' ? 'Pauze' : `${minutenTekst(minuten)} lezen`}
        </h1>
        <p className="game-header-sub">
          {fase === 'pauze'
            ? `Nog ${minutenTekst(minutenOver)} te lezen. De timer staat stil tot je verder gaat.`
            : opdrachttekst || 'Pak je leesboek erbij. Als je op start drukt loopt de timer.'}
        </p>
      </div>
      {fase !== 'pauze' && hervat && (
        <p className="lt-hervat">Je hebt al {klok(seconden)} gelezen — nog {minutenTekst(minutenOver)} te gaan.</p>
      )}
      <p className="lt-uitleg">
        Je mag tussendoor stoppen met de pauzeknop of de terugknop: je gelezen minuten blijven bewaard en je
        leestaak is pas af als je ze allemaal hebt gelezen.
      </p>
      <button
        className="lt-startknop"
        onClick={() => { zet({ gebankt: seconden, startOp: Date.now() }); setFase('bezig') }}
      >
        {hervat ? 'Verder lezen' : 'Start de timer'}
      </button>
      {fase === 'pauze' && (
        <div className="lt-knoppen">
          <button className="back-btn lt-terug" onClick={onBack}>← Terug naar weektaak</button>
        </div>
      )}
    </div>
  )
}
