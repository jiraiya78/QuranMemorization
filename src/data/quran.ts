import quranData from './quran.json'
import type { Ayah, SurahMeta } from '../types'

interface QuranData {
  surahs: SurahMeta[]
  ayahs: Record<string, Ayah[]>
  juzSurahIds: Record<string, number[]>
  translation: string
}

const data = quranData as QuranData

export const SURAH_LIST: SurahMeta[] = data.surahs
export const TRANSLATION_LABEL = data.translation
export const JUZ_COUNT = 30

export function getSurah(id: number): SurahMeta {
  return SURAH_LIST.find((s) => s.id === id) ?? SURAH_LIST[0]
}

export function getAyahs(surahId: number): Ayah[] {
  const list = data.ayahs[String(surahId)] ?? []
  return list.map((a) => ({
    ...a,
    // Strip any accidental Unicode replacement chars from bad fetches
    arabic: a.arabic.replace(/\uFFFD+/g, '').trim(),
    translation: a.translation.trim(),
  }))
}

/** Opening basmala text from Al-Fatihah 1:1 (matches mushaf orthography). */
export function getBismillahArabic(): string {
  return getAyahs(1)[0]?.arabic ?? 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'
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
