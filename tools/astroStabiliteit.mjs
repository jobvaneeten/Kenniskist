// Astro Katapult: laadt alle levels en rekent zonder te schieten 5 seconden door.
// Een level mag dan niet vanzelf instorten, geen aliens of blokken kwijtraken en
// niets mag merkbaar verschuiven. Vereist de dev-server (npm run dev).
// Gebruik: node tools/astroStabiliteit.mjs
import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const fouten = []; page.on('pageerror', e => fouten.push(e.message))
await page.goto('http://localhost:5173/astrokatapult/?terug=1'); await page.waitForTimeout(1200)
const res = await page.evaluate(() => {
  const uit = []
  for (let i = 0; i < __ak.LEVELS.length; i++) {
    __ak.loadLevel(i)
    const a0 = __ak.aliens.length, b0 = __ak.blocks.length, def = __ak.LEVELS[i]
    const pos = new Map(__ak.blocks.map(b => [b.id, { x: b.position.x, y: b.position.y, a: b.angle }]))
    __ak.reken(300)
    let maxD = 0, maxA = 0
    for (const b of __ak.blocks) { const p = pos.get(b.id); if (!p) continue; maxD = Math.max(maxD, Math.hypot(b.position.x - p.x, b.position.y - p.y)); maxA = Math.max(maxA, Math.abs(b.angle - p.a)) }
    uit.push({ L: i + 1, aliensBijStart: a0, aliensInDefinitie: def.aliens.length, aliensWeg: a0 - __ak.aliens.length, blokkenWeg: b0 - __ak.blocks.length, verschuiving: Math.round(maxD), kanteling: +maxA.toFixed(2) })
  }
  return uit
})
const slecht = res.filter(r => r.aliensWeg || r.blokkenWeg || r.aliensBijStart !== r.aliensInDefinitie || r.verschuiving > 4 || r.kanteling > 0.05)
console.log(slecht.length ? '✗ instabiel: ' + JSON.stringify(slecht) : `✓ alle ${res.length} levels staan stil`)
if (fouten.length) console.log('FOUTEN ' + fouten.join('|'))
await browser.close()
process.exit(slecht.length || fouten.length ? 1 : 0)
