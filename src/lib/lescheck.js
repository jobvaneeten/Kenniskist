import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { haalMijnWeektaak } from './weektaak.js'
import { onderdelenVan } from '../games/redactiesommen.js'
import { DOEL_VAN_LES, LESSEN_PER_BLOK, isHerhalingsles } from '../games/denkvragenData.js'
import { slaWeektaakOp } from '../portaal/weektaakOpslaan.js'

// ══════════════════════════════════════════════════════════════════════════
// Lescheck: één som aan het eind van een rekenles
// ══════════════════════════════════════════════════════════════════════════
//
// Een lescheck is géén nieuw datamodel maar een weektaak in een vaste vorm:
// één weektaak per blok ("Lescheck Blok 3"), daarin één opdracht per les
// (verhaaltjessommen, aantal 1, precies één doel aangevinkt). De leerkracht
// zet vooraf een paar lessen klaar, de leerling klikt na de les op "Les 3" en
// krijgt daar zijn eigen som over het doel van díe les.
//
// Herkenbaar aan `lescheck` in de config van de opdracht — daar hangt ook de
// migratie 0011 aan (nooit automatisch opnieuw laten maken).

export const LESCHECK_TOOL = 'verhaaltjessommen'

export const isLescheck = (opdracht) => !!opdracht?.config?.lescheck

export const lesLabel = (opdracht) => {
  const l = opdracht?.config?.lescheck
  return l ? `Les ${l.les}` : ''
}

export const blokLabel = (blok) => (Number(blok) === 0 ? 'Instap' : `Blok ${blok}`)
export const lescheckTitel = (blok) => `Lescheck ${blokLabel(blok)}`

// YYYY-MM-DD in lokale tijd — zelfde afspraak als lib/weektaak.js, bewust
// geen UTC (zie migratie 0007).
export const datumStr = (d = new Date()) => d.toLocaleDateString('sv-SE')

export function datumOver(dagen) {
  const d = new Date()
  d.setDate(d.getDate() + dagen)
  return datumStr(d)
}

// De doelen van één blok, in de volgorde van de methode, mét de sleutel die
// VerhaaltjesSommen gebruikt om er sommen bij te maken. Precies dezelfde
// bron als de denkvragen (doelenVanBlok) en de weektaak-config, zodat de
// doeltekst bij de leerkracht, bij het kind en in het resultaat één en
// hetzelfde is.
export function doelenVanBlokMetKey(groep, route, blok) {
  const item = onderdelenVan(groep, route, 'blok').find(o => o.key === `blok-${blok}`)
  return (item?.gens ?? []).map(g => ({ key: g.key, doel: g.doel }))
}

// Welk doel hoort bij welke les (1-2 → doel 1, 3-4 → doel 2, …). Les 5 en 10
// zijn herhalingslessen zonder eigen doel: daar kiest de leerkracht zelf.
export function doelVoorLes(groep, route, blok, les) {
  const doelen = doelenVanBlokMetKey(groep, route, blok)
  const nr = DOEL_VAN_LES[les]
  if (!nr) return null
  return doelen[nr - 1] ? { doelNr: nr, ...doelen[nr - 1] } : null
}

export function bouwLesOpdracht({ groep, route, blok, les, doelNr, id }) {
  const doelen = doelenVanBlokMetKey(groep, route, blok)
  const gekozen = doelen[doelNr - 1]
  if (!gekozen) return null
  return {
    id,
    toolId: LESCHECK_TOOL,
    aantal: 1,
    config: {
      groep, route,
      doelen: [gekozen.key],
      lescheck: { blok, les, doelNr, doel: gekozen.doel },
    },
  }
}

export const LESSEN = Array.from({ length: LESSEN_PER_BLOK }, (_, i) => i + 1)
export { isHerhalingsles }

// Zet de lessen van één blok klaar. Bestaande opdrachten gaan mét hun id mee,
// want slaWeektaakOp gooit alles weg wat er niet meer in zit — zonder dat zou
// "les 6 toevoegen" de resultaten van les 1 t/m 4 wissen (resultaten blijven
// staan, maar hun opdracht_id gaat op NULL en dan tellen ze als vrij oefenen).
export async function slaLescheckOp({
  weektaakId, klas, leerlingIds, groep, route, blok, lessen, eindOp, bestaandeOpdrachten = [],
}) {
  const opdrachten = [
    ...bestaandeOpdrachten,
    ...lessen.map(l => bouwLesOpdracht({ groep, route, blok, les: l.les, doelNr: l.doelNr })),
  ].filter(Boolean)
  // Op lesnummer sorteren: slaWeektaakOp nummert `volgorde` op arrayvolgorde,
  // en zo staan de lessen bij het kind (en in het portaal) op les 1, 2, 3…
  opdrachten.sort((a, b) => (a.config.lescheck.les - b.config.lescheck.les))

  const wtId = await slaWeektaakOp({
    weektaakId,
    schoolId: klas.school_id,
    klasId: klas.id,
    titel: lescheckTitel(blok),
    startOp: datumStr(),
    eindOp,
    opdrachten,
    leerlingIds,
  })
  return wtId
}

// Alle leschecks van een klas, gegroepeerd per blok (= per weektaak).
export async function haalLeschecks(klasId) {
  const { data } = await supabase
    .from('opdrachten')
    .select('id, weektaak_id, config, volgorde, weektaken(id, titel, start_op, eind_op)')
    .eq('klas_id', klasId)
    .order('volgorde')
  const perBlok = new Map()
  // Op `lescheck` filteren doen we hier en niet in de query: een klas heeft
  // hooguit een paar honderd opdrachten, en een jsonb-filter in PostgREST is
  // het soort ding dat stilletjes een lege lijst oplevert als de notatie ooit
  // verandert.
  for (const o of (data ?? []).filter(x => x.config?.lescheck)) {
    const wt = o.weektaken
    if (!wt) continue
    if (!perBlok.has(wt.id)) {
      perBlok.set(wt.id, {
        weektaakId: wt.id, titel: wt.titel, startOp: wt.start_op, eindOp: wt.eind_op,
        blok: o.config?.lescheck?.blok ?? null,
        groep: o.config?.groep ?? null,
        route: o.config?.route ?? null,
        opdrachten: [],
      })
    }
    perBlok.get(wt.id).opdrachten.push({
      id: o.id, les: o.config?.lescheck?.les, doelNr: o.config?.lescheck?.doelNr,
      doel: o.config?.lescheck?.doel, config: o.config,
    })
  }
  return [...perBlok.values()].sort((a, b) => String(b.startOp).localeCompare(String(a.startOp)))
}

// Leerlingkant: lopen er leschecks, en staat er nog een les open? Herhaalt
// zichzelf, want de juf zet de les klaar terwijl de kinderen al op het
// startscherm kijken.
export function useOpenLescheck(profiel, intervalMs = 15000) {
  const [mappen, setMappen] = useState([])

  useEffect(() => {
    if (profiel?.rol !== 'leerling' || !profiel?.id || !profiel?.klas_id) { setMappen([]); return }
    let actief = true
    async function laad() {
      const alles = await haalMijnWeektaak(profiel.id, profiel.klas_id)
      if (!actief) return
      const perWeektaak = new Map()
      for (const o of alles.filter(isLescheck)) {
        const id = o.weektaak?.id
        if (!perWeektaak.has(id)) {
          perWeektaak.set(id, { id, titel: o.weektaak?.titel ?? 'Lescheck', opdrachten: [] })
        }
        perWeektaak.get(id).opdrachten.push(o)
      }
      setMappen([...perWeektaak.values()])
    }
    laad()
    const t = setInterval(laad, intervalMs)
    return () => { actief = false; clearInterval(t) }
  }, [profiel?.id, profiel?.klas_id, profiel?.rol, intervalMs])

  const open = mappen.find(m => m.opdrachten.some(o => !o.klaar)) ?? null
  return { mappen, open }
}
