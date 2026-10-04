import { EindScherm, Feedback } from '../ui/index.jsx'

// Gedeeld eindscherm voor tools die via gebruikOpdracht.js rapporteren. Het
// verschijnt alleen als een weektaak-opdracht af is; "Verder" gaat terug naar
// de weektaak.
export default function OpdrachtKlaarScherm({ goed, aantal, opslaanMislukt, onBack }) {
  return (
    <div className="game-screen game-screen-center">
      <EindScherm
        titel="Opdracht klaar!"
        score={`${goed} / ${aantal}`}
        tekst="goed beantwoord — laat dit aan je juf of meester zien!"
        onVerder={onBack}
      >
        {opslaanMislukt && (
          <Feedback soort="fout">Je resultaat kon niet worden opgeslagen — laat dit scherm zien.</Feedback>
        )}
      </EindScherm>
    </div>
  )
}
