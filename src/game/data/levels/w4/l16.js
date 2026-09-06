// 4-16 Kern-AI — baaslevel van wereld 4. Twee richels om bij de kern te komen
// als zijn schild opengaat; verder is de arena leeg zodat je zijn ritme kunt
// leren.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 52

export default maakLevel({
  id: 'w4-l16',
  naam: 'Kern-AI',
  wereld: 4,
  index: 16,
  doeltijd: 220,
  baas: 'kernai',
  muziek: 'baas',
  hints: [T.hints.baas],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    g(2) + p(48) + g(2),
    g(2) + p(48) + g(2),
    g(2) + p(48) + g(2),
    g(2) + p(48) + g(2),
    g(2) + p(48) + g(2),
    g(2) + p(48) + g(2),
    g(2) + p(5) + munt(8) + p(20) + munt(8) + p(7) + g(2),
    g(2) + p(4) + plat(10) + p(20) + plat(10) + p(4) + g(2),
    g(2) + p(4) + munt(4) + p(32) + munt(4) + p(4) + g(2),
    g(2) + p(2) + 'S' + p(1) + 'C' + p(21) + 'Q' + p(17) + 'F' + p(3) + g(2),
    g(B),
    g(B),
    g(B),
  ],
})
