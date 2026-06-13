import { useState, useEffect } from 'react'
import './orientation-gate.css'

// Toont een "draai je telefoon"-overlay als een touch-toestel in de verkeerde
// stand staat. want='landscape' (liggend) is standaard; 'portrait' voor staand.
// Het spel eronder blijft gewoon draaien — de overlay verdwijnt zodra je draait.
export default function OrientationGate({ want = 'landscape' }) {
  const [wrong, setWrong] = useState(false)

  useEffect(() => {
    const check = () => {
      const touch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window)
      const portrait = window.innerHeight >= window.innerWidth
      setWrong(touch && (want === 'landscape' ? portrait : !portrait))
    }
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [want])

  if (!wrong) return null
  return (
    <div className="orient-gate">
      <div className="orient-phone"><span className="orient-phone-screen" /></div>
      <div className="orient-title">
        {want === 'landscape' ? 'Draai je telefoon liggend' : 'Draai je telefoon rechtop'}
      </div>
      <div className="orient-sub">om dit spel te spelen 🎮</div>
    </div>
  )
}
