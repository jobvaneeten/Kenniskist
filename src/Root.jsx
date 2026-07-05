import { useEffect, useState } from 'react'
import Landing from './Landing'
import TeacherPortal from './TeacherPortal'
import App from './App'

const ROUTES = {
  '/leerlingportaal':     'student',
  '/leerkrachtenportaal': 'teacher',
}
const PATH_FOR = { student: '/leerlingportaal', teacher: '/leerkrachtenportaal' }

function portalForPath(pathname) {
  return ROUTES[pathname] || null
}

// Voordeur van de site met echte URL's: kenniskist.nl toont de landingspagina,
// kenniskist.nl/leerlingportaal en /leerkrachtenportaal tonen de bijbehorende
// weergave. Lichte, dependency-vrije routing via de History API (de
// Cloudflare-assets zijn al ingesteld op SPA-fallback voor onbekende paden).
export default function Root() {
  const [portal, setPortal] = useState(() => portalForPath(window.location.pathname))

  useEffect(() => {
    const onPop = () => setPortal(portalForPath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const choose = (next) => {
    const path = next ? PATH_FOR[next] : '/'
    window.history.pushState(null, '', path)
    setPortal(next)
  }

  if (portal === 'student') return <App />
  if (portal === 'teacher') return <TeacherPortal onBack={() => choose(null)} onGoStudent={() => choose('student')} />
  return <Landing onChoose={choose} />
}
