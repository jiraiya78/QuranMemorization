import type { AppPrefs } from '../types'
import { RECITERS } from '../data/reciters'

const KEY = 'recitehelper.prefs.v1'

const DEFAULTS: AppPrefs = {
  surahId: 114,
  mode: 'ayah',
  repeats: 3,
  reciterId: RECITERS[0].id,
  theme: 'emerald',
  font: 'ibm',
}

export function loadPrefs(): AppPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<AppPrefs>
    return {
      ...DEFAULTS,
      ...parsed,
      repeats: Math.min(99, Math.max(1, Number(parsed.repeats) || DEFAULTS.repeats)),
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function savePrefs(prefs: AppPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs))
}
