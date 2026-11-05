import { start, pagina, foto, BASIS } from './demo.mjs'
const browser = await start()
const stap = async (naam, fn) => { try { await fn() } catch (e) { console.log('  ✗', naam, e.message.split('\n')[0]) } }
const p = await pagina(browser, 'P71', { breed: 1180, hoog: 820 })
const klik = async (tekst, opties = {}) => { await p.getByText(tekst, { exact: !!opties.exact }).first().click({ timeout: 5000 }); await p.waitForTimeout(opties.wacht ?? 1000) }
if (false) await stap('vakken', async () => { await p.goto(BASIS + '/leerlingportaal'); await p.waitForTimeout(3500); await klik('Speel Game', { wacht: 1800 }); await klik('GROEP', { wacht: 1500 }); await foto(p, '104-vakken') ; await klik('Taal', { exact: true, wacht: 1500 }); await foto(p, '105-taal-onderdelen') })
await stap('beloning', async () => {
  await p.goto(BASIS + '/leerlingportaal'); await p.waitForTimeout(2500)
  await p.evaluate(async () => { (await import('/src/_demo/beloning.jsx')).toon() })
  await foto(p, '106-spelletje-kiezen', { wacht: 1800 })
})
await browser.close()
