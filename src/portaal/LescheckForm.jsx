import { useMemo, useState } from 'react'
import {
  LESSEN, blokLabel, datumOver, doelenVanBlokMetKey, doelVoorLes,
  isHerhalingsles, slaLescheckOp,
} from '../lib/lescheck.js'
import { BLOKKEN } from '../games/denkvragenData.js'
import { GROEPEN, HEEFT_ROUTE } from '../games/redactiesommen.js'

// Lessen van één blok klaarzetten. Bewust geen stappenformulier zoals de
// weektaak: de leerkracht doet dit tussen twee lessen door. Blok kiezen,
// lessen aanvinken, klaar — het doel per les rolt vanzelf uit de methode.
//
// `bestaand` = de al klaargezette lescheck van dit blok (of null voor een
// nieuw blok). Die lessen staan vast aangevinkt: eraf halen zou het gemaakte
// werk losknippen van de opdracht.
export default function LescheckForm({ klas, leerlingen, bestaand, onKlaar, onAnnuleer }) {
  const klasGroepen = (klas.groepen ?? []).filter(g => GROEPEN.includes(g))
  const [groep, setGroep] = useState(bestaand?.groep ?? klasGroepen[0] ?? 7)
  const [route, setRoute] = useState(bestaand?.route ?? 'FS')
  const [blok, setBlok] = useState(bestaand?.blok ?? 1)
  const [eindOp, setEindOp] = useState(bestaand?.eindOp ?? datumOver(42))
  // les → doelNr. Alleen lessen die erin staan worden klaargezet.
  const [gekozen, setGekozen] = useState(new Map())
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState('')

  const vast = useMemo(
    () => new Map((bestaand?.opdrachten ?? []).map(o => [o.les, o.doelNr])),
    [bestaand],
  )
  const doelen = useMemo(() => doelenVanBlokMetKey(groep, HEEFT_ROUTE(groep) ? route : null, blok), [groep, route, blok])

  const wisselBlok = (nr) => { setBlok(nr); setGekozen(new Map()) }

  const toggel = (les) => {
    if (vast.has(les)) return
    setGekozen(m => {
      const n = new Map(m)
      if (n.has(les)) { n.delete(les); return n }
      // Bij een gewone les staat het doel vast; bij een herhalingsles begint
      // hij op doel 1 en kiest de leerkracht zelf.
      n.set(les, doelVoorLes(groep, route, blok, les)?.doelNr ?? 1)
      return n
    })
  }

  const zetDoel = (les, doelNr) => setGekozen(m => new Map(m).set(les, doelNr))

  const opslaan = async () => {
    if (gekozen.size === 0) { setFout('Vink minstens één les aan.'); return }
    if (!leerlingen?.length) { setFout('Er zitten nog geen leerlingen in deze klas.'); return }
    setBezig(true); setFout('')
    try {
      await slaLescheckOp({
        weektaakId: bestaand?.weektaakId ?? null,
        klas, leerlingIds: leerlingen.map(l => l.id),
        groep, route: HEEFT_ROUTE(groep) ? route : null, blok,
        lessen: [...gekozen].map(([les, doelNr]) => ({ les, doelNr })),
        eindOp,
        bestaandeOpdrachten: (bestaand?.opdrachten ?? []).map(o => ({
          id: o.id, toolId: 'verhaaltjessommen', aantal: 1, config: o.config,
        })),
      })
      onKlaar()
    } catch {
      setFout('Klaarzetten mislukt — probeer opnieuw.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div className="portaal-kaart">
      <div className="portaal-sectiekop">
        <h2>{bestaand ? `Lessen toevoegen · ${blokLabel(blok)}` : 'Lescheck klaarzetten'}</h2>
        <button className="portaal-knop-subtiel portaal-knop" onClick={onAnnuleer}>Annuleren</button>
      </div>
      <p className="portaal-zacht">
        Eén som per les, over het doel van díe les. Elk kind krijgt een eigen som, dus afkijken heeft geen zin.
      </p>

      <div className="portaal-veldrij" style={{ marginTop: 14 }}>
        {klasGroepen.length > 1 && (
          <label className="portaal-veld">
            <span className="portaal-veld-label">Groep</span>
            <select value={groep} onChange={e => { setGroep(Number(e.target.value)); setGekozen(new Map()) }} disabled={!!bestaand}>
              {klasGroepen.map(g => <option key={g} value={g}>Groep {g}</option>)}
            </select>
          </label>
        )}
        {HEEFT_ROUTE(groep) && (
          <label className="portaal-veld">
            <span className="portaal-veld-label">Route</span>
            <select value={route} onChange={e => { setRoute(e.target.value); setGekozen(new Map()) }} disabled={!!bestaand}>
              <option value="FS">FS — basisroute</option>
              <option value="S+">S+ — grotere getallen</option>
            </select>
          </label>
        )}
        <label className="portaal-veld">
          <span className="portaal-veld-label">Blok</span>
          <select value={blok} onChange={e => wisselBlok(Number(e.target.value))} disabled={!!bestaand}>
            {BLOKKEN.map(b => <option key={b.nr} value={b.nr}>{b.label}</option>)}
          </select>
        </label>
        <label className="portaal-veld">
          <span className="portaal-veld-label">Zichtbaar tot</span>
          <input type="date" value={eindOp} onChange={e => setEindOp(e.target.value)} />
          <span className="portaal-veld-hint">Daarna verdwijnt hij bij de leerlingen.</span>
        </label>
      </div>

      <h3 style={{ margin: '18px 0 4px', fontSize: '1rem' }}>Welke lessen?</h3>
      <p className="portaal-zacht">
        Achter elke les staat het doel waar de som over gaat. Les 5 en 10 zijn herhalingslessen — kies daar zelf een doel.
      </p>

      <div className="portaal-leslijst">
        {LESSEN.map(les => {
          const aan = vast.has(les) || gekozen.has(les)
          const doelNr = vast.get(les) ?? gekozen.get(les) ?? doelVoorLes(groep, route, blok, les)?.doelNr
          const doelTekst = doelen[(doelNr ?? 1) - 1]?.doel
          return (
            <div key={les} className={`portaal-lesrij${aan ? ' aan' : ''}`}>
              <label className="portaal-lesvink">
                <input
                  type="checkbox" checked={aan} disabled={vast.has(les)}
                  onChange={() => toggel(les)}
                />
                <strong>Les {les}</strong>
                {vast.has(les) && <span className="portaal-zacht"> · staat al klaar</span>}
              </label>
              <div className="portaal-lesdoel">
                {isHerhalingsles(les) ? (
                  aan ? (
                    <select
                      value={doelNr ?? 1} disabled={vast.has(les)}
                      onChange={e => zetDoel(les, Number(e.target.value))}
                    >
                      {doelen.map((d, i) => (
                        <option key={d.key} value={i + 1}>Doel {i + 1} — {d.doel.slice(0, 70)}…</option>
                      ))}
                    </select>
                  ) : <span className="portaal-zacht">herhalingsles · kies zelf een doel</span>
                ) : (
                  <span className={aan ? '' : 'portaal-zacht'}>{doelTekst ?? '—'}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {fout && <p className="portaal-fout">{fout}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="portaal-knop" onClick={opslaan} disabled={bezig}>
          {bezig ? 'Bezig…' : `Klaarzetten voor ${leerlingen?.length ?? 0} leerling${leerlingen?.length === 1 ? '' : 'en'}`}
        </button>
        <button className="portaal-knop portaal-knop-subtiel" onClick={onAnnuleer} disabled={bezig}>Annuleren</button>
      </div>
    </div>
  )
}
