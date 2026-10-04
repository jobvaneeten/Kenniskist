import { useState } from 'react'
import { VAKKEN } from '../lib/tools.js'
import { doelVakkenVoor } from '../lib/doelen.js'
import { onderdelenVan, HEEFT_ROUTE, GROEPEN } from '../games/redactiesommen.js'
import { Knop, TerugKnop } from '../ui/index.jsx'

// Kiest een doel in drie stapjes, net als ToolKiezer: vak → onderwerp → doel.
// Het gekozen doel is meteen een complete opdracht (tool + instellingen), met
// de titel die de leerling ziet. Zo hoeft de leerkracht niet eerst een
// oefening te kiezen en daarin het juiste vakje aan te vinken.
//
// onKies({ toolId, config, titel })
// alleen: optioneel filter op toolId (het werkblad toont alleen wat op papier kan)
export default function DoelKiezer({ klasGroepen, onKies, onSluiten, onZelfKiezen, alleen, titel = 'Kies een doel' }) {
  const [vak, setVak] = useState(null)
  const [onderwerp, setOnderwerp] = useState(null)
  const startGroep = [...(klasGroepen ?? [])].reverse().find(g => GROEPEN.includes(g)) ?? 7
  const [groep, setGroep] = useState(startGroep)
  const [route, setRoute] = useState('FS')

  const vakken = doelVakkenVoor(klasGroepen)
    .map(v => ({ ...v, onderwerpen: v.onderwerpen
      .map(o => ({ ...o, doelen: alleen ? o.doelen.filter(x => alleen(x.toolId)) : o.doelen }))
      .filter(o => o.doelen.length) }))
  const vakLabel = (key) => VAKKEN.find(v => v.key === key)?.label ?? key
  const rekensommen = { titel: 'Verhaaltjessommen', verhaaltjes: true }

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

  // Stap 3a: verhaaltjessommen — de doelen per blok van de gekozen groep/route
  if (onderwerp?.verhaaltjes) {
    const r = HEEFT_ROUTE(groep) ? route : null
    const blokken = onderdelenVan(groep, r, 'blok').filter(b => !b.key.startsWith('herh-'))
    return (
      <div className="portaal-kaart kk-mt-3">
        {kop('Verhaaltjessommen', () => setOnderwerp(null))}
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
                {b.gens.map(g => doelKnop(g.key, g.doel, null, () => onKies({
                  toolId: 'verhaaltjessommen',
                  config: { groep, route: r, doelen: [g.key] },
                  titel: `${b.label.replace('📍 ', '')} — ${g.doel}`,
                })))}
              </div>
            </details>
          ))}
        </div>
      </div>
    )
  }

  // Stap 3: welk doel binnen het onderwerp
  if (onderwerp) {
    return (
      <div className="portaal-kaart kk-mt-3">
        {kop(onderwerp.titel, () => setOnderwerp(null))}
        <div className="portaal-naamlijst">
          {onderwerp.doelen.map((x, i) => doelKnop(i, x.titel, null, () => onKies({
            toolId: x.toolId, config: x.config,
            titel: x.titel.startsWith(onderwerp.titel) ? x.titel : `${onderwerp.titel} — ${x.titel}`,
          })))}
        </div>
      </div>
    )
  }

  // Stap 2: welk onderwerp binnen het vak
  if (vak) {
    const onderwerpen = vak.vak === 'rekenen' ? [rekensommen, ...vak.onderwerpen] : vak.onderwerpen
    return (
      <div className="portaal-kaart kk-mt-3">
        {kop(vakLabel(vak.vak), () => setVak(null))}
        <div className="portaal-naamlijst">
          {onderwerpen.map(o => doelKnop(o.titel, o.titel,
            o.verhaaltjes ? 'doelen per blok, per groep en route' : `${o.doelen.length} ${o.doelen.length === 1 ? 'doel' : 'doelen'}`,
            () => setOnderwerp(o)))}
        </div>
      </div>
    )
  }

  // Stap 1: welk vak
  return (
    <div className="portaal-kaart kk-mt-3">
      {kop(`${titel} — welk vak?`, null)}
      <div className="portaal-naamlijst">
        {vakken.map(v => doelKnop(v.vak, vakLabel(v.vak),
          v.onderwerpen.map(o => o.titel).concat(v.vak === 'rekenen' ? ['Verhaaltjessommen'] : []).join(' · '),
          () => setVak(v)))}
      </div>
      {onZelfKiezen && (
        <p className="portaal-leeg kk-mb-0">
          Staat het doel er niet bij?{' '}
          <button type="button" className="portaal-minilink" onClick={onZelfKiezen}>Kies zelf een oefening</button>
        </p>
      )}
    </div>
  )
}
