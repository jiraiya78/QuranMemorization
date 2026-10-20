import juzAmma from './juzAmma.json'
import type { Ayah, SurahMeta } from '../types'

interface JuzData {
  surahs: SurahMeta[]
  ayahs: Record<string, Ayah[]>
  translation: string
}

const data = juzAmma as JuzData

export const SURAH_LIST: SurahMeta[] = data.surahs
export const TRANSLATION_LABEL = data.translation

export function getSurah(id: number): SurahMeta {
  return SURAH_LIST.find((s) => s.id === id) ?? SURAH_LIST[SURAH_LIST.length - 1]
}

export function getAyahs(surahId: number): Ayah[] {
  const list = data.ayahs[String(surahId)] ?? []
  return list.map((a) => ({
    ...a,
    arabic: a.arabic.trim(),
    translation: a.translation.trim(),
  }))
}

export function getAdjacentSurahId(currentId: number, delta: -1 | 1): number | null {
  const idx = SURAH_LIST.findIndex((s) => s.id === currentId)
  if (idx < 0) return null
  const next = SURAH_LIST[idx + delta]
  return next ? next.id : null
}
