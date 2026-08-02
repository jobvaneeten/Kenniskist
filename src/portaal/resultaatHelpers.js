// Hulpjes om `resultaten`-rijen leesbaar te maken voor het portaal.
//
// De tabel bevat één rij per opgave (score 1, max_score 1 — zie
// src/games/gebruikOpdracht.js). Rechtstreeks tonen levert een muur van
// "1/1 (100%)"-regels op. Deze module doet er twee dingen mee: rijen bundelen
// tot sessies, en de fout gemaakte opgaven eruit trekken.

const SESSIE_GAT_MS = 30 * 60 * 1000   // meer dan een half uur stil = nieuwe sessie

// Elke tool logt zijn opgaven net iets anders. Alles wat hier binnenkomt gaat
// naar dezelfde vorm: { vraag, antwoord, juist, goed, cat, catLabel }.
function normaliseerOpgaven(detailsJson) {
  if (!detailsJson) return []
  if (Array.isArray(detailsJson.opgaven)) {
    return detailsJson.opgaven.map(o => ({
      vraag: o.werkwoord ?? o.vraag ?? o.woord ?? null,
      antwoord: o.antwoord ?? null,
      juist: o.juist ?? null,
      goed: !!o.goed,
      cat: o.cat ?? null,
      catLabel: o.catLabel ?? null,
    }))
  }
  // Engels (public/engels/index.html) logt alleen wat er gemist is.
  if (Array.isArray(detailsJson.gemist)) {
    return detailsJson.gemist.map(m => ({
      vraag: m.prompt ?? null,
      antwoord: null,
      juist: m.antwoord ?? null,
      goed: false,
      cat: null,
      catLabel: null,
    }))
  }
  return []
}

// Rijen (nieuwste eerst, zoals de query ze levert) bundelen tot sessies van
// dezelfde oefening. Een sessie breekt af bij een andere tool, een andere
// weektaak-opdracht, of meer dan een half uur stilte.
export function groepeerSessies(rijen) {
  const sessies = []
  for (const r of rijen) {
    const tijd = new Date(r.aangemaakt_op).getTime()
    const vorige = sessies[sessies.length - 1]
    const zelfdeSessie = vorige
      && vorige.toolId === r.tool_id
      && vorige.opdrachtId === (r.opdracht_id ?? null)
      && Math.abs(vorige.vroegste - tijd) <= SESSIE_GAT_MS
    const opgaven = normaliseerOpgaven(r.details_json)
    if (zelfdeSessie) {
      vorige.score += Number(r.score)
      vorige.maxScore += Number(r.max_score)
      vorige.vroegste = Math.min(vorige.vroegste, tijd)
      vorige.opgaven.push(...opgaven)
      vorige.rijIds.push(r.id)
    } else {
      sessies.push({
        id: `s${r.id}`,
        toolId: r.tool_id,
        opdrachtId: r.opdracht_id ?? null,
        weektaak: r.opdracht_id != null,
        score: Number(r.score),
        maxScore: Number(r.max_score),
        laatste: tijd,
        vroegste: tijd,
        opgaven,
        rijIds: [r.id],
      })
    }
  }
  return sessies
}

// Alle fout gemaakte opgaven, nieuwste eerst, met de oefening en het tijdstip
// erbij. Dit is wat de leerkracht wil zien zonder ergens op te klikken.
export function verzamelFouten(rijen) {
  const fouten = []
  for (const r of rijen) {
    for (const o of normaliseerOpgaven(r.details_json)) {
      if (o.goed) continue
      fouten.push({
        ...o,
        toolId: r.tool_id,
        weektaak: r.opdracht_id != null,
        opdrachtId: r.opdracht_id ?? null,
        tijd: new Date(r.aangemaakt_op).getTime(),
      })
    }
  }
  return fouten.sort((a, b) => b.tijd - a.tijd)
}

// Zelfde fouten, maar opgeteld: dezelfde opgave door meerdere leerlingen fout
// is één regel met een aantal erbij. Dit is de klas-versie van verzamelFouten —
// een leerkracht wil niet 60 losse regels, maar "hier struikelt de halve klas
// over". `antwoorden` houdt bij wat er dan wél ingevuld werd, meest gegeven
// eerst.
export function groepeerFouten(rijen) {
  const groepen = new Map()
  for (const r of rijen) {
    for (const o of normaliseerOpgaven(r.details_json)) {
      if (o.goed) continue
      const sleutel = `${r.tool_id}|${o.vraag ?? ''}|${o.juist ?? ''}`
      const g = groepen.get(sleutel) ?? {
        sleutel, toolId: r.tool_id, vraag: o.vraag, juist: o.juist,
        aantal: 0, leerlingen: new Set(), antwoorden: new Map(), laatste: 0,
      }
      g.aantal++
      g.leerlingen.add(r.leerling_id)
      if (o.antwoord) g.antwoorden.set(o.antwoord, (g.antwoorden.get(o.antwoord) ?? 0) + 1)
      g.laatste = Math.max(g.laatste, new Date(r.aangemaakt_op).getTime())
      groepen.set(sleutel, g)
    }
  }
  return [...groepen.values()]
    .map(g => ({
      ...g,
      leerlingenAantal: g.leerlingen.size,
      vaakstFout: [...g.antwoorden.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    }))
    .sort((a, b) => b.leerlingenAantal - a.leerlingenAantal || b.aantal - a.aantal)
}

// Filter op herkomst: alles, alleen weektaakwerk, of alleen vrij oefenen.
// `opdracht_id` is gevuld zodra een tool vanuit een weektaak draait.
export function filterHerkomst(rijen, herkomst) {
  if (herkomst === 'weektaak') return rijen.filter(r => r.opdracht_id != null)
  if (herkomst === 'vrij') return rijen.filter(r => r.opdracht_id == null)
  return rijen
}

export function scoreKlasse(pct) {
  if (pct >= 80) return 'portaal-score-goed'
  if (pct >= 50) return 'portaal-score-matig'
  return 'portaal-score-slecht'
}

// "vandaag 14:20", "gisteren 09:05" of "di 3 feb" — korter dan een volle
// datum-tijd, en in een tabel makkelijker te scannen.
export function kortMoment(ms) {
  const d = new Date(ms)
  const nu = new Date()
  const dag = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const verschil = Math.round((dag(nu) - dag(d)) / 86400000)
  const tijd = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  if (verschil === 0) return `vandaag ${tijd}`
  if (verschil === 1) return `gisteren ${tijd}`
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}
