import { useEffect, useRef, useState } from 'react'
import { maakOfJoin, nieuweCode, FOUT_TEKST } from './online/verbinding.js'
import VerbindingsMelding, { VerbindStatus } from './online/VerbindingsMelding.jsx'
import Joystick from './online/Joystick.jsx'
import Icoon from './online/Iconen.jsx'
import { heeftAanraak, schermVol } from './online/apparaat.js'
import { NeonScherm, Titel, StartScherm, Wachtkamer, Aftelling, HudKnoppen, HudKnop } from './online/Schermen.jsx'
import { KLEUREN, VORMEN } from './online/gedeeld/vloerArena.js'
import { maakVloerScene } from './vloerScene.js'
import { EMOTES, mijnEmotes } from './online/emotes.js'
import './vloerquiz.css'

// Vloerquiz: Kahoot met je eigen poppetje. De leerkracht zet in het portaal
// vragen klaar (VloerHost, op het bord), de kinderen doen mee met de code
// (VloerQuiz, vanuit de Kledingkast) en rennen naar het vlak met het goede
// antwoord. Server: kenniskist-server/src/rooms/VloerRoom.ts.

const ACCENT = '#3df2ff'
const kaal = (naam) => String(naam || 'Speler').replace(/^\u{1F916}\s*/u, '')

export function Vorm({ i, className = '' }) {
  const vorm = VORMEN[i]
  return (
    <svg viewBox="0 0 24 24" className={'vq-vorm ' + className} aria-hidden="true">
      {vorm === 'driehoek' && <path d="M12 3l9.5 17h-19z" />}
      {vorm === 'ruit' && <path d="M12 2l10 10-10 10L2 12z" />}
      {vorm === 'rondje' && <circle cx="12" cy="12" r="9.5" />}
      {vorm === 'vierkant' && <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />}
    </svg>
  )
}

// Wat React van de server-stand nodig heeft. Posities horen er niet bij: die
// leest de 3D-scene zelf, anders tekent React twintig keer per seconde.
function momentopname(s, ikId) {
  const spelers = []
  s?.players?.forEach((p, sid) => spelers.push({
    sid, naam: kaal(p.name), bot: p.isBot, score: p.score, laatste: p.laatste, goed: p.goed, reeks: p.reeks, ik: sid === ikId,
  }))
  spelers.sort((a, b) => b.score - a.score)
  if (!s?.players) return { phase: 'laden', opties: [], spelers: [] }
  return {
    phase: s.phase, countdown: s.countdown, nr: s.nr, aantal: s.aantal, vraag: s.vraag,
    opties: [...s.opties], goed: s.goed, tijd: s.tijd, hostWeg: s.hostWeg, pauze: s.pauze, spelers,
  }
}

// ── Gedeeld: canvas, scene en de stand ────────────────────────────────────
function useVloer(room, ikId) {
  const canvasRef = useRef(null)
  const hudRef = useRef(null)
  const joyRef = useRef({ x: 0, z: 0 })
  const klokRef = useRef(null)
  const balkRef = useRef(null)
  const doorRef = useRef(null)
  const [stand, setStand] = useState(() => momentopname(room.state, ikId))
  const [aantallen, setAantallen] = useState([])

  useEffect(() => {
    let vorige = ''
    const bij = () => {
      const m = momentopname(room.state, ikId)
      const j = JSON.stringify(m)
      if (j !== vorige) { vorige = j; setStand(m) }
    }
    bij()
    room.onStateChange(bij)
    return () => room.onStateChange.remove(bij)
  }, [room, ikId])

  useEffect(() => {
    const scene = maakVloerScene(canvasRef.current, {
      ikId, haalState: () => room.state, stuur: (t, d) => room.send(t, d),
      invoerRef: joyRef, hudRef, opUitslag: setAantallen,
    })
    // klok en tijdbalk: elk beeld, zonder React
    let raf
    const klok = () => {
      const s = room.state
      if (klokRef.current) klokRef.current.textContent = Math.ceil(s.timeLeft ?? 0)
      if (balkRef.current) balkRef.current.style.transform = `scaleX(${Math.max(0, (s.timeLeft ?? 0) / (s.tijd || 20))})`
      if (doorRef.current) doorRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, (s.timeLeft ?? 0) / 5))})`
      raf = requestAnimationFrame(klok)
    }
    raf = requestAnimationFrame(klok)
    return () => { cancelAnimationFrame(raf); scene.dispose() }
  }, [room, ikId])

  return { canvasRef, hudRef, joyRef, klokRef, balkRef, doorRef, stand, aantallen }
}

function VraagKop({ stand, klokRef, balkRef, groot }) {
  return (
    <div className={'vq-vraag' + (groot ? ' groot' : '')}>
      <div className="vq-vraag-rij">
        <span className="vq-chip">Vraag {stand.nr} van {stand.aantal}</span>
        {stand.phase === 'vraag' && <span className="vq-klok"><Icoon naam="klok" /><b ref={klokRef}>{stand.tijd}</b></span>}
      </div>
      <h2>{stand.vraag}</h2>
      {stand.phase === 'vraag' && <div className="vq-tijdbalk"><div ref={balkRef} /></div>}
    </div>
  )
}

function Antwoorden({ stand, aantallen, groot }) {
  const uitslag = stand.phase === 'uitslag'
  const max = Math.max(1, ...aantallen)
  return (
    <div className={'vq-antwoorden n' + stand.opties.length + (groot ? ' groot' : '')}>
      {stand.opties.map((o, i) => (
        <div key={i} className={'vq-antw a' + i + (uitslag ? (i === stand.goed ? ' goed' : ' fout') : '')} style={{ '--vk': KLEUREN[i] }}>
          <Vorm i={i} />
          <span className="vq-antw-tekst">{o}</span>
          {uitslag && groot && (
            <span className="vq-telling">
              <span className="vq-telbalk" style={{ height: `${((aantallen[i] ?? 0) / max) * 100}%` }} />
              <b>{aantallen[i] ?? 0}</b>
            </span>
          )}
          {uitslag && i === stand.goed && <Icoon naam="vink" className="vq-vink" />}
        </div>
      ))}
    </div>
  )
}

function Ranglijst({ spelers, max = 5 }) {
  return (
    <ol className="vq-rang">
      {spelers.slice(0, max).map((s, i) => (
        <li key={s.sid} className={s.ik ? 'ik' : ''}>
          <span className="vq-plek">{i + 1}</span>
          <span className="vq-naam">{s.naam}</span>
          <b>{s.score}</b>
        </li>
      ))}
    </ol>
  )
}

// ── Leerling ──────────────────────────────────────────────────────────────
export default function VloerQuiz({ onBack }) {
  const [naam, setNaam] = useState(() => localStorage.getItem('kk_playername') || '')
  const [room, setRoom] = useState(null)
  const [laden, setLaden] = useState(false)
  const [status, setStatus] = useState('')
  const [fout, setFout] = useState('')

  const meedoen = async (code) => {
    setLaden(true); setFout('')
    try {
      if (naam) localStorage.setItem('kk_playername', naam)
      const r = await maakOfJoin('vloer', {
        joinCode: code, name: naam || 'Speler',
        shirt: localStorage.getItem('kk_shirt') || '', wearing: localStorage.getItem('kk_wearing') || '{}',
      }, { onStatus: setStatus })
      setRoom(r)
    } catch (e) {
      setFout(FOUT_TEKST[e.soort] ?? FOUT_TEKST.server)
    } finally {
      setLaden(false); setStatus('')
    }
  }

  if (!room) {
    return (
      <StartScherm accent={ACCENT} icoon="vraag" titel={<>Vloer<span>quiz</span></>}
        sub="Typ de code die je leerkracht op het bord laat zien."
        onBack={onBack} naam={naam} setNaam={setNaam} codeLengte={4}
        laden={laden} status={status} fout={fout} onJoin={meedoen} />
    )
  }
  return <LeerlingSpel room={room} onStop={() => { if (room.connection?.isOpen) room.leave(); setRoom(null) }} />
}

function LeerlingSpel({ room, onStop }) {
  const { canvasRef, hudRef, joyRef, klokRef, balkRef, stand, aantallen } = useVloer(room, room.sessionId)
  const [gestopt, setGestopt] = useState(false)
  const zelfWeg = useRef(false)
  const aanraak = heeftAanraak()

  // De leerkracht stopt: de server stuurt 'gestopt' en we gaan zelf netjes weg
  // (anders blijft de SDK een minuut lang opnieuw verbinden).
  useEffect(() => {
    const stopt = () => { zelfWeg.current = true; setGestopt(true); room.leave() }
    const weg = (code) => { if (!zelfWeg.current && (code === 1000 || code === 4000)) setGestopt(true) }
    const uit = room.onMessage('gestopt', stopt)
    room.onLeave(weg)
    return () => { uit?.(); room.onLeave.remove(weg) }
  }, [room])
  const stop = () => { zelfWeg.current = true; onStop() }

  const ik = stand.spelers.find(s => s.ik)
  const plek = stand.spelers.findIndex(s => s.ik) + 1
  const goedTekst = stand.opties[stand.goed] ?? ''
  const [emotes] = useState(mijnEmotes)
  const emoteMag = stand.phase === 'lobby' || stand.phase === 'uitslag' || stand.phase === 'einde'

  return (
    <div className="vq-spel" style={{ '--on-accent': ACCENT }}>
      <canvas ref={canvasRef} className="vq-canvas" />
      <div ref={hudRef} className="vq-hud">
        <HudKnoppen>
          <HudKnop icoon="vol" aria-label="Volledig scherm" onClick={schermVol} />
          <HudKnop icoon="terug" onClick={stop}>Stoppen</HudKnop>
        </HudKnoppen>
        {ik && stand.phase !== 'einde' && <div className="vq-mijnscore"><Icoon naam="beker" /><b key={ik.score}>{ik.score}</b></div>}

        {stand.phase === 'lobby' && (
          <div className="vq-bericht">
            <b>Je doet mee!</b>
            <span>Wachten tot je leerkracht start. Loop alvast rond{aanraak ? ' met de joystick' : ' met de pijltjes'}.</span>
          </div>
        )}
        {stand.phase === 'aftellen' && <Aftelling n={stand.countdown} />}
        {(stand.phase === 'vraag' || stand.phase === 'uitslag') && (
          <>
            <VraagKop stand={stand} klokRef={klokRef} balkRef={balkRef} />
            <Antwoorden stand={stand} aantallen={aantallen} />
          </>
        )}
        {stand.phase === 'uitslag' && ik && (
          <div key={stand.nr} className={'vq-uitslag ' + (ik.goed === 1 ? 'goed' : 'fout')}>
            <span className="vq-uitslag-kop">{ik.goed === 1 ? 'Goed!' : ik.goed === 0 ? 'Helaas' : 'Je koos niets'}</span>
            {ik.goed === 1
              ? <span>+{ik.laatste} punten{ik.reeks > 1 ? ` · ${ik.reeks} op rij` : ''}</span>
              : <span>Het goede antwoord was <b>{goedTekst}</b></span>}
            <span className="vq-uitslag-plek">{ik.goed === 1 ? 'Je staat op het bord: doe een dansje!' : `Je staat op plek ${plek}`}</span>
          </div>
        )}
        {emoteMag && ik && (
          // key: bij elke uitslag springen de knoppen opnieuw in beeld
          <div key={stand.phase + stand.nr} className={'vq-emotes' + (stand.phase === 'uitslag' && ik.goed === 1 ? ' aandacht' : '')} role="group" aria-label="Dansjes">
            {emotes.map((k, i) => (
              <button key={k} type="button" className="vq-emote" style={{ '--ek': EMOTES[k].kleur, '--i': i }} onClick={() => room.send('emote', k)}>
                <Icoon naam={EMOTES[k].icoon} />
                <span>{EMOTES[k].naam}</span>
              </button>
            ))}
          </div>
        )}
        {stand.hostWeg && <div className="vq-bericht klein">De leerkracht is even weg. Even wachten…</div>}
        {aanraak && stand.phase !== 'einde' && <Joystick joyRef={joyRef} hint={stand.phase === 'vraag' ? 'Lopen' : null} />}
      </div>

      {stand.phase === 'einde' && (
        // aan de zijkant, zodat het podium in beeld blijft
        <aside className="vq-zijpaneel einde">
          <span className="on-embleem"><Icoon naam="beker" /></span>
          <span className="on-label">Eindstand</span>
          <h1 className="on-titel">{plek === 1 ? <>Jij <span>wint!</span></> : <>Plek <span>{plek}</span></>}</h1>
          <p className="on-sub">{ik?.score ?? 0} punten</p>
          <Ranglijst spelers={stand.spelers} />
          <button type="button" className="on-btn lijn" onClick={stop}><Icoon naam="terug" />Stoppen</button>
        </aside>
      )}

      {gestopt && (
        <div className="on-melding-scrim">
          <div className="on-melding" role="alert">
            <h2>De quiz is gestopt</h2>
            <p>Je leerkracht heeft de Vloerquiz afgesloten.</p>
            <button type="button" className="on-knop" onClick={stop}>Terug</button>
          </div>
        </div>
      )}
      {!gestopt && <VerbindingsMelding room={room} onTerug={stop} />}
    </div>
  )
}

// ── Leerkracht (op het bord) ─────────────────────────────────────────────
// vragen: [{ vraag, goed, fout }], tijd: seconden per vraag.
export function VloerHost({ vragen, tijd, onBack }) {
  const [room, setRoom] = useState(null)
  const [status, setStatus] = useState('verbinden')
  const [fout, setFout] = useState('')
  const [code] = useState(() => nieuweCode(4))
  const opties = useRef({ vragen, tijd, joinCode: code })

  useEffect(() => {
    let weg = false, r = null
    maakOfJoin('vloer', { host: true, ...opties.current }, { maak: true, onStatus: setStatus })
      .then(nieuw => { if (weg) nieuw.leave(); else { r = nieuw; setRoom(nieuw) } })
      .catch(e => { if (!weg) setFout(FOUT_TEKST[e.soort] ?? FOUT_TEKST.server) })
    return () => { weg = true; r?.leave() }
  }, [])

  if (!room) {
    return (
      <NeonScherm accent={ACCENT} onBack={onBack}>
        <div className="on-paneel">
          <Titel icoon="vraag" sub={`${vragen.length} ${vragen.length === 1 ? 'vraag' : 'vragen'}, ${tijd} seconden per vraag`}>Vloer<span>quiz</span></Titel>
          {fout ? <p className="on-fout" role="alert">{fout}</p> : <VerbindStatus status={status} />}
        </div>
      </NeonScherm>
    )
  }
  return <HostSpel room={room} code={code} onBack={onBack} />
}

function HostSpel({ room, code, onBack }) {
  const { canvasRef, hudRef, klokRef, balkRef, doorRef, stand, aantallen } = useVloer(room, null)
  const s = stand
  const laatste = s.nr >= s.aantal
  const goedAantal = s.spelers.filter(p => p.goed === 1).length
  const pauzeKnop = (
    <button type="button" className={'on-btn lijn' + (s.pauze ? ' vq-pauze-aan' : '')} onClick={() => room.send('pauze')}>
      <Icoon naam={s.pauze ? 'speel' : 'pauze'} />{s.pauze ? 'Verder' : 'Pauze'}
    </button>
  )

  return (
    <div className="vq-spel host" style={{ '--on-accent': ACCENT }}>
      <canvas ref={canvasRef} className="vq-canvas" />
      <div ref={hudRef} className="vq-hud">
        <HudKnoppen>
          <HudKnop icoon="vol" aria-label="Volledig scherm" onClick={schermVol} />
          <HudKnop icoon="terug" onClick={onBack}>Stoppen</HudKnop>
        </HudKnoppen>

        {s.phase === 'aftellen' && <Aftelling n={s.countdown} />}
        {(s.phase === 'vraag' || s.phase === 'uitslag') && (
          <>
            <VraagKop stand={s} klokRef={klokRef} balkRef={balkRef} groot />
            <Antwoorden stand={s} aantallen={aantallen} groot />
          </>
        )}
        {s.phase === 'vraag' && (
          <div className="vq-bediening">
            <span className="vq-teller"><Icoon naam="speler" /><b className="vq-opvlak" /> van {s.spelers.length} op een vlak</span>
            <button type="button" className="on-btn lijn" onClick={() => room.send('klaar')}><Icoon naam="klok" />Tijd stoppen</button>
            {pauzeKnop}
          </div>
        )}
        {s.phase === 'uitslag' && (
          <div className="vq-bediening">
            <span className="vq-teller"><Icoon naam="vink" /><b>{goedAantal}</b> van {s.spelers.length} goed</span>
            <div className="vq-door">
              <span>{s.pauze ? 'Gepauzeerd' : laatste ? 'Zo naar de eindstand' : 'Zo de volgende vraag'}</span>
              <div className="vq-tijdbalk"><div ref={doorRef} /></div>
            </div>
            {pauzeKnop}
          </div>
        )}
        {s.phase === 'einde' && (
          <aside className="vq-zijpaneel einde">
            <span className="on-embleem"><Icoon naam="beker" /></span>
            <span className="on-label">Eindstand</span>
            <h1 className="on-titel">{s.spelers[0] ? <span>{s.spelers[0].naam}</span> : 'Niemand'}</h1>
            <Ranglijst spelers={s.spelers} max={10} />
            <div className="on-rij">
              <button type="button" className="on-btn" onClick={() => room.send('opnieuw')}><Icoon naam="herlaad" />Nog een keer</button>
              <button type="button" className="on-btn lijn" onClick={onBack}><Icoon naam="terug" />Stoppen</button>
            </div>
          </aside>
        )}
      </div>

      {s.phase === 'lobby' && (
        <Wachtkamer accent={ACCENT} over code={code} room={room} niveaus
          uitleg="Kinderen: Kledingkast, Speel een spel, Vloerquiz en typ deze code."
          spelers={s.spelers.map(p => ({ sid: p.sid, naam: p.naam, bot: p.bot, kleur: ACCENT }))}
          onStart={() => room.send('start')} onBack={onBack} terugTekst="Stoppen" />
      )}
    </div>
  )
}
