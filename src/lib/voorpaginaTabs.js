// De tabbladen van de voorpagina, elk met een eigen adres. Root.jsx gebruikt
// dit om te weten welke adressen echte pagina's zijn (de rest krijgt noindex),
// public/sitemap.xml noemt ze ook.
export const VOORPAGINA_TABS = [
  { key: 'home', pad: '/', label: 'Home' },
  { key: 'vakken', pad: '/vakken', label: 'Vakken' },
  { key: 'spellen', pad: '/spellen', label: 'Spellen' },
  { key: 'leerkrachten', pad: '/voor-leerkrachten', label: 'Voor leerkrachten' },
  { key: 'vragen', pad: '/vragen', label: 'Vragen' },
  { key: 'contact', pad: '/contact', label: 'Contact' },
]

export function tabVoorPad(pad) {
  return VOORPAGINA_TABS.find(t => t.pad === pad)?.key ?? null
}
