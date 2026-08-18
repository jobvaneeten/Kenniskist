import { useCallback, useEffect, useState } from 'react'
import Landing from './Landing'
import App from './App'
import Login from './Login'
import Portaal from './portaal/Portaal.jsx'
import WachtwoordResetten from './WachtwoordResetten.jsx'
import { SessieProvider, useSessie } from './lib/sessie.jsx'
import { wisAlles } from './lib/voortgangSync.js'

const ROUTES = {
  '/leerlingportaal':     'student',
  '/leerkrachtenportaal': 'teacher',
  '/wachtwoord-resetten': 'reset',
}
const PATH_FOR = { student: '/leerlingportaal', teacher: '/leerkrachtenportaal' }

function portalForPath(pathname) {
  return ROUTES[pathname] || null
}

function Laadscherm() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
      fontFamily: "'Nunito', system-ui, sans-serif", color: '#fff', background: '#1d1544',
    }}>Laden…</div>
  )
}

// Ingelogd, maar met een rol die niet bij dit portaal hoort — bijv. een
// leerling op /leerkrachtenportaal, of andersom een leerkracht die via de
// verkeerde tab/URL op /leerlingportaal belandt. Rol-gate is hier alleen UX;
// de echte afscherming is RLS in de database.
function AndereRol({ boodschap, label, onGaNaar }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', fontFamily: "'Nunito', system-ui, sans-serif", color: '#fff', background: '#1d1544', padding: 24, textAlign: 'center',
    }}>
      <p>{boodschap}</p>
      <button onClick={onGaNaar} style={{ padding: '10px 20px', borderRadius: 999, border: 'none', background: '#fff', color: '#261a55', fontWeight: 800, cursor: 'pointer' }}>{label}</button>
    </div>
  )
}

function RootInhoud() {
  const [portal, setPortal] = useState(() => portalForPath(window.location.pathname))
  // Bewust alleen in-memory: geen sessionStorage, geen localStorage-vlag.
  // Daardoor valt elke herlaad/herstart (nieuwe main.jsx-boot) vanzelf terug
  // naar false — precies "elke keer opnieuw starten" zonder extra logica.
  const [gastmodus, setGastmodus] = useState(false)
  const { sessie, profiel, laden, uitloggen } = useSessie()

  useEffect(() => {
    const onPop = () => setPortal(portalForPath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const choose = useCallback((next) => {
    const path = next ? PATH_FOR[next] : '/'
    window.history.pushState(null, '', path)
    setPortal(next)
  }, [])

  // Oefenen zonder account: wist eerst alle gesynchroniseerde sleutels (zelfde
  // functie als bij uitloggen) zodat je nooit het spaarpotje van een vorige
  // gast- of leerling-sessie op dit apparaat erft, en start dan de app zonder
  // sessie. Niets hiervan wordt ooit naar Supabase gesynchroniseerd, want de
  // sync-shim slaat alleen op als er een echte kk_actieve_leerling is.
  const startGastmodus = useCallback(() => {
    wisAlles()
    setGastmodus(true)
  }, [])

  // Ingelogd en op de landingspagina (bv. iemand typt kenniskist.nl terwijl
  // de sessie nog geldig is): stuur meteen door naar het eigen portaal i.p.v.
  // de marketingpagina te tonen.
  useEffect(() => {
    if (portal !== null || laden || !sessie || !profiel) return
    choose(profiel.rol === 'leerling' ? 'student' : 'teacher')
  }, [portal, laden, sessie, profiel, choose])

  if (portal === 'reset') return <WachtwoordResetten />

  // Wel een sessie, geen profiel: het account is verwijderd, of de sessie is
  // niet meer geldig (bv. na een lange onderbreking) waardoor de profielquery
  // niets teruggeeft. Zonder deze afvang rendert Portaal `null` en App weinig
  // beters: een leeg scherm waar je niet uit komt, want ook de uitlogknop
  // staat pas ín die schermen.
  if (!laden && sessie && !profiel && (portal === 'teacher' || portal === 'student')) {
    return (
      <AndereRol
        boodschap="We konden je account niet laden. Waarschijnlijk is je sessie verlopen — log opnieuw in."
        label="Opnieuw inloggen"
        onGaNaar={uitloggen}
      />
    )
  }

  if (portal === 'student') {
    if (gastmodus && !sessie) return <App gast />
    if (laden) return <Laadscherm />
    if (!sessie) return <Login soort="leerling" onBack={() => choose(null)} onGast={startGastmodus} />
    if (profiel && profiel.rol !== 'leerling') {
      return (
        <AndereRol
          boodschap="Dit gedeelte is voor leerlingen. Jij bent ingelogd als leerkracht."
          label="Naar het leerkrachtenportaal →"
          onGaNaar={() => choose('teacher')}
        />
      )
    }
    return <App />
  }

  if (portal === 'teacher') {
    if (laden) return <Laadscherm />
    if (!sessie) return <Login soort="leerkracht" onBack={() => choose(null)} />
    if (profiel?.rol === 'leerling') {
      return (
        <AndereRol
          boodschap="Dit gedeelte is voor leerkrachten. Jij bent ingelogd als leerling."
          label="Naar het leerlingportaal →"
          onGaNaar={() => choose('student')}
        />
      )
    }
    return <Portaal />
  }

  return <Landing onChoose={choose} ingelogd={!!sessie} onUitloggen={uitloggen} />
}

// Voordeur van de site met echte URL's: kenniskist.nl toont de landingspagina,
// kenniskist.nl/leerlingportaal en /leerkrachtenportaal tonen de bijbehorende
// weergave. Lichte, dependency-vrije routing via de History API (de
// Cloudflare-assets zijn al ingesteld op SPA-fallback voor onbekende paden).
export default function Root() {
  return (
    <SessieProvider>
      <RootInhoud />
    </SessieProvider>
  )
}
