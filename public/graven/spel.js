/* Diepgravers — motor. Zie docs/graafspel/PROMPT.md voor het waarom.
 *
 * Opbouw van dit bestand:
 *   1. opslag        kk_gr_* in localStorage (spiegelt vanzelf naar Supabase)
 *   2. wereld        elke duik een verse schacht
 *   3. speler        rijden, stijgen, boren
 *   4. gevaren       gas, lava, vallend gesteente, hitte, de Magmaworm
 *   5. tekenen       alles in code, koplamp met duisternis eromheen
 *   6. schermen      uitleg, basis/werkplaats, dood, slot, winst
 *   7. invoer + lus
 *
 * De harde regel uit de opdracht, hier op één plek: doodgaan zet de duiken op
 * 0 en gooit de lading weg (zie gaDood). Er is geen bijtanken onder de grond —
 * zoek in dit bestand niet voor niets naar een brandstoftegel, die bestaat
 * niet.
 */
(function () {
  'use strict'

  // ── 1. Opslag ───────────────────────────────────────────────────────────
  // Prefix kk_ betekent: voortgangSync.js spiegelt dit naar game_voortgang, dus
  // de upgrades gaan mee naar een ander apparaat. Niets extra's voor nodig.
  function lees(sleutel, standaard) {
    try {
      const v = localStorage.getItem(sleutel)
      return v === null ? standaard : JSON.parse(v)
    } catch { return standaard }
  }
  function schrijf(sleutel, waarde) {
    try { localStorage.setItem(sleutel, JSON.stringify(waarde)) } catch { /* privémodus */ }
  }

  const STANDAARD_UPGRADES = { boor: 1, tank: 1, laadruim: 1, romp: 1, motor: 1 }

  const opslag = {
    duiken: Math.max(0, Math.min(MAX_DUIKEN, lees('kk_gr_duiken', 0) | 0)),
    erts: Math.max(0, lees('kk_gr_erts', 0) | 0),
    upgrades: Object.assign({}, STANDAARD_UPGRADES, lees('kk_gr_upgrades', null) || {}),
    record: Math.max(0, lees('kk_gr_diepte', 0) | 0),
    uitleg: lees('kk_gr_uitleg', 0) | 0,
    baas: !!lees('kk_gr_baas', false),
    wereld: lees('kk_gr_wereld', 'oude-mijn'),
    lak: lees('kk_gr_lak', 'staal'),
    // Wat je gekocht hebt. De eerste van elk is gratis en heb je altijd.
    bezit: Object.assign({ werelden: ['oude-mijn'], lakken: ['staal'] }, lees('kk_gr_bezit', null) || {}),
  }
  function bewaar() {
    schrijf('kk_gr_duiken', opslag.duiken)
    schrijf('kk_gr_erts', opslag.erts)
    schrijf('kk_gr_upgrades', opslag.upgrades)
    schrijf('kk_gr_diepte', opslag.record)
    schrijf('kk_gr_uitleg', opslag.uitleg)
    schrijf('kk_gr_baas', opslag.baas)
    schrijf('kk_gr_wereld', opslag.wereld)
    schrijf('kk_gr_lak', opslag.lak)
    schrijf('kk_gr_bezit', opslag.bezit)
  }

  const niveau = (sleutel) => Math.max(1, Math.min(8, opslag.upgrades[sleutel] | 0 || 1))
  const spoorVan = (sleutel) => SPOREN.find(s => s.sleutel === sleutel)

  const maxBrandstof = () => spoorVan('tank').liters[niveau('tank') - 1]
  const maxLading = () => spoorVan('laadruim').plekken[niveau('laadruim') - 1]
  const maxRomp = () => spoorVan('romp').schade[niveau('romp') - 1]
  const boorTempo = () => spoorVan('boor').tempo[niveau('boor') - 1]
  const rijKracht = () => spoorVan('motor').rij[niveau('motor') - 1]
  const stijgKracht = () => spoorVan('motor').stijg[niveau('motor') - 1]
  const hitteSchade = () => spoorVan('koeling').hitte[niveau('koeling') - 1]
  const lampStraal = () => spoorVan('koplamp').straal[niveau('koplamp') - 1]
  const magneetStraal = () => spoorVan('magneet').straal[niveau('magneet') - 1]
  const radarStraal = () => spoorVan('radar').straal[niveau('radar') - 1]
  const handelBonus = () => spoorVan('handelaar').bonus[niveau('handelaar') - 1]
  const gelukFactor = () => spoorVan('geluk').factor[niveau('geluk') - 1]
  const demping = () => spoorVan('schokdemper').demping[niveau('schokdemper') - 1]

  // ── Wereld en lak ───────────────────────────────────────────────────────
  // De lagen zijn overal hetzelfde diep en even hard; alleen hun kleur komt uit
  // de wereld waarin je graaft. Eén plek waar dat vandaan komt, zodat het
  // tekenwerk er verder niets van hoeft te weten.
  const wereldNu = () => WERELDEN.find(w => w.key === opslag.wereld) || WERELDEN[0]
  const lakNu = () => LAKKEN.find(l => l.key === opslag.lak) || LAKKEN[0]
  const laagKleur = (i) => wereldNu().lagen[i][0]
  const laagAder = (i) => wereldNu().lagen[i][1]
  const kleurVan = (laag) => laagKleur(LAGEN.indexOf(laag))
  const aderVan = (laag) => laagAder(LAGEN.indexOf(laag))
  const heeft = (soort, key) => (opslag.bezit[soort] || []).includes(key)

  // Hoe diep je met je huidige boor mag komen: de eerste laag die je niet aankunt.
  function diepsteLaag() {
    let laatste = LAGEN[0]
    for (const l of LAGEN) { if (l.boor <= niveau('boor')) laatste = l; else break }
    return laatste
  }

  // ── Modus ───────────────────────────────────────────────────────────────
  // ?terug=1 = vrij spelen (eigen menuknop). Zonder parameter draait het als
  // beloning na een oefening: dán pas krijg je je drie duiken.
  const vrijSpelen = new URLSearchParams(location.search).has('terug')
  if (!vrijSpelen) {
    // Aanvullen tot drie, niet optellen: door te spelen kom je dus nooit boven
    // de drie uit. Een hoger saldo uit de code 0001 blijft wel staan.
    opslag.duiken = Math.max(opslag.duiken, DUIKEN_PER_BELONING)
    bewaar()
  }

  // ── Elementen ───────────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id)
  const doek = $('doek')
  const ctx = doek.getContext('2d')
  const schermen = ['uitleg', 'basis', 'dood', 'slot', 'winst']
  let meldTimer = 0

  function toon(naam) {
    schermen.forEach(s => $(s).classList.toggle('aan', s === naam))
    const duikt = naam === null
    $('hud').classList.toggle('aan', duikt)
    $('tikken').classList.toggle('aan', duikt && aanraakbaar)
    // Het canvas blijft altijd staan: tijdens een duik is het het spel, en in
    // de menu's tekent het de mijnbasis onder de sterrenhemel als achtergrond.
    document.body.classList.toggle('in-menu', !duikt)
    // Een waarschuwing van tijdens de duik ("brandstof raakt op") mag niet
    // over het doodscherm blijven hangen.
    if (!duikt) { $('waarschuwing').classList.remove('aan'); meldTimer = 0 }
    if (!duikt) { $('stoppen').hidden = true; $('stop-chip').hidden = true }
    if (duikt) stopMenuBeeld()
    else startMenuBeeld()
  }

  // ── 2. Wereld ───────────────────────────────────────────────────────────
  const BREEDTE = KOLOMMEN * TEGEL
  const HOOGTE = RIJEN * TEGEL
  let cellen = new Uint8Array(KOLOMMEN * RIJEN)
  let ertsen = new Uint8Array(KOLOMMEN * RIJEN)

  const idx = (c, r) => r * KOLOMMEN + c
  const binnen = (c, r) => c >= 0 && c < KOLOMMEN && r >= 0 && r < RIJEN
  function cel(c, r) {
    if (r < 0) return LEEG             // lucht boven de grond
    if (!binnen(c, r)) return MUUR
    return cellen[idx(c, r)]
  }
  const vast = (t) => t === GROND || t === ERTS || t === LOS || t === MUUR || t === KERN
  const laagVanRij = (r) => {
    const m = r * METER_PER_RIJ
    for (let i = LAGEN.length - 1; i >= 0; i--) if (m >= LAGEN[i].vanaf) return LAGEN[i]
    return LAGEN[0]
  }

  function bouwWereld() {
    cellen = new Uint8Array(KOLOMMEN * RIJEN)
    ertsen = new Uint8Array(KOLOMMEN * RIJEN)
    for (let r = 0; r < RIJEN; r++) {
      const laag = laagVanRij(r)
      for (let c = 0; c < KOLOMMEN; c++) {
        const i = idx(c, r)
        if (c === 0 || c === KOLOMMEN - 1) { cellen[i] = MUUR; continue }
        if (r < 2) { cellen[i] = GROND; continue }   // dichte deklaag: je moet je erin boren
        const w = Math.random()
        let t = GROND
        if (w < laag.lava) t = LAVA
        else if (w < laag.lava + laag.gas) t = GAS
        else if (w < laag.lava + laag.gas + laag.los) t = LOS
        else if (w < laag.lava + laag.gas + laag.los + laag.dichtheid * gelukFactor()) { t = ERTS; ertsen[i] = laag.erts }
        cellen[i] = t
      }
    }
    holtes()
    baaskamer()
  }

  // Een paar natuurlijke holtes per laag: geeft de schacht afwisseling en maakt
  // vallen soms sneller dan graven.
  function holtes() {
    for (let n = 0; n < 90; n++) {
      let c = 2 + Math.floor(Math.random() * (KOLOMMEN - 4))
      let r = 6 + Math.floor(Math.random() * (RIJEN - 20))
      const lengte = 4 + Math.floor(Math.random() * 9)
      for (let i = 0; i < lengte; i++) {
        for (let dc = 0; dc <= 1; dc++) {
          const cc = c + dc
          if (cc > 0 && cc < KOLOMMEN - 1 && binnen(cc, r) && cellen[idx(cc, r)] !== LAVA) cellen[idx(cc, r)] = LEEG
        }
        c += Math.random() < 0.5 ? -1 : 1
        if (Math.random() < 0.55) r += 1
        c = Math.max(1, Math.min(KOLOMMEN - 3, c))
        if (r >= RIJEN - 6) break
      }
    }
  }

  // Onderin: een open kamer met los gesteente in het plafond — je enige wapen
  // tegen de Magmaworm — en de Sterrenkern op de bodem.
  function baaskamer() {
    const top = RIJEN - 14
    for (let r = top; r < RIJEN; r++) {
      for (let c = 1; c < KOLOMMEN - 1; c++) {
        const i = idx(c, r)
        cellen[i] = LEEG
        if (r === top && c % 3 === 1) cellen[i] = LOS
        if (r === top + 4 && c % 4 === 2) cellen[i] = LOS
        if (r === RIJEN - 1) cellen[i] = GROND
      }
    }
    const midden = Math.floor(KOLOMMEN / 2)
    cellen[idx(midden, RIJEN - 2)] = KERN
  }

  // ── 3. Speler ───────────────────────────────────────────────────────────
  const sp = {
    x: 0, y: 0, vx: 0, vy: 0, w: 26, h: 22, onderGeweest: false,
    brandstof: 0, romp: 0, lading: [], kijk: 1,
    boorRichting: null, boorVoortgang: 0, boorHoek: 0,
    raakCooldown: 0, schud: 0,
  }
  const ZWAARTE = 1500
  const STUWKRACHT = 4200   // moet boven ZWAARTE liggen, anders kom je niet los
  const MAX_VAL = 900

  // Welke laag je het laatst binnenkwam, zodat we één keer een banner tonen.
  let laatsteLaag = -1

  function startDuik() {
    if (opslag.duiken <= 0) { toon('slot'); return }
    opslag.duiken--
    bewaar()
    bouwWereld()
    sp.x = BREEDTE / 2
    sp.y = -sp.h / 2 - 2
    sp.vx = sp.vy = 0
    sp.brandstof = maxBrandstof()
    sp.romp = maxRomp()
    sp.lading = []
    sp.boorRichting = null; sp.boorVoortgang = 0
    sp.raakCooldown = 0; sp.schud = 0
    sp.onderGeweest = false
    duikOpbrengst = 0
    laatsteLaag = -1
    vallers.length = 0
    knallen.length = 0
    stof.length = 0
    worm.leeft = false; worm.verslagen = false; worm.treffers = 0
    camY = 0
    bezig = true
    laatsteTijd = performance.now()
    toon(null)
    melding('Veel succes! Hou omlaag vast om te boren', 2200)
    requestAnimationFrame(lus)
  }

  const diepteMeter = () => Math.max(0, Math.round((sp.y - sp.h / 2) / TEGEL * METER_PER_RIJ))
  // Erts uit een duurdere wereld brengt veel meer op — dát is waarom een
  // nieuwe wereld kopen de moeite waard is en niet alleen een ander behangetje.
  const ladingWaarde = () => Math.round(sp.lading.reduce((t, e) => t + ERTSEN[e].waarde, 0) * wereldNu().factor * handelBonus())

  // ── Botsen met het raster, per as ───────────────────────────────────────
  function raaktVast(x, y) {
    const l = Math.floor((x - sp.w / 2) / TEGEL), r = Math.floor((x + sp.w / 2 - 0.01) / TEGEL)
    const b = Math.floor((y - sp.h / 2) / TEGEL), o = Math.floor((y + sp.h / 2 - 0.01) / TEGEL)
    for (let c = l; c <= r; c++) for (let rr = b; rr <= o; rr++) if (vast(cel(c, rr))) return true
    return false
  }

  function beweeg(dt) {
    // horizontaal
    sp.x += sp.vx * dt
    if (raaktVast(sp.x, sp.y)) {
      const stap = sp.vx > 0 ? -1 : 1
      while (raaktVast(sp.x, sp.y)) sp.x += stap
      sp.vx = 0
    }
    // verticaal
    sp.y += sp.vy * dt
    if (raaktVast(sp.x, sp.y)) {
      const stap = sp.vy > 0 ? -1 : 1
      while (raaktVast(sp.x, sp.y)) sp.y += stap
      sp.vy = 0
    }
    sp.x = Math.max(TEGEL + sp.w / 2, Math.min(BREEDTE - TEGEL - sp.w / 2, sp.x))
  }

  const opGrond = () => raaktVast(sp.x, sp.y + 3)

  // Welke tegels liggen er in de richting waarin je duwt?
  //
  // Een lijst, geen enkele tegel: het voertuig is smaller dan een tegel maar
  // staat bijna altijd over de naad van twee tegels heen. Boorde je er maar
  // één weg, dan bleef je op de andere staan en zakte je nooit — precies wat
  // er misging in de eerste versie. De tunnel wordt hierdoor net zo breed als
  // je voertuig, wat ook prettiger rijdt.
  function doelTegels(richting) {
    const uit = []
    const cl = Math.floor((sp.x - sp.w / 2 + 1) / TEGEL)
    const cr = Math.floor((sp.x + sp.w / 2 - 1) / TEGEL)
    const rb = Math.floor((sp.y - sp.h / 2 + 1) / TEGEL)
    const ro = Math.floor((sp.y + sp.h / 2 - 1) / TEGEL)
    if (richting === 'omlaag' || richting === 'omhoog') {
      const r = richting === 'omlaag'
        ? Math.floor((sp.y + sp.h / 2 + 4) / TEGEL)
        : Math.floor((sp.y - sp.h / 2 - 4) / TEGEL)
      for (let c = cl; c <= cr; c++) uit.push([c, r])
    } else {
      const c = richting === 'links'
        ? Math.floor((sp.x - sp.w / 2 - 4) / TEGEL)
        : Math.floor((sp.x + sp.w / 2 + 4) / TEGEL)
      for (let r = rb; r <= ro; r++) uit.push([c, r])
    }
    return uit
  }

  function boor(richting, dt) {
    const alles = doelTegels(richting)
    const doelen = alles.filter(([c, r]) => { const t = cel(c, r); return vast(t) && t !== MUUR })
    if (alles.some(([c, r]) => cel(c, r) === MUUR)) { sp.boorRichting = null; sp.boorVoortgang = 0; return false }
    if (!doelen.length) { sp.boorRichting = null; sp.boorVoortgang = 0; return false }

    if (doelen.some(([c, r]) => cel(c, r) === KERN)) {
      if (worm.treffers >= 3 || opslag.baas) gewonnen()
      else melding('Eerst de Magmaworm — lok hem onder een los blok', 2000)
      return false
    }
    const teHard = doelen.find(([, r]) => laagVanRij(r).boor > niveau('boor'))
    if (teHard) {
      sp.boorRichting = null; sp.boorVoortgang = 0
      melding('Deze steen is te hard — koop een betere boor', 1500)
      return false
    }
    // Vol laadruim: we laten het erts staan in plaats van het te vernietigen.
    // Dat is het moment om naar boven te gaan, en je verliest niets.
    const ertsTegels = doelen.filter(([c, r]) => cel(c, r) === ERTS).length
    if (ertsTegels > 0 && sp.lading.length + ertsTegels > maxLading()) {
      sp.boorRichting = null; sp.boorVoortgang = 0
      melding('Je laadruim is vol — ga naar boven om te verkopen', 1600)
      return false
    }

    if (sp.boorRichting !== richting) { sp.boorRichting = richting; sp.boorVoortgang = 0 }
    // Omhoog boren gaat bewust trager: naar beneden is de makkelijke kant.
    const nodig = boorTempo() * (richting === 'omhoog' ? 1.6 : 1)
    sp.boorVoortgang += dt
    sp.boorHoek += dt * 26
    // gruis en vonken bij de boorkop
    if (Math.random() < dt * 38) {
      const [c, r] = doelen[0]
      const hoek = Math.random() * Math.PI * 2
      stof.push({
        x: c * TEGEL + TEGEL / 2, y: r * TEGEL + TEGEL / 2, l: 0.45,
        vx: Math.cos(hoek) * 90, vy: Math.sin(hoek) * 90 - 40,
        kleur: Math.random() < 0.25 ? '#ffe9b0' : laagVanRij(r).ader,
      })
    }
    if (sp.boorVoortgang < nodig) return true
    sp.boorVoortgang = 0
    doelen.forEach(([c, r]) => graafUit(c, r, cel(c, r)))
    return true
  }

  function graafUit(c, r, t) {
    const i = idx(c, r)
    if (t === ERTS) {
      sp.lading.push(ertsen[i])
      // het erts spat even op als je het binnenhaalt
      for (let n = 0; n < 9; n++) {
        const hoek = Math.random() * Math.PI * 2
        stof.push({
          x: c * TEGEL + TEGEL / 2, y: r * TEGEL + TEGEL / 2, l: 0.55,
          vx: Math.cos(hoek) * 130, vy: Math.sin(hoek) * 130 - 60,
          kleur: ERTSEN[ertsen[i]].kleur,
        })
      }
    }
    cellen[i] = LEEG
  }

  // ── 4. Gevaren ──────────────────────────────────────────────────────────
  const vallers = []    // losse blokken die naar beneden komen
  const knallen = []    // gasexplosies, puur om te tekenen
  const stof = []       // gruis en vonken

  // Een los blok gaat vallen zodra er niets meer onder zit.
  function checkLosseBlokken() {
    const bovenRij = Math.max(0, Math.floor((camY - TEGEL) / TEGEL))
    const onderRij = Math.min(RIJEN - 1, Math.floor((camY + zichtHoogte() + TEGEL) / TEGEL))
    for (let r = onderRij; r >= bovenRij; r--) {
      for (let c = 1; c < KOLOMMEN - 1; c++) {
        if (cellen[idx(c, r)] !== LOS) continue
        if (vast(cel(c, r + 1))) continue
        cellen[idx(c, r)] = LEEG
        vallers.push({ x: c * TEGEL, y: r * TEGEL, vy: 0 })
      }
    }
  }

  function werkVallersBij(dt) {
    for (let i = vallers.length - 1; i >= 0; i--) {
      const v = vallers[i]
      v.vy = Math.min(MAX_VAL, v.vy + ZWAARTE * dt)
      v.y += v.vy * dt
      const c = Math.floor((v.x + TEGEL / 2) / TEGEL)
      const r = Math.floor((v.y + TEGEL - 1) / TEGEL)

      // de worm eronder? dat is de enige manier om hem te raken
      if (worm.leeft && !worm.versuft && Math.abs(v.x + TEGEL / 2 - worm.x) < TEGEL && Math.abs(v.y + TEGEL / 2 - worm.y) < TEGEL * 1.2) {
        wormGeraakt()
        vallers.splice(i, 1)
        continue
      }
      // de speler eronder?
      if (Math.abs(v.x + TEGEL / 2 - sp.x) < (TEGEL + sp.w) / 2 && Math.abs(v.y + TEGEL / 2 - sp.y) < (TEGEL + sp.h) / 2) {
        vallers.splice(i, 1)
        schade(1, 'romp', true)
        melding('Pas op — vallend gesteente!', 1200)
        continue
      }
      if (vast(cel(c, r)) || r >= RIJEN) {
        const rustRij = Math.max(0, r - 1)
        if (binnen(c, rustRij) && cellen[idx(c, rustRij)] === LEEG) cellen[idx(c, rustRij)] = LOS
        for (let n = 0; n < 6; n++) stof.push({ x: v.x + TEGEL / 2, y: v.y + TEGEL, l: 0.4, kleur: '#8a8a96' })
        vallers.splice(i, 1)
      }
    }
  }

  // Gas ontploft als je hem raakt. Hij trilt zichtbaar, dus hij is te ontwijken.
  // Magneet: erts binnen bereik springt vanzelf je laadruim in, zonder boren.
  // Niets door muren heen — je moet er echt langs kunnen kijken zou te duur zijn
  // om te rekenen, dus we houden het simpel: alles binnen de straal telt. Dat
  // maakt een dure magneet ook echt lekker sterk.
  function magneetBij() {
    const straal = magneetStraal()
    if (straal <= 0) return
    const ruimte = maxLading() - sp.lading.length
    if (ruimte <= 0) return
    const cMin = Math.max(1, Math.floor((sp.x - straal) / TEGEL))
    const cMax = Math.min(KOLOMMEN - 2, Math.floor((sp.x + straal) / TEGEL))
    const rMin = Math.max(0, Math.floor((sp.y - straal) / TEGEL))
    const rMax = Math.min(RIJEN - 1, Math.floor((sp.y + straal) / TEGEL))
    let gepakt = 0
    for (let r = rMin; r <= rMax && gepakt < ruimte; r++) {
      for (let c = cMin; c <= cMax && gepakt < ruimte; c++) {
        const i = idx(c, r)
        if (cellen[i] !== ERTS) continue
        const mx = c * TEGEL + TEGEL / 2, my = r * TEGEL + TEGEL / 2
        if (Math.hypot(mx - sp.x, my - sp.y) > straal) continue
        const soort = ertsen[i]
        cellen[i] = LEEG
        sp.lading.push(soort)
        gepakt++
        // een streepje deeltjes van het erts naar je toe
        for (let n = 0; n < 7; n++) {
          const t = n / 7
          stof.push({
            x: mx + (sp.x - mx) * t, y: my + (sp.y - my) * t, l: 0.5,
            vx: (sp.x - mx) * 1.6, vy: (sp.y - my) * 1.6,
            kleur: ERTSEN[soort].kleur,
          })
        }
      }
    }
    if (gepakt) melding('🧲 ' + gepakt + ' brok' + (gepakt === 1 ? '' : 'ken') + ' aangetrokken', 900)
  }

  function checkGasEnLava() {
    const l = Math.floor((sp.x - sp.w / 2) / TEGEL), r = Math.floor((sp.x + sp.w / 2) / TEGEL)
    const b = Math.floor((sp.y - sp.h / 2) / TEGEL), o = Math.floor((sp.y + sp.h / 2) / TEGEL)
    for (let c = l; c <= r; c++) {
      for (let rr = b; rr <= o; rr++) {
        if (!binnen(c, rr)) continue
        const t = cellen[idx(c, rr)]
        if (t === LAVA) { gaDood('lava'); return }
        if (t === GAS) {
          cellen[idx(c, rr)] = LEEG
          knallen.push({ x: c * TEGEL + TEGEL / 2, y: rr * TEGEL + TEGEL / 2, l: 0.45 })
          // de knal blaast een gaatje in de omgeving
          for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
            const cc = c + dc, rr2 = rr + dr
            if (cc > 0 && cc < KOLOMMEN - 1 && binnen(cc, rr2)) {
              const tt = cellen[idx(cc, rr2)]
              if (tt === GROND || tt === GAS) cellen[idx(cc, rr2)] = LEEG
            }
          }
          sp.vy = -180; sp.schud = 0.4
          schade(1, 'romp', true)
          melding('Gasbel!', 1100)
        }
      }
    }
  }

  // `zacht` = een klap van vallend gesteente of gas; die wordt gedempt door de
  // schokdemper. Hitte gaat er dwars doorheen, dat is geen klap.
  function schade(hoeveel, reden, zacht) {
    if (sp.raakCooldown > 0) return
    sp.raakCooldown = 0.8
    const raak = zacht ? hoeveel * demping() : hoeveel
    if (raak <= 0) { sp.schud = Math.max(sp.schud, 0.2); return }
    sp.romp -= raak
    sp.schud = Math.max(sp.schud, 0.35)
    if (sp.romp <= 0) gaDood(reden)
  }

  // ── De Magmaworm ────────────────────────────────────────────────────────
  const worm = { leeft: false, verslagen: false, x: 0, y: 0, treffers: 0, versuft: 0, staart: [] }

  function wormBij(dt) {
    const inKern = diepteMeter() >= LAGEN[7].vanaf
    // `verslagen` is nodig naast `leeft`: zonder die vlag spawnt hij meteen
    // opnieuw zodra je hem hebt verslagen, want opslag.baas wordt pas gezet als
    // je de Sterrenkern ook echt aanraakt.
    if (!worm.leeft && !worm.verslagen && inKern && !opslag.baas) {
      worm.leeft = true
      worm.x = BREEDTE / 2
      worm.y = sp.y + 420
      worm.staart = []
      melding('De Magmaworm is wakker!', 2200)
    }
    if (!worm.leeft) return
    if (worm.versuft > 0) { worm.versuft -= dt; return }

    const dx = sp.x - worm.x, dy = sp.y - worm.y
    const d = Math.hypot(dx, dy) || 1
    const snel = 108
    worm.x += (dx / d) * snel * dt
    worm.y += (dy / d) * snel * dt
    // hij vreet zich door het gesteente heen
    const c = Math.floor(worm.x / TEGEL), r = Math.floor(worm.y / TEGEL)
    for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
      const cc = c + dc, rr = r + dr
      if (cc > 0 && cc < KOLOMMEN - 1 && binnen(cc, rr)) {
        const t = cellen[idx(cc, rr)]
        if (t === GROND || t === ERTS) cellen[idx(cc, rr)] = LEEG
      }
    }
    worm.staart.unshift({ x: worm.x, y: worm.y })
    if (worm.staart.length > 26) worm.staart.pop()

    if (Math.abs(worm.x - sp.x) < 26 && Math.abs(worm.y - sp.y) < 26) {
      const weg = Math.atan2(sp.y - worm.y, sp.x - worm.x)
      sp.vx = Math.cos(weg) * 320; sp.vy = Math.sin(weg) * 320 - 120
      schade(2, 'worm')
    }
  }

  function wormGeraakt() {
    worm.treffers++
    worm.versuft = 6
    worm.y += 260
    worm.staart = []
    sp.schud = 0.5
    for (let n = 0; n < 20; n++) stof.push({ x: worm.x, y: worm.y, l: 0.7, kleur: '#ff5ecb' })
    if (worm.treffers >= 3) {
      worm.leeft = false
      worm.verslagen = true
      melding('De Magmaworm is verslagen! Graaf de Sterrenkern uit', 3200)
    } else {
      melding(`Raak! Nog ${3 - worm.treffers} keer`, 2000)
    }
  }

  // ── Dood en winst ───────────────────────────────────────────────────────
  let bezig = false

  function gaDood(reden) {
    if (!bezig) return
    bezig = false
    const kwijtLading = sp.lading.length
    const kwijtDuiken = opslag.duiken
    opslag.duiken = 0          // de hele regel van het spel staat in deze regel
    bewaar()
    const r = DOOD_REDENEN[reden] || DOOD_REDENEN.romp
    $('dood-icoon').textContent = r.icoon
    $('dood-titel').textContent = r.titel
    $('dood-reden').textContent = r.tekst
    $('dood-lading').textContent = kwijtLading === 0 ? 'niets' : `${kwijtLading} brokken (${ladingWaarde()})`
    $('dood-duiken').textContent = kwijtDuiken === 0 ? 'geen' : `${kwijtDuiken}`
    sp.lading = []
    toon('dood')
  }

  function gewonnen() {
    if (!bezig) return
    bezig = false
    opslag.baas = true
    opslag.upgrades.romp = 8   // de mooiste romp van het spel als trofee
    verkoopLading()
    bewaar()
    toon('winst')
  }

  // Boven de grond: verkopen, tanken, klaar. Pas nadat je echt onder bent
  // geweest — bij de start sta je immers al bovenop de grond.
  function checkBoven() {
    if (!sp.onderGeweest) { if (diepteMeter() > 6) sp.onderGeweest = true; return }
    if (sp.y + sp.h / 2 > -1) return
    // Boven de grond staat de handelaar klaar: je lading gaat meteen van boord,
    // zodat je met een leeg laadruim weer naar beneden kunt. De graafbeurt zelf
    // loopt door — die eindigt alleen als je er zelf voor kiest met E.
    const opbrengst = verkoopLading()
    if (opbrengst <= 0) return
    duikOpbrengst += opbrengst
    bewaar()
    banner('+ ' + opbrengst.toLocaleString('nl-NL'), 'erts verkocht', '#ffc23c')
    melding('Verkocht! Duik weer naar beneden, of stop met E', 1800)
  }

  // Bovengekomen mag je zelf stoppen met E (of de knop op een tablet): de
  // graafbeurt eindigt, je lading wordt verkocht en je tank is bij de volgende
  // duik weer vol. De duik is bij het starten al afgeschreven, dus stoppen kost
  // evenveel als doodgaan — alleen ga je nu mét je erts naar huis.
  //
  // Bewust alleen vlak onder de oppervlakte: dieper in de mijn moet je nog
  // steeds zélf zien thuis te komen, anders is er niets meer aan. Zodra het
  // mag staat het groot in beeld, zodat een kind niet hoeft te raden welke
  // toets dat doet.
  const STOP_DIEPTE = 12   // meter; ongeveer de bovenste zes rijen
  const magStoppen = () => bezig && sp.onderGeweest && diepteMeter() <= STOP_DIEPTE

  function rondDuikAf() {
    if (!bezig) return
    bezig = false
    const opbrengst = verkoopLading()
    duikOpbrengst += opbrengst
    bewaar()
    if (opbrengst > 0) banner('+ ' + opbrengst.toLocaleString('nl-NL'), 'erts verkocht', '#ffc23c')
    // De regel in de basis gaat over de hele graafbeurt, niet over dit laatste
    // laadruim: wie tussendoor al bovenkwam heeft toen al verkocht.
    naarBasis(duikOpbrengst > 0
      ? `Verkocht voor ${duikOpbrengst.toLocaleString('nl-NL')} erts. Tank is weer vol.`
      : 'Niets meegenomen deze keer.')
  }

  // Wat deze hele graafbeurt heeft opgeleverd, inclusief wat je tussendoor
  // bovengronds al verkocht hebt.
  let duikOpbrengst = 0

  function verkoopLading() {
    const w = ladingWaarde()
    opslag.erts += w
    sp.lading = []
    if (diepteMeter() > opslag.record) opslag.record = diepteMeter()
    return w
  }

  // ── 5. Tekenen ──────────────────────────────────────────────────────────
  // Alles wordt in code getekend, maar niet elke frame opnieuw: tegels, ertsen
  // en gloed worden één keer op kleine offscreen-canvassen gebakken en daarna
  // alleen nog gestempeld.
  //
  // De sfeer komt uit drie lagen boven elkaar:
  //   1. een achterwand die trager meeschuift, zodat een gat diepte heeft
  //   2. het gesteente zelf, met randlicht waar het aan een holte grenst
  //   3. een lichtkaart: een zwart vel waar we gaten in prikken voor je
  //      koplamp, elk stuk erts, lava, gas en de kern. Daardoor verlícht erts
  //      de rotsen eromheen echt, in plaats van alleen zelf te gloeien.
  let schaal = 1, camY = 0
  const zichtHoogte = () => doek.height / Math.min(2, devicePixelRatio || 1) / schaal

  const lichtDoek = document.createElement('canvas')
  const lctx = lichtDoek.getContext('2d')

  function meet() {
    const dpr = Math.min(2, devicePixelRatio || 1)
    const b = innerWidth, h = innerHeight
    doek.width = Math.round(b * dpr)
    doek.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // De lichtkaart mag half zo fijn: je ziet het verschil niet in een zachte
    // gloed, en het scheelt driekwart van het vulwerk.
    lichtDoek.width = Math.max(2, Math.round(b / 2))
    lichtDoek.height = Math.max(2, Math.round(h / 2))
    schaal = Math.max(0.45, Math.min(b / BREEDTE, h / 520, 1.7))
  }
  addEventListener('resize', meet)

  // ── Kleurhulpjes ────────────────────────────────────────────────────────
  const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
  const hex2 = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
  const licht = (hex, f) => { const c = rgb(hex); return hex2(c[0] * f, c[1] * f, c[2] * f) }
  const meng = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex2(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t) }
  const rgba = (hex, a) => { const c = rgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')' }

  function nieuwDoek(b, h) {
    const c = document.createElement('canvas')
    c.width = b; c.height = h
    return c
  }

  // Voorspelbare "toevalligheid" per tegel: dezelfde tegel krijgt altijd
  // dezelfde barsten, spikkels en druipstenen.
  function hash(a, b) {
    let h = (a * 374761393 + b * 668265263) ^ 0x5bf03635
    h = (h ^ (h >>> 13)) * 1274126177
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295
  }

  // ── Gebakken plaatjes ───────────────────────────────────────────────────
  const gloed = {}
  function gloedVan(kleur) {
    if (gloed[kleur]) return gloed[kleur]
    const m = 96
    const c = nieuwDoek(m, m)
    const g = c.getContext('2d')
    const grad = g.createRadialGradient(m / 2, m / 2, 0, m / 2, m / 2, m / 2)
    grad.addColorStop(0, rgba(kleur, 0.95))
    grad.addColorStop(0.28, rgba(kleur, 0.45))
    grad.addColorStop(0.62, rgba(kleur, 0.14))
    grad.addColorStop(1, rgba(kleur, 0))
    g.fillStyle = grad
    g.fillRect(0, 0, m, m)
    gloed[kleur] = c
    return c
  }

  // Wit rond vlekje waarmee we gaten in de lichtkaart prikken.
  const gatPlaatje = (function () {
    const m = 128
    const c = nieuwDoek(m, m)
    const g = c.getContext('2d')
    const grad = g.createRadialGradient(m / 2, m / 2, 0, m / 2, m / 2, m / 2)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.35, 'rgba(255,255,255,0.82)')
    grad.addColorStop(0.72, 'rgba(255,255,255,0.28)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, m, m)
    return c
  })()

  // Vier varianten gesteente per laag: verloop van boven naar onder, korrel,
  // barsten en een binnenrand.
  const VARIANTEN = 4
  // Het palet komt uit de gekozen wereld, dus dit bakken we opnieuw zodra je
  // een andere wereld koopt of kiest.
  let tegelPlaatjes = []
  let achterPlaatjes = []
  function bakTegels() {
   tegelPlaatjes = LAGEN.map(function (laag, li) {
    return Array.from({ length: VARIANTEN }, function (_, v) {
      const c = nieuwDoek(TEGEL, TEGEL)
      const g = c.getContext('2d')
      const grad = g.createLinearGradient(0, 0, TEGEL * 0.3, TEGEL)
      grad.addColorStop(0, licht(laagKleur(li), 1.2))
      grad.addColorStop(1, licht(laagKleur(li), 0.72))
      g.fillStyle = grad
      g.fillRect(0, 0, TEGEL, TEGEL)

      for (let i = 0; i < 26; i++) {
        const r1 = hash(li * 31 + v, i * 7), r2 = hash(i * 13, li + v * 5)
        g.globalAlpha = 0.05 + r1 * 0.14
        g.fillStyle = r2 > 0.5 ? laagAder(li) : licht(laagKleur(li), 0.55)
        const d = 1 + r1 * 2.6
        g.fillRect(r1 * TEGEL, r2 * TEGEL, d, d)
      }
      g.globalAlpha = 0.55
      g.strokeStyle = rgba(laagAder(li), 0.6)
      g.lineWidth = 1.2
      for (let i = 0; i < 2; i++) {
        const x0 = hash(v * 17 + i, li) * TEGEL, y0 = hash(li * 3 + i, v) * TEGEL
        g.beginPath()
        g.moveTo(x0, y0)
        g.lineTo(x0 + (hash(i, v) - 0.5) * 20, y0 + (hash(v, i + 4) - 0.5) * 20)
        g.stroke()
      }
      g.globalAlpha = 1
      g.strokeStyle = 'rgba(255,255,255,0.08)'
      g.lineWidth = 1
      g.beginPath(); g.moveTo(0.5, TEGEL); g.lineTo(0.5, 0.5); g.lineTo(TEGEL, 0.5); g.stroke()
      g.strokeStyle = 'rgba(0,0,0,0.34)'
      g.beginPath(); g.moveTo(TEGEL - 0.5, 0); g.lineTo(TEGEL - 0.5, TEGEL - 0.5); g.lineTo(0, TEGEL - 0.5); g.stroke()
      return c
    })
   })
   // Dezelfde tegels nog eens, maar donker: dat is de wand áchter de gangen.
   achterPlaatjes = tegelPlaatjes.map(function (rij) {
    return rij.map(function (bron) {
      const c = nieuwDoek(TEGEL, TEGEL)
      const g = c.getContext('2d')
      g.drawImage(bron, 0, 0)
      g.fillStyle = 'rgba(2,3,9,0.74)'
      g.fillRect(0, 0, TEGEL, TEGEL)
      return c
    })
   })
  }
  bakTegels()

  // Erts als geslepen steen met facetten en een lichtpunt.
  const ertsPlaatjes = ERTSEN.map(function (e) {
    const m = TEGEL * 2
    const c = nieuwDoek(m, m)
    const g = c.getContext('2d')
    g.drawImage(gloedVan(e.kleur), 0, 0, m, m)
    const mx = m / 2, my = m / 2, R = TEGEL * 0.31
    const punten = []
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 3
      punten.push([mx + Math.cos(a) * R, my + Math.sin(a) * R * 0.94])
    }
    g.beginPath()
    punten.forEach(function (p, i) { g[i ? 'lineTo' : 'moveTo'](p[0], p[1]) })
    g.closePath()
    const vlak = g.createLinearGradient(mx - R, my - R, mx + R, my + R)
    vlak.addColorStop(0, licht(e.kleur, 1.45))
    vlak.addColorStop(0.5, e.kleur)
    vlak.addColorStop(1, licht(e.kleur, 0.5))
    g.fillStyle = vlak
    g.fill()
    g.strokeStyle = rgba(licht(e.kleur, 1.6), 0.9)
    g.lineWidth = 1.2
    g.stroke()
    g.strokeStyle = 'rgba(255,255,255,0.4)'
    g.lineWidth = 0.9
    g.beginPath()
    g.moveTo(punten[0][0], punten[0][1]); g.lineTo(mx, my)
    g.moveTo(punten[2][0], punten[2][1]); g.lineTo(mx, my)
    g.moveTo(punten[4][0], punten[4][1]); g.lineTo(mx, my)
    g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.9)'
    g.beginPath(); g.ellipse(mx - R * 0.3, my - R * 0.42, R * 0.17, R * 0.1, -0.5, 0, 7); g.fill()
    return c
  })

  // Fijne ruis over het hele beeld: haalt de platte vector-look eraf.
  const ruisDoek = (function () {
    const m = 160
    const c = nieuwDoek(m, m)
    const g = c.getContext('2d')
    const beeld = g.createImageData(m, m)
    for (let i = 0; i < m * m; i++) {
      const v = Math.random() * 255
      beeld.data[i * 4] = beeld.data[i * 4 + 1] = beeld.data[i * 4 + 2] = v
      beeld.data[i * 4 + 3] = 11
    }
    g.putImageData(beeld, 0, 0)
    return c
  })()
  let ruisPatroon = null

  // ── Sfeerdeeltjes per laag ──────────────────────────────────────────────
  // Stofjes in het zand, vonken in de kristalgrot, sneeuw in de ijsader,
  // opstijgende vonken in de magmakern. Eén pot van 60 die we hergebruiken
  // zodra ze uit beeld raken.
  const sfeer = Array.from({ length: 60 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 1, a: 0, kleur: '#fff' }))
  function zetSfeerdeeltje(p, boven, onder) {
    const laag = laagVanRij(Math.max(0, Math.floor(((boven + onder) / 2) / TEGEL)))
    const i = LAGEN.indexOf(laag)
    p.x = Math.random() * BREEDTE
    p.y = boven + Math.random() * (onder - boven)
    p.a = 0.18 + Math.random() * 0.5
    p.r = 0.8 + Math.random() * 1.8
    if (i >= 7) { p.kleur = '#ff9a3c'; p.vy = -18 - Math.random() * 34; p.vx = (Math.random() - 0.5) * 14; p.r += 0.8 }
    else if (i === 6) { p.kleur = '#dff2ff'; p.vy = 14 + Math.random() * 20; p.vx = (Math.random() - 0.5) * 12 }
    else if (i === 5) { p.kleur = '#ff7a3c'; p.vy = -10 - Math.random() * 20; p.vx = (Math.random() - 0.5) * 10 }
    else if (i === 4) { p.kleur = '#d9a3ff'; p.vy = -6 - Math.random() * 12; p.vx = (Math.random() - 0.5) * 16 }
    else { p.kleur = '#cbb794'; p.vy = 5 + Math.random() * 12; p.vx = (Math.random() - 0.5) * 8 }
  }
  function sfeerBij(dt, boven, onder) {
    sfeer.forEach(function (p) {
      if (p.a === 0 || p.y < boven - 40 || p.y > onder + 40) { zetSfeerdeeltje(p, boven, onder); return }
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.x < 0 || p.x > BREEDTE) p.x = (p.x + BREEDTE) % BREEDTE
    })
  }

  // ── Het hoofdplaatje ────────────────────────────────────────────────────
  let vorigeTeken = 0
  function teken() {
    const nu = performance.now()
    const dt = Math.min(0.05, vorigeTeken ? (nu - vorigeTeken) / 1000 : 0.016)
    vorigeTeken = nu
    const b = innerWidth, h = innerHeight

    const van = Math.max(0, Math.floor(camY / TEGEL) - 1)
    const tot = Math.min(RIJEN - 1, Math.floor((camY + zichtHoogte()) / TEGEL) + 1)
    sfeerBij(dt, camY, camY + zichtHoogte())
    beweegDeeltjes(dt)

    ctx.save()
    ctx.clearRect(0, 0, b, h)
    ctx.translate(b / 2, 0)
    ctx.scale(schaal, schaal)
    if (sp.schud > 0) ctx.translate((Math.random() - 0.5) * sp.schud * 20, (Math.random() - 0.5) * sp.schud * 20)
    ctx.translate(-BREEDTE / 2, -camY)

    tekenAchterwand(van, tot)
    if (camY < 0) tekenLucht()
    tekenTegels(van, tot)
    tekenDruipstenen(van, tot)
    tekenLaagnaam(van, tot)
    tekenRadar(van, tot)
    vallers.forEach(tekenLosBlok)
    tekenSfeer()
    if (worm.leeft) tekenWorm()
    tekenSpeler()
    tekenDeeltjes()
    tekenLichtkaart(van, tot)
    tekenRuis()
    ctx.restore()
    tekenRandGloed()
    tekenDiepteLint()
  }

  // De wand áchter de gangen: dezelfde stenen, donkerder, en hij schuift maar
  // voor een deel mee. Daardoor voelt een gang als een gang en niet als een gat.
  function tekenAchterwand(van, tot) {
    const off = (camY * 0.14) % TEGEL
    for (let r = van - 1; r <= tot + 1; r++) {
      const li = LAGEN.indexOf(laagVanRij(r))
      const y = r * TEGEL + off
      for (let c = 0; c < KOLOMMEN; c++) {
        // Alleen waar je er doorheen kunt kijken. Ook als de cel eróver leeg is,
        // want de achterwand schuift een stukje omlaag mee (parallax).
        if (cel(c, r) !== LEEG && cel(c, r - 1) !== LEEG) continue
        ctx.drawImage(achterPlaatjes[li][Math.floor(hash(c + 7, r + 3) * VARIANTEN)], c * TEGEL, y)
      }
    }
    // extra donker naar de randen toe, alsof de gang zijwaarts wegloopt
    const zij = ctx.createLinearGradient(0, 0, BREEDTE, 0)
    zij.addColorStop(0, 'rgba(0,0,0,0.5)')
    zij.addColorStop(0.5, 'rgba(0,0,0,0)')
    zij.addColorStop(1, 'rgba(0,0,0,0.5)')
    ctx.fillStyle = zij
    ctx.fillRect(0, camY - TEGEL, BREEDTE, zichtHoogte() + TEGEL * 2)
  }

  function tekenTegels(van, tot) {
    for (let r = van; r <= tot; r++) {
      const laag = laagVanRij(r)
      const laagIdx = LAGEN.indexOf(laag)
      for (let c = 0; c < KOLOMMEN; c++) {
        const t = cellen[idx(c, r)]
        if (t === LEEG) continue
        const x = c * TEGEL, y = r * TEGEL
        if (t === MUUR) { tekenMuur(x, y, laag); continue }
        if (t === LAVA) { tekenLava(x, y); continue }
        if (t === GAS) { tekenGas(x, y); continue }
        if (t === KERN) { tekenKern(x, y); continue }

        ctx.drawImage(tegelPlaatjes[laagIdx][Math.floor(hash(c, r) * VARIANTEN)], x, y)
        if (t === LOS) tekenLosRand(x, y)
        if (t === ERTS) ctx.drawImage(ertsPlaatjes[ertsen[idx(c, r)]], x - TEGEL / 2, y - TEGEL / 2)
        randLicht(c, r, x, y, laag)
      }
    }
  }

  // Randlicht: een tegel die aan een gat grenst krijgt een lichte kam bovenop
  // en een schaduw eronder. Dit ene detail maakt van een raster een grot.
  function randLicht(c, r, x, y, laag) {
    if (!vast(cel(c, r - 1))) {
      const g = ctx.createLinearGradient(0, y, 0, y + 8)
      g.addColorStop(0, rgba(licht(aderVan(laag), 1.5), 0.8))
      g.addColorStop(1, rgba(licht(aderVan(laag), 1.5), 0))
      ctx.fillStyle = g
      ctx.fillRect(x, y, TEGEL, 8)
    }
    if (!vast(cel(c, r + 1))) {
      const g = ctx.createLinearGradient(0, y + TEGEL - 7, 0, y + TEGEL)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(1, 'rgba(0,0,0,0.42)')
      ctx.fillStyle = g
      ctx.fillRect(x, y + TEGEL - 7, TEGEL, 7)
    }
    if (!vast(cel(c - 1, r))) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y, 2, TEGEL) }
    if (!vast(cel(c + 1, r))) { ctx.fillStyle = 'rgba(0,0,0,0.26)'; ctx.fillRect(x + TEGEL - 2, y, 2, TEGEL) }
  }

  // Druipstenen aan het plafond en puntjes op de vloer van open holtes.
  function tekenDruipstenen(van, tot) {
    for (let r = van; r <= tot; r++) {
      const laag = laagVanRij(r)
      for (let c = 1; c < KOLOMMEN - 1; c++) {
        if (cellen[idx(c, r)] !== LEEG) continue
        const x = c * TEGEL, y = r * TEGEL
        const h = hash(c * 5 + 1, r * 3 + 2)
        if (h > 0.9 && vast(cel(c, r - 1))) {
          const len = 7 + h * 16
          ctx.fillStyle = licht(kleurVan(laag), 1.05)
          ctx.beginPath()
          ctx.moveTo(x + 9, y); ctx.lineTo(x + TEGEL - 9, y); ctx.lineTo(x + TEGEL / 2, y + len)
          ctx.closePath(); ctx.fill()
          ctx.fillStyle = 'rgba(255,255,255,0.1)'
          ctx.fillRect(x + 10, y, 2, len * 0.5)
        } else if (h < 0.06 && vast(cel(c, r + 1))) {
          const len = 6 + h * 90
          ctx.fillStyle = licht(kleurVan(laag), 0.95)
          ctx.beginPath()
          ctx.moveTo(x + 10, y + TEGEL); ctx.lineTo(x + TEGEL - 10, y + TEGEL); ctx.lineTo(x + TEGEL / 2, y + TEGEL - len)
          ctx.closePath(); ctx.fill()
        }
      }
    }
  }

  function tekenMuur(x, y, laag) {
    ctx.fillStyle = licht(kleurVan(laag), 0.26)
    ctx.fillRect(x, y, TEGEL, TEGEL)
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    for (let i = 0; i < 3; i++) ctx.fillRect(x + 4 + i * 9, y + 3, 3, TEGEL - 6)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fillRect(x, y, TEGEL, 2)
  }

  function tekenLosRand(x, y) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1.4
    ctx.setLineDash([5, 4])
    ctx.strokeRect(x + 3.5, y + 3.5, TEGEL - 7, TEGEL - 7)
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(255,255,255,0.14)'
    ctx.fillRect(x + 3, y + 3, TEGEL - 6, 3)
  }

  function tekenLosBlok(v) {
    ctx.save()
    ctx.translate(v.x + TEGEL / 2, v.y + TEGEL / 2)
    ctx.rotate(Math.sin(v.y * 0.03) * 0.14)
    const g = ctx.createLinearGradient(0, -TEGEL / 2, 0, TEGEL / 2)
    g.addColorStop(0, '#756e82'); g.addColorStop(1, '#2e2b37')
    ctx.fillStyle = g
    ctx.fillRect(-TEGEL / 2, -TEGEL / 2, TEGEL, TEGEL)
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth = 1.4
    ctx.strokeRect(-TEGEL / 2 + 2.5, -TEGEL / 2 + 2.5, TEGEL - 5, TEGEL - 5)
    ctx.restore()
  }

  function tekenLava(x, y) {
    ctx.fillStyle = '#4d1004'
    ctx.fillRect(x, y, TEGEL, TEGEL)
    const g = ctx.createLinearGradient(0, y, 0, y + TEGEL)
    g.addColorStop(0, '#fff0a8')
    g.addColorStop(0.3, '#ffb020')
    g.addColorStop(0.7, '#ff6a10')
    g.addColorStop(1, '#a81f04')
    ctx.fillStyle = g
    ctx.fillRect(x + 2, y + 3 + Math.sin(klok * 3 + x * 0.08) * 2.5, TEGEL - 4, TEGEL - 7)
    // borrelend oppervlak
    for (let i = 0; i < 2; i++) {
      const bx = x + 8 + ((hash(x + i, y) * 20) + klok * 9 + i * 12) % (TEGEL - 16)
      const by = y + TEGEL - 8 - ((klok * 16 + hash(x, y + i) * 30) % (TEGEL - 12))
      ctx.fillStyle = 'rgba(255,240,170,0.8)'
      ctx.beginPath(); ctx.arc(bx, by, 1.8, 0, 7); ctx.fill()
    }
  }

  function tekenGas(x, y) {
    const puls = 0.5 + Math.sin(klok * 6 + x * 0.1 + y * 0.1) * 0.5
    const cx = x + TEGEL / 2, cy = y + TEGEL / 2
    const g = ctx.createRadialGradient(cx - 3, cy - 4, 1, cx, cy, TEGEL * 0.44)
    g.addColorStop(0, 'rgba(232,255,205,0.95)')
    g.addColorStop(0.55, 'rgba(142,224,106,0.66)')
    g.addColorStop(1, 'rgba(80,170,60,0.12)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy, TEGEL * (0.3 + puls * 0.09), 0, 7)
    ctx.fill()
    ctx.strokeStyle = 'rgba(198,255,158,' + (0.35 + puls * 0.45) + ')'
    ctx.lineWidth = 1.5
    ctx.stroke()
    // belletjes erin
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath(); ctx.arc(cx - 4, cy - 5 + Math.sin(klok * 4) * 2, 1.6, 0, 7); ctx.fill()
  }

  function tekenKern(x, y) {
    const cx = x + TEGEL / 2, cy = y + TEGEL / 2
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(klok * 0.5)
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, TEGEL * 0.5)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.4, '#ffd9f2')
    g.addColorStop(1, '#ff5ecb')
    ctx.fillStyle = g
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5
      const rr = i % 2 ? TEGEL * 0.16 : TEGEL * 0.48
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // Radar: erts dat nog in de steen zit licht als een spookje op. Hoe beter je
  // radar, hoe verder je kijkt — en hoe gerichter je kunt graven in plaats van
  // maar wat naar beneden te boren.
  function tekenRadar(van, tot) {
    const R = radarStraal()
    if (R <= 0) return
    const puls = 0.55 + Math.sin(klok * 2.2) * 0.45
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const cMin = Math.max(0, Math.floor((sp.x - R) / TEGEL))
    const cMax = Math.min(KOLOMMEN - 1, Math.floor((sp.x + R) / TEGEL))
    for (let r = Math.max(van, Math.floor((sp.y - R) / TEGEL)); r <= Math.min(tot, Math.floor((sp.y + R) / TEGEL)); r++) {
      for (let c = cMin; c <= cMax; c++) {
        if (cellen[idx(c, r)] !== ERTS) continue
        const x = c * TEGEL + TEGEL / 2, y = r * TEGEL + TEGEL / 2
        const d = Math.hypot(x - sp.x, y - sp.y)
        if (d > R) continue
        // Bewust ingetogen: een contour die zegt "hier zit iets", geen tweede
        // laag glimmend erts. Anders is de grot niet donker meer en verdwijnt
        // de spanning van je koplamp.
        ctx.globalAlpha = (1 - d / R) * 0.16 * puls
        const kleur = ERTSEN[ertsen[idx(c, r)]].kleur
        ctx.drawImage(gloedVan(kleur), x - TEGEL * 0.55, y - TEGEL * 0.55, TEGEL * 1.1, TEGEL * 1.1)
        ctx.globalAlpha = (1 - d / R) * 0.5 * puls
        ctx.strokeStyle = kleur
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const aa = -Math.PI / 2 + i * Math.PI / 3
          const px = x + Math.cos(aa) * TEGEL * 0.26, py = y + Math.sin(aa) * TEGEL * 0.26
          ctx[i ? 'lineTo' : 'moveTo'](px, py)
        }
        ctx.closePath()
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  // Naam van de laag, groot en half doorzichtig tegen de wand.
  function tekenLaagnaam(van, tot) {
    for (let i = 0; i < LAGEN.length; i++) {
      const rij = LAGEN[i].vanaf / METER_PER_RIJ
      if (rij < van - 2 || rij > tot + 8) continue
      const y = rij * TEGEL
      const streep = ctx.createLinearGradient(0, 0, BREEDTE, 0)
      streep.addColorStop(0, 'rgba(255,255,255,0.02)')
      streep.addColorStop(0.5, 'rgba(255,255,255,0.24)')
      streep.addColorStop(1, 'rgba(255,255,255,0.02)')
      ctx.fillStyle = streep
      ctx.fillRect(0, y - 1.5, BREEDTE, 3)
      if (Math.abs(sp.y - (y + 22)) < 46) continue
      ctx.font = '700 15px Russo One, system-ui, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.textAlign = 'center'
      ctx.fillText(LAGEN[i].naam.toUpperCase() + '  ·  ' + LAGEN[i].vanaf + ' M', BREEDTE / 2, y + 22)
      ctx.textAlign = 'left'
    }
  }

  // ── De sterrenhemel en de mijnbasis ─────────────────────────────────────
  function tekenLucht() {
    const w = wereldNu()
    const lucht = ctx.createLinearGradient(0, camY - 100, 0, 0)
    lucht.addColorStop(0, w.lucht[0])
    lucht.addColorStop(0.45, w.lucht[1])
    lucht.addColorStop(1, w.lucht[2])
    ctx.fillStyle = lucht
    ctx.fillRect(-600, camY - 400, BREEDTE + 1200, -camY + 400)

    // noorderlicht
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (let b = 0; b < 3; b++) {
      const kleur = b === 0 ? '#06d6a0' : b === 1 ? '#38bdf8' : '#a855f7'
      ctx.beginPath()
      ctx.moveTo(-400, -110)
      for (let x = -400; x <= BREEDTE + 400; x += 34) {
        ctx.lineTo(x, -150 - b * 26 + Math.sin(x * 0.008 + klok * 0.35 + b * 1.7) * 26 + Math.sin(x * 0.021 + klok * 0.2) * 12)
      }
      ctx.lineTo(BREEDTE + 400, -110)
      ctx.closePath()
      const ag = ctx.createLinearGradient(0, -230, 0, -80)
      ag.addColorStop(0, rgba(kleur, 0.16))
      ag.addColorStop(1, rgba(kleur, 0))
      ctx.fillStyle = ag
      ctx.fill()
    }
    ctx.restore()

    for (let n = 0; n < 90; n++) {
      const sx = ((n * 149) % (BREEDTE + 700)) - 350
      const sy = -24 - ((n * 83) % 380)
      if (sy < camY - 20) continue
      ctx.globalAlpha = 0.3 + Math.abs(Math.sin(klok * 1.3 + n)) * 0.7
      ctx.fillStyle = n % 9 === 0 ? '#9ed8ff' : n % 7 === 0 ? '#ffd9c0' : '#ffffff'
      const d = n % 11 === 0 ? 2.6 : 1.6
      ctx.fillRect(sx, sy, d, d)
    }
    ctx.globalAlpha = 1

    ctx.globalAlpha = 0.9
    ctx.drawImage(gloedVan(w.maan), BREEDTE * 0.72, -258, 210, 210)
    const mg = ctx.createRadialGradient(BREEDTE * 0.72 + 96, -160, 4, BREEDTE * 0.72 + 105, -153, 30)
    mg.addColorStop(0, '#ffffff')
    mg.addColorStop(1, w.maan)
    ctx.fillStyle = mg
    ctx.beginPath(); ctx.arc(BREEDTE * 0.72 + 105, -153, 27, 0, 7); ctx.fill()
    ctx.fillStyle = 'rgba(150,170,205,0.55)'
    ctx.beginPath(); ctx.arc(BREEDTE * 0.72 + 95, -162, 7, 0, 7); ctx.arc(BREEDTE * 0.72 + 114, -145, 4.5, 0, 7); ctx.fill()
    ctx.globalAlpha = 1

    tekenBasisgebouw()
  }

  function tekenBasisgebouw() {
    // twee heuvelruggen achter elkaar
    const rug = function (hoogte, kleur, faseF) {
      ctx.fillStyle = kleur
      ctx.beginPath()
      ctx.moveTo(-500, 0)
      for (let x = -500; x <= BREEDTE + 500; x += 36) {
        ctx.lineTo(x, -hoogte - Math.sin(x * faseF) * hoogte * 0.5 - Math.sin(x * faseF * 2.7) * hoogte * 0.25)
      }
      ctx.lineTo(BREEDTE + 500, 0)
      ctx.closePath()
      ctx.fill()
    }
    rug(56, '#121c38', 0.009)
    rug(34, '#0b1226', 0.014)

    const gebouw = function (x, b, h, kleur, naam) {
      ctx.fillStyle = '#101832'
      ctx.fillRect(x, -h, b, h)
      // dak
      ctx.fillStyle = '#1a2545'
      ctx.beginPath()
      ctx.moveTo(x - 6, -h); ctx.lineTo(x + b / 2, -h - 18); ctx.lineTo(x + b + 6, -h); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = rgba(kleur, 0.9)
      ctx.lineWidth = 2
      ctx.strokeRect(x + 0.5, -h + 0.5, b - 1, h - 1)
      for (let i = 0; i < Math.floor(b / 22); i++) {
        const aan = 0.55 + Math.sin(klok * 1.7 + i * 2.1 + x) * 0.4
        ctx.fillStyle = rgba(kleur, aan)
        ctx.fillRect(x + 9 + i * 22, -h + 14, 9, 10)
      }
      ctx.globalAlpha = 0.55
      ctx.drawImage(gloedVan(kleur), x - 34, -h - 54, b + 68, h + 90)
      ctx.globalAlpha = 1
      ctx.font = '700 11px Russo One, system-ui, sans-serif'
      ctx.fillStyle = kleur
      ctx.textAlign = 'center'
      ctx.fillText(naam, x + b / 2, -h - 26)
      ctx.textAlign = 'left'
    }
    gebouw(BREEDTE * 0.06, 112, 68, '#ffc23c', 'VERKOOP')
    gebouw(BREEDTE * 0.62, 100, 56, '#06d6a0', 'WERKPLAATS')

    // tankpunt met slang
    ctx.fillStyle = '#101832'
    ctx.fillRect(BREEDTE * 0.44, -42, 26, 42)
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2
    ctx.strokeRect(BREEDTE * 0.44 + 0.5, -41.5, 25, 41)
    ctx.fillStyle = 'rgba(56,189,248,' + (0.6 + Math.sin(klok * 3) * 0.35) + ')'
    ctx.fillRect(BREEDTE * 0.44 + 6, -35, 14, 10)
    ctx.beginPath()
    ctx.moveTo(BREEDTE * 0.44 + 26, -28)
    ctx.quadraticCurveTo(BREEDTE * 0.44 + 48, -10, BREEDTE * 0.44 + 44, -2)
    ctx.stroke()

    // boortoren boven de schacht
    const bx = BREEDTE / 2
    ctx.strokeStyle = '#63749a'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(bx - 36, 0); ctx.lineTo(bx - 13, -86)
    ctx.moveTo(bx + 36, 0); ctx.lineTo(bx + 13, -86)
    ctx.moveTo(bx - 13, -86); ctx.lineTo(bx + 13, -86)
    for (let i = 1; i < 5; i++) {
      const t = i / 5
      ctx.moveTo(bx - 36 + 23 * t, -86 * t)
      ctx.lineTo(bx + 36 - 23 * t, -86 * t)
    }
    ctx.stroke()
    // kruisverband
    ctx.strokeStyle = 'rgba(99,116,154,0.5)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    for (let i = 0; i < 4; i++) {
      const t0 = i / 5, t1 = (i + 1) / 5
      ctx.moveTo(bx - 36 + 23 * t0, -86 * t0); ctx.lineTo(bx + 36 - 23 * t1, -86 * t1)
      ctx.moveTo(bx + 36 - 23 * t0, -86 * t0); ctx.lineTo(bx - 36 + 23 * t1, -86 * t1)
    }
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,97,80,' + (0.45 + Math.sin(klok * 3) * 0.5) + ')'
    ctx.beginPath(); ctx.arc(bx, -92, 4.5, 0, 7); ctx.fill()
    ctx.globalAlpha = 0.6
    ctx.drawImage(gloedVan('#ff6150'), bx - 30, -122, 60, 60)
    ctx.globalAlpha = 1

    // grondstrook met een randje gras
    const gs = ctx.createLinearGradient(0, -7, 0, 12)
    gs.addColorStop(0, '#9a7a48')
    gs.addColorStop(1, licht(laagKleur(0), 1.15))
    ctx.fillStyle = gs
    ctx.fillRect(-600, -6, BREEDTE + 1200, 14)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(-600, 6, BREEDTE + 1200, 3)
  }

  // ── Het voertuig ────────────────────────────────────────────────────────
  function tekenSpeler() {
    const nR = niveau('romp'), nB = niveau('boor'), nM = niveau('motor')
    // De kleuren komen uit de gekochte lak, niet meer uit je rompniveau: zo kun
    // je je graafwagen echt zelf mooi maken.
    const lak = lakNu()
    const romp1 = lak.romp[0], romp2 = lak.romp[1], lijn = lak.rand
    const boorKleur = nB >= 6 ? '#ff5ecb' : nB >= 3 ? '#c06bff' : '#a855f7'
    const richting = sp.kijk

    // schaduw op de grond eronder
    if (opGrond()) {
      ctx.save()
      ctx.globalAlpha = 0.35
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.ellipse(sp.x, sp.y + sp.h / 2 + 5, sp.w * 0.6, 4, 0, 0, 7)
      ctx.fill()
      ctx.restore()
    }

    ctx.save()
    ctx.translate(sp.x, sp.y)
    ctx.rotate(Math.max(-0.16, Math.min(0.16, sp.vx / 1800)))

    // rupsbanden
    ctx.fillStyle = '#0d111b'
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(-sp.w / 2 - 2, sp.h / 2 - 8, sp.w + 4, 14, 7)
    else ctx.rect(-sp.w / 2 - 2, sp.h / 2 - 8, sp.w + 4, 14)
    ctx.fill()
    ctx.strokeStyle = '#313c53'
    ctx.lineWidth = 1.2
    const loop = (sp.x * 0.25) % 8
    for (let i = -2; i < 5; i++) {
      const px = -sp.w / 2 + i * 8 + loop
      ctx.beginPath(); ctx.moveTo(px, sp.h / 2 - 7); ctx.lineTo(px, sp.h / 2 + 5); ctx.stroke()
    }
    ctx.fillStyle = '#27324a'
    ctx.beginPath(); ctx.arc(-sp.w / 2 + 3, sp.h / 2 - 1, 5, 0, 7); ctx.arc(sp.w / 2 - 3, sp.h / 2 - 1, 5, 0, 7); ctx.fill()
    ctx.fillStyle = '#4c5a7a'
    ctx.beginPath(); ctx.arc(-sp.w / 2 + 3, sp.h / 2 - 1, 2, 0, 7); ctx.arc(sp.w / 2 - 3, sp.h / 2 - 1, 2, 0, 7); ctx.fill()

    // romp
    const g = ctx.createLinearGradient(0, -sp.h / 2, 0, sp.h / 2)
    g.addColorStop(0, romp1)
    g.addColorStop(0.55, meng(romp1, romp2, 0.6))
    g.addColorStop(1, romp2)
    ctx.fillStyle = g
    ctx.strokeStyle = lijn
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-sp.w / 2, -sp.h / 2 + 6)
    ctx.lineTo(-sp.w / 2 + 7, -sp.h / 2)
    ctx.lineTo(sp.w / 2 - 7, -sp.h / 2)
    ctx.lineTo(sp.w / 2, -sp.h / 2 + 6)
    ctx.lineTo(sp.w / 2, sp.h / 2 - 2)
    ctx.lineTo(-sp.w / 2, sp.h / 2 - 2)
    ctx.closePath()
    ctx.fill(); ctx.stroke()
    // glans over de bovenkant
    const glans = ctx.createLinearGradient(0, -sp.h / 2, 0, -sp.h / 2 + 7)
    glans.addColorStop(0, 'rgba(255,255,255,0.22)')
    glans.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glans
    ctx.fillRect(-sp.w / 2 + 2, -sp.h / 2 + 1, sp.w - 4, 7)

    // pantserplaten: één streep per rompniveau
    ctx.strokeStyle = rgba(lijn, 0.55)
    ctx.lineWidth = 1
    for (let i = 0; i < Math.min(4, Math.ceil(nR / 2)); i++) {
      const py = -sp.h / 2 + 7 + i * 3.4
      ctx.beginPath(); ctx.moveTo(-sp.w / 2 + 3, py); ctx.lineTo(sp.w / 2 - 3, py); ctx.stroke()
    }

    // cabine
    const cx = richting > 0 ? -3 : 3
    const cab = ctx.createLinearGradient(cx - 7, -sp.h / 2 + 2, cx + 7, -sp.h / 2 + 11)
    cab.addColorStop(0, lak.cabine)
    cab.addColorStop(0.45, meng(lak.cabine, romp2, 0.55))
    cab.addColorStop(1, romp2)
    ctx.fillStyle = cab
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(cx - 8, -sp.h / 2 + 2.5, 16, 10, 3)
    else ctx.rect(cx - 8, -sp.h / 2 + 2.5, 16, 10)
    ctx.fill()
    ctx.strokeStyle = rgba(lijn, 0.85)
    ctx.lineWidth = 1
    ctx.stroke()

    // koplamp
    ctx.fillStyle = '#fff3cf'
    ctx.beginPath(); ctx.arc(richting * (sp.w / 2 - 3), -3, 3.4, 0, 7); ctx.fill()

    // magneetveld: een pulserende ring zo groot als je bereik
    const mag = magneetStraal()
    if (mag > 0) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const p = 0.5 + Math.sin(klok * 2.4) * 0.5
      ctx.strokeStyle = 'rgba(126,240,224,' + (0.1 + p * 0.16) + ')'
      ctx.lineWidth = 1.6
      ctx.setLineDash([7, 9])
      ctx.lineDashOffset = -klok * 26
      ctx.beginPath(); ctx.arc(0, 0, mag * (0.94 + p * 0.06), 0, 7); ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }

    // boorkop
    ctx.save()
    const rr = sp.boorRichting
    ctx.rotate(rr === 'links' ? Math.PI / 2 : rr === 'rechts' ? -Math.PI / 2 : rr === 'omhoog' ? Math.PI : 0)
    ctx.translate(0, sp.h / 2 - 3)
    const bg = ctx.createLinearGradient(-9, 0, 9, 18)
    bg.addColorStop(0, licht(boorKleur, 1.5))
    bg.addColorStop(0.5, boorKleur)
    bg.addColorStop(1, licht(boorKleur, 0.5))
    ctx.fillStyle = bg
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.lineTo(0, 20); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 1.4
    for (let i = 0; i < 3; i++) {
      const t = ((sp.boorHoek * 0.11 + i / 3) % 1)
      const halfB = 8.6 * (1 - t)
      ctx.beginPath(); ctx.moveTo(-halfB, t * 18); ctx.lineTo(halfB, t * 18); ctx.stroke()
    }
    ctx.restore()

    // uitlaatvlam bij stijgen
    if (toetsen.omhoog && sp.brandstof > 0) {
      const len = 14 + Math.random() * 12 + nM
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const vg = ctx.createLinearGradient(0, sp.h / 2, 0, sp.h / 2 + len)
      vg.addColorStop(0, 'rgba(255,255,235,0.95)')
      vg.addColorStop(0.35, 'rgba(255,186,50,0.85)')
      vg.addColorStop(1, 'rgba(255,70,20,0)')
      ctx.fillStyle = vg
      ctx.beginPath()
      ctx.moveTo(-8, sp.h / 2 - 2); ctx.lineTo(8, sp.h / 2 - 2)
      ctx.lineTo(0, sp.h / 2 + len); ctx.closePath(); ctx.fill()
      ctx.restore()
    }
    ctx.restore()
  }

  function tekenWorm() {
    const g = gloedVan('#ff5ecb')
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    worm.staart.forEach(function (s, i) {
      const t = 1 - i / worm.staart.length
      const m = 20 + t * 38
      ctx.globalAlpha = t * 0.5
      ctx.drawImage(g, s.x - m / 2, s.y - m / 2, m, m)
    })
    ctx.restore()
    ctx.globalAlpha = worm.versuft > 0 ? 0.4 : 1
    worm.staart.forEach(function (s, i) {
      if (i % 2) return
      const t = 1 - i / worm.staart.length
      const seg = ctx.createRadialGradient(s.x - 3, s.y - 4, 1, s.x, s.y, 6 + t * 12)
      seg.addColorStop(0, meng('#ff9ede', '#ff5ecb', 1 - t))
      seg.addColorStop(1, meng('#2a0a1c', '#a82e7a', t * 0.8))
      ctx.fillStyle = seg
      ctx.beginPath(); ctx.arc(s.x, s.y, 5 + t * 11, 0, 7); ctx.fill()
    })
    const kg = ctx.createRadialGradient(worm.x - 6, worm.y - 7, 2, worm.x, worm.y, 23)
    kg.addColorStop(0, '#ffe6f6')
    kg.addColorStop(0.45, '#ff5ecb')
    kg.addColorStop(1, '#6d0d40')
    ctx.fillStyle = kg
    ctx.beginPath(); ctx.arc(worm.x, worm.y, 22, 0, 7); ctx.fill()
    ctx.fillStyle = '#2a0a1c'
    for (let i = 0; i < 6; i++) {
      const a = klok * 2 + i * Math.PI / 3
      ctx.beginPath()
      ctx.moveTo(worm.x + Math.cos(a) * 12, worm.y + Math.sin(a) * 12)
      ctx.lineTo(worm.x + Math.cos(a + 0.3) * 23, worm.y + Math.sin(a + 0.3) * 23)
      ctx.lineTo(worm.x + Math.cos(a - 0.3) * 23, worm.y + Math.sin(a - 0.3) * 23)
      ctx.closePath(); ctx.fill()
    }
    ctx.fillStyle = '#fff3cf'
    ctx.beginPath(); ctx.arc(worm.x - 7, worm.y - 5, 3.6, 0, 7); ctx.arc(worm.x + 7, worm.y - 5, 3.6, 0, 7); ctx.fill()
    ctx.fillStyle = '#2a0a1c'
    ctx.beginPath(); ctx.arc(worm.x - 7, worm.y - 5, 1.6, 0, 7); ctx.arc(worm.x + 7, worm.y - 5, 1.6, 0, 7); ctx.fill()
    ctx.globalAlpha = 1
  }

  function tekenSfeer() {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    sfeer.forEach(function (p) {
      if (!p.a) return
      ctx.globalAlpha = p.a * (0.5 + Math.sin(klok * 2 + p.x) * 0.5)
      ctx.fillStyle = p.kleur
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill()
    })
    ctx.restore()
  }

  // Vonken en gruis krijgen snelheid mee; hier bewegen ze.
  function beweegDeeltjes(dt) {
    for (let i = 0; i < stof.length; i++) {
      const s = stof[i]
      if (s.vx === undefined) continue
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.vy += 380 * dt
    }
  }

  function tekenDeeltjes() {
    ctx.save()
    stof.forEach(function (s) {
      ctx.globalAlpha = Math.max(0, s.l)
      ctx.fillStyle = s.kleur
      const d = 2 + s.l * 3
      ctx.fillRect(s.x, s.y, d, d)
    })
    ctx.globalCompositeOperation = 'lighter'
    knallen.forEach(function (k) {
      const t = 1 - k.l / 0.45
      ctx.globalAlpha = Math.max(0, k.l * 2)
      const m = 40 + t * 160
      ctx.drawImage(gloedVan('#ffc23c'), k.x - m / 2, k.y - m / 2, m, m)
      ctx.strokeStyle = 'rgba(255,240,180,' + Math.max(0, k.l * 1.6) + ')'
      ctx.lineWidth = 3.5
      ctx.beginPath(); ctx.arc(k.x, k.y, 14 + t * 68, 0, 7); ctx.stroke()
    })
    ctx.restore()
    ctx.globalAlpha = 1
  }

  // ── De lichtkaart ───────────────────────────────────────────────────────
  // Een zwart vel over de hele grot, met gaten geprikt op elke lichtbron.
  // Hierdoor verlicht een brok erts de rotsen eromheen echt.
  function tekenLichtkaart(van, tot) {
    if (sp.y < -20) return
    const b = innerWidth, h = innerHeight
    const sx = lichtDoek.width / b
    lctx.setTransform(1, 0, 0, 1, 0, 0)
    lctx.clearRect(0, 0, lichtDoek.width, lichtDoek.height)
    lctx.fillStyle = 'rgba(3,4,11,0.95)'
    lctx.fillRect(0, 0, lichtDoek.width, lichtDoek.height)

    // dezelfde wereldtransformatie als het hoofddoek, maar op halve grootte
    lctx.setTransform(schaal * sx, 0, 0, schaal * sx, (b / 2) * sx, 0)
    lctx.translate(-BREEDTE / 2, -camY)
    lctx.globalCompositeOperation = 'destination-out'

    const gat = function (x, y, straal, kracht) {
      lctx.globalAlpha = kracht
      lctx.drawImage(gatPlaatje, x - straal, y - straal, straal * 2, straal * 2)
    }

    // koplamp: drie cirkels langs de kijkrichting maken een kegel
    const L = lampStraal()
    gat(sp.x, sp.y, L, 1)
    for (let i = 1; i <= 4; i++) gat(sp.x + sp.kijk * i * (L * 0.36), sp.y + i * 9, L * (0.78 - i * 0.07), 0.88)
    if (sp.boorRichting) gat(sp.x, sp.y + sp.h / 2 + 8, 58, 0.95)

    for (let r = van; r <= tot; r++) {
      for (let c = 0; c < KOLOMMEN; c++) {
        const t = cellen[idx(c, r)]
        if (t === LEEG || t === GROND || t === MUUR || t === LOS) continue
        const x = c * TEGEL + TEGEL / 2, y = r * TEGEL + TEGEL / 2
        // Erts is een lichtpúntje, geen schijnwerper: met een grote straal
        // werd de hele grot verlicht en viel je eigen koplamp weg.
        if (t === ERTS) gat(x, y, 32, 0.38)
        else if (t === LAVA) gat(x, y, 76, 0.88)
        else if (t === GAS) gat(x, y, 38, 0.46)
        else if (t === KERN) gat(x, y, 160, 1)
      }
    }
    if (worm.leeft) gat(worm.x, worm.y, 96, 0.9)
    knallen.forEach(function (k) { gat(k.x, k.y, 60 + (1 - k.l / 0.45) * 150, 1) })
    lctx.globalAlpha = 1
    lctx.globalCompositeOperation = 'source-over'

    // en dat zwarte vel met gaten over het beeld
    ctx.save()
    ctx.setTransform(Math.min(2, devicePixelRatio || 1), 0, 0, Math.min(2, devicePixelRatio || 1), 0, 0)
    ctx.drawImage(lichtDoek, 0, 0, b, h)
    ctx.restore()
  }

  function tekenRuis() {
    if (!ruisPatroon) ruisPatroon = ctx.createPattern(ruisDoek, 'repeat')
    ctx.globalAlpha = 0.45
    ctx.fillStyle = ruisPatroon
    ctx.fillRect(-600, camY - 300, BREEDTE + 1200, zichtHoogte() + 600)
    ctx.globalAlpha = 1
  }

  // Randen van het scherm: altijd een beetje donkerder, en rood als je romp
  // eraan gaat of oranje in de magmakern.
  function tekenRandGloed() {
    const b = innerWidth, h = innerHeight
    const dpr = Math.min(2, devicePixelRatio || 1)
    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const v = ctx.createRadialGradient(b / 2, h / 2, Math.min(b, h) * 0.35, b / 2, h / 2, Math.max(b, h) * 0.75)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, b, h)

    const laag = laagVanRij(Math.max(0, Math.floor(sp.y / TEGEL)))
    const hitte = laag.hitte ? 0.22 : 0
    const pijn = sp.romp / maxRomp() < 0.35 ? 0.2 + Math.sin(klok * 5) * 0.12 : 0
    if (hitte || pijn) {
      const t = ctx.createRadialGradient(b / 2, h / 2, Math.min(b, h) * 0.25, b / 2, h / 2, Math.max(b, h) * 0.7)
      t.addColorStop(0, 'rgba(0,0,0,0)')
      t.addColorStop(1, pijn > hitte ? 'rgba(255,40,30,' + pijn + ')' : 'rgba(255,110,20,' + hitte + ')')
      ctx.fillStyle = t
      ctx.fillRect(0, 0, b, h)
    }
    ctx.restore()
  }

  // Lint rechts in beeld: waar zit je in de wereld, en welke lagen komen nog.
  function tekenDiepteLint() {
    const h = innerHeight
    const x = innerWidth - 26
    const top = 96, bod = h - 116
    if (bod - top < 120) return
    const dpr = Math.min(2, devicePixelRatio || 1)
    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = 'rgba(5,7,16,0.75)'
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x - 8, top - 10, 18, bod - top + 20, 9); ctx.fill() }
    else ctx.fillRect(x - 8, top - 10, 18, bod - top + 20)
    LAGEN.forEach(function (l) {
      const y0 = top + (l.vanaf / 1000) * (bod - top)
      const y1 = top + (Math.min(l.tot, 1000) / 1000) * (bod - top)
      ctx.fillStyle = licht(laagKleur(LAGEN.indexOf(l)), 1.25)
      ctx.fillRect(x - 5, y0, 12, y1 - y0 - 1)
      if (l.boor > niveau('boor')) {
        ctx.fillStyle = 'rgba(5,7,16,0.62)'
        ctx.fillRect(x - 5, y0, 12, y1 - y0 - 1)
      }
    })
    const py = top + Math.min(1, diepteMeter() / 1000) * (bod - top)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(x - 13, py); ctx.lineTo(x - 6, py - 5); ctx.lineTo(x - 6, py + 5)
    ctx.closePath(); ctx.fill()
    ctx.restore()
  }

  // ── Rustig achtergrondbeeld achter de menuschermen ──────────────────────
  let menuBezig = false
  function menuLus(nu) {
    if (!menuBezig) return
    klok = nu / 1000
    const b = innerWidth, h = innerHeight
    ctx.save()
    ctx.clearRect(0, 0, b, h)
    const s = Math.max(0.5, Math.min(b / BREEDTE, 1.5))
    ctx.translate(b / 2, h * 0.84)
    ctx.scale(s, s)
    ctx.translate(-BREEDTE / 2, 0)
    camY = -h * 0.84 / s
    tekenLucht()
    const diep = ctx.createLinearGradient(0, 0, 0, 300)
    diep.addColorStop(0, licht(laagKleur(0), 0.95))
    diep.addColorStop(1, '#080610')
    ctx.fillStyle = diep
    ctx.fillRect(-600, 0, BREEDTE + 1200, 300)
    ctx.fillStyle = '#06040b'
    ctx.fillRect(BREEDTE / 2 - 34, 0, 68, 300)
    ctx.fillStyle = 'rgba(255,194,60,0.10)'
    ctx.fillRect(BREEDTE / 2 - 34, 0, 68, 90)
    ctx.restore()
    tekenRandGloedMenu()
    requestAnimationFrame(menuLus)
  }
  function tekenRandGloedMenu() {
    const b = innerWidth, h = innerHeight
    const dpr = Math.min(2, devicePixelRatio || 1)
    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const v = ctx.createRadialGradient(b / 2, h / 2, Math.min(b, h) * 0.4, b / 2, h / 2, Math.max(b, h) * 0.8)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, 'rgba(0,0,0,0.5)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, b, h)
    ctx.restore()
  }
  function startMenuBeeld() {
    if (menuBezig) return
    menuBezig = true
    requestAnimationFrame(menuLus)
  }
  function stopMenuBeeld() { menuBezig = false }

  // ── HUD ─────────────────────────────────────────────────────────────────
  function melding(tekst, ms) {
    $('waarschuwing').textContent = tekst
    $('waarschuwing').classList.add('aan')
    meldTimer = (ms || 1500) / 1000
  }

  // Grote banner die even over het scherm strijkt: nieuwe laag, of de opbrengst
  // van je duik. Puur CSS-animatie, dus hij kost het tekenwerk niets.
  function banner(titel, onder, kleur) {
    const el = $('banner')
    el.innerHTML = `<b style="color:${kleur || '#fff'}">${titel}</b><span>${onder}</span>`
    el.style.setProperty('--bk', kleur || '#ffffff')
    el.classList.remove('aan')
    void el.offsetWidth        // opnieuw laten starten
    el.classList.add('aan')
  }

  function hudBij() {
    const bp = sp.brandstof / maxBrandstof()
    $('brandstof-vul').firstElementChild.style.width = Math.max(0, bp * 100) + '%'
    $('brandstof').classList.toggle('laag', bp < 0.3)
    $('lading-vul').firstElementChild.style.width = (sp.lading.length / maxLading() * 100) + '%'
    $('romp-vul').firstElementChild.style.width = Math.max(0, sp.romp / maxRomp() * 100) + '%'
    $('diepte').textContent = diepteMeter() + ' m'
    $('waarde').textContent = ladingWaarde()
    $('stoppen').hidden = !magStoppen()
    $('stop-chip').hidden = !magStoppen()
  }

  // ── 6. Schermen ─────────────────────────────────────────────────────────
  let uitlegPaneel = 0
  const panelen = () => Array.from(document.querySelectorAll('.uitleg-paneel'))

  function toonUitleg(vanuitBasis) {
    uitlegPaneel = 0
    uitlegNaarBasis = !!vanuitBasis
    tekenUitleg()
    toon('uitleg')
  }
  let uitlegNaarBasis = false

  function tekenUitleg() {
    const p = panelen()
    p.forEach((el, i) => el.classList.toggle('aan', i === uitlegPaneel))
    $('stippen').innerHTML = p.map((_, i) => `<span class="stip${i === uitlegPaneel ? ' aan' : ''}"></span>`).join('')
    $('uitleg-door').textContent = uitlegPaneel === p.length - 1 ? 'Beginnen!' : 'Volgende →'
  }

  $('uitleg-door').onclick = () => {
    if (uitlegPaneel < panelen().length - 1) { uitlegPaneel++; tekenUitleg(); return }
    if (!uitlegNaarBasis) { opslag.uitleg++; bewaar() }
    naarBasis()
  }

  // ── De winkel ───────────────────────────────────────────────────────────
  // Drie tabbladen: upgrades, lakken en werelden. Alles kost erts, en alles is
  // met opzet duur — een kind moet er lang naartoe kunnen sparen.
  const geld = (n) => n.toLocaleString('nl-NL')
  let tabNu = 'werkplaats'

  function naarBasis(regel) {
    $('saldo').textContent = geld(opslag.erts)
    $('record').textContent = opslag.record + ' m'
    $('haalbaar').textContent = diepsteLaag().naam
    $('wereld-nu').textContent = wereldNu().naam
    $('baas-mini').hidden = !opslag.baas
    // Bolletjes zolang het er een handjevol zijn; met de code 0001 staan er
    // honderd klaar en dan is een getal leesbaarder dan honderd stipjes.
    $('duikbollen').innerHTML = opslag.duiken > DUIKEN_PER_BELONING
      ? `<span class="duik-bol"></span><span class="duik-veel">× ${opslag.duiken}</span>`
      : Array.from({ length: DUIKEN_PER_BELONING },
        (_, i) => `<span class="duik-bol${i < opslag.duiken ? '' : ' op'}"></span>`).join('')
    $('duik-knop').disabled = opslag.duiken <= 0
    $('basis-regel').textContent = regel || (opslag.duiken > 0
      ? `Je mag nog ${opslag.duiken} keer duiken.`
      : 'Je duiken zijn op — maak een oefening in Kenniskist, dan mag je weer 3 keer.')
    $('klaar-knop').hidden = vrijSpelen
    bouwWinkel()
    toon('basis')
  }

  function kiesTab(naam) {
    tabNu = naam
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('aan', t.dataset.tab === naam))
    $('sporen').hidden = naam !== 'werkplaats'
    $('lakken').hidden = naam !== 'lakken'
    $('werelden').hidden = naam !== 'werelden'
  }
  document.querySelectorAll('.tab').forEach(t => { t.onclick = () => kiesTab(t.dataset.tab) })

  function bouwWinkel() {
    bouwWerkplaats()
    bouwLakken()
    bouwWerelden()
    tekenPortret()
    kiesTab(tabNu)
  }

  function bouwWerkplaats() {
    $('sporen').innerHTML = SPOREN.map(s => {
      const n = niveau(s.sleutel)
      const prijs = prijsVan(s, n)
      const kan = prijs !== null && opslag.erts >= prijs
      const vakjes = Array.from({ length: 8 }, (_, i) =>
        `<span class="vakje${i < n ? ' vol' : ''}" style="--kleur:${s.kleur}"></span>`).join('')
      const rechts = prijs === null
        ? '<span class="max">MAX</span>'
        : `<span class="prijs${kan ? '' : ' duur'}">${geld(prijs)}</span>
           <button class="knop klein" data-koop="${s.sleutel}" ${kan ? '' : 'disabled'}>Koop</button>`
      return `<div class="spoor" style="--kleur:${s.kleur}">
        <div>
          <div class="spoor-naam" style="color:${s.kleur}">${s.icoon} ${s.naam} <span class="zacht">${n}/8</span></div>
          <div class="spoor-wat">nu: ${s.wat(n)}${prijs !== null ? ` → straks: ${s.wat(n + 1)}` : ''}</div>
          <div class="vakjes">${vakjes}</div>
        </div>
        <div class="koop">${rechts}</div>
      </div>`
    }).join('')
    document.querySelectorAll('[data-koop]').forEach(b => { b.onclick = () => koop(b.dataset.koop) })
  }

  function bouwLakken() {
    $('lakken').innerHTML = LAKKEN.map(l => {
      const mijn = heeft('lakken', l.key)
      const aan = opslag.lak === l.key
      const kan = mijn || opslag.erts >= l.prijs
      return `<div class="waar${aan ? ' aan' : ''}${kan ? '' : ' duur'}">
        <div class="waar-beeld" style="background:linear-gradient(160deg, ${l.romp[0]}, ${l.romp[1]})">
          <span class="waar-streep" style="background:${l.rand}; box-shadow:0 0 14px ${l.rand}"></span>
          <span class="waar-ruit" style="background:${l.cabine}"></span>
        </div>
        <div class="waar-naam">${l.naam}</div>
        ${aan ? '<div class="waar-status op">In gebruik</div>'
          : mijn ? `<button class="knop klein stil" data-lak="${l.key}">Opzetten</button>`
            : `<button class="knop klein" data-koop-lak="${l.key}" ${kan ? '' : 'disabled'}>
                 <span class="prijs${kan ? '' : ' duur'}">${geld(l.prijs)}</span></button>`}
      </div>`
    }).join('')
    document.querySelectorAll('[data-lak]').forEach(b => {
      b.onclick = () => { opslag.lak = b.dataset.lak; bewaar(); naarBasis('Nieuwe lak opgezet.') }
    })
    document.querySelectorAll('[data-koop-lak]').forEach(b => {
      b.onclick = () => koopLak(b.dataset.koopLak)
    })
  }

  function koopLak(key) {
    const l = LAKKEN.find(x => x.key === key)
    if (!l || heeft('lakken', key) || opslag.erts < l.prijs) return
    opslag.erts -= l.prijs
    opslag.bezit.lakken = [...opslag.bezit.lakken, key]
    opslag.lak = key
    bewaar()
    naarBasis(`${l.naam} gekocht en opgezet!`)
  }

  function bouwWerelden() {
    $('werelden').innerHTML = WERELDEN.map(w => {
      const mijn = heeft('werelden', w.key)
      const aan = opslag.wereld === w.key
      const kan = mijn || opslag.erts >= w.prijs
      const strook = w.lagen.map(l => `<span style="background:${l[0]}"></span>`).join('')
      return `<div class="waar wereld${aan ? ' aan' : ''}${kan ? '' : ' duur'}">
        <div class="wereld-lucht" style="background:linear-gradient(180deg, ${w.lucht[0]}, ${w.lucht[1]} 55%, ${w.lucht[2]})">
          <span class="wereld-emoji">${w.emoji}</span>
          <div class="wereld-strook">${strook}</div>
        </div>
        <div class="waar-naam">${w.naam}</div>
        <div class="wereld-sfeer">${w.sfeer}</div>
        <div class="wereld-factor">erts × ${w.factor}</div>
        ${aan ? '<div class="waar-status op">Je graaft hier</div>'
          : mijn ? `<button class="knop klein stil" data-wereld="${w.key}">Hierheen</button>`
            : `<button class="knop klein" data-koop-wereld="${w.key}" ${kan ? '' : 'disabled'}>
                 <span class="prijs${kan ? '' : ' duur'}">${geld(w.prijs)}</span></button>`}
      </div>`
    }).join('')
    document.querySelectorAll('[data-wereld]').forEach(b => {
      b.onclick = () => zetWereld(b.dataset.wereld)
    })
    document.querySelectorAll('[data-koop-wereld]').forEach(b => {
      b.onclick = () => koopWereld(b.dataset.koopWereld)
    })
  }

  function zetWereld(key) {
    opslag.wereld = key
    bewaar()
    bakTegels()   // het hele palet verandert mee
    naarBasis(`Je graaft nu in ${wereldNu().naam}.`)
  }

  function koopWereld(key) {
    const w = WERELDEN.find(x => x.key === key)
    if (!w || heeft('werelden', key) || opslag.erts < w.prijs) return
    opslag.erts -= w.prijs
    opslag.bezit.werelden = [...opslag.bezit.werelden, key]
    bewaar()
    zetWereld(key)
  }

  // Levend portret van je graafwagen in de winkel: dezelfde tekenroutine als in
  // het spel, zodat een lak of upgrade er hier precies zo uitziet.
  const pDoek = $('portret-doek')
  const pctx = pDoek.getContext('2d')
  function tekenPortret() {
    const lak = lakNu()
    const b = pDoek.width, h = pDoek.height
    pctx.clearRect(0, 0, b, h)
    const lucht = pctx.createLinearGradient(0, 0, 0, h)
    lucht.addColorStop(0, 'rgba(255,255,255,0.06)')
    lucht.addColorStop(1, 'rgba(255,255,255,0)')
    pctx.fillStyle = lucht
    pctx.fillRect(0, 0, b, h)

    // plaatsje om op te staan
    pctx.save()
    pctx.globalCompositeOperation = 'lighter'
    pctx.globalAlpha = 0.5
    pctx.drawImage(gloedVan(lak.rand), b / 2 - 90, h - 74, 180, 74)
    pctx.restore()

    pctx.save()
    pctx.translate(b / 2, h / 2 + 4)
    pctx.scale(2.7, 2.7)
    pctx.fillStyle = 'rgba(0,0,0,0.45)'
    pctx.beginPath(); pctx.ellipse(0, 17, 22, 4, 0, 0, 7); pctx.fill()

    const w = 26, hh = 22
    pctx.fillStyle = '#0d111b'
    pctx.beginPath()
    if (pctx.roundRect) pctx.roundRect(-w / 2 - 2, hh / 2 - 8, w + 4, 14, 7)
    else pctx.rect(-w / 2 - 2, hh / 2 - 8, w + 4, 14)
    pctx.fill()
    pctx.strokeStyle = '#313c53'
    pctx.lineWidth = 1.2
    for (let i = -1; i < 4; i++) {
      const px = -w / 2 + i * 8 + 4
      pctx.beginPath(); pctx.moveTo(px, hh / 2 - 7); pctx.lineTo(px, hh / 2 + 5); pctx.stroke()
    }
    pctx.fillStyle = '#27324a'
    pctx.beginPath(); pctx.arc(-w / 2 + 3, hh / 2 - 1, 5, 0, 7); pctx.arc(w / 2 - 3, hh / 2 - 1, 5, 0, 7); pctx.fill()
    pctx.fillStyle = '#5a6b8e'
    pctx.beginPath(); pctx.arc(-w / 2 + 3, hh / 2 - 1, 2, 0, 7); pctx.arc(w / 2 - 3, hh / 2 - 1, 2, 0, 7); pctx.fill()

    const g = pctx.createLinearGradient(0, -hh / 2, 0, hh / 2)
    g.addColorStop(0, lak.romp[0])
    g.addColorStop(1, lak.romp[1])
    pctx.fillStyle = g
    pctx.strokeStyle = lak.rand
    pctx.lineWidth = 2
    pctx.beginPath()
    pctx.moveTo(-w / 2, -hh / 2 + 6)
    pctx.lineTo(-w / 2 + 7, -hh / 2)
    pctx.lineTo(w / 2 - 7, -hh / 2)
    pctx.lineTo(w / 2, -hh / 2 + 6)
    pctx.lineTo(w / 2, hh / 2 - 2)
    pctx.lineTo(-w / 2, hh / 2 - 2)
    pctx.closePath()
    pctx.fill(); pctx.stroke()

    pctx.strokeStyle = rgba(lak.rand, 0.55)
    pctx.lineWidth = 1
    for (let i = 0; i < Math.min(4, Math.ceil(niveau('romp') / 2)); i++) {
      const py = -hh / 2 + 7 + i * 3.4
      pctx.beginPath(); pctx.moveTo(-w / 2 + 3, py); pctx.lineTo(w / 2 - 3, py); pctx.stroke()
    }
    // glans over de bovenkant, net als in het spel
    const glans = pctx.createLinearGradient(0, -hh / 2, 0, -hh / 2 + 7)
    glans.addColorStop(0, 'rgba(255,255,255,0.22)')
    glans.addColorStop(1, 'rgba(255,255,255,0)')
    pctx.fillStyle = glans
    pctx.fillRect(-w / 2 + 2, -hh / 2 + 1, w - 4, 7)

    const cab = pctx.createLinearGradient(-11, -hh / 2 + 2, 5, -hh / 2 + 11)
    cab.addColorStop(0, lak.cabine)
    cab.addColorStop(0.45, meng(lak.cabine, lak.romp[1], 0.55))
    cab.addColorStop(1, lak.romp[1])
    pctx.fillStyle = cab
    pctx.beginPath()
    if (pctx.roundRect) pctx.roundRect(-11, -hh / 2 + 2.5, 16, 10, 3)
    else pctx.rect(-11, -hh / 2 + 2.5, 16, 10)
    pctx.fill()
    pctx.strokeStyle = rgba(lak.rand, 0.85)
    pctx.lineWidth = 1
    pctx.stroke()

    const nB = niveau('boor')
    const boorKleur = nB >= 6 ? '#ff5ecb' : nB >= 3 ? '#c06bff' : '#a855f7'
    const bg = pctx.createLinearGradient(-9, hh / 2 - 3, 9, hh / 2 + 15)
    bg.addColorStop(0, licht(boorKleur, 1.5))
    bg.addColorStop(0.5, boorKleur)
    bg.addColorStop(1, licht(boorKleur, 0.5))
    pctx.fillStyle = bg
    pctx.beginPath(); pctx.moveTo(-9, hh / 2 - 3); pctx.lineTo(9, hh / 2 - 3); pctx.lineTo(0, hh / 2 + 16); pctx.closePath(); pctx.fill()
    pctx.strokeStyle = 'rgba(255,255,255,0.55)'
    pctx.lineWidth = 1.1
    for (let i = 1; i < 3; i++) {
      const t = i / 3, halfB = 8.6 * (1 - t)
      pctx.beginPath(); pctx.moveTo(-halfB, hh / 2 - 3 + t * 18); pctx.lineTo(halfB, hh / 2 - 3 + t * 18); pctx.stroke()
    }
    pctx.fillStyle = '#fff3cf'
    pctx.beginPath(); pctx.arc(w / 2 - 3, -3, 3.4, 0, 7); pctx.fill()
    pctx.restore()

    // koplampgloed, zo sterk als je koplamp is
    pctx.save()
    pctx.globalCompositeOperation = 'lighter'
    pctx.globalAlpha = 0.16 + niveau('koplamp') * 0.055
    pctx.drawImage(gloedVan('#ffe9b0'), b / 2 - 20, h / 2 - 60, 150, 120)
    pctx.restore()

    $('portret-naam').textContent = lak.naam
    $('portret-stats').innerHTML = SPOREN.map(s =>
      `<span class="pstat" title="${s.naam}">${s.icoon}<b style="color:${s.kleur}">${niveau(s.sleutel)}</b></span>`).join('')
  }

  function koop(sleutel) {
    const s = spoorVan(sleutel)
    const n = niveau(sleutel)
    const prijs = prijsVan(s, n)
    if (prijs === null || opslag.erts < prijs) return
    opslag.erts -= prijs
    opslag.upgrades[sleutel] = n + 1
    bewaar()
    naarBasis(`${s.naam} is nu niveau ${n + 1}.`)
  }

  $('duik-knop').onclick = startDuik
  $('uitleg-knop').onclick = () => toonUitleg(true)
  $('dood-door').onclick = () => naarBasis()
  $('slot-winkel').onclick = () => naarBasis()
  $('winst-door').onclick = () => naarBasis('De Sterrenkern staat in je basis.')
  $('slot-door').onclick = () => klaar()
  $('klaar-knop').onclick = () => klaar()
  $('terug').onclick = () => parent.postMessage({ type: 'graven-terug' }, '*')

  function klaar() {
    if (vrijSpelen) parent.postMessage({ type: 'graven-terug' }, '*')
    else parent.postMessage({ type: 'graven-gameover' }, '*')
  }

  // ── 7. Invoer ───────────────────────────────────────────────────────────
  const toetsen = { links: false, rechts: false, omhoog: false, omlaag: false }
  const kaart = {
    ArrowLeft: 'links', KeyA: 'links',
    ArrowRight: 'rechts', KeyD: 'rechts',
    ArrowUp: 'omhoog', KeyW: 'omhoog', Space: 'omhoog',
    ArrowDown: 'omlaag', KeyS: 'omlaag',
  }
  addEventListener('keydown', e => {
    if (e.code === 'KeyE') { e.preventDefault(); if (magStoppen()) rondDuikAf(); return }
    const t = kaart[e.code]
    if (!t) return
    e.preventDefault()
    toetsen[t] = true
  })
  const stopTik = (e) => { e.preventDefault(); if (magStoppen()) rondDuikAf() }
  $('stoppen').querySelector('b').addEventListener('pointerdown', stopTik)
  $('stop-chip').addEventListener('pointerdown', stopTik)
  addEventListener('keyup', e => { const t = kaart[e.code]; if (t) toetsen[t] = false })

  const aanraakbaar = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
  document.querySelectorAll('.tik').forEach(el => {
    const t = el.dataset.toets
    const aan = (e) => { e.preventDefault(); toetsen[t] = true; el.classList.add('actief') }
    const uit = (e) => { e.preventDefault(); toetsen[t] = false; el.classList.remove('actief') }
    el.addEventListener('pointerdown', aan)
    el.addEventListener('pointerup', uit)
    el.addEventListener('pointercancel', uit)
    el.addEventListener('pointerleave', uit)
  })

  // ── De lus ──────────────────────────────────────────────────────────────
  let laatsteTijd = 0, klok = 0

  function lus(nu) {
    if (!bezig) return
    const dt = Math.min(0.05, (nu - laatsteTijd) / 1000)
    laatsteTijd = nu
    klok += dt
    stap(dt)
    teken()
    hudBij()
    requestAnimationFrame(lus)
  }

  function stap(dt) {
    if (sp.raakCooldown > 0) sp.raakCooldown -= dt
    if (sp.schud > 0) sp.schud = Math.max(0, sp.schud - dt * 2.2)
    if (meldTimer > 0) { meldTimer -= dt; if (meldTimer <= 0) $('waarschuwing').classList.remove('aan') }

    const laag = laagVanRij(Math.max(0, Math.floor(sp.y / TEGEL)))
    let verbruik = 0.35   // stationair

    // horizontaal
    const kracht = rijKracht()
    if (toetsen.links) { sp.vx = -kracht; sp.kijk = -1; verbruik = 1.4 }
    else if (toetsen.rechts) { sp.vx = kracht; sp.kijk = 1; verbruik = 1.4 }
    else sp.vx *= 0.75

    // stijgen — de duurste knop van het spel. De stuwkracht moet ruim boven de
    // zwaartekracht liggen, anders kom je niet vooruit; stijgKracht() is de
    // maximale stijgsnelheid waarop we daarna aftoppen.
    const tegenPlafond = doelTegels('omhoog').some(([c, r]) => vast(cel(c, r)))
    const stijgt = toetsen.omhoog && sp.brandstof > 0 && !tegenPlafond
    if (stijgt) {
      sp.vy -= STUWKRACHT * dt
      verbruik = 5.2
    }
    sp.vy = Math.min(MAX_VAL, sp.vy + ZWAARTE * dt)
    if (stijgt) sp.vy = Math.max(-stijgKracht(), sp.vy)

    // boren: de richting die je vasthoudt, tegen een tegel aan
    let boortNu = false
    if (toetsen.omlaag) boortNu = boor('omlaag', dt)
    else if (toetsen.omhoog && tegenPlafond) boortNu = boor('omhoog', dt)
    else if (toetsen.links) boortNu = boor('links', dt)
    else if (toetsen.rechts) boortNu = boor('rechts', dt)
    if (!boortNu && !toetsen.omlaag) { sp.boorRichting = null; sp.boorVoortgang = 0 }
    if (boortNu) verbruik = Math.max(verbruik, 1.7)

    beweeg(dt)
    if (!bezig) return

    // brandstof — nergens in dit bestand staat iets wat hem onder de grond vult
    sp.brandstof = Math.max(0, sp.brandstof - verbruik * laag.fuel * dt)
    if (sp.brandstof <= 0 && sp.y > 0) { gaDood('brandstof'); return }
    if (sp.brandstof > 0 && sp.brandstof < maxBrandstof() * 0.25 && meldTimer <= 0) {
      melding('Je brandstof raakt op — ga terug naar boven!', 1600)
    }

    // hitte in de magmakern
    if (laag.hitte && hitteSchade() > 0) {
      sp.romp -= hitteSchade() * dt
      if (sp.romp <= 0) { gaDood('hitte'); return }
    }

    magneetBij()
    checkGasEnLava()
    if (!bezig) return
    checkLosseBlokken()
    werkVallersBij(dt)
    wormBij(dt)
    if (!bezig) return

    for (let i = stof.length - 1; i >= 0; i--) { stof[i].l -= dt * 1.6; if (stof[i].l <= 0) stof.splice(i, 1) }
    for (let i = knallen.length - 1; i >= 0; i--) { knallen[i].l -= dt * 1.8; if (knallen[i].l <= 0) knallen.splice(i, 1) }

    if (diepteMeter() > opslag.record) opslag.record = diepteMeter()

    // Nieuwe laag binnengekomen? Even melden, dat voelt als vooruitgang.
    const laagIdx = LAGEN.indexOf(laag)
    if (laagIdx !== laatsteLaag && diepteMeter() > 4) {
      if (laatsteLaag >= 0 && laagIdx > laatsteLaag) {
        banner(LAGEN[laagIdx].naam, LAGEN[laagIdx].vanaf + ' meter diep', laagKleur(laagIdx))
      }
      laatsteLaag = laagIdx
    }
    checkBoven()

    // camera
    const doelY = sp.y - zichtHoogte() * 0.42
    camY += (doelY - camY) * Math.min(1, dt * 7)
    camY = Math.min(camY, HOOGTE - zichtHoogte())
  }

  // ── Start ───────────────────────────────────────────────────────────────
  meet()
  if (vrijSpelen) $('terug').classList.add('aan')
  if (opslag.uitleg < UITLEG_KEER) toonUitleg(false)
  else if (opslag.duiken <= 0 && !vrijSpelen) naarBasis()
  else if (opslag.duiken <= 0) toon('slot')
  else naarBasis()
})()
