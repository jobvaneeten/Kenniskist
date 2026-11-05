import { start, pagina, foto, BASIS } from './demo.mjs'
const browser = await start()
const p = await pagina(browser, 'P71', { breed: 1180, hoog: 820 })
await p.goto(BASIS + '/leerlingportaal'); await p.waitForTimeout(3500)
await p.locator('.zijkaart-mijnweek').click(); await p.waitForTimeout(2500)
await foto(p, '102-mijn-week', { heel: true })
await browser.close()
