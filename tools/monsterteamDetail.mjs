// Monsterteam: een paar wezens groot tekenen om details te bekijken.
// Gebruik: node tools/monsterteamDetail.mjs vonkel vlamvos zonnevos  (of een type: node tools/monsterteamDetail.mjs vuur)
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const pad = f => fileURLToPath(new URL('../public/' + f, import.meta.url))
mkdirSync('screenshots', { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
const fouten = []
page.on('pageerror', e => fouten.push(e.message))
await page.setContent('<html><body style="margin:0;background:#0b0a1f"><canvas id="c"></canvas></body></html>')
for (const f of ['neonkit/neonkit.js', 'monsterteam/kern.js', 'monsterteam/wezens.js']) await page.addScriptTag({ path: pad(f) })
const t = Number(process.env.T || 0)
const h = await page.evaluate(([args, t]) => {
  let ids = []
  args.forEach(a => { if (MT.TYPES.includes(a)) ids.push(...Object.keys(MT.SOORTEN).filter(id => MT.SOORTEN[id].type === a)); else if (a.startsWith('vorm:')) ids.push(...Object.keys(MT.SOORTEN).filter(id => MT.SOORTEN[id].look.vorm === a.slice(5))); else ids.push(a) })
  const kol = 4, cw = 300, ch = 300, H = Math.ceil(ids.length / kol) * ch
  const c = document.getElementById('c'); c.width = kol * cw; c.height = H
  const g = c.getContext('2d'); g.fillStyle = '#141432'; g.fillRect(0, 0, c.width, H)
  ids.forEach((id, i) => {
    const x = (i % kol) * cw, y = Math.floor(i / kol) * ch
    g.strokeStyle = '#2a2a5a'; g.strokeRect(x, y, cw, ch)
    MTZ.teken(g, id, x + cw / 2, y + 140, 105, { stil: !t, t: t })
    g.fillStyle = '#eef3ff'; g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.fillText(MT.SOORTEN[id] ? MT.SOORTEN[id].naam : id, x + cw / 2, y + ch - 14)
  })
  return H
}, [process.argv.slice(2), t])
await page.setViewportSize({ width: 1200, height: Math.max(300, h) })
await page.locator('#c').screenshot({ path: 'screenshots/monsterteam-detail.png' })
await browser.close()
if (fouten.length) console.log('FOUTEN:', fouten.join('\n'))
console.log('geschreven: screenshots/monsterteam-detail.png')
