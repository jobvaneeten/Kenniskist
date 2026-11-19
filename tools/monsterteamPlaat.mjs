// Monsterteam: maakt één plaat met alle wezens, per element (screenshots/monsterteam-wezens.png).
// Handig om te zien of elk wezen er goed uitziet. Gebruik: node tools/monsterteamPlaat.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const pad = f => fileURLToPath(new URL('../public/' + f, import.meta.url))
mkdirSync('screenshots', { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.setContent('<html><body style="margin:0;background:#0b0a1f"><canvas id="c"></canvas></body></html>')
for (const f of ['neonkit/neonkit.js', 'monsterteam/kern.js', 'monsterteam/wezens.js']) await page.addScriptTag({ path: pad(f) })
const hoogte = await page.evaluate(() => {
  const types = MT.TYPES, kol = 8, cw = 160, ch = 178, kop = 54
  const perType = types.map(t => Object.keys(MT.SOORTEN).filter(id => MT.SOORTEN[id].type === t))
  const H = perType.reduce((s, l) => s + kop + Math.ceil(l.length / kol) * ch, 20)
  const c = document.getElementById('c'); c.width = kol * cw; c.height = H
  const g = c.getContext('2d')
  g.fillStyle = '#0b0a1f'; g.fillRect(0, 0, c.width, H)
  let y = 10, nr = 0
  types.forEach((t, ti) => {
    g.fillStyle = MT.KLEUR[t]; g.font = 'bold 30px sans-serif'; g.fillText(MT.TYPENAAM[t] + ' (' + perType[ti].length + ')', 20, y + 38)
    g.fillRect(20, y + 46, kol * cw - 40, 3)
    y += kop
    perType[ti].forEach((id, i) => {
      const x = (i % kol) * cw, yy = y + Math.floor(i / kol) * ch
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.beginPath(); g.roundRect(x + 6, yy + 6, cw - 12, ch - 12, 14); g.fill()
      MTZ.teken(g, id, x + cw / 2, yy + 78, 54, { stil: true, t: 0 })
      nr++
      g.fillStyle = '#eef3ff'; g.font = 'bold 16px sans-serif'; g.textAlign = 'center'
      g.fillText(MT.SOORTEN[id].naam, x + cw / 2, yy + ch - 30)
      g.fillStyle = '#8f9bc4'; g.font = '12px sans-serif'
      const s = MT.SOORTEN[id]
      g.fillText('#' + nr + ' · stadium ' + s.stadium + (s.evo ? ' → niv. ' + s.evo[1] : ''), x + cw / 2, yy + ch - 13)
      g.textAlign = 'left'
    })
    y += Math.ceil(perType[ti].length / kol) * ch
  })
  return H
})
await page.setViewportSize({ width: 1280, height: hoogte })
await page.locator('#c').screenshot({ path: 'screenshots/monsterteam-wezens.png' })
await browser.close()
console.log('geschreven: screenshots/monsterteam-wezens.png')
