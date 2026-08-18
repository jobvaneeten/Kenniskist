import { useMemo, useState } from 'react'
import { toolLabel } from '../lib/tools.js'
import { groepeerFouten, scoreKlasse, kortMoment } from './resultaatHelpers.js'
import Balk from './Balk.jsx'
import KlasTabel from './KlasTabel.jsx'

function Tegel({ getal, label, sub, klasse }) {
  return (
    <div className="portaal-tegel">
      <span className={`portaal-tegel-getal ${klasse ?? ''}`}>{getal}</span>
      <span className="portaal-tegel-label">{label}</span>
      {sub && <span className="portaal-tegel-sub">{sub}</span>}
    </div>
  )
}

// Startscherm van een klas. Geen tabel met alles erin, maar de drie vragen
// waar een leerkracht mee binnenkomt, in die volgorde:
//   1. is er gewerkt en hoe ging het (tegels)
//   2. wie heeft me nodig (aandachtslijst)
//   3. waar struikelt de klas over (opgetelde fouten)
// Alles is een doorklik naar het scherm waar het volledige verhaal staat.
export default function KlasDashboard({ samenvatting, rijen, onKiesLeerling, onKiesOefening, onNaarLeerlingen }) {
  const { lijst, tools, totaal } = samenvatting
  const fouten = useMemo(() => groepeerFouten(rijen), [rijen])
  const [toonRaster, setToonRaster] = useState(false)

  const stil = lijst.filter(l => l.opgaven === 0)
  const zwak = lijst
    .filter(l => l.opgaven > 0 && l.pct < 60)
    .sort((a, b) => a.pct - b.pct)
  const topFouten = fouten.filter(f => f.leerlingenAantal > 1 || f.aantal > 1).slice(0, 6)

  return (
    <>
      <div className="portaal-tegels">
        <Tegel
          getal={`${totaal.actief}/${totaal.leerlingen}`}
          label="Leerlingen actief"
          sub={stil.length ? `${stil.length} ${stil.length === 1 ? 'deed' : 'deden'} niets` : 'iedereen heeft gewerkt'}
          klasse={stil.length ? 'portaal-score-matig' : 'portaal-score-goed'}
        />
        <Tegel getal={totaal.opgaven} label="Opgaven gemaakt" sub={`over ${tools.length} oefening${tools.length === 1 ? '' : 'en'}`} />
        <Tegel
          getal={totaal.pct === null ? '—' : `${totaal.pct}%`}
          label="Goed in de klas"
          klasse={totaal.pct === null ? '' : scoreKlasse(totaal.pct)}
        />
        <Tegel getal={totaal.fout} label="Fouten gemaakt" sub={`${fouten.length} verschillende opgaven`} />
      </div>

      <div className="portaal-kaart">
        <div className="portaal-sectiekop">
          <h2>Vraagt aandacht</h2>
          <button className="portaal-terug" style={{ padding: 0 }} onClick={onNaarLeerlingen}>Alle leerlingen →</button>
        </div>

        {stil.length === 0 && zwak.length === 0 && (
          <p className="portaal-leeg">Niemand valt op: iedereen heeft gewerkt en scoort boven de 60%.</p>
        )}

        {zwak.length > 0 && (
          <ul className="portaal-signaallijst">
            {zwak.map(l => (
              <li key={l.id}>
                <button className="portaal-signaal" onClick={() => onKiesLeerling(l.id)}>
                  <span className="portaal-signaal-naam">{l.weergavenaam}</span>
                  <span className="portaal-signaal-uitleg">
                    {l.fout} van de {l.opgaven} fout
                    {l.zwakstePunt && <> · vooral <strong>{toolLabel(l.zwakstePunt.toolId)}</strong> ({l.zwakstePunt.pct}%)</>}
                  </span>
                  <span className={`portaal-signaal-cijfer ${scoreKlasse(l.pct)}`}>{l.pct}%</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {stil.length > 0 && (
          <p className="portaal-stil">
            <strong>Niets gemaakt in deze periode:</strong>{' '}
            {stil.map((l, i) => (
              <span key={l.id}>
                {i > 0 && ', '}
                <button className="portaal-leerlingnaam" onClick={() => onKiesLeerling(l.id)}>{l.weergavenaam}</button>
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="portaal-kaart">
        <h2>Waar struikelt de klas over?</h2>
        {topFouten.length === 0 && (
          <p className="portaal-leeg">
            Geen opgave die door meer dan één leerling fout gemaakt is. Let op: niet
            elke oefening slaat op wélke opgave fout ging.
          </p>
        )}
        {topFouten.length > 0 && (
          <table className="portaal-tabel">
            <thead>
              <tr><th>Opgave</th><th>Juist</th><th>Meest ingevuld</th><th>Leerlingen</th><th>Oefening</th></tr>
            </thead>
            <tbody>
              {topFouten.map(f => (
                <tr key={f.sleutel}>
                  <td>{f.vraag ?? '—'}</td>
                  <td className="portaal-score-goed">{f.juist ?? '—'}</td>
                  <td className="portaal-score-slecht">{f.vaakstFout ?? '—'}</td>
                  <td><strong>{f.leerlingenAantal}</strong> <span className="portaal-zacht">({f.aantal}×)</span></td>
                  <td>
                    <button className="portaal-kolomkop" onClick={() => onKiesOefening(f.toolId)}>{toolLabel(f.toolId)}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="portaal-kaart">
        <div className="portaal-sectiekop">
          <h2>Per oefening</h2>
          <span className="portaal-zacht">klik door voor de hele klas</span>
        </div>
        {tools.length === 0 && <p className="portaal-leeg">Er is in deze periode niet geoefend.</p>}
        <ul className="portaal-oefenlijst">
          {tools.map(t => (
            <li key={t.toolId}>
              <button className="portaal-oefenrij" onClick={() => onKiesOefening(t.toolId)}>
                <span className="portaal-oefenrij-naam">{toolLabel(t.toolId)}</span>
                <span className="portaal-zacht">{t.leerlingen.size} lln · {t.opgaven} opg. · {kortMoment(t.laatste)}</span>
                <Balk pct={t.pct} />
                <span className={scoreKlasse(t.pct)}>{t.pct}%</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Het volledige raster hoort bij het groepsoverzicht, niet bij de
          leerlingenlijst: dat is inmiddels een keuzelijst zonder cijfers.
          Dichtgeklapt, want het is breed en je hebt het niet elke keer nodig. */}
      {tools.length > 0 && (
        <div className="portaal-kaart">
          <div className="portaal-sectiekop">
            <h2>Alles in één raster</h2>
            <button className="portaal-terug" style={{ padding: 0 }} onClick={() => setToonRaster(v => !v)}>
              {toonRaster ? 'verbergen' : 'tonen'}
            </button>
          </div>
          {toonRaster
            ? <KlasTabel samenvatting={samenvatting} onKiesLeerling={onKiesLeerling} onKiesOefening={onKiesOefening} />
            : <p className="portaal-leeg" style={{ margin: 0 }}>Elke leerling tegen elke oefening, met het percentage per cel.</p>}
        </div>
      )}
    </>
  )
}
