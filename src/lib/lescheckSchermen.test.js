import { describe, it, expect } from 'vitest'
// Rooktest voor de twee lescheck-schermen: renderen ze zonder te klappen, en
// staat het doel van de les er écht in? De koppeling les → doel is de kern van
// de lescheck; als die stilletjes leeg raakt, kiest de leerkracht een les zonder
// te zien waar de som over gaat. Ze staan in src/lib omdat vitest alleen daar
// (en in src/games en tools) naar tests kijkt.
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import LescheckForm from '../portaal/LescheckForm.jsx'
import LescheckLive from '../portaal/LescheckLive.jsx'
import { doelenVanBlok } from '../games/redactiesommen.js'

const klas = { id: 'k1', school_id: 's1', groepen: [7] }
const leerlingen = [{ id: 'a', weergavenaam: 'Anna B' }, { id: 'b', weergavenaam: 'Bram K' }]

describe('lescheck-schermen renderen', () => {
  it('formulier toont alle 10 lessen met het doel van die les', () => {
    const html = renderToStaticMarkup(h(LescheckForm, {
      klas, leerlingen, bestaand: null, onKlaar: () => {}, onAnnuleer: () => {},
    }))
    for (let les = 1; les <= 10; les++) expect(html).toContain(`Les ${les}`)
    expect(html).toContain(doelenVanBlok(7, 1)[0].slice(0, 40))
    expect(html).toContain('Klaarzetten voor 2 leerlingen')
    expect(html).toContain('herhalingsles')
  })

  it('live-bord toont een tegel per leerling en de lestabs', () => {
    const blok = {
      weektaakId: 'w1', titel: 'Lescheck Blok 3', eindOp: '2026-12-01',
      opdrachten: [
        { id: 'o1', les: 1, doelNr: 1, doel: 'Doel een' },
        { id: 'o2', les: 3, doelNr: 2, doel: 'Doel twee' },
      ],
    }
    const html = renderToStaticMarkup(h(LescheckLive, { blok, leerlingen, onTerug: () => {} }))
    expect(html).toContain('Lescheck Blok 3')
    expect(html).toContain('Les 1')
    expect(html).toContain('Les 3')
    expect(html).toContain('Anna B')
    expect(html).toContain('0 van de 2 klaar')
  })
})
