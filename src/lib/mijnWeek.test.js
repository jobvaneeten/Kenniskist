import { describe, it, expect, vi, beforeEach } from 'vitest'

// Nep-Supabase: elke tabel geeft vaste rijen terug, filters worden genegeerd
// (haalMijnWeek filtert zelf niet meer na, dus dat is genoeg om de verwerking
// te testen).
let tabellen = {}
function bouwer(tabel) {
  const q = {
    select: () => q, eq: () => q, in: () => q, gte: () => q, lt: () => q,
    then: (ok, fout) => Promise.resolve({ data: tabellen[tabel] ?? [] }).then(ok, fout),
  }
  return q
}
vi.mock('./supabase.js', () => ({ supabase: { from: (t) => bouwer(t) } }))

const { haalMijnWeek, weekStart } = await import('./mijnWeek.js')

const nu = new Date(weekStart(0).getTime() + 36 * 3600 * 1000).toISOString() // dinsdag 12:00
const vorigeWeek = new Date(weekStart(1).getTime() + 3600 * 1000).toISOString()

beforeEach(() => {
  tabellen = {
    resultaten: [
      // Weektaak: verhaaltjessommen, twee doelen
      { tool_id: 'verhaaltjessommen', score: 1, max_score: 1, ms: 60000, opdracht_id: 'O-wt', aangemaakt_op: nu,
        details_json: { opgaven: [{ vraag: 'Som A', antwoord: '12', juist: '12', goed: true, cat: 'g7::Optellen', catLabel: 'Optellen tot 1000' }] } },
      { tool_id: 'verhaaltjessommen', score: 0, max_score: 1, ms: 60000, opdracht_id: 'O-wt', aangemaakt_op: nu,
        details_json: { opgaven: [{ vraag: 'Som B', antwoord: '5', juist: '7', goed: false, cat: 'g7::Delen', catLabel: 'Delen met rest' }] } },
      // Doel: werkwoordspelling (cat als code)
      { tool_id: 'werkwoordspelling', score: 1, max_score: 1, ms: 30000, opdracht_id: 'O-doel', aangemaakt_op: nu,
        details_json: { opgaven: [{ werkwoord: 'werken', antwoord: 'werkte', juist: 'werkte', goed: true, cat: 'vtZwak' }] } },
      // Vrij oefenen, gebundeld (dictee: 8 van 10)
      { tool_id: 'dictee-thema1', score: 8, max_score: 10, ms: 120000, opdracht_id: null, aangemaakt_op: nu, details_json: null },
      // Zinsdelen met cats[] in één opgave
      { tool_id: 'taal-zinsdelen', score: 1, max_score: 1, ms: 0, opdracht_id: null, aangemaakt_op: nu,
        details_json: { opgaven: [{ vraag: 'Oma geeft de hond een bot.', goed: true, cats: [
          { cat: 'onderwerp', catLabel: 'onderwerp', goed: true }, { cat: 'gezegde', catLabel: 'gezegde', goed: false }] }] } },
      // Begrijpend lezen: punten in plaats van goed
      { tool_id: 'spullen-les1', score: 2, max_score: 2, ms: 0, opdracht_id: null, aangemaakt_op: nu,
        details_json: { opgaven: [{ vraag: 'Markeer het antwoord.', puntenMax: 2, puntenBehaald: 2 }] } },
    ],
    doel_voortgang: [
      { opdracht_id: 'O-doel', gemaakt: 25, laatste_goed: 17, laatste_aantal: 20, gehaald: true, gehaald_op: nu },
      // Vorige week behaald, deze week niets aan gedaan: hoort er niet bij.
      { opdracht_id: 'O-oud', gemaakt: 30, laatste_goed: 18, laatste_aantal: 20, gehaald: true, gehaald_op: vorigeWeek },
    ],
    opdrachten: [
      { id: 'O-wt', tool_id: 'verhaaltjessommen', config: {}, weektaak_id: 'W1' },
      { id: 'O-doel', tool_id: 'werkwoordspelling', config: { persoonlijk: 'doel' }, weektaak_id: 'W2' },
    ],
    weektaak_voortgang: [{ opdracht_id: 'O-wt', doel_aantal: 2, som_max: 2, afgerond: false }],
    weektaken: [{ id: 'W1', titel: 'Week 41' }, { id: 'W2', titel: 'Verleden tijd zwak' }],
  }
})

describe('haalMijnWeek', () => {
  it('verdeelt over de vier kolommen met totalen', async () => {
    const w = await haalMijnWeek('L1')
    expect(w.kolommen.weektaak.items).toHaveLength(1)
    expect(w.kolommen.doel.items).toHaveLength(1)
    expect(w.kolommen.vrij.items).toHaveLength(3)
    expect(w.kolommen.taak.items).toHaveLength(0)
    expect(w.totaal.opgaven).toBe(16)
    expect(w.totaal.behaald).toBe(1)
  })

  it('weektaak-opdracht: af, titel en onderdelen (zwakste eerst)', async () => {
    const [item] = (await haalMijnWeek('L1')).kolommen.weektaak.items
    expect(item.titel).toBe('Week 41')
    expect(item.af).toBe(true)
    expect(item.onderdelen.map(o => o.label)).toEqual(['Delen met rest', 'Optellen tot 1000'])
    expect(item.lijst).toHaveLength(2)
    expect(item.lijst.find(o => !o.goed)).toMatchObject({ vraag: 'Som B', antwoord: '5', juist: '7' })
  })

  it('doel: behaald deze week, met leesbaar onderdeel', async () => {
    const [item] = (await haalMijnWeek('L1')).kolommen.doel.items
    expect(item.behaaldDezeWeek).toBe(true)
    expect(item.stand).toMatchObject({ gehaald: true, pct: 85 })
    expect(item.onderdelen[0].label).toBe('Verleden tijd (zwak)')
    expect(item.lijst[0].vraag).toBe('werken')
  })

  it('vrij oefenen: gebundelde rij telt als opgaven, cats[] per zinsdeel', async () => {
    const { vrij } = (await haalMijnWeek('L1')).kolommen
    const dictee = vrij.items.find(i => i.toolId === 'dictee-thema1')
    expect(dictee).toMatchObject({ opgaven: 10, goed: 8, pct: 80 })
    expect(dictee.onderdelen).toHaveLength(0)
    const zd = vrij.items.find(i => i.toolId === 'taal-zinsdelen')
    expect(zd.onderdelen.map(o => `${o.label} ${o.goed}/${o.totaal}`)).toEqual(['gezegde 0/1', 'onderwerp 1/1'])
  })

  it('begrijpend lezen met volle punten telt als goed', async () => {
    const { vrij } = (await haalMijnWeek('L1')).kolommen
    expect(vrij.items.find(i => i.toolId === 'spullen-les1').lijst[0].goed).toBe(true)
  })
})
