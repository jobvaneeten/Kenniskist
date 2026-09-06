import { describe, it, expect, beforeEach } from 'vitest'
import { Invoer } from './input.js'

// De update draait op 60 Hz, de browser levert events los daarvan aan. Een tik
// van tien milliseconden begint en eindigt dus tussen twee updates in. Zonder
// grendel verdwijnt die spoorloos — en dat was precies waarom het titelmenu
// niet met de muis of het toetsenbord te bedienen was.

// Minimale doelstub: alleen wat Invoer gebruikt.
function maakDoel() {
  const luisteraars = {}
  return {
    addEventListener(soort, fn) { (luisteraars[soort] ??= []).push(fn) },
    removeEventListener(soort, fn) {
      luisteraars[soort] = (luisteraars[soort] ?? []).filter((f) => f !== fn)
    },
    stuur(soort, e) { for (const fn of luisteraars[soort] ?? []) fn(e) },
  }
}

describe('Invoer', () => {
  let doel
  let invoer

  beforeEach(() => {
    doel = maakDoel()
    invoer = new Invoer(doel)
  })

  const toets = (code) => {
    doel.stuur('keydown', { code, repeat: false, preventDefault() {} })
    doel.stuur('keyup', { code })
  }

  it('ziet een aanslag die tussen twee updates in begint en eindigt', () => {
    toets('ArrowDown')
    expect(invoer.netIngedrukt('omlaag')).toBe(true)
  })

  it('laat zo`n aanslag precies één update gelden', () => {
    toets('Enter')
    expect(invoer.netIngedrukt('bevestig')).toBe(true)
    invoer.eindFrame()
    expect(invoer.netIngedrukt('bevestig')).toBe(false)
  })

  it('laat een ingehouden toets ook maar één keer netIngedrukt zijn', () => {
    doel.stuur('keydown', { code: 'Space', repeat: false, preventDefault() {} })
    expect(invoer.netIngedrukt('spring')).toBe(true)
    invoer.eindFrame()
    expect(invoer.netIngedrukt('spring')).toBe(false)
    expect(invoer.ingedrukt('spring')).toBe(true)
  })

  it('ziet een klik die tussen twee updates in valt', () => {
    invoer.koppelBeeld((x, y) => ({ x, y, in: true }))
    doel.stuur('mousedown', { button: 0, clientX: 40, clientY: 20 })
    doel.stuur('mouseup', { button: 0 })
    expect(invoer.muisNetNeer).toBe(true)
    invoer.eindFrame()
    expect(invoer.muisNetNeer).toBe(false)
  })

  it('zet de muispositie ook zonder voorafgaande beweging', () => {
    invoer.koppelBeeld((x, y) => ({ x, y, in: true }))
    doel.stuur('mousedown', { button: 0, clientX: 210, clientY: 130 })
    expect(invoer.muis.x).toBe(210)
    expect(invoer.muis.y).toBe(130)
    expect(invoer.muis.inBeeld).toBe(true)
  })

  it('negeert de rechtermuisknop', () => {
    doel.stuur('mousedown', { button: 2, clientX: 0, clientY: 0 })
    expect(invoer.muisNetNeer).toBe(false)
  })
})
