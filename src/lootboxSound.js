const MUTE_KEY = 'kk_lootbox_muted'

let ctx = null
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function isMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false }
}
export function setMuted(v) {
  try { localStorage.setItem(MUTE_KEY, v ? '1' : '0') } catch {}
}

function tone(ac, { freq, start, dur, gain = 0.3, type = 'sine' }) {
  const osc = ac.createOscillator()
  const g   = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ac.currentTime + start)
  g.gain.setValueAtTime(0, ac.currentTime + start)
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + dur)
  osc.connect(g)
  g.connect(ac.destination)
  osc.start(ac.currentTime + start)
  osc.stop(ac.currentTime + start + dur + 0.05)
}

function subThump(ac, start) {
  const osc = ac.createOscillator()
  const g   = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(120, ac.currentTime + start)
  osc.frequency.exponentialRampToValueAtTime(35, ac.currentTime + start + 0.3)
  g.gain.setValueAtTime(0.5, ac.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + start + 0.35)
  osc.connect(g)
  g.connect(ac.destination)
  osc.start(ac.currentTime + start)
  osc.stop(ac.currentTime + start + 0.4)
}

export function playTierSound(rarity) {
  if (isMuted() || rarity === 'common') return
  try {
    const ac = getCtx()
    if (rarity === 'rare') {
      tone(ac, { freq: 880, start: 0, dur: 0.4, gain: 0.28, type: 'triangle' })
    } else if (rarity === 'epic') {
      tone(ac, { freq: 660, start: 0,    dur: 0.3, gain: 0.26, type: 'triangle' })
      tone(ac, { freq: 990, start: 0.12, dur: 0.35, gain: 0.26, type: 'triangle' })
    } else if (rarity === 'legendary') {
      tone(ac, { freq: 523, start: 0,    dur: 0.28, gain: 0.26, type: 'sine' })
      tone(ac, { freq: 659, start: 0.11, dur: 0.28, gain: 0.26, type: 'sine' })
      tone(ac, { freq: 988, start: 0.22, dur: 0.55, gain: 0.3,  type: 'sine' })
      tone(ac, { freq: 1976, start: 0.24, dur: 0.6, gain: 0.08, type: 'sine' })
    } else if (rarity === 'ultra_legendary') {
      tone(ac, { freq: 523, start: 0,    dur: 0.26, gain: 0.28, type: 'sine' })
      tone(ac, { freq: 659, start: 0.1,  dur: 0.26, gain: 0.28, type: 'sine' })
      tone(ac, { freq: 988, start: 0.2,  dur: 0.6,  gain: 0.32, type: 'sine' })
      tone(ac, { freq: 1976, start: 0.22, dur: 0.65, gain: 0.09, type: 'sine' })
      subThump(ac, 0.2)
    }
  } catch {}
}
