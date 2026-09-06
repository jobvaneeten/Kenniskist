// 1-16 Slijmkoningin — het baaslevel van wereld 1. Kleine arena met twee
// richels: die zijn er om de slijmballen te ontwijken, niet om veilig te staan.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 44

export default maakLevel({
  id: 'w1-l16',
  naam: 'Slijmkoningin',
  wereld: 1,
  index: 16,
  doeltijd: 180,
  baas: 'slijmkoningin',
  muziek: 'baas',
  hints: [T.hints.baas],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    p(B),
    g(2) + p(40) + g(2),
    g(2) + p(40) + g(2),
    g(2) + p(40) + g(2),
    g(2) + p(40) + g(2),
    g(2) + p(5) + munt(6) + p(18) + munt(6) + p(5) + g(2),
    g(2) + p(4) + plat(8) + p(16) + plat(8) + p(4) + g(2),
    g(2) + p(4) + munt(4) + p(24) + munt(4) + p(4) + g(2),
    g(2) + p(2) + 'S' + p(1) + 'C' + p(19) + 'Q' + p(11) + 'F' + p(3) + g(2),
    g(B),
    g(B),
    g(B),
  ],
})
