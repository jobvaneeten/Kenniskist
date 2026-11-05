// Zet handleiding.md om naar één los HTML-bestand met de plaatjes erin
// (base64), zodat je hem kunt openen, mailen of printen zonder de map erbij.
// Daarna maakt maak-pdf.mjs er een pdf van.
// Gebruik: node docs/handleiding/maak-html.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MAP = dirname(fileURLToPath(import.meta.url))
const md = readFileSync(join(MAP, 'handleiding.md'), 'utf8')
const LOGO = readFileSync(join(MAP, '../../public/logo-rond.png')).toString('base64')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const slug = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[*`]/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-')
let figNr = 0
function inline(s) {
  return esc(s)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
      const data = readFileSync(join(MAP, src)).toString('base64')
      const hoog = /(15-klas-instellingen|21-weektaak|28-weektaak|25-nieuwe|27-oefening|41-doel|31-nieuwe|23-leerling|102-mijn|111-rekenen)/.test(src) ? ' hoog' : ''
      figNr++
      return `<figure class="fig${hoog}"><div class="venster"><div class="balk"><i></i><i></i><i></i><span>${alt}</span></div><img src="data:image/jpeg;base64,${data}" alt="${alt}"></div><figcaption><b>Afbeelding ${figNr}</b> ${alt}</figcaption></figure>`
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

// kleur per hoofdstuk: algemeen, ICT'er, leerkracht en leerling
const KLEUR = { 1: 'paars', 2: 'paars', 3: 'paars', 4: 'cyaan', 5: 'blauw', 6: 'blauw', 7: 'blauw', 8: 'goud', 9: 'blauw', 10: 'groen', 11: 'blauw', 12: 'roze', 13: 'roze', 14: 'goud', 15: 'roze', 16: 'cyaan', 17: 'paars', 18: 'roze' }
const ROL = { 4: "ICT'er", 5: 'Leerkracht', 6: 'Leerkracht', 7: 'Leerkracht', 8: 'Leerkracht', 9: 'Leerkracht', 10: 'Leerkracht', 11: 'Leerkracht', 12: 'Leerling', 13: 'Leerling', 14: 'Leerling', 15: 'Leerling', 16: 'Leerling' }

const regels = md.split(/\r?\n/), uit = []
// filmpjes staan in public/handleiding/videos (zie video/maak-videos.mjs)
const SITE = 'https://kenniskist.nl', VIDEOS = join(MAP, '../../public/handleiding/videos')
const DUUR = {}
for (const f of readdirSync(VIDEOS).filter(f => f.endsWith('.mp4'))) {
  try { DUUR[f.slice(0, -4)] = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(VIDEOS, f)]).toString() } catch {}
}
let i = 0, inHoofdstuk = false, inhoud = []
// voorpagina: alles tot de eerste ---
const voor = []
while (i < regels.length && !regels[i].startsWith('---')) { voor.push(regels[i]); i++ }
const titel = (voor.find(r => r.startsWith('# ')) || '# Handleiding').slice(2)
const onder = (voor.find(r => r.startsWith('**')) || '').replace(/\*\*/g, '')
const noot = voor.filter(r => r.trim() && !r.startsWith('#') && !r.startsWith('**')).join(' ')

while (i < regels.length) {
  const r = regels[i]
  if (!r.trim() || r.startsWith('---')) { i++; continue }
  const h = r.match(/^(#{2,4}) (.*)$/)
  if (h && h[1] === '##' && h[2] === 'Inhoud') {
    // de inhoudsopgave wordt een raster van kaarten
    i++
    while (i < regels.length && !regels[i].startsWith('---')) {
      const m = regels[i].match(/^\d+\. \[([^\]]+)\]\(#([^)]+)\)/)
      if (m) inhoud.push({ titel: m[1], id: m[2] })
      i++
    }
    uit.push(`<section class="inhoud"><h2 class="kop-inhoud">Inhoud</h2><div class="inhoud-raster">${inhoud.map((x, n) => `<a class="inhoud-kaart ${KLEUR[n + 1]}" href="#${x.id}"><span class="nr">${n + 1}</span><span class="t">${inline(x.titel)}</span>${ROL[n + 1] ? `<span class="rol">${ROL[n + 1]}</span>` : ''}</a>`).join('')}</div></section>`)
    continue
  }
  if (h) {
    const n = h[1].length
    if (n === 2) {
      const m = h[2].match(/^(\d+)\. (.*)$/), nr = m ? +m[1] : 0
      if (inHoofdstuk) uit.push('</section>')
      inHoofdstuk = true
      uit.push(`<section class="hoofdstuk ${KLEUR[nr] || 'paars'}"><header class="hs-kop" id="${slug(h[2])}"><span class="hs-nr">${nr || ''}</span><div><span class="hs-rol">${ROL[nr] ? 'Voor de ' + ROL[nr].toLowerCase() : 'Kenniskist'}</span><h2>${inline(m ? m[2] : h[2])}</h2></div></header>`)
    } else uit.push(`<h${n} id="${slug(h[2])}">${inline(h[2])}</h${n}>`)
    i++; continue
  }
  if (r.startsWith('|')) {
    const rijen = []
    while (i < regels.length && regels[i].startsWith('|')) { rijen.push(regels[i]); i++ }
    const cel = (x) => x.slice(1, -1).split('|').map(c => c.trim())
    const kop = cel(rijen[0]), lijf = rijen.slice(2).map(cel)
    uit.push(`<table><thead><tr>${kop.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${lijf.map(rij => `<tr>${rij.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`)
    continue
  }
  if (r.startsWith('> ')) {
    const blok = []
    while (i < regels.length && regels[i].startsWith('> ')) { blok.push(regels[i].slice(2)); i++ }
    let tekst = blok.join(' '), label = 'Tip'
    const m = tekst.match(/^\*\*([^*:]+):\*\*\s*/)
    if (m) { label = m[1]; tekst = tekst.slice(m[0].length) }
    uit.push(`<aside class="tip"><span class="tip-label">${esc(label)}</span><p>${inline(tekst)}</p></aside>`)
    continue
  }
  if (/^(\d+\.|-) /.test(r)) {
    const geordend = /^\d+\./.test(r), items = []
    while (i < regels.length && /^(\d+\.|-) /.test(regels[i])) { items.push(regels[i].replace(/^(\d+\.|-) /, '')); i++ }
    const t = geordend ? 'ol' : 'ul'
    uit.push(`<${t} class="${geordend ? 'stappen' : 'lijst'}">${items.map(x => `<li>${inline(x)}</li>`).join('')}</${t}>`)
    continue
  }
  if (r.startsWith('![')) { uit.push(inline(r)); i++; continue }
  // @film naam | titel | korte uitleg  →  een filmpje (in de pdf: plaatje met link naar de site)
  if (r.startsWith('@film ')) {
    const films = []
    while (i < regels.length && regels[i].startsWith('@film ')) { films.push(regels[i].slice(6).split('|').map(x => x.trim())); i++ }
    uit.push(`<div class="films">${films.map(([naam, t, uitleg]) => {
      const nr = naam.split('-')[0], duur = DUUR[naam] ? ` · ${Math.floor(DUUR[naam] / 60)}:${String(Math.round(DUUR[naam] % 60)).padStart(2, '0')}` : ''
      return `<figure class="film" id="film-${nr}"><video controls preload="none" playsinline poster="videos/${naam}.jpg"><source src="videos/${naam}.mp4" type="video/mp4"><track kind="subtitles" srclang="nl" label="Nederlands" src="videos/${naam}.vtt"></video>`
        + `<a class="film-print" href="${SITE}/handleiding/handleiding#film-${nr}"><img src="data:image/jpeg;base64,${readFileSync(join(VIDEOS, naam + '.jpg')).toString('base64')}" alt=""><span>▶ Bekijk online</span></a>`
        + `<figcaption><b>${nr}. ${esc(t)}</b><span class="duur">${duur}</span><br>${esc(uitleg || '')}</figcaption></figure>`
    }).join('')}</div>`)
    continue
  }
  // vraag-en-antwoord bij de veelgestelde vragen: een losse vetgedrukte regel
  if (/^\*\*[^*]+\*\*$/.test(r.trim())) { uit.push(`<h4 class="vraag">${inline(r.trim().slice(2, -2))}</h4>`); i++; continue }
  const alinea = []
  while (i < regels.length && regels[i].trim() && !/^(#|\||> |---|!\[|(\d+\.|-) )/.test(regels[i])) { alinea.push(regels[i]); i++ }
  uit.push(`<p>${inline(alinea.join(' '))}</p>`)
}
if (inHoofdstuk) uit.push('</section>')

const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --inkt: #1c1a3a; --zacht: #5b5880; --lijn: #e6e3f5; --vlak: #f7f6fd; --nacht: #0d0a26;
    --paars: #7b3cff; --cyaan: #08a9c8; --blauw: #3b6bff; --goud: #e0a100; --groen: #12a067; --roze: #e8308f;
  }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; background: #eeedf7; color: var(--inkt); font: 16px/1.65 Nunito, "Segoe UI", system-ui, sans-serif; }
  .blad { max-width: 980px; margin: 0 auto; background: #fff; box-shadow: 0 0 60px rgba(30, 20, 90, .12); }
  h2, h3, h4, .hs-nr, .nr { font-family: "Baloo 2", Nunito, sans-serif; }
  a { color: var(--paars); text-decoration: none; border-bottom: 1px solid rgba(123, 60, 255, .3); }
  strong { color: #2a1c6e; }
  code { font-family: Consolas, monospace; background: #f0ecff; color: #5a23d6; border-radius: 6px; padding: 1px 7px; font-size: .9em; font-weight: 700; }

  /* ── voorpagina ── */
  .voorpagina { position: relative; overflow: hidden; min-height: 1100px; padding: 90px 70px 70px; color: #fff; display: flex; flex-direction: column;
    background: radial-gradient(900px 520px at 85% 8%, rgba(232, 48, 143, .38), transparent 60%), radial-gradient(800px 600px at 5% 95%, rgba(8, 169, 200, .35), transparent 60%), linear-gradient(160deg, #1d1450, var(--nacht) 70%); }
  .voorpagina::before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,.75) 1px, transparent 1.4px); background-size: 46px 46px; opacity: .18; }
  .voorpagina > * { position: relative; }
  .logo { width: 170px; height: 170px; border-radius: 50%; box-shadow: 0 0 0 6px rgba(255,255,255,.08), 0 0 70px rgba(123, 60, 255, .8); }
  .voorpagina .boventitel { margin-top: 60px; letter-spacing: .28em; text-transform: uppercase; font-weight: 800; font-size: 14px; color: #7df9ff; }
  .voorpagina h1 { font-family: "Baloo 2", sans-serif; font-size: 78px; line-height: .98; margin: 14px 0 18px; font-weight: 800;
    background: linear-gradient(90deg, #fff, #d9c6ff 60%, #7df9ff); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .voorpagina .sub { font-size: 22px; max-width: 30ch; color: #e9e4ff; margin: 0 0 40px; }
  .rollen { display: flex; gap: 14px; flex-wrap: wrap; }
  .rollen span { padding: 10px 20px; border-radius: 999px; font-weight: 800; border: 1.5px solid; backdrop-filter: blur(4px); }
  .rollen .r1 { color: #7df9ff; border-color: rgba(125, 249, 255, .6); background: rgba(8, 169, 200, .12); }
  .rollen .r2 { color: #a9bcff; border-color: rgba(120, 150, 255, .6); background: rgba(59, 107, 255, .14); }
  .rollen .r3 { color: #ff9bd0; border-color: rgba(255, 120, 190, .6); background: rgba(232, 48, 143, .14); }
  .films { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; margin: 18px 0 26px; }
  .film { margin: 0; border-radius: 14px; overflow: hidden; background: var(--vlak); border: 1px solid var(--lijn); }
  .film video { display: block; width: 100%; aspect-ratio: 16 / 10; background: var(--nacht); }
  .film figcaption { margin: 0; padding: 10px 14px 14px; font-size: 14px; }
  .film figcaption b { color: var(--inkt); }
  .film .duur { color: var(--zacht); font-weight: 700; }
  .film-print { display: none; }
  .knoppen { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 40px; }
  .knoppen .pdf-knop { margin-top: 0; }
  .pdf-knop.film-knop { background: rgba(255, 255, 255, .12); border: 1px solid rgba(255, 255, 255, .4); box-shadow: none; }
  .pdf-knop { align-self: flex-start; margin-top: 40px; padding: 12px 24px; border-radius: 999px; border: 0; background: linear-gradient(90deg, #7b3cff, #e8308f); color: #fff; font-weight: 800; box-shadow: 0 8px 30px rgba(123, 60, 255, .5); }
  .voorpagina .noot { margin-top: auto; max-width: 62ch; font-size: 14px; color: #b9b2e0; border-top: 1px solid rgba(255,255,255,.15); padding-top: 22px; }
  .voorpagina .datum { font-weight: 800; color: #fff; }

  /* ── inhoud ── */
  .inhoud { padding: 70px 70px 40px; }
  .kop-inhoud { font-size: 42px; margin: 0 0 24px; color: var(--paars); }
  .inhoud-raster { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .inhoud-kaart { --k: var(--paars); display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid var(--lijn); border-left: 5px solid var(--k); border-radius: 14px; background: var(--vlak); color: var(--inkt); font-weight: 800; }
  .inhoud-kaart .nr { flex: 0 0 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: var(--k); color: #fff; font-size: 19px; }
  .inhoud-kaart .t { flex: 1; }
  .inhoud-kaart .rol { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--k); }

  /* ── hoofdstukken ── */
  .hoofdstuk { --k: var(--paars); padding: 10px 70px 50px; }
  .cyaan { --k: var(--cyaan); } .blauw { --k: var(--blauw); } .goud { --k: var(--goud); } .groen { --k: var(--groen); } .roze { --k: var(--roze); } .paars { --k: var(--paars); }
  .hs-kop { display: flex; align-items: center; gap: 22px; margin: 50px -70px 26px; padding: 30px 70px; color: #fff;
    background: linear-gradient(120deg, var(--k), color-mix(in srgb, var(--k) 55%, #120c3a)); }
  .hs-nr { flex: 0 0 74px; height: 74px; border-radius: 22px; display: grid; place-items: center; font-size: 40px; font-weight: 800; background: rgba(255,255,255,.18); border: 2px solid rgba(255,255,255,.45); }
  .hs-rol { font-size: 12px; text-transform: uppercase; letter-spacing: .2em; font-weight: 800; opacity: .85; }
  .hs-kop h2 { margin: 0; font-size: 38px; line-height: 1.05; }
  h3 { font-size: 25px; margin: 36px 0 10px; color: var(--k); display: flex; align-items: center; gap: 10px; }
  h3::before { content: ""; width: 10px; height: 26px; border-radius: 4px; background: var(--k); }
  h4 { font-size: 19px; margin: 24px 0 6px; }
  h4.vraag { margin-top: 26px; color: #2a1c6e; }
  h4.vraag::before { content: "?"; display: inline-grid; place-items: center; width: 26px; height: 26px; margin-right: 10px; border-radius: 50%; background: var(--k); color: #fff; font-size: 16px; }
  p { margin: 0 0 14px; }
  ul.lijst { padding-left: 0; list-style: none; margin: 0 0 18px; }
  ul.lijst li { position: relative; padding-left: 28px; margin: 6px 0; }
  ul.lijst li::before { content: ""; position: absolute; left: 6px; top: .62em; width: 9px; height: 9px; border-radius: 3px; background: var(--k); transform: rotate(45deg); }
  ol.stappen { counter-reset: stap; list-style: none; padding: 0; margin: 0 0 18px; }
  ol.stappen li { counter-increment: stap; position: relative; padding: 10px 14px 10px 56px; margin: 8px 0; background: var(--vlak); border: 1px solid var(--lijn); border-radius: 12px; }
  ol.stappen li::before { content: counter(stap); position: absolute; left: 12px; top: 9px; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--k); color: #fff; font-weight: 800; font-family: "Baloo 2", sans-serif; }

  table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 16px 0 26px; font-size: 15px; border: 1px solid var(--lijn); border-radius: 14px; overflow: hidden; }
  th { text-align: left; padding: 12px 16px; background: var(--k); color: #fff; font-weight: 800; }
  td { padding: 11px 16px; border-top: 1px solid var(--lijn); vertical-align: top; }
  tbody tr:nth-child(even) td { background: var(--vlak); }
  td:first-child { white-space: nowrap; }

  .tip { display: flex; gap: 14px; align-items: flex-start; margin: 20px 0; padding: 16px 18px; border-radius: 14px;
    background: color-mix(in srgb, var(--k) 8%, #fff); border: 1.5px solid color-mix(in srgb, var(--k) 35%, #fff); }
  .tip-label { flex: 0 0 auto; padding: 3px 12px; border-radius: 999px; background: var(--k); color: #fff; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: .06em; }
  .tip p { margin: 0; }

  .fig { margin: 22px 0 30px; }
  .venster { border-radius: 14px; overflow: hidden; background: #14112e; box-shadow: 0 14px 40px rgba(20, 10, 70, .22), 0 0 0 1px rgba(20, 10, 70, .12); }
  .balk { display: flex; align-items: center; gap: 7px; padding: 9px 14px; background: linear-gradient(#2a2457, #1e1946); color: #b9b2e0; font-size: 12px; font-weight: 700; }
  .balk i { width: 11px; height: 11px; border-radius: 50%; background: #ff5f7a; } .balk i:nth-child(2) { background: #ffc83d; } .balk i:nth-child(3) { background: #3ddc84; }
  .balk span { margin-left: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .venster img { display: block; width: 100%; height: auto; }
  figcaption { margin-top: 10px; font-size: 14px; color: var(--zacht); }
  figcaption b { color: var(--k); margin-right: 6px; }

  @page { size: A4; margin: 14mm 0 16mm; }
  @page :first { margin: 0; }
  @media print {
    body { background: #fff; }
    .blad { max-width: none; box-shadow: none; }
    .voorpagina { min-height: 297mm; height: 297mm; break-after: page; padding: 32mm 22mm 22mm; }
    .inhoud { padding: 6mm 18mm; break-after: page; }
    .hoofdstuk { padding: 0 18mm 6mm; break-before: page; }
    .hs-kop { margin: 0 -18mm 18px; padding: 16mm 18mm 10mm; }
    .fig { break-inside: avoid; }
    .fig.hoog .venster img { max-height: 205mm; width: auto; max-width: 100%; margin: 0 auto; }
    .fig.hoog .venster { width: fit-content; max-width: 100%; margin: 0 auto; }
    .tip, ol.stappen li, table, h4.vraag { break-inside: avoid; }
    h3, h4 { break-after: avoid; }
    a { border: 0; }
    .pdf-knop { display: none; }
    .films { grid-template-columns: 1fr 1fr; }
    .film { break-inside: avoid; }
    .film video { display: none; }
    .film-print { display: block; position: relative; }
    .film-print img { display: block; width: 100%; }
    .film-print span { position: absolute; left: 10px; bottom: 10px; padding: 4px 12px; border-radius: 999px; background: #7b3cff; color: #fff; font-weight: 800; font-size: 13px; }
  }
</style></head>
<body><div class="blad">
<section class="voorpagina">
  <img class="logo" src="data:image/png;base64,${LOGO}" alt="Kenniskist">
  <div class="boventitel">Kenniskist · leren terwijl je speelt</div>
  <h1>${esc(titel)}</h1>
  <p class="sub">${esc(onder)}</p>
  <div class="rollen"><span class="r1">ICT'er</span><span class="r2">Leerkracht</span><span class="r3">Leerling</span></div>
  <div class="knoppen"><a class="pdf-knop" href="handleiding.pdf" download="Handleiding Kenniskist.pdf">Download als pdf</a><a class="pdf-knop film-knop" href="#18-uitlegfilmpjes">▶ Uitlegfilmpjes</a></div>
  <p class="noot"><span class="datum">November 2026.</span> ${inline(noot)}</p>
</section>
${uit.join('\n')}
</div></body></html>`
writeFileSync(join(MAP, 'handleiding.html'), html)
console.log('handleiding.html: ' + Math.round(html.length / 1024) + ' kB, ' + figNr + ' afbeeldingen')
