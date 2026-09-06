// Laadt elk level, maakt na een seconde een screenshot en faalt bij
// console-errors.
//
//   npm run screenshots
//
// De plaatjes komen in screenshots/. Die zijn bedoeld om zelf te bekijken: een
// level dat er leeg, lelijk of onleesbaar uitziet valt daar meteen op.

import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { ALLE_LEVELS } from '../src/game/data/levels/index.js'

const UIT = 'screenshots'
mkdirSync(UIT, { recursive: true })

// Menuschermen krijgen ook een plaatje: die zijn net zo goed onderdeel van de
// visuele kwaliteit.
const SCHERMEN = [
  { naam: 'titel', url: '/sterrenveer-dev.html' },
]

for (const scherm of SCHERMEN) {
  test(`scherm ${scherm.naam}`, async ({ page }) => {
    const fouten = []
    page.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()) })
    page.on('pageerror', (e) => fouten.push(String(e)))

    await page.goto(scherm.url)
    await page.waitForFunction(() => !!window.sterrenveer, null, { timeout: 20_000 })
    await page.waitForTimeout(1200)
    await page.locator('canvas').screenshot({ path: `${UIT}/${scherm.naam}.png` })

    expect(fouten, `console-errors op ${scherm.naam}:\n${fouten.join('\n')}`).toEqual([])
  })
}

for (const level of ALLE_LEVELS) {
  test(`level ${level.id} — ${level.naam}`, async ({ page }) => {
    const fouten = []
    page.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()) })
    page.on('pageerror', (e) => fouten.push(String(e)))

    await page.goto(`/sterrenveer-dev.html?level=${level.id}&alles=1`)
    // Wachten tot de levelscène er echt staat; anders fotografeer je de
    // overgang naar zwart.
    await page.waitForFunction(
      (id) => window.sterrenveer?.scene?.level?.id === id,
      level.id,
      { timeout: 20_000 },
    )
    await page.waitForTimeout(1000)
    await page.locator('canvas').screenshot({ path: `${UIT}/${level.id}.png` })

    expect(fouten, `console-errors in ${level.id}:\n${fouten.join('\n')}`).toEqual([])
  })
}
