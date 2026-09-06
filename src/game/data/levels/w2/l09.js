// 2-09 De vrieskloof — glad ijs, wisselende wind en gaten tegelijk. Het eerste
// level van wereld 2 waarin de drie mechanics elkaar echt in de weg zitten.
import { maakLevel, p, g, munt, ijs } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 144

export default maakLevel({
  id: 'w2-l09',
  naam: 'De vrieskloof',
  wereld: 2,
  index: 9,
  doeltijd: 95,
  hints: [T.hints.wind],
  wind: { sterkte: 58, periode: 4 },
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
    p(30) + 'L' + p(29) + 'L' + p(29) + 'L' + p(53),
    p(B),
    p(24) + munt(5) + p(24) + munt(5) + p(24) + munt(5) + p(24) + munt(5) + p(28),
    p(6) + munt(4) + p(26) + munt(4) + p(26) + munt(4) + p(26) + munt(4) + p(44),
    p(2) + 'S' + p(5) + 'H' + p(27) + 'P' + p(29) + 'C' + p(28) + 'P' + p(14) + 'C' + p(13) + 'E' + p(11) + 'F' + p(7),
    ijs(24) + p(5) + ijs(24) + p(5) + ijs(24) + p(5) + ijs(24) + p(5) + g(28),
    ijs(24) + p(5) + ijs(24) + p(5) + ijs(24) + p(5) + ijs(24) + p(5) + g(28),
    ijs(24) + p(5) + ijs(24) + p(5) + ijs(24) + p(5) + ijs(24) + p(5) + g(28),
  ],
})
