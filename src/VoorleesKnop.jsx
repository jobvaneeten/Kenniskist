import { useEffect, useRef, useState } from 'react'
import './voorlees-knop.css'

// Voorleesknop voor de oefeningen (stem van de browser of iPad). Verschijnt
// vanzelf zodra er een opgave in beeld is en leest de vraag, de zin en de
// uitleg voor. Niet bij begrijpend lezen (daar oefen je juist het lezen) en
// niet bij het dictee (dat heeft eigen opnames).
// Een nieuwe oefening laten voorlezen: zet data-voorlees op het vraag-element.
const VRAGEN = [
  '[data-voorlees]',
  '.wt-uitleg',                                    // uitleg na 3 fouten bij een doel
  '.tv-zin', '.zd-zin', '.tv-vraag',               // taalverkennen, woordenschat, zinsdelen
  '.ws-ond-vraag', '.ws-ond-zin', '.ws-zin',       // werkwoordspelling
  '.rs-vraag', '.rs-uitleg',                       // verhaaltjessommen, klok, maten, eigen vragen
  '.to-vraag', '.dv-vraag', '.bp-prompt',          // tafels, denkvragen, breuken in plaatjes
  '.tv-feedback-uitleg',
].join(',')

const zichtbaar = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight }

function tekstInBeeld() {
  const els = [...document.querySelectorAll(VRAGEN)].filter(zichtbaar)
    // niet twee keer: een element binnen een ander gevonden element overslaan
    .filter((el, _, alle) => !alle.some(a => a !== el && a.contains(el)))
  return els.map(el => el.innerText.trim()).map(t => /[.!?:]$/.test(t) ? t : t + '.').join(' ')
}

// 3/4 → "3 vierde", 1/2 → "1 half"
const NOEMER = { 3: 'derde', 4: 'vierde', 5: 'vijfde', 6: 'zesde', 7: 'zevende', 8: 'achtste', 9: 'negende', 10: 'tiende', 12: 'twaalfde', 20: 'twintigste', 100: 'honderdste', 1000: 'duizendste' }
function breuk(t, n) {
  if (n === 2) return t === 1 ? 'een half' : `${t} halve`
  return NOEMER[n] ? `${t} ${NOEMER[n]}` : `${t} gedeeld door ${n}`
}

// zo spreekt de stem sommen en gaten goed uit
function uitspraak(t) {
  return t
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/_{2,}|…|\.{3,}/g, ' puntje puntje puntje ')
    .replace(/\b(\d+)\/(\d+)\b/g, (_, t, n) => breuk(+t, +n))
    .replace(/(\d)\s*[×x*]\s*(?=\d)/g, '$1 keer ')
    .replace(/(\d)\s*[:÷]\s*(?=\d)/g, '$1 gedeeld door ')
    .replace(/(\d)\s*-\s*(?=\d)/g, '$1 min ')
    .replace(/\s*\+\s*/g, ' plus ')
    .replace(/\s*=\s*\?/g, ' is hoeveel?').replace(/\s*=\s*/g, ' is ')
    .replace(/\s+[—–]\s+/g, ', ')
    .replace(/\s*\n+\s*/g, '. ').replace(/\.\s*\./g, '.')
    .replace(/\s+/g, ' ').trim()
}

let stemNl = null
function kiesStem() {
  const stemmen = window.speechSynthesis?.getVoices() || []
  stemNl = stemmen.find(v => v.lang === 'nl-NL' && v.localService) || stemmen.find(v => v.lang === 'nl-NL') || stemmen.find(v => v.lang?.startsWith('nl')) || null
}

export default function VoorleesKnop() {
  const [toon, setToon] = useState(false)
  const [bezig, setBezig] = useState(false)
  const kan = typeof window !== 'undefined' && 'speechSynthesis' in window
  const laatste = useRef('')

  useEffect(() => {
    if (!kan) return
    kiesStem(); speechSynthesis.addEventListener?.('voiceschanged', kiesStem)
    const tik = setInterval(() => {
      const t = location.pathname === '/leerlingportaal' ? tekstInBeeld() : ''
      setToon(!!t)
      // nieuwe opgave in beeld: stoppen met voorlezen van de vorige
      if (laatste.current && t !== laatste.current && speechSynthesis.speaking) { speechSynthesis.cancel(); setBezig(false) }
      if (!t) laatste.current = ''
    }, 600)
    return () => { clearInterval(tik); speechSynthesis.removeEventListener?.('voiceschanged', kiesStem); speechSynthesis.cancel() }
  }, [kan])

  if (!kan || !toon) return null

  const lees = () => {
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); setBezig(false); return }
    const tekst = tekstInBeeld()
    laatste.current = tekst
    // in stukjes per zin: lange teksten breken anders af in Chrome
    const zinnen = uitspraak(tekst).split(/(?<=[.!?])\s+/).filter(Boolean)
    zinnen.forEach((z, i) => {
      const u = new SpeechSynthesisUtterance(z.trim())
      u.lang = 'nl-NL'; if (stemNl) u.voice = stemNl
      u.rate = 0.92
      if (i === zinnen.length - 1) u.onend = u.onerror = () => setBezig(false)
      speechSynthesis.speak(u)
    })
    setBezig(zinnen.length > 0)
  }

  return (
    <button type="button" className={`voorlees-knop${bezig ? ' bezig' : ''}`} onClick={lees} aria-label={bezig ? 'Stop met voorlezen' : 'Lees de opgave voor'}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" /></svg>
      <span>{bezig ? 'Stop' : 'Lees voor'}</span>
    </button>
  )
}
