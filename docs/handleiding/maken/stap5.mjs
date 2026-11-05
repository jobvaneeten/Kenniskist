import { start, pagina, foto, BASIS } from './demo.mjs'
const browser = await start()
const stap = async (naam, fn) => { try { await fn() } catch (e) { console.log('  ✗', naam, e.message.split('\n')[0]) } }
// ── ICT'er ──
let p = await pagina(browser, 'I1')
let klik = async (tekst, opties = {}) => { await p.getByText(tekst, { exact: !!opties.exact }).first().click({ timeout: 4000 }); await p.waitForTimeout(opties.wacht ?? 800) }
const home = async () => { await p.goto(BASIS + '/leerkrachtenportaal'); await p.waitForTimeout(1400) }
await stap('icter-leerkracht', async () => { await home(); await klik('+ Leerkracht'); await foto(p, '13-leerkracht-toevoegen', { heel: true }) })
await stap('icter-klas', async () => { await home(); await klik('+ Klas'); await foto(p, '14-klas-toevoegen', { heel: true }) })
await stap('icter-instellingen', async () => { await home(); await p.locator('.portaal-tandwiel').nth(1).click(); await p.waitForTimeout(1500); await foto(p, '15-klas-instellingen', { heel: true }) })
await stap('icter-als-leerkracht', async () => { await home(); await klik('Bekijk als leerkracht'); await foto(p, '16-icter-als-leerkracht') })
// wachtwoord resetten bij een leerling
p = await pagina(browser, 'L1'); klik = async (tekst, opties = {}) => { await p.getByText(tekst, { exact: !!opties.exact }).first().click({ timeout: 4000 }); await p.waitForTimeout(opties.wacht ?? 800) }
await stap('wachtwoord', async () => { await p.goto(BASIS + '/leerkrachtenportaal'); await p.waitForTimeout(1300); await klik('Groep 7a'); await p.locator('.portaal-tab-knop', { hasText: 'Leerlingen' }).first().click(); await p.waitForTimeout(900); await p.locator('button', { hasText: 'Noor' }).first().click(); await p.waitForTimeout(1500); await foto(p, '81-leerling-noor'); await klik('Wachtwoord resetten'); await foto(p, '82-wachtwoord-resetten') })

// ── leerling (iPad) ──
p = await pagina(browser, 'P71', { breed: 1180, hoog: 820 })
klik = async (tekst, opties = {}) => { await p.getByText(tekst, { exact: !!opties.exact }).first().click({ timeout: 5000 }); await p.waitForTimeout(opties.wacht ?? 1000) }
const thuis = async () => { await p.goto(BASIS + '/leerlingportaal'); await p.waitForTimeout(3500) }
await stap('ll-home', async () => { await thuis(); await foto(p, '90-leerling-start', { wacht: 1500 }); await foto(p, '90b-leerling-start-heel', { heel: true }) })
await stap('ll-weektaak', async () => { await thuis(); await klik('Mijn weektaak'); await foto(p, '91-mijn-weektaak'); await klik('Week 45'); await foto(p, '92-weektaak-opdrachten', { heel: true }) })
await stap('ll-oefening', async () => { await klik('Woordsoorten', { exact: true, wacht: 1500 }); await foto(p, '93-oefening-woordsoorten') ; await p.locator('.tv-answer-btn').first().click(); await p.waitForTimeout(500); await foto(p, '94-oefening-feedback') })
await stap('ll-lezen', async () => { await thuis(); await klik('Mijn weektaak'); await klik('Week 45'); await klik('Lezen met een timer', { wacht: 1500 }); await foto(p, '95-lezen-timer') })
await stap('ll-doelwerk', async () => { await thuis(); await klik('Mijn weektaak'); await klik('Week 45'); await klik('Werk aan je doelen', { wacht: 1500 }); await foto(p, '96-werk-aan-je-doelen') })
await stap('ll-speciaal', async () => { await thuis(); await klik('Speciaal voor mij'); await foto(p, '97-speciaal-taken'); await klik('Doelen', { exact: true }); await foto(p, '98-speciaal-doelen'); await klik('Taal', { exact: true }); await foto(p, '99-doelen-taal'); await klik('Komma bij opsommingen'); await foto(p, '100-doel-uitleg'); await klik('Start oefenen', { wacht: 1800 }); await foto(p, '101-doel-oefenen') })
await stap('ll-mijnweek', async () => { await thuis(); await klik('Mijn week'); await foto(p, '102-mijn-week', { wacht: 2000 }) })
await stap('ll-speelgame', async () => { await thuis(); await klik('Speel Game', { wacht: 2000 }); await foto(p, '103-speel-game') })
await browser.close()
