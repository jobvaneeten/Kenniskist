// Heeft dit apparaat een aanraakscherm? (iPad, telefoon, Chromebook met touch)
export const heeftAanraak = () =>
  typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0)
