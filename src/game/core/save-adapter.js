// De enige plek in Sterrenveer die localStorage aanraakt. Alles daarboven praat
// met deze adapter.
//
// De sleutels beginnen met 'kk_', dus src/lib/voortgangSync.js pikt elke
// schrijfactie automatisch op en spiegelt die naar de Supabase-tabel
// game_voortgang. Er wordt hier bewust géén supabase-client geïmporteerd: het
// spel hoort niet te weten dat de cloud bestaat. Zie docs/SAVE-INTEGRATION.md.

import { CHARACTER_OP_ID, START_CHARACTER } from '../data/characters.js'
import { bonusVoor, ontleedLevelId, TOTAAL_STERREN } from '../data/werelden.js'

const SLEUTEL_VOORTGANG = 'kk_sv_progress'
const SLEUTEL_PORTEMONNEE = 'kk_sv_wallet'
const SLEUTEL_INSTELLINGEN = 'kk_sv_instellingen'
const VERSIE = 1

// ---------------------------------------------------------------------------
// Muntmasker: hex-string, 4 munten per teken. Bij 80 levels × 40 munten is dat
// ~1 KB voor het hele spel; als lijst met id's ("w1-l03-c17") zou het ~40 KB
// zijn die bij elke gepakte munt opnieuw de lijn over gaat.
// ---------------------------------------------------------------------------

export function maskerHeeft(masker, index) {
  if (!masker) return false
  const teken = masker[index >> 2]
  if (!teken) return false
  return (parseInt(teken, 16) & (1 << (index & 3))) !== 0
}

export function maskerZet(masker, index) {
  const pos = index >> 2
  const arr = (masker || '').padEnd(pos + 1, '0').split('')
  arr[pos] = ((parseInt(arr[pos], 16) || 0) | (1 << (index & 3))).toString(16)
  return arr.join('').replace(/0+$/, '')
}

export function maskerOf(a, b) {
  const n = Math.max(a?.length || 0, b?.length || 0)
  let uit = ''
  for (let i = 0; i < n; i++) {
    const x = parseInt(a?.[i] ?? '0', 16) || 0
    const y = parseInt(b?.[i] ?? '0', 16) || 0
    uit += (x | y).toString(16)
  }
  return uit.replace(/0+$/, '')
}

export function maskerTel(masker) {
  let n = 0
  for (const teken of masker || '') {
    const v = parseInt(teken, 16) || 0
    n += (v & 1) + ((v >> 1) & 1) + ((v >> 2) & 1) + ((v >> 3) & 1)
  }
  return n
}

// ---------------------------------------------------------------------------
// Lezen en schrijven
// ---------------------------------------------------------------------------

function lees(sleutel, standaard) {
  try {
    const ruw = localStorage.getItem(sleutel)
    if (!ruw) return structuredClone(standaard)
    const obj = JSON.parse(ruw)
    if (!obj || typeof obj !== 'object') return structuredClone(standaard)
    return obj
  } catch {
    return structuredClone(standaard)
  }
}

function schrijf(sleutel, waarde) {
  try {
    localStorage.setItem(sleutel, JSON.stringify(waarde))
  } catch {
    // Quota vol of storage geblokkeerd: het spel blijft speelbaar, alleen
    // zonder bewaren. Niet crashen middenin een level.
  }
}

const LEEG_VOORTGANG = { v: VERSIE, levels: {} }
const LEEG_PORTEMONNEE = { v: VERSIE, munten: 0, bezit: [START_CHARACTER], uitgerust: START_CHARACTER }
const LEEG_INSTELLINGEN = { v: VERSIE, muziek: 0.7, sfx: 0.9, shake: true }

export class Opslag {
  constructor() {
    this.voortgang = structuredClone(LEEG_VOORTGANG)
    this.portemonnee = structuredClone(LEEG_PORTEMONNEE)
    this.instellingen = structuredClone(LEEG_INSTELLINGEN)
    this.pending = null // { levelId, masker, aantal }
    this._luisteraar = null
  }

  // Wordt aangeroepen bij het openen van het spel en bij terugkeer naar een
  // menu. Merget wat er in localStorage staat over de eigen state heen; zie
  // docs/SAVE-INTEGRATION.md §6 voor de regels.
  laad() {
    const v = lees(SLEUTEL_VOORTGANG, LEEG_VOORTGANG)
    const p = lees(SLEUTEL_PORTEMONNEE, LEEG_PORTEMONNEE)
    const i = lees(SLEUTEL_INSTELLINGEN, LEEG_INSTELLINGEN)

    this.voortgang = { v: VERSIE, levels: mergeLevels(this.voortgang.levels, v.levels || {}) }
    this.portemonnee = {
      v: VERSIE,
      bezit: [...new Set([...(this.portemonnee.bezit || []), ...(p.bezit || []), START_CHARACTER])],
      uitgerust: p.uitgerust || this.portemonnee.uitgerust || START_CHARACTER,
      munten: 0,
    }
    if (!this.portemonnee.bezit.includes(this.portemonnee.uitgerust)) {
      this.portemonnee.uitgerust = START_CHARACTER
    }
    this.instellingen = { ...LEEG_INSTELLINGEN, ...i, v: VERSIE }
    this.herberekenSaldo()
    return this
  }

  // Het saldo is nooit een opgeteld getal dat we blind vertrouwen, maar altijd
  // afgeleid uit wat er aantoonbaar verdiend en uitgegeven is. Zo kan een merge
  // van twee apparaten geen geld verzinnen of laten verdampen.
  herberekenSaldo() {
    let verdiend = 0
    for (const [id, l] of Object.entries(this.voortgang.levels)) {
      verdiend += maskerTel(l.m)
      if (l.b) {
        const ontleed = ontleedLevelId(id)
        verdiend += ontleed ? bonusVoor(ontleed.index) : 0
      }
    }
    let uitgegeven = 0
    for (const id of this.portemonnee.bezit) {
      uitgegeven += CHARACTER_OP_ID[id]?.prijs ?? 0
    }
    this.portemonnee.munten = Math.max(0, verdiend - uitgegeven)
    return this.portemonnee.munten
  }

  bewaarAlles() {
    schrijf(SLEUTEL_VOORTGANG, this.voortgang)
    schrijf(SLEUTEL_PORTEMONNEE, this.portemonnee)
    schrijf(SLEUTEL_INSTELLINGEN, this.instellingen)
  }

  bewaarInstellingen() { schrijf(SLEUTEL_INSTELLINGEN, this.instellingen) }

  // --- Levels -------------------------------------------------------------

  level(id) {
    return this.voortgang.levels[id] ?? { c: 0, s: [0, 0, 0], t: 0, m: '', b: 0 }
  }

  isVoltooid(id) { return !!this.level(id).c }

  sterrenVan(id) { return this.level(id).s ?? [0, 0, 0] }

  totaalSterren() {
    let n = 0
    for (const l of Object.values(this.voortgang.levels)) {
      for (const s of l.s ?? []) if (s) n++
    }
    return n
  }

  totaalMuntenVerzameld() {
    let n = 0
    for (const l of Object.values(this.voortgang.levels)) n += maskerTel(l.m)
    return n
  }

  // Level N+1 opent na het voltooien van level N; wereld W+1 na de baas van W.
  isOntgrendeld(wereld, index) {
    if (wereld === 1 && index === 1) return true
    if (index > 1) return this.isVoltooid(`w${wereld}-l${String(index - 1).padStart(2, '0')}`)
    return this.isVoltooid(`w${wereld - 1}-l16`)
  }

  wereldOntgrendeld(wereld) { return this.isOntgrendeld(wereld, 1) }

  // --- Munten tijdens een poging -----------------------------------------

  startPoging(levelId) {
    this.pending = { levelId, masker: '', aantal: 0 }
  }

  // Geeft false terug als deze munt al definitief of al pending is: de
  // aanroeper weet dan dat het een geest-munt is (geen geluid, geen punten).
  pakMunt(index) {
    if (!this.pending) return false
    const id = this.pending.levelId
    if (maskerHeeft(this.level(id).m, index)) return false
    if (maskerHeeft(this.pending.masker, index)) return false
    this.pending.masker = maskerZet(this.pending.masker, index)
    this.pending.aantal++
    return true
  }

  isGeest(levelId, index) { return maskerHeeft(this.level(levelId).m, index) }

  // Binnen dezelfde poging blijft een gepakte munt gepakt, ook na een respawn.
  isPending(index) { return this.pending ? maskerHeeft(this.pending.masker, index) : false }

  pendingAantal() { return this.pending?.aantal ?? 0 }

  // Game over: de voorlopige munten vervallen en staan er bij een nieuwe poging
  // gewoon weer. Zo is er nooit dubbel geld, maar ook nooit verloren geld.
  vergeetPoging() { this.pending = null }

  // Haalt de finish: pending wordt definitief, sterren en bonus worden bepaald.
  voltooiLevel(levelId, { tijd, levensVerloren, muntenInLevel, doeltijd }) {
    const ontleed = ontleedLevelId(levelId)
    const oud = this.level(levelId)
    const nieuwMasker = maskerOf(oud.m, this.pending?.masker || '')
    const alles = maskerTel(nieuwMasker) >= muntenInLevel

    // Sterren zijn blijvend: eenmaal behaald blijven ze staan, ook als deze
    // poging slechter was.
    const behaald = [alles, levensVerloren === 0, tijd <= doeltijd]
    const sterren = behaald.map((nu, i) => (oud.s?.[i] || nu ? 1 : 0))
    const nieuweSterren = [0, 1, 2].filter((i) => sterren[i] && !oud.s?.[i])

    const bonusNu = oud.b ? 0 : bonusVoor(ontleed?.index ?? 1)
    const muntenNu = this.pending?.aantal ?? 0

    this.voortgang.levels[levelId] = {
      c: 1,
      s: sterren,
      t: oud.t ? Math.min(oud.t, tijd) : tijd,
      m: nieuwMasker,
      b: 1,
    }
    this.pending = null
    this.herberekenSaldo()
    this.bewaarAlles()

    return { muntenNu, bonusNu, sterren, nieuweSterren, persoonlijkRecord: !oud.t || tijd < oud.t }
  }

  // --- Winkel -------------------------------------------------------------

  bezit(id) { return this.portemonnee.bezit.includes(id) }

  isOntgrendeldCharacter(id) {
    const c = CHARACTER_OP_ID[id]
    if (!c) return false
    if (c.sterren) return this.totaalSterren() >= c.sterren
    return true
  }

  kanKopen(id) {
    const c = CHARACTER_OP_ID[id]
    if (!c || this.bezit(id)) return false
    if (c.sterren) return this.totaalSterren() >= c.sterren
    return this.portemonnee.munten >= c.prijs
  }

  koop(id) {
    if (!this.kanKopen(id)) return false
    this.portemonnee.bezit.push(id)
    this.herberekenSaldo()
    this.bewaarAlles()
    return true
  }

  rustUit(id) {
    if (!this.bezit(id)) return false
    this.portemonnee.uitgerust = id
    this.bewaarAlles()
    return true
  }

  get uitgerust() { return this.portemonnee.uitgerust }
  get munten() { return this.portemonnee.munten }
  get sterrenTotaal() { return this.totaalSterren() }
  get sterrenMax() { return TOTAAL_STERREN }
}

function mergeLevels(a, b) {
  const uit = {}
  for (const id of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    const x = a?.[id]
    const y = b?.[id]
    if (!x) { uit[id] = y; continue }
    if (!y) { uit[id] = x; continue }
    uit[id] = {
      c: x.c || y.c ? 1 : 0,
      s: [0, 1, 2].map((i) => (x.s?.[i] || y.s?.[i] ? 1 : 0)),
      t: Math.min(x.t || Infinity, y.t || Infinity) || 0,
      m: maskerOf(x.m, y.m),
      b: x.b || y.b ? 1 : 0,
    }
    if (uit[id].t === Infinity) uit[id].t = 0
  }
  return uit
}

// Eén gedeelde instantie; het spel heeft er nooit twee nodig en zo kan geen
// scherm per ongeluk met een oude kopie werken.
export const opslag = new Opslag()
