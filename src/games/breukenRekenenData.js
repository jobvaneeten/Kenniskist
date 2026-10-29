// Breuken rekenen: kale sommen met breuken, in drie niveaus.
//
//   plus en min   1 gelijknamig (2/5 + 1/5)
//                 2 één breuk omrekenen (1/2 + 1/4: de halven worden kwarten)
//                 3 allebei omrekenen (1/3 + 1/4: allebei naar twaalfden)
//   keer en delen 1 heel getal × breuk (3 × 2/5) en gelijknamig delen (6/8 : 2/8)
//                 2 heel getal × gemengd getal (3 × 2 1/4) en delen waarbij je
//                   één breuk omrekent (3/4 : 1/8)
//                 3 breuk × breuk (2/3 × 3/4) en delen waarbij je allebei
//                   omrekent (2/3 : 1/4)
//
// Elke som heeft een antwoord als breuk { t, n } (n = 1 bij een heel getal) en
// een uitleg in stappen.

const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const pick = (a) => a[Math.floor(Math.random() * a.length)]
export const ggd = (a, b) => (b ? ggd(b, a % b) : Math.abs(a))
const kgv = (a, b) => (a * b) / ggd(a, b)

export const klein = ({ t, n }) => { const g = ggd(t, n) || 1; return { t: t / g, n: n / g } }
// 7/4 → "1 3/4", 8/4 → "2", 3/4 → "3/4"
export function tekst(b) {
  const { t, n } = klein(b), heel = Math.floor(t / n), rest = t % n
  if (!rest) return String(heel)
  return heel ? `${heel} ${rest}/${n}` : `${rest}/${n}`
}
const br = (t, n) => `${t}/${n}`

// ── plus en min ──
function plusMin(niveau, op) {
  for (let poging = 0; poging < 200; poging++) {
    let a, n, b, m
    if (niveau === 1) {
      n = pick([3, 4, 5, 6, 8, 10, 12]); m = n
      if (op === '+') { a = rnd(1, n - 2); b = rnd(1, n - 1 - a) } else { a = rnd(2, n - 1); b = rnd(1, a - 1) }
    } else if (niveau === 2) {
      const klein_ = pick([2, 3, 4, 5, 6]), k = pick([2, 3, 4]), groot = klein_ * k
      if (groot > 16) continue
      const x = rnd(1, klein_ - 1), y = rnd(1, groot - 1)
      if (y % k === 0 || ggd(x, klein_) !== 1 || ggd(y, groot) !== 1) continue   // anders reken je niets om
      ;[a, n, b, m] = Math.random() < 0.5 ? [x, klein_, y, groot] : [y, groot, x, klein_]
    } else {
      n = pick([2, 3, 4, 5, 6, 8]); m = pick([3, 4, 5, 6, 10])
      const L = kgv(n, m)
      if (n === m || L === n || L === m || L > 24) continue
      a = rnd(1, n - 1); b = rnd(1, m - 1)
      if (ggd(a, n) !== 1 || ggd(b, m) !== 1) continue
    }
    const L = kgv(n, m), A = a * (L / n), B = b * (L / m)
    if (op === '+' ? A + B >= L : A <= B) continue      // plus onder de 1, min boven de 0
    const uitkomst = { t: op === '+' ? A + B : A - B, n: L }
    const stappen = []
    if (n !== m) {
      stappen.push(`Maak de noemers gelijk: ${L}${L === n || L === m ? '' : ` (dat past bij ${n} én ${m})`}.`)
      if (n !== L) stappen.push(`${br(a, n)} = ${br(A, L)} (teller en noemer × ${L / n}).`)
      if (m !== L) stappen.push(`${br(b, m)} = ${br(B, L)} (teller en noemer × ${L / m}).`)
    }
    stappen.push(`${br(A, L)} ${op === '+' ? '+' : '−'} ${br(B, L)} = ${br(uitkomst.t, L)}${tekst(uitkomst) !== br(uitkomst.t, L) ? ` = ${tekst(uitkomst)}` : ''}.`)
    return { links: { t: a, n }, rechts: { t: b, n: m }, op: op === '+' ? '+' : '−', uitkomst, stappen }
  }
  return { links: { t: 1, n: 4 }, rechts: { t: 2, n: 4 }, op: '+', uitkomst: { t: 3, n: 4 }, stappen: ['1/4 + 2/4 = 3/4.'] }
}

// ── keer ──
function keer(niveau) {
  if (niveau === 1) {
    const n = pick([3, 4, 5, 6, 8, 10]), a = rnd(1, n - 1), h = rnd(2, 6), u = { t: h * a, n }
    if (ggd(a, n) !== 1) return keer(niveau)
    return { links: { heel: h }, rechts: { t: a, n }, op: '×', uitkomst: u,
             stappen: [`${h} × ${br(a, n)} = ${br(h * a, n)} (alleen de teller keer ${h}).`, ...(tekst(u) !== br(h * a, n) ? [`${br(h * a, n)} = ${tekst(u)}.`] : [])] }
  }
  if (niveau === 2) {
    const n = pick([3, 4, 5, 6, 8, 10]), a = rnd(1, n - 1), g = rnd(1, 3), h = rnd(2, 5)
    const u = { t: h * (g * n + a), n }
    if (ggd(a, n) !== 1) return keer(niveau)
    return { links: { heel: h }, rechts: { heel: g, t: a, n }, op: '×', uitkomst: u,
             stappen: [`${h} × ${g} = ${h * g}.`, `${h} × ${br(a, n)} = ${br(h * a, n)}${h * a >= n ? ` = ${tekst({ t: h * a, n })}` : ''}.`, `Samen: ${h * g} + ${tekst({ t: h * a, n })} = ${tekst(u)}.`] }
  }
  const n = rnd(2, 6), m = rnd(2, 6), a = rnd(1, n - 1), b = rnd(1, m - 1), u = { t: a * b, n: n * m }
  if (ggd(a, n) !== 1 || ggd(b, m) !== 1) return keer(niveau)
  return { links: { t: a, n }, rechts: { t: b, n: m }, op: '×', uitkomst: u,
           stappen: [`Teller × teller en noemer × noemer: ${a} × ${b} = ${a * b} en ${n} × ${m} = ${n * m}.`, `${br(a * b, n * m)}${tekst(u) !== br(a * b, n * m) ? ` = ${tekst(u)}` : ''}.`] }
}

// ── delen: hoe vaak past de tweede breuk in de eerste? ──
function delen(niveau) {
  for (let poging = 0; poging < 200; poging++) {
    let a, n, b, m
    if (niveau === 1) {
      n = pick([4, 5, 6, 8, 10, 12]); m = n; b = rnd(1, Math.floor(n / 3)); const q = rnd(2, Math.floor((n - 1) / b)); a = b * q
      if (q < 2 || a >= n) continue
    } else if (niveau === 2) {
      n = pick([2, 3, 4, 5]); const k = pick([2, 3, 4]); m = n * k
      if (m > 16) continue
      a = rnd(1, n - 1); b = rnd(1, m - 1)
      if (ggd(a, n) !== 1 || ggd(b, m) !== 1 || b % k === 0 || (a * k) % b !== 0 || a * k === b) continue
    } else {
      n = pick([2, 3, 4, 5, 6]); m = pick([2, 3, 4, 5, 6, 8])
      const L = kgv(n, m)
      if (n === m || L === n || L === m || L > 24) continue
      a = rnd(1, n - 1); b = rnd(1, m - 1)
      if (ggd(a, n) !== 1 || ggd(b, m) !== 1 || a * m <= b * n) continue   // het antwoord is meer dan 1
    }
    const L = kgv(n, m), A = a * (L / n), B = b * (L / m), u = { t: A, n: B }
    const stappen = []
    if (n !== m) {
      stappen.push(`Maak de noemers gelijk: ${L}.`)
      if (n !== L) stappen.push(`${br(a, n)} = ${br(A, L)}.`)
      if (m !== L) stappen.push(`${br(b, m)} = ${br(B, L)}.`)
    }
    stappen.push(`Hoe vaak past ${br(B, L)} in ${br(A, L)}? ${A} : ${B} = ${tekst(u)}.`)
    return { links: { t: a, n }, rechts: { t: b, n: m }, op: ':', uitkomst: u, stappen }
  }
  return { links: { t: 6, n: 8 }, rechts: { t: 2, n: 8 }, op: ':', uitkomst: { t: 3, n: 1 }, stappen: ['6 : 2 = 3.'] }
}

// soort: 'plusmin' of 'keerdelen'; ops: de bewerkingen die aanstaan
export function maakSom(soort, niveau, ops) {
  const op = pick(ops)
  if (soort === 'plusmin') return plusMin(niveau, op)
  return op === '×' ? keer(niveau) : delen(niveau)
}

// Klopt het ingevulde antwoord? Heel, teller en noemer mogen leeg zijn
// ("3" of "3/4" of "1 1/2"); elke breuk met dezelfde waarde is goed.
export function klopt({ heel, teller, noemer }, uitkomst) {
  const h = heel === '' ? 0 : Number(heel), t = teller === '' ? 0 : Number(teller), n = noemer === '' ? 1 : Number(noemer)
  if (!n || (teller === '' && heel === '')) return false
  return (h * n + t) * uitkomst.n === uitkomst.t * n
}
export const isZoKleinMogelijk = ({ teller, noemer }) => teller === '' || noemer === '' || ggd(Number(teller), Number(noemer)) === 1
