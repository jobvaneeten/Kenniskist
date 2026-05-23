const r = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const p = arr => arr[Math.floor(Math.random() * arr.length)]

// ── Easy: eind groep 6 ────────────────────────────────────────────
const EASY = [
  () => { const x = r(3,9), y = r(2,8); return { q: `Een bakker bakt ${x} broodjes per uur. Hoeveel broodjes bakt hij in ${y} uur?`, a: x*y, unit: 'broodjes' } },
  () => { const n = p([12,16,20,24,28,32,36,40]); return { q: `In een klas zitten ${n} leerlingen. De helft fietst naar school. Hoeveel leerlingen fietsen?`, a: n/2, unit: 'leerlingen' } },
  () => { const p2 = r(3,9)*5, q2 = r(2,6); return { q: `Een boek kost €${p2}. Sanne koopt er ${q2} van. Hoeveel betaalt ze in totaal?`, a: p2*q2, unit: 'euro' } },
  () => { const sp = p([4,5,6,8,10]), t = r(2,8); return { q: `Bram fietst ${sp} kilometer per uur. Hoe ver komt hij in ${t} uur?`, a: sp*t, unit: 'kilometer' } },
  () => { const n = p([20,30,40,60,80,100]), f = p([2,4,5,10]); if(n%f!==0) return EASY[4](); return { q: `Op een parkeerplaats staan ${n} auto\'s. Een ${f === 2 ? 'half' : f === 4 ? 'kwart' : f === 5 ? 'vijfde' : 'tiende'} deel is blauw. Hoeveel blauwe auto\'s zijn er?`, a: n/f, unit: 'auto\'s' } },
  () => { const a2 = r(15,45), b2 = r(10,40); return { q: `In een fruitschaal liggen ${a2} appels en ${b2} sinaasappels. Hoeveel stuks fruit zijn er in totaal?`, a: a2+b2, unit: 'stuks' } },
  () => { const pp = r(2,9), qq = r(2,9); return { q: `Een tuin is ${pp} meter lang en ${qq} meter breed. Wat is de oppervlakte?`, a: pp*qq, unit: 'vierkante meter' } },
  () => { const tot = r(5,15)*10, geef = r(1,4)*10; if(geef>=tot) return EASY[7](); return { q: `Juf heeft €${tot} in haar portemonnee. Ze betaalt €${geef} voor bloemen. Hoeveel geld houdt ze over?`, a: tot-geef, unit: 'euro' } },
  () => { const kg = r(2,8), pp = r(3,9); return { q: `Een appel weegt ${pp*100} gram. Hoeveel gram wegen ${kg} appels samen?`, a: kg*pp*100, unit: 'gram' } },
  () => { const min = p([60,90,120,150]), parts = p([2,3,5,6]); if(min%parts!==0) return EASY[9](); return { q: `Een film duurt ${min} minuten. Je hebt al ${min/parts} minuten gekeken. Hoeveel minuten moet je nog kijken?`, a: min-min/parts, unit: 'minuten' } },
]

// ── Medium: eind groep 7 ──────────────────────────────────────────
const MEDIUM = [
  () => { const pr = p([20,40,50,60,80,100,120,200]), pct = p([10,20,25,50]); return { q: `Een jas kost €${pr}. Er is ${pct}% korting. Wat betaal je?`, a: pr*(1-pct/100), unit: 'euro' } },
  () => { const sp = p([60,80,90,100,120]), t = p([2,3,4,5]); return { q: `Een trein rijdt ${sp} km per uur. Hoe ver komt hij in ${t} uur?`, a: sp*t, unit: 'kilometer' } },
  () => { const tot = p([200,400,500,800,1000]), pct = p([10,20,25,40,50]); return { q: `Een school heeft ${tot} leerlingen. ${pct}% doet aan sport. Hoeveel leerlingen doen aan sport?`, a: tot*pct/100, unit: 'leerlingen' } },
  () => { const dist = p([120,150,180,240,300]), sp = p([60,80,100,120]); if(dist%sp!==0) return MEDIUM[3](); return { q: `Een auto rijdt ${sp} km per uur. De reis is ${dist} km lang. Hoeveel uur duurt de rit?`, a: dist/sp, unit: 'uur' } },
  () => { const tot = p([80,100,120,200,250]), pct = p([10,20,25,30,50]); const deel = tot*pct/100; return { q: `Van de ${tot} bezoekers van een museum is ${pct}% kind. Hoeveel volwassenen zijn er?`, a: tot-deel, unit: 'volwassenen' } },
  () => { const pr = p([30,45,60,75,90,120]), pct = p([10,20,25,50]); const korting = pr*pct/100; return { q: `Een spel kost €${pr}. Er is ${pct}% korting. Hoeveel euro korting krijg je?`, a: korting, unit: 'euro' } },
  () => { const a3 = r(2,8), b3 = r(2,8); const totaal = a3+b3; return { q: `In een bak zitten ${a3} rode en ${b3} blauwe ballen. Hoeveel procent is rood?`, a: Math.round(a3/totaal*100), unit: 'procent' } },
  () => { const sp = p([5,6,8,10,12]), km = p([30,40,50,60,80,100]); if(km%sp!==0) return MEDIUM[7](); return { q: `Lena fietst ${sp} kilometer per uur. Ze moet ${km} km afleggen. Hoeveel uur doet ze erover?`, a: km/sp, unit: 'uur' } },
  () => { const pr = p([50,80,100,120,200]); const pct = p([10,20,25]); return { q: `Een fiets kost normaal €${pr}. In de uitverkoop is de prijs met ${pct}% verlaagd. Wat is de nieuwe prijs?`, a: pr*(1-pct/100), unit: 'euro' } },
  () => { const pp = p([100,200,300,400,500]); const factor = p([2,3,4,5]); return { q: `Op een kaart is 1 cm gelijk aan ${factor} kilometer. Een rivier is ${pp} km lang. Hoe lang is de rivier op de kaart?`, a: pp/factor, unit: 'cm' } },
]

// ── Hard: midden groep 8 ──────────────────────────────────────────
const HARD = [
  () => { const pr = p([80,100,120,200,250]); return { q: `Een scooter kost €${pr}. Eerst gaat de prijs 10% omhoog, daarna is er 20% korting. Wat betaal je uiteindelijk?`, a: Math.round(pr*1.1*0.8), unit: 'euro' } },
  () => { const sp = p([60,80,90,120]); const t = p([1.5,2.5,3.5,4.5]); return { q: `Een auto rijdt ${sp} km per uur gedurende ${t} uur. Hoeveel kilometer heeft de auto gereden?`, a: sp*t, unit: 'kilometer' } },
  () => { const tot = p([120,160,200,240,300]); const pct = p([15,35,40,60,75]); return { q: `In een zaal zitten ${tot} mensen. ${pct}% zijn vrouw. Hoeveel mannen zijn er in de zaal?`, a: Math.round(tot*(1-pct/100)), unit: 'mannen' } },
  () => { const na = p([72,80,90,96,120]); const pct = p([20,25,50]); return { q: `Na een korting van ${pct}% kost een boek €${na}. Wat was de originele prijs?`, a: Math.round(na/(1-pct/100)), unit: 'euro' } },
  () => { const l = r(4,12), b = r(3,9); const opp = l*b; const pct = p([25,50,75]); return { q: `Een rechthoekig speelveld is ${l} m lang en ${b} m breed. ${pct}% van het veld is gras. Hoeveel vierkante meter is gras?`, a: opp*pct/100, unit: 'vierkante meter' } },
  () => { const wk = r(3,8), dp = r(3,9); return { q: `${wk} werkers bouwen een muur in ${dp*wk} dagen. Hoeveel dagen doen ${dp} werkers erover?`, a: wk, unit: 'dagen' } },
  () => { const sp1 = p([60,80,100]); const sp2 = p([40,60,80]); const t = r(2,5); return { q: `Twee auto\'s rijden naar elkaar toe. Eén rijdt ${sp1} km/u, de ander ${sp2} km/u. Na ${t} uur ontmoeten ze elkaar. Hoe ver lagen ze uit elkaar?`, a: (sp1+sp2)*t, unit: 'kilometer' } },
  () => { const pp = p([60,80,100,120]); return { q: `Een kledingstuk kost €${pp}. De prijs stijgt met 15%. Daarna wordt de gestegen prijs met 10% verlaagd. Wat is de eindprijs?`, a: Math.round(pp*1.15*0.9), unit: 'euro' } },
  () => { const n = r(4,9); const t = r(3,7); return { q: `${n} vrienden verdelen een rekening van €${n*t} gelijk. Hoeveel betaalt iedereen?`, a: t, unit: 'euro' } },
  () => { const km = p([120,150,180,240]); const sp = p([60,80,100]); const break_ = p([15,20,30]); if(km%sp!==0) return HARD[9](); return { q: `Een busrit duurt ${km/sp} uur en ${break_} minuten (inclusief een pauze van ${break_} minuten). De bus rijdt ${sp} km/u. Hoe lang is de route?`, a: km, unit: 'kilometer' } },
]

export function getQuestions(difficulty, count = 3) {
  const pool = difficulty === 'makkelijk' ? EASY : difficulty === 'gemiddeld' ? MEDIUM : HARD
  const used = new Set()
  const result = []
  let attempts = 0
  while (result.length < count && attempts < 60) {
    attempts++
    const idx = Math.floor(Math.random() * pool.length)
    if (used.has(idx)) continue
    used.add(idx)
    try {
      const q = pool[idx]()
      if (q) result.push(q)
    } catch {}
  }
  return result
}
