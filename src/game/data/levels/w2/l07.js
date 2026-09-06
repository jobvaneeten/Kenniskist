// 2-07 Noorderlicht — verticale klim. Elke richel bestaat half uit vaste
// steen en half uit dun ijs: je landt op het vaste deel en moet het dunne deel
// oversteken voor de volgende sprong.
import { maakLevel, p, g, plat, munt, dun } from '../bouw.js'
import { T } from '../../texts.nl.js'

const B = 48
// De helft waar je op landt is vast; het dunne ijs ligt aan de kant waar je
// naartoe moet.
const naarRechts = plat(4) + dun(6) + plat(5)
const naarLinks = plat(5) + dun(6) + plat(4)

export default maakLevel({
  id: 'w2-l07',
  naam: 'Noorderlicht',
  wereld: 2,
  index: 7,
  doeltijd: 85,
  hints: [T.hints.dunIjs],
  kaart: [
    p(B),
    p(B),
    p(B),
    p(6) + munt(3) + p(3) + 'F' + p(35),
    p(6) + naarRechts + p(27),
    p(B),
    p(22) + munt(3) + p(23),
    p(20) + naarLinks + p(13),
    p(B),
    p(6) + munt(3) + p(39),
    p(4) + naarRechts + p(29),
    p(B),
    p(24) + munt(3) + p(5) + 'C' + p(15),
    p(22) + naarLinks + p(11),
    p(B),
    p(8) + munt(3) + p(37),
    p(6) + naarRechts + p(27),
    p(B),
    p(26) + munt(3) + p(19),
    p(24) + naarLinks + p(9),
    p(30) + 'L' + p(17),
    p(10) + munt(3) + p(35),
    p(8) + naarRechts + p(25),
    p(B),
    p(24) + munt(3) + p(3) + 'C' + p(17),
    p(22) + naarLinks + p(11),
    p(B),
    p(8) + munt(3) + p(37),
    p(6) + naarRechts + p(27),
    p(14) + 'L' + p(33),
    p(22) + munt(3) + p(23),
    p(20) + naarLinks + p(13),
    p(B),
    p(6) + munt(3) + p(39),
    p(4) + plat(15) + p(29),
    p(B),
    p(4) + 'S' + p(3) + 'H' + p(5) + munt(3) + p(31),
    g(B),
    g(B),
    g(B),
  ],
})
