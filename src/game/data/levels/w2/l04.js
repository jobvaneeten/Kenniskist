// 2-04 Tegen de wind — een vaste tegenwind naar links. Rennen is hier geen
// luxe maar de enige manier om vooruit te komen.
import { maakLevel, p, g, munt, ijs } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w2-l04',
  naam: 'Tegen de wind',
  wereld: 2,
  index: 4,
  doeltijd: 95,
  hints: [T.hints.wind],
  wind: { sterkte: 52, periode: 7, bias: -0.8, variatie: 0.2 },
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
    p(48) + munt(5) + p(26) + munt(5) + p(26) + munt(5) + p(21),
    p(6) + munt(4) + p(16) + munt(4) + p(22) + munt(4) + p(22) + munt(4) + p(22) + munt(4) + p(28),
    p(2) + 'S' + p(5) + 'H' + p(25) + 'P' + p(25) + 'C' + p(34) + 'P' + p(24) + 'E' + p(9) + 'F' + p(5),
    g(22) + ijs(26) + p(5) + ijs(26) + p(5) + ijs(26) + p(5) + g(21),
    g(22) + ijs(26) + p(5) + ijs(26) + p(5) + ijs(26) + p(5) + g(21),
    g(22) + ijs(26) + p(5) + ijs(26) + p(5) + ijs(26) + p(5) + g(21),
  ],
})
