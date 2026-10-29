import { lazy, useEffect, useState, useRef } from 'react'
import { loadToernooi } from './games/toernooiOpslag.js'
import { VRIJE_SPELLEN as FREE_GAMES } from './lib/spellen.js'
import MenuScene from './MenuScenes'
import VrijSpelenBadge from './VrijSpelenBadge.jsx'
import { TerugKnop, Icoon } from './ui/index.jsx'
import { useSessie } from './lib/sessie.jsx'
import { haalEigenOefeningen } from './lib/eigenOefeningen.js'
import './game.css'

// Spellen laden pas bij openen (Suspense staat in Root.jsx).
const FootballGame       = lazy(() => import('./games/FootballGame'))
const HillClimbGame      = lazy(() => import('./games/HillClimbGame'))
const JetpackGame        = lazy(() => import('./games/JetpackGame'))
const HeadSoccer         = lazy(() => import('./games/HeadSoccer'))
const AstroKatapultGame  = lazy(() => import('./games/AstroKatapultGame'))
const SterrenstroompGame = lazy(() => import('./games/SterrenstroompGame'))
const DoodleSprongGame   = lazy(() => import('./games/DoodleSprongGame'))
const MeteoorvluchtGame  = lazy(() => import('./games/MeteoorvluchtGame'))
const FruitsabelGame     = lazy(() => import('./games/FruitsabelGame'))
const SterrenveerGame    = lazy(() => import('./games/SterrenveerGame'))
const GraafGame          = lazy(() => import('./games/GraafGame'))
const IframeSpel         = lazy(() => import('./games/IframeSpel'))
const DierEvolutieGame   = lazy(() => import('./games/DierEvolutieGame'))
const BrugBouwen         = lazy(() => import('./games/BrugBouwen'))
const ProcentenBreuken   = lazy(() => import('./games/ProcentenBreuken'))
const VerhaaltjesSommen  = lazy(() => import('./games/VerhaaltjesSommen'))
const Denkvragen         = lazy(() => import('./games/Denkvragen'))
const BreukenPlaatjes    = lazy(() => import('./games/BreukenPlaatjes'))
const BreukenRekenen     = lazy(() => import('./games/BreukenRekenen'))
const MaatenOmrekenen    = lazy(() => import('./games/MaatenOmrekenen'))
const KlokKijken         = lazy(() => import('./games/KlokKijken'))
const TafelsOefenen      = lazy(() => import('./games/TafelsOefenen'))
const WerkwoordSpelling  = lazy(() => import('./games/WerkwoordSpelling'))
const DicteeThema        = lazy(() => import('./games/DicteeThema'))
const TaalOefenen        = lazy(() => import('./games/TaalOefenen'))
const BegrijpendLezen    = lazy(() => import('./games/BegrijpendLezen'))
const TopoOefenen        = lazy(() => import('./games/TopoOefenen'))
const EigenVragen        = lazy(() => import('./games/EigenVragen'))

const YEARS = [
  { num: 4, color: 'var(--kk-vak-taal)' },
  { num: 5, color: 'var(--kk-vak-lezen)' },
  { num: 6, color: 'var(--kk-vak-spelling)' },
  { num: 7, color: 'var(--kk-gold)' },
  { num: 8, color: 'var(--kk-error)' },
]

const SUBJECTS = [
  { key: 'taal',       label: 'Taal',            icoon: 'boek',    color: 'var(--kk-vak-taal)',     scene: 'taal',       vb: '"Enorm" betekent: heel groot of heel klein?' },
  { key: 'spelling',   label: 'Spelling',         icoon: 'potlood', color: 'var(--kk-vak-spelling)', scene: 'spelling',   vb: 'ik loop → hij ...?' },
  { key: 'rekenen',    label: 'Rekenen',          icoon: 'rekenen', color: 'var(--kk-vak-rekenen)',  scene: 'rekenen',    vb: '23 × 4 = ?' },
  { key: 'begrijpend', label: 'Begrijpend Lezen', icoon: 'lezen',   color: 'var(--kk-vak-lezen)',    scene: 'begrijpend', vb: 'Lees de tekst & beantwoord de vragen' },
  { key: 'topo',       label: 'Topografie',       icoon: 'kaart',   color: 'var(--kk-vak-topo)',     scene: 'topo',       vb: 'Waar ligt Zweden? Wijs het aan!' },
]

// Beloningen per spel-type (chips op de kaarten)
const REWARDS = {
  taal:      ['💵 briefgeld'],
  rekenen:   ['💵 briefgeld'],
  werkwoord: ['💵 briefgeld'],
  tafels:    ['💵 briefgeld'],
}

// Which (year, subject) combos have a real game — rest shows placeholder
const GAMES = {
  '5-taal': 'taal',
  '6-taal': 'taal',
  '7-taal': 'taal',
  '8-taal': 'taal',
  '4-rekenen': 'tafels',
  '5-rekenen': 'rekenen',
  '6-rekenen': 'rekenen',
  '7-rekenen': 'rekenen',
  '8-rekenen': 'rekenen',
  '6-spelling': 'werkwoord',
  '7-spelling': 'werkwoord',
  '8-spelling': 'werkwoord',
  '7-begrijpend': 'begrijpend',
  '8-begrijpend': 'begrijpend',
  '7-topo': 'topo',
  '8-topo': 'topo',
}


function RewardChips({ rewards }) {
  if (!rewards?.length) return null
  return (
    <span className="reward-chips">
      {rewards.map(r => (
        <span key={r} className={`reward-chip${r.includes('💵') ? ' brief' : ''}`}>{r}</span>
      ))}
    </span>
  )
}

export default function GameMenu({ onBack, addCuruntie, addBriefgeld, toegestaneGroepen }) {
  const [year,       setYear]       = useState(null)
  const [subject,    setSubject]    = useState(null)
  const [directGame, setDirectGame] = useState(null)
  const [gameMode,   setGameMode]   = useState(null)
  const [rekenKeuze,    setRekenKeuze]    = useState(null)   // null | 'verhaal' | 'tafels' | …
  const [spellingKeuze, setSpellingKeuze] = useState(null)   // null | 'werkwoord' | 'dictee'
  const [taSoonBlok,    setTaSoonBlok]    = useState(null)   // blok-nr met "komt binnenkort"
  const [dicteeNr,      setDicteeNr]      = useState(8)      // gekozen dictee-blok (7 of 8)

  // Eigen oefeningen van de juf of meester (portaal, tab Eigen oefeningen):
  // die staan per groep en vak tussen de gewone oefeningen.
  const { profiel } = useSessie()
  const [eigenLijst, setEigenLijst] = useState([])
  const [eigen, setEigen] = useState(null)         // { oefening, ronde } die nu open staat
  const [standaard, setStandaard] = useState(null) // year-subject waarvoor de gewone oefening gekozen is
  useEffect(() => {
    if (profiel?.rol !== 'leerling' || !profiel.klas_id) return
    let actief = true
    haalEigenOefeningen(profiel.klas_id).then(l => { if (actief) setEigenLijst(l) }).catch(() => {})
    return () => { actief = false }
  }, [profiel?.rol, profiel?.klas_id])
  const eigenHier = year !== null && subject !== null ? eigenLijst.filter(o => o.groep === year && o.vak === subject) : []
  const openEigen = (oefening) => setEigen({ oefening, ronde: 0 })
  const eigenKaarten = () => eigenHier.map(o => (
    <button key={o.id} className="mode-card" onClick={() => openEigen(o)}>
      <span className="mode-icoon"><Icoon naam="potlood" /></span>
      <span className="mode-name">{o.onderwerp}</span>
      <span className="mode-desc">Van je juf of meester</span>
      <span className="vb-line">{o.vragen.length} {o.vragen.length === 1 ? 'vraag' : 'vragen'}</span>
      <RewardChips rewards={['💵 briefgeld']} />
    </button>
  ))

  // Leeg/undefined = geen beperking (gast, leerkracht-weergave, klas zonder groepen)
  const zichtbareJaren = toegestaneGroepen?.length ? YEARS.filter(y => toegestaneGroepen.includes(y.num)) : YEARS

  // Eenmalig-verdienen: alle spellen geven maar 1x geld, behalve de oefen-
  // activiteiten (heel spelling, breuken/procenten/komma, zinsontleding +
  // woordsoorten, tafels + deelsommen) die hun eigen rauwe add-functies houden.
  const earnedRef = useRef(null)
  if (earnedRef.current === null) {
    try { earnedRef.current = JSON.parse(localStorage.getItem('kk_earned_once') || '{}') } catch { earnedRef.current = {} }
  }
  const gateRef = useRef({})   // gameKey -> beloning aan/uit voor deze sessie
  const makeGated = (key, realAdd) => {
    if (!(key in gateRef.current)) gateRef.current[key] = !earnedRef.current[key]
    const on = gateRef.current[key]
    return (amount) => {
      if (!on) return
      if (!earnedRef.current[key]) {
        earnedRef.current[key] = true
        try { localStorage.setItem('kk_earned_once', JSON.stringify(earnedRef.current)) } catch {}
      }
      realAdd?.(amount)
    }
  }
  const clearGate = (key) => { delete gateRef.current[key] }

  // Vrij spelen: hieronder start een spel zonder oefening, dus komt er een
  // klein spelcomputer-merkteken in beeld (zie VrijSpelenBadge).
  const vrij = (el) => <>{el}<VrijSpelenBadge /></>

  if (directGame === 'towerdefense') {
    return vrij(<IframeSpel src="/towerdefense/" titel="Tower Defense" terugType="towerdefense-terug" achtergrond="#06061a" onBack={onBack} />)
  }

  if (directGame === 'jetpack') {
    return vrij(<JetpackGame onBack={onBack} addCuruntie={makeGated('jetpack', addCuruntie)} />)
  }

  if (directGame === 'headsoccer') {
    return vrij(<HeadSoccer onBack={onBack} addCuruntie={makeGated('headsoccer', addCuruntie)} />)
  }

  if (directGame === 'astrokatapult') {
    return vrij(<AstroKatapultGame onBack={onBack} />)
  }

  if (directGame === 'sterrenstroom') {
    return vrij(<SterrenstroompGame onBack={onBack} />)
  }

  if (directGame === 'doodlesprong') {
    return vrij(<DoodleSprongGame onBack={onBack} />)
  }

  if (directGame === 'meteoorvlucht') {
    return vrij(<MeteoorvluchtGame onBack={onBack} />)
  }

  if (directGame === 'evolutie') {
    return vrij(<DierEvolutieGame onBack={onBack} />)
  }

  if (directGame === 'brug') {
    return vrij(<BrugBouwen onBack={onBack} />)
  }

  if (directGame === 'hillclimb') {
    return vrij(<HillClimbGame onBack={onBack} />)
  }

  if (directGame === 'fruitsabel') {
    return vrij(<FruitsabelGame onBack={onBack} />)
  }

  if (directGame === 'sterrenveer') {
    return vrij(<SterrenveerGame onBack={onBack} />)
  }

  if (directGame === 'graven') {
    return vrij(<GraafGame onBack={onBack} />)
  }

  if (directGame === 'neongolf') {
    return vrij(<IframeSpel src="/neongolf/" titel="Neongolf" terugType="neongolf-terug" onBack={onBack} />)
  }

  if (directGame === 'blokkenblitz') {
    return vrij(<IframeSpel src="/blokkenblitz/" titel="Blokkenblitz" terugType="blokkenblitz-terug" achtergrond="#070816" onBack={onBack} />)
  }

  if (directGame === 'neonhockey') {
    return vrij(<IframeSpel src="/neonhockey/" titel="Neonhockey" terugType="neonhockey-terug" onBack={onBack} />)
  }

  if (directGame === 'pijlenregen') {
    return vrij(<IframeSpel src="/pijlenregen/" titel="Pijlenregen" terugType="pijlenregen-terug" achtergrond="#06061a" onBack={onBack} />)
  }

  if (directGame === 'dierentuin') {
    return vrij(<IframeSpel src="/dierentuin/" titel="Dierentuinbaas" terugType="dierentuin-terug" achtergrond="#0d0b2e" onBack={onBack} />)
  }

  if (directGame === 'planeet') {
    return vrij(<IframeSpel src="/planeet/" titel="Planetenbouwer" terugType="planeet-terug" achtergrond="#05051a" onBack={onBack} />)
  }

  if (directGame === 'stapeltoren') {
    return vrij(<IframeSpel src="/stapeltoren/" titel="Stapeltoren" terugType="stapeltoren-terug" achtergrond="#07061a" onBack={onBack} />)
  }

  if (directGame === 'vlotstrijd') {
    return vrij(<IframeSpel src="/vlotstrijd/" titel="Vlotstrijd" terugType="vlotstrijd-terug" achtergrond="#050617" onBack={onBack} />)
  }

  if (directGame === 'steenknaller') {
    return vrij(<IframeSpel src="/steenknaller/" titel="Steenknaller" terugType="steenknaller-terug" achtergrond="#06061a" onBack={onBack} />)
  }


  // Verder met een opgeslagen toernooi (buiten de opgaves)
  if (directGame === 'football' && gameMode === 'resume') {
    return vrij(
      <FootballGame
        noQuiz
        resumeBracket={loadToernooi()}
        onBack={onBack}
        addCuruntie={makeGated('football', addCuruntie)}
      />
    )
  }

  // Direct game (no quiz)
  if (directGame === 'football' && gameMode) {
    return vrij(
      <FootballGame
        noQuiz
        twoPlayer={gameMode === '2player'}
        onBack={onBack}
        addCuruntie={makeGated('football', addCuruntie)}
      />
    )
  }

  if (directGame === 'football') {
    return (
      <div className="game-screen game-screen-center">
        <TerugKnop onClick={() => setDirectGame(null)} />
        <div className="game-header">
          <span className="game-header-icon" style={{ '--kk-accent': 'var(--kk-vak-spel)' }}><Icoon naam="spel" /></span>
          <h1 className="game-header-title">1 tegen 1 voetbal</h1>
          <p className="game-header-sub">Kies een modus</p>
        </div>
        {loadToernooi() && (
          <button className="mode-card" style={{ maxWidth: 360, marginBottom: 14 }} onClick={() => setGameMode('resume')}>
            <span className="mode-name">Verder met je toernooi</span>
            <span className="mode-desc">Speel de volgende ronde van je lopende toernooi</span>
          </button>
        )}
        <div className="mode-grid" style={{ '--kk-accent': 'var(--kk-vak-spel)' }}>
          <button className="mode-card" onClick={() => setGameMode('solo')}>
            <MenuScene name="solo" />
            <span className="mode-name">1 speler</span>
            <span className="mode-desc">Jij tegen de computer</span>
          </button>
          <button className="mode-card" onClick={() => setGameMode('2player')}>
            <MenuScene name="duo" />
            <span className="mode-name">2 spelers</span>
            <span className="mode-desc">Pijltjes vs WASD</span>
          </button>
        </div>
      </div>
    )
  }

  // Active game (via year + subject)
  if (year !== null && subject !== null) {
    const gameId = `${year}-${subject}`
    const s = SUBJECTS.find(s => s.key === subject)

    if (eigen) {
      return (
        <EigenVragen
          key={eigen.ronde} titel={eigen.oefening.onderwerp} aantal={eigen.oefening.vragen.length} config={eigen.oefening}
          onBack={() => setEigen(null)} onOpnieuw={() => setEigen(e => ({ ...e, ronde: e.ronde + 1 }))}
          addBriefgeld={addBriefgeld} addCuruntie={addCuruntie}
        />
      )
    }

    // Vakken met één eigen component (tafels, topo, begrijpend lezen): staan er
    // eigen oefeningen, dan eerst kiezen tussen de gewone oefening en die.
    if (eigenHier.length && standaard !== gameId && ['tafels', 'topo', 'begrijpend'].includes(GAMES[gameId])) {
      const gewoon = {
        tafels: ['Tafels oefenen', 'Keersommen en deelsommen'],
        topo: ['Topografie Europa', 'Landen, hoofdsteden en meer'],
        begrijpend: ['Begrijpend lezen', 'Duurzaam design · Fantastische families'],
      }[GAMES[gameId]]
      return (
        <div className="game-screen game-screen-center">
          <TerugKnop onClick={() => setSubject(null)} />
          <div className="game-header">
            <span className="game-header-icon" style={{ '--kk-accent': s.color }}><Icoon naam={s.icoon} /></span>
            <h1 className="game-header-title">{s.label} — Groep {year}</h1>
            <p className="game-header-sub">Wat wil je oefenen?</p>
          </div>
          <div className="mode-grid" style={{ '--kk-accent': s.color }}>
            <button className="mode-card" onClick={() => setStandaard(gameId)}>
              <MenuScene name={s.scene} />
              <span className="mode-name">{gewoon[0]}</span>
              <span className="mode-desc">{gewoon[1]}</span>
              <RewardChips rewards={['💵 briefgeld']} />
            </button>
            {eigenKaarten()}
          </div>
        </div>
      )
    }

    if (GAMES[gameId] === 'taal') {
      return (
        <TaalOefenen
          groep={year}
          onBack={() => setSubject(null)}
          addBriefgeld={addBriefgeld}
          addCuruntie={addCuruntie}
          eigen={eigenHier} onKiesEigen={openEigen}
        />
      )
    }

    if (GAMES[gameId] === 'tafels') {
      return (
        <TafelsOefenen
          groep={year}
          onBack={() => { setStandaard(null); setSubject(null) }}
          addBriefgeld={addBriefgeld}
          addCuruntie={addCuruntie}
        />
      )
    }

    if (GAMES[gameId] === 'rekenen') {
      if (rekenKeuze === 'procenten') {
        return <ProcentenBreuken onBack={() => setRekenKeuze(null)} addBriefgeld={addBriefgeld} />
      }
      if (rekenKeuze === 'denkvragen') {
        return <Denkvragen groep={year} onBack={() => setRekenKeuze(null)} />
      }
      if (rekenKeuze === 'verhaal' || rekenKeuze === 'kaal') {
        return <VerhaaltjesSommen groep={year} onBack={() => setRekenKeuze(null)} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie} kaleSommen={rekenKeuze === 'kaal'} />
      }
      if (rekenKeuze === 'tafels') {
        return <TafelsOefenen groep={year} onBack={() => setRekenKeuze(null)} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie} />
      }
      if (rekenKeuze === 'breuken') {
        return <BreukenPlaatjes onBack={() => setRekenKeuze(null)} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie} />
      }
      if (rekenKeuze === 'breukenrekenen') {
        return <BreukenRekenen onBack={() => setRekenKeuze(null)} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie} />
      }
      if (rekenKeuze === 'breukenhulp') {
        return (
          <div style={{ position: 'fixed', inset: 0, background: '#0E0F2E' }}>
            <iframe src="/breukenkeuken.html" title="Breukenhulp" style={{ width: '100%', height: '100%', border: 'none' }} />
            <TerugKnop onClick={() => setRekenKeuze(null)} />
          </div>
        )
      }
      if (rekenKeuze === 'klok') {
        return <KlokKijken onBack={() => setRekenKeuze(null)} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie} />
      }
      if (rekenKeuze === 'maten') {
        return <MaatenOmrekenen onBack={() => setRekenKeuze(null)} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie} />
      }
      // keuzescherm: verhaaltjessommen of oefenen blok 9
      return (
        <div className="game-screen game-screen-center">
          <TerugKnop onClick={() => setSubject(null)} />
          <div className="game-header">
            <span className="game-header-icon" style={{ '--kk-accent': 'var(--kk-vak-rekenen)' }}><Icoon naam="rekenen" /></span>
            <h1 className="game-header-title">Rekenen — Groep {year}</h1>
            <p className="game-header-sub">Wat wil je oefenen?</p>
          </div>
          <div className="mode-grid" style={{ '--kk-accent': 'var(--kk-vak-rekenen)' }}>
            {(year === 5 || year === 6) && (
              <button className="mode-card" onClick={() => setRekenKeuze('tafels')}>
                <MenuScene name="tafels" />
                <span className="mode-name">Tafels &amp; deelsommen</span>
                <span className="mode-desc">Oefen de keer- en deelsommen</span>
                <span className="vb-line">"7 × 8 = ?" en "56 : 8 = ?"</span>
                <RewardChips rewards={['💵 briefgeld']} />
              </button>
            )}
            {year === 6 && (
              <button className="mode-card" onClick={() => setRekenKeuze('breuken')}>
                <MenuScene name="breuken" />
                <span className="mode-name">Breuken &amp; plaatjes</span>
                <span className="mode-desc">Koppel de breuk aan het plaatje</span>
                <span className="vb-line">Ronde taarten en langwerpige repen</span>
                <RewardChips rewards={['💵 briefgeld']} />
              </button>
            )}
            {year >= 7 && (
              <button className="mode-card" onClick={() => setRekenKeuze('breukenrekenen')}>
                <MenuScene name="breukenrekenen" />
                <span className="mode-name">Breuken rekenen</span>
                <span className="mode-desc">Plus en min, keer en delen · 3 niveaus</span>
                <span className="vb-line">"1/2 + 1/4 = ?" · "3/4 : 1/8 = ?"</span>
                <RewardChips rewards={['💵 briefgeld']} />
              </button>
            )}
            {year >= 6 && (
              <button className="mode-card" onClick={() => setRekenKeuze('breukenhulp')}>
                <MenuScene name="breukenhulp" />
                <span className="mode-name">Breukenhulp</span>
                <span className="mode-desc">Leg pizza en chocola en vergelijk breuken</span>
                <span className="vb-line">"2/4 = 1/2" · "1/2 + 1/4 = ?"</span>
              </button>
            )}
            {(year === 6 || year === 7) && (
              <button className="mode-card" onClick={() => setRekenKeuze('maten')}>
                <MenuScene name="maten" />
                <span className="mode-name">Maten omrekenen</span>
                <span className="mode-desc">Lengte &amp; inhoud · 3 levels</span>
                <span className="vb-line">"5 m = ? cm" · "2,5 m = ? cm"</span>
                <RewardChips rewards={['💵 briefgeld']} />
              </button>
            )}
            {year === 7 && (
              <button className="mode-card" onClick={() => setRekenKeuze('denkvragen')}>
                <MenuScene name="denkvragen" />
                <span className="mode-name">Denkvragen</span>
                <span className="mode-desc">Zoek de denkvraag van je les op</span>
                <span className="vb-line">Geen som uitrekenen — uitleggen hoe je denkt</span>
              </button>
            )}
            {(year === 7 || year === 8) && (
              <button className="mode-card" onClick={() => setRekenKeuze('procenten')}>
                <MenuScene name="procenten" />
                <span className="mode-name">Procenten · Breuken · Komma</span>
                <span className="mode-desc">Sleep wat bij elkaar hoort</span>
                <span className="vb-line">"25% = 1/4 = 0,25"</span>
                <RewardChips rewards={['💵 briefgeld']} />
              </button>
            )}
            <button className="mode-card" onClick={() => setRekenKeuze('klok')}>
              <MenuScene name="klok" />
              <span className="mode-name">Klokkijken</span>
              <span className="mode-desc">Analoog of digitaal · 4 levels</span>
              <span className="vb-line">"tien voor half vier" · "15:20"</span>
              <RewardChips rewards={['💵 briefgeld']} />
            </button>
            <button className="mode-card" onClick={() => setRekenKeuze('verhaal')}>
              <MenuScene name="verhaal" />
              <span className="mode-name">Verhaaltjessommen</span>
              <span className="mode-desc">Redactiesommen op jouw niveau{year >= 6 ? ' (FS of S+)' : ''}</span>
              <span className="vb-line">Oefen per doel uit de leerlijn</span>
              <RewardChips rewards={['💵 briefgeld']} />
            </button>
            <button className="mode-card" onClick={() => setRekenKeuze('kaal')}>
              <MenuScene name="kaal" />
              <span className="mode-name">Kale sommen</span>
              <span className="mode-desc">Dezelfde doelen, zonder verhaaltje{year >= 6 ? ' (FS of S+)' : ''}</span>
              <span className="vb-line">"763 − 145 − 55 = ?"</span>
              <RewardChips rewards={['💵 briefgeld']} />
            </button>
            {eigenKaarten()}
          </div>
        </div>
      )
    }

    if (GAMES[gameId] === 'topo') {
      return (
        <TopoOefenen
          onBack={() => { clearGate('topo'); setStandaard(null); setSubject(null) }}
          addBriefgeld={makeGated('topo', addBriefgeld)}
          addCuruntie={makeGated('topo', addCuruntie)}
        />
      )
    }

    if (GAMES[gameId] === 'begrijpend') {
      return (
        <BegrijpendLezen
          onBack={() => { clearGate('begrijpend'); setStandaard(null); setSubject(null) }}
          addBriefgeld={makeGated('begrijpend', addBriefgeld)}
          addCuruntie={makeGated('begrijpend', addCuruntie)}
          groep={year}
        />
      )
    }

    if (subject === 'spelling') {
      if (spellingKeuze === 'dictee') {
        return <DicteeThema thema={dicteeNr} onBack={() => setSpellingKeuze('blokken')} addCuruntie={addCuruntie} addBriefgeld={addBriefgeld} />
      }
      if (spellingKeuze === 'categorie') {
        return <DicteeThema file="dictees/dictee-categorie.html" onBack={() => setSpellingKeuze('nietww')} addCuruntie={addCuruntie} addBriefgeld={addBriefgeld} />
      }
      if (spellingKeuze === 'werkwoord') {
        return (
          <WerkwoordSpelling
            groep={year}
            onBack={() => setSpellingKeuze(null)}
            addBriefgeld={addBriefgeld}
          />
        )
      }
      if (taSoonBlok !== null) {
        return (
          <div className="game-screen game-screen-center">
            <TerugKnop onClick={() => setTaSoonBlok(null)} />
            <div className="game-placeholder">
              <span className="gp-emoji"><Icoon naam="slot" /></span>
              <h2 className="gp-title">Spellingblok {taSoonBlok}</h2>
              <p className="gp-sub">Groep {year}</p>
              <div className="gp-soon-badge">Komt binnenkort</div>
              <p className="gp-desc">Dit blok is nog in aanbouw.<br />Check snel weer terug!</p>
            </div>
          </div>
        )
      }
      const hasWerkwoord = GAMES[gameId] === 'werkwoord'
      const dicteeBlokken = year === 7 ? [1, 2, 3, 4, 5, 6, 7, 8] : []   // groep 7: blok 1 t/m 8 zijn af

      // Niet-werkwoordspelling: keuze tussen per blok of per categorie
      if (spellingKeuze === 'nietww') {
        return (
          <div className="game-screen game-screen-center">
            <TerugKnop onClick={() => setSpellingKeuze(null)} />
            <div className="game-header">
              <span className="game-header-icon" style={{ '--kk-accent': 'var(--kk-vak-spelling)' }}><Icoon naam="potlood" /></span>
              <h1 className="game-header-title">Niet-werkwoordspelling</h1>
              <p className="game-header-sub">Hoe wil je oefenen?</p>
            </div>
            <div className="mode-grid" style={{ '--kk-accent': 'var(--kk-vak-spelling)' }}>
              <button className="mode-card" onClick={() => setSpellingKeuze('blokken')}>
                <MenuScene name="dictee" />
                <span className="mode-name">Per blok oefenen</span>
                <span className="mode-desc">Oefen de woorden van een spellingblok</span>
                <span className="vb-line">Blok 1 t/m 8 — dictee + dieren</span>
                <RewardChips rewards={['💵 briefgeld']} />
              </button>
              <button className="mode-card" onClick={() => setSpellingKeuze('categorie')}>
                <MenuScene name="categorie" />
                <span className="mode-name">Per categorie oefenen</span>
                <span className="mode-desc">Kies een spellingregel en oefen alleen die woorden</span>
                <span className="vb-line">"open lettergreep", "ei/ij", "verkleinwoord -je", ...</span>
                <RewardChips rewards={['💵 briefgeld']} />
              </button>
            </div>
          </div>
        )
      }

      // Per blok: de losse blokken
      if (spellingKeuze === 'blokken') {
        return (
          <div className="game-screen game-screen-center">
            <TerugKnop onClick={() => setSpellingKeuze('nietww')} />
            <div className="game-header">
              <span className="game-header-icon" style={{ '--kk-accent': 'var(--kk-vak-spelling)' }}><Icoon naam="boek" /></span>
              <h1 className="game-header-title">Per blok oefenen</h1>
              <p className="game-header-sub">Kies een spellingblok</p>
            </div>
            <div className="blok-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(b => {
                const ready = dicteeBlokken.includes(b)
                return (
                  <button
                    key={b}
                    className={`blok-card${ready ? ' ready' : ''}`}
                    onClick={() => ready ? (setDicteeNr(b), setSpellingKeuze('dictee')) : setTaSoonBlok(b)}
                  >
                    <MenuScene name="dictee" />
                    <span className="blok-num">Blok {b}</span>
                    <span className="blok-tag">{ready ? 'Dictee + dieren' : 'Binnenkort'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      }

      // Hoofdkeuze: werkwoordspelling of niet-werkwoordspelling
      return (
        <div className="game-screen game-screen-center">
          <TerugKnop onClick={() => setSubject(null)} />
          <div className="game-header">
            <span className="game-header-icon" style={{ '--kk-accent': 'var(--kk-vak-spelling)' }}><Icoon naam="potlood" /></span>
            <h1 className="game-header-title">Spelling — Groep {year}</h1>
            <p className="game-header-sub">Wat wil je oefenen?</p>
          </div>
          <div className="mode-grid" style={{ '--kk-accent': 'var(--kk-vak-spelling)' }}>
            {hasWerkwoord && (
              <button className="mode-card" onClick={() => setSpellingKeuze('werkwoord')}>
                <MenuScene name="spelling" />
                <span className="mode-name">Werkwoordspelling</span>
                <span className="mode-desc">Tegenwoordige tijd, verleden tijd & voltooid deelwoord</span>
                <span className="vb-line">"ik vind → gisteren ... hij" en "lopen → hij heeft ...?"</span>
                <RewardChips rewards={['💵 briefgeld']} />
              </button>
            )}
            <button className="mode-card" onClick={() => setSpellingKeuze('nietww')}>
              <MenuScene name="dictee" />
              <span className="mode-name">Niet-werkwoordspelling</span>
              <span className="mode-desc">Per blok of per categorie oefenen</span>
              <span className="vb-line">Spellingblokken of een spellingregel</span>
              <RewardChips rewards={['💵 briefgeld']} />
            </button>
            {eigenKaarten()}
          </div>
        </div>
      )
    }

    if (GAMES[gameId] === 'football') {
      return (
        <FootballGame
          year={year}
          onBack={onBack}
          addCuruntie={makeGated('football', addCuruntie)}
        />
      )
    }

    // Nog geen spel voor dit vak in deze groep: wel de eigen oefeningen.
    if (eigenHier.length) {
      return (
        <div className="game-screen game-screen-center">
          <TerugKnop onClick={() => setSubject(null)} />
          <div className="game-header">
            <span className="game-header-icon" style={{ '--kk-accent': s.color }}><Icoon naam={s.icoon} /></span>
            <h1 className="game-header-title">{s.label} — Groep {year}</h1>
            <p className="game-header-sub">Wat wil je oefenen?</p>
          </div>
          <div className="mode-grid" style={{ '--kk-accent': s.color }}>{eigenKaarten()}</div>
        </div>
      )
    }

    // Placeholder for not-yet-built games
    return (
      <div className="game-screen game-screen-center">
        <TerugKnop onClick={() => setSubject(null)} />
        <div className="game-placeholder">
          <span className="gp-emoji"><Icoon naam="slot" /></span>
          <h2 className="gp-title">{s.label}</h2>
          <p className="gp-sub">Groep {year}</p>
          <div className="gp-soon-badge">Komt binnenkort</div>
          <p className="gp-desc">
            Het spel voor <strong>{s.label}</strong> groep {year} is in aanbouw.<br />
            Check snel weer terug!
          </p>
        </div>
      </div>
    )
  }

  // Subject selection
  if (year !== null) {
    const y = YEARS.find(y => y.num === year)
    return (
      <div className="game-screen">
        <TerugKnop onClick={() => setYear(null)} />
        <div className="game-header">
          <span className="game-header-icon" style={{ '--kk-accent': y.color }}><Icoon naam="boek" /></span>
          <h1 className="game-header-title">Groep {year}</h1>
          <p className="game-header-sub">Kies een vak</p>
        </div>
        <div className="subject-grid">
          {SUBJECTS.map(s => {
            const game = GAMES[`${year}-${s.key}`]
            return (
              <button
                key={s.key}
                className="subject-card"
                style={{ '--sc': s.color }}
                onClick={() => setSubject(s.key)}
              >
                <MenuScene name={s.scene} />
                <span className="subject-label"><Icoon naam={s.icoon} />{s.label}</span>
                <span className="subject-tag">
                  {game === 'tafels'
                    ? 'Tafels oefenen'
                    : game === 'rekenen'
                    ? 'Verhaaltjes- en kale sommen'
                    : s.key === 'spelling'
                    ? (game === 'werkwoord' ? 'Werkwoord + spellingblok' : 'Spellingblokken')
                    : game === 'taal'
                    ? (year === 7 ? 'Taalverkennen + woordenschat' : 'Taalverkennen + toets')
                    : game === 'topo'
                    ? 'Europa — kaart A'
                    : game === 'begrijpend'
                    ? 'Duurzaam design · Fantastische families'
                    : 'Komt binnenkort'}
                </span>
                {(game || s.key === 'spelling') && <span className="vb-line">{s.vb}</span>}
                {game && <RewardChips rewards={REWARDS[game]} />}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Year selection
  return (
    <div className="game-screen">
      <TerugKnop onClick={onBack} />
      <div className="game-header">
        <span className="game-header-icon" style={{ '--kk-accent': 'var(--kk-vak-spel)' }}><Icoon naam="spel" /></span>
        <h1 className="game-header-title">Games</h1>
        <p className="game-header-sub">Kies jouw groep</p>
      </div>
      <div className="year-grid">
        {zichtbareJaren.map(y => {
          const tags = SUBJECTS
            .filter(s => GAMES[`${y.num}-${s.key}`])
            .map(s => s.label)
          return (
            <button
              key={y.num}
              className="year-card"
              style={{ '--yc': y.color }}
              onClick={() => setYear(y.num)}
            >
              <span className="year-badge">Groep</span>
              <span className="year-num">{y.num}</span>
              <span className="year-tags">
                {tags.length
                  ? tags.map(t => <span key={t} className="year-tag">{t}</span>)
                  : <span className="year-tag year-tag-soon">In aanbouw</span>}
              </span>
              <span className="year-arrow"><Icoon naam="verder" /></span>
            </button>
          )
        })}
      </div>

      <div className="free-games-section">
        <p className="free-games-label">Vrij spelen</p>
        <div className="free-games-grid">
          {FREE_GAMES.map(g => (
            <button key={g.key} className="free-game-card" onClick={() => setDirectGame(g.key)}>
              <img className="fg-img" src={g.img || `/scenes/games/${g.key}.png`} alt="" />
              <span className="free-game-name">{g.name}</span>
              <span className="free-game-desc">{g.desc}</span>
              <RewardChips rewards={g.rewards} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
