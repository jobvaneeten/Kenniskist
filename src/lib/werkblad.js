// Opgaven voor een geprint werkblad (portaal → Werkblad). Gebruikt dezelfde
// generators en zinnen als de oefeningen zelf, zodat het werkblad precies
// past bij wat de leerlingen op de iPad doen.
//
// Eén opgave: { vraag, onderstreep?, opties?, velden?, figuur?, antwoord }
//   onderstreep — woord(groep) in de vraag dat onderstreept gedrukt wordt
//   opties      — omcirkel het goede antwoord
//   velden      — schrijflijnen met een label ervoor ('Antwoord', 'Onderwerp', …)
//   tag         — labeltje vóór de vraag (het hele werkwoord bij werkwoordspelling)

import { onderdelenVan, maakOpgaveUit, HEEFT_ROUTE } from '../games/redactiesommen.js'
import { maakVraag as interpunctieVraag, vragenVoor } from '../games/interpunctieData.js'
import { maakGebiedendVraag } from '../games/gebiedendeWijsData.js'
import { VRAGEN, WOORDSOORTEN } from '../games/taalData.js'
import { WOORDEN_PER_BLOK, kernVan } from '../games/woordenschatData.js'
import { shuffleGefilterd } from '../games/werkwoorden.js'
import { TOOL_BY_ID } from './tools.js'

const schud = (a) => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] }
  return b
}
const kies = (a) => a[Math.floor(Math.random() * a.length)]

function toonAntwoord(o) {
  if (o.antwoordType === 'tijd') return `${o.tijdH}:${String(o.tijdM).padStart(2, '0')}`
  if (typeof o.antwoord !== 'number') return String(o.antwoord)
  if (o.eenheid === '€') return '€ ' + o.antwoord.toFixed(2).replace('.', ',')
  const n = Number.isInteger(o.antwoord) ? o.antwoord.toLocaleString('nl-NL') : String(o.antwoord).replace('.', ',')
  return o.eenheid ? `${n} ${o.eenheid}` : n
}

// Herhaalt een generator tot er `n` verschillende opgaven zijn (of het op is).
function uniek(n, maak, sleutel = (o) => o.vraag) {
  const uit = [], gezien = new Set()
  for (let poging = 0; uit.length < n && poging < n * 20; poging++) {
    const o = maak(uit.length)
    if (!o || gezien.has(sleutel(o))) continue
    gezien.add(sleutel(o))
    uit.push(o)
  }
  return uit
}

function verhaaltjes(config, n) {
  const groep = Number(config.groep) || 7
  const route = HEEFT_ROUTE(groep) ? (config.route || 'FS') : null
  const keys = new Set(config.doelen ?? [])
  const gens = onderdelenVan(groep, route).flatMap(o => o.gens).filter(g => !keys.size || keys.has(g.key))
  return uniek(n, () => {
    const o = maakOpgaveUit([{ gens }])
    if (!o) return null
    const heeftRest = o.rest != null && o.antwoordType !== 'tijd'
    const velden = Array.isArray(o.opties) ? null
      : heeftRest ? [o.antwLabel ?? 'Antwoord', o.restLabel ?? 'Rest']
      : [o.antwoordType === 'tijd' ? 'Hoe laat' : 'Antwoord']
    return {
      vraag: o.vraag, figuur: o.figuur, opties: Array.isArray(o.opties) ? o.opties : null,
      velden: velden && ['Som', ...velden],
      antwoord: o.toon ?? `${toonAntwoord(o)}${heeftRest ? ` en ${o.rest}${o.restLabel ? ' ' + o.restLabel : ' rest'}` : ''}`,
    }
  })
}

function interpunctie(config, n) {
  const cats = config.onderdelen?.length ? config.onderdelen : ['komma', 'aanhalingstekens', 'afbreekstreepje', 'hoofdletters', 'punten']
  return vragenVoor(cats).slice(0, n).map(item => {
    const v = interpunctieVraag(item, cats)
    const letter = 'abcd'[v.opties.findIndex(o => o.goed)]
    return { vraag: 'Welke zin is goed geschreven?', opties: v.opties.map(o => o.tekst), lang: true, antwoord: `${letter}. ${v.zin}` }
  })
}

function gebiedend(n) {
  return uniek(n, () => {
    const v = maakGebiedendVraag()
    const letter = 'abcd'[v.opties.findIndex(o => o.goed)]
    return { vraag: 'Welke zin is een gebiedende wijs?', opties: v.opties.map(o => o.zin), lang: true, antwoord: `${letter}. ${v.goed}` }
  }, o => o.antwoord)
}

function woordsoorten(config, n) {
  const soorten = config.soorten?.length ? config.soorten : WOORDSOORTEN.map(w => w.label)
  // Eerst elke zin één keer, pas daarna dezelfde zin met een ander woord:
  // twee keer "Tom geeft zijn oma een grote knuffel." op één blad is saai.
  const alles = schud(VRAGEN.filter(q => q.woordsoort && soorten.includes(q.woordsoort)))
  const gezien = new Set()
  const eerst = alles.filter(q => !gezien.has(q.zin) && gezien.add(q.zin))
  const pool = [...eerst, ...alles.filter(q => !eerst.includes(q))]
  return pool.slice(0, n).map(q => ({
    vraag: q.zin, onderstreep: q.vraagWoord, kop: 'Welke woordsoort is het onderstreepte woord?',
    opties: soorten, antwoord: `${q.vraagWoord}: ${q.woordsoort}`,
  }))
}

function zinsdelen(config, n) {
  const gevraagd = config.zinsdelen?.length ? config.zinsdelen : ['persoonsvorm', 'onderwerp']
  const perZin = new Map()
  for (const q of VRAGEN) {
    if (!q.zinsdeel || !gevraagd.includes(q.zinsdeel)) continue
    if (!perZin.has(q.zin)) perZin.set(q.zin, new Map())
    const m = perZin.get(q.zin)
    if (!m.has(q.zinsdeel)) m.set(q.zinsdeel, q.zinsdeelWoorden || q.vraagWoord)
  }
  // Alleen zinnen met de kern (pv, onderwerp, gezegde) én het zinsdeel waar
  // het doel om draait (het laatste in de lijst); andere voorwerpen en
  // bepalingen mogen ontbreken (dan "—").
  const verplicht = [...new Set([...gevraagd.filter(z => ['persoonsvorm', 'onderwerp', 'gezegde'].includes(z)), gevraagd.at(-1)])]
  const zinnen = schud([...perZin.entries()].filter(([, m]) => verplicht.every(z => m.has(z))))
  return zinnen.slice(0, n).map(([zin, m]) => ({
    vraag: zin, kop: 'Ontleed de zin. Schrijf de zinsdelen op.',
    velden: gevraagd.map(z => z[0].toUpperCase() + z.slice(1)),
    antwoord: gevraagd.map(z => `${z}: ${m.get(z) ?? '—'}`).join(' · '),
  }))
}

function woordenschat(blok, n) {
  const lijst = WOORDEN_PER_BLOK[blok] ?? []
  return schud(lijst).slice(0, n).map(w => {
    const zelfdeVorm = lijst.filter(x => x !== w && !!x.uitdrukking === !!w.uitdrukking && kernVan(x) !== kernVan(w))
    const opties = schud([kernVan(w), ...schud(zelfdeVorm).slice(0, 3).map(kernVan)])
    return { vraag: w.zin.replace('___', '……………'), kop: 'Welk woord past in de zin?', opties, antwoord: kernVan(w) }
  })
}

function werkwoordspelling(config, n) {
  const cats = config.categorieen?.length ? config.categorieen : ['tt', 'vtZwak', 'vtSterk', 'vd']
  return shuffleGefilterd(cats).slice(0, n).map(o => ({
    vraag: o.zin.replace('___', '……………'), tag: o.inf, kop: `Vul het werkwoord in (${o.tijd}).`,
    antwoord: o.antwoord,
  }))
}

function tafels(config, n) {
  const ts = (config.tafels?.length ? config.tafels : ['2', '3', '4', '5', '6', '7', '8', '9', '10']).map(Number)
  const deel = config.soort === 'deel'
  return uniek(n, () => {
    const t = kies(ts), k = 1 + Math.floor(Math.random() * 10)
    return deel
      ? { vraag: `${t * k} : ${t} = …………`, kaal: true, antwoord: String(k) }
      : { vraag: `${k} × ${t} = …………`, kaal: true, antwoord: String(t * k) }
  })
}

// Welke oefeningen op papier kunnen. Klokkijken, topografie en het dictee
// hebben plaatjes, kaarten of geluid nodig — die blijven op de iPad.
export function kanOpWerkblad(toolId) {
  const fam = TOOL_BY_ID[toolId]?.familie
  return ['verhaaltjessommen', 'taal-interpunctie', 'taal-gebiedende-wijs', 'taal-woordsoorten',
    'taal-zinsdelen', 'woordenschat', 'werkwoordspelling', 'tafels'].includes(fam)
}

export function maakWerkbladOpgaven({ toolId, config = {} }, n) {
  const info = TOOL_BY_ID[toolId]
  switch (info?.familie) {
    case 'verhaaltjessommen': return verhaaltjes(config, n)
    case 'taal-interpunctie': return interpunctie(config, n)
    case 'taal-gebiedende-wijs': return gebiedend(n)
    case 'taal-woordsoorten': return woordsoorten(config, n)
    case 'taal-zinsdelen': return zinsdelen(config, n)
    case 'woordenschat': return woordenschat(info.variant.blok, n)
    case 'werkwoordspelling': return werkwoordspelling(config, n)
    case 'tafels': return tafels(config, n)
    default: return []
  }
}

// Eén onderdeel met meerdere doelen ("komma's + aanhalingstekens"): de
// opgaven worden eerlijk verdeeld (8 over 2 doelen = 4 + 4; een rest gaat naar
// de eerste doelen). Zijn het doelen uit dezelfde oefening, dan komen ze door
// elkaar te staan; anders blijven ze per doel bij elkaar, elk met zijn eigen
// opdrachtregel.
export function maakWerkbladDeel(doelen, n) {
  const k = doelen.length
  if (k === 1) return maakWerkbladOpgaven(doelen[0], n)
  const delen = doelen.map((d, i) => maakWerkbladOpgaven(d, Math.floor(n / k) + (i < n % k ? 1 : 0)))
  const families = new Set(doelen.map(d => TOOL_BY_ID[d.toolId]?.familie))
  return families.size === 1 ? schud(delen.flat()) : delen.flat()
}
