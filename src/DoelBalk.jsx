import { DOEL_MIN, DOEL_PCT } from './lib/weektaak.js'

// Balk van een doel: eerst "7 / 20 gemaakt", vanaf 20 opgaven het % goed van
// de laatste 20 met een streepje op 80%, en behaald = volle groene balk.
export default function DoelBalk({ stand }) {
  if (!stand) return null
  const { gemaakt, pct, gehaald, genoeg } = stand
  const breedte = gehaald ? 100 : genoeg ? pct : Math.round((gemaakt / DOEL_MIN) * 100)
  const tekst = gehaald
    ? `Doel gehaald! · ${pct}% goed`
    : genoeg
      ? `${pct}% goed van de laatste ${DOEL_MIN} · nodig: ${DOEL_PCT}%`
      : `${gemaakt} / ${DOEL_MIN} gemaakt`
  return (
    <span className={`wt-doelbalk${gehaald ? ' gehaald' : ''}`}>
      <span className="wt-doelbalk-baan">
        <span className="wt-doelbalk-vul" style={{ width: `${breedte}%` }} />
        {genoeg && !gehaald && <span className="wt-doelbalk-lat" style={{ left: `${DOEL_PCT}%` }} />}
      </span>
      <span className="wt-doelbalk-tekst">{tekst}</span>
    </span>
  )
}
