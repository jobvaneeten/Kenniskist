// Bouwt public/begrijpend-lezen/families-les1..6.html uit families-data.mjs,
// met spullen-les1.html als sjabloon (zelfde opmaak, vraagsoorten, beloning).
// Eén bestand per les met twee vragensets; ?groep=7 of ?groep=8 kiest.
//
//   node scripts/begrijpend/maak-families.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { LESSEN } from './families-data.mjs'

const hier = path.dirname(fileURLToPath(import.meta.url))
const MAP = path.join(hier, '../../public/begrijpend-lezen')
const sjabloon = fs.readFileSync(path.join(MAP, 'spullen-les1.html'), 'utf8').replace(/\r\n/g, '\n')

const LABEL = {
  mark: ['🔍 Letterlijk', 'label-literal', 'literal'],
  afleiden: ['💡 Afleidend', 'label-inferring', 'inferring'],
  beoordelen: ['💬 Evaluerend', 'label-evaluating', 'evaluating'],
}
const woorden = (s) => s.split(/\s+/).filter(Boolean)
const kaal = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

function bouwVraag(v, g, waar) {
  const q = g
  const basis = { question: q.vraag, passage: v.passage, feedback: q.feedback }
  if (v.img) Object.assign(basis, { img: `families/${v.img}.jpg`, bijschrift: v.bijschrift || '' })
  if (q.type === 'mark') {
    const plek = v.passage.indexOf(q.antwoord)
    if (plek < 0) throw new Error(`${waar}: antwoord staat niet letterlijk in de tekst`)
    const start = woorden(v.passage.slice(0, plek)).length
    // Het antwoord moet op woordgrenzen beginnen en eindigen.
    if (plek > 0 && !/\s/.test(v.passage[plek - 1])) throw new Error(`${waar}: antwoord begint midden in een woord`)
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
    const [label, labelClass, qtype] = LABEL[q.soort]
    if (!(q.goed >= 0 && q.goed < q.opties.length)) throw new Error(`${waar}: goed valt buiten de opties`)
    return { type: 'mc', qtype, label, labelClass, ...basis, options: q.opties, correct: q.goed, points: 1 }
  }
  if (q.type === 'order') {
    const items = q.items.map((t, i) => ({ id: `o${i}`, text: t }))
    return { type: 'order', qtype: 'inferring', label: '💡 Afleidend – Volgorde', labelClass: 'label-inferring', ...basis,
      items, correctOrder: items.map(x => x.id), points: 2 }
  }
  if (q.type === 'drag') {
    for (const [, c] of q.items) if (!q.cats.includes(c)) throw new Error(`${waar}: onbekende groep ${c}`)
    return { type: 'drag', qtype: 'inferring', label: '💡 Afleidend – Sorteren', labelClass: 'label-inferring', ...basis,
      categories: q.cats, items: q.items.map(([text, correct], i) => ({ id: `i${i}`, text, correct })), points: 2 }
  }
  throw new Error(`${waar}: onbekend type ${q.type}`)
}

function vervang(s, oud, nieuw) {
  if (!s.includes(oud)) throw new Error(`sjabloon mist: ${oud.slice(0, 60)}`)
  return s.split(oud).join(nieuw)
}

for (const les of LESSEN) {
  const id = `families-les${les.nr}`
  const sets = { 7: [], 8: [] }
  les.vragen.forEach((v, i) => {
    for (const g of [7, 8]) sets[g].push(bouwVraag(v, v[`g${g}`], `les ${les.nr} vraag ${i + 1} groep ${g}`))
  })
  for (const g of [7, 8]) {
    if (!fs.existsSync(path.join(MAP, `families/${les.cover}.jpg`))) throw new Error(`les ${les.nr}: cover ontbreekt`)
    for (const v of les.vragen) if (v.img && !fs.existsSync(path.join(MAP, `families/${v.img}.jpg`))) throw new Error(`plaatje ${v.img} ontbreekt`)
  }

  let h = sjabloon
  h = h.replace(/<title>[^<]*<\/title>/, `<title>Begrijpend Lezen – ${les.titel}</title>`)
  h = vervang(h, '<p class="eyebrow">Begrijpend lezen · Groep 7 · Les 1</p>', `<p class="eyebrow" id="bl-eyebrow">Begrijpend lezen · Les ${les.nr}</p>`)
  h = vervang(h, '<h1>Coole constructies</h1>', `<h1>${les.titel}</h1>`)
  h = vervang(h, '<p>Thema: Duurzaam design</p>', '<p>Thema: Fantastische families</p>')
  h = vervang(h, '<div class="compass">🏗️</div>', `<div class="compass">${les.emoji}</div>\n  <img class="bl-cover" src="families/${les.cover}.jpg" alt="">`)
  h = vervang(h, '<h2>Klaar om te bouwen?</h2>', '<h2>Klaar om te lezen?</h2>')
  h = h.replace(/<p>Je leest teksten over constructies[^<]*<strong>letterlijke vragen<\/strong>[^]*?<\/p>/,
    `<p>${les.intro} Je beantwoordt tien vragen. Bij <strong>letterlijke vragen</strong> markeer je het antwoord <em>in de tekst zelf</em>. Klik woorden aan om ze te selecteren.</p>`)
  h = vervang(h, '<h2>Goed gedaan, bouwmeester!</h2>', `<h2>${les.klaar}</h2>`)

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
document.getElementById('bl-eyebrow').textContent = 'Begrijpend lezen · Groep ' + GROEP + ' · Les ${les.nr}';`
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
  .bl-cover { display:block; max-width:min(320px,100%); max-height:220px; margin:0 auto 14px; border-radius:14px; box-shadow:0 10px 28px -12px rgba(0,0,0,.7); }
  @media(min-width:1000px){ .q-breed > .bl-fig { grid-column:1; } }
</style>
<style>.order-item`)

  if (/spullen-les|bl_spullen|constructie|bouwmeester/i.test(h)) {
    const rest = h.match(/.{0,60}(spullen-les|bl_spullen|constructie|bouwmeester).{0,60}/i)
    throw new Error(`les ${les.nr}: sjabloontekst blijft staan: ${rest && rest[0]}`)
  }
  fs.writeFileSync(path.join(MAP, `${id}.html`), h)
  console.log(`${id}.html`, sets[7].length, sets[8].length)
}
