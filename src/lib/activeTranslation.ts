import { getBismillah, isBismillah } from '../data/bismillah'
import { getAyahs } from '../data/quran'
import type { Ayah, TranslationId } from '../types'

/**
 * Translation text for the ayah currently being recited — works across surah
 * boundaries (page mode) and for the Basmala that opens each surah.
 */
export function getActiveTranslation(args: {
  activeAyah: number
  activeSurahId: number
  surahId: number
  ayahs: Ayah[]
  translationId: TranslationId
}): string {
  const { activeAyah, activeSurahId, surahId, ayahs, translationId } = args
  if (activeAyah <= 0) return isBismillah(activeAyah) ? getBismillah(translationId).translation : ''
  const list = activeSurahId === surahId ? ayahs : getAyahs(activeSurahId, translationId)
  return list.find((a) => a.number === activeAyah)?.translation ?? ''
}
