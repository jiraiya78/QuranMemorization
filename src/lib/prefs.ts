import type { AppPrefs, DisplayMode, MushafWidth, PhysicalNav, RepeatMode } from '../types'
import { RECITERS } from '../data/reciters'
import { MUSHAF_PAGE_COUNT } from '../data/mushaf'
import { getSurah } from '../data/quran'

const KEY = 'recitehelper.prefs.v1'

export const FONT_SCALE_MIN = 0.8
export const FONT_SCALE_MAX = 1.8
export const FONT_SCALE_STEP = 0.1

const DEFAULTS: AppPrefs = {
  surahId: 1,
  mode: 'ayah',
  repeats: 3,
  rangeFrom: 1,
  rangeTo: 7,
  pageNumber: 1,
  reciterId: RECITERS[0].id,
  theme: 'emerald',
  font: 'scheherazade',
  fontScale: 1,
  displayMode: 'mushaf',
  physicalNav: 'ayah',
  mushafWidth: 'auto',
}

function normalizeDisplayMode(value: unknown): DisplayMode {
  return value === 'list' ? 'list' : 'mushaf'
}

function normalizeMode(value: unknown): RepeatMode {
  if (value === 'surah' || value === 'ayah' || value === 'range' || value === 'page') {
    return value
  }
  return DEFAULTS.mode
}

function normalizePhysicalNav(value: unknown): PhysicalNav {
  return value === 'surah' ? 'surah' : 'ayah'
}

function normalizeMushafWidth(value: unknown): MushafWidth {
  if (value === 'full' || value === 'a4' || value === 'auto') return value
  return DEFAULTS.mushafWidth
}

function clampPageNumber(value: unknown): number {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return DEFAULTS.pageNumber
  return Math.min(MUSHAF_PAGE_COUNT, Math.max(1, n))
}

function clampFontScale(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return DEFAULTS.fontScale
  const stepped = Math.round(n / FONT_SCALE_STEP) * FONT_SCALE_STEP
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Number(stepped.toFixed(1))))
}

export function clampAyahRange(
  from: number,
  to: number,
  versesCount: number,
): { rangeFrom: number; rangeTo: number } {
  const a = Math.min(Math.max(1, Math.round(from) || 1), versesCount)
  const b = Math.min(Math.max(1, Math.round(to) || versesCount), versesCount)
  return a <= b ? { rangeFrom: a, rangeTo: b } : { rangeFrom: b, rangeTo: a }
}

export function loadPrefs(): AppPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<AppPrefs> & {
      floatingTranslation?: boolean
    }
    const { floatingTranslation: _legacyFloating, ...rest } = parsed
    void _legacyFloating
    const surahId = Number(rest.surahId) || DEFAULTS.surahId
    const versesCount = getSurah(surahId).versesCount
    const range = clampAyahRange(
      Number(rest.rangeFrom) || 1,
      Number(rest.rangeTo) || versesCount,
      versesCount,
    )
    return {
      ...DEFAULTS,
      ...rest,
      surahId,
      mode: normalizeMode(rest.mode),
      repeats: Math.min(99, Math.max(1, Number(rest.repeats) || DEFAULTS.repeats)),
      ...range,
      pageNumber: clampPageNumber(rest.pageNumber ?? DEFAULTS.pageNumber),
      fontScale: clampFontScale(rest.fontScale ?? DEFAULTS.fontScale),
      displayMode: normalizeDisplayMode(rest.displayMode ?? DEFAULTS.displayMode),
      physicalNav: normalizePhysicalNav(rest.physicalNav),
      mushafWidth: normalizeMushafWidth(rest.mushafWidth),
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function savePrefs(prefs: AppPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs))
}
