// 4-02 Lasergang — de lasers gaan om de beurt aan en uit. Wachten tot het
// lampje dooft is sneller dan proberen erdoorheen te rennen.
import { maakLevel, p, g, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 128

export default maakLevel({
  id: 'w4-l02',
  naam: 'Lasergang',
  wereld: 4,
  index: 2,
  doeltijd: 95,
  hints: [T.hints.laser],
  kaart: [
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    g(B),
    p(20) + 'j' + p(15) + 'j' + p(15) + 'j' + p(15) + 'j' + p(15) + 'j' + p(15) + 'j' + p(27),
    p(B),
    p(B),
    p(28) + munt(4) + p(12) + munt(4) + p(12) + munt(4) + p(12) + munt(4) + p(48),
    p(6) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(15) + munt(5) + p(17),
    p(2) + 'S' + p(5) + 'H' + p(23) + 'r' + p(27) + 'C' + p(27) + 'r' + p(27) + 'F' + p(11),
    g(B),
    g(B),
    g(B),
  ],
})
