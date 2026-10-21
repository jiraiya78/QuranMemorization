import quranData from './quran.json'
import type { Ayah, SurahMeta, TranslationId } from '../types'

interface TranslationMeta {
  id: TranslationId
  label: string
}

interface StoredAyah {
  number: number
  arabic: string
  en?: string
  ms?: string
  /** Legacy single-translation field from older builds. */
  translation?: string
}

interface QuranData {
  surahs: SurahMeta[]
  ayahs: Record<string, StoredAyah[]>
  juzSurahIds: Record<string, number[]>
  translations?: Record<string, TranslationMeta>
  /** Legacy label from older builds. */
  translation?: string
}

const data = quranData as QuranData

export const SURAH_LIST: SurahMeta[] = data.surahs
export const JUZ_COUNT = 30

export const TRANSLATIONS: { id: TranslationId; label: string }[] = [
  data.translations?.en ?? {
    id: 'en',
    label: data.translation ?? 'The Clear Quran (Dr. Mustafa Khattab)',
  },
  data.translations?.ms ?? {
    id: 'ms',
    label: 'Bahasa Melayu (Sheikh Abdullah bin Muhammad Basmeih)',
  },
]

export function getTranslationLabel(id: TranslationId): string {
  return TRANSLATIONS.find((t) => t.id === id)?.label ?? TRANSLATIONS[0]!.label
}

export function getSurah(id: number): SurahMeta {
  return SURAH_LIST.find((s) => s.id === id) ?? SURAH_LIST[0]
}

function pickTranslation(a: StoredAyah, translationId: TranslationId): string {
  if (translationId === 'ms') return (a.ms ?? '').trim()
  return (a.en ?? a.translation ?? '').trim()
}

export function getAyahs(surahId: number, translationId: TranslationId = 'en'): Ayah[] {
  const list = data.ayahs[String(surahId)] ?? []
  return list.map((a) => ({
    number: a.number,
    // Strip any accidental Unicode replacement chars from bad fetches
    arabic: a.arabic.replace(/\uFFFD+/g, '').trim(),
    translation: pickTranslation(a, translationId),
  }))
}

/** Opening basmala text from Al-Fatihah 1:1 (matches mushaf orthography). */
export function getBismillahArabic(): string {
  return getAyahs(1)[0]?.arabic ?? 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'
}

export function getBismillahTranslation(translationId: TranslationId = 'en'): string {
  return (
    getAyahs(1, translationId)[0]?.translation ||
    (translationId === 'ms'
      ? 'Dengan nama Allah, Yang Maha Pemurah, lagi Maha Mengasihani.'
      : 'In the Name of Allah—the Most Compassionate, Most Merciful.')
  )
}

export function getAdjacentSurahId(currentId: number, delta: -1 | 1): number | null {
  const idx = SURAH_LIST.findIndex((s) => s.id === currentId)
  if (idx < 0) return null
  const next = SURAH_LIST[idx + delta]
  return next ? next.id : null
}

export function getSurahIdsForJuz(juz: number): number[] {
  return data.juzSurahIds[String(juz)] ?? []
}

export function filterSurahsByJuz(juz: number | 'all'): SurahMeta[] {
  if (juz === 'all') return SURAH_LIST
  const ids = new Set(getSurahIdsForJuz(juz))
  return SURAH_LIST.filter((s) => ids.has(s.id))
}
