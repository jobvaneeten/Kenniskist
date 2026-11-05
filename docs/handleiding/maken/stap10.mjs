import { start, pagina, foto, BASIS } from './demo.mjs'
const browser = await start()
const p = await pagina(browser, 'P71', { breed: 1180, hoog: 820, init: () => { localStorage.setItem('kk_briefgeld', '850'); localStorage.setItem('kk_curuntie', '1240'); localStorage.setItem('kk_unlocked', JSON.stringify({ shirt: ['rood', 'blauw', 'geel'], broek: ['blauw'], schoenen: ['wit'] })) } })
await p.goto(BASIS + '/leerlingportaal'); await p.waitForTimeout(3500)
await p.locator('.btn-shop').click(); await p.waitForTimeout(2500)
await foto(p, '120-winkel')
await browser.close()
