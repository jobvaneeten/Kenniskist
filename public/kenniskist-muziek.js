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
//   radio — instrumentale streams van SomaFM. Geen beeld, geen advertenties,
//           geen inloggen. Kost wel bandbreedte: reken op ~64 kbit/s per kind.
//   focus — regen, ruis, haard, rumoer. Hier ter plekke gemaakt met gefilterde
//           ruis, dus nul bestanden en nul netwerk. Melodie namaken klinkt
//           goedkoop, sfeergeluid niet.
(function () {
  if (window.top !== window) return          // in een iframe: niets doen

  var SLEUTEL = 'kk_muziek'
  var STANDAARD_VOLUME = 0.35

  // SomaFM draait op donaties en staat direct afspelen toe; de 64k-aac-streams
  // halveren het verbruik ten opzichte van 128k-mp3. Vandaar ook de credit
  // onderin het paneeltje.
  //
  // De adressen komen uit de .pls-playlists van SomaFM zelf (api.somafm.com/
  // <zender>64.pls). Elke zender heeft drie spiegels; ligt er één plat, dan
  // schakelt de speler door naar de volgende.
  var SPIEGELS = ['ice2', 'ice6', 'ice5']
  function streams(zender) {
    return SPIEGELS.map(function (s) { return 'https://' + s + '.somafm.com/' + zender + '-64-aac' })
  }
  var ZENDERS = [
    { id: 'groovesalad', naam: 'Chill',   omschrijving: 'rustige beats',        urls: streams('groovesalad') },
    { id: 'fluid',       naam: 'Lo-fi',   omschrijving: 'instrumentale hiphop', urls: streams('fluid') },
    { id: 'dronezone',   naam: 'Ambient', omschrijving: 'zweverig en rustig',   urls: streams('dronezone') },
    { id: 'beatblender', naam: 'Beats',   omschrijving: 'iets meer tempo',      urls: streams('beatblender') }
  ]

  var FOCUS = [
    { id: 'regen', naam: 'Regen',  omschrijving: 'tikkend op het raam' },
    { id: 'ruis',  naam: 'Ruis',   omschrijving: 'dempt de klas' },
    { id: 'haard', naam: 'Haard',  omschrijving: 'knappend vuur' },
    { id: 'cafe',  naam: 'Rumoer', omschrijving: 'zacht geroezemoes' }
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

  // -- Focusgeluid (Web Audio) ------------------------------------------
  var ac = null, focusGain = null, focusKnopen = [], krakenTimer = null

  function ruisBuffer(bruin) {
    var lengte = ac.sampleRate * 4
    var buf = ac.createBuffer(1, lengte, ac.sampleRate)
    var d = buf.getChannelData(0)
    var vorige = 0
    for (var i = 0; i < lengte; i++) {
      var wit = Math.random() * 2 - 1
      if (bruin) { vorige = (vorige + 0.02 * wit) / 1.02; d[i] = vorige * 3.5 }
      else d[i] = wit
    }
    return buf
  }

  function focusStop() {
    if (krakenTimer) { clearTimeout(krakenTimer); krakenTimer = null }
    for (var i = 0; i < focusKnopen.length; i++) {
      try { focusKnopen[i].stop ? focusKnopen[i].stop() : focusKnopen[i].disconnect() } catch (e) {}
    }
    focusKnopen = []
  }

  function focusSpeel(id) {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)()
    if (ac.state === 'suspended') ac.resume()
    focusStop()
    if (!focusGain) { focusGain = ac.createGain(); focusGain.connect(ac.destination) }
    focusGain.gain.value = staat.gedempt ? 0 : staat.volume * 0.6

    var bron = ac.createBufferSource()
    bron.buffer = ruisBuffer(id !== 'regen')
    bron.loop = true

    var filter = ac.createBiquadFilter()
    if (id === 'regen') { filter.type = 'bandpass'; filter.frequency.value = 1400; filter.Q.value = 0.5 }
    else if (id === 'ruis') { filter.type = 'lowpass'; filter.frequency.value = 900 }
    else if (id === 'haard') { filter.type = 'lowpass'; filter.frequency.value = 420 }
    else { filter.type = 'lowpass'; filter.frequency.value = 300 }

    bron.connect(filter)
    filter.connect(focusGain)
    bron.start()
    focusKnopen.push(bron, filter)

    // Een egale ruislus verraadt zichzelf; daarom leeft de klank een beetje.
    var lfo = ac.createOscillator(), lfoGain = ac.createGain()
    lfo.frequency.value = id === 'cafe' ? 0.15 : 0.08
    lfoGain.gain.value = id === 'regen' ? 320 : 60
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)
    lfo.start()
    focusKnopen.push(lfo, lfoGain)

    if (id === 'haard' || id === 'cafe') plantKraak(id)
  }

  // Losse knapjes (haard) of gedempte stemgeluiden (rumoer), op willekeurige
  // momenten - dat maakt het verschil tussen "ruis" en "een plek".
  function plantKraak(id) {
    var wacht = id === 'haard' ? 120 + Math.random() * 900 : 400 + Math.random() * 1800
    krakenTimer = setTimeout(function () {
      if (!ac || !focusGain) return
      var b = ac.createBufferSource()
      b.buffer = ruisBuffer(id === 'cafe')
      var f = ac.createBiquadFilter()
      f.type = id === 'haard' ? 'highpass' : 'bandpass'
      f.frequency.value = id === 'haard' ? 1800 : 500
      var g = ac.createGain()
      var duur = id === 'haard' ? 0.05 + Math.random() * 0.08 : 0.3 + Math.random() * 0.5
      var piek = (id === 'haard' ? 0.5 : 0.22) * (staat.gedempt ? 0 : 1)
      g.gain.setValueAtTime(0, ac.currentTime)
      g.gain.linearRampToValueAtTime(piek, ac.currentTime + duur * 0.2)
      g.gain.linearRampToValueAtTime(0, ac.currentTime + duur)
      b.connect(f)
      f.connect(g)
      g.connect(focusGain)
      b.start()
      b.stop(ac.currentTime + duur)
      plantKraak(id)
    }, wacht)
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
    var link = document.createElement('a')
    link.href = 'https://somafm.com'
    link.target = '_blank'
    link.rel = 'noopener'
    link.textContent = 'SomaFM'
    link.style.color = '#a5b4fc'
    credit.appendChild(document.createTextNode('Radio via '))
    credit.appendChild(link)
    credit.appendChild(document.createTextNode(' · focusgeluid maakt de app zelf'))
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
