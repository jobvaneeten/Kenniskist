import { describe, it, expect, vi, beforeEach } from 'vitest'

// Nep-browser: een localStorage waarvan Object.keys de sleutels geeft (zoals
// echt), plus lege document/window zodat de module zijn patch kan zetten.
function maakStorage() {
  class Storage {
    getItem(k) { return Object.prototype.hasOwnProperty.call(this, k) ? this[k] : null }
    setItem(k, v) { this[k] = String(v) }
    removeItem(k) { delete this[k] }
  }
  globalThis.Storage = Storage
  globalThis.localStorage = new Storage()
}
globalThis.document = { addEventListener() {}, visibilityState: 'visible' }
globalThis.window = { addEventListener() {}, location: {} }

// Nep-Supabase: houdt bij wat er verstuurd is en kan een fout teruggeven.
let server, verstuurd, fout, sessie
function tabel() {
  const q = {
    upsert(rijen) { verstuurd.push(...rijen.map((r) => r.sleutel)); if (!fout) rijen.forEach((r) => { server[r.sleutel] = r.data }); return Promise.resolve({ error: fout }) },
    delete() { q._del = true; return q },
    select() { return q },
    eq() { return q },
    in(_k, lijst) { if (!fout) lijst.forEach((k) => delete server[k]); return Promise.resolve({ error: fout }) },
    then(ok, f) { return Promise.resolve({ data: Object.entries(server).map(([sleutel, data]) => ({ sleutel, data })), error: null }).then(ok, f) },
  }
  return q
}
vi.mock('./supabase.js', () => ({
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_ANON: 'anon',
  supabase: {
    from: () => tabel(),
    auth: {
      getSession: () => Promise.resolve({ data: { session: sessie } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}))

let sync
beforeEach(async () => {
  vi.useFakeTimers()
  maakStorage()
  vi.resetModules()
  server = {}; verstuurd = []; fout = null; sessie = { user: { id: 'kind-1' }, access_token: 't' }
  sync = await import('./voortgangSync.js')
})

describe('voortgang opslaan', () => {
  it('slaat ook de munten van Doodle Sprong en Meteoorvlucht op', async () => {
    localStorage.setItem('kk_actieve_leerling', 'kind-1')
    localStorage.setItem('ds_munten', '120')
    localStorage.setItem('mv_munten', '40')
    expect(await sync.flush()).toBe(true)
    expect(server).toEqual({ ds_munten: '120', mv_munten: '40' })
  })

  it('synct geen apparaat-instellingen of de eigen wachtrij', async () => {
    localStorage.setItem('kk_actieve_leerling', 'kind-1')
    localStorage.setItem('kk_lootbox_muted', '1')
    localStorage.setItem('ander_spel', '1')
    expect(sync.heeftOngesyncteWijzigingen()).toBe(false)
  })

  it('gooit niets weg als opslaan mislukt, en probeert het opnieuw', async () => {
    localStorage.setItem('kk_actieve_leerling', 'kind-1')
    localStorage.setItem('kk_curuntie', '500')
    fout = { message: 'offline' }
    expect(await sync.flush()).toBe(false)
    expect(sync.heeftOngesyncteWijzigingen()).toBe(true)
    expect(JSON.parse(localStorage.getItem('kk_sync_wachtrij')).schrijf).toContain('kk_curuntie')
    // internet terug: de geplande nieuwe poging slaat alsnog op
    fout = null
    await vi.advanceTimersByTimeAsync(3000)
    expect(server.kk_curuntie).toBe('500')
    expect(sync.heeftOngesyncteWijzigingen()).toBe(false)
    expect(localStorage.getItem('kk_sync_wachtrij')).toBe(null)
  })

  it('vinkt een sleutel die tijdens het versturen verandert niet af', async () => {
    localStorage.setItem('kk_actieve_leerling', 'kind-1')
    localStorage.setItem('kk_curuntie', '1')
    const bezig = sync.flush()
    localStorage.setItem('kk_curuntie', '2')
    await bezig
    expect(sync.heeftOngesyncteWijzigingen()).toBe(true)
    await sync.flush()
    expect(server.kk_curuntie).toBe('2')
  })

  it('verwijdert ook op de server wat lokaal weg is', async () => {
    localStorage.setItem('kk_actieve_leerling', 'kind-1')
    server.kk_oud = '"x"'
    localStorage.setItem('kk_oud', '"x"')
    await sync.flush()
    localStorage.removeItem('kk_oud')
    await sync.flush()
    expect(server.kk_oud).toBeUndefined()
  })

  it('stuurt in gastmodus niets', async () => {
    localStorage.setItem('kk_curuntie', '9')
    expect(await sync.flush()).toBe(true)
    expect(verstuurd).toEqual([])
  })
})

describe('voortgang laden bij het opstarten', () => {
  it('haalt de voortgang van de server op', async () => {
    server = { kk_curuntie: '300', td_neon: '{"open":2}' }
    expect(await sync.hydrateer()).toBe(2)
    expect(localStorage.getItem('kk_curuntie')).toBe('300')
    expect(localStorage.getItem('kk_actieve_leerling')).toBe('kind-1')
    expect(sync.heeftOngesyncteWijzigingen()).toBe(false)
  })

  it('overschrijft geen nieuwere voortgang die vorige keer niet aankwam', async () => {
    // vorige sessie: munten verdiend, maar opslaan mislukte en de tab ging dicht
    localStorage.setItem('kk_actieve_leerling', 'kind-1')
    fout = { message: 'offline' }
    localStorage.setItem('kk_curuntie', '900')
    await sync.flush()
    // herstart: de server heeft nog de oude stand
    fout = null
    server = { kk_curuntie: '100', kk_shirt: 'rood' }
    vi.resetModules()
    sync = await import('./voortgangSync.js')
    await sync.hydrateer()
    expect(localStorage.getItem('kk_curuntie')).toBe('900')
    expect(localStorage.getItem('kk_shirt')).toBe('rood')
    // en de nieuwere stand gaat alsnog naar de server
    await sync.flush()
    expect(server.kk_curuntie).toBe('900')
  })

  it('overschrijft niet wat al veranderd is als de server traag antwoordt', async () => {
    localStorage.setItem('kk_actieve_leerling', 'kind-1')
    server = { kk_curuntie: '100', kk_shirt: 'rood' }
    localStorage.setItem('kk_curuntie', '150')   // al gespeeld voordat het antwoord kwam
    await sync.hydrateer()
    expect(localStorage.getItem('kk_curuntie')).toBe('150')
    expect(localStorage.getItem('kk_shirt')).toBe('rood')
  })

  it('wist de voortgang van een ander kind op een gedeeld apparaat', async () => {
    localStorage.setItem('kk_actieve_leerling', 'kind-2')
    localStorage.setItem('kk_curuntie', '777')
    localStorage.setItem('kk_sync_wachtrij', JSON.stringify({ leerling: 'kind-2', schrijf: ['kk_curuntie'], verwijder: [] }))
    server = { kk_shirt: 'blauw' }
    await sync.hydrateer()
    expect(localStorage.getItem('kk_curuntie')).toBe(null)
    expect(localStorage.getItem('kk_shirt')).toBe('blauw')
    await sync.flush()
    expect(server.kk_curuntie).toBeUndefined()
  })

  it('bewaart onopgeslagen voortgang als de sessie verlopen is', async () => {
    sessie = null
    localStorage.setItem('kk_actieve_leerling', 'kind-1')
    localStorage.setItem('kk_curuntie', '50')
    localStorage.setItem('kk_sync_wachtrij', JSON.stringify({ leerling: 'kind-1', schrijf: ['kk_curuntie'], verwijder: [] }))
    await sync.hydrateer()
    expect(localStorage.getItem('kk_curuntie')).toBe('50')
  })

  it('wist een verlopen sessie zonder openstaande voortgang', async () => {
    sessie = null
    localStorage.setItem('kk_actieve_leerling', 'kind-1')
    localStorage.setItem('kk_curuntie', '50')
    // de wachtrij is na de setItem hierboven gevuld; doe alsof hij al was opgeslagen
    localStorage.removeItem('kk_sync_wachtrij')
    await sync.hydrateer()
    expect(localStorage.getItem('kk_curuntie')).toBe(null)
  })
})
