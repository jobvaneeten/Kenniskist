// 2-05 Windstoten — de wind zwelt op en valt weg op een vaste cadans van 3,5
// seconde. Springen op het moment dat de streepjes stilvallen scheelt een
// halve tegel.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w2-l05',
  naam: 'Windstoten',
  wereld: 2,
  index: 5,
  doeltijd: 95,
  hints: [T.hints.wind],
  wind: { sterkte: 62, periode: 3.5 },
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(20) + munt(5) + p(18) + munt(5) + p(18) + munt(5) + p(18) + munt(5) + p(34),
    p(6) + munt(4) + p(24) + munt(4) + p(24) + munt(4) + p(24) + munt(4) + p(34),
    p(2) + 'S' + p(5) + 'H' + p(21) + 'P' + p(23) + 'C' + p(23) + 'P' + p(21) + 'E' + p(19) + 'F' + p(7),
    g(20) + p(5) + g(18) + p(5) + g(18) + p(5) + g(18) + p(5) + g(34),
    g(20) + p(5) + g(18) + p(5) + g(18) + p(5) + g(18) + p(5) + g(34),
    g(20) + p(5) + g(18) + p(5) + g(18) + p(5) + g(18) + p(5) + g(34),
  ],
})
