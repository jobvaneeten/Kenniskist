// Achtergrondmuziek tijdens het oefenen. Optioneel: staat uit tot een kind
// hem zelf aanzet, en de keuze blijft in localStorage staan per apparaat.
//
// Waarom hier en niet in React: dit script hangt in index.html, buiten de
// React-boom. Daardoor blijft de muziek doorspelen als een kind van rekenen
// naar een spel klikt, en blijft het knopje zichtbaar boven een oefening die
// schermvullend in een iframe draait (die iframes zitten in ditzelfde
// document, dus een hoge z-index is genoeg).
//
// Twee soorten geluid, allebei een gewone keuze:
//   radio — gewone radiozenders (hardstyle, house, top 40, Nederlandstalig).
//           Geen beeld en geen inloggen, wel reclame en dj-praat. Kost
//           bandbreedte: 96 tot 192 kbit/s per kind.
//   focus — regen, golven, wind, haardvuur en twee soorten ruis. Grotendeels
//           hier ter plekke gemaakt, dus nul bestanden en nul netwerk; melodie
//           namaken klinkt goedkoop, sfeergeluid niet. Waar namaak tekortschiet
//           gebruiken we een echte opname (zie `bestand` in FOCUS).
(function () {
  if (window.top !== window) return          // in een iframe: niets doen

  var SLEUTEL = 'kk_muziek'
  var STANDAARD_VOLUME = 0.35

  // Vier zenders in de genres die de kinderen vroegen. De adressen komen uit de
  // open radiodatabase radio-browser.info en zijn stuk voor stuk https - een
  // http-stream weigert de browser op een https-site.
  //
  // Twee dingen om te weten: dit zijn gewone commerciele zenders, dus er zitten
  // reclame en dj-praat tussen, en er wordt gezongen. Voor concentratie is het
  // focusgeluid hiernaast rustiger. En het kost bandbreedte: reken op 96 tot 192
  // kbit/s per kind, dus met dertig kinderen tegelijk enkele megabits per
  // seconde. Waar een lichtere variant bestaat staat die vooraan.
  var ZENDERS = [
    {
      id: 'hardstyle', naam: 'Hardstyle', omschrijving: 'Q-dance',
      urls: [
        'https://playerservices.streamtheworld.com/api/livestream-redirect/Q_DANCEAAC.aac',
        'https://playerservices.streamtheworld.com/api/livestream-redirect/Q_DANCE.mp3'
      ]
    },
    {
      id: 'house', naam: 'House', omschrijving: 'dance, de hele dag',
      urls: ['https://dancewave.online/dance.mp3']
    },
    {
      id: 'top40', naam: 'Top 40', omschrijving: 'Qmusic',
      urls: [
        'https://icecast-qmusicnl-cdp.triple-it.nl/Qmusic_nl_live_96.mp3',
        'https://playerservices.streamtheworld.com/api/livestream-redirect/SRGSTR01.mp3'
      ]
    },
    {
      id: 'nl', naam: 'Nederlands', omschrijving: 'RADIONL',
      urls: ['https://stream.radionl.fm/radionl']
    }
  ]

  // Zes sfeergeluiden. Ze worden niet "live gefilterd" maar sample voor
  // sample uitgerekend in een lus van veertien seconden, met een crossfade zodat
  // je het herhalen niet hoort. Dat scheelt: regen bestaat uit losse druppels en
  // een haardvuur uit korte knapjes, en dat krijg je met een ruisfilter alleen
  // nooit overtuigend.
  var FOCUS = [
    { id: 'regen',  naam: 'Regen',       omschrijving: 'op een tent', bestand: '/muziek/regen.mp3' },
    { id: 'zee',    naam: 'Golven',      omschrijving: 'zee op het strand' },
    { id: 'wind',   naam: 'Wind',        omschrijving: 'om het huis', bestand: '/muziek/wind.mp3' },
    { id: 'haard',  naam: 'Haardvuur',   omschrijving: 'knappend hout', bestand: '/muziek/haard.mp3' },
    { id: 'bruin',  naam: 'Bruine ruis', omschrijving: 'diep en warm' },
    { id: 'wit',    naam: 'Witte ruis',  omschrijving: 'scherp, dempt alles' }
  ]

  function leesInstelling() {
    try {
      var v = JSON.parse(localStorage.getItem(SLEUTEL) || 'null')
      if (v && typeof v === 'object') return v
    } catch (e) { /* stuk of leeg: standaard */ }
    return { bron: null, volume: STANDAARD_VOLUME }
  }
  function bewaar() {
    try { localStorage.setItem(SLEUTEL, JSON.stringify({ bron: staat.bron, volume: staat.volume })) } catch (e) {}
  }

  var opgeslagen = leesInstelling()
  var staat = {
    bron: null,                    // 'radio:<id>' | 'focus:<id>' | null
    volume: typeof opgeslagen.volume === 'number' ? opgeslagen.volume : STANDAARD_VOLUME,
    gedempt: false,                // door een oefening met spraak
    open: false
  }

  // -- Radio ------------------------------------------------------------
  var audio = null, spiegelNr = 0, huidigeUrls = null

  function radioSpeel(urls, vanaf) {
    huidigeUrls = urls
    spiegelNr = vanaf || 0
    if (spiegelNr >= urls.length) {
      toonFout('Radio lukt niet - waarschijnlijk blokkeert het schoolnetwerk het. Focusgeluid werkt wel.')
      return
    }
    if (!audio) {
      audio = new Audio()
      audio.preload = 'none'
      // Volgende spiegel proberen; pas na de laatste een melding.
      audio.addEventListener('error', function () {
        if (huidigeUrls) radioSpeel(huidigeUrls, spiegelNr + 1)
      })
    }
    audio.src = urls[spiegelNr]
    audio.volume = staat.gedempt ? 0 : staat.volume
    var p = audio.play()
    if (p && p.catch) p.catch(function () { radioSpeel(huidigeUrls, spiegelNr + 1) })
  }
  function radioStop() {
    huidigeUrls = null
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }

  // -- Focusgeluid: zelf uitgerekend ------------------------------------
  var ac = null, focusGain = null, focusBron = null, buffers = {}

  // Toestandsvariabelen-filter: geeft een resonerende band terug. Per druppel
  // of knapje eentje; dat bepaalt de "toon" ervan.
  function resonator(f0, q, sr) {
    var F = 2 * Math.sin(Math.PI * Math.min(f0, sr * 0.45) / sr)
    var Q = 1 / q
    var laag = 0, band = 0
    return function (x) {
      laag += F * band
      var hoog = x - laag - Q * band
      band += F * hoog
      return band
    }
  }

  // Eenpolig laagdoorlaat, voor de bedding onder een geluid.
  function laagdoorlaat(f0, sr) {
    var a = Math.exp(-2 * Math.PI * f0 / sr)
    var y = 0
    return function (x) { y = (1 - a) * x + a * y; return y }
  }

  // Zet een korrel (druppel, knapje, tik) op positie start in de buffer.
  function korrel(d, start, duur, sr, f0, q, piek) {
    var n = Math.floor(duur * sr)
    var res = resonator(f0, q, sr)
    for (var k = 0; k < n && start + k < d.length; k++) {
      var env = Math.exp(-5 * k / n)
      d[start + k] += res((Math.random() * 2 - 1) * env) * piek
    }
  }

  function maakBuffer(id) {
    var sr = ac.sampleRate
    var duurSec = 14
    var n = Math.floor(sr * duurSec)
    var buf = ac.createBuffer(1, n, sr)
    var d = buf.getChannelData(0)
    var i, k

    // wit, bruin en alles wat we verder niet kennen
    if (id !== 'regen' && id !== 'zee' && id !== 'wind' && id !== 'haard') {
      var vorige = 0
      var lp = laagdoorlaat(id === 'bruin' ? 500 : 9000, sr)
      for (i = 0; i < n; i++) {
        var wit = Math.random() * 2 - 1
        if (id === 'bruin') { vorige = (vorige + 0.02 * wit) / 1.02; d[i] = lp(vorige * 3.2) }
        else d[i] = lp(wit) * 0.5
      }

    } else if (id === 'regen') {
      // Bedding: het zachte ruisen van water op afstand. Daaroverheen de tikken
      // op het tentdoek - dof en laag, dat is wat het herkenbaar maakt.
      var lpBed = laagdoorlaat(600, sr)
      for (i = 0; i < n; i++) d[i] = lpBed(Math.random() * 2 - 1) * 0.14
      var perSec = 80
      for (k = 0; k < duurSec * perSec; k++) {
        // Doek dempt de hoge tonen weg; daarom laag en met weinig naklank.
        korrel(d, Math.floor(Math.random() * n), 0.008 + Math.random() * 0.012, sr,
               380 + Math.random() * 950, 2.5 + Math.random() * 3, 0.05 + Math.random() * 0.06)
      }

    } else if (id === 'zee') {
      // Golven: brede ruis met een trage ademhaling eroverheen, plus schuim op
      // het hoogtepunt van elke golf.
      var lpZee = laagdoorlaat(700, sr)
      var hpSchuim = resonator(2200, 1.2, sr)
      var golfDuur = 7
      for (i = 0; i < n; i++) {
        var fase = ((i / sr) % golfDuur) / golfDuur
        var env = fase < 0.28 ? Math.pow(fase / 0.28, 1.6) : Math.pow(1 - (fase - 0.28) / 0.72, 1.8)
        var ruis = Math.random() * 2 - 1
        d[i] = lpZee(ruis) * (0.10 + 0.42 * env) + hpSchuim(ruis) * 0.05 * Math.max(0, env - 0.55)
      }

    } else if (id === 'wind') {
      // Wind is ruis waarvan de toonhoogte langzaam wandelt; twee banden door
      // elkaar klinkt voller dan een.
      var doel1 = 420, nu1 = 420, doel2 = 900, nu2 = 900
      var r1 = resonator(nu1, 2.2, sr), r2 = resonator(nu2, 3.0, sr), teller = 0
      for (i = 0; i < n; i++) {
        if (teller-- <= 0) {
          teller = Math.floor(sr * 0.05)
          nu1 += (doel1 - nu1) * 0.08
          nu2 += (doel2 - nu2) * 0.06
          if (Math.random() < 0.02) doel1 = 260 + Math.random() * 500
          if (Math.random() < 0.02) doel2 = 700 + Math.random() * 900
          r1 = resonator(nu1, 2.2, sr)
          r2 = resonator(nu2, 3.0, sr)
        }
        var w = Math.random() * 2 - 1
        d[i] = r1(w) * 0.28 + r2(w) * 0.16
      }

    } else if (id === 'haard') {
      // Diep gerommel van het vuur, en dan de knapjes: kort, scherp en in
      // onregelmatige trosjes. Losse gelijkmatige tikjes klinken nergens naar.
      var lpVuur = laagdoorlaat(160, sr)
      var vor = 0
      for (i = 0; i < n; i++) {
        var wv = Math.random() * 2 - 1
        vor = (vor + 0.02 * wv) / 1.02
        d[i] = lpVuur(vor * 3.2) * 0.55
      }
      var tijd = 0
      while (tijd < duurSec) {
        tijd += 0.15 + Math.random() * 0.9
        var tros = 1 + Math.floor(Math.random() * 5)
        for (k = 0; k < tros; k++) {
          var t2 = tijd + k * (0.01 + Math.random() * 0.05)
          if (t2 >= duurSec) break
          korrel(d, Math.floor(t2 * sr), 0.004 + Math.random() * 0.012, sr,
                 1200 + Math.random() * 3200, 6 + Math.random() * 10, 0.25 + Math.random() * 0.45)
        }
        if (Math.random() < 0.25) {
          korrel(d, Math.floor(tijd * sr), 0.05 + Math.random() * 0.06, sr, 180 + Math.random() * 160, 3, 0.3)
        }
      }

    }

    // Naadloos maken: het staartje overvloeien in het begin, anders hoor je elke
    // veertien seconden een klik.
    var fade = Math.floor(sr * 0.6)
    for (k = 0; k < fade; k++) {
      var m = k / fade
      d[k] = d[k] * m + d[n - fade + k] * (1 - m)
    }

    // Normaliseren op luidheid (rms), niet op de piek. Op de piek normaliseren
    // maakt juist de geluiden met harde uitschieters - het haardvuur - veel te
    // zacht, want dan drukt een enkel knapje de rest omlaag. De uitschieters
    // vangen we daarna zacht af, zodat er niets hoorbaar afgekapt wordt.
    var somQ = 0
    for (i = 0; i < n; i++) somQ += d[i] * d[i]
    var rms = Math.sqrt(somQ / n)
    if (rms > 0) {
      var f = 0.09 / rms
      for (i = 0; i < n; i++) {
        var v = d[i] * f
        var a = Math.abs(v)
        d[i] = a < 0.7 ? v : (v < 0 ? -1 : 1) * (0.7 + 0.3 * Math.tanh((a - 0.7) / 0.3))
      }
    }

    return buf
  }

  function focusStop() {
    if (focusBron) { try { focusBron.stop() } catch (e) {} focusBron = null }
  }

  function speelBuffer(buf) {
    focusStop()
    focusBron = ac.createBufferSource()
    focusBron.buffer = buf
    focusBron.loop = true
    focusBron.connect(focusGain)
    focusBron.start()
  }

  // Een aangeleverd geluidsbestand (zie `bestand` in FOCUS) krijgt dezelfde
  // behandeling als een zelfgemaakt geluid: naadloos maken en op dezelfde
  // luidheid zetten, zodat het niet ineens veel harder is dan de rest.
  function bewerkOpname(buf) {
    var sr = buf.sampleRate
    var fade = Math.min(Math.floor(sr * 0.4), Math.floor(buf.length / 3))
    for (var c = 0; c < buf.numberOfChannels; c++) {
      var d = buf.getChannelData(c)
      var n = d.length
      if (n > sr * 3) {
        for (var k = 0; k < fade; k++) {
          var m = k / fade
          d[k] = d[k] * m + d[n - fade + k] * (1 - m)
        }
      }
      // Op luidheid brengen, maar niet ten koste van de tikken en knapjes.
      // Een opname is vaak zacht opgenomen met scherpe pieken erin; puur op
      // rms optrekken duwt die pieken door de begrenzer en dan klinkt regen
      // als geknepen ruis. Daarom ook naar de pieken kijken en de zachtste
      // van de twee versterkingen nemen.
      var somQ = 0
      for (var i = 0; i < n; i++) somQ += d[i] * d[i]
      var rms = Math.sqrt(somQ / n)
      var proef = []
      for (i = 0; i < n; i += 37) proef.push(Math.abs(d[i]))
      proef.sort(function (x, y) { return x - y })
      var p995 = proef[Math.floor(proef.length * 0.995)] || 1
      if (rms > 0) {
        var f = Math.min(0.09 / rms, 0.9 / p995)
        for (i = 0; i < n; i++) {
          var v = d[i] * f, a = Math.abs(v)
          d[i] = a < 0.7 ? v : (v < 0 ? -1 : 1) * (0.7 + 0.3 * Math.tanh((a - 0.7) / 0.3))
        }
      }
    }
    return buf
  }

  function focusSpeel(id) {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)()
    if (ac.state === 'suspended') ac.resume()
    focusStop()
    if (!focusGain) { focusGain = ac.createGain(); focusGain.connect(ac.destination) }
    focusGain.gain.value = staat.gedempt ? 0 : staat.volume * 0.6

    if (buffers[id]) { speelBuffer(buffers[id]); return }

    var entry = null
    for (var i = 0; i < FOCUS.length; i++) if (FOCUS[i].id === id) entry = FOCUS[i]

    var maakZelf = function () {
      buffers[id] = maakBuffer(id)
      if (staat.bron === 'focus:' + id) speelBuffer(buffers[id])
    }

    // Staat er een opname klaar, dan wint die het van het namaakgeluid. Staat
    // hij er niet (of is hij stuk), dan merkt het kind daar niets van.
    if (entry && entry.bestand && window.fetch) {
      fetch(entry.bestand)
        .then(function (r) { if (!r.ok) throw new Error('geen bestand'); return r.arrayBuffer() })
        .then(function (ab) { return ac.decodeAudioData(ab) })
        .then(function (buf) {
          buffers[id] = bewerkOpname(buf)
          if (staat.bron === 'focus:' + id) speelBuffer(buffers[id])
        })
        .catch(maakZelf)
      return
    }
    maakZelf()
  }
  // -- Aansturing --------------------------------------------------------
  function kies(bron) {
    staat.bron = bron
    bewaar()
    radioStop()
    focusStop()
    if (bron) {
      var soort = bron.split(':')[0], id = bron.split(':')[1]
      if (soort === 'radio') {
        for (var i = 0; i < ZENDERS.length; i++) {
          if (ZENDERS[i].id === id) { radioSpeel(ZENDERS[i].urls, 0); break }
        }
      } else {
        focusSpeel(id)
      }
    }
    tekenKnop()
    tekenPaneel()
  }

  function zetVolume(v) {
    staat.volume = v
    bewaar()
    if (audio) audio.volume = staat.gedempt ? 0 : v
    if (focusGain) focusGain.gain.value = staat.gedempt ? 0 : v * 0.6
  }

  // Aangeroepen vanuit oefeningen met spraak (dictee, Engels): die zijn
  // onverstaanbaar met muziek eronder.
  function demp(aan) {
    staat.gedempt = !!aan
    if (audio) {
      if (aan) audio.pause()
      else if (staat.bron && staat.bron.indexOf('radio:') === 0) { var p = audio.play(); if (p && p.catch) p.catch(function () {}) }
    }
    if (focusGain) focusGain.gain.value = aan ? 0 : staat.volume * 0.6
    tekenKnop()
    tekenPaneel()
  }

  // -- Uiterlijk ---------------------------------------------------------
  var knop = null, paneel = null, foutRegel = ''

  function toonFout(t) { foutRegel = t; tekenPaneel() }

  function stijl(el, css) { for (var k in css) el.style[k] = css[k] }

  function tekenKnop() {
    if (!knop) {
      knop = document.createElement('button')
      knop.type = 'button'
      knop.setAttribute('aria-label', 'Muziek')
      stijl(knop, {
        position: 'fixed', left: '14px', bottom: '14px', zIndex: '2147483000',
        width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(15,18,32,0.82)',
        color: '#fff', fontSize: '20px', lineHeight: '1'
      })
      knop.onclick = function () { staat.open = !staat.open; tekenPaneel() }
      document.body.appendChild(knop)
    }
    var speelt = !!staat.bron && !staat.gedempt
    knop.style.display = (verborgen && !staat.bron) ? 'none' : 'block'
    knop.textContent = staat.gedempt ? '🔇' : (staat.bron ? '🎵' : '🎧')
    knop.style.boxShadow = speelt ? '0 0 0 2px rgba(99,102,241,0.7)' : 'none'
    knop.title = staat.gedempt ? 'Muziek staat even uit voor deze oefening'
      : staat.bron ? 'Muziek speelt' : 'Muziek aanzetten'
  }

  function knopje(label, sub, actief, bijKlik) {
    var b = document.createElement('button')
    b.type = 'button'
    var s1 = document.createElement('span')
    s1.textContent = label
    s1.style.fontWeight = '800'
    var s2 = document.createElement('span')
    s2.textContent = sub
    stijl(s2, { opacity: '.6', fontSize: '11px', display: 'block' })
    b.appendChild(s1)
    b.appendChild(s2)
    stijl(b, {
      textAlign: 'left', padding: '8px 10px', borderRadius: '9px', cursor: 'pointer',
      border: '1px solid ' + (actief ? '#a5b4fc' : 'rgba(255,255,255,0.14)'),
      background: actief ? 'rgba(99,102,241,0.28)' : 'rgba(255,255,255,0.06)',
      color: '#fff', font: '13px/1.3 Nunito, system-ui, sans-serif'
    })
    b.onclick = bijKlik
    return b
  }

  function tekenPaneel() {
    if (paneel) { paneel.parentNode && paneel.parentNode.removeChild(paneel); paneel = null }
    if (!staat.open) return

    paneel = document.createElement('div')
    stijl(paneel, {
      position: 'fixed', left: '14px', bottom: '66px', zIndex: '2147483000',
      width: '270px', padding: '14px', borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(12,15,26,0.96)',
      color: '#fff', font: '13px Nunito, system-ui, sans-serif',
      boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
    })

    var kop = document.createElement('div')
    stijl(kop, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' })
    var titel = document.createElement('strong')
    titel.textContent = 'Muziek'
    titel.style.fontSize = '14px'
    kop.appendChild(titel)
    var uit = document.createElement('button')
    uit.type = 'button'
    uit.textContent = 'uit'
    stijl(uit, { background: 'none', border: 'none', color: '#c7d2fe', cursor: 'pointer', font: 'inherit', fontWeight: '800' })
    uit.onclick = function () { kies(null) }
    kop.appendChild(uit)
    paneel.appendChild(kop)

    if (staat.gedempt) {
      var m = document.createElement('p')
      m.textContent = 'Staat even uit zolang deze oefening praat.'
      stijl(m, { margin: '6px 0 0', opacity: '.7' })
      paneel.appendChild(m)
    }

    var groepen = [['Radio', ZENDERS, 'radio'], ['Focusgeluid', FOCUS, 'focus']]
    for (var gi = 0; gi < groepen.length; gi++) {
      var groep = groepen[gi]
      var t = document.createElement('div')
      t.textContent = groep[0]
      stijl(t, { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.05em', opacity: '.55', margin: '12px 0 6px', fontWeight: '800' })
      paneel.appendChild(t)
      var rij = document.createElement('div')
      stijl(rij, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' })
      for (var xi = 0; xi < groep[1].length; xi++) {
        var x = groep[1][xi]
        var sleutel = groep[2] + ':' + x.id
        rij.appendChild(knopje(x.naam, x.omschrijving, staat.bron === sleutel, (function (s) {
          return function () { kies(s) }
        })(sleutel)))
      }
      paneel.appendChild(rij)
    }

    var vol = document.createElement('input')
    vol.type = 'range'
    vol.min = '0'; vol.max = '1'; vol.step = '0.05'
    vol.value = String(staat.volume)
    stijl(vol, { width: '100%', marginTop: '12px' })
    vol.oninput = function () { zetVolume(parseFloat(vol.value)) }
    paneel.appendChild(vol)

    if (foutRegel) {
      var f = document.createElement('p')
      f.textContent = foutRegel
      stijl(f, { margin: '8px 0 0', color: '#fca5a5' })
      paneel.appendChild(f)
    }

    var credit = document.createElement('p')
    stijl(credit, { margin: '10px 0 0', fontSize: '11px', opacity: '.5' })
    credit.appendChild(document.createTextNode('Radio speelt de zender rechtstreeks af · focusgeluid maakt de app zelf'))
    paneel.appendChild(credit)

    document.body.appendChild(paneel)
  }

  // Het leerkrachtenportaal is een werkscherm voor volwassenen; daar hoort geen
  // muziekknop te zweven. Speelt er toevallig iets, dan blijft de knop wel
  // staan - anders kun je het niet meer uitzetten.
  var verborgen = false
  function toon(zichtbaar) {
    verborgen = !zichtbaar
    if (verborgen) staat.open = false
    tekenKnop()
    tekenPaneel()
  }

  function start() {
    tekenKnop()
    // Bewust niet automatisch hervatten: browsers blokkeren geluid zonder klik,
    // en een kind dat de app opent hoort niet meteen muziek te krijgen.
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()

  window.KennisKistMuziek = {
    kies: kies,
    toon: toon,
    demp: demp,
    zetVolume: zetVolume,
    staat: function () { return staat }
  }
})()
