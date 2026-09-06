// 4-10 Machinekamer — verticale lasers op een strak ritme. Hier is timing
// belangrijker dan snelheid: elke zender doet er precies twee tellen over.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w4-l10',
  naam: 'Machinekamer',
  wereld: 4,
  index: 10,
  doeltijd: 110,
  hints: [T.hints.laser],
  kaart: [
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    p(18) + 'j' + p(13) + 'j' + p(13) + 'j' + p(13) + 'j' + p(13) + 'j' + p(13) + 'j' + p(13) + 'j' + p(33),
    p(B),
    p(B),
    p(B),
    p(24) + munt(5) + p(9) + munt(5) + p(9) + munt(5) + p(9) + munt(5) + p(9) + munt(5) + p(51),
    p(6) + munt(5) + p(13) + munt(5) + p(13) + munt(5) + p(13) + munt(5) + p(13) + munt(5) + p(13) + munt(5) + p(35),
    p(2) + 'S' + p(5) + 'H' + p(25) + 'r' + p(23) + 'C' + p(23) + 'r' + p(23) + 'O' + p(15) + 'F' + p(13),
    g(B),
    g(B),
    g(B),
  ],
})
