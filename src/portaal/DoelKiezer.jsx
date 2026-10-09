import { useState } from 'react'
import { VAKKEN } from '../lib/tools.js'
import { doelVakkenVoor } from '../lib/doelen.js'
import { onderdelenVan, HEEFT_ROUTE, GROEPEN } from '../games/redactiesommen.js'
import { Knop, TerugKnop, Icoon } from '../ui/index.jsx'

// Kiest een doel in drie stapjes, net als ToolKiezer: vak → onderwerp → doel.
// Het gekozen doel is meteen een complete opdracht (tool + instellingen), met
// de titel die de leerling ziet. Zo hoeft de leerkracht niet eerst een
// oefening te kiezen en daarin het juiste vakje aan te vinken.
//
// onKies({ toolId, config, titel })
// alleen: optioneel filter op toolId (het werkblad toont alleen wat op papier kan)
// meerdere: doelen aanvinken in plaats van er één aan te klikken (werkblad).
// Wat je aanvinkt blijft staan als je naar een ander onderwerp gaat; met de
// knop onderaan gaat alles samen als één onderdeel naar onKies({ doelen, titel }).
export default function DoelKiezer({ klasGroepen, onKies, onSluiten, onZelfKiezen, alleen, titel = 'Kies een doel', meerdere = false }) {
  const [gekozen, setGekozen] = useState([])        // [{ key, toolId, config, titel }]
  const [vak, setVak] = useState(null)
  const [onderwerp, setOnderwerp] = useState(null)
  const startGroep = [...(klasGroepen ?? [])].reverse().find(g => GROEPEN.includes(g)) ?? 7
  const [groep, setGroep] = useState(startGroep)
  const [route, setRoute] = useState('FS')

  const vakken = doelVakkenVoor(klasGroepen)
    .map(v => ({ ...v, onderwerpen: v.onderwerpen
      .map(o => ({ ...o, doelen: alleen ? o.doelen.filter(x => alleen(x.toolId)) : o.doelen }))
      .filter(o => o.doelen.length) }))
    // Een vak zonder doelen (topografie op een werkblad) heeft geen zin om te
    // tonen; rekenen houdt altijd de verhaaltjessommen.
    .filter(v => v.onderwerpen.length || v.vak === 'rekenen')
  const vakLabel = (key) => VAKKEN.find(v => v.key === key)?.label ?? key
  // Verhaaltjessommen en kale sommen: dezelfde doelen, andere oefening.
  const rekensommen = [
    { titel: 'Verhaaltjessommen', verhaaltjes: true, toolId: 'verhaaltjessommen' },
    { titel: 'Kale sommen', verhaaltjes: true, toolId: 'kale-sommen' },
  ].filter(o => !alleen || alleen(o.toolId))

  const kop = (titel, terug) => (
    <div className="portaal-sectiekop">
      <div>
        <h2 className="kk-m-0">{titel}</h2>
        {terug && <TerugKnop vast={false} onClick={terug}>Een stap terug</TerugKnop>}
      </div>
      <Knop type="button" variant="secundair" maat="sm" onClick={onSluiten}>Sluiten</Knop>
    </div>
  )

  const doelKnop = (key, titel, sub, kies) => (
    <div key={key} className="portaal-naamrij">
      <button type="button" className="portaal-naamknop" onClick={kies}>
        <span className="portaal-naamknop-naam">{titel}</span>
        {sub && <span className="portaal-zacht">{sub}</span>}
      </button>
    </div>
  )

  // Eén doel: in de gewone stand direct kiezen, met `meerdere` aan- of uitvinken.
  const sleutel = (d) => `${d.toolId}|${JSON.stringify(d.config ?? {})}`
  const isGekozen = (d) => gekozen.some(g => g.key === sleutel(d))
  const doel = (d, label) => {
    if (!meerdere) return onKies(d)
    const key = sleutel(d)
    setGekozen(prev => prev.some(g => g.key === key) ? prev.filter(g => g.key !== key) : [...prev, { ...d, key, label }])
  }
  const doelRij = (key, d, label) => !meerdere ? doelKnop(key, label, null, () => doel(d)) : (
    <div key={key} className="portaal-naamrij">
      <button type="button" className={`portaal-naamknop portaal-vinkknop${isGekozen(d) ? ' aan' : ''}`} onClick={() => doel(d, label)} aria-pressed={isGekozen(d)}>
        <span className={`kk-vink${isGekozen(d) ? ' aan' : ''}`}>{isGekozen(d) && <Icoon naam="goed" />}</span>
        <span className="portaal-naamknop-naam">{label}</span>
      </button>
    </div>
  )

  // "Interpunctie — Komma’s zetten" + "Interpunctie — Aanhalingstekens"
  // → "Interpunctie — Komma’s zetten + Aanhalingstekens"
  const samenTitel = (ds) => {
    const delen = ds.map(d => { const i = d.titel.indexOf(' — '); return i < 0 ? [d.titel, d.label] : [d.titel.slice(0, i), d.label] })
    const namen = [...new Set(delen.map(([n]) => n))]
    return namen.length === 1 && delen.every(([, x]) => x)
      ? `${namen[0]} — ${delen.map(([, x]) => x).join(' + ')}`
      : ds.map(d => d.titel).join(' + ')
  }
  const keuzeBalk = meerdere && gekozen.length > 0 && (
    <div className="portaal-keuzebalk">
      <div className="portaal-keuzebalk-tekst">
        <strong>{gekozen.length} {gekozen.length === 1 ? 'doel' : 'doelen'} gekozen</strong>
        <span className="portaal-zacht">{gekozen.map(g => g.label).join(' · ')}</span>
      </div>
      <Knop variant="subtiel" maat="sm" onClick={() => setGekozen([])}>Wissen</Knop>
      <Knop variant="primair" maat="sm" icoonRechts="verder" onClick={() => {
        onKies({ doelen: gekozen.map(({ key, label, ...d }) => d), titel: samenTitel(gekozen) })
        setGekozen([])
      }}>Op het werkblad</Knop>
    </div>
  )

  // Stap 3a: verhaaltjessommen — de doelen per blok van de gekozen groep/route
  if (onderwerp?.verhaaltjes) {
    const r = HEEFT_ROUTE(groep) ? route : null
    const blokken = onderdelenVan(groep, r, 'blok').filter(b => !b.key.startsWith('herh-'))
    return (
      <div className="portaal-kaart kk-mt-3">
        {kop(onderwerp.titel, () => setOnderwerp(null))}
        <div className="kk-rij kk-mb-3">
          <label className="portaal-veld" style={{ maxWidth: 140 }}>
            <span className="portaal-veld-label">Groep</span>
            <select value={groep} onChange={e => setGroep(Number(e.target.value))}>
              {GROEPEN.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          {HEEFT_ROUTE(groep) && (
            <label className="portaal-veld" style={{ maxWidth: 140 }}>
              <span className="portaal-veld-label">Route</span>
              <select value={route} onChange={e => setRoute(e.target.value)}>
                <option value="FS">FS</option>
                <option value="S+">S+</option>
              </select>
            </label>
          )}
        </div>
        <div className="kk-kolom">
          {blokken.map(b => (
            <details key={b.key} className="portaal-vak-chip" style={{ padding: '8px 12px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 800 }}>{b.label.replace('📍 ', '')}</summary>
              <div className="portaal-naamlijst kk-mt-2">
                {b.gens.map(g => doelRij(`${onderwerp.toolId}-${g.key}`, {
                  toolId: onderwerp.toolId,
                  config: { groep, route: r, doelen: [g.key] },
                  titel: `${onderwerp.toolId === 'kale-sommen' ? 'Kale sommen · ' : ''}${b.label.replace('📍 ', '')} — ${g.doel}`,
                }, g.doel))}
              </div>
            </details>
          ))}
        </div>
        {keuzeBalk}
      </div>
    )
  }

  // Stap 3: welk doel binnen het onderwerp
  if (onderwerp) {
    return (
      <div className="portaal-kaart kk-mt-3">
        {kop(onderwerp.titel, () => setOnderwerp(null))}
        <div className="portaal-naamlijst">
          {onderwerp.doelen.map((x, i) => doelRij(i, {
            toolId: x.toolId, config: x.config,
            titel: x.titel.startsWith(onderwerp.titel) ? x.titel : `${onderwerp.titel} — ${x.titel}`,
          }, x.titel))}
        </div>
        {meerdere && !gekozen.length && <p className="portaal-leeg kk-mt-3 kk-mb-0">Vink een of meer doelen aan. Je kunt ook doelen uit een ander onderwerp erbij zetten.</p>}
        {keuzeBalk}
      </div>
    )
  }

  // Stap 2: welk onderwerp binnen het vak
  if (vak) {
    const onderwerpen = vak.vak === 'rekenen' ? [...rekensommen, ...vak.onderwerpen] : vak.onderwerpen
    return (
      <div className="portaal-kaart kk-mt-3">
        {kop(vakLabel(vak.vak), () => setVak(null))}
        <div className="portaal-naamlijst">
          {onderwerpen.map(o => doelKnop(o.titel, o.titel,
            o.verhaaltjes ? 'doelen per blok, per groep en route' : `${o.doelen.length} ${o.doelen.length === 1 ? 'doel' : 'doelen'}`,
            () => setOnderwerp(o)))}
        </div>
        {keuzeBalk}
      </div>
    )
  }

  // Stap 1: welk vak
  return (
    <div className="portaal-kaart kk-mt-3">
      {kop(`${titel} — welk vak?`, null)}
      <div className="portaal-naamlijst">
        {vakken.map(v => doelKnop(v.vak, vakLabel(v.vak),
          v.onderwerpen.map(o => o.titel).concat(v.vak === 'rekenen' ? rekensommen.map(o => o.titel) : []).join(' · '),
          () => setVak(v)))}
      </div>
      {keuzeBalk}
      {onZelfKiezen && (
        <p className="portaal-leeg kk-mb-0">
          Staat het doel er niet bij?{' '}
          <button type="button" className="portaal-minilink" onClick={onZelfKiezen}>Kies zelf een oefening</button>
        </p>
      )}
    </div>
  )
}
