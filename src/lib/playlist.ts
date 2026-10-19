import { BISMILLAH_AYAH } from '../data/bismillah'
import type { PlaylistItem, RepeatMode } from '../types'

function basmala(surahId: number, repeatIndex: number, totalRepeats: number): Omit<PlaylistItem, 'url'> {
  return {
    surahId,
    ayah: BISMILLAH_AYAH,
    repeatIndex,
    totalRepeats,
  }
}

/** Build ordered playlist entries describing what plays when. Always starts with Bismillah. */
export function buildPlaylist(
  surahId: number,
  versesCount: number,
  mode: RepeatMode,
  repeats: number,
): Omit<PlaylistItem, 'url'>[] {
  const n = Math.max(1, Math.min(99, repeats))
  const items: Omit<PlaylistItem, 'url'>[] = []

  if (mode === 'ayah') {
    items.push(basmala(surahId, 1, n))
    for (let ayah = 1; ayah <= versesCount; ayah++) {
      for (let r = 1; r <= n; r++) {
        items.push({
          surahId,
          ayah,
          repeatIndex: r,
          totalRepeats: n,
        })
      }
    }
  } else {
    for (let r = 1; r <= n; r++) {
      items.push(basmala(surahId, r, n))
      for (let ayah = 1; ayah <= versesCount; ayah++) {
        items.push({
          surahId,
          ayah,
          repeatIndex: r,
          totalRepeats: n,
        })
      }
    }
  }

  return items
}
