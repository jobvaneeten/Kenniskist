// 3-13 Diep in de berg — de langste grot van het spel, met twee checkpoints.
// Laag plafond, lavaplassen in de vloer en vleermuizen aan het dak.
import { maakLevel, p, g, munt, lava } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 160

export default maakLevel({
  id: 'w3-l13',
  naam: 'Diep in de berg',
  wereld: 3,
  index: 13,
  doeltijd: 100,
  hints: [T.hints.grot],
  kaart: [
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    p(20) + 'U' + p(23) + 'U' + p(23) + 'U' + p(23) + 'U' + p(23) + 'U' + p(43),
    p(24) + g(3) + p(21) + g(3) + p(21) + g(3) + p(21) + g(3) + p(61),
    p(24) + g(3) + p(21) + g(3) + p(21) + g(3) + p(21) + g(3) + p(61),
    p(6) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(29),
    p(2) + 'S' + p(5) + 'H' + p(19) + 'R' + p(23) + 'C' + p(19) + 'A' + p(23) + 'R' + p(19) + 'C' + p(19) + 'D' + p(15) + 'F' + p(7),
    g(34) + lava(5) + g(31) + lava(5) + g(31) + lava(5) + g(49),
    g(34) + lava(5) + g(31) + lava(5) + g(31) + lava(5) + g(49),
    g(34) + lava(5) + g(31) + lava(5) + g(31) + lava(5) + g(49),
  ],
})
