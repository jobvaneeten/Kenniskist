// Het leerlingdeel: vrij oefenen, code, winkel (lootboxen), kledingkast en samen spelen.
import { start, pagina, foto, BASIS } from './demo.mjs'
const browser = await start()
const stap = async (naam, fn) => { try { await fn() } catch (e) { console.log('  ✗', naam, e.message.split('\n')[0]) } }
const portemonnee = () => {
  localStorage.setItem('kk_briefgeld', '850'); localStorage.setItem('kk_curuntie', '1240')
  if (!localStorage.getItem('kk_unlocked')) localStorage.setItem('kk_unlocked', JSON.stringify({ shirt: ['rood', 'blauw', 'geel'], broek: ['blauw'], schoenen: ['wit'] }))
  if (!localStorage.getItem('kk_shirt')) { localStorage.setItem('kk_shirt', 'rood'); localStorage.setItem('kk_wearing', JSON.stringify({ broek: 'blauw', schoenen: 'wit' })) }
}
const p = await pagina(browser, 'P71', { breed: 1180, hoog: 820, init: portemonnee })
const klik = async (loc, ms = 1200) => { await (typeof loc === 'string' ? p.getByText(loc, { exact: true }) : loc).first().click({ timeout: 6000 }); await p.waitForTimeout(ms) }
const thuis = async () => { await p.goto(BASIS + '/leerlingportaal'); await p.waitForTimeout(3500) }
if (!process.argv.includes('alleen-winkel')) await stap('vrij', async () => {
  await thuis(); await klik(p.locator('.btn-game'), 1800)
  await klik(p.locator('.year-card'), 1500); await foto(p, '110-vakken')
  await klik(p.locator('.subject-card', { hasText: 'Rekenen' }), 1500); await foto(p, '111-rekenen', { heel: true })
  await klik(p.getByText('Terug').first(), 1000)
  await klik(p.locator('.subject-card', { hasText: 'Taal' }), 1500); await foto(p, '112-taal')
})
if (!process.argv.includes('alleen-winkel')) await stap('code', async () => { await thuis(); await klik('Code invoeren', 1000); await foto(p, '113-code-invoeren') })
await stap('winkel', async () => {
  await thuis(); await klik(p.locator('.btn-shop'), 2500); await foto(p, '120-winkel')
  await klik(p.locator('.shopcard', { hasText: 'Shirt' }), 1500); await foto(p, '121-kist-details')
  await klik(p.locator('.shop-detail-panel button', { hasText: 'Openen' }).or(p.locator('.shop-detail-panel button').filter({ hasText: '100' })), 6000); await foto(p, '122-kist-dicht')
  for (let i = 0; i < 4; i++) { await p.mouse.click(590, 400); await p.waitForTimeout(900) }
  await p.waitForTimeout(5000); await foto(p, '123-kist-open')
})
await stap('kledingkast', async () => {
  await thuis(); await klik(p.locator('.btn-wardrobe'), 9000); await foto(p, '130-kledingkast')
  await klik(p.locator('button', { hasText: 'Broek' }), 2500); await foto(p, '131-kledingkast-broek')
  await klik('Speel een spel', 1200); await foto(p, '132-speel-een-spel')
  await klik(p.getByRole('button', { name: 'Paintball' }), 2500); await foto(p, '133-paintball-lobby')
})
await browser.close()
