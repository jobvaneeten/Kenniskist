// Verzonnen proefgegevens voor de handleiding. Niets hiervan bestaat echt.
const nu = new Date('2026-11-05T10:30:00+01:00')
const dag = (d, uur = 10) => new Date(nu.getTime() + d * 864e5 + (uur - 10) * 36e5).toISOString()

export const SCHOOL = { id: 'S1', naam: 'Basisschool De Regenboog', code: 'regenboog' }
export const KLASSEN = [
  { id: 'K7', school_id: 'S1', naam: 'Groep 7a', schooljaar: '2026-2027', code: 'zon7a', groepen: [7], spel_na: null },
  { id: 'K5', school_id: 'S1', naam: 'Groep 5b', schooljaar: '2026-2027', code: 'maan5b', groepen: [5], spel_na: null },
]
const NAMEN7 = ['Ayoub', 'Fleur', 'Daan', 'Noor', 'Sem', 'Lina', 'Milan', 'Emma', 'Jesse', 'Yara']
const NAMEN5 = ['Bram', 'Sofie', 'Ilias', 'Julia', 'Tim', 'Zoë']
export const PROFIELEN = [
  { id: 'L1', rol: 'leerkracht', school_id: 'S1', klas_id: null, weergavenaam: 'Juf Sanne', gebruikersnaam: null, email: 'juf.sanne@voorbeeld.nl' },
  { id: 'I1', rol: 'icter', school_id: 'S1', klas_id: null, weergavenaam: 'Meester Tom', gebruikersnaam: null, email: 'meester.tom@voorbeeld.nl' },
  ...NAMEN7.map((n, i) => ({ id: 'P7' + i, rol: 'leerling', school_id: 'S1', klas_id: 'K7', weergavenaam: n, gebruikersnaam: n.toLowerCase(), voorlezen: i === 2, klassen: { code: 'zon7a' } })),
  ...NAMEN5.map((n, i) => ({ id: 'P5' + i, rol: 'leerling', school_id: 'S1', klas_id: 'K5', weergavenaam: n, gebruikersnaam: n.toLowerCase().replace('ë', 'e'), voorlezen: false, klassen: { code: 'maan5b' } })),
]
const L7 = PROFIELEN.filter(p => p.klas_id === 'K7').map(p => p.id)
export const KLAS_LEERKRACHTEN = [{ klas_id: 'K7', leerkracht_id: 'L1' }, { klas_id: 'K5', leerkracht_id: 'I1' }]

// ── weektaken, taken en doelen ──
const WEEKTAKEN = [
  { id: 'W45', klas_id: 'K7', titel: 'Week 45', start_op: '2026-11-02', eind_op: '2026-11-08' },
  { id: 'W44', klas_id: 'K7', titel: 'Week 44', start_op: '2026-10-26', eind_op: '2026-11-01' },
  { id: 'T1', klas_id: 'K7', titel: 'Extra oefenen: breuken', start_op: '2026-11-02', eind_op: '2099-12-31' },
  { id: 'D1', klas_id: 'K7', titel: 'Komma bij opsommingen', start_op: '2026-10-20', eind_op: '2099-12-31' },
  { id: 'D2', klas_id: 'K7', titel: 'Tafels van 6, 7 en 8', start_op: '2026-10-20', eind_op: '2099-12-31' },
  { id: 'D3', klas_id: 'K7', titel: 'Woorden met ng en nk', start_op: '2026-10-27', eind_op: '2099-12-31' },
]
export const OPDRACHTEN = [
  { id: 'O1', weektaak_id: 'W45', tool_id: 'taal-woordsoorten', aantal: 20, volgorde: 0, config: { soorten: ['zelfstandig naamwoord', 'werkwoord', 'bijvoeglijk naamwoord', 'lidwoord'] } },
  { id: 'O2', weektaak_id: 'W45', tool_id: 'tafels', aantal: 30, volgorde: 1, config: {} },
  { id: 'O3', weektaak_id: 'W45', tool_id: 'dictee-thema3', aantal: 12, volgorde: 2, config: {} },
  { id: 'O4', weektaak_id: 'W45', tool_id: 'lezen-timer', aantal: 1, volgorde: 3, config: { minuten: 15, opdrachttekst: 'Lees in je eigen leesboek' } },
  { id: 'O5', weektaak_id: 'W45', tool_id: 'doelen-werken', aantal: null, volgorde: 4, config: { minuten: 20 } },
  { id: 'O6', weektaak_id: 'W44', tool_id: 'verhaaltjessommen', aantal: 10, volgorde: 0, config: {} },
  { id: 'O7', weektaak_id: 'W44', tool_id: 'werkwoordspelling', aantal: 20, volgorde: 1, config: {} },
  { id: 'O8', weektaak_id: 'T1', tool_id: 'breuken-plaatjes', aantal: 15, volgorde: 0, config: { persoonlijk: 'taak' } },
  { id: 'O9', weektaak_id: 'D1', tool_id: 'taal-interpunctie', aantal: null, volgorde: 0, config: { persoonlijk: 'doel', onderdelen: ['komma'] } },
  { id: 'O10', weektaak_id: 'D2', tool_id: 'tafels', aantal: null, volgorde: 0, config: { persoonlijk: 'doel' } },
  { id: 'O11', weektaak_id: 'D3', tool_id: 'dictee-categorie', aantal: null, volgorde: 0, config: { persoonlijk: 'doel', cats: ['slang', 'stinkdier'] } },
]
const VOOR = { O8: ['P71', 'P72', 'P76'], O9: ['P71', 'P72', 'P73', 'P76'], O10: ['P71', 'P72', 'P74'], O11: ['P71', 'P75', 'P77'] }
export const TOEWIJZINGEN = OPDRACHTEN.flatMap(o => (VOOR[o.id] ?? L7).map(l => ({ opdracht_id: o.id, leerling_id: l, status: 'open', aantal_override: null, afgerond_op: null })))

// voortgang: een realistisch rommelige klas
const r = (() => { let s = 7; return () => (s = (s * 9301 + 49297) % 233280) / 233280 })()
export const VOORTGANG = TOEWIJZINGEN.map(t => {
  const o = OPDRACHTEN.find(x => x.id === t.opdracht_id), doel = o.aantal
  const deel = o.weektaak_id === 'W44' ? (r() < 0.8 ? 1 : 0.6) : r() < 0.25 ? 0 : r() < 0.55 ? 1 : 0.3 + r() * 0.6
  const max = doel ? Math.round(doel * deel) : Math.round(10 + r() * 20)
  return { opdracht_id: t.opdracht_id, leerling_id: t.leerling_id, weektaak_id: o.weektaak_id, school_id: 'S1', tool_id: o.tool_id,
    doel_aantal: doel, som_max: max, som_score: Math.round(max * (0.6 + r() * 0.38)), som_ms: o.tool_id === 'lezen-timer' ? max * (900000 + r() * 60000) : max * (9000 + r() * 12000), pogingen: max, herkansingen: 0, afgerond: false, laatst_op: dag(-1) }
})
export const DOELSTAND = TOEWIJZINGEN.filter(t => ['O9', 'O10', 'O11'].includes(t.opdracht_id)).map((t, i) => {
  const gemaakt = [6, 24, 31, 14, 40, 22, 9, 27, 35, 18][i % 10], goed = [5, 14, 18, 10, 17, 19, 7, 15, 17, 13][i % 10]
  // behaald zoals in de echte view: minstens 20 gemaakt en 16 van de laatste 20 goed (80%)
  const lg = Math.min(goed, Math.min(20, gemaakt)), gehaald = gemaakt >= 20 && lg >= 16
  return { opdracht_id: t.opdracht_id, leerling_id: t.leerling_id, gemaakt, laatste_goed: lg, laatste_aantal: Math.min(20, gemaakt), gehaald, gehaald_op: gehaald ? dag(-2) : null }
})
// Fleur (P71): tafels-doel 16 dagen geleden behaald, dus nu herhalen (migratie 0024).
Object.assign(DOELSTAND.find(d => d.opdracht_id === 'O10' && d.leerling_id === 'P71'), { gehaald_op: dag(-16) })
const DAG = 864e5
export const HERHALING = DOELSTAND.map(d => ({
  opdracht_id: d.opdracht_id, leerling_id: d.leerling_id, gehaald: d.gehaald, gehaald_op: d.gehaald_op, rondes_ok: 0,
  volgende_op: d.gehaald ? new Date(new Date(d.gehaald_op).getTime() + 14 * DAG).toISOString() : null, vast: false,
  // Fleur zakte bij de herhaling van ng/nk door: dat doel staat weer open
  mislukt_op: d.opdracht_id === 'O11' && d.leerling_id === 'P71' ? dag(-1) : null,
}))
export const DOELWERK = TOEWIJZINGEN.filter(t => t.opdracht_id === 'O5').map((t, i) => ({ opdracht_id: 'O5', leerling_id: t.leerling_id, weektaak_id: 'W45', minuten: 20, som_ms: [6, 20, 14, 0, 11, 20, 3, 17, 9, 20][i] * 60000, afgerond: false }))

// resultaten (voor leerlingdetail en weekoverzicht)
const ZINNEN = [['De hond loopt snel door het park.', 'loopt', 'werkwoord'], ['Een kleine kat slaapt altijd op de bank.', 'kleine', 'bijvoeglijk naamwoord'], ['Papa koopt twee broden.', 'Papa', 'zelfstandig naamwoord'], ['Het meisje lacht.', 'Het', 'lidwoord']]
export const RESULTATEN = L7.flatMap((l, li) => Array.from({ length: 26 }, (_, i) => {
  const z = ZINNEN[i % 4], goed = (i + li) % 5 !== 0
  const tool = i < 14 ? 'taal-woordsoorten' : i < 22 ? 'tafels' : 'dictee-thema3'
  return { id: l + '-' + i, leerling_id: l, tool_id: tool, score: goed ? 1 : 0, max_score: 1, ms: 9000 + (i * 1300) % 9000,
    opdracht_id: tool === 'taal-woordsoorten' ? 'O1' : tool === 'tafels' ? 'O2' : 'O3', aangemaakt_op: dag(-(i % 4), 9 + (i % 5)),
    details_json: { opgaven: [tool === 'taal-woordsoorten'
      ? { vraag: z[0], antwoord: goed ? z[2] : 'bijwoord', juist: z[2], goed, cat: z[2], catLabel: z[2] }
      : tool === 'tafels' ? { vraag: `${3 + (i % 7)} × ${6 + (i % 3)}`, antwoord: String((3 + (i % 7)) * (6 + (i % 3)) + (goed ? 0 : 1)), juist: String((3 + (i % 7)) * (6 + (i % 3))), goed }
      : { vraag: 'koning', antwoord: goed ? 'koning' : 'koninng', juist: 'koning', goed }] } }
}))
// Groepsoverzicht: wat extra oefenwerk per vaardigheid, per kind anders (migratie 0025)
const VAARD = [
  ['taal-interpunctie', 'komma', 'komma', 0.55], ['taal-interpunctie', 'hoofdletters', 'hoofdletters', 0.9],
  ['werkwoordspelling', 'vtZwak', 'vtZwak', 0.7], ['werkwoordspelling', 'tt', 'tt', 0.88],
  ['tafels', 'tafel-7', 'Tafel van 7', 0.75], ['tafels', 'tafel-8', 'Tafel van 8', 0.62],
  ['verhaaltjessommen', 'g7::Je leert sommen als 22 × 64 cijferend uitrekenen of met splitsen, en je herhaalt sommen als 6 × 346.', 'Je leert sommen als 22 × 64 cijferend uitrekenen of met splitsen, en je herhaalt sommen als 6 × 346.', 0.6],
]
export const OEFENWERK = L7.flatMap((l, li) => VAARD.flatMap(([tool, cat, label, basis], vi) => {
  const n = (li + vi) % 6 === 0 ? 3 : 8 + ((li * 7 + vi * 3) % 14)
  const kans = Math.min(0.98, Math.max(0.2, basis + (((li * 13 + vi * 5) % 9) - 4) * 0.07))
  return Array.from({ length: n }, (_, i) => ({ id: 'G' + l + '-' + vi + '-' + i, leerling_id: l, tool_id: tool, score: (i * 37 % 100) / 100 < kans ? 1 : 0, max_score: 1,
    opdracht_id: null, aangemaakt_op: dag(-(i % 12)), details_json: { opgaven: [{ vraag: '...', cat, catLabel: label, goed: (i * 37 % 100) / 100 < kans }] } }))
}))
export const EIGEN = [
  { id: 'E1', school_id: 'S1', klas_id: 'K7', groep: 7, vak: 'taal', onderwerp: 'Spreekwoorden', spel_na: null, geld: 50, aangemaakt_op: dag(-6),
    vragen: [{ vraag: 'Wat betekent: de kat uit de boom kijken?', antwoord: 'eerst afwachten', fout: ['snel weglopen', 'boos worden'] }, { vraag: 'Maak af: Wie A zegt, moet ook ... zeggen', antwoord: 'B', fout: [] }, { vraag: 'Wat betekent: iets onder de knie hebben?', antwoord: 'iets goed kunnen', fout: ['pijn hebben', 'iets kwijt zijn'] }] },
]
export const LEESSTANDEN = [{ leerling_id: 'P71', opdracht_id: 'O4', gebankt: 380, start_op: null }]

export const TABELLEN = {
  scholen: [SCHOOL], klassen: KLASSEN, profielen: PROFIELEN, klas_leerkrachten: KLAS_LEERKRACHTEN,
  weektaken: WEEKTAKEN.map(w => ({ ...w, opdrachten: OPDRACHTEN.filter(o => o.weektaak_id === w.id).map(o => ({ id: o.id, persoonlijk: o.config.persoonlijk ?? null })) })),
  opdrachten: OPDRACHTEN.map(o => ({ ...o, school_id: 'S1', weektaken: WEEKTAKEN.find(w => w.id === o.weektaak_id) })),
  toewijzingen: TOEWIJZINGEN, weektaak_voortgang: VOORTGANG, doel_voortgang: DOELSTAND, doelwerk_voortgang: DOELWERK, doel_herhaling: HERHALING,
  resultaten: [...RESULTATEN, ...OEFENWERK], eigen_oefeningen: EIGEN, leesstanden: LEESSTANDEN, game_voortgang: [],
}
