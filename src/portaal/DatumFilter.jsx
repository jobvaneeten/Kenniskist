const OPTIES = [
  { key: 'vandaag', label: 'Vandaag' },
  { key: 'gisteren', label: 'Gisteren' },
  { key: 'week', label: 'Deze week' },
  { key: 'altijd', label: 'Altijd' },
]

export default function DatumFilter({ waarde, onChange }) {
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
