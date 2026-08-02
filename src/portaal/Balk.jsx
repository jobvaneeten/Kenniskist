import { scoreKlasse } from './resultaatHelpers.js'

// Percentagebalkje. Kleurt via currentColor mee met de score-klasse, zodat
// balk en cijfer nooit uit elkaar lopen.
export default function Balk({ pct }) {
  return (
    <span className="portaal-balk" aria-hidden="true">
      <span className={`portaal-balk-vol ${scoreKlasse(pct)}`} style={{ width: `${pct}%` }} />
    </span>
  )
}
