// Probeert álle tachtig levels uit te spelen met gescripte toetsinvoer.
//
//   npm run uitspeeltest
//
// De speeltest (tools/speeltest.js) kijkt naar framerate en doet één level per
// wereld; deze kijkt naar één ding: komt de bot bij de finish? Hij is dom — hij
// rent naar rechts, springt als hij vastloopt en probeert af en toe omhoog of
// omlaag — dus hij haalt lang niet elk level. Waar het om gaat is het verschil
// tussen "komt een heel eind" en "komt geen stap vooruit": dat laatste betekent
// dat er iets in de weg zit dat er niet hoort te zitten.
//
// Het rapport gaat naar screenshots/uitspeeltest.json, zodat je twee runs met
// elkaar kunt vergelijken.

import { writeFileSync, mkdirSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { ALLE_LEVELS } from '../src/game/data/levels/index.js'

const DUUR_MS = 26_000
const uitslagen = []

test.afterAll(() => {
  mkdirSync('screenshots', { recursive: true })
  writeFileSync('screenshots/uitspeeltest.json', `${JSON.stringify(uitslagen, null, 2)}\n`)
  const gehaald = uitslagen.filter((u) => u.gehaald).length
  const gestrand = uitslagen.filter((u) => !u.gehaald && u.deel < 0.1)
  console.log(`\n${gehaald} van de ${uitslagen.length} levels uitgespeeld door de bot.`)
  if (gestrand.length) {
    console.log(`Geen stap vooruit gekomen in: ${gestrand.map((u) => u.id).join(', ')}`)
  }
})

for (const level of ALLE_LEVELS) {
  test(`uitspelen ${level.id}`, async ({ page }) => {
    const fouten = []
    page.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()) })
    page.on('pageerror', (e) => fouten.push(String(e)))

    await page.goto(`/sterrenveer-dev.html?level=${level.id}&alles=1`)
    await page.waitForFunction(
      (id) => window.sterrenveer?.scene?.level?.id === id,
      level.id,
      { timeout: 20_000 },
    )
    await page.waitForTimeout(900)

    await page.evaluate(() => {
      const spel = window.sterrenveer
      const s0 = spel.scene
      // De finish ligt vast; de afstand ertoe is de enige maat die ook in
      // verticale levels klopt.
      const f = s0.finish
      window.__m = {
        gehaald: false, dood: 0, vast: 0,
        startAfstand: Math.hypot(s0.speler.midX - f.x, s0.speler.midY - f.y),
        dichtst: Infinity,
        finishX: f.x, finishY: f.y,
      }

      const toets = (t, code) => window.dispatchEvent(new KeyboardEvent(t, { code, bubbles: true }))
      toets('keydown', 'ArrowRight')
      toets('keydown', 'ShiftLeft')
      let vorigeX = 0
      let vorigeY = 0
      let stil = 0
      let richting = 'ArrowRight'

      window.__bot = setInterval(() => {
        const s = spel.scene
        const m = window.__m
        // Andere scène = het level is uit, en dat kan alleen via de finish.
        if (!s?.speler || !s.map) { m.gehaald = true; return }
        const l = s.speler.lichaam
        m.dood = s.levensVerloren ?? 0
        m.dichtst = Math.min(m.dichtst, Math.hypot(l.midX - m.finishX, l.midY - m.finishY))

        const beweegt = Math.abs(l.x - vorigeX) > 1.5 || Math.abs(l.y - vorigeY) > 1.5
        if (!beweegt) {
          stil++
          toets('keydown', 'Space')
          setTimeout(() => toets('keyup', 'Space'), 130)
          // Blijft hij hangen, dan de andere kant op: soms ligt de route naar
          // links, en in verticale levels moet je eerst een stukje terug.
          if (stil > 5) {
            m.vast++
            stil = 0
            toets('keyup', richting)
            richting = richting === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight'
            setTimeout(() => toets('keydown', richting), 180)
          }
        } else {
          stil = 0
          const tx = Math.floor((richting === 'ArrowRight' ? l.rechts + 12 : l.links - 12) / 16)
          const ty = Math.floor((l.onder + 4) / 16)
          if (l.opGrond && !s.map.vastOp(tx, ty) && !s.map.platformOp(tx, ty)) {
            toets('keydown', 'Space')
            setTimeout(() => toets('keyup', 'Space'), 160)
          }
        }
        vorigeX = l.x
        vorigeY = l.y
      }, 100)
    })

    await page.waitForTimeout(DUUR_MS)

    const m = await page.evaluate(() => {
      clearInterval(window.__bot)
      const s = window.sterrenveer.scene
      return { ...window.__m, gehaald: window.__m.gehaald || !!s.klaar }
    })

    // Hoeveel van de afstand naar de finish is overbrugd.
    const deel = m.gehaald ? 1
      : Math.max(0, Math.min(1, 1 - m.dichtst / Math.max(1, m.startAfstand)))
    uitslagen.push({ id: level.id, naam: level.naam, gehaald: m.gehaald, deel: +deel.toFixed(2), dood: m.dood, vast: m.vast })

    console.log(`  ${level.id} ${level.naam.padEnd(22)}`
      + `${m.gehaald ? 'uitgespeeld' : `${(deel * 100).toFixed(0)}% richting finish`}`
      + `, ${m.dood}x dood, ${m.vast}x vastgelopen`)

    expect(fouten, `console-errors in ${level.id}:\n${fouten.join('\n')}`).toEqual([])
    // De bot is dom, dus de finish halen is geen eis. Komt hij niet eens van
    // zijn plek, dan zit er wél iets fout.
    expect(deel, `${level.id}: de bot kwam geen stap richting de finish`).toBeGreaterThan(0.03)
  })
}
