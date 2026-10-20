export type RepeatMode = 'surah' | 'ayah' | 'range'

export type ThemeId = 'emerald' | 'indigo' | 'mushaf'

export type FontId = 'ibm' | 'amiri' | 'noto' | 'scheherazade'

/** mushaf = continuous Rasm Uthmani page; list = one ayah per block */
export type DisplayMode = 'mushaf' | 'list'

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
  reciterId: string
  theme: ThemeId
  font: FontId
  /** Multiplier for Arabic / translation size (0.8–1.8). */
  fontScale: number
  displayMode: DisplayMode
}

export type DownloadStatus = 'idle' | 'downloading' | 'ready' | 'error'

export interface PlaylistItem {
  surahId: number
  ayah: number
  url: string
  repeatIndex: number
  totalRepeats: number
}
