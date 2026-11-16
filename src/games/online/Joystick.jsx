import { useRef } from 'react'
import './online.css'

// Joystick op het scherm voor de online spellen (voetbal, paintball,
// ballonnengevecht). Werkt met vinger én muis via pointer events, en blijft
// je vinger volgen als die buiten het rondje komt (pointer capture), ook
// terwijl een andere vinger op een actieknop drukt.
//
// joyRef.current = { x, z, actief }: x en z van -1 tot 1 (z = omlaag op het
// scherm), actief = er ligt een vinger op.
export default function Joystick({ joyRef, kant = 'links', hint }) {
  const basis = useRef(null)
  const knop = useRef(null)
  const vinger = useRef(null)
  const STRAAL = 56

  const zet = (e) => {
    const r = basis.current.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > STRAAL) { dx = dx / len * STRAAL; dy = dy / len * STRAAL }
    Object.assign(joyRef.current, { x: dx / STRAAL, z: dy / STRAAL, actief: true })
    if (knop.current) knop.current.style.transform = `translate(${dx}px,${dy}px)`
  }
  const los = (e) => {
    if (vinger.current !== e.pointerId) return
    vinger.current = null
    Object.assign(joyRef.current, { x: 0, z: 0, actief: false })
    if (knop.current) knop.current.style.transform = 'translate(0,0)'
    basis.current?.classList.remove('actief')
  }

  return (
    <div
      ref={basis} className={`on-joy on-joy-${kant}`}
      onPointerDown={e => {
        e.preventDefault()
        vinger.current = e.pointerId
        try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* oude browser: dan zonder */ }
        basis.current.classList.add('actief')
        zet(e)
      }}
      onPointerMove={e => { if (vinger.current === e.pointerId) zet(e) }}
      onPointerUp={los} onPointerCancel={los} onLostPointerCapture={los}
    >
      <div ref={knop} className="on-joy-knop" />
      {hint && <span className="on-joy-hint">{hint}</span>}
    </div>
  )
}

// Ronde actieknop rechtsonder. `houd`: de knop geldt zolang je hem indrukt
// (onIn/onUit); anders één tik (onTik).
export function ActieKnop({ label, sub, kleur, aan, uit, onTik, onIn, onUit, className = '', children }) {
  const in_ = (e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* zonder */ } onIn?.(); onTik?.() }
  const uit_ = () => onUit?.()
  return (
    <button
      type="button" disabled={uit}
      className={`on-actie${aan ? ' aan' : ''} ${className}`} style={kleur ? { '--on-kleur': kleur } : undefined}
      onPointerDown={in_} onPointerUp={uit_} onPointerCancel={uit_} onLostPointerCapture={uit_}
      onContextMenu={e => e.preventDefault()}
    >
      {children}
      {label && <span className="on-actie-label">{label}</span>}
      {sub && <span className="on-actie-sub">{sub}</span>}
    </button>
  )
}
