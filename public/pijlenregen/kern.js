// ═══════════════════════════════════════════════════════════════════════════
//  PIJLENREGEN — kern: levels, draaiende schijf en wanneer een pijl raakt.
//  Geen DOM: gedeeld door spel.js en tools/pijlenregenTest.js (bot-test).
//
//  Regels: een schijf draait; jij schiet pijlen van onderaf in de schijf. Raak
//  je een pijl die er al in zit, dan ketst hij af en verlies je een hart (de
//  schijf begint opnieuw). Zijn alle pijlen erin, dan breekt de schijf.
//  Een level = 5 schijven, de 5e is een baas. 3 harten per level.
//  Kristallen op de rand pak je door er vlak naast een pijl in te schieten.
//  Hoeken: lokaal op de schijf; de pijl komt altijd binnen op wereldhoek
//  ONDER (recht onder het midden, canvas-y wijst omlaag).
// ═══════════════════════════════════════════════════════════════════════════
var PR = (function () {
  var TAU = Math.PI * 2, ONDER = Math.PI / 2
  var MIN = 0.19          // kleinste afstand tussen twee pijlen (rad)
  var KRISTAL = 0.24      // zo dichtbij moet een pijl een kristal raken
  var VLUCHT = 0.085      // seconden van loslaten tot raak
  var HARTEN = 3, SCHIJVEN = 5, LEVELS = 40

  var WERELDEN = [
    { naam: 'Neonstad', kleur: '#3ef0ff', tweede: '#9b6bff' },
    { naam: 'IJsplaneet', kleur: '#b3f5ff', tweede: '#4f8cff' },
    { naam: 'Lavamaan', kleur: '#ff7a2f', tweede: '#ff4f6a' },
    { naam: 'Sterrennevel', kleur: '#ff4fd8', tweede: '#ffc83d' },
  ]

  function rng(seed) {
    var a = seed >>> 0 || 1
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  }
  function verschil(a, b) { var d = ((a - b) % TAU + TAU) % TAU; return d > Math.PI ? TAU - d : d }

  // ── draaipatronen: hoeksnelheid (rad/s) op tijd t ──
  var PATRONEN = {
    gelijk: function (v) { return v },
    golf: function (v, t, f) { return v * (0.5 + 0.7 * Math.sin(t * 1.6 * f + f * 3)) },
    wissel: function (v, t, f) { var T = 2.2 + f; return v * 1.15 * Math.tanh(4 * Math.sin(Math.PI * t / T)) },
    stopstart: function (v, t, f) { return v * 1.6 * Math.pow(Math.max(0, Math.sin(t * (2.2 + f * 0.6))), 0.6) },
    gek: function (v, t, f) { return v * (0.95 * Math.sin(1.25 * t + f) + 0.55 * Math.sin(2.9 * t + 1 + f * 2) + 0.35) },
  }

  // ── levels (vast per nummer, zodat iedereen dezelfde levels krijgt) ──
  var cache = {}
  function level(L) {
    if (cache[L]) return cache[L]
    var r = rng(L * 7919 + 17), d = L / (LEVELS - 1), schijven = []
    for (var s = 0; s < SCHIJVEN; s++) {
      var baas = s === SCHIJVEN - 1
      var pijlen = 5 + Math.round(d * 4) + Math.floor(s * 0.75) + (baas ? 2 : 0)
      var nVast = s === 0 ? Math.round(d * 2) : Math.min(5, Math.round(r() * (1 + d * 3)) + (baas ? 1 : 0))
      if (pijlen + nVast > 17) nVast = Math.max(0, 17 - pijlen)
      var keus = ['gelijk']
      if (L >= 2) keus.push('golf')
      if (L >= 5) keus.push('wissel')
      if (L >= 10) keus.push('stopstart')
      if (L >= 18) keus.push('gek')
      var patroon = baas ? keus[Math.max(0, keus.length - 1 - Math.floor(r() * 2))] : keus[Math.floor(r() * keus.length)]
      if (L === 0 && s < 2) patroon = 'gelijk'
      var v = (1.15 + d * 1.35 + s * 0.08) * (baas ? 1.12 : 1) * (r() < 0.5 ? -1 : 1)
      // vaste pijlen netjes verspreid, kristallen in de ruimte ertussen
      var vast = [], start = r() * TAU
      for (var i = 0; i < nVast; i++) vast.push((start + i * TAU / nVast + (r() - 0.5) * 0.5) % TAU)
      var kristallen = [], nK = 1 + (r() < 0.5 ? 1 : 0) + (baas ? 1 : 0)
      for (var k = 0, poging = 0; k < nK && poging < 60; poging++) {
        var a = r() * TAU
        if (vast.every(function (b) { return verschil(a, b) > MIN * 1.6 }) && kristallen.every(function (b) { return verschil(a, b) > 0.8 })) { kristallen.push(a); k++ }
      }
      schijven.push({ pijlen: pijlen, vast: vast, kristallen: kristallen, patroon: patroon, v: v, f: 0.4 + r() * 0.8, baas: baas })
    }
    cache[L] = { nr: L, wereld: WERELDEN[Math.floor(L / 10) % WERELDEN.length], schijven: schijven }
    return cache[L]
  }

  function nieuweSchijf(def) {
    return {
      def: def, t: 0, hoek: 0, over: 0,
      pijlen: def.vast.map(function (a) { return { a: a, vast: true } }),
      kristallen: def.kristallen.map(function (a) { return { a: a, gepakt: false } }),
      nog: def.pijlen, vlucht: -1, klaar: false, mis: false,
    }
  }

  function snelheid(def, t) { return PATRONEN[def.patroon](def.v, t, def.f) }

  // Hoek over dt verder (kleine stapjes, zodat het patroon klopt)
  function draai(s, dt) {
    var n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n
    for (var i = 0; i < n; i++) { s.hoek += snelheid(s.def, s.t + h / 2) * h; s.t += h }
  }

  // Waar komt een pijl op de schijf als hij nu binnenkomt?
  function plek(s) { return ((ONDER - s.hoek) % TAU + TAU) % TAU }
  function vrij(s, a) { return s.pijlen.every(function (p) { return verschil(a, p.a) >= MIN }) }

  function gooi(s) {
    if (s.klaar || s.mis || s.vlucht >= 0 || s.nog <= 0) return false
    s.vlucht = 0
    return true
  }

  function stap(s, dt) {
    var ev = []
    if (s.mis) return ev
    // landt de pijl binnen deze stap, dan precies op dat moment beoordelen
    // (zo maakt de beeldsnelheid niet uit waar hij terechtkomt)
    if (s.vlucht >= 0 && s.vlucht + dt >= VLUCHT) {
      var rest = VLUCHT - s.vlucht
      draai(s, rest); dt -= rest
      s.vlucht = -1
      var a = plek(s)
      if (!vrij(s, a)) { s.mis = true; ev.push({ type: 'mis', a: a }); return ev }
      s.pijlen.push({ a: a, nieuw: true })
      s.nog--
      ev.push({ type: 'raak', a: a, over: s.nog })
      s.kristallen.forEach(function (k) {
        if (!k.gepakt && verschil(k.a, a) < KRISTAL) { k.gepakt = true; ev.push({ type: 'kristal', a: k.a }) }
      })
      if (s.nog === 0) { s.klaar = true; ev.push({ type: 'klaar' }) }
    } else if (s.vlucht >= 0) s.vlucht += dt
    draai(s, dt)
    return ev
  }

  // munten voor een level: kristallen + bonus voor uitspelen (meer met harten over)
  function beloning(L, kristallen, harten, gehaald) {
    return kristallen * 2 + (gehaald ? 8 + Math.floor(L / 4) + harten * 2 : 0)
  }

  return { TAU: TAU, ONDER: ONDER, MIN: MIN, VLUCHT: VLUCHT, HARTEN: HARTEN, SCHIJVEN: SCHIJVEN, LEVELS: LEVELS, WERELDEN: WERELDEN,
    level: level, nieuweSchijf: nieuweSchijf, stap: stap, gooi: gooi, plek: plek, vrij: vrij, draai: draai, snelheid: snelheid,
    verschil: verschil, beloning: beloning, rng: rng }
})()
if (typeof globalThis !== 'undefined') globalThis.PR = PR
