// 5-16 De Verslinder — de eindbaas. De arena heeft twee richels en twee
// zwaartekrachtplaten: vanaf fase 2 draait hij de zwaartekracht zelf om, en dan
// zijn die platen je enige manier om terug te komen.
import { maakLevel, p, g, plat, munt } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 56

export default maakLevel({
  id: 'w5-l16',
  naam: 'De Verslinder',
  wereld: 5,
  index: 16,
  doeltijd: 175,
  baas: 'verslinder',
  muziek: 'baas',
  hints: [T.hints.baas],
  kaart: [
    p(B),
    p(B),
    p(B),
    g(2) + p(52) + g(2),
    g(2) + p(52) + g(2),
    g(2) + p(52) + g(2),
    g(2) + p(52) + g(2),
    g(2) + p(52) + g(2),
    g(2) + p(52) + g(2),
    g(2) + p(52) + g(2),
    g(2) + p(5) + munt(8) + p(24) + munt(8) + p(7) + g(2),
    g(2) + p(4) + plat(10) + p(24) + plat(10) + p(4) + g(2),
    g(2) + p(4) + munt(4) + p(36) + munt(4) + p(4) + g(2),
    g(2) + p(2) + 'S' + p(1) + 'C' + p(3) + '@' + p(19) + 'Q' + p(13) + '@' + p(1) + 'F' + p(7) + g(2),
    g(B),
    g(B),
    g(B),
  ],
})
