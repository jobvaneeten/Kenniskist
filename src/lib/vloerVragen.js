// Vragen voor de Vloerquiz (src/games/VloerQuiz.jsx). De leerkracht vinkt ze
// aan uit wat al op de site staat: de eigen oefeningen van de klas, de tafels,
// de woordenschat van groep 7 en de hoofdsteden van Europa.
//
// Elke vraag: { id, vraag, goed, fout: [max 3] }. Op de vloer zijn het vier
// vlakken, dus een open vraag krijgt foute keuzes uit de andere antwoorden
// van dezelfde reeks.

import { WOORDEN_PER_BLOK, BLOK_NUMMERS, deelNaam } from '../games/woordenschatData.js'
import { KAARTEN } from '../games/topoData.js'

const MAX_KEUZE = 80

function schud(lijst) {
  const a = [...lijst]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}
const zelfde = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase()

// Vult foute keuzes aan tot 3 met andere antwoorden uit de reeks.
export function vulFoutAan(vragen) {
  const antwoorden = [...new Set(vragen.map(v => v.goed))]
  return vragen.map(v => {
    const fout = (v.fout ?? []).filter(f => f && !zelfde(f, v.goed)).slice(0, 3)
    const extra = schud(antwoorden.filter(a => !zelfde(a, v.goed) && !fout.some(f => zelfde(f, a))))
    return { ...v, fout: [...fout, ...extra].slice(0, 3) }
  }).filter(v => v.fout.length > 0)
}

// Een eigen oefening uit het portaal. Bij meer goede antwoorden ("Den Haag /
// 's-Gravenhage") staat het eerste op het vlak.
export function eigenNaarVloer(oefening) {
  const vragen = (oefening?.vragen ?? []).map((v, i) => ({
    id: `eigen-${oefening.id}-${i}`,
    vraag: v.vraag,
    goed: String(v.antwoord ?? '').split(/\s+\/\s+/)[0].slice(0, MAX_KEUZE),
    fout: (v.fout ?? []).map(f => String(f).slice(0, MAX_KEUZE)),
  })).filter(v => v.vraag && v.goed)
  return vulFoutAan(vragen)
}

// Tafel van n: n × 1 t/m 10. Foute keuzes liggen dichtbij (de buurman in de
// tafel, een keer te veel of te weinig).
export function tafel(n) {
  const vragen = []
  for (let k = 1; k <= 10; k++) {
    const goed = n * k
    const kans = [goed + n, goed - n, (n + 1) * k, (n - 1) * k, goed + 1, goed - 1, goed + 10, goed - 10]
      .filter(x => x > 0 && x !== goed)
    vragen.push({ id: `tafel-${n}-${k}`, vraag: `${k} × ${n}`, goed: String(goed), fout: schud([...new Set(kans)]).slice(0, 3).map(String) })
  }
  return vragen
}

// Woordenschat groep 7: "Wat betekent ...?" met de betekenis van andere
// woorden uit hetzelfde blok als foute keuzes.
export function woordenschat(blok) {
  const woorden = WOORDEN_PER_BLOK[blok] ?? []
  return vulFoutAan(woorden.filter(w => w.uitleg.length <= MAX_KEUZE).map((w, i) => ({
    id: `woord-${blok}-${i}`,
    vraag: `Wat betekent "${w.woord}"?`,
    goed: w.uitleg,
    fout: [],
    deel: deelNaam(w),
  })))
}

// Hoofdsteden van kaart A (landen en hoofdsteden staan in dezelfde volgorde).
export function hoofdsteden() {
  const { landen, hoofdsteden: steden } = KAARTEN[0].onderdelen
  return vulFoutAan(landen.slice(0, steden.length).map((land, i) => ({
    id: `hoofdstad-${i}`,
    vraag: `Wat is de hoofdstad van ${land}?`,
    goed: steden[i],
    fout: [],
  })))
}

// Wat de leerkracht kan kiezen. `vragen()` maakt de reeks pas als hij open
// gaat; de eigen oefeningen komen er in het portaal bij (uit de database).
export const VASTE_REEKSEN = [
  ...Array.from({ length: 10 }, (_, i) => ({ key: `tafel-${i + 1}`, soort: 'Tafels', naam: `Tafel van ${i + 1}`, vragen: () => tafel(i + 1) })),
  ...BLOK_NUMMERS.map(b => ({ key: `woord-${b}`, soort: 'Woordenschat groep 7', naam: `Blok ${b}`, vragen: () => woordenschat(b) })),
  { key: 'hoofdsteden', soort: 'Topografie', naam: 'Hoofdsteden van Europa', vragen: hoofdsteden },
]

// De vragen voor het potje: `aantal` uit de aangevinkte, in willekeurige
// volgorde (of in de volgorde van de lijst).
export function kiesVragen(aangevinkt, aantal, door = true) {
  const lijst = door ? schud(aangevinkt) : [...aangevinkt]
  return lijst.slice(0, Math.max(1, aantal)).map(({ vraag, goed, fout }) => ({ vraag, goed, fout }))
}
