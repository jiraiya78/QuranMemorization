import {
  BISMILLAH_AUDIO_AYAH,
  BISMILLAH_AUDIO_SURAH,
  BISMILLAH_AYAH,
} from './bismillah'
import type { Reciter } from '../types'

export const RECITERS: Reciter[] = [
  {
    id: 'alafasy',
    name: 'Mishary Al-Afasy',
    everyAyahPath: 'Alafasy_128kbps',
  },
  {
    id: 'husary',
    name: 'Mahmoud Khalil Al-Husary',
    everyAyahPath: 'Husary_128kbps',
  },
  {
    id: 'abdulbasit',
    name: 'Abdul Basit (Murattal)',
    everyAyahPath: 'Abdul_Basit_Murattal_192kbps',
  },
  {
    id: 'minshawi',
    name: 'Mohamed Siddiq El-Minshawi',
    everyAyahPath: 'Minshawy_Murattal_128kbps',
  },
]

export function getReciter(id: string): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0]
}

export function streamAyahUrl(reciter: Reciter, surahId: number, ayah: number): string {
  const s = String(surahId).padStart(3, '0')
  const a = String(ayah).padStart(3, '0')
  return `https://everyayah.com/data/${reciter.everyAyahPath}/${s}${a}.mp3`
}

/** Resolve playlist ayah to the surah/ayah pair used for audio files. */
export function resolveAudioRef(surahId: number, ayah: number): { surahId: number; ayah: number } {
  if (ayah === BISMILLAH_AYAH) {
    return { surahId: BISMILLAH_AUDIO_SURAH, ayah: BISMILLAH_AUDIO_AYAH }
  }
  return { surahId, ayah }
}
