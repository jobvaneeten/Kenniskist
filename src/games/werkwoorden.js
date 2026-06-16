// Werkwoordspelling — groep 7/8
// Per werkwoord: alle vormen expliciet (correctheid boven berekening).
//   inf   = hele werkwoord
//   ik    = ik-vorm (stam, GEEN t)
//   hij   = hij/zij/het-vorm (stam + t)
//   vtev  = verleden tijd enkelvoud
//   vtmv  = verleden tijd meervoud
//   vd    = voltooid deelwoord
//   hulp  = hebben/zijn-vorm voor het v.d. ('heeft' of 'is')
//   ctx   = context-zin die in alle tijden natuurlijk loopt
//   type  = 'zwak' | 'sterk'

export const WERKWOORDEN = [
  // ── ZWAKKE werkwoorden ('t kofschip) ──────────────────────────
  { inf:'werken',     ik:'werk',     hij:'werkt',     vtev:'werkte',    vtmv:'werkten',    vd:'gewerkt',     hulp:'heeft', ctx:'in de tuin',     type:'zwak' },
  { inf:'maken',      ik:'maak',     hij:'maakt',     vtev:'maakte',    vtmv:'maakten',    vd:'gemaakt',     hulp:'heeft', ctx:'een tekening',   type:'zwak' },
  { inf:'koken',      ik:'kook',     hij:'kookt',     vtev:'kookte',    vtmv:'kookten',    vd:'gekookt',     hulp:'heeft', ctx:'lekkere soep',   type:'zwak' },
  { inf:'fietsen',    ik:'fiets',    hij:'fietst',    vtev:'fietste',   vtmv:'fietsten',   vd:'gefietst',    hulp:'is',    ctx:'naar school',    type:'zwak' },
  { inf:'wonen',      ik:'woon',     hij:'woont',     vtev:'woonde',    vtmv:'woonden',    vd:'gewoond',     hulp:'heeft', ctx:'in de stad',     type:'zwak' },
  { inf:'spelen',     ik:'speel',    hij:'speelt',    vtev:'speelde',   vtmv:'speelden',   vd:'gespeeld',    hulp:'heeft', ctx:'buiten',         type:'zwak' },
  { inf:'leren',      ik:'leer',     hij:'leert',     vtev:'leerde',    vtmv:'leerden',    vd:'geleerd',     hulp:'heeft', ctx:'voor de toets',  type:'zwak' },
  { inf:'horen',      ik:'hoor',     hij:'hoort',     vtev:'hoorde',    vtmv:'hoorden',    vd:'gehoord',     hulp:'heeft', ctx:'een geluid',     type:'zwak' },
  { inf:'bouwen',     ik:'bouw',     hij:'bouwt',     vtev:'bouwde',    vtmv:'bouwden',    vd:'gebouwd',     hulp:'heeft', ctx:'een hut',        type:'zwak' },
  { inf:'tekenen',    ik:'teken',    hij:'tekent',    vtev:'tekende',   vtmv:'tekenden',   vd:'getekend',    hulp:'heeft', ctx:'een huis',       type:'zwak' },
  { inf:'kloppen',    ik:'klop',     hij:'klopt',     vtev:'klopte',    vtmv:'klopten',    vd:'geklopt',     hulp:'heeft', ctx:'op de deur',     type:'zwak' },
  { inf:'dansen',     ik:'dans',     hij:'danst',     vtev:'danste',    vtmv:'dansten',    vd:'gedanst',     hulp:'heeft', ctx:'in de zaal',     type:'zwak' },
  { inf:'poetsen',    ik:'poets',    hij:'poetst',    vtev:'poetste',   vtmv:'poetsten',   vd:'gepoetst',    hulp:'heeft', ctx:'de ramen',       type:'zwak' },
  { inf:'wandelen',   ik:'wandel',   hij:'wandelt',   vtev:'wandelde',  vtmv:'wandelden',  vd:'gewandeld',   hulp:'heeft', ctx:'in het park',    type:'zwak' },
  { inf:'luisteren',  ik:'luister',  hij:'luistert',  vtev:'luisterde', vtmv:'luisterden', vd:'geluisterd',  hulp:'heeft', ctx:'naar muziek',    type:'zwak' },
  { inf:'tellen',     ik:'tel',      hij:'telt',      vtev:'telde',     vtmv:'telden',     vd:'geteld',      hulp:'heeft', ctx:'de knikkers',    type:'zwak' },
  { inf:'plakken',    ik:'plak',     hij:'plakt',     vtev:'plakte',    vtmv:'plakten',    vd:'geplakt',     hulp:'heeft', ctx:'een poster',     type:'zwak' },
  { inf:'roeien',     ik:'roei',     hij:'roeit',     vtev:'roeide',    vtmv:'roeiden',    vd:'geroeid',     hulp:'heeft', ctx:'op het meer',    type:'zwak' },
  { inf:'zwaaien',    ik:'zwaai',    hij:'zwaait',    vtev:'zwaaide',   vtmv:'zwaaiden',   vd:'gezwaaid',    hulp:'heeft', ctx:'naar oma',       type:'zwak' },
  { inf:'verven',     ik:'verf',     hij:'verft',     vtev:'verfde',    vtmv:'verfden',    vd:'geverfd',     hulp:'heeft', ctx:'de muur',        type:'zwak' },
  { inf:'reizen',     ik:'reis',     hij:'reist',     vtev:'reisde',    vtmv:'reisden',    vd:'gereisd',     hulp:'is',    ctx:'door Europa',    type:'zwak' },
  { inf:'antwoorden', ik:'antwoord', hij:'antwoordt', vtev:'antwoordde',vtmv:'antwoordden',vd:'geantwoord',  hulp:'heeft', ctx:'snel',           type:'zwak' },
  { inf:'groeten',    ik:'groet',    hij:'groet',     vtev:'groette',   vtmv:'groetten',   vd:'gegroet',     hulp:'heeft', ctx:'de buurman',     type:'zwak' },
  { inf:'praten',     ik:'praat',    hij:'praat',     vtev:'praatte',   vtmv:'praatten',   vd:'gepraat',     hulp:'heeft', ctx:'met de juf',     type:'zwak' },
  { inf:'stoppen',    ik:'stop',     hij:'stopt',     vtev:'stopte',    vtmv:'stopten',    vd:'gestopt',     hulp:'heeft', ctx:'de bal',         type:'zwak' },
  { inf:'rusten',     ik:'rust',     hij:'rust',      vtev:'rustte',    vtmv:'rustten',    vd:'gerust',      hulp:'heeft', ctx:'op de bank',     type:'zwak' },
  { inf:'duwen',      ik:'duw',      hij:'duwt',      vtev:'duwde',     vtmv:'duwden',     vd:'geduwd',      hulp:'heeft', ctx:'tegen de kar',   type:'zwak' },
  { inf:'zetten',     ik:'zet',      hij:'zet',       vtev:'zette',     vtmv:'zetten',     vd:'gezet',       hulp:'heeft', ctx:'de vaas op tafel', type:'zwak' },
  { inf:'redden',     ik:'red',      hij:'redt',      vtev:'redde',     vtmv:'redden',     vd:'gered',       hulp:'heeft', ctx:'de kat',         type:'zwak' },
  { inf:'wensen',     ik:'wens',     hij:'wenst',     vtev:'wenste',    vtmv:'wensten',    vd:'gewenst',     hulp:'heeft', ctx:'haar veel geluk',type:'zwak' },

  // ── STERKE werkwoorden (klinkerwisseling, onregelmatig) ────────
  { inf:'lopen',      ik:'loop',     hij:'loopt',     vtev:'liep',      vtmv:'liepen',     vd:'gelopen',     hulp:'heeft', ctx:'hard',           type:'sterk' },
  { inf:'zwemmen',    ik:'zwem',     hij:'zwemt',     vtev:'zwom',      vtmv:'zwommen',    vd:'gezwommen',   hulp:'heeft', ctx:'in het zwembad', type:'sterk' },
  { inf:'lezen',      ik:'lees',     hij:'leest',     vtev:'las',       vtmv:'lazen',      vd:'gelezen',     hulp:'heeft', ctx:'een boek',       type:'sterk' },
  { inf:'schrijven',  ik:'schrijf',  hij:'schrijft',  vtev:'schreef',   vtmv:'schreven',   vd:'geschreven',  hulp:'heeft', ctx:'een brief',      type:'sterk' },
  { inf:'drinken',    ik:'drink',    hij:'drinkt',    vtev:'dronk',     vtmv:'dronken',    vd:'gedronken',   hulp:'heeft', ctx:'water',          type:'sterk' },
  { inf:'zingen',     ik:'zing',     hij:'zingt',     vtev:'zong',      vtmv:'zongen',     vd:'gezongen',    hulp:'heeft', ctx:'een lied',       type:'sterk' },
  { inf:'vliegen',    ik:'vlieg',    hij:'vliegt',    vtev:'vloog',     vtmv:'vlogen',     vd:'gevlogen',    hulp:'is',    ctx:'naar Spanje',    type:'sterk' },
  { inf:'rijden',     ik:'rijd',     hij:'rijdt',     vtev:'reed',      vtmv:'reden',      vd:'gereden',     hulp:'heeft', ctx:'met de auto',    type:'sterk' },
  { inf:'vinden',     ik:'vind',     hij:'vindt',     vtev:'vond',      vtmv:'vonden',     vd:'gevonden',    hulp:'heeft', ctx:'een schat',      type:'sterk' },
  { inf:'nemen',      ik:'neem',     hij:'neemt',     vtev:'nam',       vtmv:'namen',      vd:'genomen',     hulp:'heeft', ctx:'de trein',       type:'sterk' },
  { inf:'geven',      ik:'geef',     hij:'geeft',     vtev:'gaf',       vtmv:'gaven',      vd:'gegeven',     hulp:'heeft', ctx:'een cadeau',     type:'sterk' },
  { inf:'helpen',     ik:'help',     hij:'helpt',     vtev:'hielp',     vtmv:'hielpen',    vd:'geholpen',    hulp:'heeft', ctx:'een vriend',     type:'sterk' },
  { inf:'breken',     ik:'breek',    hij:'breekt',    vtev:'brak',      vtmv:'braken',     vd:'gebroken',    hulp:'heeft', ctx:'het glas',       type:'sterk' },
  { inf:'spreken',    ik:'spreek',   hij:'spreekt',   vtev:'sprak',     vtmv:'spraken',    vd:'gesproken',   hulp:'heeft', ctx:'Frans',          type:'sterk' },
  { inf:'eten',       ik:'eet',      hij:'eet',       vtev:'at',        vtmv:'aten',       vd:'gegeten',     hulp:'heeft', ctx:'een appel',      type:'sterk' },
  { inf:'zitten',     ik:'zit',      hij:'zit',       vtev:'zat',       vtmv:'zaten',      vd:'gezeten',     hulp:'heeft', ctx:'op de stoel',    type:'sterk' },
  { inf:'staan',      ik:'sta',      hij:'staat',     vtev:'stond',     vtmv:'stonden',    vd:'gestaan',     hulp:'heeft', ctx:'bij de deur',    type:'sterk' },
  { inf:'gaan',       ik:'ga',       hij:'gaat',      vtev:'ging',      vtmv:'gingen',     vd:'gegaan',      hulp:'is',    ctx:'naar huis',      type:'sterk' },
  { inf:'doen',       ik:'doe',      hij:'doet',      vtev:'deed',      vtmv:'deden',      vd:'gedaan',      hulp:'heeft', ctx:'een spelletje',  type:'sterk' },
  { inf:'zien',       ik:'zie',      hij:'ziet',      vtev:'zag',       vtmv:'zagen',      vd:'gezien',      hulp:'heeft', ctx:'een film',       type:'sterk' },
  { inf:'vallen',     ik:'val',      hij:'valt',      vtev:'viel',      vtmv:'vielen',     vd:'gevallen',    hulp:'is',    ctx:'van de trap',    type:'sterk' },
  { inf:'blijven',    ik:'blijf',    hij:'blijft',    vtev:'bleef',     vtmv:'bleven',     vd:'gebleven',    hulp:'is',    ctx:'thuis',          type:'sterk' },
  { inf:'kijken',     ik:'kijk',     hij:'kijkt',     vtev:'keek',      vtmv:'keken',      vd:'gekeken',     hulp:'heeft', ctx:'naar de tv',     type:'sterk' },
  { inf:'trekken',    ik:'trek',     hij:'trekt',     vtev:'trok',      vtmv:'trokken',    vd:'getrokken',   hulp:'heeft', ctx:'aan het touw',   type:'sterk' },
  { inf:'sluiten',    ik:'sluit',    hij:'sluit',     vtev:'sloot',     vtmv:'sloten',     vd:'gesloten',    hulp:'heeft', ctx:'de deur',        type:'sterk' },
  { inf:'verliezen',  ik:'verlies',  hij:'verliest',  vtev:'verloor',   vtmv:'verloren',   vd:'verloren',    hulp:'heeft', ctx:'de wedstrijd',   type:'sterk' },
  { inf:'beginnen',   ik:'begin',    hij:'begint',    vtev:'begon',     vtmv:'begonnen',   vd:'begonnen',    hulp:'is',    ctx:'met de les',     type:'sterk' },
  { inf:'vergeten',   ik:'vergeet',  hij:'vergeet',   vtev:'vergat',    vtmv:'vergaten',   vd:'vergeten',    hulp:'is',    ctx:'de tas',         type:'sterk' },
  { inf:'komen',      ik:'kom',      hij:'komt',      vtev:'kwam',      vtmv:'kwamen',     vd:'gekomen',     hulp:'is',    ctx:'te laat',        type:'sterk' },
  { inf:'worden',     ik:'word',     hij:'wordt',     vtev:'werd',      vtmv:'werden',     vd:'geworden',    hulp:'is',    ctx:'boos',           type:'sterk' },
]

// ── Onderwerpen (duidelijk enkelvoud / meervoud, GEEN ambigu "zij") ─────
// Begin-van-zin vorm (hoofdletter) en midden-van-zin vorm (na inversie).
// Enkelvoud → hij-vorm (stam + t) in de tegenwoordige tijd
const SUBJ_EV = [
  { begin:'Hij',        mid:'hij' },
  { begin:'Jij',        mid:'jij' },
  { begin:'Tom',        mid:'Tom' },
  { begin:'Sanne',      mid:'Sanne' },
  { begin:'Mijn vader', mid:'mijn vader' },
  { begin:'De juf',     mid:'de juf' },
  { begin:'Opa',        mid:'opa' },
  { begin:'Lisa',       mid:'Lisa' },
  { begin:'De buurman', mid:'de buurman' },
  { begin:'De buurvrouw', mid:'de buurvrouw' },
]
// Meervoud → hele werkwoord in de tegenwoordige tijd
const SUBJ_MV = [
  { begin:'Wij',          mid:'wij' },
  { begin:'Jullie',       mid:'jullie' },
  { begin:'De jongens',   mid:'de jongens' },
  { begin:'Tom en Lisa',  mid:'Tom en Lisa' },
  { begin:'De kinderen',  mid:'de kinderen' },
  { begin:'Mijn ouders',  mid:'mijn ouders' },
  { begin:'De meiden',    mid:'de meiden' },
  { begin:'De buren',     mid:'de buren' },
]
// Tijdmarkers voor de verleden tijd (starten de zin → inversie)
const VT_MARK = ['Gisteren', 'Vorige week', 'Toen', 'Eergisteren', 'Vannacht']

// Hulpwerkwoord (persoonsvorm) passend bij het onderwerp.
// hulp = 3e pers. ev. ('heeft' of 'is'); alleen "Jij" wijkt af → hebt / bent.
function hulpBij(hulp, subjBegin) {
  if (subjBegin === 'Jij' || subjBegin === 'jij') return hulp === 'heeft' ? 'hebt' : 'bent'
  return hulp
}

// ── Oefeningen genereren ────────────────────────────────────────
// Elke oefening: { zin (met ___), inf, tijdKey:'tt'|'vt'|'vd', tijd (label), antwoord }
function maakOefeningen() {
  const lijst = []
  WERKWOORDEN.forEach((w, i) => {
    const ev  = SUBJ_EV[i % SUBJ_EV.length]
    const ev2 = SUBJ_EV[(i + 3) % SUBJ_EV.length]
    const mv  = SUBJ_MV[i % SUBJ_MV.length]
    const mv2 = SUBJ_MV[(i + 2) % SUBJ_MV.length]
    const mk  = VT_MARK[i % VT_MARK.length]
    const mk2 = VT_MARK[(i + 1) % VT_MARK.length]
    const hulpMv = w.hulp === 'heeft' ? 'hebben' : 'zijn'

    // Tegenwoordige tijd — ik (stam, GEEN t)
    lijst.push({ zin:`Ik ___ ${w.ctx}.`,                       inf:w.inf, type:w.type, tijdKey:'tt', tijd:'tegenwoordige tijd', antwoord:w.ik })
    // Tegenwoordige tijd — enkelvoud (stam + t)
    lijst.push({ zin:`${ev.begin} ___ ${w.ctx}.`,              inf:w.inf, type:w.type, tijdKey:'tt', tijd:'tegenwoordige tijd', antwoord:w.hij })
    // Tegenwoordige tijd — meervoud (hele werkwoord)
    lijst.push({ zin:`${mv.begin} ___ ${w.ctx}.`,              inf:w.inf, type:w.type, tijdKey:'tt', tijd:'tegenwoordige tijd', antwoord:w.inf })
    // Verleden tijd — enkelvoud (inversie na tijdmarker)
    lijst.push({ zin:`${mk} ___ ${ev2.mid} ${w.ctx}.`,         inf:w.inf, type:w.type, tijdKey:'vt', tijd:'verleden tijd', antwoord:w.vtev })
    // Verleden tijd — meervoud
    lijst.push({ zin:`${mk2} ___ ${mv2.mid} ${w.ctx}.`,        inf:w.inf, type:w.type, tijdKey:'vt', tijd:'verleden tijd', antwoord:w.vtmv })
    // Voltooid deelwoord — enkelvoud
    lijst.push({ zin:`${ev.begin} ${hulpBij(w.hulp, ev.begin)} ${w.ctx} ___.`, inf:w.inf, type:w.type, tijdKey:'vd', tijd:'voltooid deelwoord', antwoord:w.vd })
    // Voltooid deelwoord — meervoud
    lijst.push({ zin:`${mv.begin} ${hulpMv} ${w.ctx} ___.`,    inf:w.inf, type:w.type, tijdKey:'vd', tijd:'voltooid deelwoord', antwoord:w.vd })
  })
  return lijst
}

export function shuffleOefeningen() {
  const arr = maakOefeningen()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function shuffleGefilterd(cats) {
  const s = cats instanceof Set ? cats : new Set(cats)
  const arr = maakOefeningen().filter(oef => {
    if (oef.tijdKey === 'tt') return s.has('tt')
    if (oef.tijdKey === 'vd') return s.has('vd')
    return oef.type === 'sterk' ? s.has('vtSterk') : s.has('vtZwak')
  })
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Antwoord-vergelijking: hoofdletters/spaties negeren
export function checkAntwoord(invoer, juist) {
  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim()
  return norm(invoer) === norm(juist)
}

// ── Uitleg: waarom is dit het juiste antwoord / hoe schrijf je het ─────
// Kindvriendelijke regel-uitleg per vorm. Gebruikt bij goed én fout.
export function uitlegVoor(oef) {
  const a = oef.antwoord
  const inf = oef.inf
  const startMetIk = /^ik\s/i.test(oef.zin.trim())

  if (oef.tijdKey === 'tt') {
    if (startMetIk)
      return `Tegenwoordige tijd met "ik" → de stam zónder -t. De stam van "${inf}" is "${a}".`
    if (a === inf)
      return `Meervoud (wij/jullie/zij) in de tegenwoordige tijd → het hele werkwoord: "${inf}".`
    return `Enkelvoud (hij/zij/het/een naam) → stam + t = "${a}". Eindigt de stam al op -t? Dan blijft het één t.`
  }

  if (oef.tijdKey === 'vt') {
    if (oef.type === 'sterk')
      return `Sterk werkwoord: in de verleden tijd verandert de klinker. "${inf}" → "${a}". Die leer je uit je hoofd (geen -te/-de).`
    if (/(te|ten)$/.test(a))
      return `Zwak werkwoord. De stam eindigt op een 't kofschip'-klank (t, k, f, s, ch, p), dus verleden tijd met -te(n): "${a}".`
    return `Zwak werkwoord. De stam eindigt NIET op een 't kofschip'-klank, dus verleden tijd met -de(n): "${a}".`
  }

  // voltooid deelwoord
  if (oef.type === 'sterk')
    return `Voltooid deelwoord (sterk): meestal ge…-en met klinkerwisseling. "${inf}" → "${a}". Uit je hoofd leren.`
  if (/t$/.test(a))
    return `Voltooid deelwoord (zwak): ge + stam + t, want de stam eindigt op een 't kofschip'-klank → "${a}".`
  return `Voltooid deelwoord (zwak): ge + stam + d, want de stam eindigt NIET op een 't kofschip'-klank → "${a}".`
}
