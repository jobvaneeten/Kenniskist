import { describe, it, expect } from 'vitest'
import { vaardigheid, kleurVan, doelSleutel } from './vaardigheden.js'
import { onderdelenVan } from '../games/redactiesommen.js'

describe('vaardigheid → doel', () => {
  it('interpunctie, werkwoordspelling, tafels, woordsoorten', () => {
    expect(vaardigheid('taal-interpunctie', 'komma').doel).toMatchObject({ toolId: 'taal-interpunctie', config: { onderdelen: ['komma'] } })
    expect(vaardigheid('werkwoordspelling', 'vtZwak').doel.config).toEqual({ categorieen: ['vtZwak'] })
    expect(vaardigheid('werkwoordspelling', 'vtZwak').label).toMatch(/zwakke/)
    expect(vaardigheid('tafels', 'tafel-7').doel.config).toEqual({ soort: 'keer', tafels: ['7'] })
    expect(vaardigheid('taal-woordsoorten', 'bijwoord').doel.config.soorten).toContain('bijwoord')
    expect(vaardigheid('taal-gebiedende-wijs', 'gebiedende wijs').doel.toolId).toBe('taal-gebiedende-wijs')
  })
  it('rekendoel van verhaaltjessommen', () => {
    const blok = onderdelenVan(7, 'FS', 'blok').find(b => !b.key.startsWith('herh-'))
    const gen = blok.gens[0]
    const v = vaardigheid('verhaaltjessommen', `g7::${gen.doel}`, gen.doel)
    expect(v.doel.config).toEqual({ groep: 7, route: 'FS', doelen: [gen.key] })
    expect(v.label).toBe(gen.doel)
    expect(vaardigheid('kale-sommen', 'g7::bestaat niet').doel).toBe(null)
  })
  it('oefening zonder categorie', () => {
    expect(vaardigheid('klokkijken', null)).toMatchObject({ sub: 'hele oefening', doel: null })
  })
  it('kleur en sleutel', () => {
    expect(kleurVan(50, 20)).toBe('rood')
    expect(kleurVan(70, 20)).toBe('oranje')
    expect(kleurVan(85, 20)).toBe('groen')
    expect(kleurVan(0, 3)).toBe('weinig')
    expect(doelSleutel('x', { b: 1, a: [2], persoonlijk: 'doel' })).toBe(doelSleutel('x', { a: [2], b: 1 }))
  })
})
