import { describe, it, expect, afterEach } from 'vitest'
import { zetMethodes, spellingLabel, heeftPluspunt } from './methodes.js'
import { toolsVoorGroepen } from './tools.js'
import { doelVakkenVoor } from './doelen.js'
import { vaardigheid } from './vaardigheden.js'

const families = () => toolsVoorGroepen([7]).map(f => f.familie)
const onderwerpen = (vak) => doelVakkenVoor([7]).find(v => v.vak === vak).onderwerpen.map(o => o.titel)

describe('lesmethodes per school', () => {
  afterEach(() => zetMethodes([]))

  it('zonder Taal actief: geen woordenschat- en dicteeblokken, regels in plaats van dieren', () => {
    zetMethodes([])
    expect(families()).not.toContain('woordenschat')
    expect(families()).not.toContain('dictee-thema')
    expect(onderwerpen('taal')).not.toContain('Woordenschat')
    expect(onderwerpen('spelling')).not.toContain('Dictee per blok')
    expect(spellingLabel('slang — ng')).toBe('Ng')
    const cats = doelVakkenVoor([7]).find(v => v.vak === 'spelling').onderwerpen.find(o => o.titel === 'Spellingcategorieën').doelen
    expect(cats.some(d => /slang|stinkdier|beer/.test(d.titel))).toBe(false)
  })

  it('met Taal actief: blokken en dieren zichtbaar', () => {
    zetMethodes(['taal-actief'])
    expect(families()).toContain('woordenschat')
    expect(families()).toContain('dictee-thema')
    expect(onderwerpen('spelling')).toContain('Dictee per blok')
    expect(spellingLabel('slang — ng')).toBe('slang — ng')
  })

  it('zonder Pluspunt: rekendoel zonder blok', () => {
    zetMethodes([])
    expect(heeftPluspunt()).toBe(false)
    const zonder = vaardigheid('verhaaltjessommen', 'g7::Je leert schattend vermenigvuldigen en delen in rekenverhalen met geld en met ronde getallen.')
    zetMethodes(['pluspunt'])
    const met = vaardigheid('verhaaltjessommen', 'g7::Je leert schattend vermenigvuldigen en delen in rekenverhalen met geld en met ronde getallen.')
    expect(met.doel).not.toBeNull()
    expect(met.sub).toMatch(/instap|blok/i)
    expect(zonder.doel).not.toBeNull()
    expect(zonder.sub).not.toMatch(/instap|blok/i)
  })
})
