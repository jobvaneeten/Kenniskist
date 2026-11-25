// Bouwt de lessen begrijpend lezen (public/begrijpend-lezen/<thema>-lesN.html)
// uit de databestanden in scripts/begrijpend/<thema>/lesN.mjs, met
// sjabloon.html als opmaak (vraagsoorten, voorlezen, beloning). Elk bestand
// heeft een vragenset voor groep 7 en een moeilijkere voor groep 8; de les
// krijgt ?groep=7 of ?groep=8 mee.
//
// De teksten zijn eigen werk: geschreven bij de onderwerpen, niet overgenomen
// uit een methode. De plaatjes maak je met maak-plaatjes.mjs.
//
//   node scripts/begrijpend/maak-begrijpend.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const hier = path.dirname(fileURLToPath(import.meta.url))
const MAP = path.join(hier, '../../public/begrijpend-lezen')
const sjabloon = fs.readFileSync(path.join(hier, 'sjabloon.html'), 'utf8').replace(/\r\n/g, '\n')

export const THEMAS = [
  { id: 'families', naam: 'Strijd om vrijheid', aantal: 6 },
  { id: 'spullen', naam: 'Van grondstof tot product', aantal: 5 },
]

// overslaan: lessen die nog niet geschreven zijn overslaan (voor de plaatjes)
export async function laadLessen(thema, overslaan = false) {
  const lessen = []
  for (let n = 1; n <= thema.aantal; n++) {
    if (overslaan && !fs.existsSync(path.join(hier, thema.id, `les${n}.mjs`))) continue
    lessen.push((await import(pathToFileURL(path.join(hier, thema.id, `les${n}.mjs`)).href)).default)
  }
  return lessen
}

const LABEL = {
  mark: ['Letterlijk', 'label-literal', 'literal'],
  afleiden: ['Afleidend', 'label-inferring', 'inferring'],
  beoordelen: ['Evaluerend', 'label-evaluating', 'evaluating'],
}
const woorden = (s) => s.split(/\s+/).filter(Boolean)
const kaal = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

const plaatjeBestaat = (thema, naam) => fs.existsSync(path.join(MAP, thema.id, `${naam}.webp`))
const ontbreekt = new Set()

function bouwVraag(thema, v, q, waar) {
  const basis = { question: q.vraag, passage: v.passage, feedback: q.feedback }
  if (v.img && plaatjeBestaat(thema, v.img)) Object.assign(basis, { img: `${thema.id}/${v.img}.webp`, bijschrift: v.bijschrift || '' })
  else if (v.img) ontbreekt.add(`${thema.id}/${v.img}`)
  if (q.type === 'mark') {
    const plek = v.passage.indexOf(q.antwoord)
    if (plek < 0) throw new Error(`${waar}: antwoord staat niet letterlijk in de tekst`)
    if (plek > 0 && !/\s/.test(v.passage[plek - 1])) throw new Error(`${waar}: antwoord begint midden in een woord`)
    const start = woorden(v.passage.slice(0, plek)).length
    const n = woorden(q.antwoord).length, eind = start + n - 1
    const span = woorden(v.passage).slice(start, eind + 1)
    if (span.join(' ') !== woorden(q.antwoord).join(' ')) throw new Error(`${waar}: antwoord valt niet op woordgrenzen`)
    const kern = q.kern.map(k => {
      const i = span.findIndex(w => kaal(w) === kaal(k))
      if (i < 0) throw new Error(`${waar}: kernwoord "${k}" niet in het antwoord`)
      return start + i
    })
    const [label, labelClass, qtype] = LABEL.mark
    return { type: 'mark', qtype, label, labelClass, ...basis, correctSpan: { start, end: eind }, coreWords: kern, points: 2 }
  }
  if (q.type === 'mc') {
    if (!LABEL[q.soort]) throw new Error(`${waar}: soort moet afleiden of beoordelen zijn`)
    const [label, labelClass, qtype] = LABEL[q.soort]
    if (!(q.goed >= 0 && q.goed < q.opties.length)) throw new Error(`${waar}: goed valt buiten de opties`)
    return { type: 'mc', qtype, label, labelClass, ...basis, options: q.opties, correct: q.goed, points: 1 }
  }
  if (q.type === 'order') {
    const items = q.items.map((t, i) => ({ id: `o${i}`, text: t }))
    return { type: 'order', qtype: 'inferring', label: 'Afleidend – Volgorde', labelClass: 'label-inferring', ...basis,
      items, correctOrder: items.map(x => x.id), points: 2 }
  }
  if (q.type === 'drag') {
    for (const [, c] of q.items) if (!q.cats.includes(c)) throw new Error(`${waar}: onbekende groep ${c}`)
    return { type: 'drag', qtype: 'inferring', label: 'Afleidend – Sorteren', labelClass: 'label-inferring', ...basis,
      categories: q.cats, items: q.items.map(([text, correct], i) => ({ id: `i${i}`, text, correct })), points: 2 }
  }
  throw new Error(`${waar}: onbekend type ${q.type}`)
}

function vervang(s, oud, nieuw) {
  if (!s.includes(oud)) throw new Error(`sjabloon mist: ${oud.slice(0, 60)}`)
  return s.split(oud).join(nieuw)
}

function bouwLes(thema, les) {
  const id = `${thema.id}-les${les.nr}`
  const sets = { 7: [], 8: [] }
  les.vragen.forEach((v, i) => {
    for (const g of [7, 8]) sets[g].push(bouwVraag(thema, v, v[`g${g}`], `${id} vraag ${i + 1} groep ${g}`))
  })
  const omslag = plaatjeBestaat(thema, les.cover) ? `<img class="bl-cover" src="${thema.id}/${les.cover}.webp" alt="">` : ''
  if (!omslag) ontbreekt.add(`${thema.id}/${les.cover}`)

  let h = sjabloon
  h = h.replace(/<title>[^<]*<\/title>/, `<title>Begrijpend lezen – ${les.titel}</title>`)
  h = vervang(h, '<p class="eyebrow">Begrijpend lezen · Groep 7 · Les 1</p>', '<p class="eyebrow" id="bl-eyebrow">Begrijpend lezen</p>')
  h = vervang(h, '<h1>Coole constructies</h1>', `<h1>${les.titel}</h1>`)
  h = vervang(h, '<p>Thema: Duurzaam design</p>', `<p>Thema: ${thema.naam}</p>`)
  h = vervang(h, '<div class="compass">🏗️</div>', omslag)
  h = vervang(h, '<h2>Klaar om te bouwen?</h2>', '<h2>Klaar om te lezen?</h2>')
  h = h.replace(/<p>Je leest teksten over constructies[^<]*<strong>letterlijke vragen<\/strong>[^]*?<\/p>/,
    `<p>${les.intro} Je beantwoordt tien vragen. Bij <strong>letterlijke vragen</strong> markeer je het antwoord <em>in de tekst zelf</em>. Klik woorden aan om ze te selecteren.</p>`)
  h = vervang(h, '<h2>Goed gedaan, bouwmeester!</h2>', `<h2>${les.klaar}</h2>`)
  h = vervang(h, '🔍 Letterlijk – markeer in de tekst', 'Letterlijk – markeer in de tekst')
  h = vervang(h, '💡 Afleidend</span>', 'Afleidend</span>')
  h = vervang(h, '💬 Evaluerend</span>', 'Evaluerend</span>')

  // Vragen: twee sets, de groep komt uit de URL (?groep=7 of 8).
  const begin = h.indexOf('const questions = [')
  const eind = h.indexOf('];', begin) + 2
  if (begin < 0 || eind < 2) throw new Error('vragenblok niet gevonden in sjabloon')
  const data = `const VRAGEN = ${JSON.stringify(sets, null, 1)};
const GROEP = (function () {
  try { const g = new URLSearchParams(location.search).get('groep'); if (g === '7' || g === '8') return g; } catch (e) {}
  return '7';
})();
const questions = VRAGEN[GROEP];
const SLEUTEL = 'bl_${id}_g' + GROEP;
document.getElementById('bl-eyebrow').textContent = 'Begrijpend lezen · Groep ' + GROEP;`
  h = h.slice(0, begin) + data + h.slice(eind)

  h = vervang(h, "'bl_spullen_les1_paid'", "SLEUTEL + '_paid'")
  h = vervang(h, "'bl_spullen_les1'", 'SLEUTEL')
  h = vervang(h, "slaResultaatOp?.('spullen-les1', score, total, { opgaven })", `slaResultaatOp?.('${id}', score, total, { opgaven, groep: +GROEP })`)

  // Plaatje bij de tekst, en de tekst ook tonen bij een volgordevraag.
  h = vervang(h, '  if      (q.type === \'mark\')  html += renderMark(q);',
    "  if (q.img) html += `<figure class=\"bl-fig\"><img src=\"${q.img}\" alt=\"\"><figcaption>${q.bijschrift || ''}</figcaption></figure>`;\n  if      (q.type === 'mark')  html += renderMark(q);")
  h = vervang(h, "  const shuffled = [...q.items].sort(() => Math.random() - .5);\n  let html = '<div class=\"order-list\" id=\"order-list\">';",
    "  const shuffled = [...q.items].sort(() => Math.random() - .5);\n  let html = q.passage ? `<div class=\"passage\">${q.passage}</div>` : '';\n  html += '<div class=\"order-list\" id=\"order-list\">';")
  h = vervang(h, '<div class="q-card${q.type === \'mc\' && q.passage ? \' q-breed\' : \'\'}">',
    '<div class="q-card${(q.type === \'mc\' || q.type === \'order\') && q.passage ? \' q-breed\' : \'\'}">')
  h = vervang(h, '</style>\n<style>.order-item', `  .bl-fig { margin:0 0 14px; }
  .bl-fig img { display:block; max-width:100%; max-height:300px; border-radius:12px; margin:0 auto; box-shadow:0 8px 24px -10px rgba(0,0,0,.6); }
  .bl-fig figcaption { font-size:.85rem; color:var(--ink-soft); text-align:center; margin-top:6px; font-style:italic; }
  .bl-cover { display:block; width:min(360px,100%); aspect-ratio:4/3; object-fit:cover; margin:0 auto 14px; border-radius:16px; box-shadow:0 10px 28px -12px rgba(0,0,0,.7); }
  @media(min-width:1000px){ .q-breed > .bl-fig { grid-column:1; } }
</style>
<style>.order-item`)

  const rest = h.match(/.{0,60}(bl_spullen_les1|Coole constructies|bouwmeester|Duurzaam design).{0,60}/i)
  if (rest) throw new Error(`${id}: sjabloontekst blijft staan: ${rest[0]}`)
  fs.writeFileSync(path.join(MAP, `${id}.html`), h)
  console.log(`${id}.html`, les.titel, sets[7].length, sets[8].length)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const alleen = process.argv[2]   // optioneel: alleen één thema, bv. "families"
  for (const thema of THEMAS) {
    if (alleen && thema.id !== alleen) continue
    for (const les of await laadLessen(thema)) {
      if (les.vragen.length !== 10) throw new Error(`${thema.id} les ${les.nr}: ${les.vragen.length} teksten, verwacht 10`)
      bouwLes(thema, les)
    }
  }
  if (ontbreekt.size) console.warn(`\n${ontbreekt.size} plaatjes ontbreken nog (die blijven weg tot je maak-plaatjes.mjs draait en opnieuw bouwt):\n  ` + [...ontbreekt].join('\n  '))
}
