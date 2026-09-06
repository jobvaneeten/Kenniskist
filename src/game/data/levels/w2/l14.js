// 2-14 De schans — vijf ijseilanden achter elkaar. Elke sprong is met de wind
// mee ruim en tegen de wind in precies genoeg; het ritme van de vlagen bepaalt
// dus wanneer je gaat.
import { maakLevel, p, g, munt, ijs } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 152

export default maakLevel({
  id: 'w2-l14',
  naam: 'De schans',
  wereld: 2,
  index: 14,
  doeltijd: 100,
  hints: [T.hints.wind],
  wind: { sterkte: 46, periode: 4.5 },
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
    p(40) + 'L' + p(47) + 'L' + p(63),
    p(B),
    p(20) + munt(3) + p(21) + munt(3) + p(21) + munt(3) + p(21) + munt(3) + p(21) + munt(3) + p(33),
    p(6) + munt(4) + p(24) + munt(4) + p(20) + munt(4) + p(20) + munt(4) + p(20) + munt(4) + p(42),
    p(2) + 'S' + p(5) + 'H' + p(47) + 'C' + p(23) + 'P' + p(24) + 'P' + p(19) + 'C' + p(9) + 'E' + p(9) + 'F' + p(6),
    ijs(20) + p(5) + ijs(19) + p(5) + ijs(19) + p(5) + ijs(19) + p(5) + ijs(19) + p(5) + g(31),
    ijs(20) + p(5) + ijs(19) + p(5) + ijs(19) + p(5) + ijs(19) + p(5) + ijs(19) + p(5) + g(31),
    ijs(20) + p(5) + ijs(19) + p(5) + ijs(19) + p(5) + ijs(19) + p(5) + ijs(19) + p(5) + g(31),
  ],
})
