/** Device / viewport heuristics shared by the layout and remote-control code. */

const TV_UA =
  /(smart-?tv|smarttv|googletv|android ?tv|appletv|hbbtv|netcast|viera|bravia|philips|aquos|web0s|webos|tizen|crkey|firetv|fire ?tv|roku|dlnadoc|opera tv|tv safari|large screen)/i

/** Coarse pointer + no hover is how TVs and set-top boxes usually report. */
export function looksLikeTv(): boolean {
  if (typeof window === 'undefined') return false
  if (TV_UA.test(navigator.userAgent)) return true
  // Android TV reports a TV user agent, but some boxes ship a generic one.
  const ua = navigator.userAgent
  const isAndroid = /Android/i.test(ua)
  const tvModel = /(AFT|BRAVIA|SHIELD|MiTV|MiTV4|TV|Box)/i.test(ua)
  return isAndroid && tvModel && navigator.maxTouchPoints === 0
}

/** Wide landscape screens (tablet / car head unit / TV) fit a right-side rail. */
export function wideLandscapeQuery(): MediaQueryList | null {
  if (typeof window === 'undefined') return null
  return window.matchMedia('(orientation: landscape) and (min-width: 900px)')
}
