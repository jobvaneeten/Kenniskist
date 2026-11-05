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
let teller = 100
async function beantwoord(route, wieRef) {
  const wie = wieRef.id
  const req = route.request(), url = new URL(req.url()), pad = url.pathname, m = req.method()
  const json = (data, status = 200, headers = {}) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...headers }, body: JSON.stringify(data) })
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
  if (pad.startsWith('/auth/v1/')) {
    if (pad.endsWith('/user')) return json(sessie(wie).user)
    if (pad.endsWith('/token')) { if (!wieRef.id && wieRef.inlogAls) wieRef.id = wieRef.inlogAls; return json(sessie(wieRef.id)) }
    if (pad.endsWith('/logout')) return route.fulfill({ status: 204 })
    return json({})
  }
  if (pad.startsWith('/rest/v1/rpc/')) return json(null)
  if (pad.startsWith('/rest/v1/')) {
    const tabel = pad.slice('/rest/v1/'.length)
    if (m !== 'GET' && m !== 'HEAD') {
      TABELLEN[tabel] = TABELLEN[tabel] ?? []
      let body = []; try { body = JSON.parse(req.postData() || '[]') } catch {}
      const lijst = Array.isArray(body) ? body : [body], een = (req.headers()['accept'] || '').includes('vnd.pgrst.object')
      let rijen = []
      if (m === 'POST') {
        rijen = lijst.map(r => ({ id: r.id ?? tabel.slice(0, 2).toUpperCase() + (++teller), school_id: 'S1', ...r }))
        if (tabel === 'opdrachten') rijen = rijen.map(r => ({ config: {}, volgorde: 0, ...r }))
        TABELLEN[tabel].push(...rijen)
        if (tabel === 'toewijzingen') rijen.forEach(t => { const o = TABELLEN.opdrachten.find(x => x.id === t.opdracht_id); if (o) TABELLEN.weektaak_voortgang.push({ opdracht_id: t.opdracht_id, leerling_id: t.leerling_id, weektaak_id: o.weektaak_id, doel_aantal: o.aantal, som_max: 0, som_score: 0, som_ms: 0, pogingen: 0, herkansingen: 0, afgerond: false }) })
      } else if (m === 'PATCH') {
        rijen = filter(TABELLEN[tabel], url.searchParams); rijen.forEach(r => Object.assign(r, lijst[0]))
      } else if (m === 'DELETE') {
        rijen = filter(TABELLEN[tabel], url.searchParams); TABELLEN[tabel] = TABELLEN[tabel].filter(r => !rijen.includes(r))
      }
      return een ? json(rijen[0] ?? null, 201) : json(rijen, 201)
    }
    if (!TABELLEN[tabel]) onbekend.add(tabel)
    let bron = TABELLEN[tabel] ?? []
    if (tabel === 'weektaken') bron = bron.map(w => ({ ...w, opdrachten: TABELLEN.opdrachten.filter(o => o.weektaak_id === w.id).map(o => ({ id: o.id, persoonlijk: o.config?.persoonlijk ?? null })) }))
    if (tabel === 'opdrachten') bron = bron.map(o => ({ ...o, weektaken: TABELLEN.weektaken.find(w => w.id === o.weektaak_id) }))
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
export async function pagina(browser, wie, { breed = 1280, hoog = 800, mobiel = false, video = null, inlogAls = null, init = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breed, height: hoog }, deviceScaleFactor: 1, isMobile: mobiel, hasTouch: mobiel, locale: 'nl-NL',
    ...(video ? { recordVideo: { dir: video, size: { width: breed, height: hoog } } } : {}) })
  const wieRef = { id: wie, inlogAls }
  await ctx.route(SB + '/**', (route) => beantwoord(route, wieRef))
  // de Worker (leerling aanmaken, wachtwoord resetten): doen alsof het lukt
  await ctx.route('**/api/**', (route) => {
    let b = {}; try { b = JSON.parse(route.request().postData() || '{}') } catch {}
    if (route.request().url().includes('leerling-aanmaken')) {
      const klas = TABELLEN.klassen.find(k => k.id === b.klasId)
      TABELLEN.profielen.push({ id: 'PN' + (++teller), rol: 'leerling', school_id: 'S1', klas_id: b.klasId, weergavenaam: b.voornaam + (b.achternaamLetter ? ' ' + b.achternaamLetter + '.' : ''), gebruikersnaam: b.gebruikersnaam, klassen: { code: klas?.code } })
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ klasCode: klas?.code, gebruikersnaam: b.gebruikersnaam }) })
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  for (const s of [].concat(init ?? [])) await ctx.addInitScript(s)
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
