import type {
  AppPrefs,
  DisplayMode,
  FontWeight,
  MushafWidth,
  PageFit,
  PhysicalNav,
  RailPanel,
  RepeatMode,
  TranslationId,
  TvNav,
} from '../types'
import { RECITERS } from '../data/reciters'
import { MUSHAF_PAGE_COUNT } from '../data/mushaf'
import { getSurah } from '../data/quran'
import { looksLikeTv } from './device'

const KEY = 'recitehelper.prefs.v1'
const PORTRAIT_MOBILE_MQ = '(max-width: 900px) and (orientation: portrait)'

export const FONT_SCALE_MIN = 0.8
export const FONT_SCALE_MAX = 1.8
export const FONT_SCALE_STEP = 0.1

export const UI_SCALE_MIN = 0.7
export const UI_SCALE_MAX = 1.4
export const UI_SCALE_STEP = 0.05

/** Regular on phone portrait (clearer at small sizes); bold elsewhere. */
export function defaultFontWeight(): FontWeight {
  if (typeof window === 'undefined') return 'bold'
  return window.matchMedia(PORTRAIT_MOBILE_MQ).matches ? 'regular' : 'bold'
}

/** TVs render a small CSS viewport but sit far away: shrink the chrome a bit. */
export function defaultUiScale(): number {
  return looksLikeTv() ? 0.8 : 1
}

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
  fontWeight: 'bold',
  fontScale: 1,
  translationId: 'en',
  showTranslation: true,
  displayMode: 'mushaf',
  physicalNav: 'ayah',
  mushafWidth: 'auto',
  pageFit: 'width',
  railPanel: 'auto',
  tvNav: 'auto',
  uiScale: 1,
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

function normalizePageFit(value: unknown): PageFit {
  return value === 'screen' ? 'screen' : 'width'
}

function normalizeRailPanel(value: unknown): RailPanel {
  if (value === 'on' || value === 'off') return value
  return 'auto'
}

function normalizeTvNav(value: unknown): TvNav {
  if (value === 'on' || value === 'off') return value
  return 'auto'
}

function clampUiScale(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return defaultUiScale()
  const stepped = Math.round(n / UI_SCALE_STEP) * UI_SCALE_STEP
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Number(stepped.toFixed(2))))
}

function normalizeFontWeight(value: unknown): FontWeight {
  if (value === 'regular' || value === 'bold') return value
  return defaultFontWeight()
}

function normalizeTranslationId(value: unknown): TranslationId {
  return value === 'ms' ? 'ms' : 'en'
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
  const tv = looksLikeTv()
  const withWeightDefaults = (): AppPrefs => ({
    ...DEFAULTS,
    fontWeight: defaultFontWeight(),
    uiScale: defaultUiScale(),
    // A TV shows the whole Madani page at once; phones/tablets scroll by width.
    pageFit: tv ? 'screen' : DEFAULTS.pageFit,
  })

  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return withWeightDefaults()
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
      fontWeight: normalizeFontWeight(rest.fontWeight),
      translationId: normalizeTranslationId(rest.translationId),
      showTranslation:
        typeof rest.showTranslation === 'boolean'
          ? rest.showTranslation
          : DEFAULTS.showTranslation,
      displayMode: normalizeDisplayMode(rest.displayMode ?? DEFAULTS.displayMode),
      physicalNav: normalizePhysicalNav(rest.physicalNav),
      mushafWidth: normalizeMushafWidth(rest.mushafWidth),
      pageFit: normalizePageFit(rest.pageFit ?? (tv ? 'screen' : DEFAULTS.pageFit)),
      railPanel: normalizeRailPanel(rest.railPanel),
      tvNav: normalizeTvNav(rest.tvNav),
      uiScale: clampUiScale(rest.uiScale ?? defaultUiScale()),
    }
  } catch {
    return withWeightDefaults()
  }
}

export function savePrefs(prefs: AppPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs))
}
