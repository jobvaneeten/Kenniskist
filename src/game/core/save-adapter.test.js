import { describe, it, expect, beforeEach } from 'vitest'

// De adapter praat alleen met localStorage; in Node bestaat die niet, dus hier
// een minimale stub. Bewust géén supabase-mock: de adapter hoort die laag niet
// te kennen (zie docs/SAVE-INTEGRATION.md).
class LokaleOpslag {
  constructor() { this.data = new Map() }
  getItem(k) { return this.data.has(k) ? this.data.get(k) : null }
  setItem(k, v) { this.data.set(k, String(v)) }
  removeItem(k) { this.data.delete(k) }
  clear() { this.data.clear() }
}
globalThis.localStorage = new LokaleOpslag()

const { Opslag, maskerHeeft, maskerZet, maskerOf, maskerTel } = await import('./save-adapter.js')
const { CHARACTER_OP_ID } = await import('../data/characters.js')

describe('muntmasker', () => {
  it('zet en leest losse bits', () => {
    let m = ''
    expect(maskerHeeft(m, 0)).toBe(false)
    m = maskerZet(m, 0)
    expect(maskerHeeft(m, 0)).toBe(true)
    expect(maskerHeeft(m, 1)).toBe(false)
    m = maskerZet(m, 37)
    expect(maskerHeeft(m, 37)).toBe(true)
    expect(maskerTel(m)).toBe(2)
  })

  it('blijft correct over veel munten heen', () => {
    let m = ''
    const gezet = [0, 1, 3, 4, 15, 16, 31, 39, 40, 59]
    for (const i of gezet) m = maskerZet(m, i)
    for (let i = 0; i < 60; i++) {
      expect(maskerHeeft(m, i)).toBe(gezet.includes(i))
    }
    expect(maskerTel(m)).toBe(gezet.length)
  })

  it('mergen is een bitwise OR, dus nooit verlies', () => {
    const a = maskerZet(maskerZet('', 0), 9)
    const b = maskerZet(maskerZet('', 4), 9)
    const c = maskerOf(a, b)
    expect(maskerTel(c)).toBe(3)
    for (const i of [0, 4, 9]) expect(maskerHeeft(c, i)).toBe(true)
  })

  it('is compact: 40 munten passen in 10 tekens', () => {
    let m = ''
    for (let i = 0; i < 40; i++) m = maskerZet(m, i)
    expect(m.length).toBe(10)
  })
})

describe('pending munten', () => {
  let o
  beforeEach(() => {
    localStorage.clear()
    o = new Opslag().laad()
    o.startPoging('w1-l01')
  })

  it('telt elke munt maar één keer binnen een poging', () => {
    expect(o.pakMunt(3)).toBe(true)
    expect(o.pakMunt(3)).toBe(false)
    expect(o.pendingAantal()).toBe(1)
  })

  it('houdt gepakte munten vast na een respawn binnen dezelfde poging', () => {
    o.pakMunt(0)
    o.pakMunt(1)
    // Respawn = geen vergeetPoging(); de pending-lijst blijft staan.
    expect(o.isPending(0)).toBe(true)
    expect(o.isPending(2)).toBe(false)
  })

  it('laat de munten vervallen bij game over', () => {
    o.pakMunt(0)
    o.vergeetPoging()
    expect(o.pendingAantal()).toBe(0)
    o.startPoging('w1-l01')
    expect(o.pakMunt(0)).toBe(true)
  })

  it('maakt eerder gepakte munten tot geest-munten die niets opleveren', () => {
    o.pakMunt(0)
    o.pakMunt(1)
    o.voltooiLevel('w1-l01', { tijd: 40, levensVerloren: 0, muntenInLevel: 10, doeltijd: 60 })

    expect(o.isGeest('w1-l01', 0)).toBe(true)
    expect(o.isGeest('w1-l01', 5)).toBe(false)

    const saldo = o.munten
    o.startPoging('w1-l01')
    expect(o.pakMunt(0)).toBe(false) // geest: levert niets op
    expect(o.pakMunt(5)).toBe(true)
    o.voltooiLevel('w1-l01', { tijd: 40, levensVerloren: 0, muntenInLevel: 10, doeltijd: 60 })
    expect(o.munten).toBe(saldo + 1)
  })
})

describe('voltooien, sterren en bonus', () => {
  let o
  beforeEach(() => {
    localStorage.clear()
    o = new Opslag().laad()
  })

  it('betaalt de voltooiingsbonus maar één keer uit', () => {
    o.startPoging('w1-l01')
    const eerste = o.voltooiLevel('w1-l01', { tijd: 40, levensVerloren: 0, muntenInLevel: 10, doeltijd: 60 })
    expect(eerste.bonusNu).toBe(25)

    o.startPoging('w1-l01')
    const tweede = o.voltooiLevel('w1-l01', { tijd: 40, levensVerloren: 0, muntenInLevel: 10, doeltijd: 60 })
    expect(tweede.bonusNu).toBe(0)
  })

  it('geeft de baasbonus van 100 voor level 16', () => {
    o.startPoging('w1-l16')
    const r = o.voltooiLevel('w1-l16', { tijd: 100, levensVerloren: 1, muntenInLevel: 20, doeltijd: 180 })
    expect(r.bonusNu).toBe(100)
  })

  it('kent de drie sterren onafhankelijk toe', () => {
    o.startPoging('w1-l01')
    // Traag en met schade: alleen de muntster kan nog.
    for (let i = 0; i < 3; i++) o.pakMunt(i)
    const r = o.voltooiLevel('w1-l01', { tijd: 99, levensVerloren: 1, muntenInLevel: 3, doeltijd: 60 })
    expect(r.sterren).toEqual([1, 0, 0])

    // Tweede poging: snel en zonder schade, munten waren er al.
    o.startPoging('w1-l01')
    const r2 = o.voltooiLevel('w1-l01', { tijd: 30, levensVerloren: 0, muntenInLevel: 3, doeltijd: 60 })
    expect(r2.sterren).toEqual([1, 1, 1])
    expect(o.totaalSterren()).toBe(3)
  })

  it('houdt behaalde sterren vast bij een slechtere poging', () => {
    o.startPoging('w1-l02')
    o.voltooiLevel('w1-l02', { tijd: 10, levensVerloren: 0, muntenInLevel: 0, doeltijd: 60 })
    o.startPoging('w1-l02')
    const r = o.voltooiLevel('w1-l02', { tijd: 999, levensVerloren: 3, muntenInLevel: 0, doeltijd: 60 })
    expect(r.sterren).toEqual([1, 1, 1])
  })

  it('bewaart de beste tijd, niet de laatste', () => {
    o.startPoging('w1-l01')
    o.voltooiLevel('w1-l01', { tijd: 42.5, levensVerloren: 0, muntenInLevel: 0, doeltijd: 60 })
    o.startPoging('w1-l01')
    o.voltooiLevel('w1-l01', { tijd: 88, levensVerloren: 0, muntenInLevel: 0, doeltijd: 60 })
    expect(o.level('w1-l01').t).toBe(42.5)
  })
})

describe('ontgrendeling', () => {
  let o
  beforeEach(() => {
    localStorage.clear()
    o = new Opslag().laad()
  })

  it('opent 1-1 altijd en de rest pas na het vorige level', () => {
    expect(o.isOntgrendeld(1, 1)).toBe(true)
    expect(o.isOntgrendeld(1, 2)).toBe(false)
    o.startPoging('w1-l01')
    o.voltooiLevel('w1-l01', { tijd: 10, levensVerloren: 0, muntenInLevel: 0, doeltijd: 60 })
    expect(o.isOntgrendeld(1, 2)).toBe(true)
    expect(o.isOntgrendeld(1, 3)).toBe(false)
  })

  it('opent wereld 2 pas na de baas van wereld 1', () => {
    expect(o.wereldOntgrendeld(2)).toBe(false)
    o.startPoging('w1-l16')
    o.voltooiLevel('w1-l16', { tijd: 10, levensVerloren: 0, muntenInLevel: 0, doeltijd: 180 })
    expect(o.wereldOntgrendeld(2)).toBe(true)
  })
})

describe('portemonnee', () => {
  let o
  beforeEach(() => {
    localStorage.clear()
    o = new Opslag().laad()
  })

  it('leidt het saldo af uit munten en bonussen, niet uit een opgeteld getal', () => {
    o.startPoging('w1-l01')
    for (let i = 0; i < 7; i++) o.pakMunt(i)
    o.voltooiLevel('w1-l01', { tijd: 10, levensVerloren: 0, muntenInLevel: 10, doeltijd: 60 })
    expect(o.munten).toBe(7 + 25)
  })

  it('trekt de prijs van gekochte characters af en gaat nooit negatief', () => {
    o.startPoging('w1-l01')
    for (let i = 0; i < 40; i++) o.pakMunt(i)
    o.voltooiLevel('w1-l01', { tijd: 10, levensVerloren: 0, muntenInLevel: 40, doeltijd: 60 })
    const voor = o.munten
    expect(o.kanKopen('bolt')).toBe(voor >= CHARACTER_OP_ID.bolt.prijs)
    expect(o.kanKopen('echo')).toBe(false) // veel te duur
    expect(o.munten).toBeGreaterThanOrEqual(0)
  })

  it('vergrendelt sterren-characters tot het sterrentotaal gehaald is', () => {
    expect(o.isOntgrendeldCharacter('astra')).toBe(false)
    expect(o.kanKopen('astra')).toBe(false)
  })

  it('rust alleen characters uit die je bezit', () => {
    expect(o.rustUit('bolt')).toBe(false)
    expect(o.uitgerust).toBe('pip')
  })
})

describe('samenvoegen van twee apparaten', () => {
  it('verenigt munten en sterren en herberekent het saldo', () => {
    localStorage.clear()

    // Apparaat A: level 1 gehaald met munt 0 en 1.
    const a = new Opslag().laad()
    a.startPoging('w1-l01')
    a.pakMunt(0)
    a.pakMunt(1)
    a.voltooiLevel('w1-l01', { tijd: 90, levensVerloren: 2, muntenInLevel: 10, doeltijd: 60 })

    // Apparaat B start met dezelfde cloudstand maar pakt andere munten en
    // haalt de tijdster. Dat is de situatie na een merge: laad() legt de
    // opgeslagen stand over de stand in geheugen heen.
    const b = new Opslag()
    b.voortgang.levels['w1-l01'] = { c: 1, s: [0, 0, 1], t: 30, m: '4', b: 1 } // munt 2
    b.laad()

    const l = b.level('w1-l01')
    expect(maskerTel(l.m)).toBe(3)      // unie van {0,1} en {2}
    expect(l.s).toEqual([0, 0, 1])      // OR van de sterren
    expect(l.t).toBe(30)                // beste tijd wint
    expect(b.munten).toBe(3 + 25)       // 3 munten + één keer de bonus
  })
})
