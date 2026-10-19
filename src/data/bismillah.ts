/** Special playlist/ayah marker for the opening Basmala (not a numbered ayah). */
export const BISMILLAH_AYAH = 0

/** Audio source for Basmala on EveryAyah: Al-Fatihah 1:1 */
export const BISMILLAH_AUDIO_SURAH = 1
export const BISMILLAH_AUDIO_AYAH = 1

export const BISMILLAH = {
  arabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
  translation: 'In the Name of Allah—the Most Compassionate, Most Merciful.',
} as const

export function isBismillah(ayah: number): boolean {
  return ayah === BISMILLAH_AYAH
}
