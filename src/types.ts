export type RepeatMode = 'surah' | 'ayah' | 'range' | 'page'

export type ThemeId = 'emerald' | 'indigo' | 'mushaf'

export type FontId = 'ibm' | 'amiri' | 'noto' | 'scheherazade'

/** Arabic / mushaf glyph weight. */
export type FontWeight = 'regular' | 'bold'

/** Translation edition shown under / beside the Arabic. */
export type TranslationId = 'en' | 'ms'

/** mushaf = continuous Rasm Uthmani page; list = one ayah per block */
export type DisplayMode = 'mushaf' | 'list'

/** Physical next/prev keys & media buttons target. */
export type PhysicalNav = 'ayah' | 'surah'

/**
 * Mushaf page column width.
 * `auto` = A4 max on landscape / desktop, full width on portrait phone.
 */
export type MushafWidth = 'auto' | 'a4' | 'full'

/** How the Madani page fills its viewport. */
export type PageFit = 'width' | 'screen'

/** Right-hand rail holding translation + transport controls. */
export type RailPanel = 'auto' | 'on' | 'off'

/** TV / remote (D-pad) navigation. */
export type TvNav = 'auto' | 'on' | 'off'

export interface SurahMeta {
  id: number
  nameArabic: string
  nameSimple: string
  versesCount: number
  translatedName: string
}

export interface Ayah {
  number: number
  arabic: string
  translation: string
}

export interface Reciter {
  id: string
  name: string
  everyAyahPath: string
}

export interface AppPrefs {
  surahId: number
  mode: RepeatMode
  repeats: number
  /** Inclusive start ayah when mode is `range`. */
  rangeFrom: number
  /** Inclusive end ayah when mode is `range`. */
  rangeTo: number
  /** Madani page when mode is `page`. */
  pageNumber: number
  reciterId: string
  theme: ThemeId
  font: FontId
  /** Arabic text weight (mushaf + list). */
  fontWeight: FontWeight
  /** Multiplier for Arabic / translation size (0.8–1.8). */
  fontScale: number
  /** English Clear Quran or Bahasa Melayu Basmeih. */
  translationId: TranslationId
  /** Show translation under/over the Arabic (mushaf floating panel + list blocks). */
  showTranslation: boolean
  displayMode: DisplayMode
  physicalNav: PhysicalNav
  /** Cap mushaf page width (A4-like) or stretch full. */
  mushafWidth: MushafWidth
  /** Fit the page to width (scrolls) or squeeze all 15 lines into the screen. */
  pageFit: PageFit
  /** Translation + transport controls docked on the right for wide screens. */
  railPanel: RailPanel
  /** Arrow keys move focus between controls instead of stepping ayat. */
  tvNav: TvNav
  /** Interface zoom (rem scale) — 0.7–1.4. Useful on TV / large displays. */
  uiScale: number
}

export type DownloadStatus = 'idle' | 'downloading' | 'ready' | 'error'

export interface PlaylistItem {
  surahId: number
  ayah: number
  url: string
  repeatIndex: number
  totalRepeats: number
}
