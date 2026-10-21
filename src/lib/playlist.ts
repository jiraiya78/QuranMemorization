import { BISMILLAH_AYAH } from '../data/bismillah'
import { getAyahsOnPage } from '../data/mushaf'
import type { PlaylistItem, RepeatMode } from '../types'

export interface PlaylistOptions {
  surahId: number
  versesCount: number
  mode: RepeatMode
  repeats: number
  rangeFrom?: number
  rangeTo?: number
  pageNumber?: number
}

function basmala(surahId: number, repeatIndex: number, totalRepeats: number): Omit<PlaylistItem, 'url'> {
  return {
    surahId,
    ayah: BISMILLAH_AYAH,
    repeatIndex,
    totalRepeats,
  }
}

function clampRange(from: number, to: number, versesCount: number) {
  const start = Math.min(Math.max(1, from), versesCount)
  const end = Math.min(Math.max(1, to), versesCount)
  return start <= end ? { from: start, to: end } : { from: end, to: start }
}

/** Build ordered playlist entries. Always starts with Bismillah (except empty page). */
export function buildPlaylist({
  surahId,
  versesCount,
  mode,
  repeats,
  rangeFrom = 1,
  rangeTo = versesCount,
  pageNumber = 1,
}: PlaylistOptions): Omit<PlaylistItem, 'url'>[] {
  const n = Math.max(1, Math.min(99, repeats))
  const items: Omit<PlaylistItem, 'url'>[] = []

  if (mode === 'page') {
    const ayahs = getAyahsOnPage(pageNumber)
    if (ayahs.length === 0) return items
    const openSurah = ayahs[0]!.surahId
    for (let r = 1; r <= n; r++) {
      items.push(basmala(openSurah, r, n))
      for (const a of ayahs) {
        items.push({
          surahId: a.surahId,
          ayah: a.ayah,
          repeatIndex: r,
          totalRepeats: n,
        })
      }
    }
    return items
  }

  if (mode === 'ayah') {
    items.push(basmala(surahId, 1, n))
    for (let ayah = 1; ayah <= versesCount; ayah++) {
      for (let r = 1; r <= n; r++) {
        items.push({ surahId, ayah, repeatIndex: r, totalRepeats: n })
      }
    }
  } else if (mode === 'range') {
    const { from, to } = clampRange(rangeFrom, rangeTo, versesCount)
    items.push(basmala(surahId, 1, n))
    for (let r = 1; r <= n; r++) {
      for (let ayah = from; ayah <= to; ayah++) {
        items.push({ surahId, ayah, repeatIndex: r, totalRepeats: n })
      }
    }
  } else {
    for (let r = 1; r <= n; r++) {
      items.push(basmala(surahId, r, n))
      for (let ayah = 1; ayah <= versesCount; ayah++) {
        items.push({ surahId, ayah, repeatIndex: r, totalRepeats: n })
      }
    }
  }

  return items
}
