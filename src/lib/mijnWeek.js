import { supabase } from './supabase.js'
import { soortVan, doelStandVan } from './weektaak.js'
import { toolLabel } from './tools.js'

// "Mijn week" aan de leerlingkant: wat het kind in één schoolweek (maandag
// t/m zondag) heeft gemaakt, verdeeld over vier kolommen. Alles komt uit de
// eigen resultaten (RLS: resultaten_eigen_lezen); een resultaat zonder
// opdracht_id is vrij oefenen.

export const KOLOMMEN = ['weektaak', 'taak', 'doel', 'vrij']

// Maandag 00:00 (lokale tijd) van de week `terug` weken geleden.
export function weekStart(terug = 0) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7 * terug)
  return d
}

const leeg = () => ({ opgaven: 0, goed: 0, ms: 0, items: [] })

// Leesbare namen voor onderdelen die als code worden opgeslagen.
const ONDERDEEL_LABEL = {
  tt: 'Tegenwoordige tijd', vtZwak: 'Verleden tijd (zwak)', vtSterk: 'Verleden tijd (sterk)', vd: 'Voltooid deelwoord',
}
const MAX_OPGAVEN = 60

// Telt de losse opgaven uit details_json bij een item op: per onderdeel
// (cat/catLabel, of cats[] bij zinsdelen) en als lijstje om terug te kijken.
function telOpgaven(item, r) {
  const opgaven = r.details_json?.opgaven
  if (!Array.isArray(opgaven)) return
  for (const o of opgaven) {
    const delen = Array.isArray(o.cats) ? o.cats : o.cat ? [{ cat: o.cat, catLabel: o.catLabel, goed: o.goed }] : []
    for (const d of delen) {
      if (!d?.cat) continue
      const t = item.onderdelen.get(d.cat) ?? { label: d.catLabel ?? ONDERDEEL_LABEL[d.cat] ?? d.cat, goed: 0, totaal: 0 }
      t.totaal++
      if (d.goed) t.goed++
      item.onderdelen.set(d.cat, t)
    }
    const vraag = o.vraag ?? o.werkwoord ?? o.woord ?? null
    // Begrijpend lezen slaat punten op in plaats van goed/fout.
    const goed = o.goed ?? (o.puntenMax != null ? Number(o.puntenBehaald) >= Number(o.puntenMax) : false)
    if (vraag != null) item.lijst.push({ vraag: String(vraag), antwoord: o.antwoord ?? null, juist: o.juist ?? null, goed: !!goed, op: r.aangemaakt_op })
  }
}
const pct = (goed, opgaven) => (opgaven > 0 ? Math.round((goed / opgaven) * 100) : null)

export async function haalMijnWeek(profielId, terug = 0) {
  const van = weekStart(terug)
  const tot = new Date(van); tot.setDate(tot.getDate() + 7)

  const [{ data: rijen }, { data: doelen }] = await Promise.all([
    supabase.from('resultaten').select('tool_id, score, max_score, ms, opdracht_id, aangemaakt_op, details_json')
      .eq('leerling_id', profielId)
      .gte('aangemaakt_op', van.toISOString()).lt('aangemaakt_op', tot.toISOString()),
    supabase.from('doel_voortgang').select('opdracht_id, gemaakt, laatste_goed, laatste_aantal, gehaald, gehaald_op')
      .eq('leerling_id', profielId),
  ])

  const inWeek = (t) => t && new Date(t) >= van && new Date(t) < tot
  const doelBij = new Map((doelen ?? []).map(d => [d.opdracht_id, d]))
  const opdrachtIds = [...new Set([
    ...(rijen ?? []).map(r => r.opdracht_id).filter(Boolean),
    ...(doelen ?? []).filter(d => inWeek(d.gehaald_op)).map(d => d.opdracht_id),
  ])]

  let opdrachten = [], weektaken = [], voortgang = []
  if (opdrachtIds.length) {
    const [{ data: o }, { data: v }] = await Promise.all([
      supabase.from('opdrachten').select('id, tool_id, config, weektaak_id').in('id', opdrachtIds),
      supabase.from('weektaak_voortgang').select('opdracht_id, doel_aantal, som_max, afgerond')
        .eq('leerling_id', profielId).in('opdracht_id', opdrachtIds),
    ])
    opdrachten = o ?? []; voortgang = v ?? []
    const wtIds = [...new Set(opdrachten.map(x => x.weektaak_id))]
    if (wtIds.length) {
      const { data: w } = await supabase.from('weektaken').select('id, titel').in('id', wtIds)
      weektaken = w ?? []
    }
  }
  const opdrachtBij = new Map(opdrachten.map(o => [o.id, o]))
  const titelBij = new Map(weektaken.map(w => [w.id, w.titel]))
  const vgBij = new Map(voortgang.map(v => [v.opdracht_id, v]))

  const kolommen = Object.fromEntries(KOLOMMEN.map(k => [k, leeg()]))
  const perItem = new Map() // sleutel → item (per opdracht, of per tool bij vrij oefenen)

  for (const r of rijen ?? []) {
    const o = r.opdracht_id ? opdrachtBij.get(r.opdracht_id) : null
    const soort = o ? soortVan(o) : 'vrij'
    const kol = kolommen[soort] ?? kolommen.weektaak
    const max = Number(r.max_score) || 0, score = Number(r.score) || 0, ms = Number(r.ms) || 0
    kol.opgaven += max; kol.goed += score; kol.ms += ms

    const sleutel = o ? o.id : `vrij:${r.tool_id}`
    let item = perItem.get(sleutel)
    if (!item) {
      item = { sleutel, soort, toolId: o?.tool_id ?? r.tool_id, opdrachtId: o?.id ?? null,
        titel: o ? (titelBij.get(o.weektaak_id) ?? toolLabel(o.tool_id)) : toolLabel(r.tool_id),
        sub: o && soort !== 'doel' ? toolLabel(o.tool_id) : null,
        opgaven: 0, goed: 0, ms: 0, laatst: 0, onderdelen: new Map(), lijst: [] }
      perItem.set(sleutel, item)
      kol.items.push(item)
    }
    telOpgaven(item, r)
    item.opgaven += max; item.goed += score; item.ms += ms
    item.laatst = Math.max(item.laatst, new Date(r.aangemaakt_op).getTime())
  }

  // Doelen die deze week behaald zijn maar waar deze week niets meer aan
  // gemaakt is, horen er ook bij.
  for (const d of doelen ?? []) {
    if (!inWeek(d.gehaald_op) || perItem.has(d.opdracht_id)) continue
    const o = opdrachtBij.get(d.opdracht_id)
    if (!o) continue
    const item = { sleutel: o.id, soort: 'doel', toolId: o.tool_id, opdrachtId: o.id,
      titel: titelBij.get(o.weektaak_id) ?? toolLabel(o.tool_id), sub: null, opgaven: 0, goed: 0, ms: 0, laatst: 0, onderdelen: new Map(), lijst: [] }
    perItem.set(o.id, item)
    kolommen.doel.items.push(item)
  }

  for (const item of perItem.values()) {
    item.pct = pct(item.goed, item.opgaven)
    // Zwakste onderdeel bovenaan; nieuwste opgaven eerst.
    item.onderdelen = [...item.onderdelen.values()]
      .map(t => ({ ...t, pct: pct(t.goed, t.totaal) }))
      .sort((a, b) => a.pct - b.pct)
    item.lijst = item.lijst.sort((a, b) => new Date(b.op) - new Date(a.op)).slice(0, MAX_OPGAVEN)
    if (item.soort === 'doel') {
      const d = doelBij.get(item.opdrachtId)
      item.stand = doelStandVan(d)
      item.behaaldDezeWeek = inWeek(d?.gehaald_op)
      item.af = item.stand.gehaald
    } else if (item.opdrachtId) {
      const v = vgBij.get(item.opdrachtId)
      item.af = !!v && (v.afgerond || (v.doel_aantal != null && Number(v.som_max) >= v.doel_aantal))
    }
  }

  for (const kol of Object.values(kolommen)) {
    kol.pct = pct(kol.goed, kol.opgaven)
    // Behaald/af bovenaan, daarna wat het laatst gedaan is.
    kol.items.sort((a, b) => (b.behaaldDezeWeek ?? false) - (a.behaaldDezeWeek ?? false) || b.laatst - a.laatst)
  }

  const alles = Object.values(kolommen)
  return {
    van, tot, kolommen,
    totaal: {
      opgaven: alles.reduce((s, k) => s + k.opgaven, 0),
      goed: alles.reduce((s, k) => s + k.goed, 0),
      ms: alles.reduce((s, k) => s + k.ms, 0),
      behaald: kolommen.doel.items.filter(i => i.behaaldDezeWeek).length,
    },
    // Alle behaalde doelen (ook van eerder), voor het feestmoment.
    behaaldeDoelen: kolommen.doel.items.filter(i => i.af),
  }
}

// Minuten, afgerond, maar nooit "0 min" als er wél iets gedaan is.
export function minuten(ms) {
  if (!ms) return 0
  return Math.max(1, Math.round(ms / 60000))
}
