// Maakt handleiding.pdf van handleiding.html (eerst maak-html.mjs draaien).
// Gebruik: node docs/handleiding/maak-pdf.mjs
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')

const MAP = dirname(fileURLToPath(import.meta.url))
// de handleiding staat in public/handleiding (met plaatjes/ en videos/ ernaast)
const WEB = join(MAP, '../../public/handleiding')
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(pathToFileURL(join(WEB, 'handleiding.html')).href, { waitUntil: 'networkidle' })
// in de pdf moeten alle plaatjes erin: niet pas laden bij scrollen
await page.evaluate(async () => {
  const imgs = [...document.images]
  imgs.forEach(i => { i.loading = 'eager' })
  await Promise.all(imgs.map(i => i.complete ? 0 : new Promise(k => { i.onload = i.onerror = k })))
  await document.fonts.ready
})
await page.pdf({
  path: join(WEB, 'handleiding.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true,
  displayHeaderFooter: true, headerTemplate: '<span></span>',
  footerTemplate: '<div style="width:100%;font:9px Nunito,Segoe UI,sans-serif;color:#8a86ad;padding:0 18mm;display:flex;justify-content:space-between"><span>Handleiding Kenniskist</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
})
await browser.close()
console.log('public/handleiding/handleiding.pdf gemaakt')
