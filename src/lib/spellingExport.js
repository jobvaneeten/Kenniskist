// Export van een controledictee voor de Spellingvolger (knop "Exporteer voor
// Spellingvolger" in src/portaal/DicteeTab.jsx). Puur: gebruikt de analyse die
// de pagina al berekend heeft (analyseer() uit dicteeAnalyse.js), dus precies
// dezelfde telling. Het bestand blijft lokaal bij de leerkracht (AVG): niets
// naar een server, niets gelogd.
import { categorieNaam, categorieRegel } from './dicteeAnalyse.js'

export const METHODE = 'Taal actief 5'

// "2026-11-20T10:43:00+01:00": lokale tijd met de tijdzone erbij
export function lokaleIso(d) {
  const p = (n) => String(Math.abs(n)).padStart(2, '0')
  const o = -d.getTimezoneOffset()
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${o >= 0 ? '+' : '-'}${p(Math.trunc(o / 60))}:${p(o % 60)}`
}
const lokaleDatum = (d) => lokaleIso(d).slice(0, 10)

// dictee: { id, titel, woorden, aangemaakt_op }; rijen: alle antwoorden van
// deze afname; leerlingen: de hele groep [{ id, weergavenaam }]; a: analyseer()
// over de ingeleverde rijen (zoals op de pagina).
export function bouwSpellingExport({ dictee, rijen, leerlingen, a, nu = new Date() }) {
  const groep = /groep\s*(\d+)/i.exec(dictee.titel)?.[1] ?? ''
  const thema = Number(/thema\s*(\d+)/i.exec(dictee.titel)?.[1]) || null
  const afgenomen = new Date(dictee.aangemaakt_op)
  const ingeleverd = new Set(rijen.filter(r => r.ingeleverd_op).map(r => r.leerling_id))

  const leerlingRij = (l) => {
    const p = ingeleverd.has(l.id) ? a.perLeerling[l.id] : null
    if (!p) return { id: l.id, naam: l.weergavenaam, ingeleverd: false, score: null, fouten: {}, foutenBuitenCategorie: 0 }
    const fouten = Object.fromEntries(a.catIds.filter(id => p.cat[id] > 0).map(id => [id, p.cat[id]]))
    // telt zoals a.overig op de pagina: elk fout woord met een fout buiten de getoetste categorieën
    const buiten = p.per.filter(x => !x.goed && x.overig).length
    return { id: l.id, naam: l.weergavenaam, ingeleverd: true, score: p.score, fouten, foutenBuitenCategorie: buiten }
  }
  const lijst = leerlingen.map(leerlingRij)

  const uit = {
    type: 'kenniskist-spellinganalyse',
    versie: 1,
    geexporteerdOp: lokaleIso(nu),
    groep,
    methode: METHODE,
    thema,
    toets: { id: dictee.id, naam: dictee.titel, afgenomenOp: lokaleDatum(afgenomen) },
    maxScore: dictee.woorden.length,
    foutenBuitenCategorieTotaal: lijst.reduce((s, l) => s + l.foutenBuitenCategorie, 0),
    categorieen: a.catIds.map(id => ({ id, naam: categorieNaam(id), regel: categorieRegel(id), kansen: a.kansen[id] })),
    leerlingen: lijst,
  }
  if (import.meta.env?.DEV) {
    const ids = new Set(uit.categorieen.map(c => c.id))
    console.assert(lijst.every(l => Object.keys(l.fouten).every(k => ids.has(k))), 'Spellingexport: onbekende categorie in fouten')
  }
  return uit
}

export function bestandsnaam(exp) {
  return `spellinganalyse_groep${exp.groep}_thema${exp.thema ?? ''}_${exp.toets.afgenomenOp}.json`
}

// Alleen in de browser: het bestand downloaden, verder niets.
export function downloadSpellingExport(exp) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(exp, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = bestandsnaam(exp)
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
