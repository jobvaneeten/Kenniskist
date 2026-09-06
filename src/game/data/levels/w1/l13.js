// 1-13 Verstopt — de meeste munten liggen achter onzichtbare blokken. Wie
// alleen naar rechts rent haalt de finish wel, maar nooit de muntster.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w1-l13',
  naam: 'Verstopt',
  wereld: 1,
  index: 13,
  doeltijd: 110,
  hints: [T.hints.geheim],
  capsules: ['jetpack'],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(24) + munt(10) + p(24) + munt(8) + p(62),
    p(22) + plat(14) + p(92),
    p(90) + '?' + p(37),
    p(B),
    p(20) + 'x' + p(13) + 'x' + p(25) + 'x' + p(3) + 'x' + p(3) + 'x' + p(59),
    p(6) + munt(4) + p(38) + munt(4) + p(30) + munt(4) + p(42),
    p(2) + 'S' + p(5) + 'H' + p(31) + 'E' + p(23) + 'C' + p(23) + 'E' + p(15) + 'B' + p(15) + 'F' + p(7),
    g(B),
    g(B),
    g(B),
  ],
})
