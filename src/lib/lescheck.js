import { useEffect, useState } from 'react'
import { haalMijnWeektaak } from './weektaak.js'

// ══════════════════════════════════════════════════════════════════════════
// Lescheck: één som aan het eind van een rekenles
// ══════════════════════════════════════════════════════════════════════════
//
// Een lescheck is een weektaak in een vaste vorm: één weektaak per blok
// ("Lescheck Blok 3"), daarin één opdracht per les. Klaarzetten kan niet meer
// vanuit het portaal; leerlingen met een lopende lescheck zien hem nog wel.
// Herkenbaar aan `lescheck` in de config van de opdracht (migratie 0011).

export const isLescheck = (opdracht) => !!opdracht?.config?.lescheck

export const lesLabel = (opdracht) => {
  const l = opdracht?.config?.lescheck
  return l ? `Les ${l.les}` : ''
}

// Leerlingkant: lopen er leschecks, en staat er nog een les open? Herhaalt
// zichzelf, want de juf zet de les klaar terwijl de kinderen al op het
// startscherm kijken. Geeft ook hoeveel behaalde doelen nu herhaald moeten
// worden (voor het seintje op "Speciaal voor mij").
export function useOpenLescheck(profiel, intervalMs = 15000) {
  const [mappen, setMappen] = useState([])
  const [herhalen, setHerhalen] = useState(0)

  useEffect(() => {
    if (profiel?.rol !== 'leerling' || !profiel?.id || !profiel?.klas_id) { setMappen([]); setHerhalen(0); return }
    let actief = true
    async function laad() {
      const alles = await haalMijnWeektaak(profiel.id, profiel.klas_id)
      if (!actief) return
      setHerhalen(alles.filter(o => o.herhaling?.nu).length)
      const perWeektaak = new Map()
      for (const o of alles.filter(isLescheck)) {
        const id = o.weektaak?.id
        if (!perWeektaak.has(id)) {
          perWeektaak.set(id, { id, titel: o.weektaak?.titel ?? 'Lescheck', opdrachten: [] })
        }
        perWeektaak.get(id).opdrachten.push(o)
      }
      // Alleen bijwerken als er echt iets veranderd is. Elke ronde blind een
      // nieuwe array in state zetten liet App (en daarmee de hele boom, tot en
      // met een spel dat een kind aan het spelen is) elke 15 seconden opnieuw
      // renderen.
      const verse = [...perWeektaak.values()]
      const vingerafdruk = (lijst) => lijst
        .map(m => `${m.id}:${m.opdrachten.map(o => `${o.opdrachtId}${o.klaar ? '1' : '0'}`).join(',')}`)
        .join('|')
      setMappen(vorige => (vingerafdruk(vorige) === vingerafdruk(verse) ? vorige : verse))
    }
    laad()
    const t = setInterval(laad, intervalMs)
    return () => { actief = false; clearInterval(t) }
  }, [profiel?.id, profiel?.klas_id, profiel?.rol, intervalMs])

  const open = mappen.find(m => m.opdrachten.some(o => !o.klaar)) ?? null
  return { mappen, open, herhalen }
}
