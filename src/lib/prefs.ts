import type { AppPrefs, DisplayMode } from '../types'
import { RECITERS } from '../data/reciters'

const KEY = 'recitehelper.prefs.v1'

export const FONT_SCALE_MIN = 0.8
export const FONT_SCALE_MAX = 1.8
export const FONT_SCALE_STEP = 0.1

const DEFAULTS: AppPrefs = {
  surahId: 114,
  mode: 'ayah',
  repeats: 3,
  reciterId: RECITERS[0].id,
  theme: 'emerald',
  font: 'scheherazade',
  fontScale: 1,
  displayMode: 'mushaf',
  floatingTranslation: true,
}

function normalizeDisplayMode(value: unknown): DisplayMode {
  return value === 'list' ? 'list' : 'mushaf'
}

function clampFontScale(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return DEFAULTS.fontScale
  const stepped = Math.round(n / FONT_SCALE_STEP) * FONT_SCALE_STEP
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Number(stepped.toFixed(1))))
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
      fontScale: clampFontScale(parsed.fontScale ?? DEFAULTS.fontScale),
      displayMode: normalizeDisplayMode(parsed.displayMode ?? DEFAULTS.displayMode),
      floatingTranslation:
        typeof parsed.floatingTranslation === 'boolean'
          ? parsed.floatingTranslation
          : DEFAULTS.floatingTranslation,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function savePrefs(prefs: AppPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs))
}
