// Rekenwerk voor "deze weektaak nog een keer, volgende week". Los van de
// database zodat het te testen is.

// Datum als YYYY-MM-DD, n dagen verder. Middag als tijdstip: met middernacht
// zou een zomertijdsprong er een dag naast kunnen zitten.
export function plusDagen(iso, n) {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE')
}

export function dagenTussen(startOp, eindOp) {
  const a = new Date(`${startOp}T12:00:00`)
  const b = new Date(`${eindOp}T12:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
  return Math.round((b - a) / 86400000)
}

// Hoeveel dagen de kopie opschuift: altijd een heel aantal weken, en genoeg om
// niet over de oorspronkelijke periode heen te vallen. Een weektaak van maandag
// t/m vrijdag schuift dus 7 dagen op, eentje van twee weken 14.
export function verschuiving(startOp, eindOp) {
  const duur = dagenTussen(startOp, eindOp)
  return Math.max(1, Math.ceil((duur + 1) / 7)) * 7
}

// "Weektaak 2" wordt "Weektaak 3"; een titel zonder getal krijgt "(kopie)"
// erachter. Zo hoeft de leerkracht meestal niets aan te passen.
export function volgendeTitel(titel) {
  const schoon = String(titel ?? '').trim()
  if (!schoon) return 'Weektaak'
  const m = schoon.match(/^(.*?)(\d+)(\D*)$/)
  if (!m) return `${schoon} (kopie)`
  const [, voor, getal, na] = m
  // Voorloopnullen behouden: "Weektaak 09" wordt "Weektaak 10", niet "Weektaak 1 0".
  const volgende = String(Number(getal) + 1).padStart(getal.length, '0')
  return `${voor}${volgende}${na}`
}

// Alles wat het kopieerformulier standaard invult.
export function kopieVoorstel(weektaak) {
  const dagen = verschuiving(weektaak.start_op, weektaak.eind_op)
  return {
    titel: volgendeTitel(weektaak.titel),
    startOp: plusDagen(weektaak.start_op, dagen),
    eindOp: plusDagen(weektaak.eind_op, dagen),
  }
}
