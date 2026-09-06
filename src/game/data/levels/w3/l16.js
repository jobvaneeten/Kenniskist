// 3-16 Magmatitaan — baaslevel van wereld 3. Twee richels aan de zijkant om de
// schokgolven te ontwijken; de kop is alleen te raken als hij gebogen staat.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 52

export default maakLevel({
  id: 'w3-l16',
  naam: 'Magmatitaan',
  wereld: 3,
  index: 16,
  doeltijd: 210,
  baas: 'magmatitaan',
  muziek: 'baas',
  hitte: 1.8,
  hints: [T.hints.baas],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
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
