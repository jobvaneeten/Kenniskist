// ═══════════════════════════════════════════════════════════════════════════
//  NEONKIT: gedeelde basis voor de losse neon-spellen (Lichtlab, Komeetstaart,
//  Kristalsmelt). Opslag, geluid, noorderlicht-achtergrond, deeltjes,
//  schermschok, vegen/toetsen/controller en de inbedding in de site.
//  Geen spelregels: die staan per spel in kern.js.
// ═══════════════════════════════════════════════════════════════════════════
var NK = (function () {
  'use strict'

  // ── inbedding: ?terug=1 is een vrij spel, zonder is het een beloning ──
  var params = new URLSearchParams(location.search)
  var BELONING = !params.has('terug')
  function naarOuder(type) { try { parent.postMessage({ type: type }, '*') } catch (e) { /* los geopend */ } }

  // ── opslag (kk_-prefix: synct mee naar het account) ──
  function opslag(sleutel, standaard) {
    var d = {}
    try { d = JSON.parse(localStorage.getItem(sleutel) || '{}') || {} } catch (e) { d = {} }
    var D = {}
    for (var k in standaard) D[k] = d[k] !== undefined ? d[k] : JSON.parse(JSON.stringify(standaard[k]))
    D.bewaar = function () {
      var kopie = {}
      for (var k2 in D) if (typeof D[k2] !== 'function') kopie[k2] = D[k2]
      try { localStorage.setItem(sleutel, JSON.stringify(kopie)) } catch (e) { /* geen opslag */ }
    }
    return D
  }

  // ── geluid: kleine synthesizer met één hoofdvolume en een compressor ──
  var AC = null, hoofd = null, ruisBuf = null, geluidAan = function () { return true }
  function audio() {
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)()
        var comp = AC.createDynamicsCompressor(); comp.connect(AC.destination)
        hoofd = AC.createGain(); hoofd.gain.value = 0.55; hoofd.connect(comp)
      } catch (e) { AC = null }
    }
    if (AC && AC.state === 'suspended') AC.resume()
    return AC
  }
  function toon(f, dur, type, vol, delay, f2) {
    if (!geluidAan()) return
    var a = audio(); if (!a) return
    var t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain()
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t)
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(hoofd); o.start(t); o.stop(t + dur + 0.02)
  }
  function ruis(dur, vol, freq, q, delay, hoog) {
    if (!geluidAan()) return
    var a = audio(); if (!a) return
    if (!ruisBuf) {
      ruisBuf = a.createBuffer(1, a.sampleRate, a.sampleRate)
      var d = ruisBuf.getChannelData(0)
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    }
    var t = a.currentTime + (delay || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain()
    s.buffer = ruisBuf; f.type = hoog ? 'highpass' : 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = q || 1
    g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f); f.connect(g); g.connect(hoofd); s.start(t); s.stop(t + dur + 0.02)
  }
  var Geluid = {
    zetAan: function (f) { geluidAan = f },
    toon: toon, ruis: ruis, audio: audio,
    klik: function () { toon(700, 0.04, 'triangle', 0.08) },
    koop: function () { [784, 1047, 1319].forEach(function (f, i) { toon(f, 0.18, 'triangle', 0.14, i * 0.07) }) },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { toon(f, 0.3, 'triangle', 0.17, i * 0.09) }); toon(1568, 0.5, 'sine', 0.08, 0.36) },
    mis: function () { toon(300, 0.5, 'sine', 0.2, 0, 70); ruis(0.3, 0.1, 400, 0.8) },
  }

  // ── canvas met scherpte voor het scherm ──
  function canvas(cv, opResize) {
    var c = { cv: cv, ctx: cv.getContext('2d'), W: 0, H: 0, dpr: 1 }
    function meet() {
      c.dpr = Math.min(2, window.devicePixelRatio || 1)
      c.W = innerWidth; c.H = innerHeight
      cv.width = Math.floor(c.W * c.dpr); cv.height = Math.floor(c.H * c.dpr)
      if (opResize) opResize(c)
    }
    window.addEventListener('resize', meet)
    meet()
    c.meet = meet
    return c
  }

  // ── kleuren en vormen ──
  function hexA(col, a) {
    if (col[0] === '#') { var n = parseInt(col.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')' }
    return col.replace('hsl(', 'hsla(').replace(')', ',' + a + ')')
  }
  function rondRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r)
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath()
  }
  function ster(g, x, y, r, col) {
    g.fillStyle = col; g.beginPath()
    for (var k = 0; k < 10; k++) { var h = k * Math.PI / 5 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(h) * rr, y + Math.sin(h) * rr) }
    g.closePath(); g.fill()
  }
  function vlek(g, x, y, r, col, a) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, hexA(col, a)); gr.addColorStop(1, hexA(col, 0))
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2)
  }

  // ── achtergrond: noorderlicht in de kleur van het spel en twinkelende sterren ──
  var sterrenVeld = []
  for (var sv = 0; sv < 90; sv++) sterrenVeld.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3, f: Math.random() * 6 })
  function achtergrond(g, W, H, tijd, hue, rustig) {
    g.fillStyle = '#05040f'; g.fillRect(0, 0, W, H)
    var t = rustig ? 0 : tijd, R = Math.max(W, H)
    vlek(g, W * (0.2 + Math.sin(t * 0.07) * 0.1), H * (0.15 + Math.cos(t * 0.05) * 0.08), R * 0.7, 'hsl(' + hue + ',90%,45%)', 0.22)
    vlek(g, W * (0.85 + Math.cos(t * 0.06) * 0.08), H * (0.45 + Math.sin(t * 0.04) * 0.12), R * 0.6, 'hsl(' + (hue + 70) + ',90%,50%)', 0.14)
    vlek(g, W * (0.4 + Math.sin(t * 0.05) * 0.15), H * (1.0 + Math.sin(t * 0.08) * 0.05), R * 0.6, 'hsl(320,90%,50%)', 0.16)
    for (var i = 0; i < sterrenVeld.length; i++) {
      var s = sterrenVeld[i]
      g.globalAlpha = 0.3 + Math.sin(tijd * 1.3 + s.f) * 0.22
      g.fillStyle = '#cfe8ff'; g.beginPath(); g.arc(s.x * W, s.y * H, s.r, 0, 7); g.fill()
    }
    g.globalAlpha = 1
  }

  // ── deeltjes en zwevende teksten ──
  function deeltjes() {
    var lijst = [], teksten = []
    return {
      spat: function (x, y, n, col, kracht, o) {
        o = o || {}
        for (var i = 0; i < n; i++) {
          var hoek = o.hoek != null ? o.hoek + (Math.random() - 0.5) * (o.spreiding || 2.2) : Math.random() * Math.PI * 2
          var v = kracht * (0.35 + Math.random() * 0.75)
          lijst.push({ x: x, y: y, vx: Math.cos(hoek) * v, vy: Math.sin(hoek) * v, t: 0, max: (o.duur || 0.55) * (0.7 + Math.random() * 0.6), r: (o.maat || 2.2) * (0.6 + Math.random() * 0.9), col: col, ster: o.ster, zwaarte: o.zwaarte || 0 })
        }
      },
      punt: function (p) { lijst.push(p) },
      tekst: function (x, y, s, col, maat) { teksten.push({ x: x, y: y, s: s, col: col, t: 0, maat: maat || 22 }) },
      leeg: function () { lijst.length = 0; teksten.length = 0 },
      aantal: function () { return lijst.length },
      teken: function (g, dt) {
        for (var i = lijst.length - 1; i >= 0; i--) {
          var d = lijst[i]; d.t += dt
          if (d.t > d.max) { lijst.splice(i, 1); continue }
          d.vx *= 0.93; d.vy = d.vy * 0.93 + d.zwaarte * dt; d.x += d.vx * dt; d.y += d.vy * dt
          g.globalAlpha = 1 - d.t / d.max
          if (d.ster) ster(g, d.x, d.y, d.r * 2.4 * Math.sin(Math.min(1, d.t / d.max) * Math.PI), d.col)
          else { g.fillStyle = d.col; g.beginPath(); g.arc(d.x, d.y, d.r, 0, 7); g.fill() }
        }
        g.globalAlpha = 1
        for (var j = teksten.length - 1; j >= 0; j--) {
          var t = teksten[j]; t.t += dt
          if (t.t > 0.95) { teksten.splice(j, 1); continue }
          var f = t.t / 0.95, op = 1 + Math.sin(Math.min(1, t.t / 0.15) * Math.PI) * 0.25
          g.save(); g.globalAlpha = f > 0.6 ? (1 - f) / 0.4 : 1
          g.translate(t.x, t.y - f * 40); g.scale(op, op)
          g.font = Math.round(t.maat) + 'px "Russo One", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
          g.shadowColor = t.col; g.shadowBlur = 14; g.fillStyle = t.col
          g.fillText(t.s, 0, 0); g.restore()
        }
      },
    }
  }

  // ── schermschok: trauma in het kwadraat, uit sinussen (geen geruis) ──
  function schok() {
    var trauma = 0, t = 0
    return {
      rustig: false,
      voeg: function (x) { if (!this.rustig) trauma = Math.min(1, trauma + x) },
      stap: function (dt) {
        trauma = Math.max(0, trauma - dt * 1.6); t += dt * 30
        var k = trauma * trauma
        return [k * 11 * Math.sin(t * 1.7), k * 8 * Math.sin(t * 2.3)]
      },
    }
  }

  // ── invoer: vegen, tikken, toetsen, controller ──
  // richtingen: 0 boven, 1 rechts, 2 onder, 3 links
  function invoer(el, o) {
    var veeg = null
    el.addEventListener('pointerdown', function (e) {
      audio(); veeg = { x: e.clientX, y: e.clientY, klaar: false, t: performance.now() }
      if (o.neer) o.neer(e.clientX, e.clientY)
    })
    el.addEventListener('pointermove', function (e) {
      if (!veeg || veeg.klaar || !o.richting) return
      var dx = e.clientX - veeg.x, dy = e.clientY - veeg.y
      if (Math.hypot(dx, dy) < (o.drempel || 22)) return
      veeg.klaar = true
      o.richting(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0))
    })
    el.addEventListener('pointerup', function (e) {
      if (veeg && !veeg.klaar && o.tik && Math.hypot(e.clientX - veeg.x, e.clientY - veeg.y) < 14) o.tik(e.clientX, e.clientY)
      veeg = null
    })
    el.addEventListener('pointercancel', function () { veeg = null })
    var TOETS = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 }
    window.addEventListener('keydown', function (e) {
      audio()
      if (TOETS[e.code] != null && o.richting) { if (e.repeat && !o.herhaal) return; e.preventDefault(); o.richting(TOETS[e.code]); return }
      if (o.toets) o.toets(e)
    })
    var vorig = {}
    return {
      // elke frame aanroepen: kruisje of stick (dode zone 0,55), knoppen A/B/X/Y
      pad: function () {
        var lijst = navigator.getGamepads ? navigator.getGamepads() : []
        for (var i = 0; i < lijst.length; i++) {
          var g = lijst[i]; if (!g) continue
          var ax = g.axes[0] || 0, ay = g.axes[1] || 0, kn = function (n) { return !!(g.buttons[n] && g.buttons[n].pressed) }
          var nu = { 0: kn(12) || ay < -0.55, 1: kn(15) || ax > 0.55, 2: kn(13) || ay > 0.55, 3: kn(14) || ax < -0.55, a: kn(0), b: kn(1), x: kn(2), y: kn(3) }
          var oud = vorig[i] || {}
          for (var r = 0; r < 4; r++) if (nu[r] && !oud[r] && o.richting) o.richting(r)
          ;['a', 'b', 'x', 'y'].forEach(function (k) { if (nu[k] && !oud[k] && o.knop) o.knop(k) })
          vorig[i] = nu
        }
      },
    }
  }

  // ── winkelkaartjes ──
  function winkel(lijstEl, items, D, veldBezit, veldGekozen, tekenVoorbeeld, opKoop) {
    lijstEl.innerHTML = ''
    items.forEach(function (it) {
      var k = document.createElement('div'); k.className = 'kaart' + (D[veldGekozen] === it.id ? ' gekozen' : '')
      var c = document.createElement('canvas'); c.width = 192; c.height = 144
      var g = c.getContext('2d'); g.scale(2, 2); tekenVoorbeeld(g, it)
      var n = document.createElement('div'); n.className = 'naam'; n.textContent = it.naam
      var b = document.createElement('button')
      if (D[veldBezit].indexOf(it.id) >= 0) {
        b.className = 'kies' + (D[veldGekozen] === it.id ? ' aan' : ''); b.textContent = D[veldGekozen] === it.id ? 'Gekozen' : 'Kiezen'
        b.onclick = function () { D[veldGekozen] = it.id; D.bewaar(); Geluid.klik(); opKoop() }
      } else {
        b.className = 'koop'; b.innerHTML = '<span class="munt" style="color:inherit">' + it.prijs + '</span>'; b.disabled = D.munten < it.prijs
        b.onclick = function () {
          if (D.munten < it.prijs) return
          D.munten -= it.prijs; D[veldBezit].push(it.id); D[veldGekozen] = it.id; D.bewaar(); Geluid.koop(); opKoop()
        }
      }
      k.appendChild(c); k.appendChild(n); k.appendChild(b); lijstEl.appendChild(k)
    })
  }

  // zeldzaam: zelfde willekeur op elk apparaat
  function rng(zaad) {
    var a = zaad >>> 0
    return function () {
      a = (a + 0x6D2B79F5) >>> 0
      var t = a
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  return {
    BELONING: BELONING, naarOuder: naarOuder, opslag: opslag, Geluid: Geluid, canvas: canvas,
    hexA: hexA, rondRect: rondRect, ster: ster, vlek: vlek, achtergrond: achtergrond,
    deeltjes: deeltjes, schok: schok, invoer: invoer, winkel: winkel, rng: rng,
  }
})()
