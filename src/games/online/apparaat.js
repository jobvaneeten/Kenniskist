// Heeft dit apparaat een aanraakscherm? (iPad, telefoon, Chromebook met touch)
export const heeftAanraak = () =>
  typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0)

// Volledig scherm aan of uit (knop rechtsboven in de spellen).
export function schermVol() {
  const el = document.documentElement
  if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)
  else (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)
}
