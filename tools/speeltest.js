// Speelt het eerste level van elke wereld écht door met gescripte toetsinvoer,
// en meet daarbij de framerate.
//
//   npm run speeltest
//
// Screenshots laten zien of een level er goed uitziet; dit laat zien of het
// speelbaar is. De bot rent naar rechts en springt zodra hij tegen iets aan
// loopt of een gat voor zich heeft — genoeg om te merken dat een level
// onneembaar is of dat de speler ergens blijft haken.

import { test, expect } from '@playwright/test'

const LEVELS = ['w1-l01', 'w2-l01', 'w3-l01', 'w4-l01', 'w5-l01']
const DUUR_MS = 22_000

for (const id of LEVELS) {
  test(`speeltest ${id}`, async ({ page }) => {
    const fouten = []
    page.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()) })
    page.on('pageerror', (e) => fouten.push(String(e)))

    await page.goto(`/sterrenveer-dev.html?level=${id}&alles=1`)
    await page.waitForFunction(
      (lid) => window.sterrenveer?.scene?.level?.id === lid,
      id,
      { timeout: 20_000 },
    )
    await page.waitForTimeout(900) // de intro-overgang laten aflopen

    // De bot: rechts ingedrukt houden, en springen zodra hij niet meer
    // vooruitkomt of er een gat voor hem ligt.
    await page.evaluate(() => {
      const spel = window.sterrenveer
      // Breedte meteen vastleggen: haalt de bot de finish, dan is scene straks
      // de cutscene of het resultatenscherm en is map er niet meer.
      window.__meting = {
        minFps: 999, maxX: 0, dood: 0, vast: 0, gehaald: false,
        breedte: spel.scene.map.breedtePx,
      }
      let vorigeX = 0
      let stil = 0

      const toets = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }))
      toets('keydown', 'ArrowRight')
      toets('keydown', 'ShiftLeft')

      window.__bot = setInterval(() => {
        const s = spel.scene
        const m0 = window.__meting
        // Andere scène = level uit; dat kan alleen door de finish te halen.
        if (!s?.speler || !s.map) { m0.gehaald = true; return }
        const l = s.speler.lichaam
        const m = window.__meting
        m.maxX = Math.max(m.maxX, l.x)
        if (spel.lus.fps > 5) m.minFps = Math.min(m.minFps, spel.lus.fps)
        m.dood = s.levensVerloren ?? 0

        // Niet vooruitgekomen? Springen. Twee keer niet? Even loslaten en
        // opnieuw, zodat hij niet tegen een muur blijft duwen.
        if (Math.abs(l.x - vorigeX) < 1.5) {
          stil++
          toets('keydown', 'Space')
          setTimeout(() => toets('keyup', 'Space'), 120)
          if (stil > 6) {
            m.vast++
            stil = 0
            toets('keyup', 'ArrowRight')
            setTimeout(() => toets('keydown', 'ArrowRight'), 200)
          }
        } else {
          stil = 0
          // Ook springen als er een gat voor hem ligt.
          const tx = Math.floor((l.rechts + 12) / 16)
          const ty = Math.floor((l.onder + 4) / 16)
          if (l.opGrond && s.map && !s.map.vastOp(tx, ty) && !s.map.platformOp(tx, ty)) {
            toets('keydown', 'Space')
            setTimeout(() => toets('keyup', 'Space'), 150)
          }
        }
        vorigeX = l.x
      }, 100)
    })

    await page.waitForTimeout(DUUR_MS)

    const meting = await page.evaluate(() => {
      clearInterval(window.__bot)
      const s = window.sterrenveer.scene
      return { ...window.__meting, gehaald: window.__meting.gehaald || !!s.klaar }
    })

    // Klemmen op 1: in levels die omhoog of omlaag lopen zegt maxX weinig over
    // de voortgang, en bij zwaartekrachtwissels kan de speler zelfs voorbij de
    // laatste kolom komen. Meer dan "helemaal" bestaat niet.
    const deel = meting.gehaald ? 1 : Math.min(1, meting.maxX / Math.max(1, meting.breedte))
    console.log(
      `  ${id}: ${meting.gehaald ? 'uitgespeeld' : `${(deel * 100).toFixed(0)}% van het level`}`
      + `, laagste fps ${meting.minFps}, ${meting.dood} keer dood, ${meting.vast} keer vastgelopen`,
    )

    expect(fouten, `console-errors in ${id}:\n${fouten.join('\n')}`).toEqual([])
    // De bot is dom; hij hoeft de finish niet te halen. Blijft hij in de eerste
    // tien procent steken, dan zit er iets fout in het level of in de collision.
    expect(deel, `${id}: de bot kwam maar ${(deel * 100).toFixed(0)}% ver`).toBeGreaterThan(0.12)
    expect(meting.minFps, `${id}: framerate zakte naar ${meting.minFps}`).toBeGreaterThan(50)
  })
}
