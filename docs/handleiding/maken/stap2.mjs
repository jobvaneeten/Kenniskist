import { start, pagina, foto, BASIS } from './demo.mjs'
const browser = await start()
const p = await pagina(browser, 'L1')
const klik = async (tekst, opties = {}) => { await p.getByText(tekst, { exact: !!opties.exact }).first().click(); await p.waitForTimeout(opties.wacht ?? 700) }
await p.goto(BASIS + '/leerkrachtenportaal'); await p.waitForTimeout(1500)
await foto(p, '10-portaal-leerkracht')
await klik('Groep 7a')
await foto(p, '20-klas-weektaak')
for (const [tab, naam] of [['Taken', '30-klas-taken'], ['Doelen', '40-klas-doelen'], ['Weekoverzicht', '50-weekoverzicht'], ['Werkblad', '60-werkblad'], ['Eigen oefeningen', '70-eigen-oefeningen'], ['Leerlingen', '80-leerlingen']]) {
  await p.locator('.portaal-tab-knop', { hasText: tab }).first().click(); await p.waitForTimeout(900)
  await foto(p, naam, { heel: true })
}
await browser.close()
