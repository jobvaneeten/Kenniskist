import { start, pagina, foto, BASIS } from './demo.mjs'
const browser = await start()
const p = await pagina(browser, 'L1')
const klik = async (tekst, opties = {}) => { const l = p.getByText(tekst, { exact: !!opties.exact }); await l.first().click({ timeout: 4000 }); await p.waitForTimeout(opties.wacht ?? 800) }
const stap = async (naam, fn) => { try { await fn() } catch (e) { console.log('  ✗', naam, e.message.split('\n')[0]) } }
const naarKlas = async (tab) => { await p.goto(BASIS + '/leerkrachtenportaal'); await p.waitForTimeout(1300); await klik('Groep 7a'); if (tab) { await p.locator('.portaal-tab-knop', { hasText: tab }).first().click(); await p.waitForTimeout(900) } }
await stap('weektaak-detail', async () => { await naarKlas(); await klik('Week 45', { wacht: 1500 }); await foto(p, '21-weektaak-voortgang', { heel: true }) })
await stap('nieuwe-weektaak', async () => {
  await naarKlas(); await klik('+ Nieuwe weektaak', { wacht: 1200 })
  await p.getByPlaceholder('bv. Week 36').fill('Week 46')
  await klik('+ Opdracht toevoegen', { wacht: 800 }); await klik('Taal', { exact: true, wacht: 800 }); await klik('Woordsoorten', { exact: true, wacht: 900 })
  await klik('+ Werk aan je doelen', { wacht: 900 })
  await foto(p, '28-weektaak-ingevuld', { heel: true })
})
await stap('weekoverzicht-fleur', async () => { await naarKlas('Weekoverzicht'); await p.locator('button', { hasText: 'Fleur' }).first().click(); await p.waitForTimeout(1600); await foto(p, '51-weekoverzicht-fleur', { heel: true }) })
await browser.close()
