// 2-16 IJsworm — baaslevel van wereld 2. De arena is expres kaal: de barst in
// het ijs moet het enige zijn waar je op let.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 48

export default maakLevel({
  id: 'w2-l16',
  naam: 'IJsworm',
  wereld: 2,
  index: 16,
  doeltijd: 200,
  baas: 'ijsworm',
  muziek: 'baas',
  hints: [T.hints.baasWorm],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    g(2) + p(44) + g(2),
    g(2) + p(44) + g(2),
    g(2) + p(44) + g(2),
    g(2) + p(44) + g(2),
    g(2) + p(5) + munt(8) + p(16) + munt(8) + p(7) + g(2),
    g(2) + p(4) + plat(10) + p(16) + plat(10) + p(4) + g(2),
    g(2) + p(4) + munt(4) + p(28) + munt(4) + p(4) + g(2),
    g(2) + p(2) + 'S' + p(1) + 'C' + p(19) + 'Q' + p(15) + 'F' + p(3) + g(2),
    g(B),
    g(B),
    g(B),
  ],
})
