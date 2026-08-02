const OPTIES = [
  { key: 'alles', label: 'Alles' },
  { key: 'weektaak', label: '📋 Weektaak' },
  { key: 'vrij', label: 'Vrij oefenen' },
]

// Weektaakwerk en vrij oefenen komen in dezelfde tabel binnen; `opdracht_id`
// is het enige verschil. Deze schakelaar houdt het overzicht leesbaar als een
// klas veel losse oefenrondes maakt.
export default function HerkomstFilter({ waarde, onChange }) {
  return (
    <div className="portaal-datumfilter">
      {OPTIES.map(o => (
        <button
          key={o.key}
          type="button"
          className={waarde === o.key ? 'portaal-datumfilter-knop actief' : 'portaal-datumfilter-knop'}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
