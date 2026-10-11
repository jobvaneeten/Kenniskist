// Astro Katapult: een bot probeert per level te winnen. Per schot probeert hij
// een raster van richtingen en krachten (het level wordt telkens opnieuw
// geladen en de eerdere schoten worden herhaald) en kiest het schot dat de
// meeste aliens raakt. Gebruikt geen speciale acties, alleen gewone schoten.
// Vereist de dev-server. Gebruik: node tools/astroBot.mjs [levels, bv. 1-10 of 4,7,45]
import { chromium } from 'playwright'
const arg = process.argv[2] || '1-50'
const levels = arg.includes('-') ? (([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i))(arg.split('-').map(Number)) : arg.split(',').map(Number)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto('http://localhost:5173/astrokatapult/?terug=1'); await page.waitForTimeout(1200)
let verloren = 0
for (const L of levels) {
  const r = await page.evaluate(L => {
    const kand = []
    for (const hoek of [10, 18, 26, 34, 42, 50, 58]) for (const kracht of [0.55, 0.7, 0.85, 1]) {
      const a = hoek * Math.PI / 180, d = 155 * kracht
      kand.push([-Math.cos(a) * d, Math.sin(a) * d])
    }
    const gekozen = []
    const ammo = __ak.LEVELS[L - 1].ammo
    for (let k = 0; k < ammo; k++) {
      let best = null, bestN = 1e9
      for (const c of kand) {
        __ak.loadLevel(L - 1)
        for (const g of gekozen) __ak.schiet(g[0], g[1])
        const n = __ak.schiet(c[0], c[1])
        if (n < bestN) { bestN = n; best = c }
        if (n === 0) break
      }
      gekozen.push(best)
      if (bestN === 0) return { gewonnen: true, schoten: k + 1, ammo }
    }
    __ak.loadLevel(L - 1); let over = 0
    for (const g of gekozen) over = __ak.schiet(g[0], g[1])
    return { gewonnen: false, over, ammo }
  }, L)
  if (!r.gewonnen) verloren++
  console.log(`Level ${String(L).padStart(2)}: ${r.gewonnen ? `gewonnen in ${r.schoten} van ${r.ammo} schoten` : `NIET gewonnen, ${r.over} aliens over`}`)
}
await browser.close()
console.log(verloren ? `\n${verloren} level(s) niet gehaald door de bot` : '\n✓ de bot haalt alle levels')
