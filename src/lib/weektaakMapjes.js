// De leerkracht zet opdrachten klaar per weektaak ("Weektaak 2"), dus zo hoort
// de leerling ze ook te zien: eerst de mapjes, daarna wat erin zit. Alles door
// elkaar in één lijst maakte niet duidelijk welke opdracht bij welke weektaak
// hoorde, en bij twee lopende weektaken werd het een onleesbare rij.

// Datum als "ma 3 feb" — kort genoeg voor op een kaartje.
const datumOpmaak = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })

export function korteDatum(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? '' : datumOpmaak.format(d)
}

export function groepeer(opdrachten) {
  const mappen = new Map()
  for (const o of opdrachten) {
    const wt = o.weektaak
    const id = wt?.id ?? 'los'
    if (!mappen.has(id)) {
      mappen.set(id, {
        id,
        titel: wt?.titel || 'Weektaak',
        startOp: wt?.start_op ?? null,
        eindOp: wt?.eind_op ?? null,
        opdrachten: [],
      })
    }
    mappen.get(id).opdrachten.push(o)
  }
  // Nieuwste weektaak bovenaan, net als in het portaal van de leerkracht.
  return [...mappen.values()].sort((a, b) => String(b.startOp ?? '').localeCompare(String(a.startOp ?? '')))
}
