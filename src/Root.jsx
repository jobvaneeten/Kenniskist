import { useState } from 'react'
import Landing from './Landing'
import TeacherPortal from './TeacherPortal'
import App from './App'

// Voordeur van de site: kies eerst een portaal voordat je in Kenniskist
// zelf terechtkomt. De keuze geldt voor het huidige tabblad/sessie.
export default function Root() {
  const [portal, setPortal] = useState(() => {
    try { return sessionStorage.getItem('kk_portal') } catch { return null }
  })

  const choose = (next) => {
    setPortal(next)
    try {
      if (next) sessionStorage.setItem('kk_portal', next)
      else sessionStorage.removeItem('kk_portal')
    } catch {}
  }

  if (portal === 'student') return <App />
  if (portal === 'teacher') return <TeacherPortal onBack={() => choose(null)} onGoStudent={() => choose('student')} />
  return <Landing onChoose={choose} />
}
