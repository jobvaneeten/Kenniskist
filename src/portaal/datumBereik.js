// Berekent {vanaf, tot} als Date's (tot = exclusief) voor de vier
// datumfilter-opties. null betekent "geen grens".
export function berekenBereik(sleutel) {
  const nu = new Date()
  const vandaag = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate())

  if (sleutel === 'vandaag') return { vanaf: vandaag, tot: null }

  if (sleutel === 'gisteren') {
    const gisteren = new Date(vandaag)
    gisteren.setDate(gisteren.getDate() - 1)
    return { vanaf: gisteren, tot: vandaag }
  }

  if (sleutel === 'week') {
    const dagenSindsMaandag = (vandaag.getDay() + 6) % 7 // maandag = 0
    const maandag = new Date(vandaag)
    maandag.setDate(maandag.getDate() - dagenSindsMaandag)
    return { vanaf: maandag, tot: null }
  }

  return { vanaf: null, tot: null } // altijd
}
