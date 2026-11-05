import { start, pagina, foto, BASIS } from './demo.mjs'
const browser = await start()
const p = await pagina(browser, 'L1')
const klik = async (tekst, opties = {}) => { const l = opties.rol ? p.getByRole(opties.rol, { name: tekst, exact: !!opties.exact }) : p.getByText(tekst, { exact: !!opties.exact }); await l.first().click({ timeout: 4000 }); await p.waitForTimeout(opties.wacht ?? 800) }
const stap = async (naam, fn) => { try { await fn() } catch (e) { console.log('  ✗', naam, e.message.split('\n')[0]) } }
const naarKlas = async (tab) => { await p.goto(BASIS + '/leerkrachtenportaal'); await p.waitForTimeout(1300); await klik('Groep 7a'); if (tab) { await p.locator('.portaal-tab-knop', { hasText: tab }).first().click(); await p.waitForTimeout(900) } }

await stap('weektaak-detail', async () => { await naarKlas(); await klik('Week 45', { wacht: 1500 }); await foto(p, '21-weektaak-voortgang', { heel: true }) })
await stap('niet-af', async () => { await klik('Alleen niet af', { wacht: 900 }); await foto(p, '22-weektaak-niet-af', { heel: true }) })
await stap('leerling-detail', async () => { await naarKlas(); await klik('Week 45', { wacht: 1500 }); await p.locator('.portaal-leerlingnaam', { hasText: 'Fleur' }).first().click(); await p.waitForTimeout(1500); await foto(p, '23-leerling-detail', { heel: true }) })
await stap('differentieren', async () => { await naarKlas(); await klik('Week 45', { wacht: 1500 }); await klik('Differentiëren', { wacht: 1200 }); await foto(p, '24-differentieren', { heel: true }) })
await stap('nieuwe-weektaak', async () => {
  await naarKlas(); await klik('+ Nieuwe weektaak', { wacht: 1200 }); await foto(p, '25-nieuwe-weektaak', { heel: true })
  await klik('+ Opdracht toevoegen', { wacht: 800 }); await foto(p, '26-oefening-kiezen-vak', { heel: true })
  await klik('Taal', { exact: true, wacht: 800 }); await foto(p, '27-oefening-kiezen-taal', { heel: true })
  await klik('Woordsoorten', { exact: true, wacht: 900 })
  await klik('+ Werk aan je doelen', { wacht: 900 })
  await p.locator('input[type=text]').first().fill('Week 46')
  await foto(p, '28-weektaak-ingevuld', { heel: true })
})
await stap('nieuwe-taak', async () => { await naarKlas('Taken'); await foto(p, '30-klas-taken', { heel: true }); await klik('+ Nieuwe taak', { wacht: 1200 }); await foto(p, '31-nieuwe-taak', { heel: true }) })
await stap('nieuw-doel', async () => { await naarKlas('Doelen'); await klik('+ Nieuw doel', { wacht: 1200 }); await klik('+ Doel kiezen', { wacht: 900 }); await foto(p, '41-doel-kiezen', { heel: true }) })
await stap('doel-per-leerling', async () => { await naarKlas('Doelen'); await klik('Per leerling', { wacht: 1200 }); await foto(p, '42-doelen-per-leerling', { heel: true }) })
await stap('doel-detail', async () => { await naarKlas('Doelen'); await klik('Komma bij opsommingen', { wacht: 1500 }); await foto(p, '43-doel-voortgang', { heel: true }) })
await stap('weekoverzicht-fleur', async () => { await naarKlas('Weekoverzicht'); await klik('Fleur', { exact: true, wacht: 1600 }); await foto(p, '51-weekoverzicht-fleur', { heel: true }) })
await stap('werkblad', async () => { await naarKlas('Werkblad'); await foto(p, '60-werkblad', { heel: true }) })
await stap('eigen', async () => { await naarKlas('Eigen oefeningen'); await foto(p, '70-eigen-oefeningen', { heel: true }) })
await stap('leerling-toevoegen', async () => { await p.goto(BASIS + '/leerkrachtenportaal'); await p.waitForTimeout(1300); await klik('+ Leerling', { wacht: 900 }); await foto(p, '12-leerling-toevoegen', { heel: true }) })
await browser.close()
