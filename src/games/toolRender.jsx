// Rendert een tool_id voor de leerlingkant van een weektaak-opdracht.
//
// Los van GameMenu.jsx: GameMenu is een gesloten state-machine (year/subject/
// rekenKeuze/spellingKeuze/...) die niet van buitenaf aan te sturen is. Een
// weektaak-opdracht heeft een vast (tool_id, aantal, config) en moet direct
// naar de juiste tool springen — vandaar dit eigen, kleine dispatchpunt.
//
// Nog niet elke tool uit de registry (src/lib/tools.js) is hier aangesloten;
// zie de fasering in het weektaak-plan. Een tool die de leerkracht wél kan
// kiezen maar hier nog geen case heeft, valt terug op de placeholder onderaan
// — nooit een crash.
import { TOOL_BY_ID } from '../lib/tools.js'
import WerkwoordSpelling from './WerkwoordSpelling.jsx'
import TaalOefenen from './TaalOefenen.jsx'
import Woordenschat from './Woordenschat.jsx'
import VerhaaltjesSommen from './VerhaaltjesSommen.jsx'
import TafelsOefenen from './TafelsOefenen.jsx'
import BreukenPlaatjes from './BreukenPlaatjes.jsx'
import MaatenOmrekenen from './MaatenOmrekenen.jsx'
import ProcentenBreuken from './ProcentenBreuken.jsx'
import DicteeThema from './DicteeThema.jsx'
import BegrijpendLezen from './BegrijpendLezen.jsx'
import TopoOefenen from './TopoOefenen.jsx'
import '../game.css'

function NogNietBeschikbaar({ label, onBack }) {
  return (
    <div className="game-screen">
      <button className="back-btn" onClick={onBack}>← Terug naar weektaak</button>
      <div className="game-header">
        <span className="game-header-icon">🚧</span>
        <h1 className="game-header-title">{label}</h1>
        <p className="game-header-sub">
          Deze oefening werkt nog niet vanuit een weektaak. Oefen 'm voorlopig vrij via "Speel Game",
          of vraag je juf of meester om dit later opnieuw te proberen.
        </p>
      </div>
    </div>
  )
}

// opdracht: { toolId, aantal, config } — komt uit een toewijzing/opdracht-rij.
// groep: puur cosmetisch (koptekst), niet functioneel — een weektaak hangt
// aan een klas, niet aan één groep. Opslaan-mislukt-feedback zit per tool
// zelf (zie WerkwoordSpelling.jsx / gebruikOpdracht.js), niet hier centraal.
export default function RenderTool({ opdracht, groep, onBack, addBriefgeld, addCuruntie }) {
  const { toolId, aantal, config } = opdracht
  const info = TOOL_BY_ID[toolId]
  const label = info?.label ?? toolId

  switch (info?.familie) {
    case 'werkwoordspelling':
      return (
        <WerkwoordSpelling
          groep={groep} onBack={onBack} addBriefgeld={addBriefgeld}
          aantal={aantal} config={config}
        />
      )
    case 'taal-woordsoorten':
      return (
        <TaalOefenen
          onBack={onBack} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie}
          aantal={aantal} config={{ mode: 'woordsoorten', soorten: config?.soorten }}
        />
      )
    case 'taal-zinsdelen':
      return (
        <TaalOefenen
          onBack={onBack} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie}
          aantal={aantal}
          config={{ mode: 'zinsdelen', zinsdelen: config?.zinsdelen, samengesteld: config?.samengesteld }}
        />
      )
    case 'woordenschat':
      return (
        <Woordenschat
          onBack={onBack} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie}
          aantal={aantal}
        />
      )
    case 'verhaaltjessommen':
      return (
        <VerhaaltjesSommen
          onBack={onBack} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie}
          aantal={aantal} config={config}
        />
      )
    case 'tafels':
      return (
        <TafelsOefenen
          groep={groep} onBack={onBack} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie}
          aantal={aantal} config={config}
        />
      )
    case 'breuken-plaatjes':
      return (
        <BreukenPlaatjes
          onBack={onBack} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie} aantal={aantal}
        />
      )
    case 'maten-omrekenen':
      return (
        <MaatenOmrekenen
          onBack={onBack} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie}
          aantal={aantal} config={config}
        />
      )
    case 'procenten-breuken':
      return <ProcentenBreuken onBack={onBack} addBriefgeld={addBriefgeld} aantal={aantal} />
    case 'dictee-thema':
      return (
        <DicteeThema
          onBack={onBack} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie}
          thema={info.variant.thema} woorden={aantal}
        />
      )
    case 'dictee-categorie':
      return (
        <DicteeThema
          onBack={onBack} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie}
          file="dictees/dictee-categorie.html" cats={config?.cats} woorden={aantal}
        />
      )
    case 'topo':
      return (
        <TopoOefenen
          onBack={onBack} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie}
          aantal={aantal}
          config={{ kaart: info.variant.kaart, soorten: config?.soorten, modus: config?.modus }}
        />
      )
    case 'spullen':
      return (
        <BegrijpendLezen
          onBack={onBack} addBriefgeld={addBriefgeld} addCuruntie={addCuruntie}
          startLes={info.variant.les}
        />
      )
    default:
      return <NogNietBeschikbaar label={label} onBack={onBack} />
  }
}
