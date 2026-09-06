// 4-15 Naar de kern — banden, lasers, een zero-g-zone en een sleutelkaartdeur
// achter elkaar. Het laatste level voor de Kern-AI.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 160
const bandRechts = '>'.repeat(14)
const bandLinks = '<'.repeat(12)

export default maakLevel({
  id: 'w4-l15',
  naam: 'Naar de kern',
  wereld: 4,
  index: 15,
  doeltijd: 95,
  hints: [T.hints.zerog],
  zerog: [[62, 4, 93, 13]],
  kaart: [
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    p(30) + 'j' + p(23) + 'j' + p(41) + 'j' + p(23) + 'j' + p(39),
    p(B),
    p(B),
    p(66) + munt(6) + p(16) + munt(6) + p(66),
    p(B),
    p(6) + munt(5) + p(23) + munt(5) + p(23) + munt(5) + p(43) + munt(5) + p(23) + munt(5) + p(17),
    p(2) + 'S' + p(5) + 'H' + p(15) + 'r' + p(19) + 'C' + p(15) + 'q' + p(23) + 'X' + p(23) + 'n' + p(15) + 'C' + p(11) + 'd' + p(11) + 'F' + p(11),
    g(20) + bandRechts + g(28) + bandLinks + g(86),
    g(B),
    g(B),
  ],
})
