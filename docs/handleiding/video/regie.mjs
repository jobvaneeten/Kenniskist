// Regie voor de uitlegfilmpjes: een zichtbare muis, ondertitels en een
// titelkaart, bovenop de echte Kenniskist (testomgeving met proefgegevens,
// zie ../maken/demo.mjs).

// Wordt in elke pagina geladen (ook na herladen). Alles onder window.__demo.
export const OVERLAY = () => {
  const bouw = () => {
    if (document.getElementById('__demo')) return
    const laag = document.createElement('div'); laag.id = '__demo'
    laag.innerHTML = `
      <style>
        #__demo { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; font-family: Nunito, "Segoe UI", sans-serif; }
        #__muis { position: absolute; left: 0; top: 0; width: 30px; height: 30px; transition: transform .7s cubic-bezier(.45,.05,.25,1); filter: drop-shadow(0 3px 6px rgba(0,0,0,.6)); }
        #__ring { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; border: 3px solid #ffd23f; opacity: 0; }
        #__ring.aan { animation: __klik .55s ease-out; }
        @keyframes __klik { 0% { opacity: .95; transform: scale(.35) } 100% { opacity: 0; transform: scale(1.5) } }
        #__ondertitel { position: absolute; left: 50%; bottom: 34px; transform: translate(-50%, 20px); max-width: 82%; padding: 14px 26px; border-radius: 18px;
          background: rgba(10, 8, 36, .88); border: 1.5px solid rgba(125, 249, 255, .5); box-shadow: 0 10px 40px rgba(0,0,0,.5); color: #fff;
          font-size: 25px; font-weight: 700; line-height: 1.35; text-align: center; opacity: 0; transition: opacity .35s, transform .35s; }
        #__ondertitel.aan { opacity: 1; transform: translate(-50%, 0); }
        #__ondertitel b { color: #7df9ff; }
        #__kaart { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; color: #fff; opacity: 0; transition: opacity .5s;
          background: radial-gradient(700px 420px at 80% 10%, rgba(232,48,143,.4), transparent 60%), radial-gradient(700px 500px at 10% 90%, rgba(8,169,200,.35), transparent 60%), linear-gradient(160deg, #1d1450, #0d0a26 70%); }
        #__kaart.aan { opacity: 1; }
        #__kaart img { width: 130px; height: 130px; border-radius: 50%; box-shadow: 0 0 60px rgba(123,60,255,.8); }
        #__kaart .boven { letter-spacing: .28em; text-transform: uppercase; font-weight: 800; font-size: 15px; color: #7df9ff; }
        #__kaart h1 { margin: 0; font-size: 58px; font-weight: 800; text-align: center; max-width: 90%; }
        #__kaart p { margin: 0; font-size: 24px; color: #d9d2ff; text-align: center; max-width: 70%; }
        #__kaart .nr { padding: 6px 18px; border-radius: 999px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.3); font-weight: 800; }
      </style>
      <div id="__kaart"><img src="/logo-rond.png"><span class="boven">Kenniskist · uitleg</span><h1></h1><p></p><span class="nr"></span></div>
      <div id="__ring"></div>
      <svg id="__muis" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.4-6.8L4 20z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>
      <div id="__ondertitel"></div>`
    document.documentElement.appendChild(laag)
    const muis = laag.querySelector('#__muis'), ring = laag.querySelector('#__ring'), ot = laag.querySelector('#__ondertitel'), kaart = laag.querySelector('#__kaart')
    let pos = JSON.parse(sessionStorage.getItem('__muis') || '[640,400]')
    const zet = (x, y, ms) => { muis.style.transition = `transform ${ms}ms cubic-bezier(.45,.05,.25,1)`; muis.style.transform = `translate(${x - 4}px, ${y - 2}px)`; pos = [x, y]; sessionStorage.setItem('__muis', JSON.stringify(pos)) }
    zet(pos[0], pos[1], 0)
    window.__demo = {
      muis: (x, y, ms = 700) => zet(x, y, ms),
      klik: () => { ring.style.left = pos[0] + 'px'; ring.style.top = pos[1] + 'px'; ring.classList.remove('aan'); void ring.offsetWidth; ring.classList.add('aan') },
      ondertitel: (html) => { if (!html) { ot.classList.remove('aan'); return } ot.innerHTML = html; ot.classList.add('aan') },
      kaart: (titel, sub, nr) => { kaart.querySelector('h1').textContent = titel; kaart.querySelector('p').textContent = sub || ''; kaart.querySelector('.nr').textContent = nr || ''; kaart.classList.add('aan') },
      kaartWeg: () => kaart.classList.remove('aan'),
      muisZichtbaar: (aan) => { muis.style.opacity = aan ? 1 : 0 },
    }
  }
  if (document.documentElement) bouw()
  document.addEventListener('DOMContentLoaded', bouw)
}

// Platte tekst van een ondertitel (zonder <b>), zoals hij ingesproken wordt.
export const platteTekst = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

// Helpers voor in de opname-scripts. duren: { tekst: ms } van de ingesproken
// zinnen (dan blijft een ondertitel zo lang staan als de stem erover doet);
// tijdlijn: hier komt bij elke ondertitel { van, tot, tekst } in (ms sinds t0).
export function regie(page, { duren = {}, tijdlijn = [], t0 = Date.now() } = {}) {
  const sluit = () => { const l = tijdlijn[tijdlijn.length - 1]; if (l && l.tot == null) l.tot = Date.now() - t0 }
  const wacht = (ms) => page.waitForTimeout(ms)
  const eval_ = (fn, arg) => page.evaluate(fn, arg).catch(() => {})
  async function naar(loc) {
    const b_ = page.locator('body') // niet de ondertitel (die hangt buiten body)
    let el = typeof loc === 'string' ? b_.getByText(loc, { exact: true }).first() : loc.first()
    // tekst niet precies zo te vinden? dan het eerste element dat hem bevat
    if (typeof loc === 'string' && !(await el.waitFor({ timeout: 2500 }).then(() => true, () => false))) el = b_.getByText(loc).first()
    await el.scrollIntoViewIfNeeded().catch(() => {})
    const b = await el.boundingBox()
    if (b) { await eval_(([x, y]) => window.__demo?.muis(x, y, 750), [b.x + Math.min(b.width / 2, 60), b.y + b.height / 2]); await wacht(850) }
    return el
  }
  return {
    wacht,
    ot: async (html, ms = 3200) => {
      sluit()
      const tekst = platteTekst(html), stem = duren[tekst]
      await eval_((h) => window.__demo?.ondertitel(h), html)
      tijdlijn.push({ van: Date.now() - t0, tot: null, tekst })
      const nodig = stem ? Math.max(ms, stem + 700) : ms
      if (nodig) await wacht(nodig)
    },
    otWeg: async () => { sluit(); await eval_(() => window.__demo?.ondertitel('')); await wacht(350) },
    sluit,
    // de titelkaart wordt ook uitgesproken (maar staat niet als ondertitel in beeld)
    kaart: async (titel, sub, nr, ms = 3200) => {
      sluit(); const tekst = platteTekst(titel + '. ' + (sub ? sub + '.' : ''))
      await eval_(([t, s, n]) => window.__demo?.kaart(t, s, n), [titel, sub, nr])
      tijdlijn.push({ van: Date.now() - t0, tot: null, tekst, kaart: true })
      await wacht(duren[tekst] ? Math.max(ms, duren[tekst] + 600) : ms); sluit()
      await eval_(() => window.__demo?.kaartWeg()); await wacht(600)
    },
    eindkaart: async (titel, sub, ms = 2800) => {
      sluit(); const tekst = platteTekst(titel + ' ' + (sub || ''))
      await eval_(([t, s]) => window.__demo?.kaart(t, s, ''), [titel, sub])
      tijdlijn.push({ van: Date.now() - t0, tot: null, tekst, kaart: true })
      await wacht(duren[tekst] ? Math.max(ms, duren[tekst] + 900) : ms); sluit()
    },
    wijs: naar,
    klik: async (loc, ms = 1100) => { const el = await naar(loc); await eval_(() => window.__demo?.klik()); await wacht(180); await el.click(); await wacht(ms) },
    typ: async (loc, tekst, ms = 500) => { const el = await naar(loc); await eval_(() => window.__demo?.klik()); await el.click(); await el.pressSequentially(tekst, { delay: 85 }); await wacht(ms) },
    // klikken op een plek (bijvoorbeeld in een 3D-canvas)
    klikOp: async (x, y, ms = 900) => { await eval_(([a, b]) => window.__demo?.muis(a, b, 500), [x, y]); await wacht(550); await eval_(() => window.__demo?.klik()); await page.mouse.click(x, y); await wacht(ms) },
    scroll: async (y, ms = 1200) => { await eval_((yy) => window.scrollTo({ top: yy, behavior: 'smooth' }), y); await wacht(ms) },
    scrollNaar: async (loc, ms = 1200) => { const el = typeof loc === 'string' ? page.getByText(loc, { exact: true }).first() : loc.first(); await el.evaluate(e => e.scrollIntoView({ behavior: 'smooth', block: 'center' })).catch(() => {}); await wacht(ms) },
  }
}
