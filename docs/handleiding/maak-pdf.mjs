// Maakt handleiding.pdf van handleiding.html (eerst maak-html.mjs draaien).
// Gebruik: node docs/handleiding/maak-pdf.mjs
import { createRequire } from 'node:module'
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')

const MAP = dirname(fileURLToPath(import.meta.url))
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(pathToFileURL(join(MAP, 'handleiding.html')).href, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.pdf({
  path: join(MAP, 'handleiding.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true,
  displayHeaderFooter: true, headerTemplate: '<span></span>',
  footerTemplate: '<div style="width:100%;font:9px Nunito,Segoe UI,sans-serif;color:#8a86ad;padding:0 18mm;display:flex;justify-content:space-between"><span>Handleiding Kenniskist</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
})
await browser.close()
// en naar de website: het leerkrachtenportaal linkt naar /handleiding/handleiding.html
const WEB = join(MAP, '../../public/handleiding')
mkdirSync(WEB, { recursive: true })
for (const f of ['handleiding.html', 'handleiding.pdf']) copyFileSync(join(MAP, f), join(WEB, f))
console.log('handleiding.pdf gemaakt en naar public/handleiding gezet')
