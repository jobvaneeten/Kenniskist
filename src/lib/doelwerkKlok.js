import { useEffect, useRef, useState } from 'react'
import { haalDoelwerkStand, tijdStandVan, doelwerkMinuten } from './doelwerk.js'
import { supabase } from './supabase.js'

// De klok van "Werk aan je doelen": loopt vanaf het moment dat het kind de
// opdracht opent tot het weer terug is in de weektaak, ook als het zelf iets
// kiest omdat alle doelen behaald zijn. Stil als het tabblad niet zichtbaar is
// of als er een beloningsspelletje open is (window.kkSpelBezig, SpelBeloning).
// Elke 15 seconden gaat de verstreken tijd naar de database (doelwerk_tik,
// migratie 0031), die per keer hooguit de echt verstreken tijd telt.
// Geeft { gewerkt, nodig, klaar, ms } terug; onKlaar volgt één keer als de tijd vol is.
const STUUR_ELKE = 15000
export function useDoelwerkKlok(opdracht, profielId, onKlaar) {
  const opdrachtId = opdracht?.opdrachtId ?? null
  const config = opdracht?.config
  const [ms, setMs] = useState(null)
  const meld = useRef(onKlaar)
  useEffect(() => { meld.current = onKlaar })
  useEffect(() => {
    if (!opdrachtId || !profielId) return
    let actief = true, basis = null, lokaal = 0, wachtend = 0, wasKlaar = null
    const nodigMs = doelwerkMinuten(config) * 60000
    const toon = () => {
      if (basis == null) return
      const nu = basis + lokaal
      setMs(nu)
      if (wasKlaar === null) wasKlaar = nu >= nodigMs
      else if (!wasKlaar && nu >= nodigMs) { wasKlaar = true; meld.current?.(tijdStandVan({ som_ms: nu }, config)) }
    }
    haalDoelwerkStand(opdrachtId, profielId).then(rij => {
      if (!actief) return
      basis = Number(rij?.som_ms ?? 0); toon()
    }).catch(() => { if (actief) { basis = 0; toon() } })
    const stuur = () => {
      if (wachtend <= 0) return
      const p = Math.round(wachtend); wachtend = 0
      supabase.rpc('doelwerk_tik', { p_opdracht: opdrachtId, p_ms: p }).then(({ error }) => { if (error) wachtend += p })
    }
    const tik = setInterval(() => {
      if (document.visibilityState !== 'visible' || window.kkSpelBezig > 0) return
      lokaal += 1000; wachtend += 1000; toon()
      if (wachtend >= STUUR_ELKE) stuur()
    }, 1000)
    const weg = () => { if (document.visibilityState === 'hidden') stuur() }
    document.addEventListener('visibilitychange', weg)
    window.addEventListener('pagehide', stuur)
    return () => {
      actief = false
      clearInterval(tik)
      document.removeEventListener('visibilitychange', weg)
      window.removeEventListener('pagehide', stuur)
      stuur()
      setMs(null)
    }
  }, [opdrachtId, profielId, config])
  if (ms == null || !opdracht) return null
  return { ...tijdStandVan({ som_ms: ms }, config), ms }
}

