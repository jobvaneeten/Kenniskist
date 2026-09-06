// 1-12 Glijbaan — één lange afdaling. Wie blijft rennen haalt de doeltijd
// ruim; wie bij elke trede afremt haalt hem niet.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 160

export default maakLevel({
  id: 'w1-l12',
  naam: 'Glijbaan',
  wereld: 1,
  index: 12,
  doeltijd: 80,
  hints: [T.hints.snel],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(4) + 'S' + p(5) + 'H' + p(3) + munt(2) + p(144),
    g(16) + p(2) + munt(3) + p(7) + 'E' + p(131),
    g(32) + p(2) + munt(3) + p(3) + 'C' + p(119),
    g(48) + p(2) + munt(3) + p(9) + 'E' + p(97),
    g(64) + p(2) + munt(3) + p(91),
    g(80) + p(2) + munt(3) + p(7) + 'C' + p(67),
    g(96) + p(2) + munt(3) + p(59),
    g(112) + p(2) + munt(3) + p(7) + 'E' + p(35),
    g(128) + p(2) + munt(3) + p(27),
    g(144) + p(2) + munt(3) + p(3) + 'F' + p(7),
    g(B),
    g(B),
    g(B),
  ],
})
