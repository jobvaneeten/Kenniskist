// Gebiedende wijs: welke van de vier zinnen is een gebiedende wijs?
//
// Eén goede zin uit GEBIEDEND en drie uit NIET_GEBIEDEND. De lastige zinnen
// lijken erop: het werkwoord staat ook vooraan, of het is wél een bevel maar
// mét onderwerp ("Jij ruimt nu je kamer op!"). Per vraag komt er altijd één
// vraagzin, één bevel-met-onderwerp en één andere lastige zin in, zodat een
// vraagteken of uitroepteken het antwoord niet weggeeft.

export const HULP = [
  'Een zin in de gebiedende wijs is een bevelzin: je zegt tegen iemand wat die moet doen.',
  'Denk aan wat je tegen een hond zegt (Zit! Kom hier!) of wat de navigatie zegt (Sla linksaf.).',
  'Een zin in de gebiedende wijs heeft nooit een onderwerp. Staat er jij, je, jullie, u of we in als onderwerp? Dan is het geen gebiedende wijs.',
  'De persoonsvorm staat vooraan en is de ik-vorm (stam): Pak, Loop, Wees.',
]

export const GEBIEDEND = [
  'Ga zitten en pak je schrift.',
  'Neem bij de rotonde de tweede afslag.',
  'Sla over driehonderd meter linksaf.',
  'Zit!',
  'Blijf hier en wacht op mij.',
  'Wees voorzichtig met dat mes.',
  'Doe de deur even dicht.',
  'Ruim je kamer vandaag nog op.',
  'Kom binnen en doe je jas uit.',
  'Laat de hond maar even uit.',
  'Hou je vast aan de leuning.',
  'Lees de vraag eerst goed door.',
  'Geef me die pen eens aan.',
  'Pas op voor de natte vloer!',
  'Vergeet je gymtas niet.',
  'Draai over vijfhonderd meter rechtsaf.',
  'Breng dit briefje naar de conciërge.',
  'Wacht bij het hek op de anderen.',
  'Was je handen voor het eten.',
  'Volg de weg nog drie kilometer.',
  'Help je zusje even met haar veters.',
  'Zet je fiets in het rek.',
  'Schrijf je naam rechtsboven op het blad.',
  'Houd rechts aan op de snelweg.',
  'Spring maar in het water.',
  'Kijk goed uit bij het oversteken!',
  'Stop met praten en luister.',
  'Haal je sokken van de bank.',
  'Vraag het maar aan juf Esra.',
  'Lig!',
  'Wees eerlijk tegen elkaar.',
  'Bel me meteen na de training.',
  'Fiets voorzichtig naar huis.',
  'Keer om waar mogelijk.',
  'Neem vandaag een paraplu mee.',
  'Geef de bal maar aan Ruben.',
]

// soort: 'vraag' (vraagzin), 'onderwerp' (bevel of mededeling mét onderwerp),
// 'anders' (werkwoord vooraan maar geen bevel, of een uitroep).
const v = (zin, uitleg) => ({ zin, soort: 'vraag', uitleg })
const o = (zin, uitleg) => ({ zin, soort: 'onderwerp', uitleg })
const x = (zin, uitleg) => ({ zin, soort: 'anders', uitleg })

export const NIET_GEBIEDEND = [
  v('Ga je mee naar het park?', 'Dit is een vraag, en "je" is het onderwerp.'),
  v('Pak jij even de schaar?', 'Er staat een onderwerp in: jij. Het is ook een vraag.'),
  v('Loopt de hond al buiten?', 'Er staat een onderwerp in: de hond.'),
  v('Kom jij ook naar mijn feestje?', 'Er staat een onderwerp in: jij.'),
  v('Doe je de deur even dicht?', 'Er staat een onderwerp in: je. Het is een vraag, geen bevel.'),
  v('Zit de kat weer op de bank?', 'Er staat een onderwerp in: de kat.'),
  v('Heb je je huiswerk al af?', 'Er staat een onderwerp in: je.'),
  v('Wacht hij nog steeds op de bus?', 'Er staat een onderwerp in: hij.'),
  v('Neemt u de tweede afslag?', 'Er staat een onderwerp in: u.'),
  v('Blijft de hond in zijn mand liggen?', 'Er staat een onderwerp in: de hond.'),
  v('Breng jij het briefje weg?', 'Er staat een onderwerp in: jij.'),
  v('Haalt papa ons vanmiddag op?', 'Er staat een onderwerp in: papa.'),
  v('Lig je lekker?', 'Er staat een onderwerp in: je.'),
  v('Rennen jullie naar de overkant?', 'Er staat een onderwerp in: jullie.'),
  v('Komt er nog iemand binnen?', 'Er staat een onderwerp in: iemand.'),

  o('Jij ruimt nu je kamer op!', 'Het is wel een bevel, maar er staat een onderwerp in: jij.'),
  o('Jullie moeten nu stil zijn.', 'Het is wel een bevel, maar er staat een onderwerp in: jullie.'),
  o('Loop jij maar vast vooruit.', 'Er staat een onderwerp in: jij. Een gebiedende wijs heeft nooit een onderwerp.'),
  o('Ga jij maar eerst.', 'Er staat een onderwerp in: jij. Een gebiedende wijs heeft nooit een onderwerp.'),
  o('Je moet je handen wassen.', 'Er staat een onderwerp in: je. En de persoonsvorm is "moet", niet de stam van wassen.'),
  o('Jullie gaan nu allemaal zitten!', 'Het is wel een bevel, maar er staat een onderwerp in: jullie.'),
  o('Wees jij maar stil.', 'Er staat een onderwerp in: jij. Een gebiedende wijs heeft nooit een onderwerp.'),
  o('Hou jij je nou eens rustig!', 'Er staat een onderwerp in: jij. Een gebiedende wijs heeft nooit een onderwerp.'),
  o('Laten we samen opruimen.', 'Er staat een onderwerp in: we. Dit is een voorstel, geen gebiedende wijs.'),
  o('Kijk jij maar uit!', 'Er staat een onderwerp in: jij. Een gebiedende wijs heeft nooit een onderwerp.'),
  o('Over driehonderd meter moet u linksaf slaan.', 'Er staat een onderwerp in: u. De navigatie zegt het hier niet in de gebiedende wijs.'),
  o('Jij gaat nu meteen naar binnen.', 'Het is wel een bevel, maar er staat een onderwerp in: jij.'),
  o('U mag hier niet parkeren.', 'Er staat een onderwerp in: u.'),
  o('Pak jij je jas maar vast.', 'Er staat een onderwerp in: jij. Een gebiedende wijs heeft nooit een onderwerp.'),
  o('De hond moet nu gaan liggen.', 'Er staat een onderwerp in: de hond.'),

  x('Regent het morgen, dan blijven we binnen.', 'Het werkwoord staat vooraan, maar "het" is het onderwerp en het is geen bevel.'),
  x('Had ik maar een hond!', 'Dit is een wens. Het onderwerp is ik.'),
  x('Was het maar vast vakantie!', 'Dit is een wens. "Was" is hier een vorm van zijn, en het onderwerp is "het".'),
  x('Zit je goed, dan beginnen we.', 'Het werkwoord staat vooraan, maar "je" is het onderwerp.'),
  x('Wat een enorme hond!', 'Een uitroep, geen bevel.'),
  x('Hij rent hard naar huis!', 'Er staat een onderwerp in: hij. Het is geen bevel.'),
  x('De navigatie zegt dat we linksaf moeten.', 'Er staat een onderwerp in: de navigatie. Er wordt niets bevolen.'),
  x('Mijn hond gaat zitten als ik fluit.', 'Er staat een onderwerp in: mijn hond. Er wordt niets bevolen.'),
  x('Fietsen in de gang is verboden.', 'Het begint met een werkwoord, maar "fietsen in de gang" is het onderwerp.'),
  x('Zwemmen is mijn lievelingssport.', 'Het begint met een werkwoord, maar "zwemmen" is het onderwerp.'),
  x('Opruimen vind ik echt saai.', 'Het begint met een werkwoord, maar het onderwerp is "ik".'),
  x('Wacht ik op de bus, dan word ik koud.', 'Het werkwoord staat vooraan, maar het onderwerp is "ik".'),
  x('Lees je veel, dan leer je veel woorden.', 'Het werkwoord staat vooraan, maar het onderwerp is "je".'),
  x('Stil zijn is soms best moeilijk.', '"Stil zijn" is hier het onderwerp. Er wordt niets bevolen.'),
  x('Kwam de bus maar!', 'Dit is een wens. Het onderwerp is "de bus".'),
]

function schud(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const kies = (lijst) => lijst[Math.floor(Math.random() * lijst.length)]

export function maakGebiedendVraag(goed = kies(GEBIEDEND)) {
  const per = (soort) => NIET_GEBIEDEND.filter(n => n.soort === soort)
  const fout = [kies(per('vraag')), kies(per('onderwerp'))]
  const rest = NIET_GEBIEDEND.filter(n => n.soort !== 'vraag' && !fout.includes(n))
  fout.push(kies(rest))
  return {
    goed,
    opties: schud([{ zin: goed, goed: true, uitleg: 'Een bevel zonder onderwerp, met de stam van het werkwoord vooraan.' },
      ...fout.map(f => ({ ...f, goed: false }))]),
  }
}

export const gebiedendRonde = () => schud(GEBIEDEND)
