// Klein merkteken rechtsboven zodra er vrij gespeeld wordt: een spel dat niet
// als beloning na een oefening komt. Zo zie je van een afstandje of een kind
// aan het oefenen is of gewoon aan het spelen.
//
// Het staat onder de geldbadge (die op top:18 hangt) en dus in dezelfde hoek
// waar de app zijn eigen overlays zet — niet in de hoeken waar spellen hun
// score, terugknop of knoppen tekenen.
export default function VrijSpelenBadge() {
  return (
    <span className="vrij-spelen-badge" title="Vrij spelen (geen oefening)" aria-label="Vrij spelen">
      🎮
    </span>
  )
}
