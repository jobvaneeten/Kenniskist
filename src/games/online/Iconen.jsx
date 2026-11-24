// Lijn-iconen voor de online spellen (in plaats van emoji's): één stijl,
// kleur volgt de tekstkleur (currentColor), gloed komt uit de CSS eromheen.
const PAD = {
  bal: <><circle cx="12" cy="12" r="9" /><path d="M12 7.6l4.2 3-1.6 4.9H9.4l-1.6-4.9z" /><path d="M12 3v4.6M20.4 9.6l-4.2 1M17.4 19.2l-2.8-3.7M6.6 19.2l2.8-3.7M3.6 9.6l4.2 1" /></>,
  richt: <><circle cx="12" cy="12" r="7" /><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /></>,
  ballon: <><path d="M12 2.5c3.7 0 6.2 2.8 6.2 6.3 0 3.7-3 7-6.2 7s-6.2-3.3-6.2-7c0-3.5 2.5-6.3 6.2-6.3z" /><path d="M10.8 15.8L10 18h4l-.8-2.2M12 18c0 1.7-1.6 1.7-1.6 3.5" /><path d="M9 6.5c.6-.9 1.5-1.4 2.5-1.5" /></>,
  bot: <><rect x="5" y="8" width="14" height="11" rx="3" /><path d="M12 8V5M3 12.5v3M21 12.5v3M9.5 16h5" /><circle cx="12" cy="3.8" r="1.2" /><circle cx="9.3" cy="12.3" r="1.2" fill="currentColor" stroke="none" /><circle cx="14.7" cy="12.3" r="1.2" fill="currentColor" stroke="none" /></>,
  speler: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c.6-4 3.6-6 7.5-6s6.9 2 7.5 6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  vink: <path d="M4.5 12.5l5 5L19.5 7" />,
  min: <path d="M5 12h14" />,
  kruis: <path d="M6 6l12 12M18 6L6 18" />,
  speel: <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />,
  pauze: <path d="M8.5 5v14M15.5 5v14" />,
  muziek: <><path d="M9 18V5.5l11-2.5v13" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>,
  hand: <path d="M8 13V6.5a1.5 1.5 0 013 0V11V4.5a1.5 1.5 0 013 0V11V6a1.5 1.5 0 013 0v7c0 4.5-2.7 8-7 8-2.8 0-4.4-1.4-5.8-3.8L2.7 14.5a1.5 1.5 0 012.6-1.5z" />,
  vuist: <><path d="M7 21v-4.5c-1.5-.8-2.5-2.3-2.5-4.2V9.5A1.5 1.5 0 017.5 9V8a1.5 1.5 0 013 0 1.5 1.5 0 013 0 1.5 1.5 0 013 .3v4.4c0 2.1-1 3.6-2.5 4.4V21" /><path d="M12 2.5v2M7 3.5l1 1.6M17 3.5l-1 1.6" /></>,
  klap: <><path d="M6.5 13.5l5-5a1.4 1.4 0 012 2l-3 3 4.5-4.5a1.4 1.4 0 012 2L13 15l3-3a1.4 1.4 0 012 2l-4.5 4.5c-2.3 2.3-5.5 2.3-7.5.3s-2-4.4.5-6.8z" /><path d="M14 3.5l.6-1.5M18 5.5l1.4-.8M10.5 4l-.6-1.5" /></>,
  kip: <><path d="M7 20h10M9 20l1-3M15 20l-1-3" /><path d="M5 9.5C5 6.5 7 4 10 4c2 0 3.3 1 3.8 2.6.6-.4 1.3-.6 2-.4L18 7l-2 .8c.3 3.4 3 4 3 6.7 0 2-1.8 2.5-7 2.5-4.5 0-7-1.8-7-4.5z" /><circle cx="10.5" cy="7.5" r=".9" fill="currentColor" stroke="none" /><path d="M8.5 4.5C8.3 3.3 9 2.3 10 2.3" /></>,
  golf: <path d="M2.5 9c2.4 0 2.4-3 4.8-3s2.4 3 4.7 3 2.4-3 4.8-3 2.4 3 4.7 3M2.5 16c2.4 0 2.4-3 4.8-3s2.4 3 4.7 3 2.4-3 4.8-3 2.4 3 4.7 3" />,
  draai: <><path d="M4.5 12a7.5 7.5 0 0112.8-5.3L19.5 9" /><path d="M19.5 4v5h-5" /><path d="M19.5 12a7.5 7.5 0 01-12.8 5.3L4.5 15" /><path d="M4.5 20v-5h5" /></>,
  salto: <><circle cx="12" cy="5" r="2" /><path d="M5 13a7 7 0 0013.3 3M19 11A7 7 0 005.7 8" /><path d="M18.3 16l.2 3.3 2.8-1.5M5.7 8l-.2-3.3-2.8 1.5" /></>,
  maan: <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />,
  ster: <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" />,
  camera: <><path d="M3 8.5a2 2 0 012-2h2.2l1.5-2h6.6l1.5 2H19a2 2 0 012 2V18a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><circle cx="12" cy="13" r="3.6" /></>,
  vol: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
  bliksem: <path d="M13.5 2L5 13.5h6L10 22l9-12h-6.2z" />,
  hart: <path d="M12 20.5S3.5 15.3 3.5 9.2A4.6 4.6 0 0112 6.7a4.6 4.6 0 018.5 2.5c0 6.1-8.5 11.3-8.5 11.3z" />,
  omhoog: <path d="M12 20V5M5.5 11.5L12 5l6.5 6.5" />,
  hurk: <path d="M6 6l6 6 6-6M6 13l6 6 6-6" />,
  herlaad: <><path d="M20 12a8 8 0 11-2.6-5.9" /><path d="M20 3.5V8h-4.5" /></>,
  beker: <><path d="M7 4h10v5a5 5 0 01-10 0z" /><path d="M7 5.5H4c0 3 1.2 4.5 3.3 4.8M17 5.5h3c0 3-1.2 4.5-3.3 4.8M12 14v3.5M8 20.5h8M9.5 17.5h5" /></>,
  klok: <><circle cx="12" cy="13" r="8" /><path d="M12 8.5V13l3 2M9.5 2.5h5" /></>,
  terug: <path d="M15 5l-7 7 7 7" />,
  kleding: <path d="M8.5 3.5L3 7l2.5 4 2-1.2V20.5h9V9.8l2 1.2L21 7l-5.5-3.5c-.6 1.4-1.9 2.2-3.5 2.2s-2.9-.8-3.5-2.2z" />,
  vraag: <><path d="M8.5 8.5a3.6 3.6 0 117 1.2c0 2.3-3.5 2.6-3.5 5.3" /><circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" /></>,
  schild: <><path d="M12 2.5l8 3v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10v-6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  bom: <><circle cx="10.5" cy="14" r="7" /><path d="M15 8.5l2-2M17 6.5c.3-1.8 1.5-2.8 3.5-2.5M8 11.5c.6-1 1.5-1.6 2.6-1.8" /></>,
  vuur: <path d="M12 2.5c.8 3.5 5.5 5.7 5.5 11a5.5 5.5 0 01-11 0c0-1.8.7-3.2 1.8-4.3.3 1.5 1 2.4 2 2.8C9.8 8.8 10.5 5 12 2.5z" />,
  slip: <path d="M4 16c4 0 5-8 9-8s4 4 7 4M4 20c5 0 6-4 9-4" />,
  pass: <><circle cx="7.5" cy="15.5" r="4.5" /><path d="M13 8h8M17.5 4.5L21 8l-3.5 3.5M13.5 13.5h4" /></>,
  wissel: <path d="M4 8h14M14.5 4.5L18 8l-3.5 3.5M20 16H6M9.5 12.5L6 16l3.5 3.5" />,
}

export default function Icoon({ naam, className }) {
  return (
    <svg className={'on-icoon' + (className ? ' ' + className : '')} viewBox="0 0 24 24" aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {PAD[naam] ?? null}
    </svg>
  )
}
