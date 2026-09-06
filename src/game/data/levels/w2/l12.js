// 2-12 Lawine — rugwind over glad ijs. Afremmen kost hier meer tijd dan een
// gat overslaan; de doeltijd is haalbaar zolang je niet aarzelt.
import { maakLevel, p, munt, ijs } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 176

export default maakLevel({
  id: 'w2-l12',
  naam: 'Lawine',
  wereld: 2,
  index: 12,
  doeltijd: 90,
  hints: [T.hints.snel],
  wind: { sterkte: 40, periode: 8, bias: 0.9, variatie: 0.1 },
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
    p(40) + munt(5) + p(41) + munt(5) + p(41) + munt(5) + p(39),
    p(8) + munt(5) + p(45) + munt(5) + p(45) + munt(5) + p(45) + munt(5) + p(13),
    p(2) + 'S' + p(5) + 'H' + p(51) + 'C' + p(39) + 'C' + p(9) + 'P' + p(39) + 'E' + p(17) + 'F' + p(7),
    ijs(40) + p(5) + ijs(41) + p(5) + ijs(41) + p(5) + ijs(39),
    ijs(40) + p(5) + ijs(41) + p(5) + ijs(41) + p(5) + ijs(39),
    ijs(40) + p(5) + ijs(41) + p(5) + ijs(41) + p(5) + ijs(39),
  ],
})
