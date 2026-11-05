// Testomgeving voor de handleiding: de echte Kenniskist (vite op :5173), maar
// alle verkeer naar Supabase wordt hier onderschept en beantwoord met
// verzonnen proefgegevens. Er gaat niets naar de echte database.
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { TABELLEN, PROFIELEN } from './demo-data.mjs'
const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')

const REF = 'vbvtkzieyvdctlighgoj', SB = `https://${REF}.supabase.co`, BASIS = 'http://localhost:5173'
export const UIT = process.cwd() + '/docs/handleiding/plaatjes/'
mkdirSync(UIT, { recursive: true })

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
function sessie(id) {
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24
  const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: id, exp, role: 'authenticated', aud: 'authenticated' })}.nep`
  return { access_token: token, token_type: 'bearer', expires_in: 86400, expires_at: exp, refresh_token: 'nep-' + id,
    user: { id, aud: 'authenticated', role: 'authenticated', email: (PROFIELEN.find(p => p.id === id)?.email) || id + '@leerling.kenniskist.nl', app_metadata: {}, user_metadata: {}, created_at: '2026-09-01T00:00:00Z' } }
}

// ── een mini-PostgREST ──
function filter(rijen, params) {
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) continue
    let neg = false, w = v
    if (w.startsWith('not.')) { neg = true; w = w.slice(4) }
    const i = w.indexOf('.'), op = w.slice(0, i), val = w.slice(i + 1)
    const kol = k.split('->>')[0]
    const test = (rij) => {
      let x = rij[kol]
      if (k.includes('->>')) x = rij[kol]?.[k.split('->>')[1]]
      if (op === 'eq') return String(x) === val
      if (op === 'neq') return String(x) !== val
      if (op === 'in') return val.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/^"|"$/g, '')).includes(String(x))
      if (op === 'is') return val === 'null' ? x == null : String(x) === val
      if (op === 'gte') return String(x) >= val
      if (op === 'lte') return String(x) <= val
      if (op === 'gt') return String(x) > val
      if (op === 'lt') return String(x) < val
      return true
    }
    rijen = rijen.filter(rij => (neg ? !test(rij) : test(rij)))
  }
  const order = params.get('order')
  if (order) {
    const [kol, dir] = order.split(',')[0].split('.')
    rijen = [...rijen].sort((a, b) => (a[kol] > b[kol] ? 1 : a[kol] < b[kol] ? -1 : 0) * (dir === 'desc' ? -1 : 1))
  }
  const limit = params.get('limit'); if (limit) rijen = rijen.slice(0, +limit)
  return rijen
}
export const onbekend = new Set()
async function beantwoord(route, wie) {
  const req = route.request(), url = new URL(req.url()), pad = url.pathname, m = req.method()
  const json = (data, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...headers }, body: JSON.stringify(data) })
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
  if (pad.startsWith('/auth/v1/')) {
    if (pad.endsWith('/user')) return json(sessie(wie).user)
    if (pad.endsWith('/token')) return json(sessie(wie))
    if (pad.endsWith('/logout')) return route.fulfill({ status: 204 })
    return json({})
  }
  if (pad.startsWith('/rest/v1/rpc/')) return json(null)
  if (pad.startsWith('/rest/v1/')) {
    const tabel = pad.slice('/rest/v1/'.length)
    if (m !== 'GET' && m !== 'HEAD') return json([], 201)
    if (!TABELLEN[tabel]) onbekend.add(tabel)
    let bron = TABELLEN[tabel] ?? []
    // eenvoudige RLS: een leerkracht ziet alleen zijn eigen klas
    const ik = PROFIELEN.find(x => x.id === wie)
    if (ik && ik.rol === 'leerkracht') {
      const mijn = TABELLEN.klas_leerkrachten.filter(k => k.leerkracht_id === wie).map(k => k.klas_id)
      if (tabel === 'klassen') bron = bron.filter(k => mijn.includes(k.id))
      if (tabel === 'profielen') bron = bron.filter(x => x.rol !== 'leerling' || mijn.includes(x.klas_id))
    }
    const rijen = filter(bron, url.searchParams)
    const een = (req.headers()['accept'] || '').includes('vnd.pgrst.object')
    const range = { 'content-range': `0-${Math.max(0, rijen.length - 1)}/${rijen.length}` }
    if (een) return rijen.length ? json(rijen[0], 200, range) : json({ code: 'PGRST116', message: 'geen rij' }, 406)
    return json(rijen, 200, range)
  }
  return json({})
}

export async function start() {
  const browser = await chromium.launch()
  return browser
}
// Een pagina als `wie` (profiel-id, of null voor niet ingelogd), op `breed` × `hoog`.
export async function pagina(browser, wie, { breed = 1280, hoog = 800, mobiel = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: hoog }, deviceScaleFactor: 1, isMobile: mobiel, hasTouch: mobiel, locale: 'nl-NL' })
  await ctx.route(SB + '/**', (route) => beantwoord(route, wie))
  await ctx.route('**/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
  if (wie) {
    const p = PROFIELEN.find(x => x.id === wie)
    await ctx.addInitScript(([sleutel, s, profiel]) => {
      localStorage.setItem(sleutel, JSON.stringify(s))
      localStorage.setItem('kk_profiel_cache', JSON.stringify({ id: profiel.id, weergavenaam: profiel.weergavenaam, voorlezen: false, spelNa: null }))
      localStorage.setItem('kk_playername', profiel.weergavenaam)
    }, [`sb-${REF}-auth-token`, sessie(wie), p])
  }
  const page = await ctx.newPage()
  page.on('pageerror', e => console.log('  ! paginafout:', e.message))
  return page
}
export async function foto(page, naam, opties = {}) {
  await page.waitForTimeout(opties.wacht ?? 600)
  await page.screenshot({ path: UIT + naam + '.jpg', type: 'jpeg', quality: 82, fullPage: !!opties.heel, clip: opties.clip })
  console.log('  📷', naam)
}
export { BASIS }
