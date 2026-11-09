// Eigen vragen van de leerkracht: inlezen uit geplakte tekst of een
// CSV-bestand, en nakijken bij de leerling (src/games/EigenVragen.jsx).
//
// Per regel: vraag, goed antwoord, en eventueel foute keuzes. Met foute
// keuzes wordt het meerkeuze, zonder is het een open vraag. Kolommen mogen
// gescheiden zijn door een tab (plakken uit Excel of Word-tabel), een
// puntkomma (Nederlandse Excel-CSV) of een komma.

export const MAX_VRAGEN = 200
export const MAX_LENGTE = 300
export const MAX_FOUT = 3

// Splitst tekst in rijen en cellen, met aanhalingstekens zoals in CSV
// ("tekst met ; erin", en "" voor een aanhalingsteken).
function splitsRijen(tekst, scheiding) {
  const rijen = []
  let rij = [], cel = '', inQuote = false
  for (let i = 0; i < tekst.length; i++) {
    const t = tekst[i]
    if (inQuote) {
      if (t === '"') {
        if (tekst[i + 1] === '"') { cel += '"'; i++ } else inQuote = false
      } else cel += t
    } else if (t === '"' && cel.trim() === '') {
      inQuote = true; cel = ''
    } else if (t === scheiding) {
      rij.push(cel); cel = ''
    } else if (t === '\n') {
      rij.push(cel); rijen.push(rij); rij = []; cel = ''
    } else if (t !== '\r') {
      cel += t
    }
  }
  rij.push(cel); rijen.push(rij)
  return rijen
}

function kiesScheiding(tekst) {
  if (tekst.includes('\t')) return '\t'
  if (tekst.includes(';')) return ';'
  return ','
}

const schoon = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_LENGTE)

// Ruwe rijen uit geplakte tekst of een bestand: [[vraag, antwoord, fout...]],
// zonder lege regels en zonder kopregel ("Vraag; Antwoord; ...").
export function leesRijen(tekst) {
  let invoer = String(tekst ?? '').replace(/^\uFEFF/, '')
  if (!invoer.trim()) return []
  // Excel zet soms eerst een regel "sep=;" neer: die zegt welk scheidingsteken het is.
  let scheiding = null
  const sep = invoer.match(/^sep=(.)\r?\n/i)
  if (sep) { scheiding = sep[1]; invoer = invoer.slice(sep[0].length) }
  let rijen = splitsRijen(invoer, scheiding ?? kiesScheiding(invoer))
    .map(rij => rij.map(schoon))
    .filter(cellen => cellen.some(Boolean))
  rijen = kolommenGoed(rijen)
  return rijen
    .map(cellen => {
      while (cellen.length && !cellen[cellen.length - 1]) cellen.pop()
      return cellen
    })
    .filter(cellen => cellen.length)
}

// Zet de kolommen in de volgorde vraag, antwoord, fout... :
// - Met een kopregel ("Nr; Vraag; Goed antwoord; Fout 1; ...") volgen we de
//   kopjes, in welke volgorde ze ook staan, en valt de kopregel weg.
// - Zonder kopregel: staat er vooraan een kolom met alleen nummers (1, 2, 3
//   of 1. 2. 3.), dan valt die weg.
const isVraagKop = (c) => /^vra(ag|gen)\b/i.test(c)
const isAntwKop = (c) => /antwoord/i.test(c) && !/fout|onjuist/i.test(c)
const isFoutKop = (c) => /fout|onjuist|afleider|keuze/i.test(c)
function kolommenGoed(rijen) {
  if (!rijen.length) return rijen
  // Blooket-sjabloon: een titelregel, dan "Question #, Question Text, Answer 1..4,
  // Time Limit, Correct Answer(s)" met het nummer van het goede antwoord.
  for (let h = 0; h < Math.min(3, rijen.length); h++) {
    const kop = rijen[h].map(c => c.toLowerCase())
    const vi = kop.findIndex(c => /question text/.test(c)), ci = kop.findIndex(c => /correct answer/.test(c))
    if (vi < 0 || ci < 0) continue
    const ant = kop.map((c, i) => (/^answer \d/.test(c) ? i : -1)).filter(i => i >= 0)
    return rijen.slice(h + 1).map(r => {
      const goedNr = parseInt(String(r[ci] ?? '').match(/\d+/)?.[0] ?? '', 10)
      const opties = ant.map(i => r[i] ?? '')
      const goed = opties[goedNr - 1] ?? ''
      return [r[vi] ?? '', goed, ...opties.filter((o, i) => o && i !== goedNr - 1)]
    })
  }
  const kop = rijen[0], vi = kop.findIndex(isVraagKop), ai = kop.findIndex((c, i) => i !== vi && isAntwKop(c))
  if (vi >= 0 && ai >= 0) {
    let fi = kop.map((c, i) => (i !== vi && i !== ai && isFoutKop(c) ? i : -1)).filter(i => i >= 0)
    if (!fi.length) fi = kop.map((c, i) => i).filter(i => i > ai && i !== vi)
    // kolommen rechts van de kopregel (zonder kopje) tellen als extra foute keuzes
    return rijen.slice(1).map(r => [r[vi] ?? '', r[ai] ?? '', ...fi.map(i => r[i] ?? ''), ...r.slice(kop.length)])
  }
  const nummer = (c) => /^\d{1,3}[.)]?$/.test(c)
  if (rijen.every(r => nummer(r[0] ?? '')) && rijen.some(r => r.length > 2 && r[1] && r[2])) return rijen.map(r => r.slice(1))
  return rijen
}

// Geeft { vragen: [{ vraag, antwoord, fout: [] }], meldingen: [tekst] }.
export function leesVragen(tekst) {
  const vragen = [], meldingen = []
  leesRijen(tekst).forEach((cellen, i) => {
    const [vraag, antwoord, ...rest] = cellen
    const fout = rest.filter(Boolean)
    if (!vraag) { meldingen.push(`Regel ${i + 1}: de vraag ontbreekt.`); return }
    if (!antwoord) { meldingen.push(`Regel ${i + 1}: er staat geen goed antwoord bij "${vraag.slice(0, 40)}".`); return }
    if (fout.length > MAX_FOUT) meldingen.push(`Regel ${i + 1}: alleen de eerste ${MAX_FOUT} foute keuzes worden gebruikt.`)
    if (vragen.length >= MAX_VRAGEN) {
      if (vragen.length === MAX_VRAGEN) meldingen.push(`Er kunnen maximaal ${MAX_VRAGEN} vragen in één opdracht; de rest is weggelaten.`)
      vragen.push(null)
      return
    }
    vragen.push({ vraag, antwoord, fout: fout.slice(0, MAX_FOUT) })
  })
  return { vragen: vragen.filter(Boolean), meldingen }
}

// Terug naar tekst (tab-gescheiden), om een opgeslagen lijst te bewerken.
export function vragenAlsTekst(vragen) {
  return (vragen ?? []).map(v => [v.vraag, v.antwoord, ...(v.fout ?? [])].join('\t')).join('\n')
}

// Voorbeeldbestand voor Excel (puntkomma's, met BOM zodat é en ë goed gaan).
export const VOORBEELD_CSV = '\uFEFF' + [
  'Vraag;Goed antwoord;Fout 1;Fout 2;Fout 3',
  'Wat is de hoofdstad van Frankrijk?;Parijs;Lyon;Marseille;Nice',
  'Hoeveel poten heeft een spin?;8;6;10;4',
  'Hoe heet het grootste land van Europa?;Rusland',
  'Wat is 7 x 8?;56',
  'Noem de hoofdstad van Nederland.;Amsterdam',
].join('\r\n')

// Vergelijken zonder te letten op hoofdletters, spaties, een punt aan het
// eind, soorten aanhalingstekens, of komma/punt in een getal.
export function normaal(s) {
  let t = String(s ?? '').toLowerCase()
    .replace(/[‘’´`]/g, "'").replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ').trim()
    .replace(/[.!?]+$/, '').trim()
  if (/^-?\d+([.,]\d+)?$/.test(t)) t = String(Number(t.replace(',', '.')))
  return t
}

// Open vraag: meer goede antwoorden mogen, met " / " ertussen
// (bv. "Den Haag / 's-Gravenhage"). Een breuk als 3/4 wordt niet gesplitst.
export function isGoed(invoer, antwoord) {
  const n = normaal(invoer)
  if (!n) return false
  return String(antwoord).split(/\s+\/\s+/).some(a => normaal(a) === n)
}
