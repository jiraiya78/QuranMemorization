import { getAyahs, getBismillahArabic } from './quran'

/** Special playlist/ayah marker for the opening Basmala (not a numbered ayah). */
export const BISMILLAH_AYAH = 0

/** Audio source for Basmala on EveryAyah: Al-Fatihah 1:1 */
export const BISMILLAH_AUDIO_SURAH = 1
export const BISMILLAH_AUDIO_AYAH = 1

export const BISMILLAH = {
  get arabic() {
    return getBismillahArabic()
  },
  get translation() {
    return (
      getAyahs(1)[0]?.translation ||
      'In the Name of Allah—the Most Compassionate, Most Merciful.'
    )
  },
}

export function isBismillah(ayah: number): boolean {
  return ayah === BISMILLAH_AYAH
}
