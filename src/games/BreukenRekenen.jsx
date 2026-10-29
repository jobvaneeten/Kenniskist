import { useState, useRef, useEffect } from 'react'
import SpelBeloning from './SpelBeloning'
import './breuken-plaatjes.css'
import './breuken-rekenen.css'
import { TerugKnop, Icoon, Knop, VoortgangsBalk } from '../ui/index.jsx'
import { spelNa, heeftSpel } from '../lib/beloning.js'
import { maakSom, klopt, tekst, isZoKleinMogelijk } from './breukenRekenenData.js'

const PER_BELONING = spelNa(5)
const BELONING = 50

const SOORTEN = {
  plusmin:   { naam: 'Plus en min',   ops: ['+', '−'], uitleg: 'Breuken optellen en aftrekken' },
  keerdelen: { naam: 'Keer en delen', ops: ['×', ':'], uitleg: 'Breuken vermenigvuldigen en delen' },
}
const NIVEAUS = {
  plusmin: ['Gelijknamig: 2/5 + 1/5', 'Eén breuk omrekenen: 1/2 + 1/4', 'Allebei omrekenen: 1/3 + 1/4'],
  keerdelen: ['3 × 2/5 en 6/8 : 2/8', '3 × 2 1/4 en 3/4 : 1/8', '2/3 × 3/4 en 2/3 : 1/4'],
}
const OP_NAAM = { '+': 'plus', '−': 'min', '×': 'keer', ':': 'delen' }

// Een breuk, gemengd getal of heel getal, met de streep ertussen.
function Breuk({ heel, t, n }) {
  return (
    <span className="br-getal">
      {heel != null && <span className="br-heel">{heel}</span>}
      {t != null && (
        <span className="br-breuk"><span>{t}</span><span className="br-streep" /><span>{n}</span></span>
      )}
    </span>
  )
}

export default function BreukenRekenen({ onBack, addBriefgeld, addCuruntie }) {
  const [soort, setSoort] = useState(null)
  const [aan, setAan] = useState({ '+': true, '−': true, '×': true, ':': true })
  const [niveau, setNiveau] = useState(1)
  const [bezig, setBezig] = useState(false)

  if (!soort) {
    return (
      <div className="bp-screen">
        <TerugKnop onClick={onBack} />
        <div className="bp-head">
          <span className="bp-icon"><Icoon naam="rekenen" /></span>
          <h1 className="bp-title">Breuken rekenen</h1>
          <p className="bp-sub">Wat wil je oefenen?</p>
        </div>
        <div className="br-keuzes">
          {Object.entries(SOORTEN).map(([k, s]) => (
            <button key={k} className="br-keuze" onClick={() => setSoort(k)}>
              <span className="br-keuze-tekens">{s.ops.join(' ')}</span>
              <span className="br-keuze-naam">{s.naam}</span>
              <span className="br-keuze-uitleg">{s.uitleg}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const ops = SOORTEN[soort].ops
  if (!bezig) {
    const wissel = (op) => {
      const nieuw = { ...aan, [op]: !aan[op] }
      if (ops.some((o) => nieuw[o])) setAan(nieuw)   // er blijft er altijd één aan
    }
    return (
      <div className="bp-screen">
        <TerugKnop onClick={() => setSoort(null)} />
        <div className="bp-head">
          <span className="bp-icon"><Icoon naam="rekenen" /></span>
          <h1 className="bp-title">{SOORTEN[soort].naam}</h1>
          <p className="bp-sub">Kies wat je oefent en kies een niveau.</p>
        </div>
        <div className="br-blok">
          <span className="br-blok-kop">Welke sommen?</span>
          <div className="br-schakels">
            {ops.map((op) => (
              <button key={op} className={'br-schakel' + (aan[op] ? ' aan' : '')} aria-pressed={aan[op]} onClick={() => wissel(op)}>
                <span className="br-schakel-teken">{op}</span>{OP_NAAM[op]}
              </button>
            ))}
          </div>
        </div>
        <div className="br-blok">
          <span className="br-blok-kop">Niveau</span>
          <div className="br-niveaus">
            {NIVEAUS[soort].map((tekst_, i) => (
              <button key={i} className={'br-niveau' + (niveau === i + 1 ? ' aan' : '')} aria-pressed={niveau === i + 1} onClick={() => setNiveau(i + 1)}>
                <b>Niveau {i + 1}</b><span>{tekst_}</span>
              </button>
            ))}
          </div>
        </div>
        <Knop variant="primair" icoonRechts="verder" onClick={() => setBezig(true)}>Start</Knop>
      </div>
    )
  }

  return (
    <Oefenen soort={soort} niveau={niveau} ops={ops.filter((o) => aan[o]).map((o) => (o === '−' ? '-' : o))}
      onBack={() => setBezig(false)} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie} />
  )
}

function Oefenen({ soort, niveau, ops, onBack, addBriefgeld, addCuruntie }) {
  const nieuweSom = () => maakSom(soort, niveau, ops)
  const [som, setSom] = useState(nieuweSom)
  const [phase, setPhase] = useState('vraag')   // vraag | goed | fout
  const [inv, setInv] = useState({ heel: '', teller: '', noemer: '' })
  const [sinds, setSinds] = useState(0)
  const [verdiend, setVerdiend] = useState(0)
  const [reward, setReward] = useState(false)
  const eerste = useRef(null)

  useEffect(() => { if (phase === 'vraag') setTimeout(() => eerste.current?.focus(), 50) }, [som, phase])

  const leeg = inv.heel === '' && inv.teller === ''
  const halveBreuk = (inv.teller === '') !== (inv.noemer === '')
  const check = () => {
    if (phase !== 'vraag' || leeg || halveBreuk) return
    setPhase(klopt(inv, som.uitkomst) ? 'goed' : 'fout')
  }
  const verder = () => {
    const wasGoed = phase === 'goed'
    setInv({ heel: '', teller: '', noemer: '' }); setPhase('vraag')
    if (wasGoed) {
      const ns = sinds + 1
      if (ns >= PER_BELONING) { setSinds(0); setReward(true); return }
      setSinds(ns)
    }
    setSom(nieuweSom())
  }
  const naBeloning = () => { setReward(false); addBriefgeld?.(BELONING); setVerdiend((v) => v + BELONING); setSom(nieuweSom()) }

  if (reward) return <SpelBeloning title="5 goed!" geld={BELONING} addCuruntie={addCuruntie} onDone={naBeloning} />

  const veld = (k, label, ref) => (
    <input ref={ref} className={'bp-input br-input' + (phase === 'fout' ? ' fout' : '') + (k === 'heel' ? ' br-input-heel' : '')}
      type="text" inputMode="numeric" autoComplete="off" aria-label={label} placeholder={k === 'heel' ? '' : '?'} value={inv[k]}
      onChange={(e) => setInv({ ...inv, [k]: e.target.value.replace(/[^0-9]/g, '') })}
      onKeyDown={(e) => e.key === 'Enter' && check()} disabled={phase !== 'vraag'} />
  )

  return (
    <div className="bp-screen">
      <TerugKnop onClick={onBack} />
      <div className="bp-head">
        <h1 className="bp-title">{SOORTEN[soort].naam} · niveau {niveau}</h1>
        <p className="bp-sub">Reken uit. Schrijf de breuk zo klein mogelijk.{soort === 'keerdelen' ? ' Hele getallen komen in het vakje links.' : ''}</p>
      </div>

      {heeftSpel(PER_BELONING) && <VoortgangsBalk waarde={sinds} max={PER_BELONING} label={`nog ${PER_BELONING - sinds} goed tot een spelletje · 💵 € ${verdiend}`} />}

      <div className="bp-prompt br-som">
        <Breuk {...som.links} /><span className="br-teken">{som.op}</span><Breuk {...som.rechts} /><span className="br-teken">=</span>
        <div className="br-antwoord">
          {/* Bij plus en min is de uitkomst altijd minder dan 1: geen vakje voor helen. */}
          {soort === 'keerdelen' && veld('heel', 'hele getal (mag leeg)', eerste)}
          <div className="bp-invul">
            {veld('teller', 'teller (boven de streep)', soort === 'keerdelen' ? undefined : eerste)}
            <span className="bp-invul-streep br-invul-streep" />
            {veld('noemer', 'noemer (onder de streep)')}
          </div>
        </div>
      </div>

      {phase === 'vraag' && (
        <Knop variant="primair" icoonRechts="verder" onClick={check} disabled={leeg || halveBreuk}>Controleer</Knop>
      )}
      {phase === 'goed' && (
        <div className="bp-feedback bp-goed">
          <span className="rs-feedback-kop"><Icoon naam="goed" />Goed! Het is <b>{tekst(som.uitkomst)}</b>.</span>
          {!isZoKleinMogelijk(inv) && <span>Je kunt hem nog kleiner schrijven: <b>{tekst(som.uitkomst)}</b>.</span>}
          <Knop enter variant="primair" icoonRechts="verder" className="rs-verder-btn" onClick={verder}>Verder</Knop>
        </div>
      )}
      {phase === 'fout' && (
        <div className="bp-feedback bp-fout">
          <span className="rs-feedback-kop"><Icoon naam="fout" />Het juiste antwoord is <b>{tekst(som.uitkomst)}</b>.</span>
          <ol className="br-stappen">{som.stappen.map((s, i) => <li key={i}>{s}</li>)}</ol>
          <Knop enter variant="primair" icoonRechts="verder" className="rs-verder-btn" onClick={verder}>Volgende</Knop>
        </div>
      )}
    </div>
  )
}
