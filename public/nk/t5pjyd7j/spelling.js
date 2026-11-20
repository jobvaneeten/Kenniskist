'use strict'
// Spelling voor nieuwkomers: luister naar het woord en typ het. Woorden komen
// uit /spelling/groep4.js (40 per categorie, gedeeld met de gewone site); de
// categorieën kies je door dierplaatjes aan te vinken. Audio: de opnames van
// Fenna in /dictees/audio (zie scripts/dictee-audio.py). Gebruikt de helpers
// van index.html (D, bewaar, naar, confetti, geluiden, cadeaumeter, beloning).

if (!D.spelling) D.spelling = { cats: ['mier'], w: {} }
var SP_CATS = window.SPELLING_G4 || [], SP_OOK = window.SPELLING_G4_OOK_GOED || {}
var SP_LUIDSPREKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>'
var SP_START = '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>'
var SP_VINK = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>'
var SP_WIS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 5H9l-6 7 6 7h12z"/><path d="M17 9l-6 6M11 9l6 6"/></svg>'

// ── schermen en opmaak erbij zetten ──
;(function () {
  var huis = document.querySelector('[data-naar="s-start"]').innerHTML
  var cadeau = document.querySelector('#s-som .cadeau').outerHTML
  var css = document.createElement('style')
  css.textContent = [
    '.spcats { flex: 1; width: 100%; max-width: 980px; display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 14px; align-content: start; padding: 8px 0 110px; }',
    '.spcat { position: relative; border-radius: 22px; padding: 8px; background: var(--kaart); border: 3px solid var(--rand); box-shadow: 0 8px 20px rgba(0,0,0,.35); display: flex; flex-direction: column; align-items: center; gap: 6px; animation: in .4s both; transition: border-color .2s, transform .1s; }',
    '.spcat:active { transform: scale(.95); }',
    '.spcat img { width: 100%; aspect-ratio: 1; border-radius: 16px; background: #f5f3ff; padding: 8px; opacity: .55; filter: grayscale(.6); transition: opacity .2s, filter .2s; }',
    '.spcat.aan { border-color: var(--spel); box-shadow: 0 8px 20px rgba(0,0,0,.35), 0 0 22px rgba(167,139,250,.45); }',
    '.spcat.aan img { opacity: 1; filter: none; }',
    '.spcat .vink { position: absolute; top: -8px; right: -8px; width: 36px; height: 36px; border-radius: 50%; background: var(--spel); display: grid; place-items: center; transform: scale(0); transition: transform .2s; box-shadow: 0 4px 10px rgba(0,0,0,.4); }',
    '.spcat .vink svg { width: 22px; height: 22px; }',
    '.spcat.aan .vink { transform: scale(1); }',
    '.spcat .balk { width: 100%; height: 8px; border-radius: 4px; background: rgba(255,255,255,.12); overflow: hidden; }',
    '.spcat .balk i { display: block; height: 100%; background: var(--goed); border-radius: 4px; }',
    '.spstart { position: fixed; left: 50%; bottom: max(18px, env(safe-area-inset-bottom)); transform: translateX(-50%); width: 96px; height: 96px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: linear-gradient(160deg, #34d399, #059669); box-shadow: 0 10px 30px rgba(0,0,0,.45), 0 0 30px rgba(52,211,153,.45); z-index: 5; transition: opacity .2s; }',
    '.spstart svg { width: 46px; height: 46px; margin-left: 6px; }',
    '.spstart:disabled { opacity: .3; }',
    '.spveld { flex: 1; width: 100%; max-width: 760px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }',
    '.sprij { display: flex; align-items: center; gap: 16px; }',
    '.sprij img { width: 70px; height: 70px; border-radius: 18px; background: #f5f3ff; padding: 6px; }',
    '.sphoor { width: 110px; height: 110px; border-radius: 32px; display: grid; place-items: center; background: rgba(167,139,250,.18); border: 3px solid var(--spel); color: var(--spel); box-shadow: 0 10px 26px rgba(0,0,0,.35); }',
    '.sphoor svg { width: 58px; height: 58px; }',
    '.sphoor.speelt svg { animation: puls .6s infinite alternate; }',
    '.spwoord { min-width: 260px; max-width: 100%; min-height: 84px; padding: 6px 26px; border-radius: 22px; background: #fff; color: #14122e; font-size: clamp(2.2rem, 8vw, 3.2rem); font-weight: 800; letter-spacing: .04em; display: grid; place-items: center; border: 5px solid var(--spel); box-shadow: 0 10px 26px rgba(0,0,0,.35); overflow-wrap: anywhere; }',
    '.spwoord.leeg::after { content: "|"; color: #c7c3e6; animation: puls .7s infinite alternate; }',
    '.spwoord.goed { border-color: var(--goed); background: #d1fae5; animation: pop .5s; }',
    '.spwoord.fout { border-color: var(--fout); background: #ffe4e6; animation: schud .4s; }',
    '.sphulp { width: 84px; height: 84px; border-radius: 26px; display: grid; place-items: center; background: rgba(253,224,71,.14); border: 3px solid var(--goud); color: var(--goud); font-size: 3rem; font-weight: 900; box-shadow: 0 10px 26px rgba(0,0,0,.35); }',
    '.sphulp:active { transform: scale(.94); }',
    '.spwoord.kijk { border-color: var(--goud); background: #fef9c3; animation: pop .4s; }',
    '.spwoord.toon { border-color: var(--goed); background: #d1fae5; }',
    '.letters { width: 100%; max-width: 640px; display: flex; flex-direction: column; gap: 7px; }',
    '.letters div { display: flex; gap: 6px; justify-content: center; }',
    '.letter { flex: 1; max-width: 58px; height: 58px; border-radius: 14px; background: var(--kaart); border: 2px solid var(--rand); font-size: 1.6rem; font-weight: 800; box-shadow: 0 4px 12px rgba(0,0,0,.3); transition: transform .08s; }',
    '.letter:active { transform: scale(.9); background: #262257; }',
    '.letter svg { width: 30px; height: 30px; }',
    '.letter.breed { flex: 1.6; max-width: 92px; }',
    '.letter.ok { background: linear-gradient(160deg, #34d399, #059669); border-color: transparent; color: #fff; }',
    '.letter.wis { color: var(--fout); }',
    '@media (max-width: 420px) { .letter { height: 50px; font-size: 1.35rem; border-radius: 11px; } .letters div { gap: 4px; } }',
    '@media (max-height: 700px) { .sphoor { width: 84px; height: 84px; } .letter { height: 48px; } .spwoord { min-height: 66px; } }',
  ].join('\n')
  document.head.appendChild(css)
  var kies = document.createElement('section'); kies.className = 'scherm'; kies.id = 's-spelkies'
  kies.innerHTML = '<div class="kop"><button class="rond" id="spk-terug" aria-label="Terug">' + huis + '</button><span></span></div>' +
    '<div class="spcats" id="spcats"></div><button class="spstart" id="spstart" aria-label="Start">' + SP_START + '</button>'
  var typ = document.createElement('section'); typ.className = 'scherm'; typ.id = 's-spelling'
  typ.innerHTML = '<div class="kop"><button class="rond" id="spt-terug" aria-label="Terug">' + huis + '</button><div class="punten" id="sp-punten"></div>' + cadeau + '</div>' +
    '<div class="spveld"><div class="sprij"><img id="sp-dier" alt=""><button class="sphoor" id="sp-hoor" aria-label="Luister">' + SP_LUIDSPREKER + '</button><button class="sphulp" id="sp-hulp" aria-label="Laat het woord even zien">?</button></div>' +
    '<div class="spwoord leeg" id="sp-woord"></div><div class="letters" id="sp-letters"></div></div>'
  var na = $('s-einde'); na.parentNode.insertBefore(kies, na); na.parentNode.insertBefore(typ, na)
})()

// ── voorlezen: opname van Fenna, anders de browserstem ──
function spHash(t) { var h = 0x811c9dc5, b = new TextEncoder().encode(t); for (var i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0 } return h.toString(16).padStart(8, '0') }
function spZeg(w) {
  stil()
  var knop = $('sp-hoor'), klaar = function () { knop.classList.remove('speelt') }
  knop.classList.add('speelt')
  var a = new Audio('/dictees/audio/' + spHash(w) + '.mp3'); speler = a
  a.onended = klaar
  a.onerror = function () { if (speler !== a) return; speler = null; zegBrowser(w, klaar) }
  a.play().catch(function (e) { if (e.name !== 'AbortError') a.onerror() })
}

// ── categorieën kiezen ──
function spStand(w) { return D.spelling.w[w] || (D.spelling.w[w] = { goed: 0, reeks: 0, keer: 0 }) }
function tekenSpCats() {
  var l = $('spcats'); l.innerHTML = ''
  SP_CATS.forEach(function (c, i) {
    var b = document.createElement('button'), aan = D.spelling.cats.indexOf(c.id) >= 0
    var geleerd = c.woorden.filter(function (w) { return (D.spelling.w[w] || {}).reeks >= GELEERD }).length
    b.className = 'spcat' + (aan ? ' aan' : ''); b.style.animationDelay = (i * 0.03) + 's'; b.setAttribute('aria-label', c.dier)
    b.innerHTML = '<span class="vink">' + SP_VINK + '</span><img src="/spelling/plaatjes/' + c.id + '.svg" alt=""><span class="balk"><i style="width:' + Math.round(100 * geleerd / c.woorden.length) + '%"></i></span>'
    b.onclick = function () {
      geluidKlik()
      var k = D.spelling.cats.indexOf(c.id)
      if (k >= 0) D.spelling.cats.splice(k, 1); else D.spelling.cats.push(c.id)
      b.classList.toggle('aan', k < 0); bewaar(); $('spstart').disabled = !D.spelling.cats.length
    }
    l.appendChild(b)
  })
  $('spstart').disabled = !D.spelling.cats.length
}

// ── een ronde van 10 woorden ──
var spr = null
function startSpelling() {
  var lijst = []
  SP_CATS.forEach(function (c) { if (D.spelling.cats.indexOf(c.id) >= 0) c.woorden.forEach(function (w) { lijst.push({ w: w, c: c.id }) }) })
  if (!lijst.length) return
  // eerst woorden die nog niet geleerd zijn, door elkaar
  lijst.sort(function () { return Math.random() - 0.5 })
  lijst.sort(function (a, b) { return ((D.spelling.w[a.w] || {}).reeks >= GELEERD) - ((D.spelling.w[b.w] || {}).reeks >= GELEERD) })
  spr = { woorden: lijst.slice(0, PER_RONDE), i: 0, uitslag: [] }
  naar('s-spelling'); spVraag()
}
function spVraag() {
  var x = spr.woorden[spr.i]
  spr.invoer = ''; spr.fout = 0; spr.klaar = false; spr.hulp = false; clearTimeout(spr.kijkId); spr.kijkt = false
  $('sp-dier').src = '/spelling/plaatjes/' + x.c + '.svg'
  spToon(); spPunten(); tekenCadeau(false)
  setTimeout(function () { if (spr && spr.woorden[spr.i] === x) spZeg(x.w) }, 350)
}
function spToon(klasse) {
  var a = $('sp-woord'); a.className = 'spwoord' + (spr.invoer ? '' : ' leeg') + (klasse ? ' ' + klasse : '')
  a.textContent = spr.invoer
}
function spPunten() {
  var p = $('sp-punten'); p.innerHTML = ''
  for (var i = 0; i < spr.woorden.length; i++) {
    var u = spr.uitslag[i], s = document.createElement('span')
    s.className = 'punt' + (i === spr.i && u == null ? ' nu' : u === 2 ? ' goed' : u === 1 ? ' half' : u === 0 ? ' fout' : '')
    p.appendChild(s)
  }
}
function spTyp(c) {
  if (!spr || spr.klaar || spr.kijkt) return
  if (c === 'wis') spr.invoer = spr.invoer.slice(0, -1)
  else if (c === 'ok') return spControleer()
  else if (spr.invoer.length < 20) spr.invoer += c
  geluidKlik(); spToon()
}
function spControleer() {
  var x = spr.woorden[spr.i], in_ = spr.invoer.trim().toLowerCase()
  if (!in_) return
  var st = spStand(x.w)
  if (in_ === x.w || (SP_OOK[x.w] || []).indexOf(in_) >= 0) {
    spr.klaar = true; spr.invoer = x.w; spToon('goed'); geluidGoed()
    var r = $('sp-woord').getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2, spr.fout ? 30 : 70)
    st.keer++
    // met hulp (vraagteken) of na een fout: wel goed, maar niet voor het cadeau
    if (!spr.fout && !spr.hulp) { st.goed++; st.reeks++; D.teller = (D.teller || 0) + 1; tekenCadeau(true) } else st.reeks = 0
    spr.uitslag[spr.i] = spr.fout || spr.hulp ? 1 : 2; bewaar(); spPunten()
    setTimeout(spVolgende, 1300)
  } else {
    spr.fout++; geluidFout(); spToon('fout')
    if (spr.fout >= 2) {
      // twee keer fout: het goede woord laten zien en laten horen, dan door
      spr.klaar = true; st.keer++; st.reeks = 0; spr.uitslag[spr.i] = 0; bewaar()
      setTimeout(function () { spr.invoer = x.w; spToon('toon'); spPunten(); spZeg(x.w) }, 450)
      setTimeout(spVolgende, 3200)
    } else setTimeout(function () { spr.invoer = ''; spToon(); spZeg(x.w) }, 500)
  }
}
function spVolgende() {
  spr.i++
  if ((D.teller || 0) >= BELONING_NA) { D.teller -= BELONING_NA; bewaar(); return toonBeloning(spVerder) }
  spVerder()
}
function spVerder() {
  if (spr.i < spr.woorden.length) { naar('s-spelling'); return spVraag() }
  var n = spr.uitslag.filter(function (u) { return u === 2 }).length
  var rij = $('eind-sterren'); rij.innerHTML = ''
  for (var i = 0; i < spr.woorden.length; i++) { var sp = document.createElement('span'); sp.innerHTML = i < n ? STER : STER_LEEG; sp.firstChild.style.animationDelay = (i * 0.08) + 's'; rij.appendChild(sp.firstChild) }
  eindeKnoppen(function () { naar('s-spelkies') }, startSpelling)
  naar('s-einde'); geluidGoed(); setTimeout(function () { confetti(innerWidth / 2, innerHeight / 3, 120) }, 200)
}

// ── toetsenbord op het scherm (geen autocorrectie, geen telefoontoetsenbord) ──
;(function () {
  var t = $('sp-letters')
  var OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>'
  ;['qwertyuiop', 'asdfghjkl', 'zxcvbnm'].forEach(function (r, ri) {
    var d = document.createElement('div')
    var toetsen = r.split('')
    if (ri === 2) { toetsen.unshift('wis'); toetsen.push('ok') }
    toetsen.forEach(function (c) {
      var b = document.createElement('button')
      b.className = 'letter' + (c === 'ok' ? ' ok breed' : c === 'wis' ? ' wis breed' : '')
      b.innerHTML = c === 'wis' ? SP_WIS : c === 'ok' ? OK : c
      b.setAttribute('aria-label', c === 'wis' ? 'Wissen' : c === 'ok' ? 'Klaar' : c)
      b.onclick = function () { spTyp(c) }
      d.appendChild(b)
    })
    t.appendChild(d)
  })
  addEventListener('keydown', function (e) {
    if (!$('s-spelling').classList.contains('aan') || e.ctrlKey || e.metaKey || e.altKey) return
    if (/^[a-zA-Z]$/.test(e.key)) spTyp(e.key.toLowerCase())
    else if (e.key === 'Backspace') { e.preventDefault(); spTyp('wis') }
    else if (e.key === 'Enter') spTyp('ok')
  })
})()

$('sp-hoor').onclick = function () { if (spr) spZeg(spr.woorden[spr.i].w) }
// vraagteken: het woord heel even laten zien
$('sp-hulp').onclick = function () {
  if (!spr || spr.klaar || spr.kijkt) return
  var x = spr.woorden[spr.i]
  geluidKlik(); spr.hulp = true; spr.kijkt = true
  var a = $('sp-woord'); a.className = 'spwoord kijk'; a.textContent = x.w
  spr.kijkId = setTimeout(function () { spr.kijkt = false; spToon() }, 1500)
}
$('spt-terug').onclick = function () { geluidKlik(); naar('s-spelkies') }
$('spk-terug').onclick = function () { geluidKlik(); naar('s-start') }
$('spstart').onclick = function () { geluidKlik(); startSpelling() }
var naarSpOud = naar
naar = function (id) { naarSpOud(id); if (id === 's-spelkies') tekenSpCats() }
