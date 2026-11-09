// Groepsoverzicht (GroepsOverzicht.jsx): van een vaardigheid uit de resultaten
// (tool_id + opgaven[].cat, zie migratie 0025) naar een leesbare naam en, als
// dat kan, het doel dat je ervoor klaarzet (tool + instellingen), net zoals
// DoelKiezer.jsx dat doet.

import { DOEL_VAKKEN } from './doelen.js'
import { TOOL_BY_ID, toolLabel } from './tools.js'
import { onderdelenVan, HEEFT_ROUTE } from '../games/redactiesommen.js'

export const GRENS_ROOD = 60   // onder 60% goed: verlengde instructie
export const GRENS_GROEN = 80  // vanaf 80%: beheerst (zelfde grens als bij een doel)
export const MIN_OPGAVEN = 5   // minder: te weinig om iets over te zeggen

const ALLE_DOELEN = DOEL_VAKKEN.flatMap(v => v.onderwerpen.flatMap(o => o.doelen.map(d => ({ ...d, onderwerp: o.titel }))))

// De waarden van de eerste lijst in een config: { onderdelen: ['komma'] } → ['komma']
const lijstVan = (config) => Object.values(config ?? {}).find(Array.isArray) ?? []

// "g7::Je leert ..." → verhaaltjessommen/kale sommen: zoek het rekendoel op
// (eerst route FS, dan S+; groep 5 heeft geen route).
function rekendoel(toolId, cat) {
  const m = /^g(\d)::(.+)$/.exec(cat ?? '')
  if (!m) return null
  const groep = Number(m[1]), tekst = m[2]
  for (const route of HEEFT_ROUTE(groep) ? ['FS', 'S+'] : [null]) {
    for (const blok of onderdelenVan(groep, route, 'blok')) {
      if (blok.key.startsWith('herh-')) continue
      const gen = blok.gens.find(g => g.doel === tekst)
      if (gen) {
        const blokNaam = blok.label.replace('📍 ', '')
        return {
          toolId, config: { groep, route, doelen: [gen.key] },
          titel: `${toolId === 'kale-sommen' ? 'Kale sommen · ' : ''}${blokNaam} — ${tekst}`,
          label: tekst, sub: `${toolLabel(toolId)} · groep ${groep} · ${blokNaam}`,
        }
      }
    }
  }
  return null
}

// Geeft { label, sub, doel } voor een vaardigheid. doel = { toolId, config, titel } of null.
export function vaardigheid(toolId, cat, catLabel) {
  if (toolId === 'verhaaltjessommen' || toolId === 'kale-sommen') {
    const r = rekendoel(toolId, cat)
    if (r) return { label: r.label, sub: r.sub, doel: { toolId: r.toolId, config: r.config, titel: r.titel } }
    return { label: catLabel || cat?.replace(/^g\d::/, '') || toolLabel(toolId), sub: toolLabel(toolId), doel: null }
  }
  const kandidaten = ALLE_DOELEN.filter(d => d.toolId === toolId)
  let gevonden = null
  if (cat) {
    // tafels: cat "tafel-7" → de tafel van 7
    const zoek = toolId === 'tafels' ? cat.replace(/^tafel-/, '') : cat
    gevonden = kandidaten
      .filter(d => lijstVan(d.config).map(String).includes(zoek) && (toolId !== 'tafels' || d.config.soort === 'keer'))
      .sort((a, b) => lijstVan(a.config).length - lijstVan(b.config).length)[0] ?? null
  }
  // één doel zonder keuzes voor deze oefening (bv. gebiedende wijs)
  if (!gevonden && kandidaten.length === 1 && !lijstVan(kandidaten[0].config).length) gevonden = kandidaten[0]
  const sub = TOOL_BY_ID[toolId] ? toolLabel(toolId) : toolId
  if (gevonden) {
    const titel = gevonden.titel.startsWith(gevonden.onderwerp) ? gevonden.titel : `${gevonden.onderwerp} — ${gevonden.titel}`
    return { label: gevonden.titel, sub, doel: { toolId, config: gevonden.config, titel } }
  }
  return { label: catLabel || cat || sub, sub: cat || catLabel ? sub : 'hele oefening', doel: null }
}

export const kleurVan = (pct, totaal) =>
  totaal < MIN_OPGAVEN ? 'weinig' : pct < GRENS_ROOD ? 'rood' : pct < GRENS_GROEN ? 'oranje' : 'groen'

// Zelfde doel? (om te zien wie hem al heeft staan) — persoonlijk telt niet mee.
export function doelSleutel(toolId, config) {
  const rest = { ...(config ?? {}) }
  delete rest.persoonlijk
  const sorteer = (o) => Object.keys(o).sort().reduce((acc, k) => ({ ...acc, [k]: o[k] }), {})
  return `${toolId}|${JSON.stringify(sorteer(rest))}`
}
