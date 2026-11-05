// Maakt de ingesproken zinnen voor de filmpjes (video/stem/<filmpje>/<code>.wav).
//
//   node docs/handleiding/video/stem.mjs windows [filmpjes...]   AI-stem van Windows (Nederlands)
//   node docs/handleiding/video/stem.mjs uitpakken <bestand.json> eigen stem uit de inspreekstudio
//
// Daarna: node docs/handleiding/video/maak-videos.mjs --stem
// De zinnen komen uit video/teksten.json (die schrijft maak-videos bij elke opname).
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { win32 } from 'node:path'

const MAP = process.cwd() + '/docs/handleiding/video/'
const STEM = MAP + 'stem/'
const stemCode = (tekst) => createHash('md5').update(tekst).digest('hex').slice(0, 10)
const winPad = (p) => execFileSync('cygpath', ['-w', p]).toString().trim()
// wat er hardop gezegd wordt: zonder pijltjes, en de adressen leesbaar
const uitspraak = (t) => t.replace(/→/g, '').replace(/kenniskist\.nl\//g, 'kenniskist punt nl, ').replace(/ICT’er/g, 'ICT-er').replace(/\s+/g, ' ').trim()

const [soort, ...rest] = process.argv.slice(2)
const teksten = JSON.parse(readFileSync(MAP + 'teksten.json', 'utf8'))

if (soort === 'windows') {
  const taal = rest.find(a => a.startsWith('--taal='))?.slice(7) ?? 'nl'
  const namen = rest.filter(a => !a.startsWith('--'))
  for (const [naam, zinnen] of Object.entries(teksten)) {
    if (namen.length && !namen.some(n => naam.startsWith(n))) continue
    mkdirSync(STEM + naam, { recursive: true })
    const lijst = zinnen.filter(t => !existsSync(STEM + naam + '/' + stemCode(t) + '.wav'))
      .map(t => ({ tekst: uitspraak(t), pad: win32.join(winPad(STEM + naam), stemCode(t) + '.wav') }))
    if (!lijst.length) { console.log(naam, ': al ingesproken'); continue }
    writeFileSync(MAP + 'zinnen.json', JSON.stringify(lijst))
    try {
      const uit = execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', winPad(MAP + 'stem-windows.ps1'), '-Lijst', winPad(MAP + 'zinnen.json'), '-Taal', taal]).toString()
      console.log(naam, ':', uit.trim().split(/\r?\n/)[0], '·', lijst.length, 'zinnen')
    } catch (e) {
      console.log((e.stdout || '').toString().trim() || e.message)
      console.log('Installeer de Nederlandse stem: Instellingen > Tijd en taal > Spraak > Stemmen toevoegen > Nederlands (Nederland).')
      process.exit(2)
    } finally { rmSync(MAP + 'zinnen.json', { force: true }) }
  }
} else if (soort === 'uitpakken') {
  // { filmpje, opnames: { tekst: 'data:audio/webm;base64,...' } } uit studio.html
  const d = JSON.parse(readFileSync(rest[0], 'utf8'))
  mkdirSync(STEM + d.filmpje, { recursive: true })
  for (const [tekst, data] of Object.entries(d.opnames)) {
    const code = stemCode(tekst)
    const tmp = STEM + d.filmpje + '/' + code + '.webm'
    writeFileSync(tmp, Buffer.from(data.split(',')[1], 'base64'))
    // stilte aan begin en eind eraf, en iets luider gelijk getrokken
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmp, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm', '-ar', '44100', STEM + d.filmpje + '/' + code + '.wav'])
    rmSync(tmp)
  }
  console.log(d.filmpje, ':', Object.keys(d.opnames).length, 'opnames uitgepakt')
} else {
  console.log('Gebruik: stem.mjs windows [filmpjes] | stem.mjs uitpakken <bestand.json>')
}
