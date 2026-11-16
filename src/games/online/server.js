// Adres van de spelserver en hem alvast wakker maken. Los van verbinding.js,
// zodat de Kledingkast de server kan wekken zonder de hele Colyseus-SDK te laden.

const ONLINE = 'wss://kenniskist-server.onrender.com'
// Bij lokaal ontwikkelen kan de server op je eigen computer draaien:
// localStorage.kk_spelserver = 'ws://localhost:2567' (alleen in de dev-build).
export const SERVER_URL = (import.meta.env.DEV && typeof localStorage !== 'undefined' && localStorage.getItem('kk_spelserver')) || ONLINE
const HTTP_URL = SERVER_URL.replace(/^ws/, 'http')

let wakkerOp = 0     // laatste keer dat de server antwoordde
let bezig = null     // een wek-poging die nog loopt (Kledingkast en lobby delen die)

// Tikt de server aan. Geeft true zodra hij antwoordt (ook als dat lang duurt),
// false als het niet lukt. Kost niets als hij al wakker is.
export function wekServer(maxMs = 90000) {
  if (Date.now() - wakkerOp < 5 * 60 * 1000) return Promise.resolve(true)
  if (!bezig) bezig = tikAan(maxMs).finally(() => { bezig = null })
  return bezig
}

async function tikAan(maxMs) {
  const stop = new AbortController()
  const timer = setTimeout(() => stop.abort(), maxMs)
  try {
    await fetch(HTTP_URL + '/hi', { mode: 'no-cors', cache: 'no-store', signal: stop.signal })
    wakkerOp = Date.now()
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
