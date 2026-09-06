// 3-07 Spetterregen — lavaspetters komen op een vaste cadans uit de diepte.
// Ze komen altijd op dezelfde plek, dus het is een ritmeprobleem.
import { maakLevel, p, g, plat, munt, lava } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 136

export default maakLevel({
  id: 'w3-l07',
  naam: 'Spetterregen',
  wereld: 3,
  index: 7,
  doeltijd: 85,
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
    p(30) + munt(6) + p(30) + munt(6) + p(30) + munt(6) + p(28),
    p(28) + plat(10) + p(26) + plat(10) + p(26) + plat(10) + p(26),
    p(6) + munt(5) + p(25) + munt(5) + p(25) + munt(5) + p(25) + munt(5) + p(35),
    p(2) + 'S' + p(5) + 'H' + p(23) + 'A' + p(11) + 'C' + p(11) + 'A' + p(23) + 'A' + p(11) + 'A' + p(23) + 'A' + p(11) + 'F' + p(7),
    g(28) + lava(5) + g(28) + lava(5) + g(28) + lava(5) + g(37),
    g(28) + lava(5) + g(28) + lava(5) + g(28) + lava(5) + g(37),
    g(28) + lava(5) + g(28) + lava(5) + g(28) + lava(5) + g(37),
  ],
  hints: [T.hints.lava],
})
